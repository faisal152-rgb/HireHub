const { Kafka } = require("kafkajs");

const isSSL = process.env.KAFKA_SSL === "true" || process.env.KAFKA_SSL === true;
const username = process.env.KAFKA_API_KEY || process.env.KAFKA_USERNAME;
const password = process.env.KAFKA_API_SECRET || process.env.KAFKA_PASSWORD;

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || "hirehub-company-service",
  brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
  ssl: isSSL,
  sasl: username && password ? {
    mechanism: "plain",
    username: username,
    password: password,
  } : undefined,
  connectionTimeout: 10000,
  authenticationTimeout: 10000,
  retry: {
    initialRetryTime: 300,
    retries: 8,
  },
});

module.exports = {
  kafka,
};
