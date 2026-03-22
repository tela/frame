-- Core schema for Frame.
-- All IDs are 16-char hex strings generated via crypto/rand.

CREATE TABLE IF NOT EXISTS characters (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'scouted' CHECK (status IN ('scouted', 'development', 'cast')),
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS eras (
    id              TEXT PRIMARY KEY,
    character_id    TEXT NOT NULL REFERENCES characters(id),
    label           TEXT NOT NULL,
    visual_description TEXT NOT NULL DEFAULT '',
    prompt_prefix   TEXT NOT NULL DEFAULT '',
    pipeline_settings TEXT NOT NULL DEFAULT '{}',  -- JSON blob
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_eras_character ON eras(character_id);

CREATE TABLE IF NOT EXISTS images (
    id                TEXT PRIMARY KEY,
    hash              TEXT NOT NULL,
    original_filename TEXT NOT NULL DEFAULT '',
    format            TEXT NOT NULL DEFAULT '',
    width             INTEGER NOT NULL DEFAULT 0,
    height            INTEGER NOT NULL DEFAULT 0,
    file_size         INTEGER NOT NULL DEFAULT 0,
    source            TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('fig', 'comfyui', 'manual')),
    ingested_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_images_hash ON images(hash);

CREATE TABLE IF NOT EXISTS character_images (
    image_id      TEXT NOT NULL REFERENCES images(id),
    character_id  TEXT NOT NULL REFERENCES characters(id),
    era_id        TEXT REFERENCES eras(id),
    set_type      TEXT NOT NULL DEFAULT 'staging' CHECK (set_type IN ('staging', 'reference', 'curated', 'training', 'archive')),
    triage_status TEXT NOT NULL DEFAULT 'pending' CHECK (triage_status IN ('pending', 'approved', 'rejected', 'archived')),
    rating        INTEGER,
    is_face_ref   INTEGER NOT NULL DEFAULT 0,
    is_body_ref   INTEGER NOT NULL DEFAULT 0,
    ref_score     REAL,
    ref_rank      INTEGER,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (image_id, character_id)
);
CREATE INDEX IF NOT EXISTS idx_character_images_character ON character_images(character_id);
CREATE INDEX IF NOT EXISTS idx_character_images_era ON character_images(era_id);

CREATE TABLE IF NOT EXISTS image_tags (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    image_id      TEXT NOT NULL REFERENCES images(id),
    tag_namespace TEXT NOT NULL,
    tag_value     TEXT NOT NULL,
    source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(image_id, tag_namespace, tag_value)
);
CREATE INDEX IF NOT EXISTS idx_image_tags_image ON image_tags(image_id);
CREATE INDEX IF NOT EXISTS idx_image_tags_lookup ON image_tags(tag_namespace, tag_value);

CREATE TABLE IF NOT EXISTS media_items (
    id              TEXT PRIMARY KEY,
    content_type    TEXT NOT NULL CHECK (content_type IN ('wardrobe', 'prop', 'location')),
    name            TEXT NOT NULL,
    primary_image_id TEXT REFERENCES images(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_media_items_type ON media_items(content_type);

CREATE TABLE IF NOT EXISTS media_images (
    media_item_id TEXT NOT NULL REFERENCES media_items(id),
    image_id      TEXT NOT NULL REFERENCES images(id),
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (media_item_id, image_id)
);
