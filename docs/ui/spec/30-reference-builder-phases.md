# Reference Builder — Phase 2 & 3

## Phase 2: Context-Aware Tag Filtering

When tagging an image in the tag manager or tag picker, the available tag namespaces should be filtered by the image's ref_type. A breast reference image should only surface breast-relevant tags; a face reference should only surface face-relevant tags.

### Mapping: ref_type → tag namespaces

- **face**: face_shape, buccal_fat, jaw_definition, brow_ridge, nasolabial_depth, skin_texture, skin_pore_visibility, under_eye, expression, angle, lighting
- **body**: build, height, weight, waist_hip_ratio, head_body_ratio, leg_torso_ratio, shoulder_hip_ratio, pose, angle, lighting
- **breasts**: breast_size, breast_tanner, areola_size, areola_color, areola_shape, angle, lighting
- **vagina**: labia_majora, labia_minora, labia_color, pubic_hair_style, pubic_hair_tanner, angle, lighting

Shared namespaces (angle, lighting, quality, etc.) appear for all types. The mapping should be data-driven (stored in config or a table), not hardcoded in the UI.

### Where this applies

- Tag picker modal (used from era workspace, reference builder, triage)
- Tag manager (when viewing tags for a specific image)
- Bulk tagging (if all selected images share the same ref_type, filter applies; if mixed, show all)

### Vocabulary alignment

The allowed values in tag namespaces must use the same vocabulary as era physical attributes. If an era defines `areola_color: pink`, the tag namespace `areola_color` must include `pink` as an allowed value. This is enforced by seeding allowed values from the same source as era attribute options.

---

## Phase 3: Tags Follow Derivatives

When an image is processed through the preprocessor (crop, upscale, color adjust, etc.), the resulting derivative must inherit all tags from the source image. Derivatives are what go into training datasets, and they need to carry the structured metadata.

### Current state

- `derivatives` table has `source_image_id` linking to the original
- `image_tags` table associates tags with image IDs
- No automatic tag propagation exists today

### Required behavior

1. When a derivative is created, copy all `image_tags` rows from `source_image_id` to the new derivative's image ID, with `source: 'inherited'`
2. Inherited tags can be overridden or removed on the derivative without affecting the source
3. If new tags are added to the source after the derivative was created, they do NOT auto-propagate (the derivative is a snapshot)
4. The dataset builder should prefer derivatives over source images when both exist, since derivatives are the processed/ready-for-training versions
5. Tag provenance should be visible in the UI — show which tags were inherited vs. manually added

### Training dataset implications

When building a dataset query like "all images tagged `areola_color:pink` + `areola_size:small`", the results should include derivatives that inherited those tags. The dataset export pipeline already works with image IDs — the key change is ensuring derivatives have tags to be found by.
