const { config, listAllDocuments } = require("./appwrite-client");

const groupBy = (items, keyFn) => {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    const existing = map.get(key) || [];
    existing.push(item);
    map.set(key, existing);
  }
  return map;
};

const summarizeUser = (doc) => ({
  $id: doc.$id,
  accountId: doc.accountId,
  email: doc.email,
  name: doc.name,
});

const main = async () => {
  const users = await listAllDocuments({
    collectionId: config.userCollectionId,
  });

  const byAccountId = groupBy(users, (doc) => doc.accountId);
  const duplicates = [];

  for (const [accountId, docs] of byAccountId.entries()) {
    if (docs.length > 1) {
      duplicates.push({ accountId, docs: docs.map(summarizeUser) });
    }
  }

  const idMismatches = users
    .filter((doc) => doc.accountId && doc.$id !== doc.accountId)
    .map(summarizeUser);

  console.log("Users total:", users.length);
  console.log("Duplicate accountId entries:", duplicates.length);
  if (duplicates.length > 0) {
    console.log(JSON.stringify(duplicates, null, 2));
  }

  console.log("Docs where $id != accountId:", idMismatches.length);
  if (idMismatches.length > 0) {
    console.log(JSON.stringify(idMismatches, null, 2));
  }
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
