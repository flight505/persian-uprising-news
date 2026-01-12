 I went through both the live site and the repo. Here’s what I can see you already have, and what I’d do next if the goal is “people can still get trustworthy, useful updates even when connectivity is hostile or intermittent.”

## What you have today (and what it implies)

From the repo README, the project is already aiming at the right primitives for crisis comms: **PWA + offline support + push + real-time updates + map + crowdsourced incident reporting**, backed by **serverless aggregation and DynamoDB**.

From the live site I can access:

* `/map` has incident filters (all/protests/arrests/injuries/casualties/other), verified/unverified legend, and a heatmap toggle.
* `/report` has an anonymous incident report flow with rate limiting and optional image upload.
* The home page is very **client-rendered** (a non-JS view just shows “Loading news…” and “Loading filters…”).

That last point matters a lot for blackouts/low bandwidth: if the initial HTML is mostly empty, you lose:

* link previews (sharing),
* SEO discoverability,
* accessibility tooling,
* and “works when JS/CDN/script fetches are flaky.”

So, the most impactful upgrades are less about “more features” and more about: **(1) trust + (2) offline survivability + (3) multi-channel distribution + (4) safety.**

---

## North Star: Make it work in three connectivity modes

Think of your system as having to operate in *tiers*:

### Tier A — Normal internet

Full UI, images, live updates (SSE), interactive map.

### Tier B — Degraded internet (throttling, partial blocks, mobile-only, high latency)

A “lite” experience must still work:

* text-first feed,
* minimal images (or none),
* explicit “last successful sync” timestamp,
* predictable refresh behavior and backoff.

### Tier C — Near-total blackout (no reliable access from inside)

You can’t “web-app” your way out of this, but you *can* design **content packages** and **redundant distribution** so that *when* any path exists (brief reconnection, diaspora relays, physical transfer), the app can ingest and display information safely.

The rest of this answer is basically how to implement Tier B/C without turning the project into something dangerous or brittle.

---

## 1) Trust and “situational awareness” features (what people need most)

Right now, you aggregate from Perplexity, X/Twitter (via Apify), and Telegram, and you already have a verified/unverified concept on the map.
To make this a *lifeline*, the app needs to clearly answer:

* **What happened?**
* **Where?**
* **How confident are we?**
* **What’s the primary source?**
* **What changed since yesterday?**
* **What should I ignore because it’s unverified/rumor?**

Concrete product additions:

### A. “Situation Now” strip (top of Home + Map)

A pinned, always-visible module with:

* **Last update time**
* **Connectivity status (best-effort)**
* **Top 3 verified developments** (24h)
* **Safety note** (don’t share identifiable info, etc.)

This reduces cognitive load when people open the app in a panic.

### B. Provenance-first article cards

Every item should show:

* source type (Telegram channel / journalist / org / etc.)
* a direct link (when safe/available)
* timestamp + timezone handling
* “why it’s in your feed” tags (location/topic)

### C. Confidence scoring that’s explainable

Avoid opaque “AI says it’s true.” Instead, show *why*:

* multiple independent sources match,
* photo/video present (with metadata stripped),
* location corroborated,
* or it’s unverified (single report).

### D. “Rumor control / corrections” page

In crises, misinformation kills trust faster than outages do. Have a simple page that:

* lists retractions/corrections,
* explains what changed and why.

### E. Moderator workflow (even if tiny)

Your README mentions AI moderation for spam detection.
Add a human review queue:

* “pending verification”
* “needs more evidence”
* “verified”
* “rejected (spam/unsafe)”
* audit trail

This can be a lightweight protected route or a separate admin UI.

---

## 2) Dashboards that actually help (public + internal)

You asked for dashboards: I’d do **two kinds**:

### Public dashboards (for situational awareness)

These can live under `/dashboard`:

1. **Incident timeline**

* counts by day/hour
* breakdown by type (protest/arrest/injury/casualty/other)
* verified vs unverified trend

2. **Geography overview**

* heatmap summary
* “top 10 cities/regions by reports”
* trend arrows (up/down vs previous day)

3. **Source coverage**

* how many items came from each channel type
* “silent gaps” detection (e.g., if Telegram ingestion stops)

4. **Connectivity / shutdown indicators**
   Instead of guessing, integrate known monitoring projects and show them side-by-side:

