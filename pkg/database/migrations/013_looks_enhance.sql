-- Enhance character_looks with era_id and is_default for go-see outfits.

ALTER TABLE character_looks ADD COLUMN era_id TEXT NOT NULL DEFAULT '';
ALTER TABLE character_looks ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0;
