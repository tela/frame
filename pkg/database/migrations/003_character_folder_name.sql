-- Add folder_name column to characters for filesystem-safe directory naming.
-- Format: {display_name_or_name}-{short_id}, e.g. "esme-a7f3b2c"
ALTER TABLE characters ADD COLUMN folder_name TEXT NOT NULL DEFAULT '';
