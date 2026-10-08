const express = require("express");
require("dotenv").config();
const connectRedis=require("./config/redis.js");


const app=express();
app.use(express.json());

//Connect the Redis
connectRedis();


//Candidate Routes
app.use("/api",require("./routes/candidate.js"));

//Recruiter Routes
app.use("/api",require("./routes/recruiter.js"));

//Admin Routes
app.use("/api",require("./routes/admin.js"));





module.exports = app