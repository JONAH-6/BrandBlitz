#!/usr/bin/env tsx
/**
 * Generates per-developer .env values for local development.
 * Run once after cloning: npx tsx scripts/setup-dev-secrets.ts
 */

import { randomBytes } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ENV_FILE = join(process.cwd(), ".env");
const ENV_EXAMPLE = join(process.cwd(), ".env.example");

function randomSecret(bytes = 32): string {
  return randomBytes(bytes).toString("base64");
}

const GENERATED: Record<string, string> = {
  NODE_ENV: "development",
  POSTGRES_PASSWORD: randomSecret(16),
  JWT_SECRET: randomSecret(32),
  WEBHOOK_SECRET: randomSecret(32),
  NEXTAUTH_SECRET: randomSecret(32),
  MINIO_ROOT_USER: "brandblitz",
  MINIO_ROOT_PASSWORD: randomSecret(20),
};

// Read existing .env so we don't overwrite already-set values
const existing: Record<string, string> = {};
if (existsSync(ENV_FILE)) {
  for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) existing[m[1].trim()] = m[2].trim();
  }
}

let example = existsSync(ENV_EXAMPLE) ? readFileSync(ENV_EXAMPLE, "utf8") : "";

const newLines: string[] = [];
for (const [key, value] of Object.entries(GENERATED)) {
  if (!existing[key]) {
    newLines.push(`${key}=${value}`);
    console.log(`  generated  ${key}`);
  } else {
    console.log(`  kept       ${key}`);
  }
}

if (newLines.length > 0) {
  const separator = existsSync(ENV_FILE) ? "\n" : "";
  writeFileSync(
    ENV_FILE,
    (existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "") +
      separator +
      newLines.join("\n") +
      "\n"
  );
  console.log(`\n✔  Written ${newLines.length} new var(s) to .env`);
} else {
  console.log("\n✔  .env already complete — nothing to do");
}
