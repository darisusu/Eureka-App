const { config, listAllDocuments } = require("./appwrite-client");

const main = async () => {
  const users = await listAllDocuments({
    collectionId: config.userCollectionId,
  });
  const orders = await listAllDocuments({
    collectionId: config.ordersCollectionId,
  });

  const userIds = new Set(users.map((doc) => doc.$id));
  const orphanOrders = orders.filter(
    (order) => order.userId && !userIds.has(order.userId)
  );

  console.log("Orders total:", orders.length);
  console.log("Orphan orders:", orphanOrders.length);
  if (orphanOrders.length > 0) {
    const sample = orphanOrders.slice(0, 20).map((order) => ({
      $id: order.$id,
      userId: order.userId,
      orderNumber: order.orderNumber,
      status: order.status,
      isPaid: order.isPaid,
      createdAt: order.$createdAt,
    }));
    console.log(JSON.stringify(sample, null, 2));
  }
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
