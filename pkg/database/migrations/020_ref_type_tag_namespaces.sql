-- Add ref_types column to tag_namespaces for context-aware filtering.
-- NULL means the namespace applies to all ref types (universal).
-- A comma-separated list like "face,body" means it only appears for those ref types.

ALTER TABLE tag_namespaces ADD COLUMN ref_types TEXT;

-- Update existing namespaces with ref_type scope
UPDATE tag_namespaces SET ref_types = 'face,body' WHERE id = 'ns_pose';
UPDATE tag_namespaces SET ref_types = 'face' WHERE id = 'ns_expression';
UPDATE tag_namespaces SET ref_types = 'body' WHERE id = 'ns_clothing';
UPDATE tag_namespaces SET ref_types = 'body,breasts,vagina' WHERE id = 'ns_clothing_state';
-- angle, lighting, body-area, quality, artifacts, suitability, crop-status: remain NULL (universal)

-- === Face-specific namespaces (fam_character family) ===

INSERT OR IGNORE INTO tag_namespaces (id, family_id, name, description, sort_order, ref_types) VALUES
    ('ns_face_shape', 'fam_character', 'face-shape', 'Overall face shape', 10, 'face'),
    ('ns_buccal_fat', 'fam_character', 'buccal-fat', 'Buccal fat volume', 11, 'face'),
    ('ns_jaw_definition', 'fam_character', 'jaw-definition', 'Jaw line definition', 12, 'face'),
    ('ns_brow_ridge', 'fam_character', 'brow-ridge', 'Brow ridge prominence', 13, 'face'),
    ('ns_nasolabial_depth', 'fam_character', 'nasolabial-depth', 'Nasolabial fold depth', 14, 'face'),
    ('ns_skin_texture', 'fam_character', 'skin-texture', 'Skin surface texture', 15, 'face'),
    ('ns_skin_pore', 'fam_character', 'skin-pore-visibility', 'Skin pore visibility', 16, 'face'),
    ('ns_under_eye', 'fam_character', 'under-eye', 'Under-eye appearance', 17, 'face');

INSERT OR IGNORE INTO tag_allowed_values (id, namespace_id, value, description, sort_order) VALUES
    ('v_fs_round', 'ns_face_shape', 'round', 'Round face shape', 1),
    ('v_fs_oval', 'ns_face_shape', 'oval', 'Oval face shape', 2),
    ('v_fs_heart', 'ns_face_shape', 'heart', 'Heart face shape', 3),
    ('v_fs_square', 'ns_face_shape', 'square', 'Square face shape', 4),
    ('v_fs_oblong', 'ns_face_shape', 'oblong', 'Oblong face shape', 5),
    ('v_bf_full', 'ns_buccal_fat', 'full', 'Full buccal fat', 1),
    ('v_bf_moderate', 'ns_buccal_fat', 'moderate', 'Moderate buccal fat', 2),
    ('v_bf_slim', 'ns_buccal_fat', 'slim', 'Slim buccal fat', 3),
    ('v_bf_hollow', 'ns_buccal_fat', 'hollow', 'Hollow buccal fat', 4),
    ('v_jd_soft', 'ns_jaw_definition', 'soft', 'Soft jaw line', 1),
    ('v_jd_moderate', 'ns_jaw_definition', 'moderate', 'Moderate jaw definition', 2),
    ('v_jd_defined', 'ns_jaw_definition', 'defined', 'Well-defined jaw', 3),
    ('v_jd_angular', 'ns_jaw_definition', 'angular', 'Angular jaw', 4),
    ('v_br_subtle', 'ns_brow_ridge', 'subtle', 'Subtle brow ridge', 1),
    ('v_br_moderate', 'ns_brow_ridge', 'moderate', 'Moderate brow ridge', 2),
    ('v_br_prominent', 'ns_brow_ridge', 'prominent', 'Prominent brow ridge', 3),
    ('v_nd_absent', 'ns_nasolabial_depth', 'absent', 'No visible fold', 1),
    ('v_nd_faint', 'ns_nasolabial_depth', 'faint', 'Faint fold', 2),
    ('v_nd_moderate', 'ns_nasolabial_depth', 'moderate', 'Moderate fold', 3),
    ('v_nd_defined', 'ns_nasolabial_depth', 'defined', 'Deep defined fold', 4),
    ('v_st_smooth', 'ns_skin_texture', 'smooth', 'Smooth skin', 1),
    ('v_st_clear', 'ns_skin_texture', 'clear', 'Clear skin', 2),
    ('v_st_fine', 'ns_skin_texture', 'fine_lines', 'Fine lines visible', 3),
    ('v_st_textured', 'ns_skin_texture', 'textured', 'Textured skin', 4),
    ('v_sp_absent', 'ns_skin_pore', 'absent', 'Pores not visible', 1),
    ('v_sp_fine', 'ns_skin_pore', 'fine', 'Fine pores', 2),
    ('v_sp_visible', 'ns_skin_pore', 'visible', 'Visibly pored', 3),
    ('v_ue_smooth', 'ns_under_eye', 'smooth', 'Smooth under-eye', 1),
    ('v_ue_faint', 'ns_under_eye', 'faint_hollow', 'Faint hollow', 2),
    ('v_ue_defined', 'ns_under_eye', 'defined_hollow', 'Defined hollow', 3);

