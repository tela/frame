-- Add ON DELETE CASCADE / SET NULL to foreign keys that were missing them.
-- SQLite requires table recreation to alter FK constraints.
--
-- PRAGMA foreign_keys=OFF tells the migration runner to execute outside
-- a transaction (PRAGMAs cannot run inside transactions).

PRAGMA foreign_keys=OFF;

--------------------------------------------------------------------
-- 1. eras: CASCADE on character_id
--------------------------------------------------------------------
CREATE TABLE eras_new (
    id                  TEXT PRIMARY KEY,
    character_id        TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    label               TEXT NOT NULL,
    visual_description  TEXT NOT NULL DEFAULT '',
    prompt_prefix       TEXT NOT NULL DEFAULT '',
    pipeline_settings   TEXT NOT NULL DEFAULT '{}',
    sort_order          INTEGER NOT NULL DEFAULT 0,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
    age_range           TEXT NOT NULL DEFAULT '',
    time_period         TEXT NOT NULL DEFAULT '',
    description         TEXT NOT NULL DEFAULT '',
    height_cm           INTEGER,
    weight_kg           INTEGER,
    build               TEXT NOT NULL DEFAULT '',
    breast_size         TEXT NOT NULL DEFAULT '',
    breast_tanner       TEXT NOT NULL DEFAULT '',
    hip_shape           TEXT NOT NULL DEFAULT '',
    pubic_hair_style    TEXT NOT NULL DEFAULT '',
    pubic_hair_tanner   TEXT NOT NULL DEFAULT '',
    hair_color          TEXT NOT NULL DEFAULT '',
    hair_length         TEXT NOT NULL DEFAULT '',
    gynecoid_stage      TEXT NOT NULL DEFAULT '',
    waist_hip_ratio     REAL,
    face_shape          TEXT NOT NULL DEFAULT '',
    buccal_fat          TEXT NOT NULL DEFAULT '',
    jaw_definition      TEXT NOT NULL DEFAULT '',
    brow_ridge          TEXT NOT NULL DEFAULT '',
    nasolabial_depth    TEXT NOT NULL DEFAULT '',
    skin_texture        TEXT NOT NULL DEFAULT '',
    skin_pore_visibility TEXT NOT NULL DEFAULT '',
    under_eye           TEXT NOT NULL DEFAULT '',
    head_body_ratio     REAL,
    leg_torso_ratio     REAL,
    shoulder_hip_ratio  REAL,
    areola_size         TEXT NOT NULL DEFAULT '',
    areola_color        TEXT NOT NULL DEFAULT '',
    areola_shape        TEXT NOT NULL DEFAULT '',
    labia_majora        TEXT NOT NULL DEFAULT '',
    labia_minora        TEXT NOT NULL DEFAULT '',
    labia_color         TEXT NOT NULL DEFAULT ''
);
INSERT INTO eras_new SELECT * FROM eras;
DROP TABLE eras;
ALTER TABLE eras_new RENAME TO eras;
CREATE INDEX idx_eras_character ON eras(character_id);

--------------------------------------------------------------------
-- 2. character_images: CASCADE on image_id and character_id
--------------------------------------------------------------------
CREATE TABLE character_images_new (
    image_id      TEXT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    character_id  TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    era_id        TEXT REFERENCES eras(id) ON DELETE SET NULL,
    set_type      TEXT NOT NULL DEFAULT 'staging' CHECK (set_type IN ('staging', 'reference', 'curated', 'training', 'archive')),
    triage_status TEXT NOT NULL DEFAULT 'pending' CHECK (triage_status IN ('pending', 'approved', 'rejected', 'archived')),
    rating        INTEGER,
    is_face_ref   INTEGER NOT NULL DEFAULT 0,
    is_body_ref   INTEGER NOT NULL DEFAULT 0,
    ref_score     REAL,
    ref_rank      INTEGER,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    caption       TEXT,
    is_favorited  INTEGER NOT NULL DEFAULT 0,
    ref_type      TEXT,
    PRIMARY KEY (image_id, character_id)
);
INSERT INTO character_images_new SELECT * FROM character_images;
DROP TABLE character_images;
ALTER TABLE character_images_new RENAME TO character_images;
CREATE INDEX idx_character_images_character ON character_images(character_id);
CREATE INDEX idx_character_images_era ON character_images(era_id);

