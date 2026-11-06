const { kafka } = require("../../config/kafka");

const REQUIRED_TOPICS = [
  "application-events",
  "job-events",
  "application-status-events",
  "application-review-events",
  "interview-events",
  "candidate-events",
  "recruiter-events",
  "company-events",
  "audit-log-events",
  "notification-events",
  "platform-report-events",
];

async function KafkaAdmin() {
  const admin = kafka.admin();
  try {
    console.log("[Kafka Admin] Connecting...");
    await admin.connect();
    console.log("[Kafka Admin] Connected successfully");

    // Fetch existing topics to avoid unnecessary duplication or errors
    let existingTopics = [];
    try {
      existingTopics = await admin.listTopics();
    } catch (listErr) {
      console.warn("[Kafka Admin] Could not list existing topics, proceeding to create:", listErr.message);
    }

    const topicsToCreate = REQUIRED_TOPICS.filter((t) => !existingTopics.includes(t)).map((topic) => ({
      topic,
      numPartitions: 2,
      replicationFactor: 1,
    }));

    if (topicsToCreate.length > 0) {
      const result = await admin.createTopics({
        waitForLeaders: true,
        topics: topicsToCreate,
      });
      console.log(`[Kafka Admin] ${topicsToCreate.length} Kafka Topics created successfully:`, result);
    } else {
      console.log("[Kafka Admin] All required Kafka topics already exist.");
    }
  } catch (error) {
    console.error("[Kafka Admin] Error configuring Kafka topics:", error.message);
  } finally {
    try {
      await admin.disconnect();
      console.log("[Kafka Admin] Disconnected");
    } catch (discErr) {
      console.warn("[Kafka Admin] Disconnect warning:", discErr.message);
    }
  }
}

module.exports = {
  KafkaAdmin,
  REQUIRED_TOPICS,
};