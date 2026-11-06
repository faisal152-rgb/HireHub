const { Partitioners } = require("kafkajs");
const { kafka } = require("../../config/kafka");

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
});

let isProducerConnected = false;

async function connectProducer() {
  if (isProducerConnected) return producer;
  try {
    await producer.connect();
    isProducerConnected = true;
    console.log(" Kafka Producer connected successfully in Admin");
    return producer;
  } catch (error) {
    console.error(" Kafka Producer connection failed in Admin:", error.message);
  }
}

async function publishEvent(topic, message, key = null) {
  try {
    if (!isProducerConnected) {
      await connectProducer();
    }
    await producer.send({
      topic,
      messages: [
        {
          key: key ? String(key) : null,
          value: JSON.stringify(message),
          headers: {
            source: "admin-service",
            timestamp: new Date().toISOString(),
          },
        },
      ],
    });
    console.log(` Kafka Event published from Admin to topic [${topic}]`);
  } catch (error) {
    console.error(` Failed to publish event from Admin to topic [${topic}]:`, error.message);
  }
}


module.exports = {
    producer,
    connectProducer,
    publishEvent
}