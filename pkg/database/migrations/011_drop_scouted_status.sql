-- Harmonize lifecycle stages: drop 'scouted' status.
-- Characters previously marked 'scouted' become 'prospect' (provenance
-- is captured by the 'source' field, not the lifecycle stage).

UPDATE characters SET status = 'prospect' WHERE status = 'scouted';

CREATE TABLE characters_new (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    display_name    TEXT NOT NULL DEFAULT '',
    folder_name     TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect', 'development', 'cast')),
    fig_published   INTEGER NOT NULL DEFAULT 0,
    fig_character_url TEXT NOT NULL DEFAULT '',
    source          TEXT NOT NULL DEFAULT 'frame',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO characters_new SELECT id, name, display_name, folder_name, status, fig_published, fig_character_url, source, created_at, updated_at FROM characters;

DROP TABLE characters;

ALTER TABLE characters_new RENAME TO characters;
