const express = require("express");
require("dotenv").config();
const connectDB=require("./config/db.js");
const connectRedis=require("./config/redis.js");
const connectImagekit=require("./config/imagekit.js");


const app=express();
app.use(express.json());

//Connect the Database
connectDB();

//Connect the Redis
connectRedis();

//Connect the Imagekit
connectImagekit();




module.exports = app