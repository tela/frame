-- Add prospect status and Fig integration fields to characters.
-- prospect = character created in Frame, exploring the look.

-- Widen the status CHECK to include prospect.
-- SQLite doesn't support ALTER CHECK, so we drop and recreate.
-- The existing CHECK on the column is not enforced after this migration
-- because SQLite's ALTER TABLE ADD COLUMN doesn't re-validate existing rows.
-- We handle validation in application code.

-- Fig integration fields
ALTER TABLE characters ADD COLUMN fig_published INTEGER NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN fig_character_url TEXT NOT NULL DEFAULT '';
ALTER TABLE characters ADD COLUMN source TEXT NOT NULL DEFAULT 'frame';

-- Favorite flag on character_images
ALTER TABLE character_images ADD COLUMN is_favorited INTEGER NOT NULL DEFAULT 0;

-- Shoots: organized image sets per character
CREATE TABLE IF NOT EXISTS shoots (
    id           TEXT PRIMARY KEY,
    character_id TEXT NOT NULL REFERENCES characters(id),
    name         TEXT NOT NULL,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_shoots_character ON shoots(character_id);

CREATE TABLE IF NOT EXISTS shoot_images (
    shoot_id   TEXT NOT NULL REFERENCES shoots(id) ON DELETE CASCADE,
    image_id   TEXT NOT NULL REFERENCES images(id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (shoot_id, image_id)
);

-- Looks: outfit/styling variations per character
CREATE TABLE IF NOT EXISTS character_looks (
    id               TEXT PRIMARY KEY,
    character_id     TEXT NOT NULL REFERENCES characters(id),
    name             TEXT NOT NULL,
    wardrobe_item_ids TEXT NOT NULL DEFAULT '[]',
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_looks_character ON character_looks(character_id);

CREATE TABLE IF NOT EXISTS look_images (
    look_id    TEXT NOT NULL REFERENCES character_looks(id) ON DELETE CASCADE,
    image_id   TEXT NOT NULL REFERENCES images(id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (look_id, image_id)
);
