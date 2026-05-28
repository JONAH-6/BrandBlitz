# ADR 001: Store Hashed Phone Numbers Instead Of Raw Numbers

## Status

Accepted

## Context

BrandBlitz verifies phone ownership with Twilio, but the database schema drifted: the application code expected a `phone_hash` column while the schema still exposed `phone_number`.

Phone numbers are highly sensitive personal data. A raw phone number in the database increases the blast radius of a database leak because attackers can directly re-identify users, target them with phishing, or correlate accounts with external datasets.

## Decision

BrandBlitz will store a one-way HMAC hash of a normalized phone number instead of the raw phone number.

- Canonical form: normalized E.164 string, for example `+15551234567`
- Algorithm: HMAC-SHA256
- Secret salt / pepper: `PHONE_HASH_SALT`
- Stored fields:
  - `phone_hash TEXT`
  - `phone_verified BOOLEAN`
  - `phone_verified_at TIMESTAMPTZ`

The application verifies ownership with Twilio first, then hashes the normalized number before writing it to PostgreSQL.

## Rationale

- Better privacy posture: the database no longer contains directly usable phone numbers.
- Stronger breach resistance: a keyed HMAC prevents straightforward rainbow-table or dictionary reversal if the database leaks without application secrets.
- Functional parity: the hash still supports uniqueness checks and “already used by another account” enforcement.

## Consequences

- Support tooling can no longer read the user’s phone number from PostgreSQL directly.
- The `PHONE_HASH_SALT` secret must be managed like other application secrets.
- Existing environments must apply the migration that adds `phone_hash` and `phone_verified_at`, then drops `phone_number`.