* **IODA** (Internet Outage Detection and Analysis) monitors macroscopic outages and offers dashboards/APIs. ([ioda.inetintel.cc.gatech.edu][1])
* **OONI** provides censorship measurement data and tools/datasets. ([OONI][2])
* **Access Now #KeepItOn / STOP** documents and contextualizes shutdown cases globally. ([Access Now][3])

A dashboard that shows “connectivity degraded” + “reports rising” can be incredibly important contextually, and it helps users understand why updates might be delayed.

Also: consider using multiple sources and being transparent about methodology—NetBlocks is widely cited, but has faced criticism around transparency and past measurement practices, so don’t rely on any single monitor for credibility. ([WIRED][4])

### Internal dashboards (for operations)

These protect your system and your users:

* ingestion health (Perplexity/X/Telegram success rate)
* dedupe rate
* moderation queue size and SLA
* push notification delivery success/failure
* cost guardrails (you already track cost targets in the README)

---

## 3) The “blackout survival” design pattern: Signed offline snapshots

This is the biggest structural improvement I’d make.

### Why

If users can’t reach your servers, the app must still be useful. Your README already mentions offline support and an IndexedDB wrapper.
Take it one step further: ship **content snapshots**.

### What it looks like

* A snapshot is a small bundle:
  `snapshot.json` (articles/incidents metadata + text)

  * optional `images/` (compressed)
  * `signature` (cryptographic signature)

* The app supports:

  * **Download latest snapshot** when connectivity exists
  * **Import snapshot** from a file (shared through any means)
  * **Verify signature** (so users know it’s authentic and unmodified)

### Why signatures matter

In a blackout, people will pass files around. You need a way to say:

> “This snapshot was published by the project and hasn’t been tampered with.”

That’s a practical anti-disinformation measure that doesn’t depend on live internet.

### How to integrate with your existing stack

* Add a scheduled job (could be Lambda) that generates snapshots periodically:

  * “last 6 hours”
  * “last 24 hours”
  * “last 7 days”

* Store snapshots in cheap, cacheable object storage (or even multiple CDNs).

* Serve them with extreme cache friendliness:

  * gzip/brotli
  * immutable URLs (content-addressed naming is ideal)

### UX win

Add a “✅ Offline pack ready” indicator and a “Share pack” button.

This turns your app into something that still works when the network turns hostile.

---

## 4) Make the app “usable without JS” (progressive enhancement)

Right now, the non-JS view of the homepage is basically a loader.
In crisis conditions, that’s a failure mode you can eliminate.

### The goal

Your first page render should include:

* latest N headlines (text)
* last updated time
* a link to the map
* a link to “download/update offline pack”

Even if the full interactive feed loads later, the initial HTML must carry essential information.

### In Next.js terms

* Server-render the initial feed (even if it’s just 20 items)
* Then hydrate into your rich UI
* Also provide a `/lite` route that is aggressively minimal

This will also improve shareability and performance across the board.

---

## 5) Map improvements that matter in the real world

You already have a strong base (filters + verified/unverified legend + heatmap toggle).
In practice, here’s what tends to matter:

### A. Privacy-preserving location

For crowdsourced/unverified:

* store exact location if provided, but display at **coarser precision** (e.g., neighborhood/city-level) until verified
* allow reporters to submit “approximate location” intentionally

This reduces risk to reporters and bystanders.

### B. Offline map behavior (careful!)

Offline tiles are tricky: downloading/caching lots of OpenStreetMap tiles can violate usage rules if done irresponsibly. OSM’s tile policy explicitly emphasizes honoring cache headers and keeping a sufficient cache rather than forcing re-downloads. ([OSMF Operations][5])

So:

* cache *viewed* tiles (respect caching headers)
* consider using a paid tile provider or self-hosted tiles if usage spikes
* in blackout mode, allow a “no basemap” fallback (just points on a blank grid) so the map still conveys information

### C. Evidence attachment workflow

You allow up to 3 images on reports.
Add automatic safety measures:

* strip EXIF metadata server-side
* blur faces/license plates (optional, even basic)
* warn users *before* upload about identifiable content

---

## 6) Safety, privacy, and threat model (this is non-negotiable)

You’re handling politically sensitive incident reporting. “Anonymous reporting” is good as a statement, but the implementation details are where safety lives.

Key upgrades:

### A. Minimize logs and identifiers

* avoid storing raw IPs (even for rate limiting)
* consider privacy-preserving rate limit approaches (hash + rotate, short retention)
* be explicit in a “Privacy & Safety” page

