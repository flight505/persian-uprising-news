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


You’re aiming at two hard problems at once:

1. **How do we still *receive* fresh information when the normal pipes are choked or cut?**
2. **How do we keep people from being manipulated (disinfo), without accidentally putting anyone in more danger?**

I’ll propose feature sets that directly serve “families abroad need up‑to‑date truth,” and I’ll be explicit about what I *won’t* recommend because it’s unsafe.

---

## Feature Set A: “Blackout resilient” information intake (how you keep receiving reports)

A web app can’t magically receive data from a *total* national shutdown — but in real life, “blackout” is often partial, intermittent, or bypassed by a minority of users (satellite, cross-border roaming, brief reconnect windows, circumvention tools, local mesh sharing, etc.). Your job is to design for **any** path that exists.

### A1) Tor-accessible intake + mirror (not just “users use Tor”)

**Add two Tor surfaces:**

* **Onion mirror** of your read-only “lite” site (news + snapshots)
* **Onion submission portal** for incident reports / tips

Tor onion services hide the service IP/location and provide end-to-end encryption by default; they’re also designed to be censorship-resistant *as long as Tor is reachable*. ([Support][2])

Practical UX features:

* A persistent “Open via Tor” link (and a short explainer)
* A **copyable onion URL** displayed as text and QR code
* A “Submission safety checklist” before upload (no faces, no names, no exact addresses, etc.)

If Tor itself is blocked, users often rely on Tor pluggable transports like **Snowflake** (volunteer proxies) to reach the Tor network. ([Support][3])
(You can link to official Tor guidance rather than reinvent it.)

### A2) “Offline packs” + file import/export (your most powerful blackout primitive)

This is the single biggest feature that helps *both* inside/outside users:

* Your backend periodically produces **signed “offline snapshot packs”**:

  * last 6h / 24h / 7d
  * lightweight JSON + optional compressed media
  * cryptographic signature so tampering is detectable

* Your app supports:

  * **Download pack** when online
  * **Import pack** from a file (AirDrop, WhatsApp, email, USB, Bluetooth share, etc.)
  * **Verify signature** and show “Authentic / Modified / Unknown publisher”

This is how you keep information moving when the transport layer is hostile.

### A3) Decentralized distribution of snapshots (IPFS as a mirror layer)

Publish those signed snapshot packs to **IPFS** as content-addressed objects (CID). IPFS content addressing (CIDs) means the same content can be fetched from many places and still verifies by hash. ([docs.ipfs.tech][4])

How it becomes useful:

* Diaspora volunteers “pin” the latest CID.
* Your app can try multiple public gateways (or your own gateways) to fetch the CID.
* The pack is still verified locally by signature.

Important caveat: IPFS is not a privacy tool by itself; treat published content as public. (That’s why you keep packs text-first and avoid sensitive PII by design.)

### A4) “Mesh relay mode” for the mobile app (Bluetooth/Wi‑Fi local sync)

To move *any* information during *true* internet blackouts, local device-to-device sync is one of the only remaining channels.

You do **not** need to build a full messenger. Add a focused feature:

* “Share latest offline pack to nearby devices” (Bluetooth / Wi‑Fi Direct)
* “Scan QR to import a micro‑snapshot” (for very small deltas)

This aligns with how apps like **Briar** and **Manyverse** approach blackouts:

* Briar explicitly supports communicating during blackouts via Bluetooth/Wi‑Fi (and uses Tor when internet is up). ([briarproject.org][5])
* Manyverse (SSB) supports offline-first sync between devices over Bluetooth/Wi‑Fi/Internet. ([NLnet Foundation][6])

You can also let power users “export as Briar/Manyverse-friendly text blocks” so diaspora relays can repost without friction.

### A5) Matrix/Nostr “relay channels” (for diaspora + redundancy)

Create an **official outbound feed** on decentralized/federated systems, so updates can fan out even if your domain is blocked:

* **Matrix room** (federated) for “official updates,” with E2EE optional depending on use-case. Matrix is designed for decentralized communication; E2EE is based on Olm/Megolm. ([Matrix][7])
* **Nostr** publisher that posts:

  * “Top verified updates”
  * the latest snapshot CID(s)
  * hash/signature fingerprints

Nostr is an open relay-based protocol designed for censorship-resistant publishing (users sign events with keys; relays can vary). ([GitHub][8])

Why this helps families abroad: even if your main site is down, they can still subscribe to these feeds and retrieve the snapshot pack through alternate mirrors.

---

## Feature Set B: OSINT you *should* build (event & narrative OSINT, not person-tracking)

Think of OSINT features in two buckets:

### B1) “Verification workbench” (internal/moderator-facing)

A protected dashboard that helps moderators verify claims safely:

