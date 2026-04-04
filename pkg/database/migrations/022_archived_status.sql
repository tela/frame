-- Add 'archived' to character status CHECK constraint.
-- SQLite doesn't support ALTER TABLE to modify CHECK constraints,
-- so we recreate the table.

CREATE TABLE characters_new (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    display_name    TEXT NOT NULL DEFAULT '',
    folder_name     TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect', 'development', 'cast', 'archived')),
    fig_published   INTEGER NOT NULL DEFAULT 0,
    fig_character_url TEXT NOT NULL DEFAULT '',
    source          TEXT NOT NULL DEFAULT 'frame',
    gender          TEXT NOT NULL DEFAULT '',
    ethnicity       TEXT NOT NULL DEFAULT '',
    skin_tone       TEXT NOT NULL DEFAULT '',
    eye_color       TEXT NOT NULL DEFAULT '',
    eye_shape       TEXT NOT NULL DEFAULT '',
    natural_hair_color   TEXT NOT NULL DEFAULT '',
    natural_hair_texture TEXT NOT NULL DEFAULT '',
    distinguishing_features TEXT NOT NULL DEFAULT '',
    avatar_image_id TEXT REFERENCES images(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO characters_new SELECT
    id, name, display_name, folder_name, status, fig_published, fig_character_url, source,
    gender, ethnicity, skin_tone, eye_color, eye_shape, natural_hair_color, natural_hair_texture,
    distinguishing_features, avatar_image_id, created_at, updated_at
FROM characters;

DROP TABLE characters;
ALTER TABLE characters_new RENAME TO characters;
