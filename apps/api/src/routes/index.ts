import type { Express } from "express";
import authRoutes from "./auth";
import brandsRoutes from "./brands";
import challengesRoutes from "./challenges";
import sessionsRoutes from "./sessions";
import uploadRoutes from "./upload";
import usersRoutes from "./users";
import leaderboardRoutes from "./leaderboard";
import webhooksRoutes from "./webhooks";
import adminRoutes from "./admin";

export function registerRoutes(app: Express): void {
  app.use("/auth", authRoutes);
  app.use("/brands", brandsRoutes);
  app.use("/challenges", challengesRoutes);
  app.use("/sessions", sessionsRoutes);
  app.use("/upload", uploadRoutes);
  app.use("/users", usersRoutes);
  app.use("/leaderboard", leaderboardRoutes);
  app.use("/webhooks", webhooksRoutes);
  app.use("/admin", adminRoutes);
}
