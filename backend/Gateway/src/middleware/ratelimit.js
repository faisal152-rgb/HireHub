const redisClient = require("../config/redis");

const rateLimiterAdmin = async (req, res, next) => {
  try {
    if (!redisClient || typeof redisClient.incr !== "function" || redisClient.status !== "ready") {
      return next(); // Fail open if Redis is not connected
    }
    const ip = req.ip || req.connection.remoteAddress || "admin";
    const key = `ratelimit:admin:${ip}`;
    const count = await redisClient.incr(key);
    if (count === 1) {
      await redisClient.expire(key, 60);
    }
    if (count > 100) {
      return res.status(429).json({ message: "Too many requests. Please try again later.", error: "Too many requests" });
    }
    next();
  } catch (error) {
    console.warn("RateLimiter Admin error:", error.message);
    next(); // Fail open on error
  }
};

const rateLimiterRecruiter = async (req, res, next) => {
  try {
    if (!redisClient || typeof redisClient.incr !== "function" || redisClient.status !== "ready") {
      return next(); // Fail open if Redis is not connected
    }
    const ip = req.ip || req.connection.remoteAddress || "recruiter";
    const key = `ratelimit:recruiter:${ip}`;
    const count = await redisClient.incr(key);
    if (count === 1) {
      await redisClient.expire(key, 60);
    }
    if (count > 100) {
      return res.status(429).json({ message: "Too many requests. Please try again later.", error: "Too many requests" });
    }
    next();
  } catch (error) {
    console.warn("RateLimiter Recruiter error:", error.message);
    next(); // Fail open on error
  }
};

const rateLimiterCandidate = async (req, res, next) => {
  try {
    if (!redisClient || typeof redisClient.incr !== "function" || redisClient.status !== "ready") {
      return next(); // Fail open if Redis is not connected
    }
    const ip = req.ip || req.connection.remoteAddress || "candidate";
    const key = `ratelimit:candidate:${ip}`;
    const count = await redisClient.incr(key);
    if (count === 1) {
      await redisClient.expire(key, 60);
    }
    if (count > 100) {
      return res.status(429).json({ message: "Too many requests. Please try again later.", error: "Too many requests" });
    }
    next();
  } catch (error) {
    console.warn("RateLimiter Candidate error:", error.message);
    next(); // Fail open on error
  }
};

module.exports = {
  rateLimiterAdmin,
  rateLimiterRecruiter,
  rateLimiterCandidate,
};
