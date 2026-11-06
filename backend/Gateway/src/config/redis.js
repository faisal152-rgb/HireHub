const Redis = require("ioredis");

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times) {
    return Math.min(times * 100, 3000);
  },
});

redisClient.on("connect", () => {
  console.log("Gateway Redis Successfully Connected");
});

redisClient.on("error", (error) => {
  console.warn("Gateway Redis Connection Warning:", error.message);
});

async function connectRedis() {
  try {
    if (redisClient.status === "wait") {
      await redisClient.connect();
    }
  } catch (err) {
    console.warn("Gateway Redis connect warning:", err.message);
  }
  return redisClient;
}

module.exports = redisClient;
module.exports.redisClient = redisClient;
module.exports.connectRedis = connectRedis;