-- === Body-specific namespaces (fam_character family) ===

INSERT OR IGNORE INTO tag_namespaces (id, family_id, name, description, sort_order, ref_types) VALUES
    ('ns_build', 'fam_character', 'build', 'Body build type', 20, 'body'),
    ('ns_gynecoid', 'fam_character', 'gynecoid-stage', 'Gynecoid development stage', 21, 'body');

INSERT OR IGNORE INTO tag_allowed_values (id, namespace_id, value, description, sort_order) VALUES
    ('v_build_petite', 'ns_build', 'petite', 'Petite build', 1),
    ('v_build_slim', 'ns_build', 'slim', 'Slim build', 2),
    ('v_build_athletic', 'ns_build', 'athletic', 'Athletic build', 3),
    ('v_build_average', 'ns_build', 'average', 'Average build', 4),
    ('v_build_curvy', 'ns_build', 'curvy', 'Curvy build', 5),
    ('v_build_full', 'ns_build', 'full', 'Full build', 6),
    ('v_gyn_early', 'ns_gynecoid', 'early', 'Early gynecoid development', 1),
    ('v_gyn_mid', 'ns_gynecoid', 'mid', 'Mid gynecoid development', 2),
    ('v_gyn_mature', 'ns_gynecoid', 'mature', 'Mature gynecoid development', 3);

-- === Breast-specific namespaces (fam_nsfw family) ===

INSERT OR IGNORE INTO tag_namespaces (id, family_id, name, description, sort_order, ref_types) VALUES
    ('ns_breast_size', 'fam_nsfw', 'breast-size', 'Breast size', 10, 'breasts'),
    ('ns_breast_tanner', 'fam_nsfw', 'breast-tanner', 'Breast Tanner stage', 11, 'breasts'),
    ('ns_areola_size', 'fam_nsfw', 'areola-size', 'Areola diameter', 12, 'breasts'),
    ('ns_areola_color', 'fam_nsfw', 'areola-color', 'Areola pigmentation', 13, 'breasts'),
    ('ns_areola_shape', 'fam_nsfw', 'areola-shape', 'Areola form', 14, 'breasts');

