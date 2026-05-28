import fetch from "node-fetch";
import { config } from "../api/src/lib/config";
import { signWebhookPayload } from "../api/src/middleware/verify-webhook";

export async function sendDepositWebhook(payload: Record<string, unknown>): Promise<void> {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signWebhookPayload(body, timestamp);

  await fetch(`${config.WEB_URL}/webhooks/stellar/deposit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": config.WEBHOOK_SECRET,
      "X-Webhook-Timestamp": String(timestamp),
      "X-Webhook-Signature": `sha256=${signature}`,
      "X-Webhook-Id": payload.txHash ? String(payload.txHash) : `${timestamp}-${Math.random()}`,
    },
    body,
  });
}