--------------------------------------------------------------------
-- 3. image_tags: CASCADE on image_id
--------------------------------------------------------------------
CREATE TABLE image_tags_new (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    image_id      TEXT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    tag_namespace TEXT NOT NULL,
    tag_value     TEXT NOT NULL,
    source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    family_id     TEXT REFERENCES tag_families(id) ON DELETE SET NULL,
    UNIQUE(image_id, tag_namespace, tag_value)
);
INSERT INTO image_tags_new SELECT * FROM image_tags;
DROP TABLE image_tags;
ALTER TABLE image_tags_new RENAME TO image_tags;
CREATE INDEX idx_image_tags_image ON image_tags(image_id);
CREATE INDEX idx_image_tags_lookup ON image_tags(tag_namespace, tag_value);

--------------------------------------------------------------------
-- 4. datasets: CASCADE on character_id, SET NULL on era_id
--------------------------------------------------------------------
CREATE TABLE datasets_new (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    type          TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('lora', 'ipadapter', 'reference', 'style', 'general')),
    character_id  TEXT REFERENCES characters(id) ON DELETE CASCADE,
    era_id        TEXT REFERENCES eras(id) ON DELETE SET NULL,
    source_query  TEXT NOT NULL DEFAULT '{}',
    export_config TEXT NOT NULL DEFAULT '{}',
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO datasets_new SELECT * FROM datasets;
DROP TABLE datasets;
ALTER TABLE datasets_new RENAME TO datasets;
CREATE INDEX idx_datasets_character ON datasets(character_id);
CREATE INDEX idx_datasets_type ON datasets(type);

--------------------------------------------------------------------
-- 5. dataset_images: CASCADE on image_id (dataset_id already has it)
--------------------------------------------------------------------
CREATE TABLE dataset_images_new (
    dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    image_id   TEXT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    caption    TEXT,
    included   INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (dataset_id, image_id)
);
INSERT INTO dataset_images_new SELECT * FROM dataset_images;
DROP TABLE dataset_images;
ALTER TABLE dataset_images_new RENAME TO dataset_images;
CREATE INDEX idx_dataset_images_dataset ON dataset_images(dataset_id);

--------------------------------------------------------------------
-- 6. shoots: CASCADE on character_id
--------------------------------------------------------------------
CREATE TABLE shoots_new (
    id           TEXT PRIMARY KEY,
    character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO shoots_new SELECT * FROM shoots;
DROP TABLE shoots;
ALTER TABLE shoots_new RENAME TO shoots;
CREATE INDEX idx_shoots_character ON shoots(character_id);

--------------------------------------------------------------------
-- 7. character_looks: CASCADE on character_id
--------------------------------------------------------------------
CREATE TABLE character_looks_new (
    id                TEXT PRIMARY KEY,
    character_id      TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    wardrobe_item_ids TEXT NOT NULL DEFAULT '[]',
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    era_id            TEXT NOT NULL DEFAULT '',
    is_default        INTEGER NOT NULL DEFAULT 0
);
INSERT INTO character_looks_new SELECT * FROM character_looks;
DROP TABLE character_looks;
ALTER TABLE character_looks_new RENAME TO character_looks;
CREATE INDEX idx_looks_character ON character_looks(character_id);

--------------------------------------------------------------------
-- 8. media_images: CASCADE on both FKs
--------------------------------------------------------------------
CREATE TABLE media_images_new (
    media_item_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
    image_id      TEXT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (media_item_id, image_id)
);
INSERT INTO media_images_new SELECT * FROM media_images;
DROP TABLE media_images;
ALTER TABLE media_images_new RENAME TO media_images;

--------------------------------------------------------------------
-- 9. image_derivatives: CASCADE on source_image_id
--------------------------------------------------------------------
CREATE TABLE image_derivatives_new (
    id              TEXT PRIMARY KEY,
    source_image_id TEXT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    operations      TEXT NOT NULL DEFAULT '[]',
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO image_derivatives_new SELECT * FROM image_derivatives;
DROP TABLE image_derivatives;
ALTER TABLE image_derivatives_new RENAME TO image_derivatives;
CREATE INDEX idx_derivatives_source ON image_derivatives(source_image_id);

--------------------------------------------------------------------
-- 10. pose_set_images: add FK on character_id with CASCADE, SET NULL on image_id
--------------------------------------------------------------------
CREATE TABLE pose_set_images_new (
    character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    era_id       TEXT NOT NULL,
    pose_id      TEXT NOT NULL REFERENCES standard_poses(id),
    outfit_id    TEXT NOT NULL DEFAULT '',
    image_id     TEXT REFERENCES images(id) ON DELETE SET NULL,
    status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'accepted', 'rejected')),
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (character_id, era_id, pose_id, outfit_id)
);
INSERT INTO pose_set_images_new SELECT * FROM pose_set_images;
DROP TABLE pose_set_images;
ALTER TABLE pose_set_images_new RENAME TO pose_set_images;
CREATE INDEX idx_pose_set_character_era ON pose_set_images(character_id, era_id);

