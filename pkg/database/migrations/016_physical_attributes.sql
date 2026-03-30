-- Physical attributes: immutable traits on characters, era-varying traits on eras.

-- Character-level (immutable across eras)
ALTER TABLE characters ADD COLUMN ethnicity TEXT NOT NULL DEFAULT '';
ALTER TABLE characters ADD COLUMN skin_tone TEXT NOT NULL DEFAULT '';
ALTER TABLE characters ADD COLUMN eye_color TEXT NOT NULL DEFAULT '';
ALTER TABLE characters ADD COLUMN eye_shape TEXT NOT NULL DEFAULT '';
ALTER TABLE characters ADD COLUMN natural_hair_color TEXT NOT NULL DEFAULT '';
ALTER TABLE characters ADD COLUMN natural_hair_texture TEXT NOT NULL DEFAULT '';
ALTER TABLE characters ADD COLUMN distinguishing_features TEXT NOT NULL DEFAULT '';

-- Era-level (change per era)
ALTER TABLE eras ADD COLUMN height_cm INTEGER;
ALTER TABLE eras ADD COLUMN weight_kg INTEGER;
ALTER TABLE eras ADD COLUMN build TEXT NOT NULL DEFAULT '';
ALTER TABLE eras ADD COLUMN breast_size TEXT NOT NULL DEFAULT '';
ALTER TABLE eras ADD COLUMN breast_tanner TEXT NOT NULL DEFAULT '';
ALTER TABLE eras ADD COLUMN hip_shape TEXT NOT NULL DEFAULT '';
ALTER TABLE eras ADD COLUMN pubic_hair_style TEXT NOT NULL DEFAULT '';
ALTER TABLE eras ADD COLUMN pubic_hair_tanner TEXT NOT NULL DEFAULT '';
ALTER TABLE eras ADD COLUMN hair_color TEXT NOT NULL DEFAULT '';
ALTER TABLE eras ADD COLUMN hair_length TEXT NOT NULL DEFAULT '';
