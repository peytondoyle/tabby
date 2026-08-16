# Urgent Supabase Recovery Incident

## What Happened

The shared Supabase production project `peyton-prod` was deleted by mistake during a Tabby retirement cleanup.

- Project name: `peyton-prod`
- Project ref: `kjdoiozqefbjkbsimvbs`
- Organization ID/slug from CLI inventory: `mwknnrcfnenmqhbsvmyl`
- Region: `us-east-2`
- Postgres: `17.6.1.016`
- Deletion date: `2026-06-28`
- Discovery time after deletion: `2026-06-28 18:48 EDT` / `2026-06-28T22:48:53Z`

## Supabase CLI Evidence

Before deletion, local inventory recorded:

- User tables: `85`
- Edge Functions: `35`
- Storage buckets: `5`
- Auth users: `534`
- Anonymous auth users: `513`

After deletion:

```text
supabase projects list --output json
Cannot find project ref. Have you run supabase link?
[
  {
    "id": "yibprpnewprucowdjbad",
    "name": "peyton-lab",
    "status": "ACTIVE_HEALTHY"
  }
]
```

Self-serve backup restore is not available after deletion:

```text
supabase backups list --project-ref kjdoiozqefbjkbsimvbs --output json
unexpected list backup status 400: {"message":"Resource has been removed"}

supabase backups restore --project-ref kjdoiozqefbjkbsimvbs --timestamp 1782676800 --yes --output json
unexpected restore backup status 400: {"message":"Resource has been removed"}
```

## Recovery Request For Supabase Support

Please restore deleted project `kjdoiozqefbjkbsimvbs` / `peyton-prod` from the latest available backup or point-in-time recovery immediately before deletion on `2026-06-28`.

If restoring in place is impossible, please provide the fastest supported recovery path:

- Recreate the project with the same project ref if possible.
- Restore database data, auth users, storage buckets, and Edge Functions.
- Provide a downloadable database dump if full project restoration is impossible.
- Preserve or return API keys/secrets only through the Supabase dashboard, not in email/chat.

## Known Affected Apps

From `/Users/peyton/Documents/Development/~Assets/workspace-service-registry.json`:

- `wishlist`: `wishlist_*`, `mtg_wishlist_items`
- `wishlist-ios`: `wishlist_*`
- `mtg-reference`: `cards`, `combos`, `card_semantics`, `card_rulings_cache`, `decks`, `deck_cards`, `deck_version_snapshots`, `retired_deck_snapshots`
- `roadtrip`: `roadtrip_results`, `roadtrip_seen`
- `parr-beach`: `beach_trip_state`
- `sandcastle`: `sc_*`
- `werk-room`: `dragrace_*`
- `book-babes`: `book_babes_formats`, `book_babes_ratings`
- `tier-maker`: `tiermaker_*`
- `amex-benefits-tracker`: `benefits_tracker`, `benefit_events`
- `tabby`: receipts/storage footprint

## Local Rebuild Sources If Supabase Cannot Restore

Some app schemas and migrations exist locally, but they are not a substitute for production data:

- `/Users/peyton/Documents/Development/mtg-reference`
- `/Users/peyton/Documents/Development/wishlist`
- `/Users/peyton/Documents/Development/werk-room`
- `/Users/peyton/Documents/Development/roadtrip`
- `/Users/peyton/Documents/Development/sandcastle`
- `/Users/peyton/Documents/Development/capsule`
- `/Users/peyton/Documents/Development/tabby`
- `/Users/peyton/Documents/Development/~Assets/workspace-live-audit`

