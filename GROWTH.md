# Wykta — Go-to-Launch & Growth Strategy

This document covers the **7-day launch sprint** to grow Wykta from 0 to 10,000+ active users,
the UX improvements needed to keep them, and the referral / community mechanics
to make growth self-sustaining.

---

## Table of contents

1. [User acquisition targets](#user-acquisition-targets)
2. [Phase 0 — Foundation (Day −1, before launch)](#phase-0--foundation-day--1-before-launch)
3. [Phase 1 — Launch day (Day 0)](#phase-1--launch-day-day-0)
4. [Phase 2 — Momentum (Days 1–4)](#phase-2--momentum-days-14)
5. [Phase 3 — Retention & monetisation (Days 5–7+)](#phase-3--retention--monetisation-days-57)
6. [UX roadmap](#ux-roadmap)
7. [Referral & virality mechanics](#referral--virality-mechanics)
8. [Key metrics to track](#key-metrics-to-track)
9. [Channel-specific playbooks](#channel-specific-playbooks)

---

## User acquisition targets

All targets are measured within the **first 7 days** post-launch.

| Milestone | Day | KPI |
|-----------|-----|-----|
| 100 confirmed community members | Day 1 | email list |
| 500 confirmed community members | Day 3 | email list |
| 1,000 unique users | Day 3 | UV (GA4) |
| 5,000 unique users | Day 5 | UV |
| 10,000 unique users | Day 7 | UV |
| 35% first-scan conversion | Day 1 | scans / UV |
| 20% return-visit rate | Day 3–7 | returning users |
| 8% email subscription conversion | Day 1+ | community_members / UV |
| 1% free-to-pro conversion | Day 5–7 | subscriptions / UV |

---

## Phase 0 — Foundation (Day −1, before launch)

Complete these **the day before** any marketing begins:

- [ ] All 4 languages fully translated (including footer links — done in this PR).
- [ ] Email OTP double-opt-in live for community form (done in this PR).
- [ ] Privacy policy and Terms of Service pages complete and linked.
- [ ] Mobile app (iOS TestFlight + Android Internal Testing) published for early access.
- [ ] Analytics configured: GA4 or Plausible capturing `analyze`, `scan`, `community_join` events.
- [ ] Stripe webhook live; payment-success email sending confirmed.
- [ ] Domain decided and canonical URL consistent across all pages (done in this PR).
- [ ] All 5 launch-channel posts drafted and ready to publish simultaneously on Day 0.

---

## Phase 1 — Launch day (Day 0)

Fire all channels **at the same moment** (12:01 AM PST if targeting Product Hunt):

### Launch channels (simultaneous)

**1. Product Hunt**
- Prepare a launch post with a GIF demo: open app → scan label → get warnings.
- Schedule for Tuesday/Wednesday 12:01 AM PST for maximum exposure.
- Ask your network for upvotes in the **first 2 hours** (critical for front-page ranking).
- Respond to every comment within the hour — stay live all day.

**2. Reddit**
- Post simultaneously to r/SkincareAddiction, r/CleanEating, r/nutrition, r/vegan, r/China.
- Title formula: "I built a free tool that tells you exactly what's in your skincare —
  powered by AI + open ingredient databases."
- Write a real post explaining the problem; do NOT just drop a link.
- Reply to every comment within 30 minutes while the post is hot.

**3. 小红书 (Xiaohongshu / RedNote) — ZH market**
- Publish the first post on Day 0: product intro with scan demo video.
- Use hashtags: #成分控 #敏感肌 #护肤成分 #食品成分 #纯素.
- Pre-arrange one CN skincare KOL (小红书 博主, 5k–50k followers) to post their review
  on the same day.

**4. GitHub / Dev communities**
- Submit to Hacker News "Show HN" on Day 0.
- Post on GitHub Discussions simultaneously.
- Have the DEV.to / Hashnode technical post ("How we built a multilingual AI ingredient
  scanner with Supabase Edge Functions + Tesseract.js") scheduled to go live on Day 0.

**5. Discord communities**
- Post in skincare, health, and food-focused Discord servers on Day 0.
- Message: "free tool, no account needed, 4 languages — just shipped."

---

## Phase 2 — Momentum (Days 1–4)

### Day 1 — Ride the wave
- Reply to all overnight Product Hunt / Reddit / HN comments.
- Post a "Day 1 numbers" update in Discord and Twitter/X (builds credibility fast).
- Publish 小红书 post #2: "I tested 5 popular skincare products — here's what AI found."
- Send the Day-0 welcome email to everyone who signed up overnight.

### Day 2 — Content push
- Publish 小红书 post #3: "How to read ingredient labels like a pro."
- Post the first 10 SEO ingredient pages (retinol, SLS, parabens, etc.) — even stubs
  are enough to start indexing.
- Reach out to 5 micro-influencers (10k–100k followers) with a Pro access code offer.

### Day 3 — Community activation
- Send the Day-3 educational email: "5 ingredients to avoid in sunscreen."
- Run the first community poll: "Which ingredient should we add next?" (Discord + GitHub).
- Repost the best user scan result with their permission (social proof).

### Day 4 — SEO & influencer follow-up
- Publish 20 more ingredient pages (target 30 total by end of Day 4).
- Follow up with influencers who haven't responded — offer a 30-second Loom demo.
- Post TikTok / 抖音 video #1: "Scanning [popular product] — what does the AI say?"
  (CN market: 抖音 first; EN/FR/DE: Instagram Reels).

### SEO content strategy (start Day 2, grow through Day 7)

Create a content hub at `/ingredients/` with individual pages for high-traffic risky ingredients:

- `/ingredients/retinol` — "Is retinol safe? Who should avoid it?"
- `/ingredients/sodium-lauryl-sulfate` — "SLS: what you need to know"
- `/ingredients/parabens` — "Are parabens dangerous?"

Each page should:
- Target `"{ingredient} skincare safety"` / `"{ingredient} side effects"` keywords.
- Include the Wykta scanner widget inline.
- Link to the community page and app download.

Target: 30 ingredient pages by Day 7, 200 pages in the following month.

### KOL / influencer outreach (start Day 2)

Target micro-influencers (10k–100k followers) in:
- Skincare / clean beauty (EN, FR, DE markets)
- Food sensitivity / allergy (EN market)
- 成分党 / 护肤 (ZH market)

Offer: free Pro subscription in exchange for an honest review post.
Budget: 0 cash, 5–10 Pro annual codes (< $300 value).
Goal: at least 2 influencer posts live by Day 5.

---

## Phase 3 — Retention & monetisation (Days 5–7+)

### Day 5 — Upgrade push
- Send the Day-5 email: soft upgrade prompt — "Unlock unlimited AI scans + PDF export."
- Enable the referral mechanic (see below) so early adopters can invite friends.
- Post TikTok / 抖音 video #2.

### Day 6 — Social proof & virality
- Compile a "Day 5 stats" post: total scans, top ingredients found, top warning triggers.
- Share publicly on all channels — transparency builds trust fast.
- Activate the "7-day ingredient cleanse challenge" (see Referral section).

### Day 7 — Review & iterate
- Send the Day-7 email: "1 week in — here's what we found + what's next."
- Publish a public retro on GitHub Discussions / DEV.to: what worked, what didn't.
- Set the next 7-day sprint targets based on actual data.

### Email nurture sequence (triggered by community sign-up)

1. **Day 0** — Welcome email with "your first scan" guide (3 steps + GIF).
2. **Day 1** — "5 ingredients to avoid in sunscreen" (educational, value-first).
3. **Day 3** — Social proof: "10,000 scans done in 3 days — what we found."
4. **Day 5** — Soft upgrade prompt: "Unlock unlimited AI scans + PDF export."
5. **Day 7** — Changelog: what shipped this week + invite to Discord.

### Daily public changelog

Post a short "What we shipped today" update every day during the launch sprint:
- GitHub Releases (tag each day's fixes)
- Discord #announcements
- Twitter/X @wykta_app

This builds trust, shows momentum, and re-engages users from the launch day.

### In-app upgrade nudges (non-intrusive)

- After 5 free AI analyses: show the free-tier limit banner (already implemented).
- After 3rd scan on a given day: show a soft upgrade tip at the bottom of results.
- On PDF export button click (Pro feature): show modal with upgrade CTA.

---

## UX roadmap

### Phase 1 UX (Day 0) — reduce friction before launch

| Item | Status | Priority |
|------|--------|----------|
| Actionable error messages (OCR fail, AI fail) | ✅ Done | P0 |
| Footer links translated in all 4 languages | ✅ Done | P0 |
| OTP verification for community join & subscription lookup | ✅ Done | P0 |
| Camera permission denied: show "paste instead" fallback CTA | Backlog | P1 |
| Onboarding tooltip for first-time users (3-step highlight tour) | Backlog | P1 |
| Empty-state improvement: sample ingredient text pre-filled | Backlog | P2 |

### Phase 2 UX (Days 2–5) — personalisation

| Item | Priority |
|------|----------|
| User allergen profile (set once, flag matches on every scan) | P1 |
| Scan history (last 10 scans stored in localStorage) | P1 |
| Share result as a card image (Web Share API / clipboard) | P1 |
| Language preference saved permanently (already done via localStorage) | ✅ Done |

### Phase 3 UX (Days 6–7 and beyond) — depth & trust

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

**Activate on:** Day 5 (after initial user base is established).

### 7-day ingredient cleanse challenge

- Users commit to "7 days of reading every label before buying."
- Each day they post their scan result to social (badge system).
- On day 7 they unlock a "Clean Consumer" badge and a discount code for Pro.
- Launch on Day 6 of the sprint; first cohort completes the challenge 7 days later.

### Community voting on ingredient database

- Daily poll during launch week: "Which ingredient should we add next?"
- Community votes on GitHub Issues or Discord.
- Winning ingredient gets a deep-dive post the next day.
- Drives daily return visits and GitHub stars throughout the sprint.

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

### Retention metrics — check daily during sprint

- **Day 1 retention**: users who return within 24 h of first visit. Target > 30%.
- **Day 3 retention**: return within 3 days. Target > 20%.
- **Day 7 retention**: return within 7 days. Target > 15%.

---

## Channel-specific playbooks

### Discord community management

1. Create channels: `#announcements`, `#scan-results`, `#ingredient-questions`,
   `#product-suggestions`, `#off-topic`.
2. Post a welcome message explaining the community rules and how Wykta works.
3. Pin a "suggest a feature" thread — monitor it **daily** during the sprint.
4. Run a daily "Scan of the day" where the team reviews a community-submitted scan.

### WeChat — CN market

1. Create a WeChat Official Account (订阅号 for content, 服务号 for interactive features).
2. Post daily during launch week: ingredient safety tip in Chinese.
3. Integrate WeChat Login / sharing for the mobile app (Phase 3).
4. Partner with 成分党 WeChat groups (reach: 500–5,000 members each).

### Product Hunt aftercare

After the launch day peak:
1. Reply to all comments within 24 hours.
2. Post a Day-3 update: "3 days in — here's what happened."
3. Post a Day-7 update: "1 week in — [stats] + what's next."
4. Reach out to the PH newsletter team for a follow-up feature if you rank Top 5.
5. Add the PH badge to the website footer.

