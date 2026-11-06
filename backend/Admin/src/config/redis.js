const Redis = require("ioredis");

const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  enableReadyCheck: false,
});

connection.on("connect", () => {
  console.log("Redis Successfully Connected");
});

connection.on("error", (error) => {
  console.warn("Redis Connection Warning:", error.message);
});

async function connectRedis() {
  try {
    if (connection.status === "wait") {
      await connection.connect();
    }
  } catch (error) {
    console.warn("Redis connect attempt warning:", error.message);
  }
  return connection;
}

module.exports = connectRedis;
module.exports.connection = connection;
module.exports.connectRedis = connectRedis;