-- Gender on characters, gynecoid continuum stage and waist-hip ratio on eras.

ALTER TABLE characters ADD COLUMN gender TEXT NOT NULL DEFAULT '';

ALTER TABLE eras ADD COLUMN gynecoid_stage TEXT NOT NULL DEFAULT '';
ALTER TABLE eras ADD COLUMN waist_hip_ratio REAL;
