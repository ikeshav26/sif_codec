import { Resend } from "resend";

function getResendClient(): { resend: Resend | null; fromEmail: string } {
  const apiKey = process.env.RESEND_API_KEY;
  const resend = apiKey ? new Resend(apiKey) : null;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "SIF Security <security@ikeshav.in>";
  return { resend, fromEmail };
}

export interface VerificationEmailParams {
  toEmail: string;
  senderName: string;
  senderEmail: string;
  imageUuid: string;
  fileName: string;
  token: string;
  appUrl?: string;
}

export async function sendOwnershipVerificationEmail(
  params: VerificationEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const {
    toEmail,
    senderName,
    senderEmail,
    imageUuid,
    fileName,
    token,
    appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001",
  } = params;

  const { resend, fromEmail } = getResendClient();

  const approveUrl = `${appUrl}/verify?token=${encodeURIComponent(token)}&action=approve`;
  const rejectUrl = `${appUrl}/verify?token=${encodeURIComponent(token)}&action=reject`;
  const subject = `🚨 SIF Transfer Request: ${senderName} wants to share your container`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #fafafa; color: #111; margin: 0; padding: 24px; }
          .card { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #eaeaea; border-radius: 12px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .badge { display: inline-block; background: #000; color: #fff; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 4px; font-family: monospace; }
          h2 { margin-top: 18px; margin-bottom: 8px; font-size: 20px; color: #000; }
          p { font-size: 14px; line-height: 1.5; color: #444; }
          .details { background: #f8f8f8; border: 1px solid #eee; border-radius: 8px; padding: 16px; font-family: monospace; font-size: 12px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .detail-row:last-child { margin-bottom: 0; }
          .detail-label { color: #888; }
          .detail-val { color: #000; font-weight: 600; word-break: break-all; }
          .btn-container { margin: 26px 0 16px 0; display: flex; gap: 12px; }
          .btn-approve { display: inline-block; background: #059669; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; text-align: center; }
          .btn-reject { display: inline-block; background: #dc2626; color: #ffffff !important; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-size: 14px; font-weight: 600; text-align: center; }
          .footer { font-size: 11px; color: #999; margin-top: 28px; text-align: center; border-top: 1px solid #f0f0f0; pt: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <span class="badge">SIF ZERO-DB PROVENANCE GATE</span>
          <h2>Container Transfer Authorization</h2>
          <p>
            Another user is attempting to post a <strong>.sif</strong> container in <strong>SIF Secure Chat</strong> that is cryptographically signed to your identity.
          </p>
          
          <div class="details">
            <div class="detail-row">
              <span class="detail-label">Forwarder:</span>
              <span class="detail-val">${senderName} (${senderEmail})</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">File:</span>
              <span class="detail-val">${fileName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Container UUID:</span>
              <span class="detail-val">${imageUuid}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Time:</span>
              <span class="detail-val">${new Date().toUTCString()}</span>
            </div>
          </div>

          <p style="font-size: 13px; color: #555;">
            The container is currently held in <strong>Pending Verification</strong> state in the chat. Please choose whether to authorize this transmission:
          </p>

          <div class="btn-container">
            <a href="${approveUrl}" class="btn-approve" target="_blank">
              ✅ Authorize & Release to Chat
            </a>
            &nbsp;
            <a href="${rejectUrl}" class="btn-reject" target="_blank">
              ❌ Reject Transfer
            </a>
          </div>

          <div class="footer">
            SIF Secure Image Format • Decentralized Zero-DB Provenance & Access Control
          </div>
        </div>
      </body>
    </html>
  `;

  let recipient = toEmail;
  if (recipient.endsWith("@sif.io")) {
    const backup = process.env.DEFAULT_OWNER_ALERT_EMAIL || "keshav@ikeshav.in";
    console.log(
      `[Chat Email Notice] Recipient ${toEmail} is a demo identity. Routing live authorization email to ${backup} for testing.`
    );
    recipient = backup;
  }

  if (!resend) {
    console.log(`\n================== [CHAT APP EMAIL SIMULATION] ==================`);
    console.log(`To: ${recipient} (Original: ${toEmail})`);
    console.log(`Subject: ${subject}`);
    console.log(`Approve Link: ${approveUrl}`);
    console.log(`Reject Link: ${rejectUrl}`);
    console.log(`Note: Set RESEND_API_KEY in .env.local for live Resend dispatch.`);
    console.log(`=================================================================\n`);
    return { success: true, messageId: "simulated-" + token };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [recipient],
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error("[Chat Resend Error] Failed to send verification email to", recipient, ":", error);
      return { success: false, error: error.message };
    }

    console.log(
      `\n=================================================================` +
      `\n[Chat Resend Success] Authorization email delivered to ${recipient}!` +
      `\nMessage ID: ${data?.id}` +
      `\nApprove URL: ${approveUrl}` +
      `\n=================================================================\n`
    );
    return { success: true, messageId: data?.id };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Chat Resend Exception]:", errorMsg);
    return { success: false, error: errorMsg };
  }
}
