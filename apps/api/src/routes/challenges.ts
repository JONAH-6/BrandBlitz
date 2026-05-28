import { Router } from "express";
import { z } from "zod";
import {
  getActiveChallenges,
  getChallengeByIdAny,
  getChallengeQuestions,
} from "../db/queries/challenges";
import { getArchivedLeaderboard, getLeaderboard } from "../db/queries/sessions";
import { authenticate, optionalAuth } from "../middleware/authenticate";
import { createError } from "../middleware/error";

const router = Router();

const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /challenges
 * List active challenges (public).
 */
router.get("/", optionalAuth, async (req, res) => {
  const { limit, offset } = PaginationSchema.parse(req.query);
  const challenges = await getActiveChallenges(limit, offset);
  res.json({ challenges });
});

/**
 * GET /challenges/:id
 * Get challenge details. Questions (without correct answers) included.
 */
router.get("/:id", optionalAuth, async (req, res) => {
  const challenge = await getChallengeByIdAny(req.params.id);
  if (!challenge) throw createError("Challenge not found", 404);

  // Return questions without correct_answer and correct_option fields
  const questions = await getChallengeQuestions(challenge.id);
  const safeQuestions = questions.map(({ correct_answer, correct_option, ...q }) => q);

  res.json({ challenge, questions: safeQuestions });
});

/**
 * GET /challenges/:id/leaderboard
 * Paginated leaderboard for a challenge.
 */
router.get("/:id/leaderboard", async (req, res) => {
  const challenge = await getChallengeByIdAny(req.params.id);
  if (!challenge) throw createError("Challenge not found", 404);

  const { limit, offset } = PaginationSchema.parse(req.query);
  const sessions = challenge.archived
    ? await getArchivedLeaderboard(challenge.id, limit, offset)
    : await getLeaderboard(challenge.id, limit, offset);

  res.json({
    challengeId: challenge.id,
    sessions: sessions.map((s, i) => ({
      rank: offset + i + 1,
      username: s.username,
      avatarUrl: s.avatar_url,
      totalScore: s.total_score,
      endedAt: s.challenge_ended_at,
    })),
  });
});

export default router;
