import { Router } from "express";
import { z } from "zod";
import {
  getChallengeByDepositTxHash,
  getChallengeByMemo,
  updateChallengeStatus,
} from "../db/queries/challenges";
import { findPayoutByTxHash } from "../db/queries/payouts";
import { webhookLimiter } from "../middleware/rate-limit";
import { logger } from "../lib/logger";
import { config } from "../lib/config";

const router = Router();

const DepositWebhookSchema = z
  .object({
    memo: z.string().uuid("memo must be a valid UUID"),
    txHash: z.string().regex(/^[0-9a-fA-F]{64}$/, "txHash must be a 64-character hex string"),
    amount: z.string().regex(/^\d+(\.\d{1,7})?$/, "amount must be a numeric string").optional(),
  })
  .strict();

/**
 * POST /webhooks/stellar/deposit
 * Internal webhook: called by the deposit monitor when a matching USDC
 * payment is detected on-chain. Activates the challenge.
 */
router.post("/stellar/deposit", webhookLimiter, async (req, res) => {
  const secret = req.headers["x-webhook-secret"];
  if (secret !== config.WEBHOOK_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = DepositWebhookSchema.parse(req.body);

  const duplicateChallenge = await getChallengeByDepositTxHash(body.txHash);
  const duplicatePayout = await findPayoutByTxHash(body.txHash);
  if (duplicateChallenge || duplicatePayout) {
    res.status(200).json({ status: "duplicate_tx_ignored" });
    return;
  }

  const challenge = await getChallengeByMemo(body.memo);
  if (!challenge) {
    logger.warn("Deposit received for unknown challenge memo", {
      memo: body.memo,
      txHash: body.txHash,
    });
    res.status(404).json({ error: "Unknown memo" });
    return;
  }

  if (challenge.status !== "pending_deposit") {
    res.json({ status: "already_processed" });
    return;
  }

  await updateChallengeStatus(challenge.id, "active", { depositTx: body.txHash });
  logger.info("Challenge activated via deposit", {
    challengeId: challenge.id,
    txHash: body.txHash,
    amount: body.amount,
  });

  res.json({ status: "activated", challengeId: challenge.id });
});

export default router;