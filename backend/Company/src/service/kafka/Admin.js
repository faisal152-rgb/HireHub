const { kafka } = require("../../config/kafka");

const COMPANY_TOPICS = [
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
    console.log("[Company Kafka Admin] Connecting...");
    await admin.connect();
    console.log("[Company Kafka Admin] Connected Successfully");

    let existingTopics = [];
    try {
      existingTopics = await admin.listTopics();
    } catch (listErr) {
      console.warn("[Company Kafka Admin] could not list topics:", listErr.message);
    }

    const isCloud = process.env.KAFKA_SSL === "true" || process.env.KAFKA_SSL === true;
    const replicationFactor = process.env.KAFKA_REPLICATION_FACTOR
      ? parseInt(process.env.KAFKA_REPLICATION_FACTOR, 10)
      : (isCloud ? 3 : 1);

    const topicsToCreate = COMPANY_TOPICS.filter((t) => !existingTopics.includes(t)).map((topic) => ({
      topic,
      numPartitions: 2,
      replicationFactor,
    }));

    if (topicsToCreate.length > 0) {
      await admin.createTopics({
        waitForLeaders: true,
        topics: topicsToCreate,
      });
      console.log(`[Company Kafka Admin] Kafka Topics created successfully: ${topicsToCreate.map((t) => t.topic).join(", ")}`);
    } else {
      console.log("[Company Kafka Admin] All required Kafka topics already exist.");
    }
  } catch (error) {
    console.error("[Company Kafka Admin] Error configuring Kafka topics:", error.message);
  } finally {
    try {
      await admin.disconnect();
      console.log("[Company Kafka Admin] Disconnected");
    } catch (disconnectErr) {
      console.warn("[Company Kafka Admin] Disconnect warning:", disconnectErr.message);
    }
  }
}

module.exports = {
  KafkaAdmin,
};
