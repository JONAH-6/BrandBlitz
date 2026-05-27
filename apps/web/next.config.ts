import type { NextConfig } from "next";

function getAllowedOrigins() {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(",").map((o) => o.trim()).filter(Boolean);
  }

  // Fallbacks
  if (process.env.NODE_ENV === "production") {
    // Staging / explicit environments must have ALLOWED_ORIGINS
    if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
      throw new Error("ALLOWED_ORIGINS must be set in Vercel preview/staging environments");
    }
    return ["brandblitz.app", "www.brandblitz.app"];
  }

  return ["localhost:3000", "127.0.0.1:3000"];
}

const nextConfig: NextConfig = {
  // Required for Docker standalone builds — reduces image 500MB → ~150MB
  output: "standalone",

  images: {
    remotePatterns: [
      // Google OAuth avatars
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // MinIO dev / R2 prod
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "assets.brandblitz.app" },
    ],
  },

  experimental: {
    serverActions: {
      allowedOrigins: getAllowedOrigins(),
    },
  },
};

export default nextConfig;
