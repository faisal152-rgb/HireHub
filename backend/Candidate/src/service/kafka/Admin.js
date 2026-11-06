const { kafka } = require("../../config/kafka");


async function KafkaAdmin() {
  try {
    const admin = kafka.admin();
    console.log("Admin Connecting.....");
    await admin.connect();
    console.log("Admin Connected Successfully");
    // Create Topics
    await admin.createTopics({
      topics: [{
        topic: 'job-events',
        numPartitions: 2,
      },
      {
        topic: 'application-status-events',
        numPartitions: 2,
      },
      {
        topic: 'interview-events',
        numPartitions: 2,
      },
      {
        topic: "application-review-events",
        numPartitions: 2,
      },
      {
        topic: "candidate-events",
        numPartitions: 2,
      },
      {
        topic: "notification-events",
        numPartitions: 2,
      },
    ],
    });
    console.log(" Kafka Topics created successfully");
    await admin.disconnect();
    console.log(" Kafka Admin disconnected");

  } catch (error) {
    console.log("Error creating Kafka topics:", error);
  }
}
module.exports = {
  KafkaAdmin,
}