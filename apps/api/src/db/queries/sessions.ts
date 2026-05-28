import { query } from "../index";

export interface GameSession {
  id: string;
  user_id: string;
  challenge_id: string;
  device_id: string | null;
  warmup_started_at: string | null;
  warmup_completed_at: string | null;
  challenge_started_at: string | null;
  challenge_ended_at: string | null;
  round_1_score: number;
  round_2_score: number;
  round_3_score: number;
  total_score: number;
  flagged: boolean;
  flag_reasons: string[] | null;
  is_practice: boolean;
  created_at: string;
}

export interface RoundScore {
  id: string;
  session_id: string;
  round: 1 | 2 | 3;
  score: number;
  created_at: string;
  updated_at: string;
}

export async function createSession(data: {
  userId: string;
  challengeId: string;
  deviceId?: string;
  isPractice?: boolean;
}): Promise<GameSession> {
  const result = await query<GameSession>(
    `INSERT INTO game_sessions (user_id, challenge_id, device_id, is_practice)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (user_id, challenge_id) DO UPDATE
       SET user_id = game_sessions.user_id
     RETURNING *`,
    [data.userId, data.challengeId, data.deviceId ?? null, data.isPractice ?? false]
  );
  return result.rows[0];
}

export async function getSession(userId: string, challengeId: string): Promise<GameSession | null> {
  const result = await query<GameSession>(
    "SELECT * FROM game_sessions WHERE user_id = $1 AND challenge_id = $2",
    [userId, challengeId]
  );
  return result.rows[0] ?? null;
}

export async function markWarmupStarted(sessionId: string): Promise<void> {
  await query(
    "UPDATE game_sessions SET warmup_started_at = COALESCE(warmup_started_at, NOW()) WHERE id = $1",
    [sessionId]
  );
}

export async function markWarmupCompleted(sessionId: string): Promise<void> {
  const result = await query(
    `UPDATE game_sessions
     SET warmup_completed_at = NOW()
     WHERE id = $1
       AND warmup_completed_at IS NULL
     RETURNING id`,
    [sessionId]
  );

  if (result.rowCount === 0) {
    throw new Error("Warmup already completed or session not found");
  }
}

export async function markChallengeStarted(sessionId: string): Promise<void> {
  await query(
    `UPDATE game_sessions
     SET challenge_started_at = COALESCE(challenge_started_at, NOW()),
         status = 'active'
     WHERE id = $1`,
    [sessionId]
  );
}

export async function recordRoundScore(
  sessionId: string,
  round: 1 | 2 | 3,
  score: number
): Promise<void> {
  if (![1, 2, 3].includes(round)) {
    throw new Error("Invalid round");
  }

  const roundColumn = `round_${round}_score`;

  await query(
    `WITH upserted AS (
       INSERT INTO session_round_scores (session_id, round, score)
       VALUES ($1, $2, $3)
       ON CONFLICT (session_id, round) DO UPDATE
         SET score = EXCLUDED.score,
             updated_at = NOW()
       RETURNING session_id, score
     )
     UPDATE game_sessions
     SET ${roundColumn} = (SELECT score FROM upserted)
     WHERE id = $1`,
    [sessionId, round, score]
  );
}

export async function finishSession(sessionId: string): Promise<GameSession> {
  const result = await query<GameSession>(
    `UPDATE game_sessions
     SET challenge_ended_at = NOW(),
         status = 'completed',
         total_score = COALESCE((
           SELECT SUM(score)::int
           FROM session_round_scores
           WHERE session_id = $1
         ), 0)
     WHERE id = $1
     RETURNING *`,
    [sessionId]
  );
  return result.rows[0];
}

export async function flagSession(
  sessionId: string,
  reasons: string[]
): Promise<void> {
  await query(
    `UPDATE game_sessions
     SET flagged = TRUE,
         status = 'flagged',
         flag_reasons = array_cat(COALESCE(flag_reasons, '{}'), $1::text[])
     WHERE id = $2`,
    [reasons, sessionId]
  );
}

export async function getLeaderboard(
  challengeId: string,
  limit = 20,
  offset = 0
): Promise<Array<GameSession & { username: string; avatar_url: string }>> {
  const result = await query<GameSession & { username: string; avatar_url: string }>(
    `SELECT gs.*, u.email as username, u.avatar_url
     FROM game_sessions gs
     JOIN users u ON gs.user_id = u.id
     WHERE gs.challenge_id = $1
       AND gs.flagged = FALSE
       AND gs.is_practice = FALSE
     ORDER BY gs.total_score DESC, gs.challenge_ended_at ASC
     LIMIT $2 OFFSET $3`,
    [challengeId, limit, offset]
  );
  return result.rows;
}

export async function getArchivedLeaderboard(
  challengeId: string,
  limit = 20,
  offset = 0
): Promise<Array<GameSession & { username: string; avatar_url: string }>> {
  const result = await query<GameSession & { username: string; avatar_url: string }>(
    `SELECT gs.*, u.email as username, u.avatar_url
     FROM game_sessions_archive gs
     JOIN users u ON gs.user_id = u.id
     WHERE gs.challenge_id = $1
       AND gs.flagged = FALSE
       AND gs.is_practice = FALSE
     ORDER BY gs.total_score DESC, gs.challenge_ended_at ASC
     LIMIT $2 OFFSET $3`,
    [challengeId, limit, offset]
  );
  return result.rows;
}
