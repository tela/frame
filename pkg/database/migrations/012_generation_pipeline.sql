-- Generation pipeline: standard poses, outfits, pose set tracking, LoRA registry.

-- Standard pose definitions (seeded catalog)
CREATE TABLE standard_poses (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    category       TEXT NOT NULL, -- sfw_standard, nsfw_standard, anatomical_detail
    framing        TEXT NOT NULL, -- headshot, portrait, full_body, detail
    content_rating TEXT NOT NULL DEFAULT 'sfw',
    prompt_hints   TEXT NOT NULL DEFAULT '',
    sort_order     INTEGER NOT NULL DEFAULT 0
);

-- Standard outfit definitions (seeded catalog)
CREATE TABLE standard_outfits (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    content_rating TEXT NOT NULL DEFAULT 'sfw',
    sort_order     INTEGER NOT NULL DEFAULT 0
);

-- Tracks generated pose set images per character/era
CREATE TABLE pose_set_images (
    character_id TEXT NOT NULL,
    era_id       TEXT NOT NULL,
    pose_id      TEXT NOT NULL REFERENCES standard_poses(id),
    outfit_id    TEXT NOT NULL DEFAULT '',
    image_id     TEXT REFERENCES images(id),
    status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'accepted', 'rejected')),
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (character_id, era_id, pose_id, outfit_id)
);

CREATE INDEX idx_pose_set_character_era ON pose_set_images(character_id, era_id);

-- LoRA adapter registry
CREATE TABLE loras (
    id                   TEXT PRIMARY KEY,
    name                 TEXT NOT NULL,
    filename             TEXT NOT NULL,
    source_url           TEXT NOT NULL DEFAULT '',
    description          TEXT NOT NULL DEFAULT '',
    category             TEXT NOT NULL DEFAULT 'style' CHECK (category IN ('style', 'character', 'pose', 'detail', 'nsfw', 'quality')),
    tags                 TEXT NOT NULL DEFAULT '[]',
    recommended_strength REAL NOT NULL DEFAULT 0.7,
    content_rating       TEXT NOT NULL DEFAULT 'sfw' CHECK (content_rating IN ('sfw', 'nsfw')),
    compatible_models    TEXT NOT NULL DEFAULT '[]',
    created_at           TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed: SFW standard poses
INSERT INTO standard_poses VALUES ('front_headshot', 'Front Headshot', 'sfw_standard', 'headshot', 'sfw', 'head and shoulders, front facing, neutral expression, studio lighting', 0);
INSERT INTO standard_poses VALUES ('three_quarter_portrait', '3/4 Portrait', 'sfw_standard', 'portrait', 'sfw', 'head and shoulders, three-quarter angle, studio lighting', 1);
INSERT INTO standard_poses VALUES ('profile_portrait', 'Profile', 'sfw_standard', 'portrait', 'sfw', 'head and shoulders, side profile view, studio lighting', 2);
INSERT INTO standard_poses VALUES ('front_full', 'Front Full Body', 'sfw_standard', 'full_body', 'sfw', 'full body, front facing, standing, neutral pose, studio lighting', 3);
INSERT INTO standard_poses VALUES ('back_full', 'Back Full Body', 'sfw_standard', 'full_body', 'sfw', 'full body, from behind, standing, looking over shoulder, studio lighting', 4);
INSERT INTO standard_poses VALUES ('three_quarter_full', '3/4 Full Body', 'sfw_standard', 'full_body', 'sfw', 'full body, three-quarter angle, standing, studio lighting', 5);

-- Seed: NSFW standard poses
INSERT INTO standard_poses VALUES ('bent_over_rear', 'Bent Over (Rear)', 'nsfw_standard', 'full_body', 'nsfw', '', 10);
INSERT INTO standard_poses VALUES ('supine_spread', 'Supine Spread', 'nsfw_standard', 'full_body', 'nsfw', '', 11);
INSERT INTO standard_poses VALUES ('kneeling_front', 'Kneeling Front', 'nsfw_standard', 'full_body', 'nsfw', '', 12);
INSERT INTO standard_poses VALUES ('seated_spread', 'Seated Spread', 'nsfw_standard', 'full_body', 'nsfw', '', 13);

-- Seed: Anatomical detail poses
INSERT INTO standard_poses VALUES ('breast_detail', 'Breast Detail', 'anatomical_detail', 'detail', 'nsfw', '', 20);
INSERT INTO standard_poses VALUES ('vulva_detail', 'Vulva Detail', 'anatomical_detail', 'detail', 'nsfw', '', 21);
INSERT INTO standard_poses VALUES ('pubic_hair_natural', 'Pubic Hair (Natural)', 'anatomical_detail', 'detail', 'nsfw', '', 22);
INSERT INTO standard_poses VALUES ('pubic_hair_groomed', 'Pubic Hair (Groomed)', 'anatomical_detail', 'detail', 'nsfw', '', 23);

-- Seed: Standard outfits
INSERT INTO standard_outfits VALUES ('nude', 'Nude', 'nsfw', 0);
INSERT INTO standard_outfits VALUES ('standard_outfit', 'Standard Outfit', 'sfw', 1);
INSERT INTO standard_outfits VALUES ('swimsuit', 'Swimsuit', 'sfw', 2);
