-- Audit log for tracking changes to images, characters, datasets, and tags.
-- Append-only. Events are never deleted.

CREATE TABLE IF NOT EXISTS audit_log (
    id          TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,     -- 'image', 'character', 'dataset', 'tag'
    entity_id   TEXT NOT NULL,     -- ID of the affected entity
    action      TEXT NOT NULL,     -- 'created', 'updated', 'status_changed', 'tag_added', etc.
    field       TEXT,              -- which field changed (nullable)
    old_value   TEXT,              -- previous value (nullable)
    new_value   TEXT,              -- new value (nullable)
    context     TEXT NOT NULL DEFAULT '{}',  -- JSON: character_id, era_id, dataset_id, etc.
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
