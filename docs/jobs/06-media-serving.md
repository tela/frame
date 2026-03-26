# Job Stories: Media Serving and Security

## Context

Frame serves images to Fig and other consumers. All media lives on an encrypted removable drive. When the drive is removed, all character data must immediately become unavailable.

---

### When I plug in the encrypted drive and start Frame, all my character images and data should be immediately available to Fig and other tools.

**Acceptance:**
- Frame starts from the drive and serves on a configured port
- Fig detects Frame via health check and begins caching avatars
- All API endpoints are available and return data from the drive
- Character images, thumbnails, media items all served correctly

---

### When I remove the encrypted drive, no character data should remain accessible anywhere.

**Acceptance:**
- Frame process terminates (or becomes unresponsive)
- Fig's health check fails within seconds
- Fig purges its entire in-memory image cache
- No images persist on the host machine (all caching is in-memory)
- Re-plugging the drive and restarting Frame restores full functionality

---

### When Fig needs to display a character's avatar or gallery, it should get the images from Frame without any disk caching on the host.

**Acceptance:**
- Frame serves images via HTTP (original and thumbnail variants)
- Fig caches in memory only — never writes images to host disk
- Cache-on-use: first request hits Frame, subsequent served from memory
- On startup: pre-fetch avatars for all characters, full sets for favorites

---

## What's Missing in Current Implementation

- Frame already serves from the drive root (this works)
- Frame has graceful shutdown on SIGINT/SIGTERM (this works)
- No work needed on Frame side for encrypted drive support — it's architecturally ready
- Fig integration (health check client, in-memory cache, degraded mode) is not built yet — that's Fig-side work
