const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  streamTransport: true,
  buffer: true,
  newline: "windows", // Standard CRLF for emails
});

module.exports = transporter;
