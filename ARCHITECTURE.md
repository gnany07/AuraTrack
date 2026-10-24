# AuraTrack AI — System Architecture & Grounded ATS Pipeline

**AuraTrack AI** is a frontier AI and high-compensation engineering career intelligence platform deployed on **Cloudflare Pages**, **Cloudflare Pages Functions**, and **Cloudflare D1**. It aggregates, grounds, and verifies **2,400+ live software, systems, and AI/ML engineering roles** across **94 official Ashby and Greenhouse ATS job boards** (including 50+ top high-paying UK / London startups, AI labs, and fintech scaleups).

---

## 1. High-Level System Architecture

```mermaid
flowchart TD
  subgraph ATS["Official ATS Posting APIs (94 Live Boards)"]
    Ashby["AshbyHQ Posting API<br/>api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true"]
    GH["Greenhouse Boards API<br/>boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true"]
  end

  subgraph Pipeline["5-Stage Grounded Ingestion Pipeline (fetch_jobs.py)"]
    S1["Stage 1: Direct ATS Ingestion<br/>Parallel ThreadPoolExecutor across 94 Verified Slugs"]
    S2["Stage 2: Multi-Location Grounding<br/>Primary Location + secondaryLocations & Offices"]
    S3["Stage 3: Department & Role Verification<br/>Engineering vs Research Track + Non-Tech Exclusion"]
    S4["Stage 4: Seniority & Double-Unescaped Salary Extraction<br/>MTS Calibration + Official Pay-Range Parsing"]
    S5["Stage 5: Deterministic ID & Exact-URL Deduplication<br/>Zero Cross-Company URL Mismatches"]
    Manifest["jobs.js<br/>window.seedJobs (2,413 Roles) + window.pipelineManifest"]
  end

  subgraph Edge["Cloudflare Edge Infrastructure"]
    Pages["Cloudflare Pages CDN<br/>index.html • style.css • app.js • jobs.js"]
    FuncAuth["Pages Function: /api/auth<br/>PBKDF2 Password Hashing & Session Tokens"]
    FuncState["Pages Function: /api/state<br/>Per-User Isolated State Sync"]
    D1[("Cloudflare D1 SQLite Database<br/>users & user_states tables")]
  end

  subgraph Client["Client SPA Engine (app.js)"]
    Guard["Runtime URL-to-Company & Role-ID Grounding Guard<br/>COMPANY_BOARD_SLUG_MAP Verification"]
    Filter["Reactive Multi-Select Facet Engine<br/>Region • Dept • Track • Seniority • Dynamic Salary Ranges • Companies"]
    Currency["Live Multi-Currency Conversion Engine<br/>GBP (£) • USD ($) • EUR (€) • INR (₹) • CAD • CHF • SGD • AUD"]
    Matcher["Semantic Resume Parser & Compatibility Scorer<br/>PDF.js Extraction + Weighted Skill/Domain/Seniority Matching"]
    Views["4 Core Workspaces<br/>#discover • #resume • #tracker • #analytics (with Country Breakdown)"]
  end

  Ashby --> S1
  GH --> S1
  S1 --> S2 --> S3 --> S4 --> S5 --> Manifest
  Manifest --> Pages
  Pages --> Guard --> Filter
  Currency --> Filter
  Matcher --> Filter
  Filter --> Views
  Views <--> FuncAuth & FuncState
  FuncAuth & FuncState <--> D1
```

---

## 2. The 5-Stage Grounded ATS Pipeline (`fetch_jobs.py`)

Every job card on AuraTrack AI is grounded directly against its official ATS posting via a deterministic 5-stage pipeline:

### Stage 1: Direct Official ATS Ingestion (94 Verified Boards)
- Queries official **Ashby** (`https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true`) and **Greenhouse** (`https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true`) endpoints concurrently.
- Covers **34 Frontier AI Labs** (`OpenAI`, `Anthropic`, `Reflection AI`, `xAI`, `Sierra`, `Anysphere/Cursor`, `Perplexity AI`, `Cohere`, `Wayve`, `Isomorphic Labs`, `ElevenLabs`, `Cognition`, `Physical Intelligence`, `Cerebras`, `Scale AI`, `Poolside`, `World Labs`, `Prime Intellect`, `Together AI`, `Baseten`, `Modal`, `LangChain`, etc.) plus **60+ high-paying UK / London & Global startups and scaleups** (`Monzo`, `Deliveroo`, `Graphcore`, `Faculty`, `Synthesia`, `incident.io`, `PhysicsX`, `Helsing`, `ClickHouse`, `Lovable`, `H Company`, `Reka AI`, `Latent Labs`, `Attio`, `Granola`, `Quantexa`, `Paddle`, `OakNorth`, `Speechmatics`, `GoCardless`, `Form3`, `Tide`, `Griffin`, `Plain`, `Sequence`, `Codat`, `PostHog`, `Stripe`, `Cloudflare`, `Elastic`, `Datadog`, `Vercel`, `Tailscale`, `Grafana Labs`, `Intercom`, etc.).

