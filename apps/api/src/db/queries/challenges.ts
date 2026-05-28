import { query } from "../index";

export type ChallengeStatus =
  | "pending_deposit"
  | "active"
  | "ended"
  | "settled"
  | "payout_failed";

export interface Challenge {
  id: string;
  brand_id: string;
  challenge_id: string;
  pool_amount_usdc: string;
  status: ChallengeStatus;
  stellar_deposit_tx: string | null;
  payout_tx_hashes: string[] | null;
  max_players: number | null;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
}

export interface ChallengeQuestion {
  id: string;
  challenge_id: string;
  round: 1 | 2 | 3;
  question_type: string;
  prompt_type: string;
  question_text: string;
  correct_answer: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
}

export async function createChallenge(data: {
  brandId: string;
  challengeId: string;
  poolAmountUsdc: string;
  maxPlayers?: number;
  endsAt?: string;
}): Promise<Challenge> {
  const result = await query<Challenge>(
    `INSERT INTO challenges
       (brand_id, challenge_id, pool_amount_usdc, max_players, ends_at)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [data.brandId, data.challengeId, data.poolAmountUsdc, data.maxPlayers ?? null, data.endsAt ?? null]
  );
  return result.rows[0];
}

export async function getChallengeByMemo(challengeId: string): Promise<Challenge | null> {
  const result = await query<Challenge>(
    "SELECT * FROM challenges WHERE challenge_id = $1",
    [challengeId]
  );
  return result.rows[0] ?? null;
}

export async function getChallengeById(id: string): Promise<Challenge | null> {
  const result = await query<Challenge>("SELECT * FROM challenges WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

export async function getArchivedChallengeById(id: string): Promise<Challenge | null> {
  const result = await query<Challenge>("SELECT * FROM challenges_archive WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

export async function getChallengeByIdAny(id: string): Promise<Challenge & { archived: boolean } | null> {
  const result = await query<Challenge & { archived: boolean }>(
    `SELECT *, false AS archived FROM challenges WHERE id = $1
     UNION ALL
     SELECT *, true AS archived FROM challenges_archive WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function getActiveChallenges(limit = 20, offset = 0): Promise<Challenge[]> {
  const result = await query<Challenge>(
    `SELECT c.*, b.name as brand_name, b.logo_url, b.primary_color, b.secondary_color
     FROM challenges c
     JOIN brands b ON c.brand_id = b.id
     WHERE c.status = 'active'
     ORDER BY c.pool_amount_usdc DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

export async function updateChallengeStatus(
  id: string,
  status: ChallengeStatus,
  extras?: { depositTx?: string; payoutTxHashes?: string[] }
): Promise<void> {
  if (extras?.depositTx) {
    await query(
      "UPDATE challenges SET status = $1, stellar_deposit_tx = $2 WHERE id = $3",
      [status, extras.depositTx, id]
    );
  } else if (extras?.payoutTxHashes) {
    await query(
      "UPDATE challenges SET status = $1, payout_tx_hashes = $2 WHERE id = $3",
      [status, extras.payoutTxHashes, id]
    );
  } else {
    await query("UPDATE challenges SET status = $1 WHERE id = $2", [status, id]);
  }
}

export async function insertChallengeQuestions(
  questions: Omit<ChallengeQuestion, "id">[]
): Promise<void> {
  for (const q of questions) {
    await query(
      `INSERT INTO challenge_questions
         (challenge_id, round, question_type, prompt_type, question_text,
          correct_answer, option_a, option_b, option_c, option_d, correct_option)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        q.challenge_id, q.round, q.question_type, q.prompt_type,
        q.question_text, q.correct_answer,
        q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option,
      ]
    );
  }
}

export async function getChallengeQuestions(challengeId: string): Promise<ChallengeQuestion[]> {
  const result = await query<ChallengeQuestion>(
    "SELECT * FROM challenge_questions WHERE challenge_id = $1 ORDER BY round",
    [challengeId]
  );
  return result.rows;
}
