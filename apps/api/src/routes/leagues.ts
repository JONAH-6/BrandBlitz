import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { createError } from "../middleware/error";
import { addUtcDays, getUtcWeekStart } from "../lib/week";
import { ensureAssignmentForUserThisWeek, getCurrentLeagueGroup } from "../db/queries/leagues";

const router = Router();

/**
 * GET /leagues/current
 * Returns the caller's current league + their 30-player group with points.
 */
router.get("/current", authenticate, async (req, res) => {
  const weekStart = getUtcWeekStart(new Date());

  await ensureAssignmentForUserThisWeek(req.user!.sub, weekStart);
  const current = await getCurrentLeagueGroup(req.user!.sub, weekStart);
  if (!current) throw createError("League not found", 404);

  res.json({
    weekStart,
    weekEndExclusive: addUtcDays(weekStart, 7),
    league: current.league,
    groupId: current.group_id,
    group: current.group,
  });
});

export default router;

