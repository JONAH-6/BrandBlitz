export interface User {
  id: string;
  email: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  stellarAddress?: string;
  phoneVerified: boolean;
  league?: "bronze" | "silver" | "gold";
  createdAt: string;
}

export interface Brand {
  id: string;
  ownerId: string;
  name: string;
  tagline?: string;
  brandStory?: string;
  usp?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  productImageUrls: string[];
  createdAt: string;
}

export interface Challenge {
  id: string;
  brandId: string;
  brandName: string;
  logoUrl?: string;
  primaryColor?: string;
  poolAmountUsdc: string;
  status: "pending_deposit" | "active" | "completed" | "cancelled";
  startsAt: string;
  endsAt: string;
  participantCount?: number;
}

export interface GameSession {
  id: string;
  userId: string;
  challengeId: string;
  status: "warmup" | "active" | "completed" | "flagged";
  warmupStartedAt?: string;
  challengeStartedAt?: string;
  completedAt?: string;
  round1Score?: number;
  round2Score?: number;
  round3Score?: number;
  totalScore?: number;
  rank?: number;
}

export interface Payout {
  id: string;
  challengeId: string;
  userId: string;
  amountUsdc: string;
  status: "pending" | "processing" | "completed" | "failed";
  txHash?: string;
  createdAt: string;
}
