-- Replace is_face_ref/is_body_ref booleans with ref_type TEXT column.
-- Values: 'face', 'body', 'breasts', 'vagina', or NULL (not a reference).

ALTER TABLE character_images ADD COLUMN ref_type TEXT;

-- Migrate existing boolean data
UPDATE character_images SET ref_type = 'face' WHERE is_face_ref = 1;
UPDATE character_images SET ref_type = 'body' WHERE is_body_ref = 1;

-- SQLite cannot drop columns in older versions, so we leave the boolean
-- columns in place but they are no longer read by application code.
-- New code uses ref_type exclusively.
