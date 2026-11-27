const Redis = require("ioredis");

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Shared connection instance used by BullMQ Workers & Queues
const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times) {
    return Math.min(times * 100, 3000);
  },
});

connection.on("connect", () => console.log("Redis Successfully Connected"));
connection.on("error", (e) => console.warn("Redis Warning:", e.message));

async function connectRedis() {
  try {
    if (connection.status === "wait") await connection.connect();
    console.log("Redis Successfully Connected");
  } catch (error) {
    console.warn("Redis Connection Warning:", error.message);
  }
}

module.exports = connectRedis;
module.exports.connection = connection;
module.exports.connectRedis = connectRedis;