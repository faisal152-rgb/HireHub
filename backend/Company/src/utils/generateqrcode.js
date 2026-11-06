const QRCode = require("qrcode");
const crypto = require("crypto");
const RecruiterInvite = require("../models/RecruiterInvite");

/**
 * Generate QR code as Base64 Data URL (used for API responses / frontend display)
 * @param {string} text - Link or data to encode
 * @returns {Promise<string>} Data URL string (data:image/png;base64,...)
 */
const generateQRCode = async (text) => {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 260,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });
  } catch (error) {
    console.error("Error generating QR code DataURL:", error);
    throw error;
  }
};

/**
 * Generate QR code as a raw PNG Buffer (used for email CID attachments)
 * @param {string} text - Link or data to encode
 * @returns {Promise<Buffer>} PNG Buffer
 */
const generateQRCodeBuffer = async (text) => {
  try {
    return await QRCode.toBuffer(text, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 260,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });
  } catch (error) {
    console.error("Error generating QR code Buffer:", error);
    throw error;
  }
};

/**
 * Generate a fresh invite code for a company, persist it to the DB,
 * build the invite URL, and return the generated QR code Data URL.
 *
 * @param {import('../models/auth/Company')} company - Mongoose Company document
 * @param {{ email?: string, persistOnCompany?: boolean }} [options]
 * @returns {Promise<{ inviteCode: string, inviteUrl: string, qrCode: string }>}
 */
const generateInviteLink = async (company, options = {}) => {
    const inviteCode = `INV-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    const invite = await RecruiterInvite.create({
        companyId: company._id,
        ...(options.email ? { email: options.email } : {}),
        inviteCode,
        // One-time email invites expire in 48 h; reusable company invites never expire
        expiresAt: options.email ? new Date(Date.now() + 48 * 60 * 60 * 1000) : null,
    });

    if (options.persistOnCompany !== false) {
      // Persist the reusable company invite code only for company invites.
      company.inviteCode = inviteCode;
      await company.save();
    }

    const baseUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const inviteUrl = `${baseUrl}/recruiter/join?code=${inviteCode}&companyId=${company._id}`;

    const qrCode = await generateQRCode(inviteUrl);

    return { invite, inviteCode, inviteUrl, qrCode };
};

/**
 * Generates responsive, modern HTML template for recruiter invitations
 * @param {Object} options
 * @param {string} options.companyName - Name of the inviting company
 * @param {string} options.inviteCode - Unique invite code of the company
 * @param {string} options.inviteUrl - Actionable invite link
 * @param {string} options.qrCodeSrc - Image source (CID e.g. 'cid:invite-qrcode' or base64 DataURL)
 * @returns {string} HTML email string
 */
const getRecruiterInviteHtml = ({
  companyName = "Our Company",
  inviteCode = "",
  inviteUrl = "#",
  qrCodeSrc = "",
}) => {
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to Join ${companyName} on HireHub</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 36px 28px; text-align: center;">
              <div style="display: inline-block; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 30px; padding: 6px 16px; margin-bottom: 12px;">
                <span style="color: #38bdf8; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">Team Invitation</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                Join <span style="color: #38bdf8;">${companyName}</span>
              </h1>
              <p style="color: #94a3b8; font-size: 15px; margin: 8px 0 0;">
                You've been invited to join as a recruiter on HireHub
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 32px 28px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #334155;">
                Hello,
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #475569;">
                <strong>${companyName}</strong> has invited you to collaborate with their recruitment team on <strong>HireHub</strong>. You'll be able to manage job openings, screen candidates, and track interviews seamlessly.
              </p>

              <!-- Primary Action Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 38px; border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 255, 0.25); text-align: center;">
                      Accept Invitation &amp; Join Team
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <div style="border-top: 1px solid #e2e8f0; margin: 28px 0;"></div>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 18px; background-color: #f8fafc; border-radius: 8px; padding: 16px;">
                <tr>
                  <td style="font-size: 13px; line-height: 1.7; color: #334155;">
                    <strong style="font-size: 14px; color: #1e293b;">QR Code Instructions</strong>
                    <ul style="margin: 8px 0; padding-left: 20px;">
                      <li>New Recruiters: Scan to join the company once.</li>
                      <li>Existing Recruiters: Scan again to verify membership.</li>
                      <li>Session Expired: Log in and rescan to regain access.</li>
                    </ul>
                    <p style="margin: 8px 0 0; color: #64748b;">
                      <strong>Note:</strong> No duplicate account or membership will be created.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Invite Code Info Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 20px; background-color: #eff6ff; border-radius: 8px; padding: 14px 16px;">
                <tr>
                  <td style="text-align: center;">
                    <span style="font-size: 13px; color: #1e40af; font-weight: 500;">Company Invite Code: </span>
                    <strong style="font-size: 16px; letter-spacing: 2px; color: #1d4ed8; font-family: monospace;">${inviteCode}</strong>
                  </td>
                </tr>
              </table>

              <!-- Link Fallback -->
              <p style="margin: 24px 0 0; font-size: 12px; line-height: 1.5; color: #94a3b8; word-break: break-all;">
                If the button above does not work, copy and paste this link into your browser:<br />
                <a href="${inviteUrl}" style="color: #2563eb; text-decoration: underline;">${inviteUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 13px; color: #64748b;">
                This invitation was sent on behalf of <strong>${companyName}</strong>.
              </p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                &copy; ${currentYear} HireHub Inc. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

module.exports = {
  generateQRCode,
  generateQRCodeBuffer,
  getRecruiterInviteHtml,
  generateInviteLink,
};
