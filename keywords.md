Below is an updated, **global-first** topic/keyword system that:

* Prioritizes **what’s happening right now in Iran**
* Captures **statements from leaders worldwide** (and separates “official Iran” vs “international reaction” vs “opposition/diaspora”)
* **Explicitly tracks Reza Pahlavi** (son of the Shah) as its own entity feed
* Tracks **global support/solidarity demonstrations worldwide** (Denmark included, but not Denmark-centric)
* Maximizes coverage **without UI overlap** by using **multi-tagging + dedupe** rather than trying to make queries mutually exclusive

I’m writing this for the **Perplexity Search API** (POST `/search`) and using its real filtering knobs: multi-query, recency, language, domain filters, country, and date filters. ([Perplexity][1])

---

## The “no-overlap” trick: high recall in retrieval, strict dedupe in presentation

Instead of attempting “non-overlapping queries” (which always misses stuff), do:

1. **Run multiple intent-specific feeds** (they WILL overlap)
2. **Dedupe by canonical URL + title similarity**
3. Store one item, attach **multiple topic tags**
4. In “Top/Now” feeds: show each item once; in topic feeds: show it under all relevant tags

That gives you **max recall** + **minimal user-visible duplicates**.

Also: the Search API allows `query` to be either a single string or a **list of queries** for multi-query search. ([Perplexity][1])
So you can treat each topic as a **bundle** of 4–10 “sub-queries” (different phrasings, languages, sub-intents) in one call.

---

## Filters you’ll actually use for real-time feeds

* `search_recency_filter`: `"day" | "week" | "month" | "year"` (e.g., “day” = past 24h). ([Perplexity][1])
* `search_language_filter`: up to **10** ISO 639-1 language codes. ([Perplexity][1])
* `search_domain_filter`: up to **20** domains; allowlist or denylist (prefix `-`), but not both modes at once. ([Perplexity][1])
* `country`: country code filter (useful for slicing if you want). ([Perplexity][1])
* Exact date ranges: `search_after_date`, `search_before_date` plus “last updated” filters. ([Perplexity][1])

> If you’re using **Sonar Chat Completions** instead of Search API, note the date filter naming differs (e.g., `search_after_date_filter`). ([Perplexity][2])

---

## Updated global-first topic pack (Iran + leaders + global solidarity)

Below is a **config-style** list you can paste into your system and tweak.

### Suggested domain sets (optional but very effective)

> Domain filtering is optional; include it if you want higher precision. Max 20 domains per request. ([Perplexity][1])

```yaml
domain_sets:
  news_tier1:
    - reuters.com
    - apnews.com
    - bbc.com
    - theguardian.com
    - aljazeera.com
    - france24.com
    - dw.com
    - euronews.com
    - ft.com
    - bloomberg.com
    - washingtonpost.com
    - nytimes.com
    - economist.com
    - cnn.com
    - npr.org
    - cbc.ca
    - abc.net.au
    - politico.com
    - timesofisrael.com
    - haaretz.com

  official_statements:
    - un.org
    - europa.eu
    - consilium.europa.eu
    - ec.europa.eu
    - whitehouse.gov
    - state.gov
    - gov.uk
    - gouvernement.fr
    - bundesregierung.de
    - auswaertiges-amt.de
    - pm.gc.ca
    - canada.ca
    - nato.int
    - who.int

  iran_watchers:
    - iranintl.com
    - al-monitor.com
    - rferl.org
    - hrw.org
    - amnesty.org
    - icg.org
```

---

## 1) Global top feeds (keep these broad; dedupe downstream)

```yaml
topics:
  - id: top.breaking_global
    recency: day
    languages: [en]
    domain_set: news_tier1
    queries:
      - "breaking news developing story live updates"
      - "urgent developing situation statement announced today"
      - "latest global crisis escalation ceasefire talks sanctions"
```

Why: this is your high-recall “pulse” feed.

---

## 2) Iran: what’s happening now (events, protests, unrest, crackdowns)

This is the **core priority** you asked for.

```yaml
  - id: iran.now
    recency: day
    languages: [en, fa]
    domain_set: news_tier1
    queries:
      - "Iran protests unrest clashes crackdown live updates"
      - "Iran internet shutdown blackout curfew security forces"
      - "Tehran protests nationwide demonstrations Iran"
      - "اعتراضات ایران تظاهرات سرکوب قطع اینترنت"
      - "تجمع اعتصاب در ایران خبر فوری"
```

