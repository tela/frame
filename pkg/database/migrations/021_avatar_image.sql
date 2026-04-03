-- Avatar image: explicit avatar selection for characters.
-- Set when a user favorites an image. Not cleared on unfavorite.
ALTER TABLE characters ADD COLUMN avatar_image_id TEXT REFERENCES images(id);
