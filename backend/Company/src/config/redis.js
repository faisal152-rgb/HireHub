const Redis = require("ioredis");

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// BullMQ explicitly requires maxRetriesPerRequest: null
const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    // Reconnect after delay, capped at 3 seconds
    return Math.min(times * 100, 3000);
  },
});

connection.on("connect", () => {
  console.log("Company Redis Successfully Connected");
});

connection.on("error", (error) => {
  console.warn("Company Redis Connection Warning:", error.message);
});

// Callable function for app.js: connectRedis()
function connectRedis() {
  return connection;
}

// Proxy connectRedis so it can be called as a function (connectRedis())
// AND used as an object (connectRedis.get, connectRedis.set, connectRedis.del, connectRedis.connection)
const connectRedisProxy = new Proxy(connectRedis, {
  get(target, prop) {
    if (prop === "connection" || prop === "redisClient") return connection;
    if (prop === "connectRedis") return connectRedisProxy;
    if (prop in target) return target[prop];
    const val = connection[prop];
    if (typeof val === "function") {
      return val.bind(connection);
    }
    return val;
  },
});

module.exports = connectRedisProxy;
module.exports.connectRedis = connectRedisProxy;
module.exports.connection = connection;
module.exports.redisClient = connection;
