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
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}))



// Body and Cookie parsers
app.use(cookieParser());
app.use(compression());
app.use(express.json());




// Connect the Redis
connectRedis();

// Candidate Routes
app.use("/api", require("./router/candidate.js"));

// Recruiter Routes
app.use("/api", require("./router/recruiter.js"));

// Admin Routes
app.use("/api", require("./router/admin.js"));




module.exports = app;