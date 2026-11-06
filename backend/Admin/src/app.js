const express = require("express");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const helmet = require("helmet");
const  morgan = require("morgan");
const cors = require("cors");
const connectDB = require("./config/db.js");
const connectRedis = require("./config/redis.js");
const connectImagekit = require("./config/imagekit.js");


//Kafka
const { KafkaAdmin } = require("./service/kafka/Admin.js");
const { connectProducer } = require("./service/kafka/Producer.js");
const { startKafkaConsumer } = require("./service/kafka/Consumer.js");

// BullMQ Workers (Email & Notification)
require("./queues/Works/Notificationwork.js");
require("./queues/Works/emailwork.js");

// Router imports
const authRouter = require("./router/auth.js");
const adminRouter = require("./router/admin.js");
const userRouter = require("./router/User.js");
const recruiterRouter = require("./router/Recruiter.js");
const jobRouter = require("./router/job.js");
const applicationRouter = require("./router/Application.js");
const verificationRequestRouter = require("./router/VerificationRequest.js");
const platformReportRouter = require("./router/PlatfromReport.js");
const moderationLogRouter = require("./router/ModerationLog.js");
const auditLogRouter = require("./router/AuditLog.js");
const notificationRouter = require("./router/Notification.js");

// App configuration
const app = express();

app.use(helmet())
app.use(morgan('dev'))
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}))

app.use(express.json());
app.use(cookieParser());

// Authentication Routes
app.use("/auth", authRouter);

// Admin Consolidated Dashboard & Profile Routes
app.use("/admin", adminRouter);

// User Management & Status Routes
app.use("/user", userRouter);

// Recruiter & Job Creation Status Routes
app.use("/recruiter", recruiterRouter);

// Job Management & Status Routes
app.use("/job", jobRouter);

// Application & Status Routes
app.use("/application", applicationRouter);

// Verification Request Routes
app.use("/verification-request", verificationRequestRouter);

// Platform Report Routes
app.use("/platform-report", platformReportRouter);

// Moderation Log Routes
app.use("/moderation-log", moderationLogRouter);

// Audit Log Routes
app.use("/audit-log", auditLogRouter);

// Notification Routes
app.use("/notification", notificationRouter);

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


//connect BullMQ





module.exports = app;