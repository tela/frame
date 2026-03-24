-- Tag taxonomy: defines the allowed structure of tags per family.
-- Each family has namespaces, each namespace has allowed values.

CREATE TABLE IF NOT EXISTS tag_namespaces (
    id          TEXT PRIMARY KEY,
    family_id   TEXT NOT NULL REFERENCES tag_families(id),
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(family_id, name)
);
CREATE INDEX IF NOT EXISTS idx_tag_namespaces_family ON tag_namespaces(family_id);

CREATE TABLE IF NOT EXISTS tag_allowed_values (
    id            TEXT PRIMARY KEY,
    namespace_id  TEXT NOT NULL REFERENCES tag_namespaces(id) ON DELETE CASCADE,
    value         TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(namespace_id, value)
);
CREATE INDEX IF NOT EXISTS idx_tag_values_namespace ON tag_allowed_values(namespace_id);

-- Seed default taxonomy for Character Identity family
INSERT OR IGNORE INTO tag_namespaces (id, family_id, name, description, sort_order) VALUES
    ('ns_pose', 'fam_character', 'pose', 'Body position and framing', 1),
    ('ns_expression', 'fam_character', 'expression', 'Facial expression', 2),
    ('ns_angle', 'fam_character', 'angle', 'Camera angle', 3),
    ('ns_lighting', 'fam_character', 'lighting', 'Lighting style', 4),
    ('ns_clothing', 'fam_character', 'clothing', 'Clothing state or type', 5),
    ('ns_style', 'fam_character', 'style', 'Visual style or medium', 6),
    ('ns_setting', 'fam_character', 'setting', 'Scene or environment', 7);

-- Seed default taxonomy for NSFW family
INSERT OR IGNORE INTO tag_namespaces (id, family_id, name, description, sort_order) VALUES
    ('ns_body_area', 'fam_nsfw', 'body-area', 'Body area focus', 1),
    ('ns_clothing_state', 'fam_nsfw', 'clothing-state', 'State of dress', 2),
    ('ns_intimacy', 'fam_nsfw', 'intimacy-level', 'Level of intimacy', 3);

-- Seed default taxonomy for Technical family
INSERT OR IGNORE INTO tag_namespaces (id, family_id, name, description, sort_order) VALUES
    ('ns_quality', 'fam_technical', 'quality', 'Image quality assessment', 1),
    ('ns_artifacts', 'fam_technical', 'artifacts', 'Known issues', 2);

-- Seed default taxonomy for Training family
INSERT OR IGNORE INTO tag_namespaces (id, family_id, name, description, sort_order) VALUES
    ('ns_suitability', 'fam_training', 'suitability', 'Training data readiness', 1),
    ('ns_crop_status', 'fam_training', 'crop-status', 'Preprocessing state', 2);

-- Seed common allowed values for pose
INSERT OR IGNORE INTO tag_allowed_values (id, namespace_id, value, description, sort_order) VALUES
    ('v_pose_front', 'ns_pose', 'front-facing', 'Directly facing camera', 1),
    ('v_pose_34', 'ns_pose', 'three-quarter', '3/4 turn', 2),
    ('v_pose_profile', 'ns_pose', 'profile', 'Side view', 3),
    ('v_pose_fullbody', 'ns_pose', 'full-body', 'Full body visible', 4),
    ('v_pose_upperbody', 'ns_pose', 'upper-body', 'Torso and above', 5),
    ('v_pose_closeup', 'ns_pose', 'close-up', 'Face close-up', 6),
    ('v_pose_seated', 'ns_pose', 'seated', 'Sitting position', 7),
    ('v_pose_standing', 'ns_pose', 'standing', 'Standing position', 8);

-- Seed common allowed values for expression
INSERT OR IGNORE INTO tag_allowed_values (id, namespace_id, value, description, sort_order) VALUES
    ('v_expr_neutral', 'ns_expression', 'neutral', 'Neutral expression', 1),
    ('v_expr_smile', 'ns_expression', 'smile', 'Smiling', 2),
    ('v_expr_serious', 'ns_expression', 'serious', 'Serious or contemplative', 3),
    ('v_expr_playful', 'ns_expression', 'playful', 'Playful or mischievous', 4);

-- Seed quality values
INSERT OR IGNORE INTO tag_allowed_values (id, namespace_id, value, description, sort_order) VALUES
    ('v_qual_high', 'ns_quality', 'high', 'High quality, no issues', 1),
    ('v_qual_medium', 'ns_quality', 'medium', 'Acceptable quality', 2),
    ('v_qual_low', 'ns_quality', 'low', 'Low quality', 3),
    ('v_qual_artifact', 'ns_quality', 'has-artifacts', 'Contains visible artifacts', 4);

-- Seed suitability values
INSERT OR IGNORE INTO tag_allowed_values (id, namespace_id, value, description, sort_order) VALUES
    ('v_suit_ready', 'ns_suitability', 'lora-ready', 'Ready for LoRA training', 1),
    ('v_suit_needscrop', 'ns_suitability', 'needs-crop', 'Needs cropping before use', 2),
    ('v_suit_duplicate', 'ns_suitability', 'duplicate-pose', 'Too similar to existing training image', 3);
