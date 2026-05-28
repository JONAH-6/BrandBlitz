# 03 Stellar Architecture

## Scoring

Each challenge has 3 rounds, and each round is scored independently.

- Correct answer score: base 100 points + speed bonus up to 50 points
- Wrong answer score: 0 points
- Timeout (no answer): submitted as selectedOption = null and scored as 0 points

Timeout behavior is explicit in both frontend and backend contracts:

- The client submits null when the round timer expires without a click.
- The API accepts selectedOption as one of A/B/C/D or null.
- Null is treated as no-answer and never as an implicit letter choice.

This prevents accidental scoring from silent defaults and preserves fair outcomes across players.
