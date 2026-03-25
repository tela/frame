-- Add caption column to character_images for per-image descriptions.
-- Captions are natural language descriptions used for training export.
-- dataset_images.caption (already exists) overrides this in dataset context.
ALTER TABLE character_images ADD COLUMN caption TEXT;
