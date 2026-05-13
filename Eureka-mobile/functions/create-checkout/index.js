// Server side function, creates a Stripe Checkout session for an order
// Node.js environment with Appwrite SDK

const { Client, Databases, ID, Query } = require("node-appwrite");
const Stripe = require("stripe");


const requireEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

const parsePayload = (req) => {
  const raw = req.payload ?? req.body ?? "";
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// Split into chunks to avoid Appwrite query limits
const chunk = (list, size) => {
  const chunks = [];
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks;
};

// Format special request 
const normalizeRequest = (value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const logStep = (log, message, meta) => {
  if (typeof log !== "function") return;
  const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
  log(`[create-checkout] ${message}${suffix}`);
};

const makeOrderNumber = () => {
  const d = new Date();
  const pad2 = (n) => n.toString().padStart(2, "0");
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `E${rand}${hh}${mm}`;
};

const toCents = (price) => Math.round(Number(price ?? 0) * 100);

// Main function handler
module.exports = async ({ req, res, log, error }) => {
  const startedAt = Date.now();
  try {
    const payload = parsePayload(req);
    if (payload === null) {
      return res.json({ ok: false, message: "Invalid JSON payload." }, 400);
    }

    // if payload.action exists use it (else default to "create")
    const action = typeof payload.action === "string"
      ? payload.action
      : "create";
    logStep(log, "request_received", { action });

    const client = new Client()
      .setEndpoint(requireEnv("APPWRITE_ENDPOINT"))
      .setProject(requireEnv("APPWRITE_PROJECT_ID"))
      .setKey(requireEnv("APPWRITE_API_KEY"));
    const databases = new Databases(client);

    const databaseId = requireEnv("APPWRITE_DATABASE_ID");
    const ordersCollectionId = requireEnv("APPWRITE_ORDERS_COLLECTION_ID");
    const orderItemsCollectionId = requireEnv("APPWRITE_ORDER_ITEMS_COLLECTION_ID");
    const menuCollectionId = requireEnv("APPWRITE_MENU_COLLECTION_ID");
    const promoCodesCollectionId = requireEnv("APPWRITE_PROMO_CODES_COLLECTION_ID");
    const promoRedemptionsCollectionId = requireEnv(
      "APPWRITE_PROMO_REDEMPTIONS_COLLECTION_ID"
    );

    const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
      apiVersion: process.env.STRIPE_API_VERSION || "2023-10-16",
    });

    if (action === "confirm") {
      const orderId = typeof payload.orderId === "string" 
        ? payload.orderId 
        : "";
      const paymentIntentId = typeof payload.paymentIntentId === "string" 
        ? payload.paymentIntentId 
        : "";
      const userId = typeof payload.userId === "string" 
        ? payload.userId 
        : "";

      logStep(log, "confirm_start", {
        orderId,
        paymentIntentId: paymentIntentId.slice(-6),
      });

      if (!orderId || !paymentIntentId) {
        return res.json(
          { ok: false, message: "orderId and paymentIntentId are required." },
          400
        );
      }

      const orderDoc = await databases.getDocument(
        databaseId,
        ordersCollectionId,
        orderId
      );

      if (userId && orderDoc.userId !== userId) {
        return res.json(
          { ok: false, message: "Order does not belong to this user." },
          403
        );
      }

      if (orderDoc.paymentIntentId && orderDoc.paymentIntentId !== paymentIntentId) {
        return res.json(
          { ok: false, message: "Payment intent does not match this order." },
          400
        );
      }

      if (orderDoc.isPaid) {
        logStep(log, "confirm_already_paid", { orderId });
        return res.json({
          ok: true,
          data: { orderId: orderDoc.$id, status: orderDoc.status, isPaid: true },
        });
      }

      logStep(log, "stripe_retrieve_start", {
        paymentIntentId: paymentIntentId.slice(-6),
      });
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      logStep(log, "stripe_retrieve_done", { status: paymentIntent.status });
      if (paymentIntent.status !== "succeeded") {
        return res.json(
          {
            ok: false,
            message: `Payment not completed. Status: ${paymentIntent.status}`,
          },
          400
        );
      }

      await databases.updateDocument(databaseId, ordersCollectionId, orderId, {
        isPaid: true,
        status: "received",
      });
      logStep(log, "order_marked_received", { orderId });

      if (orderDoc.promoId) {
        logStep(log, "promo_redemption_check", { orderId });
        const existingRedemption = await databases.listDocuments(
          databaseId,
          promoRedemptionsCollectionId,
          [Query.equal("orderId", orderId), Query.limit(1)]
        );
        if (existingRedemption.total === 0) {
          await databases.createDocument(
            databaseId,
            promoRedemptionsCollectionId,
            ID.unique(),
            {
              promoId: orderDoc.promoId,
              userId: orderDoc.userId,
              orderId: orderId,
              redeemedAt: new Date().toISOString(),
              discountCents: orderDoc.discountCents,
            }
          );
          logStep(log, "promo_redemption_created", { orderId });
        }
      }

      logStep(log, "confirm_done", {
        orderId,
        elapsedMs: Date.now() - startedAt,
      });
      return res.json({
        ok: true,
        data: { orderId, status: "received", isPaid: true },
      });
    }

    // Create path: recompute pricing from server data, then create order + PaymentIntent.
    const items = Array.isArray(payload.items) ? payload.items : [];
    const promoCodeRaw = typeof payload.promoCode === "string" ? payload.promoCode : "";
    const userId = typeof payload.userId === "string" ? payload.userId : "";
    const customerEmail =
      typeof payload.customerEmail === "string" ? payload.customerEmail : "";

    logStep(log, "create_start", {
      userId,
      itemsCount: items.length,
      hasPromo: Boolean(promoCodeRaw),
      hasEmail: Boolean(customerEmail),
    });

    if (!userId) {
      return res.json({ ok: false, message: "userId is required." }, 400);
    }

    if (items.length === 0) {
      return res.json({ ok: false, message: "Cart is empty." }, 400);
    }

    // Extract unique menu IDs, convert set back to array
    const menuIds = [
      ...new Set(
        items
          .map((item) => (typeof item.menuId === "string" ? item.menuId : ""))
          .filter(Boolean)
      ),
    ];

    if (menuIds.length === 0) {
      return res.json({ ok: false, message: "No menu items provided." }, 400);
    }

    // Load authoritative menu prices to prevent client-side tampering.
    const menuDocs = [];
    logStep(log, "menu_fetch_start", { menuIdsCount: menuIds.length });
    for (const idChunk of chunk(menuIds, 100)) {
      const response = await databases.listDocuments(databaseId, menuCollectionId, [
        Query.equal("$id", idChunk),
        Query.limit(idChunk.length),
      ]);
      menuDocs.push(...response.documents); 
    }
    logStep(log, "menu_fetch_done", { menuDocsCount: menuDocs.length });

    // format: [id: { price, name }]
    // Faster lookup
    const menuById = new Map(
      menuDocs.map((doc) => [
        doc.$id,
        { price: Number(doc.price ?? 0), name: String(doc.name ?? "") },
      ])
    );

    let subtotalCents = 0;
    for (const item of items) {
      const menuId = typeof item.menuId === "string" ? item.menuId : "";
      const quantity = Number(item.quantity ?? 0);
      if (!menuId || quantity <= 0) {
        continue;
      }
      const menu = menuById.get(menuId);
      if (!menu || Number.isNaN(menu.price)) {
        return res.json({ ok: false, message: "Menu item not found." }, 400);
      }
      subtotalCents += toCents(menu.price) * quantity;
    }

    // Apply promo validation and compute discount in cents.
    let promo = null;
    let discountCents = 0;

    const promoCode = promoCodeRaw.trim().toUpperCase();
    if (promoCode) {
      logStep(log, "promo_lookup_start", { promoCode });
      const promos = await databases.listDocuments(
        databaseId,
        promoCodesCollectionId,
        [Query.equal("codeUpper", promoCode), Query.limit(1)]
      );
      logStep(log, "promo_lookup_done", { found: promos.total });

      if (!promos || promos.total === 0) {
        return res.json({ ok: false, message: "Promo code not found." }, 400);
      }

      const promoDoc = promos.documents[0];
      if (!promoDoc.isActive) {
        return res.json({ ok: false, message: "Promo code is inactive." }, 400);
      }

      if (
        promoDoc.minSubtotalCents != null &&
        subtotalCents < promoDoc.minSubtotalCents
      ) {
        const minDollars = (promoDoc.minSubtotalCents / 100).toFixed(2);
        return res.json(
          { ok: false, message: `Minimum subtotal is $${minDollars}.` },
          400
        );
      }

      const usageLimit = promoDoc.usageLimitPerUser ?? 0;
      if (usageLimit > 0) {
        const redemptions = await databases.listDocuments(
          databaseId,
          promoRedemptionsCollectionId,
          [
            Query.equal("promoId", promoDoc.$id),
            Query.equal("userId", userId),
            Query.limit(1),
          ]
        );
        if (redemptions.total > 0) {
          return res.json({ ok: false, message: "Promo code already used." }, 400);
        }
      }

      if (promoDoc.type === "PERCENT") {
        discountCents = Math.round((subtotalCents * promoDoc.value) / 100);
      } else {
        discountCents = Number(promoDoc.value ?? 0);
      }

      if (promoDoc.maxDiscountCents != null) {
        discountCents = Math.min(discountCents, promoDoc.maxDiscountCents);
      }

      discountCents = Math.min(discountCents, subtotalCents);
      if (discountCents <= 0) {
        return res.json({ ok: false, message: "Promo code does not apply." }, 400);
      }

      promo = {
        promoId: promoDoc.$id,
        codeUpper: promoCode,
        discountCents,
      };
      logStep(log, "promo_applied", {
        promoId: promo.promoId,
        discountCents,
      });
    }

    const totalCents = Math.max(0, subtotalCents - discountCents);
    const orderId = ID.unique();
    const orderNumber = makeOrderNumber();
    logStep(log, "pricing_done", {
      subtotalCents,
      discountCents,
      totalCents,
      orderId,
    });

    // If total is free, skip Stripe and immediately mark received.
    if (totalCents === 0) {
      logStep(log, "free_order_start", { orderId });
      const orderDoc = await databases.createDocument(
        databaseId,
        ordersCollectionId,
        orderId,
        {
          userId,
          orderNumber,
          status: "received",
          isPaid: true,
          total: totalCents / 100,
          promoId: promo?.promoId,
          promoCode: promo?.codeUpper,
          discountCents: promo?.discountCents,
        }
      );

      const orderItemsPayload = items
        .map((item) => {
          const menuId = typeof item.menuId === "string" ? item.menuId : "";
          const quantity = Number(item.quantity ?? 0);
          const menu = menuById.get(menuId);
          if (!menuId || quantity <= 0 || !menu || Number.isNaN(menu.price)) {
            return null;
          }
          return {
            orderId: orderDoc.$id,
            menuId,
            name: menu.name,
            price: menu.price,
            qty: quantity,
            specialRequest: normalizeRequest(item.specialRequest),
          };
        })
        .filter(Boolean);

      await Promise.all(
        orderItemsPayload.map((orderItem) =>
          databases.createDocument(
            databaseId,
            orderItemsCollectionId,
            ID.unique(),
            orderItem
          )
        )
      );
      logStep(log, "order_items_created", {
        orderId: orderDoc.$id,
        count: orderItemsPayload.length,
      });

      if (promo) {
        await databases.createDocument(
          databaseId,
          promoRedemptionsCollectionId,
          ID.unique(),
          {
            promoId: promo.promoId,
            userId,
            orderId: orderDoc.$id,
            redeemedAt: new Date().toISOString(),
            discountCents: promo.discountCents,
          }
        );
        logStep(log, "promo_redemption_created", { orderId: orderDoc.$id });
      }

      logStep(log, "free_order_done", {
        orderId: orderDoc.$id,
        elapsedMs: Date.now() - startedAt,
      });
      return res.json({
        ok: true,
        data: {
          orderId: orderDoc.$id,
          orderNumber,
          paymentRequired: false,
          paymentIntentId: null,
          clientSecret: null,
          subtotalCents,
          discountCents,
          totalCents,
          promo,
        },
      });
    }

    logStep(log, "stripe_create_start", {
      amount: totalCents,
      currency: process.env.STRIPE_CURRENCY || "sgd",
    });
    // Create the PaymentIntent for the final amount to charge.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: process.env.STRIPE_CURRENCY || "sgd", 
      automatic_payment_methods: { enabled: true },
      receipt_email: customerEmail || undefined,
      metadata: {
        orderId,
        userId,
        promoCode: promo?.codeUpper || "",
      },
    });
    logStep(log, "stripe_create_done", {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    });

    let orderDoc;
    try {
      logStep(log, "order_create_start", { orderId });
      orderDoc = await databases.createDocument(
        databaseId,
        ordersCollectionId,
        orderId,
        {
          userId,
          orderNumber,
          status: "pending_payment",
          isPaid: false,
          total: totalCents / 100,
          promoId: promo?.promoId,
          promoCode: promo?.codeUpper,
          discountCents: promo?.discountCents,
          paymentIntentId: paymentIntent.id,
        }
      );

      const orderItemsPayload = items
        .map((item) => {
          const menuId = typeof item.menuId === "string" ? item.menuId : "";
          const quantity = Number(item.quantity ?? 0);
          const menu = menuById.get(menuId);
          if (!menuId || quantity <= 0 || !menu || Number.isNaN(menu.price)) {
            return null;
          }
          return {
            orderId: orderId,
            menuId,
            name: menu.name,
            price: menu.price,
            qty: quantity,
            specialRequest: normalizeRequest(item.specialRequest),
          };
        })
        .filter(Boolean);

      await Promise.all(
        orderItemsPayload.map((orderItem) =>
          databases.createDocument(
            databaseId,
            orderItemsCollectionId,
            ID.unique(),
            orderItem
          )
        )
      );
      logStep(log, "order_items_created", {
        orderId,
        count: orderItemsPayload.length,
      });
    } catch (err) {
      logStep(log, "order_create_failed", { orderId });
      try {
        await stripe.paymentIntents.cancel(paymentIntent.id);
        logStep(log, "stripe_cancel_done", { paymentIntentId: paymentIntent.id });
      } catch (cancelErr) {
        log(`Failed to cancel payment intent: ${cancelErr}`);
      }
      throw err;
    }

    logStep(log, "create_done", {
      orderId: orderDoc.$id,
      elapsedMs: Date.now() - startedAt,
    });
    return res.json({
      ok: true,
      data: {
        orderId: orderDoc.$id,
        orderNumber,
        paymentRequired: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        subtotalCents,
        discountCents,
        totalCents,
        promo,
      },
    });
  } catch (err) {
    logStep(log, "error", {
      message: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - startedAt,
    });
    error(err);
    return res.json({ ok: false, message: "Server error." }, 500);
  }
};
