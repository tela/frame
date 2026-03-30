-- Developmental attributes on eras for consistent age progression rendering.

-- Face shape
ALTER TABLE eras ADD COLUMN face_shape TEXT NOT NULL DEFAULT '';
ALTER TABLE eras ADD COLUMN buccal_fat TEXT NOT NULL DEFAULT '';
ALTER TABLE eras ADD COLUMN jaw_definition TEXT NOT NULL DEFAULT '';
ALTER TABLE eras ADD COLUMN brow_ridge TEXT NOT NULL DEFAULT '';
ALTER TABLE eras ADD COLUMN nasolabial_depth TEXT NOT NULL DEFAULT '';

-- Skin texture
ALTER TABLE eras ADD COLUMN skin_texture TEXT NOT NULL DEFAULT '';
ALTER TABLE eras ADD COLUMN skin_pore_visibility TEXT NOT NULL DEFAULT '';
ALTER TABLE eras ADD COLUMN under_eye TEXT NOT NULL DEFAULT '';

-- Body proportions
ALTER TABLE eras ADD COLUMN head_body_ratio REAL;
ALTER TABLE eras ADD COLUMN leg_torso_ratio REAL;
ALTER TABLE eras ADD COLUMN shoulder_hip_ratio REAL;

-- Areola development
ALTER TABLE eras ADD COLUMN areola_size TEXT NOT NULL DEFAULT '';
ALTER TABLE eras ADD COLUMN areola_color TEXT NOT NULL DEFAULT '';
ALTER TABLE eras ADD COLUMN areola_shape TEXT NOT NULL DEFAULT '';

-- Labia development
ALTER TABLE eras ADD COLUMN labia_majora TEXT NOT NULL DEFAULT '';
ALTER TABLE eras ADD COLUMN labia_minora TEXT NOT NULL DEFAULT '';
ALTER TABLE eras ADD COLUMN labia_color TEXT NOT NULL DEFAULT '';
