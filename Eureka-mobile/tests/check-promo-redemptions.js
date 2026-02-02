const { config, listAllDocuments } = require("./appwrite-client");

const main = async () => {
  const redemptions = await listAllDocuments({
    collectionId: config.promoRedemptionsCollectionId,
  });

  const byUserPromo = new Map();
  for (const redemption of redemptions) {
    const key = `${redemption.userId || "unknown"}:${redemption.promoId || "unknown"}`;
    const list = byUserPromo.get(key) || [];
    list.push(redemption);
    byUserPromo.set(key, list);
  }

  const duplicates = [];
  for (const [key, docs] of byUserPromo.entries()) {
    if (docs.length > 1) {
      duplicates.push({
        key,
        count: docs.length,
        docs: docs.map((doc) => ({
          $id: doc.$id,
          userId: doc.userId,
          promoId: doc.promoId,
          orderId: doc.orderId,
          redeemedAt: doc.redeemedAt,
        })),
      });
    }
  }

  console.log("Promo redemptions total:", redemptions.length);
  console.log("Duplicate user+promo entries:", duplicates.length);
  if (duplicates.length > 0) {
    console.log(JSON.stringify(duplicates, null, 2));
  }
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
