const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");
const connectRedis = require("./config/redis");
const { connectImagekit } = require("./config/imagekit");

// Kafka
const { KafkaAdmin } = require("./service/kafka/Admin.js");
const { connectProducer } = require("./service/kafka/Producer.js");
const { startKafkaConsumer } = require("./service/kafka/Consumer.js");

// BullMQ Workers (Email, Notification, Job, Interview & Company Join)
require("./queues/Works/Notificationwork.js");
require("./queues/Works/emailwork.js");
require("./queues/Works/jobwork.js");
require("./queues/Works/interviewwork.js");
require("./queues/Works/joinCompanywork.js");
require("./queues/Works/imageWorker.js");

// Routes
const recruiterAuth = require("./router/auth.js");
const company = require("./router/company.js");
const recruiter = require("./router/recruiter.js");
const cookieParser = require("cookie-parser");
const job = require("./router/job.js");
const assessmentRules = require("./router/assessmentRules.js");
const interview = require("./router/interview.js");
const notification = require("./router/notification.js");

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

//LOG


// Company & Recruiter Auth Routes (accessible via /company/* and /auth/*)
app.use("/company", recruiterAuth);
app.use("/auth", recruiterAuth);

// Notifications must be registered before the generic company "/:id" route.
// Otherwise "/company/notifications" is treated as a public company profile ID.
app.use("/company/notifications", notification);

// Company Profile & Management Routes
app.use("/company", company);

// Recruiter Profile Routes
app.use("/recruiter", recruiter);

// Recruiter Job Management Routes
app.use("/job", job);

// Assessment Rules & Configuration Routes
app.use("/assessment-rules", assessmentRules);

// Recruiter Interview Scheduling Routes
app.use("/interview", interview);

// Recruiter Notification Routes
app.use("/notification", notification);

// Connect the Database
connectDB();

// Connect the Redis
connectRedis();

// Connect the Imagekit
connectImagekit();

// Connect Kafka Admin, Producer & Consumer in order
const initKafka = async () => {
  try {
    await KafkaAdmin();
    await connectProducer();
    await startKafkaConsumer();
  } catch (err) {
    console.error("Kafka initialization error in Company Service:", err.message);
  }
};
initKafka();



module.exports = app;