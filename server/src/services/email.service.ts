import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    } : undefined,
});

export async function sendVerificationMail(to: string, username: string, token: string) {
    const verificationUrl = `${process.env.APP_URL}/api/auth/verify-email?token=${token}`;
    const mailOptions = {
        from: process.env.SMTP_FROM,
        to,
        subject: "Verify your email address - wirechat",
        html: buildVerificationEmailHtml(verificationUrl, username),
        text: `Verify your email: ${verificationUrl}`,
    };

    await transport.sendMail(mailOptions);
}


function buildVerificationEmailHtml(verifyUrl: string, username: string) {
  return `<!DOCTYPE html>
            <html lang="en">
            <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Verify your email</title>
            </head>
            <body style="margin:0; padding:0; background-color:#0d1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d1117; padding:40px 0;">
                <tr>
                <td align="center">
                    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#161b22; border-radius:12px; overflow:hidden; border:1px solid #30363d;">

                    <tr>
                        <td style="background-color:#1f6feb; padding:28px 32px; text-align:center;">
                        <span style="font-size:20px; font-weight:700; color:#ffffff; letter-spacing:0.5px;">wirechat</span>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:36px 32px 8px 32px;">
                        <h1 style="margin:0 0 12px 0; font-size:20px; color:#e6edf3; font-weight:600;">Verify your email address</h1>
                        <p style="margin:0 0 24px 0; font-size:14px; line-height:22px; color:#8b949e;">
                            Hey ${username}! Confirm your email address to unlock group rooms and get chatting.
                        </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:0 32px 32px 32px;" align="center">
                        <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                            <td style="border-radius:8px; background-color:#238636;">
                                <a href="${verifyUrl}" target="_blank"
                                style="display:inline-block; padding:12px 28px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:8px;">
                                Verify Email
                                </a>
                            </td>
                            </tr>
                        </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:0 32px 28px 32px;">
                        <p style="margin:0; font-size:12px; line-height:18px; color:#6e7681;">
                            Button not working? Paste this link into your browser:
                        </p>
                        <p style="margin:6px 0 0 0; font-size:12px; line-height:18px; word-break:break-all;">
                            <a href="${verifyUrl}" style="color:#58a6ff; text-decoration:none;">${verifyUrl}</a>
                        </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:0 32px 32px 32px; border-top:1px solid #30363d;">
                        <p style="margin:20px 0 0 0; font-size:12px; line-height:18px; color:#6e7681;">
                            This link expires in 24 hours. If you didn't create a wirechat account, you can safely ignore this email.
                        </p>
                        </td>
                    </tr>

                    </table>

                    <table role="presentation" width="480" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="padding:20px 32px; text-align:center;">
                        <p style="margin:0; font-size:11px; color:#484f58;">
                            wirechat &middot; Real-time chat, done right
                        </p>
                        </td>
                    </tr>
                    </table>

                </td>
                </tr>
            </table>
            </body>
            </html>`;
}