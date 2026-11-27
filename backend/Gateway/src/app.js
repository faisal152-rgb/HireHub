const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const compression = require("compression");
const { connectRedis } = require("./config/redis.js");
const morgan = require("morgan");


const app = express();

app.use(helmet())
app.use(morgan('dev'))
app.use(cors({
    origin: process.env.ORIGIN_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}))



// Body and Cookie parsers
app.use(cookieParser());
app.use(compression());
app.use(express.json());

// Health API 
app.get("/health", (req, res) => {
 res.status(200).json({
    success: true,
    service: "HireHub API Gateway",
    satatus: "OK",
    timestamp: new
    Date().toISOString()
 });
});



// Candidate Routes
app.use("/api", require("./router/candidate.js"));

// Recruiter Routes
app.use("/api", require("./router/recruiter.js"));

// Admin Routes
app.use("/api", require("./router/admin.js"));


// Connect the Redis
connectRedis();





module.exports = app;