# Audit Trail

## Job

Track what happened to images, characters, and datasets so that when a training run produces good results, you can trace back to exactly what the dataset looked like, what tags were applied, and what preprocessing was done.

## What Gets Tracked

### Image Events
- Image ingested (source, character, era)
- Triage decision (approved, rejected, archived)
- Rating changed (old → new)
- Set type changed (staging → reference, etc.)
- Promoted to face ref / body ref (with score)
- Tag applied / removed (which tag, which family)
- Caption set / changed
- Derivative created (operations applied)
- Added to dataset / removed from dataset

### Character Events
- Character created (source: frame or fig)
- Status changed (prospect → development → cast)
- Published to Fig
- Era created

### Dataset Events
- Dataset created
- Images added / removed
- Dataset forked (source dataset ID)
- Dataset exported (export config)
- Caption updated on dataset image

## Data Model

### audit_log table
| Field | Type | Notes |
|-------|------|-------|
| id | TEXT (16-char hex) | Primary key |
| entity_type | TEXT | 'image', 'character', 'dataset', 'tag' |
| entity_id | TEXT | ID of the affected entity |
| action | TEXT | 'created', 'updated', 'status_changed', 'tag_added', etc. |
| field | TEXT | Which field changed (nullable) |
| old_value | TEXT | Previous value (nullable) |
| new_value | TEXT | New value (nullable) |
| context | TEXT (JSON) | Additional context (character_id, era_id, dataset_id, etc.) |
| created_at | TEXT | Timestamp |

## Where It Appears

### Image Detail Panel (Era Workspace)
- "History" tab or section showing chronological events for this image
- Each event shows: timestamp, action description, before/after values

### Character Detail
- "Activity" section showing recent events across all the character's images
- Filterable by event type

### Dataset Detail
- "History" showing when images were added/removed, when exported
- Critical for reproducing a training run

## Implementation Approach

The audit log is append-only. Events are written by the store methods (or API handlers) whenever a mutation occurs. No events are ever deleted.

For the initial implementation:
- Add the `audit_log` table
- Add a `LogEvent` function that stores use to record changes
- Wire it into the key mutation paths (triage, rating, tagging, ref promotion, dataset changes)
- Add a read API: `GET /api/v1/audit?entity_type=image&entity_id=xxx&limit=50`
- Frontend: show audit history on image detail and dataset detail

## API

```
GET /api/v1/audit?entity_type={type}&entity_id={id}&limit={n}&offset={n}
→ { "events": [...], "total": N }
```

## Design Notes

- The audit trail should be visible but not prominent — a collapsible section or tab
- Events use natural language descriptions: "Rating changed from 3 to 5" not "UPDATE character_images SET rating=5"
- Timestamps in relative format when recent ("2 hours ago"), absolute when older
- Audit data is small — no performance concern for single-user scale
