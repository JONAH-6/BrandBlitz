import * as React from "react";
import type { Metadata } from "next";
import { ChallengePage } from "./challenge-page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  let brandName = "BrandBlitz";
  let prizePool = "0";

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost/api";
    const res = await fetch(`${apiUrl}/challenges/${id}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      const c = data.challenge;
      brandName = c.brand_name ?? brandName;
      prizePool = c.pool_amount_usdc ?? prizePool;
    }
  } catch {
    // Use defaults
  }

  const title = `${brandName} Challenge — Win ${prizePool} USDC`;
  const description = "Compete in a 45-second brand challenge. Top players win USDC instantly.";
  const ogImageUrl = `/api/og/challenge/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function Page({ params }: PageProps) {
  return <ChallengePage params={params} />;
}
