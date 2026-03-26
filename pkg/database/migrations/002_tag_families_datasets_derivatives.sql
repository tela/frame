-- Tag families: domain-separated tag groups
CREATE TABLE IF NOT EXISTS tag_families (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    color       TEXT NOT NULL DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed default tag families
INSERT OR IGNORE INTO tag_families (id, name, description, color, sort_order) VALUES
    ('fam_character', 'Character Identity', 'Pose, expression, angle, lighting, clothing, style, setting', '#2F3333', 1),
    ('fam_nsfw', 'NSFW', 'Body area, clothing state, intimacy level, content type', '#D9422B', 2),
    ('fam_technical', 'Technical', 'Quality, resolution, artifacts, format', '#5F5E5E', 3),
    ('fam_training', 'Training', 'Suitability, crop status, duplicate status', '#486272', 4);

-- Add family_id to image_tags
ALTER TABLE image_tags ADD COLUMN family_id TEXT REFERENCES tag_families(id);

-- Datasets: curated image collections for training
CREATE TABLE IF NOT EXISTS datasets (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    type          TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('lora', 'ipadapter', 'reference', 'style', 'general')),
    character_id  TEXT REFERENCES characters(id),
    era_id        TEXT REFERENCES eras(id),
    source_query  TEXT NOT NULL DEFAULT '{}',
    export_config TEXT NOT NULL DEFAULT '{}',
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_datasets_character ON datasets(character_id);
CREATE INDEX IF NOT EXISTS idx_datasets_type ON datasets(type);

-- Dataset images junction
CREATE TABLE IF NOT EXISTS dataset_images (
    dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    image_id   TEXT NOT NULL REFERENCES images(id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    caption    TEXT,
    included   INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (dataset_id, image_id)
);
CREATE INDEX IF NOT EXISTS idx_dataset_images_dataset ON dataset_images(dataset_id);

-- Image derivatives: non-destructive preprocessing history
CREATE TABLE IF NOT EXISTS image_derivatives (
    id              TEXT PRIMARY KEY,
    source_image_id TEXT NOT NULL REFERENCES images(id),
    operations      TEXT NOT NULL DEFAULT '[]',
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_derivatives_source ON image_derivatives(source_image_id);

-- Preprocessing presets
CREATE TABLE IF NOT EXISTS preprocess_presets (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    operations TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