INSERT OR IGNORE INTO tag_allowed_values (id, namespace_id, value, description, sort_order) VALUES
    ('v_bs_small', 'ns_breast_size', 'small', 'Small', 1),
    ('v_bs_medium', 'ns_breast_size', 'medium', 'Medium', 2),
    ('v_bs_large', 'ns_breast_size', 'large', 'Large', 3),
    ('v_bt_3', 'ns_breast_tanner', 'III', 'Tanner stage III', 1),
    ('v_bt_4', 'ns_breast_tanner', 'IV', 'Tanner stage IV', 2),
    ('v_bt_5', 'ns_breast_tanner', 'V', 'Tanner stage V', 3),
    ('v_as_small', 'ns_areola_size', 'small', 'Small areola', 1),
    ('v_as_medium', 'ns_areola_size', 'medium', 'Medium areola', 2),
    ('v_as_large', 'ns_areola_size', 'large', 'Large areola', 3),
    ('v_ac_light', 'ns_areola_color', 'light', 'Light pigmentation', 1),
    ('v_ac_medium', 'ns_areola_color', 'medium', 'Medium pigmentation', 2),
    ('v_ac_dark', 'ns_areola_color', 'dark', 'Dark pigmentation', 3),
    ('v_ash_flat', 'ns_areola_shape', 'flat', 'Flat areola', 1),
    ('v_ash_puffy', 'ns_areola_shape', 'puffy', 'Puffy areola', 2),
    ('v_ash_raised', 'ns_areola_shape', 'raised', 'Raised areola', 3),
    ('v_ash_pronounced', 'ns_areola_shape', 'pronounced', 'Pronounced areola', 4);

-- === Vagina-specific namespaces (fam_nsfw family) ===

INSERT OR IGNORE INTO tag_namespaces (id, family_id, name, description, sort_order, ref_types) VALUES
    ('ns_labia_majora', 'fam_nsfw', 'labia-majora', 'Labia majora form', 20, 'vagina'),
    ('ns_labia_minora', 'fam_nsfw', 'labia-minora', 'Labia minora visibility', 21, 'vagina'),
    ('ns_labia_color', 'fam_nsfw', 'labia-color', 'Labia pigmentation', 22, 'vagina'),
    ('ns_pubic_hair_style', 'fam_nsfw', 'pubic-hair-style', 'Pubic hair styling', 23, 'vagina'),
    ('ns_pubic_hair_tanner', 'fam_nsfw', 'pubic-hair-tanner', 'Pubic hair Tanner stage', 24, 'vagina');

INSERT OR IGNORE INTO tag_allowed_values (id, namespace_id, value, description, sort_order) VALUES
    ('v_lmaj_flat', 'ns_labia_majora', 'flat', 'Flat', 1),
    ('v_lmaj_moderate', 'ns_labia_majora', 'moderate', 'Moderate', 2),
    ('v_lmaj_full', 'ns_labia_majora', 'full', 'Full', 3),
    ('v_lmin_minimal', 'ns_labia_minora', 'minimal', 'Minimal', 1),
    ('v_lmin_visible', 'ns_labia_minora', 'visible', 'Visible', 2),
    ('v_lmin_protruding', 'ns_labia_minora', 'protruding', 'Protruding', 3),
    ('v_lc_light', 'ns_labia_color', 'light', 'Light pigmentation', 1),
    ('v_lc_medium', 'ns_labia_color', 'medium', 'Medium pigmentation', 2),
    ('v_lc_dark', 'ns_labia_color', 'dark', 'Dark pigmentation', 3),
    ('v_phs_bare', 'ns_pubic_hair_style', 'bare', 'Bare', 1),
    ('v_phs_landing', 'ns_pubic_hair_style', 'landing_strip', 'Landing strip', 2),
    ('v_phs_trimmed', 'ns_pubic_hair_style', 'trimmed', 'Trimmed', 3),
    ('v_phs_natural', 'ns_pubic_hair_style', 'natural', 'Natural', 4),
    ('v_pht_3', 'ns_pubic_hair_tanner', 'III', 'Tanner stage III', 1),
    ('v_pht_4', 'ns_pubic_hair_tanner', 'IV', 'Tanner stage IV', 2),
    ('v_pht_5', 'ns_pubic_hair_tanner', 'V', 'Tanner stage V', 3);
