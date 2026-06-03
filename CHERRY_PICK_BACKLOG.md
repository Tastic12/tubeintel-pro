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
- **Portrait thumbnail detection** — `classify_as_short` (portrait thumb OR duration < 60s); migration `20260603_classify_as_short.sql`

**Deferred:**
- Comparison tables — revisit when we pick a placement in the UI

---

## ~~Priority 4 — SWR data layer refactor~~ ✅ Done

**Status:** Done (2026-06-02). Backend-only; UI unchanged.

---

## ~~Priority 5 — Discover / Trending tab~~ ✅ Done

**Status:** Done (2026-06-02). V2 blue UI; sidebar link under TRACKER.

- ✅ Migration `20260602_discover_tab.sql`
- ✅ `/dashboard/discover` + API routes
- ⏭ Nightly cron optional later (see Future enhancements)

---

## Priority 6 — Thumbnail AI search ✅ Shipped (2026-06-03)

**Scope delivered in V2:**

| Piece | Status |
|-------|--------|
| CLIP embeddings (`@xenova/transformers`) + pgvector | ✅ `lib/embeddings.ts`, migration `20260604_thumbnail_search.sql` |
| Text / image / similar-to-video search | ✅ `/api/thumbnails/*` |
| Auto-index banner + manual embed | ❌ Removed from UI — indexing should be server-side (see Future enhancements) |
| `/dashboard/thumbnails` page (V2 blue UI) | ✅ |
| Sidebar link + Discover “Find similar” | ✅ |
| **Tier B: Expand on YouTube** | ✅ `/api/thumbnails/expand-search` — niche phrase + style query, ~100 API units/search |
| **Group by channel + Track channel** | ✅ On expand results |

**Run in Supabase (in order):** `20260603_classify_as_short.sql` → `20260604_thumbnail_search.sql`  
**Requires:** pgvector enabled on project; `npm install` picks up `@xenova/transformers`.

**V2 corpus (index queue):** video collections → competitor outlier cache → Discover trending → own channel cache.

---

## Priority 6 — Future enhancements (deferred — do not forget)

These were discussed but intentionally **not** in the initial ship. Revisit when users ask or quota allows.

### Indexing & infrastructure
- [ ] **Server-side embed cron** — Supabase Edge Function or scheduled job so indexing doesn’t depend on someone having the app open
- [ ] **Discover nightly cron** — `discover-trending-cron` at `0 4 * * *` to keep trending corpus fresh
- [ ] **Retry queue** for failed thumbnail URL embeds (expired CDN URLs)
- [ ] **Rate limits on embed-batch** separate from search (CLIP CPU cost)

### Discover / corpus expansion
- [ ] **Scheduled Tier B niche searches** — e.g. weekly auto-run saved phrases (“true crime UK”) to grow index without manual action
- [ ] **Saved style watches** — alert when new indexed thumbs match a saved query
- [ ] **Larger Discover window** — extend 14-day embed queue beyond trending staleness

### Search quality & UX
- [ ] **Fine-tuned / niche model** for YouTube thumbnail tropes (beyond generic CLIP)
- [ ] **Style cluster labels** — auto-group results (“neon text”, “split face”)
- [ ] **Outlier badge** on thumbnail results when SQL score exists
- [ ] **Plan gating** — Pro-only expand search or higher daily expand limits

### Not planned
- [ ] **Full YouTube crawl (Tier C)** — too expensive; rejected in original ROADMAP

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
