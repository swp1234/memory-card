# Memory Card Flip

Card-matching game published at `/memory-card/` on DopaBrain.

## Current product

- Emoji, animal, fruit, and flag decks
- Easy, normal, and hard board choices with progressive stages
- Local best score and local leaderboard
- Keyboard, pointer, touch, pause, sound, and PWA support
- 12 locale bundles and four focused related routes

## Advertising status

Ad loading, manual placements, interstitials, and rewarded score actions are disabled while the site is under an invalid-traffic review that began on 2026-09-03. Restoring them requires a separate policy review and verified release.

## Analytics contract

Each private stage fires at most once per page view:

`memory_card_view -> memory_card_start -> memory_card_progress -> memory_card_complete -> memory_card_share / memory_card_related_click`

The events contain no theme, difficulty, card choice, score, stage number, time, result, or URL. Share is recorded only after the native share or clipboard operation succeeds.

## Local run

Serve the repository root over HTTP and open `/memory-card/?lang=en`. The repository-level `verify:memory-card-suspension` command is the release gate for source mutations and mobile/desktop browser journeys.
