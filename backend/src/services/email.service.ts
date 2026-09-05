import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail = process.env.RESEND_FROM_EMAIL || "SIF Security <onboarding@resend.dev>";

export interface OwnershipAlertParams {
  toEmail: string;
  ownerName: string;
  imageUuid: string;
  originalName?: string;
  attemptedByUserId?: string;
  attemptedAt?: Date;
}

export async function sendOwnershipAlertEmail(params: OwnershipAlertParams): Promise<boolean> {
  const {
    toEmail,
    ownerName,
    imageUuid,
    originalName,
    attemptedByUserId,
    attemptedAt = new Date(),
  } = params;

  const subject = `🚨 Security Alert: SIF Container Ownership Violation Detected`;
  const formattedDate = attemptedAt.toUTCString();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #fafafa; color: #111; margin: 0; padding: 24px; }
          .card { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #eaeaea; border-radius: 8px; padding: 28px; }
          .badge { display: inline-block; background: #000; color: #fff; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 4px; font-family: monospace; }
          h2 { margin-top: 16px; margin-bottom: 8px; font-size: 18px; color: #000; }
          p { font-size: 14px; line-height: 1.5; color: #444; }
          .details { background: #f8f8f8; border: 1px solid #eee; border-radius: 6px; padding: 14px; font-family: monospace; font-size: 12px; margin: 18px 0; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
          .detail-label { color: #888; }
          .detail-val { color: #000; font-weight: 600; word-break: break-all; }
          .footer { font-size: 12px; color: #888; margin-top: 24px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <span class="badge">SIF PROVENANCE ALERT</span>
          <h2>Unauthorized SIF Re-Upload Blocked</h2>
          <p>Hello <strong>${ownerName || "Creator"}</strong>,</p>
          <p>
            The SIF Cryptographic Engine detected and successfully blocked an unauthorized attempt to register a <strong>.sif</strong> container cryptographically signed to your account.
          </p>
          
          <div class="details">
            <div class="detail-row">
              <span class="detail-label">Asset:</span>
              <span class="detail-val">${originalName || "Encrypted Image"}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">SIF UUID:</span>
              <span class="detail-val">${imageUuid}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Attempt Time:</span>
              <span class="detail-val">${formattedDate}</span>
            </div>
            ${
              attemptedByUserId
                ? `
            <div class="detail-row">
              <span class="detail-label">Attempted Uploader:</span>
              <span class="detail-val">${attemptedByUserId}</span>
            </div>
            `
                : ""
            }
            <div class="detail-row">
              <span class="detail-label">Protection:</span>
              <span class="detail-val">Ed25519 Authority Verified</span>
            </div>
          </div>

          <p style="font-size: 13px; color: #666;">
            No action is required from you. The file was rejected automatically because the uploader does not possess your private identity key.
          </p>

          <div class="footer">
            SIF Codec Security • Cryptographically Authenticated Image Standard
          </div>
        </div>
      </body>
    </html>
  `;

  if (!resend) {
    console.log(`\n================== [SIF EMAIL ALERT SIMULATION] ==================`);
    console.log(`To: ${toEmail} (${ownerName})`);
    console.log(`Subject: ${subject}`);
    console.log(`Image UUID: ${imageUuid}`);
    console.log(`Time: ${formattedDate}`);
    console.log(`Note: Set RESEND_API_KEY in .env to send live emails via Resend.`);
    console.log(`===================================================================\n`);
    return true;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error("[Resend Error] Failed to send email alert:", error);
      return false;
    }

    console.log(`[Resend Success] Ownership alert email sent to ${toEmail} (Message ID: ${data?.id})`);
    return true;
  } catch (err: any) {
    console.error("[Resend Exception] Error sending email:", err.message);
    return false;
  }
}
