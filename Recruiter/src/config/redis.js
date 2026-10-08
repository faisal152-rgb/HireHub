const Redis =require("ioredis");


async function connectRedis(){
    try {
        const redisclient =await new Redis(process.env.REDIS_URL);
            console.log("Redis Sucessfully Connected");
    } catch (error) {
        console.log("Redis Connection Failed",error);
    }
}

module.exports = connectRedis;