Notes:

* Using `fa` boosts chance of early/local reporting; keep it if your pipeline can handle it. (Language filters support up to 10 codes.) ([Perplexity][1])

---

## 3) Iran: official state leadership statements (inside Iran)

This is **separate** from “events” because it lets you build a clean “Statements” UI.

```yaml
  - id: iran.statements_official
    recency: day
    languages: [en, fa]
    domain_set: news_tier1
    queries:
      - "Iran Supreme Leader statement said warned vowed"
      - "Khamenei statement Iran protests"
      - "Iran president statement protests unrest"
      - "Iran foreign ministry statement spokesperson said"
      - "IRGC statement Basij statement Iran unrest"
      - "بیانیه رهبر ایران اعتراضات"
      - "اظهارات رئیس جمهور ایران درباره اعتراضات"
      - "بیانیه سپاه پاسداران درباره ناآرامی"
```

Tip: this feed is *super taggable* by extracting the speaker (“Supreme Leader”, “Foreign Minister”, etc.).

---

## 4) Iran: opposition/diaspora leadership statements (explicitly includes the son of Shah)

```yaml
  - id: iran.statements_opposition_diaspora
    recency: day
    languages: [en, fa]
    domain_set: news_tier1
    queries:
      - "Iran opposition leader statement exile diaspora calls on protesters"
      - "Iranian diaspora leaders statement transition plan"
      - "رضا پهلوی پیام اعتراضات"
      - "رهبران مخالف جمهوری اسلامی در تبعید بیانیه"
```

---

## 5) Dedicated entity feed: Reza Pahlavi (son of the Shah)

This guarantees you don’t miss him even when articles don’t contain your generic “Iran protest” keywords.

```yaml
  - id: entity.reza_pahlavi
    recency: week
    languages: [en, fa]
    domain_set: news_tier1
    queries:
      - "Reza Pahlavi statement Iran protests"
      - "Crown Prince Reza Pahlavi calls on protesters"
      - "son of the Shah Reza Pahlavi Iran"
      - "exiled crown prince Pahlavi Iran"
      - "رضا پهلوی ولیعهد پیام"
      - "پسر شاه ایران رضا پهلوی"
```

Why week instead of day: you’ll still catch daily spikes, but you won’t miss multi-day interviews/profiles.

(He’s actively being covered right now in relation to protests, so this feed will stay “hot”.) ([Reuters][3])

---

## 6) World leaders + international institutions: statements *about Iran*

This is the “global leaders around the world” requirement, anchored to Iran to keep it relevant.

```yaml
  - id: leaders.world_statements_on_iran
    recency: day
    languages: [en]
    domain_set: official_statements
    queries:
      - "statement on Iran protests"
      - "joint statement on the situation in Iran"
      - "condemn killing of protesters Iran statement"
      - "sanctions announced Iran crackdown statement"
      - "UN Secretary-General statement Iran"
      - "EU statement Iran protests"
      - "White House statement Iran protests"
      - "foreign ministry statement Iran unrest"
```

Run it with **official_statements** domains to collect primary sources, then optionally run a second copy with `news_tier1` domains for coverage/analysis.

Example: government “joint statements” are often posted as press releases. ([Canada][4])

---

## 7) Global support demonstrations (solidarity rallies) — worldwide, Denmark included

This is the corrected version of what I previously made too Denmark-heavy.

### A) Generic global solidarity protests (all causes)

```yaml
  - id: protests.solidarity_global
    recency: day
    # Up to 10 languages allowed; pick the set that fits your audience
    languages: [en, fr, de, es, it, pt, ar, fa, sv, da]
    queries:
      - "solidarity rally support demonstration march"
      - "solidarity protest held in city centre thousands rally"
      - "support rally outside embassy consulate demonstration"
      - "manifestation solidarité rassemblement de soutien"
      - "Solidaritätsdemonstration Kundgebung Unterstützung"
      - "manifestación de apoyo marcha solidaridad"
      - "manifestação de apoio marcha de solidariedade"
      - "تجمع حمایتی راهپیمایی حمایت همبستگی"
      - "مظاهرة تضامن تجمع دعم"
      - "støttedemonstration solidaritetsdemonstration demonstration støtte"
```

