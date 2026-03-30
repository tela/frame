-- Garment catalog: full wardrobe management with classification taxonomy,
-- character affinity, and full-text search. Replaces the generic media_items
-- approach for wardrobe content with a purpose-built schema.

CREATE TABLE garments (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    description       TEXT NOT NULL DEFAULT '',

    -- Classification taxonomy
    category          TEXT NOT NULL DEFAULT '' CHECK (category IN ('', 'top', 'bottom', 'dress', 'lingerie', 'outerwear', 'footwear', 'accessory')),
    occasion_energy   TEXT NOT NULL DEFAULT '' CHECK (occasion_energy IN ('', 'intimate', 'casual', 'formal', 'provocative', 'loungewear', 'athletic')),
    era               TEXT NOT NULL DEFAULT '' CHECK (era IN ('', '70s', '80s', '90s', 'y2k', 'contemporary', 'vintage', 'timeless')),
    aesthetic_cluster TEXT NOT NULL DEFAULT '',
    dominant_signal   TEXT NOT NULL DEFAULT '' CHECK (dominant_signal IN ('', 'power', 'vulnerability', 'comfort', 'provocation', 'elegance', 'rebellion', 'softness')),
    recessive_signal  TEXT NOT NULL DEFAULT '' CHECK (recessive_signal IN ('', 'power', 'vulnerability', 'comfort', 'provocation', 'elegance', 'rebellion', 'softness')),
    material          TEXT NOT NULL DEFAULT '',
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
    status            TEXT NOT NULL DEFAULT 'ingested' CHECK (status IN ('ingested', 'reviewed', 'available', 'reference_only', 'rejected')),

    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_garments_category ON garments(category);
CREATE INDEX idx_garments_occasion ON garments(occasion_energy);
CREATE INDEX idx_garments_era ON garments(era);
CREATE INDEX idx_garments_aesthetic ON garments(aesthetic_cluster);
CREATE INDEX idx_garments_status ON garments(status);
CREATE INDEX idx_garments_provenance ON garments(provenance);
CREATE INDEX idx_garments_source_site ON garments(source_site);
CREATE INDEX idx_garments_created ON garments(created_at);

-- Character affinity: which characters this garment is assigned to
CREATE TABLE garment_affinity (
    garment_id   TEXT NOT NULL REFERENCES garments(id) ON DELETE CASCADE,
    character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (garment_id, character_id)
);

CREATE INDEX idx_garment_affinity_character ON garment_affinity(character_id);

-- Garment images: multiple images per garment (primary + additional)
CREATE TABLE garment_images (
    garment_id TEXT NOT NULL REFERENCES garments(id) ON DELETE CASCADE,
    image_id   TEXT NOT NULL REFERENCES images(id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (garment_id, image_id)
);

-- FTS5 full-text search on garment text fields
CREATE VIRTUAL TABLE garments_fts USING fts5(
    name,
    description,
    material,
    color,
    category,
    tags,
    content='garments',
    content_rowid='rowid'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER garments_fts_insert AFTER INSERT ON garments BEGIN
    INSERT INTO garments_fts(rowid, name, description, material, color, category, tags)
    VALUES (NEW.rowid, NEW.name, NEW.description, NEW.material, NEW.color, NEW.category, NEW.tags);
END;

CREATE TRIGGER garments_fts_delete AFTER DELETE ON garments BEGIN
    INSERT INTO garments_fts(garments_fts, rowid, name, description, material, color, category, tags)
    VALUES ('delete', OLD.rowid, OLD.name, OLD.description, OLD.material, OLD.color, OLD.category, OLD.tags);
END;

CREATE TRIGGER garments_fts_update AFTER UPDATE ON garments BEGIN
    INSERT INTO garments_fts(garments_fts, rowid, name, description, material, color, category, tags)
    VALUES ('delete', OLD.rowid, OLD.name, OLD.description, OLD.material, OLD.color, OLD.category, OLD.tags);
    INSERT INTO garments_fts(rowid, name, description, material, color, category, tags)
    VALUES (NEW.rowid, NEW.name, NEW.description, NEW.material, NEW.color, NEW.category, NEW.tags);
END;
