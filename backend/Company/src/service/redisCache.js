const connectRedis = require("../config/redis");

async function deleteKeysByPattern(pattern) {
  let cursor = "0";
  let deletedCount = 0;

  do {
    const [nextCursor, keys] = await connectRedis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100
    );
    cursor = nextCursor;
    if (keys.length > 0) {
      deletedCount += await connectRedis.del(...keys);
    }
  } while (cursor !== "0");

  return deletedCount;
}

module.exports = { deleteKeysByPattern };
