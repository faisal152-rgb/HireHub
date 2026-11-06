const nodemailer = require("nodemailer");
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
  const companyName = company?.name || "Our Company";
  const inviteCode  = company?.inviteCode || "";
  const targetQrUrl = qrCodeUrl || inviteUrl;

  let qrCodeSrc  = "";
  const attachments = [];

  try {
    const qrBuffer = await generateQRCodeBuffer(targetQrUrl);
    console.log("QR Buffer size:", qrBuffer.length, "bytes");
    attachments.push({
      filename : "invite-qr.png",
      content  : qrBuffer,         
      cid      : QR_CID,           
    });

    qrCodeSrc = `cid:${QR_CID}`;  // "cid:qr@hirehub.com" → goes into <img src>
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

  // Log a snippet so we can verify src is correct in the HTML
  const srcCheck = html.match(/src="([^"]{0,80})/)?.[1] ?? "NOT FOUND";
  console.log("img src in HTML:", srcCheck);

  const info = await transporter.sendMail({
    from:`"HireHub" <${process.env.GOOGLE_USER || "no-reply@hirehub.com"}>`,
    to,
    subject:`Invitation to join ${companyName} on HireHub`,
    html,
    attachments,
  });

  console.log("Email sent:", info.messageId);
  if (process.env.NODE_ENV !== "production") {
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
  }
  return info;
};

// Keep sendEmail generic for other use cases
const sendEmail = async (to, subject, text, html, attachments = []) => {
  try {
    const opts = {
      from: `"HireHub" <${process.env.GOOGLE_USER || "no-reply@hirehub.com"}>`,
      to, subject, html, attachments,
    };
    if (text) opts.text = text;
    return await transporter.sendMail(opts);
  } catch (error) {
    console.error("Email send error:", error.message);
    throw error;
  }
};

sendEmail.sendEmail = sendEmail;
sendEmail.sendRecruiterInviteEmail = sendRecruiterInviteEmail;
module.exports = sendEmail;


