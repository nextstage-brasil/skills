-- User-scoped long-term memory (preferences, glossary, profile, feedback).
-- Owner = (tenant_id, user_id). Company/tenant context lives in the product system prompt, not here.
-- Agent updates supersede rows (invalid_at); user deletes and purges are hard deletes (LGPD erasure).
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS user_memories (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(255)  NOT NULL,
  user_id             VARCHAR(255)  NOT NULL,
  kind                VARCHAR(20)   NOT NULL
                      CHECK (kind IN ('preference', 'glossary', 'profile', 'feedback')),
  key                 VARCHAR(120)  NOT NULL,
  content             TEXT          NOT NULL,
  why                 TEXT,
  source              VARCHAR(10)   NOT NULL CHECK (source IN ('agent', 'user')),
  evidence_thread_id  VARCHAR(255),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  invalid_at          TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_memories_active_key
  ON user_memories(tenant_id, user_id, kind, key)
  WHERE invalid_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_memories_owner
  ON user_memories(tenant_id, user_id, updated_at DESC);
