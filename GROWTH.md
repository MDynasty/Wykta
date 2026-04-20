# Wykta — Go-to-Launch & Growth Strategy

This document covers the phased plan to grow Wykta from 0 to 10,000+ active users,
the UX improvements needed to keep them, and the referral / community mechanics
to make growth self-sustaining.

---

## Table of contents

1. [User acquisition targets](#user-acquisition-targets)
2. [Phase 0 — Foundation (before launch)](#phase-0--foundation-before-launch)
3. [Phase 1 — Cold-start launch (week 1–2)](#phase-1--cold-start-launch-week-12)
4. [Phase 2 — Growth engine (month 1–3)](#phase-2--growth-engine-month-13)
5. [Phase 3 — Retention & monetisation (month 3+)](#phase-3--retention--monetisation-month-3)
6. [UX roadmap](#ux-roadmap)
7. [Referral & virality mechanics](#referral--virality-mechanics)
8. [Key metrics to track](#key-metrics-to-track)
9. [Channel-specific playbooks](#channel-specific-playbooks)

---

## User acquisition targets

| Milestone | Timeline | KPI |
|-----------|----------|-----|
| 500 confirmed community members | Week 2 | email list |
| 1,000 unique users | Month 1 | UV (GA4) |
| 5,000 unique users | Month 2 | UV |
| 10,000 unique users | Month 3 | UV |
| 35% first-scan conversion | Month 1 | scans / UV |
| 20% 7-day retention | Month 2 | returning users |
| 8% email subscription conversion | Ongoing | community_members / UV |
| 1% free-to-pro conversion | Month 3 | subscriptions / UV |

---

## Phase 0 — Foundation (before launch)

Complete these before any marketing begins:

- [ ] All 4 languages fully translated (including footer links — done in this PR).
- [ ] Email OTP double-opt-in live for community form (done in this PR).
- [ ] Privacy policy and Terms of Service pages complete and linked.
- [ ] Mobile app (iOS TestFlight + Android Internal Testing) published for early access.
- [ ] Analytics configured: GA4 or Plausible capturing `analyze`, `scan`, `community_join` events.
- [ ] Stripe webhook live; payment-success email sending confirmed.
- [ ] Domain decided and canonical URL consistent across all pages (done in this PR).

---

## Phase 1 — Cold-start launch (week 1–2)

### Launch channels (run in parallel)

**1. Product Hunt**
- Prepare a launch post with a GIF demo: open app → scan label → get warnings.
- Schedule for Tuesday/Wednesday 12:01 AM PST for maximum exposure.
- Ask your network for upvotes in the first 2 hours (critical for front-page ranking).
- Respond to every comment on launch day.

**2. Reddit**
- Post a detailed "Show HN" style post to r/SkincareAddiction, r/CleanEating,
  r/nutrition, r/vegan, r/China (for ZH audience) with screenshots and value prop.
- Title formula: "I built a free tool that tells you exactly what's in your skincare —
  powered by AI + open ingredient databases."
- Do NOT just drop a link — write a real post explaining the problem you solved.

**3. 小红书 (Xiaohongshu / RedNote) — for ZH market**
- Create 3 posts in the first week: (1) product intro, (2) "I tested 5 skincare products",
  (3) "how I read ingredient labels like a pro."
- Use hashtags: #成分控 #敏感肌 #护肤成分 #食品成分 #纯素.
- Partner with at least one CN skincare KOL (小红书 博主, 5k–50k followers) for a
  genuine review post.

**4. GitHub / Dev communities**
- Post on GitHub Discussions; this is open source so engineers can contribute.
- Write a DEV.to or Hashnode post: "How we built a multilingual AI ingredient scanner
  with Supabase Edge Functions + Tesseract.js."
- Submit to Hacker News "Show HN."

**5. Discord communities**
- Post in skincare, health, and food-focused Discord servers.
- Provide clear value: "free tool, no account needed, 4 languages."

---

## Phase 2 — Growth engine (month 1–3)

### SEO content strategy

Create a content hub at `/ingredients/` with individual pages for the 200 most
searched risky ingredients:

- `/ingredients/retinol` — "Is retinol safe? Who should avoid it?"
- `/ingredients/sodium-lauryl-sulfate` — "SLS: what you need to know"
- `/ingredients/parabens` — "Are parabens dangerous?"

Each page should:
- Target the long-tail keyword `"{ingredient} skincare safety"` / `"{ingredient} side effects"`.
- Include the Wykta scanner widget (let users analyze it right there).
- Link to the community page and app download.

Target: 50 ingredient pages in month 1, 200 by month 3.
Expected: 1,000–5,000 monthly organic visits from long-tail SEO.

### TikTok / 抖音 short video

- 30-second format: "Scanning [popular product] — what does the AI say?"
- Show the scan → result → verdict. The shocking result IS the CTA.
- Post 3× per week minimum for the first month.
- CN market: 抖音 is higher priority than TikTok. EN/FR/DE market: Instagram Reels.

### KOL / influencer outreach

Target micro-influencers (10k–100k followers) in:
- Skincare / clean beauty (EN, FR, DE markets)
- Food sensitivity / allergy (EN market)
- 成分党 / 护肤 (ZH market)

Offer: free Pro subscription in exchange for an honest review post.
Budget: 0 cash, 5–10 Pro annual codes (< $300 value).

---

## Phase 3 — Retention & monetisation (month 3+)

### Email nurture sequence

After community form double-opt-in, send:

1. **Day 0** — Welcome email with "your first scan" guide (3 steps + GIF).
2. **Day 3** — "5 ingredients to avoid in sunscreen" (educational, value-first).
3. **Day 7** — Social proof: "10,000 scans done this week — what we found."
4. **Day 14** — Soft upgrade prompt: "Unlock unlimited AI scans + PDF export."
5. **Day 30** — Changelog email: what's new this month + invite to Discord.

### Weekly public changelog

Post a short "What we shipped this week" update in:
- GitHub Releases
- Discord #announcements
- Twitter/X @wykta_app

This builds trust, shows momentum, and re-engages lapsed users.

### In-app upgrade nudges (non-intrusive)

- After 5 free AI analyses: show the free-tier limit banner (already implemented).
- After 3rd scan on a given day: show a soft upgrade tip at the bottom of results.
- On PDF export button click (Pro feature): show modal with upgrade CTA.

---

## UX roadmap

### Phase 1 UX (weeks 1–2) — reduce friction

| Item | Status | Priority |
|------|--------|----------|
| Actionable error messages (OCR fail, AI fail) | ✅ Done | P0 |
| Footer links translated in all 4 languages | ✅ Done | P0 |
| OTP verification for community join & subscription lookup | ✅ Done | P0 |
| Camera permission denied: show "paste instead" fallback CTA | Backlog | P1 |
| Onboarding tooltip for first-time users (3-step highlight tour) | Backlog | P1 |
| Empty-state improvement: sample ingredient text pre-filled | Backlog | P2 |

### Phase 2 UX (month 1–2) — personalisation

| Item | Priority |
|------|----------|
| User allergen profile (set once, flag matches on every scan) | P1 |
| Scan history (last 10 scans stored in localStorage) | P1 |
| Share result as a card image (Web Share API / clipboard) | P1 |
| Language preference saved permanently (already done via localStorage) | ✅ Done |

### Phase 3 UX (month 3+) — depth & trust

| Item | Priority |
|------|----------|
| Ingredient detail modal (tap ingredient → see full profile, sources, studies) | P1 |
| "Safer alternatives" suggestions below risky ingredients | P2 |
| Comparison mode: scan product A vs product B | P2 |
| A/B test CTA copy ("Analyze" vs "Scan now" vs "Check ingredients") | P2 |

---

## Referral & virality mechanics

### Invite-to-unlock (referral program)

**Mechanic:** A free user who invites 3 friends who each complete a scan unlocks
2 weeks of Pro for free.

**Implementation:**
1. Generate a unique referral link per user: `?ref={user_id}`.
2. Store `referred_by` in the `community_members` table.
3. Add a migration to track referral counts and auto-grant Pro trial via the
   `subscriptions` table with `plan='pro-trial'` and `mode='referral'`.
4. Show a "Share Wykta" button on the results page with pre-filled text:
   "I just scanned my [product] with Wykta — free AI ingredient checker. Try it: [link]"

### 7-day ingredient cleanse challenge

- Users commit to "7 days of reading every label before buying."
- Each day they post their scan result to social (badge system).
- On day 7 they unlock a "Clean Consumer" badge and a discount code for Pro.
- Runs every month, seeded by the Discord community.

### Community voting on ingredient database

- Weekly poll: "Which ingredient should we add next to our risk database?"
- Community votes on GitHub Issues or Discord.
- Winning ingredient gets a deep-dive blog post.
- Drives weekly return visits and GitHub stars.

---

## Key metrics to track

Set up GA4 custom events for each of these:

| Event | Trigger | Goal |
|-------|---------|------|
| `first_scan` | User completes their first analysis | > 35% of new visitors |
| `repeat_scan` | User completes ≥ 2 scans in one session | > 20% |
| `community_join_started` | Community form submitted | > 8% of UV |
| `community_join_confirmed` | OTP verified | > 70% of started |
| `checkout_started` | User clicks any Pro CTA | > 3% of UV |
| `checkout_completed` | Payment success | > 30% of started |
| `share_result` | Result shared | > 5% of scan completions |
| `pwa_install` | PWA installed | > 2% of mobile visitors |
| `app_download_ios` | Link to App Store clicked | track clicks |
| `app_download_android` | Link to Play Store clicked | track clicks |

### Retention metrics (GA4 Audiences)

- **Day 1 retention**: users who return within 24 h of first visit.
- **Day 7 retention**: return within 7 days.
- **Day 30 retention**: return within 30 days.
- Target: D1 > 30%, D7 > 20%, D30 > 10%.

---

## Channel-specific playbooks

### Discord community management

1. Create channels: `#announcements`, `#scan-results`, `#ingredient-questions`,
   `#product-suggestions`, `#off-topic`.
2. Post a welcome message explaining the community rules and how Wykta works.
3. Pin a "suggest a feature" thread — monitor it weekly.
4. Run a weekly "Scan of the week" where the team reviews a community-submitted scan.

### WeChat — CN market

1. Create a WeChat Official Account (订阅号 for content, 服务号 for interactive features).
2. Post weekly: ingredient safety tip in Chinese.
3. Integrate WeChat Login / sharing for the mobile app (Phase 3).
4. Partner with 成分党 WeChat groups (reach: 500–5,000 members each).

### Product Hunt aftercare

After the launch day peak:
1. Reply to all comments within 24 hours.
2. Post an update on day 7: "We launched last week — here's what happened."
3. Reach out to the PH newsletter team for a follow-up feature if you rank Top 5.
4. Add the PH badge to the website footer.
