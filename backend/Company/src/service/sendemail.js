const { google } = require("googleapis");

// OAuth2 configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://google.com" // Optional but recommended
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// Gmail API client
const gmail = google.gmail({
  version: "v1",
  auth: oauth2Client,
});



const transporter = require("../config/email");
const {
  generateQRCodeBuffer,
  getRecruiterInviteHtml,
} = require("../utils/generateqrcode");

// CID must be in email-address format — Nodemailer official docs requirement
const QR_CID = "qr@hirehub.com";

const sendRecruiterInviteEmail = async ({
  to,
  company,
  inviteUrl,
  qrCodeUrl = inviteUrl,
}) => {
  try {
    const companyName = company?.name || "Our Company";
    const inviteCode = company?.inviteCode || "";
    const targetQrUrl = qrCodeUrl || inviteUrl;

    let qrCodeSrc = "";
    const attachments = [];

    try {
      const qrBuffer = await generateQRCodeBuffer(targetQrUrl);

      console.log("QR Buffer size:", qrBuffer.length, "bytes");

      attachments.push({
        filename: "invite-qr.png",
        content: qrBuffer,
        cid: QR_CID,
      });

      qrCodeSrc = `cid:${QR_CID}`;

      console.log("qrCodeSrc set to:", qrCodeSrc);

    } catch (err) {
      console.error("QR generation failed:", err.message);
    }

    const html = getRecruiterInviteHtml({
      companyName,
      inviteCode,
      inviteUrl,
      qrCodeSrc,
    });

    const srcCheck =
      html.match(/src="([^"]{0,80})/)?.[1] ?? "NOT FOUND";

    console.log("img src in HTML:", srcCheck);

    const info = await transporter.sendMail({
      from: `"HireHub" <${process.env.GOOGLE_USER || "no-reply@hirehub.com"}>`,
      to,
      subject: `Invitation to join ${companyName} on HireHub`,
      html,
      attachments,
    });

    const raw = info.message.toString("base64url");

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    console.log("Recruiter invitation sent:", response.data.id);

    return response.data;

  } catch (error) {
    console.error(
      "Recruiter invitation email failed:",
      error.message
    );

    throw error;
  }
};


// Keep sendEmail generic for other use cases
const sendEmail = async (to, subject, text, html, attachments = []) => {
  try {
    const opts = {
      from: `"HireHub" <${process.env.GOOGLE_USER}>`,
      to,
      subject,
      html,
      attachments,
    };

    if (text) opts.text = text;

    const info = await transporter.sendMail(opts);

    const raw = info.message.toString("base64url");

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });
    console.log("Email sent successfully:", response.data.id);
    return response.data;

  } catch (error) {
    console.error("Email send error:", error.message);
    throw error;
  }
};

sendEmail.sendEmail = sendEmail;
sendEmail.sendRecruiterInviteEmail = sendRecruiterInviteEmail;
module.exports = sendEmail;


