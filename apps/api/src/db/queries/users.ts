import { query } from "../index";

export interface User {
  username: any;
  display_name: any;
  id: string;
  email: string;
  google_id: string | null;
  display_name: string;
  username: string | null;
  phone_hash: string | null;
  phone_verified: boolean;
  age_verified: boolean;
  kyc_complete: boolean;
  stellar_address: string | null;
  embedded_wallet_address: string | null;
  avatar_url: string | null;
  league: "bronze" | "silver" | "gold" | null;
  total_score: number;
  total_earned_usdc: string;
  challenges_played: number;
  state_code: string | null;
  streak: number;
  last_play_day: string | null;
  streak_repairs_this_month: number;
  streak_repair_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicUser {
  display_name: string;
  username: string;
  league: "bronze" | "silver" | "gold" | null;
  total_earned_usdc: string;
  challenges_played: number;
  avatar_url: string | null;
  streak: number;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await query<User>("SELECT * FROM users WHERE email = $1 LIMIT 1", [email]);
  return result.rows[0] ?? null;
}

export async function findUserByGoogleId(googleId: string): Promise<User | null> {
  const result = await query<User>("SELECT * FROM users WHERE google_id = $1 LIMIT 1", [googleId]);
  return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await query<User>("SELECT * FROM users WHERE id = $1 LIMIT 1", [id]);
  return result.rows[0] ?? null;
}

export async function getUserPublicProfileByUsername(username: string): Promise<PublicUser | null> {
  const result = await query<PublicUser>(
    `SELECT display_name, username, league, total_earned_usdc, challenges_played, avatar_url, streak
     FROM users
     WHERE username = $1`,
    [username]
  );
  return result.rows[0] ?? null;
}

export async function upsertUser(data: {
  email: string;
  googleId: string;
  name?: string;
  avatarUrl?: string;
}): Promise<User> {
  const result = await query<User>(
    `INSERT INTO users (email, google_id, avatar_url)
     VALUES ($1, $2, $3)
     ON CONFLICT (google_id) DO UPDATE
       SET email = EXCLUDED.email,
           avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
           updated_at = NOW()
     RETURNING *`,
    [data.email, data.googleId, data.avatarUrl ?? null]
  );
  return result.rows[0];
}

export async function updateUserWallet(
  userId: string,
  stellarAddress: string
): Promise<void> {
  await query(
    "UPDATE users SET embedded_wallet_address = $1, updated_at = NOW() WHERE id = $2",
    [stellarAddress, userId]
  );
}

export async function markPhoneVerified(userId: string, phoneHash: string): Promise<void> {
  await query(
    "UPDATE users SET phone_hash = $1, phone_verified = TRUE, updated_at = NOW() WHERE id = $2",
    [phoneHash, userId]
  );
}
