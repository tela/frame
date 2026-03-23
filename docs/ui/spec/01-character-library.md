# Character Library

## Job

Find and navigate to any character Frame knows about. Understand at a glance which characters have complete visual identities and which need work.

## Who Uses This

The user, when deciding which character to work on next — whether that's triaging new images, generating more content, or assembling a training dataset.

## What It Shows

A grid or list of all characters. Each character card shows:

- **Avatar** — thumbnail of the character's primary image (or placeholder if none)
- **Display name**
- **Full name** (secondary)
- **Status badge** — scouted, development, cast
- **Era count** — how many eras are defined (cast characters only)
- **Image count** — total images across all eras and staging
- **Completeness indicator** — for cast characters, whether eras have complete reference packages (face refs scored and ranked)
- **Pending triage count** — number of images awaiting triage (cast characters only)

## Filtering and Sorting

- **Filter by status**: scouted, development, cast, or all
- **Sort by**: name, creation date, most recent activity, pending triage count
- **Search**: by name or display name (substring match)

## Actions

- Click a character → navigate to Character Detail
- No character creation in Frame (characters originate in Fig)
- No deletion (characters persist; status changes happen via API from Fig)

## Data Requirements

- `GET /api/v1/characters` — needs to return image counts and triage pending counts per character
- Avatar served from `GET /api/v1/characters/{id}/avatar`

## Notes

- Scouted and development characters will have minimal data — one image, no eras. The display should degrade gracefully rather than showing empty states for every missing field.
- Cast characters are the primary focus. Consider giving them visual priority (larger cards, more detail) or allowing the user to filter to cast-only as a default view.
