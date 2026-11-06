const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.GOOGLE_USER,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to Company email server:', error.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
    console.error('Tip: Check if GOOGLE_REFRESH_TOKEN is still valid or regenerate from Google OAuth Playground');
  } else {
    console.log('Company Email server is ready to send messages');
  }
});

module.exports = transporter;