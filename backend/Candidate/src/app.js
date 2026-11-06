const express = require("express");
require("dotenv").config();
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const connectDB = require("./config/db.js");
const connectRedis = require("./config/redis.js");
const connectImagekit = require("./config/imagekit.js");

// Kafka
const { KafkaAdmin } = require("./service/kafka/Admin.js");
const { connectProducer } = require("./service/kafka/Producer.js");
const { startKafkaConsumer } = require("./service/kafka/Consumer.js");

// BullMQ Workers (Email & Notification)
require("./queues/Works/Notificationwork.js");
require("./queues/Works/emailwork.js");

// Routes
const candidateProfile = require("./router/candidateProfile.js");
const candidateAuth = require("./router/auth.js");
const application = require("./router/application.js");
const assessment = require("./router/assessment.js");
const assessmentSubmit = require("./router/Submission.js");
const interview = require("./router/interview.js");
const notification = require("./router/notification.js");
const job = require("./router/job.js");

const cookieParser = require("cookie-parser");


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
app.use(express.json());

// Candidate Authentication Routes
app.use("/auth", candidateAuth);

// Candidate Profile Routes
app.use("/profile", candidateProfile);

// Job Listings Routes
app.use("/jobs", job);

// Application Routes
app.use("/application", application);

// Assessment Routes
app.use("/assessment", assessment);

// Assessment Submission Routes
app.use("/submit", assessmentSubmit);

// Interview Routes
app.use("/interview", interview);

// Notification Routes
app.use("/notification", notification);

// Connect the Database
connectDB();

// Connect the Redis
connectRedis();

// Connect the Imagekit
connectImagekit();

// Connect Kafka Producer & start Consumer
KafkaAdmin();
connectProducer();
startKafkaConsumer();




module.exports = app;