* **Cross-source corroboration panel**
  “Same incident reported by X independent sources?”

* **Media dedupe + reuse detection**
  perceptual hashes to detect recycled videos/images

* **Time/location plausibility checks** (careful!)
  Only store/display **coarse geolocation publicly** (city/region). Keep fine details internal if needed.

* **Chain-of-custody**
  Every incident gets:

  * submit time
  * evidence attachments
  * reviewer notes
  * verification outcome + reason

This is OSINT that improves trust without enabling targeting.

### B2) “Source registry” (trust without doxxing)

Families abroad need to know *who/what to trust*.

Implement a source system that supports:

* “Verified source” badges **without revealing real identities**
* per-source “reliability history” (how often confirmed vs later retracted)
* “first seen” timestamps and provenance links

If you do allow “trusted correspondents,” do it with **key-based identity** (signing keys), not usernames/phone numbers.

---

## Feature Set C: Disinformation detection + “campaign explainer” pages

You want: *“people can click and see this is a disinformation campaign …”*
To do this responsibly, you need two layers:

1. **Detection:** identify suspicious coordinated behavior and false/unsupported claims
2. **Attribution:** only claim “state-run” when a credible public source has attributed it

### C1) Build a “Claims” system (atomic, reviewable units)

Instead of tagging whole articles as disinfo, track **claims**:

Each claim page shows:

* Claim text (in Persian + English)
* Status: Unverified / Disputed / False / True / Misleading
* Evidence list (sources, media, documents)
* “What would change our mind” (helps trust)
* Revision history (transparency)

### C2) Automated campaign signals (what you can compute)

This is where you borrow ideas from tools like BotSlayer/Hoaxy.

**BotSlayer** is explicitly built to detect potential manipulation/amplification on Twitter/X in real time. ([osome.iu.edu][9])
OSoMe also maintains open-source components for **Hoaxy**, which visualizes spread of claims and fact-checking. ([osome.iu.edu][10])

You can implement similar detectors in your pipeline (even if you don’t literally embed those apps):

**Coordination / amplification signals**

* bursty posting with near-identical text across many accounts
* synchronized repost timing
* unusual hashtag/link co-occurrence
* “many accounts, low organic engagement”

**Infrastructure signals**

* suspicious domains (lookalike “news” sites)
* repeated use of the same shortened links
* content farms reusing templates

**Narrative signals**

* cluster content into “narratives” using multilingual embeddings
* track narrative growth rate + cross-platform jumps (Telegram → X → sites)

### C3) “Disinformation Campaign” pages (what users see)

When a narrative is flagged, show:

* The narrative summary (“What’s being pushed”)
* Timeline of spread
* Top amplifying clusters (aggregate, not individual callouts)
* Similar past campaigns (if any)
* What’s verified / what’s not

### C4) Attribution: do it with receipts, or don’t do it

If you label something “Iranian government campaign,” you need *public, credible attribution*.

You can build your attribution library from:

* **Meta threat reporting / CIB takedowns** ([transparency.meta.com][11])
* **Microsoft Threat Analysis Center (MTAC) influence reports** (example: they describe Iranian cyber-enabled influence activity in election context) ([Microsoft][12])
* **OpenAI threat intelligence writeups** (example: “Disrupting a covert Iranian influence operation”) ([OpenAI][13])
* **Government sanctions / official statements** when they exist (example: U.S. Treasury sanctions included language about Iran/Russia disinformation campaigns) ([U.S. Department of the Treasury][14])

Product rule:

* If you have explicit third-party attribution: display “Attributed by X (link)”
* If you don’t: say “Suspected coordinated inauthentic behavior” (CIB) and show evidence, **without** naming an actor.

That keeps you credible and reduces legal/ethical risk.

---

## Feature Set D: Dashboards with live, useful metrics (families abroad + operators)

### D1) “Blackout & interference” dashboard (live context)

This is *hugely* valuable because it answers “why did updates stop?”

Integrate:

**IODA (outage detection)**

* outage events + summary via API ([api.ioda.inetintel.cc.gatech.edu][15])

**OONI (censorship measurements)**

* OONI API lets you search measurements and generate stats; it’s open data. ([OONI Docs][16])

**GRIP (routing incidents / suspicious hijacks)**

* Georgia Tech’s dashboard list explicitly pairs IODA with GRIP for routing incidents. ([inetintel on Notion][17])
* GRIP has a documented events API endpoint and parameters. ([GitHub][18])

Dashboard widgets:

* “Connectivity index (country + major ISPs/ASNs)”
* “Last observed outage event”
* “Routing anomaly count (24h)”
* “Censorship measurement spikes”

### D2) “Situation overview” dashboard (what families actually want)

Widgets that answer real questions fast:

