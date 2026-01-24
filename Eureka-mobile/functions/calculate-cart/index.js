const { Client, Databases, Query } = require("node-appwrite");

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

const chunk = (list, size) => {
  const chunks = [];
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks;
};

module.exports = async ({ req, res, log, error }) => {
  try {
    const payload = parsePayload(req);
    if (payload === null) {
      return res.json({ ok: false, message: "Invalid JSON payload." }, 400);
    }

    const items = Array.isArray(payload.items) ? payload.items : [];
    const promoCodeRaw = typeof payload.promoCode === "string" ? payload.promoCode : "";
    const userId = typeof payload.userId === "string" ? payload.userId : "";

    if (items.length === 0) {
      return res.json({
        ok: true,
        data: {
          subtotalCents: 0,
          discountCents: 0,
          totalCents: 0,
          promo: null,
        },
      });
    }

    const databaseId = requireEnv("APPWRITE_DATABASE_ID");
    const menuCollectionId = requireEnv("APPWRITE_MENU_COLLECTION_ID");
    const promoCodesCollectionId = requireEnv("APPWRITE_PROMO_CODES_COLLECTION_ID");
    const promoRedemptionsCollectionId = requireEnv("APPWRITE_PROMO_REDEMPTIONS_COLLECTION_ID");

    const client = new Client()
      .setEndpoint(requireEnv("APPWRITE_ENDPOINT"))
      .setProject(requireEnv("APPWRITE_PROJECT_ID"))
      .setKey(requireEnv("APPWRITE_API_KEY"));

    const databases = new Databases(client);

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

    const menuDocs = [];
    for (const idChunk of chunk(menuIds, 100)) {
      const response = await databases.listDocuments(databaseId, menuCollectionId, [
        Query.equal("$id", idChunk),
        Query.limit(idChunk.length),
      ]);
      menuDocs.push(...response.documents);
    }

    const priceById = new Map(
      menuDocs.map((doc) => [doc.$id, Number(doc.price ?? 0)])
    );

    let subtotalCents = 0;
    for (const item of items) {
      const menuId = typeof item.menuId === "string" ? item.menuId : "";
      const quantity = Number(item.quantity ?? 0);
      if (!menuId || quantity <= 0) {
        continue;
      }
      const price = priceById.get(menuId);
      if (typeof price !== "number" || Number.isNaN(price)) {
        return res.json({ ok: false, message: "Menu item not found." }, 400);
      }
      subtotalCents += Math.round(price * 100) * quantity;
    }

    let promo = null;
    let discountCents = 0;

    const promoCode = promoCodeRaw.trim().toUpperCase();
    if (promoCode) {
      if (!userId) {
        return res.json(
          { ok: false, message: "User must be signed in to use promo codes." },
          400
        );
      }

      const promos = await databases.listDocuments(
        databaseId,
        promoCodesCollectionId,
        [Query.equal("codeUpper", promoCode), Query.limit(1)]
      );

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
    }

    const totalCents = Math.max(0, subtotalCents - discountCents);

    return res.json({
      ok: true,
      data: {
        subtotalCents,
        discountCents,
        totalCents,
        promo,
      },
    });
  } catch (err) {
    error(err);
    return res.json({ ok: false, message: "Server error." }, 500);
  }
};
