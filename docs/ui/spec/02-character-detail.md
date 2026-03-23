# Character Detail

## Job

Understand the full state of a character's visual identity. See all their eras, know which eras are complete and which need work, and navigate to the right workspace.

## Who Uses This

The user, after selecting a character from the library. This is the hub for all work on a specific character.

## What It Shows

### Header
- Character avatar (large)
- Full name, display name
- Status badge
- Total image count across all eras and staging

### For Cast Characters: Era List
Each era shown as a card or row:
- Era label (e.g., "Young Adult")
- Era avatar / representative image
- Visual description preview (truncated)
- Prompt prefix preview (truncated)
- Image count
- Reference package status: how many face refs, how many body refs, whether package is ready
- Pending triage count for this era
- Actions: open Era Workspace, open Studio (generate for this era)

### For Cast Characters: Staging Area Summary
Images that arrived before any era was defined, or that haven't been assigned to an era yet.
- Image count in staging
- Thumbnail preview strip
- Action: open staging for triage/assignment

### For Scouted/Development Characters
- Simple image gallery of all images
- No era structure (eras don't exist yet)
- Status indicator explaining that this character is pre-cast and managed through Fig

### Standard Catalog Status
For cast characters, show which standard catalog images exist vs are missing. Each era should have a baseline set (standard portrait, full body, key outfits). This gives the user a clear picture of what generation work remains.

## Actions

- Navigate to Era Workspace
- Navigate to Studio (pick an era to generate for)
- View all images (across all eras, flat view)

## Data Requirements

- `GET /api/v1/characters/{id}` — returns character with era summaries including image counts and ref package readiness
- Character avatar from `GET /api/v1/characters/{id}/avatar`
- Era avatars from `GET /api/v1/characters/{id}/eras/{era}/avatar`
