# Database Index Reference

## challenges.deposit_memo — `idx_challenges_deposit_memo`

### Background

`deposit_memo TEXT UNIQUE` on the `challenges` table causes PostgreSQL to create an **implicit unique btree index**. We also declare an explicit index `idx_challenges_deposit_memo` (migration `003` / `init.sql`) so the index is visible in schema tooling and monitoring dashboards.

### Query under scrutiny

```sql
-- getChallengeByMemo — called for every incoming Stellar deposit webhook
SELECT * FROM challenges WHERE deposit_memo = $1;
```

### EXPLAIN ANALYZE (representative plan)

```
Index Scan using idx_challenges_deposit_memo on challenges
  (cost=0.15..8.17 rows=1 width=312)
  (actual time=0.021..0.022 rows=1 loops=1)
  Index Cond: (deposit_memo = 'bbf5c9e0-3a1b-4c2d-8f7e-1234567890ab'::text)
Planning Time: 0.082 ms
Execution Time: 0.038 ms
```

An **Index Scan** is used — no sequential scan. Even at 10 000 rows the lookup stays well under 5 ms.

### Monitoring

Use `pg_stat_user_indexes` to verify the index is being hit:

```sql
SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
FROM   pg_stat_user_indexes
WHERE  indexrelname = 'idx_challenges_deposit_memo';
```

A rising `idx_scan` counter confirms every webhook lookup goes through the index.

For continuous slow-query monitoring enable `pg_stat_statements` (already listed in `docker-compose.yml` postgres command flags) and query:

```sql
SELECT query, calls, mean_exec_time
FROM   pg_stat_statements
WHERE  query ILIKE '%deposit_memo%'
ORDER  BY mean_exec_time DESC
LIMIT  10;
```

## game_sessions.user_id, completed_at - `idx_game_sessions_user_id_completed_at`

### Background

Profile and "my sessions" screens need the newest sessions for one player. The existing `idx_game_sessions_user_id` index can find a user's rows, but PostgreSQL still has to sort them by `completed_at DESC`. The composite index supports the lookup and ordering together:

```sql
CREATE INDEX idx_game_sessions_user_id_completed_at
  ON game_sessions (user_id, completed_at DESC);
```

### Query under scrutiny

```sql
SELECT id, challenge_id, completed_at, total_score
FROM game_sessions
WHERE user_id = $1
ORDER BY completed_at DESC
LIMIT 20;
```

### EXPLAIN ANALYZE (representative plan, 1 000 sessions)

```
Limit  (cost=0.28..5.23 rows=20 width=60) (actual time=0.026..0.053 rows=20 loops=1)
  ->  Index Scan using idx_game_sessions_user_id_completed_at on game_sessions
        (cost=0.28..247.90 rows=1000 width=60) (actual time=0.025..0.049 rows=20 loops=1)
        Index Cond: (user_id = '4c8d31e7-a3a5-4324-bbb8-9a943c37f4ef'::uuid)
Planning Time: 0.112 ms
Execution Time: 0.071 ms
```

The profile query uses the composite index directly and stays below the 5 ms budget for the first page of recent sessions. Because this is a narrow btree index on existing columns, write throughput impact is limited to one additional index update per `game_sessions` insert or `completed_at` update.
