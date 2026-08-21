/* ============================================================
   version.js — Single source of truth for the app's version.

   Bump APP_VERSION whenever you ship a change worth tracking (a new
   feature, a fix, a data-model change). This project has no build
   step and no package.json, so this file — plus the mirrored
   CACHE_VERSION in sw.js (see the comment there) — is the whole
   versioning system: no external tooling, just one place to look.

   Convention: MAJOR.MINOR.PATCH (semver-ish, applied manually)
   - MAJOR: breaking data-model change (would need a migration)
   - MINOR: new feature
   - PATCH: bug fix / visual tweak
   ============================================================ */

export const APP_VERSION = '1.0.0';
export const APP_RELEASE_DATE = '2026-08-21';
