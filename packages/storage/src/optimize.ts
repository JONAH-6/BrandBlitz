import { createHash } from "crypto";
import sharp from "sharp";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKETS, uploadObject } from "./client";

type ImageType = "brand-logo" | "product-image" | "user-avatar";

const SPECS: Record<ImageType, { width: number; height: number; fit: "contain" | "inside" | "cover" }> = {
  "brand-logo":    { width: 400, height: 400, fit: "contain" },
  "product-image": { width: 800, height: 600, fit: "inside" },
  "user-avatar":   { width: 200, height: 200, fit: "cover" },
};

export class StorageError extends Error {
  public code: string;
  constructor(message: string, public key: string, public bucket: string) {
    super(message);
    this.name = "StorageError";
    this.code = "STORAGE_BODY_EMPTY";
  }
}

/**
 * Fetch the original image from storage, resize + convert to WebP, overwrite in place.
 * Called after brand kit form submission — not at presign time (keeps presign flow fast).
 *
 * @returns The new key (with .webp extension)
 */
export async function optimizeImage(key: string, type: ImageType): Promise<string> {
  const spec = SPECS[type];

  const original = await s3.send(
    new GetObjectCommand({ Bucket: BUCKETS.BRAND_ASSETS, Key: key })
  );

  if (!original.Body) {
    throw new StorageError(
      `Failed to retrieve original image from storage for key: ${key}. Body is empty or missing.`,
      key,
      BUCKETS.BRAND_ASSETS
    );
  }

  const buffer = Buffer.from(await original.Body.transformToByteArray());

  // Check if format is supported and if image is valid
  try {
    const metadata = await sharp(buffer).metadata();
    const supportedFormats = ["jpeg", "jpg", "png", "webp", "avif", "tiff"];
    if (!metadata.format || !supportedFormats.includes(metadata.format)) {
      console.warn(`[storage] Unsupported image format: ${metadata.format}. Skipping optimization for ${key}.`);
      return key;
    }
  } catch (error) {
    console.warn(`[storage] Failed to process image metadata for ${key}. Skipping optimization. Reason: ${(error as Error).message}`);
    return key;
  }

  const optimized = await sharp(buffer)
    .resize(spec.width, spec.height, {
      fit: spec.fit,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .webp({ quality: 85 })
    .toBuffer();

  // Embed an 8-hex-char content hash so the URL is stable for identical content
  // and safe to serve with `Cache-Control: immutable`.
  const hash = createHash("sha256").update(optimized).digest("hex").slice(0, 8);
  const base = key.replace(/\.[^.]+$/, "");
  const optimizedKey = `${base}-${hash}.webp`;

  await uploadObject({
    bucket: BUCKETS.BRAND_ASSETS,
    key: optimizedKey,
    body: optimized,
    contentType: "image/webp",
    immutable: true,
  });

  return optimizedKey;
}
