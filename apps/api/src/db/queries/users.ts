import { query } from "../index";

export interface User {
  id: string;
  email: string;
  google_id: string | null;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  role: string;
  phone_hash: string | null;
  phone_verified: boolean;
  phone_verified_at: string | null;
  age_verified: boolean;
  kyc_complete: boolean;
  stellar_address: string | null;
  embedded_wallet_address: string | null;
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

export async function findUserByPhoneHash(phoneHash: string): Promise<User | null> {
  const result = await query<User>("SELECT * FROM users WHERE phone_hash = $1 LIMIT 1", [phoneHash]);
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
  const displayName = data.name?.trim() || data.email.split("@")[0] || "BrandBlitz User";

  const result = await query<User>(
    `INSERT INTO users (email, google_id, display_name, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (google_id) DO UPDATE
       SET email = EXCLUDED.email,
           display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), users.display_name),
           avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
           updated_at = NOW()
     RETURNING *`,
    [data.email, data.googleId, displayName, data.avatarUrl ?? null]
  );
  return result.rows[0];
}

export async function updateUserWallet(
  userId: string,
  stellarAddress: string
): Promise<void> {
  await query(
    "UPDATE users SET stellar_address = $1, updated_at = NOW() WHERE id = $2",
    [stellarAddress, userId]
  );
}

export async function markPhoneVerified(userId: string, phoneHash: string): Promise<void> {
  await query(
    `UPDATE users
     SET phone_hash = $1,
         phone_verified = TRUE,
         phone_verified_at = NOW(),
         updated_at = NOW()
     WHERE id = $2`,
    [phoneHash, userId]
  );
}