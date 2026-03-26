-- Add structured fields to eras for time/age context.
ALTER TABLE eras ADD COLUMN age_range TEXT NOT NULL DEFAULT '';
ALTER TABLE eras ADD COLUMN time_period TEXT NOT NULL DEFAULT '';
ALTER TABLE eras ADD COLUMN description TEXT NOT NULL DEFAULT '';