### Stage 2: Multi-Location Grounding (`secondaryLocations` & `offices`)
- Multi-hub postings frequently list `New York, NY` or `San Francisco, CA` as their primary location while placing `London, UK` or European hubs in `secondaryLocations` (Ashby) or `offices` (Greenhouse).
- `extract_ashby_locations()` and `extract_greenhouse_locations()` combine and deduplicate all primary and secondary offices into `"New York, NY • San Francisco, CA • London"`, ensuring 100% recall when filtering by **🇬🇧 UK / London**, **🇺🇸 SF / US**, **🇪🇺 Europe**, **🇨🇦 Canada**, or **🌐 Remote**.

### Stage 3: Department & Technical Role Verification
- Preserves raw ATS `department` and `team` metadata and normalizes each role into `deptTrack` (`"Engineering"` vs `"Research"`).
- Filters out non-engineering departments (`Legal`, `Finance`, `People/HR`, `Marketing`, `Sales/Commercial`, `IT Support`, `Security/GRC`, `Real Estate`) while retaining 100% of software, systems, infrastructure, ML, and research roles (for example, all **9 Reflection AI Engineering department roles** and **15 Research MTS roles**).

### Stage 4: Seniority Calibration & Double-Unescaped Compensation Extraction
- **Seniority Calibration**: Strips `"member of technical staff"` before checking standalone `"staff"` so IC `Member of Technical Staff (MTS)` roles are classified as `Senior / MTS` (`"Senior"`) while `Staff Engineer` and `Engineering Lead` roles are classified as `"Staff / Lead"`.
- **Official Compensation Extraction**: Double-unescapes Greenhouse HTML (`html.unescape(html.unescape(raw_html))`) so double-encoded entities (`&amp;mdash;` -> `—`) inside `<div class="pay-range">` are accurately parsed alongside Ashby `summaryComponents` and `scrapeableCompensationSalarySummary`.

### Stage 5: Deterministic ID & URL Integrity Verification
- Every job ID is deterministically scoped as `{board_slug}-{raw_ats_id}` and linked strictly to its exact role URL (`https://jobs.ashbyhq.com/{slug}/{id}` or `https://boards.greenhouse.io/{slug}/jobs/{id}`).
- Both build-time verification (`validate_and_deduplicate_jobs`) and runtime verification (`COMPANY_BOARD_SLUG_MAP` in `app.js`) guarantee **zero duplicate IDs** and **zero cross-company URL mismatches**.

---

## 3. Reactive Multi-Select Filter & Dynamic Range Architecture

```mermaid
flowchart LR
  Raw["window.seedJobs<br/>(2,413 Verified Roles)"] --> Base["Base Multi-Select Filter<br/>Country/Region (OR) × Dept (OR) × Track (OR) × Seniority (OR) × Match (OR)"]
  Base --> SalCalc["Dynamic Compensation Range Calibrator<br/>computeDynamicSalaryBrackets(baseFiltered)"]
  SalCalc --> SalFilter["Salary Range Multi-Select Filter (OR)<br/>Live Role Counts in Active Currency"]
  SalFilter --> CompCalc["Dynamic Company Aggregator<br/>companyCountsMap from preCompanyFiltered"]
  CompCalc --> CompFilter["Company Multi-Select Filter (OR)<br/>Sorted by Active + Role Count"]
  CompFilter --> Feed["Paginated Job Feed + Master-Detail Role Inspector"]
```

- **True Multi-Selection Across Every Facet**: Users can select multiple options simultaneously within **Country / Region**, **ATS Department**, **Engineering Track**, **Seniority & Match**, **Compensation Ranges in Results**, and **Companies in Results** (union `OR` within each facet; intersection `AND` across facets).
- **Dynamic Results-Based Compensation Ranges**: Instead of static thresholds, compensation brackets are dynamically calibrated from the distribution of matching roles and converted live into the user's selected currency (`GBP £`, `USD $`, `EUR €`, `INR ₹`, `CAD C$`, `CHF`, `SGD`, `AUD`).
- **Country-Aware Market & Gaps Intelligence (`#analytics`)**: Provides multi-select country filtering (`🇬🇧 United Kingdom`, `🇺🇸 United States`, `🇪🇺 Europe`, `🇨🇦 Canada`, `🌐 Global Remote`) and a dedicated **Country & Tech Hub Compensation & Hiring Breakdown** card.

---

## 4. Multi-User Privacy & Cloudflare D1 Persistence

- **Guest Isolation**: New visitors start in a clean guest session (`usr_guest`) with zero leaked personal resume or application tracker data.
- **Authenticated Cloud Sync**: Signed-in users authenticate via `/api/auth` (Cloudflare Pages Function backed by D1 `users` table) and sync their private resume, custom roles, and Kanban application pipeline via `/api/state` (`user_states` table, keyed by `user_id` and verified session token).