--------------------------------------------------------------------
-- 11. tag_namespaces: CASCADE on family_id
--------------------------------------------------------------------
CREATE TABLE tag_namespaces_new (
    id          TEXT PRIMARY KEY,
    family_id   TEXT NOT NULL REFERENCES tag_families(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    ref_types   TEXT,
    UNIQUE(family_id, name)
);
INSERT INTO tag_namespaces_new SELECT * FROM tag_namespaces;
DROP TABLE tag_namespaces;
ALTER TABLE tag_namespaces_new RENAME TO tag_namespaces;
CREATE INDEX idx_tag_namespaces_family ON tag_namespaces(family_id);

--------------------------------------------------------------------
-- 12. shoot_images: CASCADE on image_id (shoot_id already has it)
--------------------------------------------------------------------
CREATE TABLE shoot_images_new (
    shoot_id   TEXT NOT NULL REFERENCES shoots(id) ON DELETE CASCADE,
    image_id   TEXT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (shoot_id, image_id)
);
INSERT INTO shoot_images_new SELECT * FROM shoot_images;
DROP TABLE shoot_images;
ALTER TABLE shoot_images_new RENAME TO shoot_images;

--------------------------------------------------------------------
-- 13. look_images: CASCADE on image_id (look_id already has it)
--------------------------------------------------------------------
CREATE TABLE look_images_new (
    look_id    TEXT NOT NULL REFERENCES character_looks(id) ON DELETE CASCADE,
    image_id   TEXT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (look_id, image_id)
);
INSERT INTO look_images_new SELECT * FROM look_images;
DROP TABLE look_images;
ALTER TABLE look_images_new RENAME TO look_images;

--------------------------------------------------------------------
-- 14. garment_images: CASCADE on image_id (garment_id already has it)
--------------------------------------------------------------------
CREATE TABLE garment_images_new (
    garment_id TEXT NOT NULL REFERENCES garments(id) ON DELETE CASCADE,
    image_id   TEXT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (garment_id, image_id)
);
INSERT INTO garment_images_new SELECT * FROM garment_images;
DROP TABLE garment_images;
ALTER TABLE garment_images_new RENAME TO garment_images;

--------------------------------------------------------------------
-- 15. hairstyle_images: CASCADE on image_id (hairstyle_id already has it)
--------------------------------------------------------------------
CREATE TABLE hairstyle_images_new (
    hairstyle_id TEXT NOT NULL REFERENCES hairstyles(id) ON DELETE CASCADE,
    image_id     TEXT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (hairstyle_id, image_id)
);
INSERT INTO hairstyle_images_new SELECT * FROM hairstyle_images;
DROP TABLE hairstyle_images;
ALTER TABLE hairstyle_images_new RENAME TO hairstyle_images;

--------------------------------------------------------------------
-- Re-enable FK enforcement and verify
--------------------------------------------------------------------
PRAGMA foreign_keys=ON;
PRAGMA foreign_key_check;