Why this works:

* It includes Danish (“støttedemonstration”, “solidaritetsdemonstration”) but only as one language slice among many.
* “Embassy/consulate” is a strong global signal for support rallies (often diaspora events).

(Language filter mechanics + limits are documented. ([Perplexity][5]))

### B) Global solidarity protests specifically *for Iran*

```yaml
  - id: protests.solidarity_for_iran_global
    recency: day
    languages: [en, fr, de, sv, da, fa]
    queries:
      - "solidarity with Iran protest rally demonstration"
      - "protest outside Iranian embassy solidarity with protesters in Iran"
      - "support Iranian protesters rally march"
      - "manifestation de soutien à l'Iran protestations"
      - "Solidarität mit Iran Demonstration iranische Botschaft"
      - "støtte til iranske demonstranter demonstration ved iransk ambassade"
      - "همبستگی با مردم ایران تجمع اعتراضی خارج از کشور"
```

This cleanly captures “support demonstrations around the world” as a distinct *event layer* (great for maps), while your `iran.now` feed captures domestic events inside Iran.

Recent coverage is already emphasizing protests outside Iranian embassies and global solidarity actions, so this feed should populate well. ([The Guardian][6])

---

## 8) Optional: “Embassy/consulate incidents” micro-feed (very map-friendly)

If you’re doing maps, this is surprisingly useful.

```yaml
  - id: events.embassy_consulate_incidents
    recency: day
    languages: [en]
    domain_set: news_tier1
    queries:
      - "embassy protester arrested demonstration outside embassy"
      - "consulate protest clash police outside consulate"
      - "flag lowered embassy protest"
```

---

## Implementation notes to reduce duplicates further

* Use `search_recency_filter="day"` for **Now/Protests/Statements** feeds. ([Perplexity][1])
* Use `max_results` strategically (Search API supports 1–20). ([Perplexity][1])
* If you want less junk for protest feeds, consider domain denylisting for social spam (example shows using `-reddit.com` style). ([Perplexity][7])
* Consider two passes per key feed:

  * **Pass A (precision):** domain allowlist = tier1/official
  * **Pass B (recall):** no domain filter (or a larger “watchers” set)
    Then dedupe.

---

## Small sanity check: this is the kind of “Iran + Pahlavi + global protests” content your feeds should catch

These are examples from the last 24h showing (a) Reza Pahlavi coverage and (b) global protests outside embassies—exactly what your updated feeds target. ([Reuters][3])

* [Reuters](https://www.reuters.com/world/middle-east/son-irans-toppled-shah-seeks-role-protests-expand-2026-01-11/?utm_source=chatgpt.com)
* [The Guardian](https://www.theguardian.com/world/2026/jan/10/protester-pulls-down-national-flag-from-iranian-embassy-in-london?utm_source=chatgpt.com)

---

If you tell me roughly how many total feeds you want to run per minute/hour (API budget), I can compress this into a **minimal query set** (e.g., 8–12 calls) while still keeping strong coverage on:

* Iran events
* Iran official statements
* International statements
* Reza Pahlavi
* Global solidarity protests (including Denmark)

[1]: https://docs.perplexity.ai/api-reference/search-post "Search - Perplexity"
[2]: https://docs.perplexity.ai/guides/date-range-filter-guide "Sonar Date and Time Filters - Perplexity"
[3]: https://www.reuters.com/world/middle-east/son-irans-toppled-shah-seeks-role-protests-expand-2026-01-11/?utm_source=chatgpt.com "Son of Iran's toppled shah seeks a role as protests expand"
[4]: https://www.canada.ca/en/global-affairs/news/2026/01/joint-statement-on-the-situation-in-iran.html?utm_source=chatgpt.com "Joint statement on the situation in Iran"
[5]: https://docs.perplexity.ai/guides/search-language-filter "Search Language Filter - Perplexity"
[6]: https://www.theguardian.com/world/2026/jan/10/protester-pulls-down-national-flag-from-iranian-embassy-in-london?utm_source=chatgpt.com "Protester pulls down national flag from Iranian embassy in London"
[7]: https://docs.perplexity.ai/guides/search-quickstart "Perplexity Search API - Perplexity"
