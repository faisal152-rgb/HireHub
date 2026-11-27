const { kafka } = require("../../config/kafka");

const CANDIDATE_TOPICS = [
  "job-events",
  "application-status-events",
  "interview-events",
  "application-review-events",
  "candidate-events",
  "notification-events",
];

async function KafkaAdmin() {
  const admin = kafka.admin();
  try {
    console.log("[Candidate Kafka Admin] Connecting...");
    await admin.connect();
    console.log("[Candidate Kafka Admin] Connected Successfully");

    let existingTopics = [];
    try {
      existingTopics = await admin.listTopics();
    } catch (listErr) {
      console.warn("[Candidate Kafka Admin] Could not list topics:", listErr.message);
    }

    const isCloud = process.env.KAFKA_SSL === "true" || process.env.KAFKA_SSL === true;
    const replicationFactor = process.env.KAFKA_REPLICATION_FACTOR
      ? parseInt(process.env.KAFKA_REPLICATION_FACTOR, 10)
      : (isCloud ? 3 : 1);

    const topicsToCreate = CANDIDATE_TOPICS.filter((t) => !existingTopics.includes(t)).map((topic) => ({
      topic,
      numPartitions: 2,
      replicationFactor,
    }));

    if (topicsToCreate.length > 0) {
      await admin.createTopics({
        waitForLeaders: true,
        topics: topicsToCreate,
      });
      console.log(`[Candidate Kafka Admin] Kafka Topics created successfully: ${topicsToCreate.map((t) => t.topic).join(", ")}`);
    } else {
      console.log("[Candidate Kafka Admin] All required Kafka topics already exist.");
    }
  } catch (error) {
    console.error("[Candidate Kafka Admin] Error configuring Kafka topics:", error.message);
  } finally {
    try {
      await admin.disconnect();
      console.log("[Candidate Kafka Admin] Disconnected");
    } catch (discErr) {
      console.warn("[Candidate Kafka Admin] Disconnect warning:", discErr.message);
    }
  }
}

module.exports = {
  KafkaAdmin,
};
