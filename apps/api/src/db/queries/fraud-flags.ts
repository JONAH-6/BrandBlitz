import { query } from "../index";

export interface FraudFlag {
  id: string;
  session_id: string;
  user_id: string;
  flag_type: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export async function createFraudFlag(data: {
  sessionId: string;
  userId: string;
  flagType: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  await query(
    `INSERT INTO fraud_flags (session_id, user_id, flag_type, details)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (session_id, flag_type)
     DO UPDATE SET
       details = EXCLUDED.details,
       created_at = EXCLUDED.created_at`,
    [data.sessionId, data.userId, data.flagType, data.details ?? null]
  );
}
