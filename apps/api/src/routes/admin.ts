import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { getArchivedChallengeById } from "../db/queries/challenges";
import { createError } from "../middleware/error";

const router = Router();

router.get("/archive/challenges/:id", authenticate, async (req, res) => {
  const challenge = await getArchivedChallengeById(req.params.id);
  if (!challenge) throw createError("Archived challenge not found", 404);
  res.json({ challenge });
});

export default router;
