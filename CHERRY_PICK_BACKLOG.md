# Cherry-pick backlog (from original ClikStats)

Features worth porting from `C:\Cursor Projects\ClikStats` into ClikStats V2.
Keep V2’s UI/shell; bring over backend logic and product features from the list below.

**Status:** Rate limiting + admin quota — done (2026-06-02).  
**Status:** SQL outlier intelligence — done (2026-06-02). Backend-only; existing UI unchanged.

---

## ~~Priority 2 — SQL outlier intelligence~~ ✅ Done

Implemented via `video_outlier_cache` table, `/api/outliers/sync`, and enhanced `calculateOutlierScore` fallback. Run migration `20260602_outlier_scores_v2.sql` in Supabase.

---

## Priority 3 — Competitor UX refinements

**Already in V2 (no work needed):**
- Bulk paste import — skipped (not needed for V2 design)
- Category/folder groups — niche folders under Channels
- Standalone competitor videos — Tracker → Videos

**Done (2026-06-02):**
- **Hide Shorts** — toggle in profile menu, localStorage + cross-tab sync, **on by default**

**Deferred:**
- Comparison tables — revisit when we pick a placement in the UI

---

## Priority 4 — SWR data layer refactor

**Source:** `lib/hooks.ts`

- Consistent SWR caching for channels, videos, metrics, competitors
- `postAuthedApi` / error parsing helpers
- Gradually replace V2’s mixed mock/real `services/api/index.ts` layer

**Why:** Cleaner loading states, less duplicate fetch logic.

---

## Priority 5 — Discover / Trending tab

**Source:** `src/app/tracking/discover/`, `lib/youtube-discover.ts`, `lib/discover-db.ts`

- Browse YouTube Trending by region/category
- Sync to DB, optional nightly cron
- New page under V2 dashboard nav

**Why:** Niche discovery beyond tracked competitors.

---

## Priority 6 — Thumbnail AI search (largest lift)

**Source:** `lib/embeddings.ts`, thumbnail API routes, pgvector migrations

- CLIP embeddings (`@xenova/transformers`) + pgvector in Supabase
- Text search, image upload, similar-to-video
- Background indexing queue + progress banner

**Why:** Strong differentiator; needs new migrations, API routes, and UI.

---

## Do not port

- Purple theme / Tailwind 4 setup (keep V2 blue visual)
- Client-only auth (V2 middleware is better)
- Plan scaffold without Stripe (V2 has real billing path)
- Email-only auth downgrades (optional later)

---

## Reference

Original repo path: `C:\Cursor Projects\ClikStats`  
V2 repo: [Tastic12/tubeintel-pro](https://github.com/Tastic12/tubeintel-pro.git)
