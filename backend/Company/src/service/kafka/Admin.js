const { kafka } = require("../../config/kafka");


const REQUIRED_TOPICS = [
  "job-events",
  "application-events",
  "application-status-events",
  "interview-events",
  "recruiter-events",
  "company-events",
  "candidate-events",
  "notification-events",
];

async function KafkaAdmin() {
  const admin = kafka.admin();
  try {
    console.log("Company Admin Connecting.....");
    await admin.connect();
    console.log("Company Admin Connected Successfully");

    let existingTopics = [];
    try {
      existingTopics = await admin.listTopics();
    } catch (listErr) {
      console.warn("Company Kafka Admin could not list topics:", listErr.message);
    }

    const topicsToCreate = REQUIRED_TOPICS.filter((t) => !existingTopics.includes(t)).map((topic) => ({
      topic,
      numPartitions: 2,
      replicationFactor: 1,
    }));

    if (topicsToCreate.length > 0) {
      await admin.createTopics({
        waitForLeaders: true,
        topics: topicsToCreate,
      });
      console.log(`Company Kafka Topics created successfully: ${topicsToCreate.map((t) => t.topic).join(", ")}`);
    } else {
      console.log("All Company Kafka topics already exist.");
    }
  } catch (error) {
    console.error("Error creating Company Kafka topics:", error.message);
  } finally {
    try {
      await admin.disconnect();
      console.log("Company Kafka Admin disconnected");
    } catch (disconnectErr) {
      console.warn("Company Kafka Admin disconnect error:", disconnectErr.message);
    }
  }
}
module.exports = {
  KafkaAdmin,
}