* Verified incidents (24h / 7d)
* Reports by region (coarse)
* Arrests/injuries/casualties trend (only if verified carefully)
* “Newest verified update” timestamp
* “Top 3 emerging narratives”
* “Top 3 flagged disinfo narratives”

### D3) “Information integrity” dashboard (anti-disinfo control room)

For moderators/operators:

* number of new claims flagged
* top coordination clusters (aggregate)
* top reused media hashes
* verification queue SLA
* retractions/corrections count

---

## Feature Set E: “How do we get info during a blackout?” — the human + technical loop

The missing piece is usually not tech, it’s **a relay network**.

Build features that support a *diaspora relay program*:

### E1) Trusted Relay accounts (pseudonymous, key-based)

* A relay is a diaspora volunteer who has offline/phone contact with someone inside.
* They submit tips through your portal (clearnet or onion).
* Their submissions are signed by a relay key (reputation accrues to the key).

### E2) “Microtask verification”

Let diaspora volunteers help verify without seeing sensitive details:

* translate a report
* categorize it
* check if it duplicates another report
* match it to a location *at city level*

### E3) “Call for data” prompts tied to outages

When IODA indicates an outage spike, prompt:

* “If you have intermittent connectivity, submit a short text-only update.”
* “If you’re abroad and receiving direct calls, submit *what you can safely share*.”

---

## If you want a crisp build order

### Phase 1 (highest ROI)

* Signed offline snapshot packs + import/export
* Onion mirror + onion submission
* Lite mode + text-first delivery

### Phase 2

* Disinfo: Claims system + campaign pages + coordination signals
* Dashboards: IODA + OONI + GRIP integration

### Phase 3

* Decentralized distribution: IPFS CIDs + Nostr publisher + Matrix room
* Mobile mesh sharing of snapshot packs (Bluetooth/Wi‑Fi)

---

If you tell me your current backend constraints (where you can run long-lived services vs purely serverless, and whether you’re comfortable adding a small worker service for streaming ingestion + detection), I can map these features into a concrete architecture for your repo structure (data models, pipelines, and UI routes) — without drifting into anything that could endanger users.

[1]: https://github.com/HunxByts/GhostTrack "GitHub - HunxByts/GhostTrack: Useful tool to track location or mobile number"
[2]: https://support.torproject.org/tor-browser/features/onion-services/?utm_source=chatgpt.com "Onion services - Features - Tor Browser - Support"
[3]: https://support.torproject.org/anti-censorship/what-is-snowflake/?utm_source=chatgpt.com "What is Snowflake? - Anti-censorship - Support - Tor Project"
[4]: https://docs.ipfs.tech/concepts/content-addressing/?utm_source=chatgpt.com "Content Identifiers (CIDs) - IPFS Docs"
[5]: https://briarproject.org/how-it-works/?utm_source=chatgpt.com "How it works"
[6]: https://nlnet.nl/project/Manyverse/?utm_source=chatgpt.com "Manyverse"
[7]: https://matrix.org/docs/matrix-concepts/end-to-end-encryption/?utm_source=chatgpt.com "End-to-End Encryption implementation guide"
[8]: https://github.com/nostr-protocol/nostr?utm_source=chatgpt.com "Nostr - Notes and Other Stuff Transmitted by Relays"
[9]: https://osome.iu.edu/research/blog/botslayer?utm_source=chatgpt.com "BotSlayer tool to expose disinformation networks"
[10]: https://osome.iu.edu/resources/open-source?utm_source=chatgpt.com "Open Source - Observatory on Social Media - Indiana University"
[11]: https://transparency.meta.com/metasecurity/threat-reporting/?utm_source=chatgpt.com "Meta's threat disruptions"
[12]: https://www.microsoft.com/en-us/security/security-insider/threat-landscape/iran-steps-into-us-election-2024-with-cyber-enabled-influence-operations?utm_source=chatgpt.com "Iran's Cyber Influence on the 2024 US Election"
[13]: https://openai.com/index/disrupting-a-covert-iranian-influence-operation/?utm_source=chatgpt.com "Disrupting a covert Iranian influence operation"
[14]: https://home.treasury.gov/news/press-releases/jy2766?utm_source=chatgpt.com "Treasury Sanctions Entities in Iran and Russia That ..."
[15]: https://api.ioda.inetintel.cc.gatech.edu/v2/?utm_source=chatgpt.com "IODA HTTP API"
[16]: https://docs.ooni.org/data?utm_source=chatgpt.com "Accessing OONI data"
[17]: https://inetintel.notion.site/Dashboards-2b132433c5384853a7dad3a9c8d03e58?pvs=21 "Dashboards | Notion"
[18]: https://github.com/InetIntel/grip-api-legacy/blob/master/api-spec.md?utm_source=chatgpt.com "grip-api-legacy/api-spec.md at master"

