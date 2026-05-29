import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKETS, getPublicUrl } from "@brandblitz/storage";
import { redis } from "../lib/redis";
import { authenticate } from "../middleware/authenticate";
import { uploadLimiter } from "../middleware/rate-limit";
import { createError } from "../middleware/error";

/** Redis key that proves a user owns a pending upload. TTL must outlive the
 *  presign window (60 s) plus the verify-retry window (~1.7 s × 3). 300 s is
 *  a generous but bounded limit — orphans not aborted within 5 min are swept
 *  by the server-side reaper (see docs/13-file-storage.md). */
const PENDING_UPLOAD_TTL_SECONDS = 300;

function pendingUploadKey(userId: string, s3Key: string): string {
  return `upload:pending:${userId}:${s3Key}`;
}

const router = Router();

const ALLOWED_UPLOAD_TYPES = {
  "brand-logo":    { bucket: BUCKETS.BRAND_ASSETS, prefix: "logos/",    maxMb: 2 },
  "product-image": { bucket: BUCKETS.BRAND_ASSETS, prefix: "products/", maxMb: 5 },
  "user-avatar":   { bucket: BUCKETS.BRAND_ASSETS, prefix: "avatars/",  maxMb: 1 },
} as const;

const ALLOWED_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];

const PresignSchema = z.object({
  type: z.enum(["brand-logo", "product-image", "user-avatar"]),
  contentType: z.enum(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]),
  contentLength: z.number().int().positive(),
});

/**
 * POST /upload/presign
 * Generate a presigned PUT URL for direct client → storage upload.
 * Files NEVER pass through the API server — no memory pressure.
 */
router.post("/presign", authenticate, uploadLimiter, async (req, res) => {
  const { type, contentType, contentLength } = PresignSchema.parse(req.body);

  const config = ALLOWED_UPLOAD_TYPES[type];
  if (contentLength > config.maxMb * 1024 * 1024) {
    throw createError(
      `Content length exceeds maximum of ${config.maxMb}MB for ${type}`,
      400
    );
  }

  const key = `${config.prefix}${randomUUID()}`;

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

  // Record ownership so /abort can verify the caller created this key
  await redis.set(
    pendingUploadKey(req.user!.sub, key),
    "1",
    "EX",
    PENDING_UPLOAD_TTL_SECONDS
  );

  res.json({
    uploadUrl,
    key,
    publicUrl: getPublicUrl(config.bucket, key),
    expiresIn: 60,
  });
});

/**
 * POST /upload/verify
 * Verify a file was actually uploaded before accepting it in a form.
 */
router.post("/verify", authenticate, async (req, res) => {
  const { key } = z.object({ key: z.string() }).parse(req.body);

  // Determine bucket from key prefix
  const bucket = key.startsWith("logos/") || key.startsWith("products/") || key.startsWith("avatars/")
    ? BUCKETS.BRAND_ASSETS
    : BUCKETS.SHARE_CARDS;

  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    // Remove ownership record now that the upload is committed
    await redis.del(pendingUploadKey(req.user!.sub, key));
    res.json({ exists: true, publicUrl: getPublicUrl(bucket, key) });
  } catch {
    throw createError("File not found in storage", 404);
  }
});

/**
 * DELETE /upload/abort
 * Remove an orphan S3 object when /upload/verify could not be confirmed.
 * Called by the client after exhausting verify retries so the file does not
 * sit in storage indefinitely.
 */
router.delete("/abort", authenticate, async (req, res) => {
  const { key } = z.object({ key: z.string().min(1) }).parse(req.body);

  // IDOR guard: only the user who created the presign may abort it
  const ownershipKey = pendingUploadKey(req.user!.sub, key);
  const owned = await redis.get(ownershipKey);
  if (!owned) {
    throw createError("Not authorised to abort this upload", 403);
  }

  const bucket =
    key.startsWith("logos/") ||
    key.startsWith("products/") ||
    key.startsWith("avatars/")
      ? BUCKETS.BRAND_ASSETS
      : BUCKETS.SHARE_CARDS;

  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  await redis.del(ownershipKey);
  res.status(204).end();
});

export default router;
