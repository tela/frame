-- Hairstyle catalog: character-coupled hair management with classification
-- taxonomy, character affinity, and full-text search. Same pattern as garments.

CREATE TABLE hairstyles (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    description       TEXT NOT NULL DEFAULT '',

    -- Classification taxonomy
    length            TEXT NOT NULL DEFAULT '' CHECK (length IN ('', 'pixie', 'short', 'medium', 'long', 'very_long')),
    texture           TEXT NOT NULL DEFAULT '' CHECK (texture IN ('', 'straight', 'wavy', 'curly', 'coily', 'kinky')),
    style             TEXT NOT NULL DEFAULT '' CHECK (style IN ('', 'updo', 'down', 'half_up', 'ponytail', 'braids', 'bun', 'loose', 'structured')),
    color             TEXT NOT NULL DEFAULT '',
    tags              TEXT NOT NULL DEFAULT '[]',  -- JSON array

    -- Primary image (FK to images table)
    primary_image_id  TEXT REFERENCES images(id),

    -- Provenance
    source            TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'downloaded', 'custom')),
    provenance        TEXT NOT NULL DEFAULT '' CHECK (provenance IN ('', 'shopify', 'camofox', 'crawled', 'imported', 'searched', 'generated')),
    source_url        TEXT NOT NULL DEFAULT '',
    source_site       TEXT NOT NULL DEFAULT '',

    -- Status lifecycle
    status            TEXT NOT NULL DEFAULT 'ingested' CHECK (status IN ('ingested', 'reviewed', 'available', 'rejected')),

    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_hairstyles_length ON hairstyles(length);
CREATE INDEX idx_hairstyles_texture ON hairstyles(texture);
CREATE INDEX idx_hairstyles_style ON hairstyles(style);
CREATE INDEX idx_hairstyles_status ON hairstyles(status);
CREATE INDEX idx_hairstyles_created ON hairstyles(created_at);

-- Character affinity
CREATE TABLE hairstyle_affinity (
    hairstyle_id TEXT NOT NULL REFERENCES hairstyles(id) ON DELETE CASCADE,
    character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (hairstyle_id, character_id)
);

CREATE INDEX idx_hairstyle_affinity_character ON hairstyle_affinity(character_id);

-- Hairstyle images
CREATE TABLE hairstyle_images (
    hairstyle_id TEXT NOT NULL REFERENCES hairstyles(id) ON DELETE CASCADE,
    image_id     TEXT NOT NULL REFERENCES images(id),
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (hairstyle_id, image_id)
);

-- FTS5 full-text search
CREATE VIRTUAL TABLE hairstyles_fts USING fts5(
    name,
    description,
    color,
    tags,
    content='hairstyles',
    content_rowid='rowid'
);

CREATE TRIGGER hairstyles_fts_insert AFTER INSERT ON hairstyles BEGIN
    INSERT INTO hairstyles_fts(rowid, name, description, color, tags)
    VALUES (NEW.rowid, NEW.name, NEW.description, NEW.color, NEW.tags);
END;

CREATE TRIGGER hairstyles_fts_delete AFTER DELETE ON hairstyles BEGIN
    INSERT INTO hairstyles_fts(hairstyles_fts, rowid, name, description, color, tags)
    VALUES ('delete', OLD.rowid, OLD.name, OLD.description, OLD.color, OLD.tags);
END;

CREATE TRIGGER hairstyles_fts_update AFTER UPDATE ON hairstyles BEGIN
    INSERT INTO hairstyles_fts(hairstyles_fts, rowid, name, description, color, tags)
    VALUES ('delete', OLD.rowid, OLD.name, OLD.description, OLD.color, OLD.tags);
    INSERT INTO hairstyles_fts(rowid, name, description, color, tags)
    VALUES (NEW.rowid, NEW.name, NEW.description, NEW.color, NEW.tags);
END;