### B. A “Safety Mode” UI

Features like:

* quick clear local cache (“panic wipe”)
* “hide images” toggle
* “text-only mode”
* “don’t auto-download media on cellular”

This is about reducing user risk and bandwidth.

### C. Don’t reinvent digital security guidance

Link out to reputable, maintained resources:

* Access Now’s 24/7 Digital Security Helpline ([Access Now][6])
* EFF Surveillance Self-Defense (security planning + tooling concepts) ([Electronic Frontier Foundation][7])
* Security in-a-Box (practical activist-focused guidance) ([Tactical Tech][8])

This avoids you publishing brittle “how-to” advice that could become unsafe.

---

## 7) Multi-channel distribution: don’t bet on a single pipe

Even if the web app is perfect, a blackout can make it unreachable. The resilience play is **redundancy**.

What I would add:

### A. Public feeds: RSS + JSON + GeoJSON

Your roadmap already mentions RSS and exports.
Do it early. It enables:

* diaspora mirrors
* journalists
* other apps
* backups

### B. Mirror strategy (operational, not just technical)

* multiple domains / hosting
* static mirrors of “lite” mode + snapshots
* clear instructions for volunteers on mirroring (without collecting user data)

### C. Email digest + printable view

In many shutdown scenarios, some channels survive or return intermittently. An email digest is also a diaspora tool (families outside can stay updated and relay info).

### D. “Shareable cards”

Generate a “small image + text” summary card for the top 3 verified updates (for social sharing when possible). This helps information propagate when people have *some* access.

---

## 8) A concrete “next 2–4 weeks” build plan (prioritized)

### P0 — Make the app dependable under stress

* SSR the homepage feed (even minimal)
* Add `/lite` route (no images, minimal JS)
* Add “last updated / last synced” indicators
* Add snapshot generation + download
* Add snapshot signature verification

### P1 — Turn it into situational awareness, not just a feed

* `/dashboard` with timeline + geo + source coverage
* connectivity dashboard using IODA/OONI/STOP data sources
* rumor/corrections page
* moderator queue

### P2 — Safety hardening + usability polish

* EXIF stripping + safer media handling
* privacy review: logs, analytics, rate limiting
* Persian/English RTL/LTR polish (already on roadmap)
* accessibility + low-bandwidth performance budgets

---

## One important reality check about “getting through” full shutdowns

A **total** national shutdown means users inside may have *no path* to your servers. The best you can do is:

* make the app extremely good in **degraded and intermittent** connectivity,
* and support **signed offline content packages** that can be moved through whatever limited channels exist.

That’s why I’m pushing snapshots + signatures so hard: it’s the closest you can get to “works without internet” while still protecting integrity.

---

* [Reuters](https://www.reuters.com/business/media-telecom/digital-blackout-hits-tehran-other-parts-iran-netblocks-says-2026-01-08/?utm_source=chatgpt.com)
* [The Wall Street Journal](https://www.wsj.com/livecoverage/iran-israel-conflict-news/card/iran-s-internet-has-been-offline-for-more-than-12-hours-x4VcNOrmg1Tp3MQc1cud?utm_source=chatgpt.com)
* [WIRED](https://www.wired.com/story/netblocks-internet-shutdowns?utm_source=chatgpt.com)

[1]: https://ioda.inetintel.cc.gatech.edu/?utm_source=chatgpt.com "IODA (Internet Outage Detection - Georgia Tech"
[2]: https://ooni.org/?utm_source=chatgpt.com "OONI: Open Observatory of Network Interference | OONI"
[3]: https://www.accessnow.org/guide/shutdown-tracker-optimization-project/?utm_source=chatgpt.com "Tracking internet shutdowns: Our STOP methodology"
[4]: https://www.wired.com/story/netblocks-internet-shutdowns?utm_source=chatgpt.com "How the internet censorship world turned on NetBlocks"
[5]: https://operations.osmfoundation.org/policies/tiles/?utm_source=chatgpt.com "Tile Usage Policy"
[6]: https://www.accessnow.org/help/?utm_source=chatgpt.com "Digital Security Helpline"
[7]: https://www.eff.org/pages/surveillance-self-defense?utm_source=chatgpt.com "Surveillance Self-Defense"
[8]: https://tacticaltech.org/projects/security-in-a-box/?utm_source=chatgpt.com "Security In-a-box"
