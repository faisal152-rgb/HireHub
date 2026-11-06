function generateOtp() {
    return String(Math.floor(100000 + Math.random() * 900000))
}
function getOtpHtml(otp) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OTP VERIFICATION</title>
        <style>
            body {
                font-family: sans-serif;
                padding: 20px;
                background-color: #f5f5f5;
                box-sizing: border-box;
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                width: 100vw;
            }
            .container{
                background-color: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .otp {
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 2px;
                color: #2c3e50;
            }
            .timer {
                font-size: 16px;
                color: #666;
            }
        </style>
    </head>
    <body>
    <div style="font-family: sans-serif; padding: 20px;">
    <h1 style="color: #333;">Your One-Time Password (OTP)</h1>
    <p style="font-size: 18px; color: #666;">Please use the following code to verify your identity:</p>
    <div style="background-color: #f5f5f5; padding: 15px 20px; border-radius: 8px; margin: 20px 0; display: inline-block;">
        <strong style="font-size: 32px; letter-spacing: 2px; color: #2c3e50;">${otp}</strong>
    </div>
    <p style="font-size: 16px; color: #666;">This code will expire in <strong>10 minutes</strong>.</p>
    <p style="font-size: 16px; color: #666;">Do not share this code with anyone.</p>
    <p style="margin-top: 30px; font-size: 14px; color: #999;">Thank you,<br>Your App Team</p>
    </div>
    </body>
    </html>`
}
module.exports = { generateOtp, getOtpHtml };
