const redisClient = require("../config/redis");


const rateLimiterAdmin = async (req, res, next) => {
    try {
        const ip = req.ip;
        const key = `ratelimit:${ip}`;
        const count = await redisClient.incr(key);
        if (count === 1) {
            await redisClient.expire(key, 60);
        }
        if (count > 100) {
            return res.json({ error: "Too many requests" });
        }
        next();

    } catch (error) {
        console.log(error);
        res.json({ error: "Internal server error" });

    }
}

const rateLimiterRecruiter = async (req, res, next) => {
    try {
        const ip = req.ip;
        const key = `ratelimit:${ip}`;
        const count = await redisClient.incr(key);
        if (count === 1) {
            await redisClient.expire(key, 60);
        }
        if (count > 70) {
            return res.json({ error: "Too many requests" });
        }
        next();

    } catch (error) {
        console.log(error);
        res.json({ error: "Internal server error" });

    }
}

const rateLimiterCandidate = async (req, res, next) => {
    try {
        const ip = req.ip;
        const key = `ratelimit:${ip}`;
        const count = await redisClient.incr(key);
        if (count === 1) {
            await redisClient.expire(key, 60);
        }
        if (count > 100) {
            return res.json({ error: "Too many requests" });
        }
        next();

    } catch (error) {
        console.log(error);
        res.json({ error: "Internal server error" });

    }
}


module.exports={rateLimiterAdmin,rateLimiterRecruiter,rateLimiterCandidate};
