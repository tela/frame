-- Prompt templates for reusable generation recipes.
CREATE TABLE IF NOT EXISTS prompt_templates (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    prompt_body     TEXT NOT NULL DEFAULT '',
    negative_prompt TEXT NOT NULL DEFAULT '',
    style_prompt    TEXT NOT NULL DEFAULT '',
    parameters      TEXT NOT NULL DEFAULT '{}',  -- JSON: steps, cfg, sampler, dimensions
    facet_tags      TEXT NOT NULL DEFAULT '[]',   -- JSON array of facet tags
    usage_count     INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
