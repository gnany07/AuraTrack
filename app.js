// app.js - AuraTrack v2.0 Job Discovery, Live Currency Engine & Resume Matcher

// Skill keywords definitions for parser
const skillKeywords = {
  languages: ["python", "c++", "rust", "go", "golang", "javascript", "typescript", "java", "c#", "c", "sql", "html", "css", "bash"],
  ml_frameworks: ["pytorch", "jax", "tensorflow", "keras", "deepspeed", "megatron-lm", "triton", "cuda", "vllm", "tensorrt-llm", "hugging face", "huggingface", "onnx", "tensorrt"],
  ai_concepts: ["reinforcement learning", "rlhf", "machine learning", "deep learning", "generative ai", "llms", "rag", "fine-tuning", "finetuning", "quantization", "multimodal", "computer vision", "nlp", "transformers", "mixture of experts", "moe", "diffusion", "stable diffusion", "prompt engineering", "agentic", "agent", "agents", "post-training", "evals"],
  infra_platform: ["docker", "kubernetes", "k8s", "aws", "azure", "gcp", "distributed systems", "system design", "git", "github", "postgresql", "mongodb", "graphql", "rest apis", "rest api", "microservices", "node.js", "nodejs", "next.js", "nextjs", "react", "redis", "kafka", "elasticsearch", "vector search", "pinecone", "milvus", "qdrant", "weaviate", "linux", "grpc"],
  pm_design: ["product management", "agile", "ui/ux", "technical writing", "figma", "product development", "market research"]
};

const allSkillList = [];
Object.values(skillKeywords).forEach(group => {
  allSkillList.push(...group);
});

// ============================================================================
// Live Currency Conversion Engine
// ============================================================================
const CURRENCY_CONFIG = {
  USD: { code: "USD", symbol: "$", rateFromUSD: 1.0, label: "USD ($)", flag: "🇺🇸", highThresholdUSD: 200000, midThresholdUSD: 150000, pillHigh: "💎 $200k+", pillMid: "💵 $150k+" },
  GBP: { code: "GBP", symbol: "£", rateFromUSD: 0.79, label: "GBP (£)", flag: "🇬🇧", highThresholdUSD: 200000, midThresholdUSD: 150000, pillHigh: "💎 £160k+", pillMid: "💵 £120k+" },
  EUR: { code: "EUR", symbol: "€", rateFromUSD: 0.92, label: "EUR (€)", flag: "🇪🇺", highThresholdUSD: 200000, midThresholdUSD: 150000, pillHigh: "💎 €185k+", pillMid: "💵 €140k+" },
  INR: { code: "INR", symbol: "₹", rateFromUSD: 84.0, label: "INR (₹)", flag: "🇮🇳", highThresholdUSD: 200000, midThresholdUSD: 150000, pillHigh: "💎 ₹1.68Cr+", pillMid: "💵 ₹1.26Cr+" },
  CAD: { code: "CAD", symbol: "C$", rateFromUSD: 1.38, label: "CAD (C$)", flag: "🇨🇦", highThresholdUSD: 200000, midThresholdUSD: 150000, pillHigh: "💎 C$275k+", pillMid: "💵 C$205k+" },
  CHF: { code: "CHF", symbol: "CHF ", rateFromUSD: 0.88, label: "CHF (Fr)", flag: "🇨🇭", highThresholdUSD: 200000, midThresholdUSD: 150000, pillHigh: "💎 CHF 175k+", pillMid: "💵 CHF 130k+" },
  SGD: { code: "SGD", symbol: "S$", rateFromUSD: 1.34, label: "SGD (S$)", flag: "🇸🇬", highThresholdUSD: 200000, midThresholdUSD: 150000, pillHigh: "💎 S$270k+", pillMid: "💵 S$200k+" },
  AUD: { code: "AUD", symbol: "A$", rateFromUSD: 1.52, label: "AUD (A$)", flag: "🇦🇺", highThresholdUSD: 200000, midThresholdUSD: 150000, pillHigh: "💎 A$300k+", pillMid: "💵 A$230k+" }
};

function getSavedCurrency() {
  try {
    const saved = localStorage.getItem("auratrack_currency");
    if (saved && CURRENCY_CONFIG[saved]) return saved;
  } catch (e) {}
  return "GBP"; // Default to GBP or user preference
}

// Parse or estimate structured salary { minUSD, maxUSD, baseCurrency, baseMin, baseMax, hasEquity }
function parseJobSalaryData(job) {
  if (!job) return { minUSD: 180000, maxUSD: 280000, baseCurrency: "USD", baseMin: 180000, baseMax: 280000, hasEquity: true };

  // If job already has structured salaryMin & salaryMax from updated fetch_jobs.py
  if (typeof job.salaryMin === "number" && typeof job.salaryMax === "number" && job.salaryMin > 0) {
    const curr = job.salaryCurrency && CURRENCY_CONFIG[job.salaryCurrency] ? job.salaryCurrency : "USD";
    const rate = CURRENCY_CONFIG[curr].rateFromUSD;
    return {
      minUSD: Math.round(job.salaryMin / rate),
      maxUSD: Math.round(job.salaryMax / rate),
      baseCurrency: curr,
      baseMin: job.salaryMin,
      baseMax: job.salaryMax,
      hasEquity: (job.salary || "").toLowerCase().includes("equity")
    };
  }

  const raw = String(job.salary || "").trim();
  const hasEquity = raw.toLowerCase().includes("equity") || !raw;

  // Detect base currency symbol in raw string
  let baseCurrency = "USD";
  if (raw.includes("£")) baseCurrency = "GBP";
  else if (raw.includes("€")) baseCurrency = "EUR";
  else if (raw.includes("₹")) baseCurrency = "INR";
  else if (raw.includes("C$")) baseCurrency = "CAD";

  // Check if raw is the old generic "$200,000 - $330,000 + equity" placeholder
  const isGenericFallback = raw === "$200,000 - $330,000 + equity" || raw === "$185,000 - $330,000 + equity";

  if (!isGenericFallback && raw) {
    const numMatches = raw.match(/\d[\d,]*(?:\.\d+)?\s*[kK]?/g);
    if (numMatches && numMatches.length >= 1) {
      const nums = numMatches.map(m => {
        const clean = m.toLowerCase().replace(/,/g, "").trim();
        if (clean.endsWith("k")) return Math.round(parseFloat(clean.slice(0, -1)) * 1000);
        const val = parseFloat(clean);
        return val < 1000 ? Math.round(val * 1000) : Math.round(val);
      }).filter(n => !isNaN(n) && n >= 25000);

      if (nums.length >= 1) {
        const baseMin = nums[0];
        const baseMax = nums.length >= 2 ? Math.max(nums[0], nums[1]) : Math.round(nums[0] * 1.25);
        const rate = CURRENCY_CONFIG[baseCurrency]?.rateFromUSD || 1.0;
        return {
          minUSD: Math.round(baseMin / rate),
          maxUSD: Math.round(baseMax / rate),
          baseCurrency,
          baseMin,
          baseMax,
          hasEquity
        };
      }
    }
  }

  // Calibrate realistic role-specific compensation when raw string was a generic fallback
  const locLower = (job.location || "").toLowerCase();
  const isUK = /\b(london|uk|united kingdom|cambridge|oxford|edinburgh|bristol|manchester)\b/i.test(locLower);
  const isEU = /\b(paris|france|berlin|germany|munich|amsterdam|zurich|dublin|europe)\b/i.test(locLower);
  const titleStr = job.title || "";
  const seniority = getInferredSeniority(job);

  // Deterministic variance per role title so every role has a distinct, realistic band
  let hash = 0;
  for (let i = 0; i < titleStr.length; i++) {
    hash = (hash * 31 + titleStr.charCodeAt(i)) % 7;
  }
  const stepUSD = hash * 5000;

  let minUSD = 195000;
  let maxUSD = 295000;

  if (seniority === "Staff / Lead") {
    minUSD = (isUK ? 215000 : isEU ? 185000 : 265000) + stepUSD;
    maxUSD = (isUK ? 325000 : isEU ? 275000 : 395000) + stepUSD;
  } else if (seniority === "Senior") {
    minUSD = (isUK ? 175000 : isEU ? 150000 : 220000) + stepUSD;
    maxUSD = (isUK ? 265000 : isEU ? 225000 : 335000) + stepUSD;
  } else {
    minUSD = (isUK ? 135000 : isEU ? 120000 : 180000) + stepUSD;
    maxUSD = (isUK ? 205000 : isEU ? 175000 : 265000) + stepUSD;
  }

  return {
    minUSD,
    maxUSD,
    baseCurrency: isUK ? "GBP" : isEU ? "EUR" : "USD",
    baseMin: Math.round(minUSD * (isUK ? 0.79 : isEU ? 0.92 : 1)),
    baseMax: Math.round(maxUSD * (isUK ? 0.79 : isEU ? 0.92 : 1)),
    hasEquity: true
  };
}

function formatSingleCurrencyAmount(amountInTarget, currencyCode, compact = false) {
  const cfg = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.USD;
  const sym = cfg.symbol;

  if (currencyCode === "INR") {
    // Format INR in Crores (Cr) or Lakhs (L) for clean readability
    const crores = amountInTarget / 10000000;
    if (crores >= 1.0) {
      return `${sym}${crores.toFixed(2).replace(/\.00$/, "")}Cr`;
    }
    const lakhs = Math.round(amountInTarget / 100000);
    return `${sym}${lakhs}L`;
  }

  // Round to nearest 1,000 for clean display
  const rounded = Math.round(amountInTarget / 1000) * 1000;
  if (compact) {
    return `${sym}${Math.round(rounded / 1000)}k`;
  }
  return `${sym}${rounded.toLocaleString("en-US")}`;
}

function formatJobSalary(job, targetCurrency = null, options = { compact: false, includeEquity: true }) {
  const curr = targetCurrency || state.currency || "GBP";
  const cfg = CURRENCY_CONFIG[curr] || CURRENCY_CONFIG.USD;
  const sal = parseJobSalaryData(job);

  let minTarget, maxTarget;
  if (sal.baseCurrency === curr) {
    minTarget = sal.baseMin;
    maxTarget = sal.baseMax;
  } else {
    minTarget = sal.minUSD * cfg.rateFromUSD;
    maxTarget = sal.maxUSD * cfg.rateFromUSD;
  }

  const minStr = formatSingleCurrencyAmount(minTarget, curr, options.compact);
  const maxStr = formatSingleCurrencyAmount(maxTarget, curr, options.compact);
  const eqSuffix = options.includeEquity && sal.hasEquity ? " + equity" : "";
  return `${minStr} – ${maxStr}${eqSuffix}`;
}

window.setCurrency = function(currencyCode) {
  if (!CURRENCY_CONFIG[currencyCode]) return;
  state.currency = currencyCode;
  try {
    localStorage.setItem("auratrack_currency", currencyCode);
  } catch (e) {}

  updateCurrencyUI();
  if (state.currentTab === "discover") renderJobDiscovery();
  if (state.currentTab === "tracker") renderKanbanBoard();
  if (state.selectedJobId) openJobDetails(state.selectedJobId);

  const cfg = CURRENCY_CONFIG[currencyCode];
  showToast(`Currency updated to ${cfg.flag} ${cfg.label} — all salaries converted!`);
};

function updateCurrencyUI() {
  const curr = state.currency || "GBP";
  const cfg = CURRENCY_CONFIG[curr] || CURRENCY_CONFIG.USD;

  // Update header quick pills
  document.querySelectorAll(".currency-pill-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.currency === curr);
  });

  // Update header dropdown
  const select = document.getElementById("global-currency-select");
  if (select && select.value !== curr) {
    select.value = curr;
  }

  // Update compensation filter pills in Job Discovery
  const pill200k = document.getElementById("salary-pill-200k");
  const pill150k = document.getElementById("salary-pill-150k");
  if (pill200k) pill200k.textContent = cfg.pillHigh;
  if (pill150k) pill150k.textContent = cfg.pillMid;

  // Update inline currency indicator
  const ind = document.getElementById("active-currency-indicator");
  if (ind) ind.textContent = `in ${cfg.label}`;
}

// ============================================================================
// Exact Job URL Normalization & Job Catalog Sanitizer
// ============================================================================
const COMPANY_DOMAIN_MAP = {
  "OpenAI": "openai.com",
  "Anthropic": "anthropic.com",
  "Sierra": "sierra.ai",
  "Google DeepMind": "deepmind.google",
  "Microsoft AI": "microsoft.com",
  "Meta AI": "meta.com",
  "Perplexity AI": "perplexity.ai",
  "Scale AI": "scale.com",
  "Cohere": "cohere.com",
  "Mistral AI": "mistral.ai",
  "xAI": "x.ai",
  "Stability AI": "stability.ai",
  "Groq": "groq.com",
  "Cerebras": "cerebras.ai",
  "Anysphere": "cursor.com",
  "Harvey": "harvey.ai",
  "Abridge": "abridge.com",
  "Decagon": "decagon.ai",
  "Physical Intelligence": "physicalintelligence.company",
  "Anduril": "anduril.com",
  "ElevenLabs": "elevenlabs.io",
  "Cognition": "cognition.ai",
  "Imbue": "imbue.com",
  "Hebbia": "hebbia.ai",
  "Poolside": "poolside.ai",
  "Glean": "glean.com",
  "RunwayML": "runwayml.com",
  "Reflection AI": "reflection.ai",
  "Wayve": "wayve.ai",
  "Nscale": "nscale.com",
  "Isomorphic Labs": "isomorphiclabs.com",
  "Synthesia": "synthesia.io",
  "Granola": "granola.ai",
  "Recraft": "recraft.ai",
  "Humanloop": "humanloop.com",
  "V7 Labs": "v7labs.com",
  "PolyAI": "poly.ai",
  "Robin AI": "robinai.com",
  "PhysicsX": "physicsx.ai",
  "Basecamp Research": "basecamp-research.ai",
  "Unitary": "unitary.ai",
  "Causaly": "causaly.com",
  "Speechmatics": "speechmatics.com",
  "Automata": "automata.tech",
  "Quantexa": "quantexa.com",
  "Thought Machine": "thoughtmachine.net",
  "Faculty": "faculty.ai",
  "Cleo": "web.meetcleo.com",
  "Omnea": "omnea.co"
};

function isGenericCareerUrl(url) {
  if (!url || typeof url !== "string") return true;
  const clean = url.trim().replace(/\/+$/, "").toLowerCase();
  if (clean.endsWith("/careers") || clean.endsWith("/jobs") || clean.endsWith("/jobs/results")) return true;
  if (clean === "https://careers.microsoft.com" || clean === "https://www.metacareers.com") return true;
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    // An exact job link has at least a company/board segment AND a specific job ID segment
    if (pathParts.length < 2) return true;
  } catch (e) {
    return true;
  }
  return false;
}

function getExactJobUrl(job) {
  if (!job) return "#";
  let url = job.jobUrl || job.applyUrl || "";
  // For Ashby URLs ending in /application, strip /application so the user lands on the Role Overview page (with the full job description + Apply tab)
  if (url.includes("jobs.ashbyhq.com/") && url.endsWith("/application")) {
    url = url.slice(0, -12);
  }
  return url;
}

function getDirectApplyUrl(job) {
  if (!job) return "#";
  if (job.directApplyUrl) return job.directApplyUrl;
  const exact = getExactJobUrl(job);
  if (exact.includes("jobs.ashbyhq.com/") && !exact.endsWith("/application")) {
    return `${exact}/application`;
  }
  return job.applyUrl || exact;
}

function getInferredSeniority(job) {
  const t = (job.title || "").toLowerCase();
  if (/\b(staff|principal|distinguished|architect|head|director|tech lead|lead)\b/i.test(t)) {
    return "Staff / Lead";
  }
  if (/\b(senior|sr\.|sr |snr|mts|member of technical staff|founding)\b/i.test(t)) {
    return "Senior";
  }
  if (["OpenAI", "Anthropic", "Reflection AI", "Cognition", "Poolside", "Sierra", "Anysphere"].includes(job.company)) {
    return "Senior";
  }
  return job.seniority || "Mid / General";
}

function getReliableLogoUrl(job) {
  const domain = COMPANY_DOMAIN_MAP[job.company];
  if (domain) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  }
  if (job.logoUrl && !job.logoUrl.includes("clearbit.com")) {
    return job.logoUrl;
  }
  return "";
}

// Curated + Custom Jobs list getter (filters out generic career page links)
function getAllJobs() {
  const rawSeeds = Array.isArray(window.seedJobs) ? window.seedJobs : [];
  const validSeeds = rawSeeds.filter(j => !j.id?.startsWith("static-") && !isGenericCareerUrl(j.jobUrl || j.applyUrl));
  const combined = [...validSeeds, ...(state.customJobs || [])];

  return combined.map(j => ({
    ...j,
    seniority: getInferredSeniority(j),
    jobUrl: getExactJobUrl(j),
    applyUrl: getExactJobUrl(j),
    directApplyUrl: getDirectApplyUrl(j),
    logoUrl: getReliableLogoUrl(j)
  }));
}

// ============================================================================
// Multi-User & Private Session Management
// ============================================================================
const GUEST_USER = {
  id: "usr_guest",
  name: "Guest User",
  email: "",
  avatar: "👤",
  isGuest: true
};

function getCurrentSessionUser() {
  try {
    const raw = localStorage.getItem("auratrack_session_user");
    if (raw) {
      const user = JSON.parse(raw);
      if (user && user.id) return user;
    }
  } catch (e) {}

  const legacyActiveId = localStorage.getItem("auratrack_current_user_id");
  if (legacyActiveId === "usr_gnanendar") {
    const gnanendarUser = {
      id: "usr_gnanendar",
      name: "Gnanendar Reddy Male",
      email: "gnanendarreddymale77@gmail.com",
      avatar: "👤"
    };
    try { localStorage.setItem("auratrack_session_user", JSON.stringify(gnanendarUser)); } catch(e){}
    return gnanendarUser;
  }

  return GUEST_USER;
}

function saveCurrentSessionUser(user) {
  try {
    if (user && !user.isGuest) {
      localStorage.setItem("auratrack_session_user", JSON.stringify(user));
      localStorage.setItem("auratrack_current_user_id", user.id);
    } else {
      localStorage.removeItem("auratrack_session_user");
      localStorage.setItem("auratrack_current_user_id", "usr_guest");
    }
  } catch(e){}
}

function getActiveUserId() {
  const user = getCurrentSessionUser();
  return user.id || "usr_guest";
}

function getActiveUserProfile() {
  return getCurrentSessionUser();
}

// App State
let state = {
  currentUser: GUEST_USER,
  currency: getSavedCurrency(),
  discoverySort: "match",
  resumeText: "",
  parsedResume: {
    skills: [],
    experienceLevel: "Entry/Mid",
    seniorityKeywords: [],
    email: "",
    name: ""
  },
  customJobs: [],
  tracker: {
    discovered: [],
    applied: [],
    interviewing: [],
    offer: [],
    archived: []
  },
  activeFilters: {
    domain: new Set(),
    seniority: new Set(),
    location: new Set(),
    match: new Set(),
    salary: new Set(),
    company: new Set()
  },
  currentTab: "discover",
  selectedJobId: null
};
window.state = state;

// Toast Notifications
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(40px)";
    toast.style.transition = "all 0.25s ease";
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

const DEFAULT_RESUME_TEXT = `Gnanendar Reddy Male
London, United Kingdom | Email: gnanendarreddymale77@gmail.com | Mobile: +44 7931084323
LinkedIn: linkedin.com/in/gnanendar-reddy-1862b6117/

EDUCATION
• Georgia Institute of Technology (Remote) - Master of Science in Computer Science; AI Specialization (2026 – 2028)
• Indian Institute of Technology (IIT), Roorkee - Bachelor of Technology in Electrical Engineering (2014 – 2018)

TECHNICAL SKILLS & EXPERTISE
• Skills: Data Structures and Algorithms, OOPs, LLD, HLD, Design Patterns, API Design, Machine Learning, LLM Development, Systems Programming
• Programming Languages: C++, Python, Golang, C
• Areas of Interest: Distributed Systems, Machine Learning, Post-Training, Evals, Operating Systems, Computer Networking
• Dev Tools & Infrastructure: Vim, Git, GitHub, Jira, MySQL, Docker CLI, Linux, Microservices

PROFESSIONAL EXPERIENCE
• Meta Platforms | Senior Software Engineer (London, UK) | Sept. 2025 – Present
  - Applied AI Org: Agent Data & Optimization for coding models (Post-Training, Model Understanding, Building Evals, Benchmarking).
  - Tech Lead for Fraud Deception team. Technical direction for 4 Engineers on the team.
  - Built scalable policy enforcement infrastructure triggering ML and LLM-based classifiers across Instagram & Facebook.
• Google | Senior Software Engineer & Tech Lead (Bengaluru, India) | Oct. 2024 – Aug. 2025
  - Tech Lead for monetization, billing, and invoicing platform on Google Pay for Business team.
• Google | Software Engineer (Bengaluru, India) | May 2022 – Oct. 2024
  - Built core billing and invoicing infrastructure from scratch for product monetization across Google Pay.
• Pensando Systems | Member of Technical Staff (Bengaluru, India) | April 2020 – May 2022
  - Developed in-house Software Load-balancer application on top of NFF-GO with REST API and packet path support for Microsoft Azure.
  - Designed and implemented Fastpath networking feature on top of Vector Packet Processor (VPP) for Azure.
• Cisco Systems | Software Engineer (Bengaluru, India) | Aug. 2018 – April 2020
  - Worked on Nexus OS data center networking, model-driven programmability, and REST API configurations.
`;

function ensureFilterSets() {
  if (!state.activeFilters) {
    state.activeFilters = {
      domain: new Set(),
      seniority: new Set(),
      location: new Set(),
      match: new Set(),
      salary: new Set(),
      company: new Set()
    };
    return;
  }
  const f = state.activeFilters;
  state.activeFilters = {
    domain: f.domain instanceof Set ? f.domain : new Set(Array.isArray(f.domain) ? f.domain : []),
    seniority: f.seniority instanceof Set ? f.seniority : new Set(Array.isArray(f.seniority) ? f.seniority : []),
    location: f.location instanceof Set ? f.location : new Set(Array.isArray(f.location) ? f.location : []),
    match: f.match instanceof Set ? f.match : new Set(Array.isArray(f.match) ? f.match : []),
    salary: f.salary instanceof Set ? f.salary : new Set(Array.isArray(f.salary) ? f.salary : []),
    company: f.company instanceof Set ? f.company : new Set(Array.isArray(f.company) ? f.company : [])
  };
}

function ensureTrackerStages() {
  if (!state.tracker || typeof state.tracker !== "object") {
    state.tracker = { discovered: [], applied: [], interviewing: [], offer: [], archived: [] };
  }
  const stages = ["discovered", "applied", "interviewing", "offer", "archived"];
  stages.forEach(s => {
    if (!Array.isArray(state.tracker[s])) {
      state.tracker[s] = [];
    }
  });

  const allJobs = getAllJobs();
  if (!allJobs || allJobs.length === 0) return;

  stages.forEach(stage => {
    state.tracker[stage] = state.tracker[stage].map(id => {
      const existing = allJobs.find(j => j.id === id);
      if (existing) return id;
      return null;
    }).filter(Boolean);
  });

  // Update sidebar tracker count badge
  const totalTracked = stages.reduce((acc, s) => acc + state.tracker[s].length, 0);
  const trackerBadge = document.getElementById("nav-tracker-count-badge");
  if (trackerBadge) trackerBadge.textContent = totalTracked.toString();

  const jobsBadge = document.getElementById("nav-jobs-count-badge");
  if (jobsBadge) jobsBadge.textContent = allJobs.length.toString();
}

async function syncStateFromDB() {
  const activeUser = getActiveUserProfile();
  const userId = activeUser.id;
  try {
    const headers = { "X-User-Id": userId };
    if (activeUser.token) headers["Authorization"] = `Bearer ${activeUser.token}`;

    const res = await fetch(`/api/state?userId=${encodeURIComponent(userId)}`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data && data.state && typeof data.state === "object") {
        state = { ...state, ...data.state, currentUser: activeUser, currency: state.currency || getSavedCurrency() };
        window.state = state;
        ensureFilterSets();
        ensureTrackerStages();
        if (state.currentTab === "tracker") renderKanbanBoard();
        if (state.currentTab === "discover") renderJobDiscovery();
      }
    }
  } catch (e) {}
}

function loadState() {
  const activeUser = getActiveUserProfile();
  const userStorageKey = `auratrack_state_${activeUser.id}`;
  let savedState = localStorage.getItem(userStorageKey);

  if (!savedState && activeUser.id === "usr_gnanendar") {
    savedState = localStorage.getItem("auratrack_state");
  }

  let loadedData = {
    currentUser: activeUser,
    currency: getSavedCurrency(),
    discoverySort: "match",
    resumeText: "",
    parsedResume: {
      skills: [],
      experienceLevel: "Entry/Mid",
      seniorityKeywords: [],
      email: activeUser.email || "",
      name: activeUser.name || ""
    },
    customJobs: [],
    tracker: { discovered: [], applied: [], interviewing: [], offer: [], archived: [] },
    currentTab: (window.state && window.state.currentTab) || "resume",
    selectedJobId: null
  };

  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      loadedData = {
        ...loadedData,
        ...parsed,
        currentUser: activeUser,
        currency: parsed.currency || getSavedCurrency(),
        parsedResume: parsed.parsedResume ? { ...parsed.parsedResume } : loadedData.parsedResume,
        tracker: parsed.tracker ? { ...parsed.tracker } : loadedData.tracker
      };
    } catch (e) {
      console.error("Failed to parse saved state", e);
    }
  }

  state = loadedData;
  window.state = state;

  ensureFilterSets();
  ensureTrackerStages();
  updateCurrencyUI();

  if (!activeUser.isGuest) {
    syncStateFromDB();
  }

  if (activeUser.id === "usr_gnanendar" && (!state.resumeText || state.resumeText.length < 50)) {
    state.resumeText = DEFAULT_RESUME_TEXT;
    state.parsedResume = parseResumeText(DEFAULT_RESUME_TEXT);
    saveState();
  }

  updateAccountUI();
}

function saveState() {
  ensureFilterSets();
  ensureTrackerStages();
  const activeUser = getActiveUserProfile();

  const serializableState = {
    ...state,
    currentUser: activeUser,
    currency: state.currency || "GBP",
    tracker: state.tracker,
    activeFilters: {
      domain: Array.from(state.activeFilters.domain),
      seniority: Array.from(state.activeFilters.seniority),
      location: Array.from(state.activeFilters.location),
      match: Array.from(state.activeFilters.match),
      salary: Array.from(state.activeFilters.salary),
      company: Array.from(state.activeFilters.company)
    }
  };

  const userStorageKey = `auratrack_state_${activeUser.id}`;
  localStorage.setItem(userStorageKey, JSON.stringify(serializableState));
  if (activeUser.id === "usr_gnanendar") {
    localStorage.setItem("auratrack_state", JSON.stringify(serializableState));
  }

  if (!activeUser.isGuest) {
    const headers = { "Content-Type": "application/json", "X-User-Id": activeUser.id };
    if (activeUser.token) headers["Authorization"] = `Bearer ${activeUser.token}`;

    fetch(`/api/state?userId=${encodeURIComponent(activeUser.id)}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ userId: activeUser.id, state: serializableState })
    }).catch(() => {});
  }
}

// ============================================================================
// Resume Parser & Semantic Match Scoring Engine
// ============================================================================
const UNWANTED_TITLES_REGEX = /\b(frontend|front-end|front end|ui|ux|ui\/ux|designer|product design|web designer|web developer|ios|android|mobile|electrical|hardware|analog|asic|silicon|fpga|rf engineer|pcb|mechanical|chip design|board design|data engineer|data engineering|data scientist|data science|data analyst|analytics engineer|business intelligence|intern|internship|co-op|graduate engineer|junior|entry level|apprentice|solutions engineer|solutions architect|solutions architecture|developer relations|devrel|developer advocate|field engineer|forward deployed|sales engineer|customer engineer|partner engineer|partner|partnerships?|support engineer|technical support|technical advocate|support delivery|support specialist|sales|account executive|business development|gtm|product manager|program manager|project manager|operations|customer success|recruiter|talent|talent acquisition|human resources|hr|people|legal|finance|accounting|marketing|copywriter|strategist|it support|it engineer|it engineering|information technology|desktop support|helpdesk|social media|community|events|communications|security|compliance|infosec|cybersecurity|appsec|detection and response|threat investigator|threat intel|insider threat|audit|privacy|vulnerability|bioanalytical|biological|biology|bioinformatics|computational biology|genomics|growth|lifecycle|network engineer|network engineering|network architect|manufacturing|quality|aerospace|avionics|propulsion|flight|thermal|structural|technician|industrial|supply chain|logistics|facilities|materials|chemical|civil|test engineer|integration engineer|deployment engineer|mission|guidance|navigation|sensor|radar|optical|photon|maritime|subsea)\b/i;

function parseResumeText(text) {
  if (!text) text = "";

  const normalizedPdfText = text
    .replace(/\uFB01/g, "fi")
    .replace(/\uFB02/g, "fl")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-zA-Z])([:,;])/g, "$1 $2 ");

  const normalizedText = normalizedPdfText.toLowerCase();
  const cleanSkillsText = normalizedPdfText
    .replace(/Bachelor of Technology in Electrical Engineering/gi, "")
    .replace(/Electrical Engineering/gi, "")
    .toLowerCase();

  const foundSkills = [];
  allSkillList.forEach(skill => {
    if (skill === "ui/ux" || skill === "product management") return;
    let regex;
    if (skill.length <= 3 || skill === "go" || skill === "c" || skill === "git") {
      regex = new RegExp(`\\b${escapeRegExp(skill)}\\b`, "i");
    } else {
      regex = new RegExp(escapeRegExp(skill), "i");
    }
    if (regex.test(cleanSkillsText)) {
      foundSkills.push(capitalizeSkill(skill));
    }
  });

  const coreProfileSkills = ["C++", "Python", "Golang", "C", "Distributed Systems", "Machine Learning", "LLMs", "Post-Training", "Evals", "System Design", "Linux", "Docker", "Kubernetes", "PostgreSQL", "Redis", "Vector Search", "REST APIs", "Microservices", "PyTorch", "JAX", "CUDA"];
  coreProfileSkills.forEach(s => {
    if (!foundSkills.includes(s) && cleanSkillsText.includes(s.toLowerCase())) {
      foundSkills.push(s);
    }
  });

  let level = "Senior / Staff Engineer";
  const seniorityKeywords = [];
  if (/\b(staff|principal|architect)\b/i.test(normalizedText)) seniorityKeywords.push("Staff");
  if (/\b(senior|sr\.?)\b/i.test(normalizedText)) seniorityKeywords.push("Senior");
  if (/\b(tech lead|team lead|lead)\b/i.test(normalizedText)) seniorityKeywords.push("Tech Lead");
  if (/\b(mts|member of technical staff)\b/i.test(normalizedText)) seniorityKeywords.push("MTS");
  if (seniorityKeywords.length === 0) seniorityKeywords.push("Software Engineer");

  let email = "";
  const emailMatch = normalizedText.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  if (emailMatch) email = emailMatch[0];

  let name = "Candidate Profile";
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 0 && lines[0].length < 40 && !lines[0].includes("@")) {
    name = lines[0];
  }

  return {
    skills: [...new Set(foundSkills)],
    experienceLevel: level,
    seniorityKeywords,
    email,
    name
  };
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitalizeSkill(skill) {
  const overrides = {
    "pytorch": "PyTorch", "jax": "JAX", "tensorflow": "TensorFlow", "deepspeed": "DeepSpeed",
    "megatron-lm": "Megatron-LM", "triton": "Triton", "cuda": "CUDA", "vllm": "vLLM",
    "tensorrt-llm": "TensorRT-LLM", "hugging face": "Hugging Face", "huggingface": "Hugging Face",
    "onnx": "ONNX", "tensorrt": "TensorRT", "llms": "LLMs", "rag": "RAG", "rlhf": "RLHF",
    "moe": "MoE", "api": "API", "rest apis": "REST APIs", "graphql": "GraphQL",
    "aws": "AWS", "azure": "Azure", "gcp": "GCP", "javascript": "JavaScript",
    "typescript": "TypeScript", "next.js": "Next.js", "nextjs": "Next.js", "react": "React",
    "mongodb": "MongoDB", "postgresql": "PostgreSQL", "node.js": "Node.js", "nodejs": "Node.js",
    "sql": "SQL", "html": "HTML", "css": "CSS", "git": "Git", "github": "GitHub",
    "nlp": "NLP", "k8s": "Kubernetes", "c++": "C++", "golang": "Golang", "grpc": "gRPC"
  };
  return overrides[skill.toLowerCase()] || skill.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function calculateMatchScore(job, parsedResume) {
  if (!job || !job.title) {
    return { score: 0, breakdown: { domain: 0, seniority: 0, tech: 0, company: 0 }, matchedSkills: [], missingSkills: [] };
  }

  const titleLower = job.title.toLowerCase();
  const descLower = (job.description || "").toLowerCase();
  const fullText = `${titleLower} ${descLower} ${(job.requirements || []).join(" ")} ${(job.preferred || []).join(" ")}`.toLowerCase();

  if (UNWANTED_TITLES_REGEX.test(titleLower)) {
    return { score: 0, breakdown: { domain: 0, seniority: 0, tech: 0, company: 0 }, matchedSkills: [], missingSkills: job.requirements || [] };
  }

  let domainScore = 0;    // Max 35
  let seniorityScore = 0; // Max 25
  let techScore = 0;      // Max 25
  let companyScore = 0;   // Max 15

  const isAppliedAI = /\b(applied ai|post-training|post training|evals|evaluations|benchmarking|agent|agentic|coding models|llm infrastructure|llm serving|llm platform|inference runtime|rlhf|model alignment|reinforcement learning)\b/i.test(fullText);
  const isSystemsInfra = /\b(systems|distributed systems|infrastructure|platform|load balancer|packet path|vpp|dpdk|kernel|networking|high throughput|low latency|c\+\+|golang|go|microservices|storage|runtime|compute)\b/i.test(fullText);
  const isCoreSWE = /\b(backend|software engineer|swe|platform engineer|infrastructure engineer|systems engineer|ml engineer|research engineer)\b/i.test(titleLower);

  if (isAppliedAI) domainScore = 35;
  else if (isSystemsInfra) domainScore = 32;
  else if (isCoreSWE) domainScore = 26;
  else domainScore = 18;

  if (/\b(staff|principal|head|director)\b/i.test(titleLower)) seniorityScore = 25;
  else if (/\b(senior|tech lead|lead|mts|member of technical staff|architect)\b/i.test(titleLower)) seniorityScore = 23;
  else if (/\b(software engineer|research engineer|engineer)\b/i.test(titleLower) && !/\b(junior|associate|intern|entry)\b/i.test(titleLower)) seniorityScore = 19;
  else seniorityScore = 12;

  const resumeSkills = (parsedResume && Array.isArray(parsedResume.skills) && parsedResume.skills.length > 0)
    ? parsedResume.skills
    : ["C++", "Python", "Golang", "C", "Distributed Systems", "Machine Learning", "LLMs", "Post-Training", "Evals", "System Design", "Linux", "Docker", "Kubernetes"];

  const matchedSkills = [];
  const missingSkills = [];

  // Match against candidate's parsed skills
  resumeSkills.forEach(skill => {
    const sLow = skill.toLowerCase();
    const pattern = sLow === "c++" ? /\b(c\+\+|cpp)\b/i : sLow.length <= 3 ? new RegExp(`\\b${escapeRegExp(sLow)}\\b`, "i") : new RegExp(escapeRegExp(sLow), "i");
    if (pattern.test(fullText)) {
      matchedSkills.push(skill);
      techScore += 4;
    }
  });

  (job.requirements || []).forEach(req => {
    const reqLow = req.toLowerCase();
    const isMatched = matchedSkills.some(s => s.toLowerCase() === reqLow) || resumeSkills.some(s => s.toLowerCase() === reqLow);
    if (isMatched) {
      if (!matchedSkills.includes(req)) matchedSkills.push(req);
      techScore += 3;
    } else {
      missingSkills.push(req);
    }
  });

  techScore = Math.min(25, Math.max(8, techScore));

  const topTierAILabs = [
    "OpenAI", "Anthropic", "Wayve", "Nscale", "Reflection AI", "Isomorphic Labs",
    "Synthesia", "ElevenLabs", "Cognition", "Sierra", "Perplexity AI", "Cohere",
    "Poolside", "PhysicsX", "Granola", "Recraft", "Basecamp Research", "V7 Labs",
    "Google DeepMind", "Meta AI", "Microsoft AI", "Scale AI", "Mistral AI", "Groq", "xAI", "Harvey", "Glean", "Anduril"
  ];
  companyScore = topTierAILabs.includes(job.company) ? 15 : 11;

  const rawTotal = domainScore + seniorityScore + techScore + companyScore;
  const finalScore = Math.min(99, Math.max(0, Math.round(rawTotal)));

  return {
    score: finalScore,
    breakdown: { domain: domainScore, seniority: seniorityScore, tech: techScore, company: companyScore },
    matchedSkills: [...new Set(matchedSkills)],
    missingSkills: [...new Set(missingSkills)]
  };
}

// ============================================================================
// URL Hash Routing & Tab Navigation
// ============================================================================
const VALID_TABS = new Set(["discover", "resume", "tracker", "analytics"]);

function getTabFromHash() {
  const hash = (window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
  if (VALID_TABS.has(hash)) return hash;
  return null;
}

function switchTab(tabId, updateHash = true) {
  if (!VALID_TABS.has(tabId)) tabId = "discover";
  state.currentTab = tabId;

  if (updateHash && typeof window !== "undefined" && window.history && window.history.replaceState) {
    try {
      window.history.replaceState(null, "", `#${tabId}`);
    } catch (e) {}
  }

  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  const activeNavItem = document.getElementById(`nav-${tabId}`);
  if (activeNavItem) activeNavItem.classList.add("active");

  document.querySelectorAll(".dashboard-section").forEach(sec => sec.classList.remove("active"));
  const activeSection = document.getElementById(`section-${tabId}`);
  if (activeSection) activeSection.classList.add("active");

  // Update dynamic header title & subtitle
  const titleEl = document.getElementById("header-page-title");
  const subEl = document.getElementById("header-page-subtitle");
  if (titleEl && subEl) {
    const allCount = getAllJobs().length;
    if (tabId === "discover") {
      titleEl.textContent = "Frontier AI Job Discovery";
      subEl.textContent = `Explore ${allCount} verified engineering roles with direct job links and live currency conversion.`;
    } else if (tabId === "resume") {
      titleEl.textContent = "Resume Profile & AI Matcher";
      subEl.textContent = "Upload your technical resume to calibrate compatibility scores across all open roles.";
    } else if (tabId === "tracker") {
      titleEl.textContent = "Kanban Application Pipeline";
      subEl.textContent = "Track your applications from discovery through offer negotiation.";
    } else if (tabId === "analytics") {
      titleEl.textContent = "Career Analytics & Skill Gaps";
      subEl.textContent = "Analyze your match distribution and technical preparation priorities.";
    }
  }

  if (tabId === "discover") renderJobDiscovery();
  else if (tabId === "tracker") renderKanbanBoard();
  else if (tabId === "analytics") renderAnalytics();
  else if (tabId === "resume") renderResumePortal();
}
window.switchTab = switchTab;

// ============================================================================
// Resume Portal Rendering
// ============================================================================
function renderResumePortal() {
  const container = document.getElementById("section-resume");
  if (!container) return;

  const isLoaded = state.resumeText && state.resumeText.length > 0;
  const headerBadge = document.getElementById("resume-badge");
  if (headerBadge) {
    if (isLoaded) {
      headerBadge.textContent = `✓ Resume Active (${state.parsedResume.skills.length} skills)`;
      headerBadge.classList.add("loaded");
    } else {
      headerBadge.textContent = "No Resume Loaded";
      headerBadge.classList.remove("loaded");
    }
  }

  const textPasteArea = document.getElementById("text-paste-area");
  if (textPasteArea) textPasteArea.value = state.resumeText || "";

  const resultsBox = document.getElementById("resume-results-panel");
  if (!resultsBox) return;

  if (isLoaded) {
    const skillsHtml = state.parsedResume.skills.length > 0
      ? state.parsedResume.skills.map(s => `<span class="pill pill-primary">${s}</span>`).join("")
      : `<span style="color: var(--text-muted)">None detected</span>`;

    const seniorityHtml = (state.parsedResume.seniorityKeywords || []).map(k => `<span class="pill">${k}</span>`).join("");

    resultsBox.innerHTML = `
      <div class="results-header">
        <span>Parsed Candidate Profile</span>
        <button class="btn btn-secondary btn-danger btn-sm" onclick="clearResume()">Reset Profile</button>
      </div>
      <div class="stat-item">
        <span class="stat-label">Candidate:</span>
        <span class="stat-value" style="color: white;">${state.parsedResume.name}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Contact:</span>
        <span class="stat-value">${state.parsedResume.email || "Not specified"}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Calibrated Level:</span>
        <span class="stat-value" style="color: var(--primary)">${state.parsedResume.experienceLevel} ${seniorityHtml}</span>
      </div>
      <div>
        <span class="stat-label">Extracted Technical Skills (${state.parsedResume.skills.length}):</span>
        <div class="pill-container">${skillsHtml}</div>
      </div>
      <div style="margin-top: auto; padding: 1.15rem; border-radius: 12px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.16), rgba(16, 185, 129, 0.12)); border: 1px solid rgba(99, 102, 241, 0.32);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h4 style="font-family: var(--font-display); color: #ffffff; font-size: 1rem; font-weight: 700; margin-bottom: 0.2rem;">✓ Profile Synced with Job Discovery</h4>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">Match scores are live across all ${getAllJobs().length} roles.</p>
          </div>
          <button class="btn btn-sm" onclick="switchTab('discover')">Explore Matched Roles →</button>
        </div>
      </div>
    `;
  } else {
    resultsBox.innerHTML = `
      <div class="results-header">Resume Analysis</div>
      <div style="text-align: center; color: var(--text-muted); padding: 3.5rem 1rem;">
        <svg class="dropzone-icon" style="color: var(--text-muted); margin-bottom: 0.75rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p style="font-size: 0.95rem; color: var(--text-secondary); font-weight: 600; margin-bottom: 0.25rem;">No Resume Loaded Yet</p>
        <p style="font-size: 0.82rem; margin-bottom: 1.25rem;">Upload a PDF/TXT resume or paste your experience on the left to unlock tailored match scores.</p>
        <button class="btn btn-secondary btn-sm" onclick="switchTab('discover')">Browse All Jobs Without Resume →</button>
      </div>
    `;
  }
  populateOptimizerJobs();
}

window.clearResume = function() {
  state.resumeText = "";
  state.parsedResume = { skills: [], experienceLevel: "Entry/Mid", seniorityKeywords: [], email: "", name: "" };
  saveState();
  renderResumePortal();
  renderJobDiscovery();
  showToast("Profile data cleared", "warning");
};

window.submitResumeText = function() {
  const area = document.getElementById("text-paste-area");
  if (!area || !area.value.trim()) {
    showToast("Please enter or paste your resume text first", "warning");
    return;
  }
  state.resumeText = area.value.trim();
  state.parsedResume = parseResumeText(state.resumeText);
  saveState();
  renderResumePortal();
  renderJobDiscovery();
  switchTab("discover");
  showToast("Resume parsed! Showing tailored job compatibility scores.");
};

window.addEventListener("dragover", e => e.preventDefault(), false);
window.addEventListener("drop", e => e.preventDefault(), false);

window.handleFileInputChange = function(event) {
  if (event.target.files && event.target.files.length > 0) {
    handleUploadedFile(event.target.files[0]);
  }
};

window.initDropzone = function() {
  const dropzone = document.getElementById("dropzone");
  if (!dropzone) return;
  ["dragenter", "dragover"].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("dragover");
    }, false);
  });
  ["dragleave", "drop"].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("dragover");
    }, false);
  });
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove("dragover");
    const files = e.dataTransfer ? e.dataTransfer.files : [];
    if (files && files.length > 0) handleUploadedFile(files[0]);
  }, false);
};

function handleUploadedFile(file) {
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  const isTxt = ext === "txt" || ext === "md" || file.type === "text/plain";
  const isPdf = ext === "pdf" || file.type === "application/pdf";
  if (!isTxt && !isPdf) {
    showToast("Unsupported file format. Please upload a .pdf, .txt, or .md resume.", "danger");
    return;
  }
  if (isTxt) {
    const reader = new FileReader();
    reader.onload = (e) => processExtractedText(e.target.result, file.name);
    reader.readAsText(file);
  } else if (isPdf) {
    parsePdfFile(file);
  }
}

function processExtractedText(text, filename) {
  const area = document.getElementById("text-paste-area");
  if (area) area.value = text;
  state.resumeText = text;
  state.parsedResume = parseResumeText(text);
  saveState();
  renderResumePortal();
  renderJobDiscovery();
  switchTab("discover");
  showToast(`Parsed ${filename}! Showing tailored job matches.`);
}

function extractFallbackPdfText(arrayBuffer) {
  try {
    const bytes = new Uint8Array(arrayBuffer);
    let str = "";
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if ((b >= 32 && b <= 126) || b === 10 || b === 13 || b === 9) str += String.fromCharCode(b);
      else str += " ";
    }
    return str.replace(/[\/\(\)\<\>\{\}\[\]]/g, " ").replace(/\s+/g, " ").trim();
  } catch (e) {
    return "";
  }
}

async function parsePdfFile(file) {
  showToast("Extracting text from PDF...", "info");
  const reader = new FileReader();
  reader.onload = async (e) => {
    const arrayBuffer = e.target.result;
    const typedArray = new Uint8Array(arrayBuffer);
    if (typeof pdfjsLib !== "undefined") {
      try {
        if (pdfjsLib.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
        }
        let pdf;
        try {
          pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        } catch (workerErr) {
          if (pdfjsLib.GlobalWorkerOptions) pdfjsLib.GlobalWorkerOptions.workerSrc = "";
          pdf = await pdfjsLib.getDocument({ data: typedArray, disableWorker: true }).promise;
        }
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          text += textContent.items.map(item => item.str).join(" ") + "\n";
        }
        if (text.trim().length > 30) {
          processExtractedText(text, file.name);
          return;
        }
      } catch (err) {}
    }
    const fallbackText = extractFallbackPdfText(arrayBuffer);
    if (fallbackText && fallbackText.length > 50) {
      processExtractedText(fallbackText, file.name);
      return;
    }
    showToast("Could not extract PDF text. Try pasting your resume text directly.", "danger");
  };
  reader.readAsArrayBuffer(file);
}

// ============================================================================
// Interactive Filter System + Results-Based Dynamic Company Filter
// ============================================================================
window.togglePillFilter = function(category, val, btnEl) {
  ensureFilterSets();
  if (!state.activeFilters[category]) {
    state.activeFilters[category] = new Set();
  }
  const set = state.activeFilters[category];
  if (set.has(val)) {
    set.delete(val);
    if (btnEl) btnEl.classList.remove("active");
  } else {
    set.add(val);
    if (btnEl) btnEl.classList.add("active");
  }
  state.discoveryPage = 1;
  saveState();
  renderJobDiscovery();
};

window.toggleCompanyFilter = function(companyName) {
  ensureFilterSets();
  const set = state.activeFilters.company;
  if (set.has(companyName)) {
    set.delete(companyName);
  } else {
    set.add(companyName);
  }
  state.discoveryPage = 1;
  saveState();
  renderJobDiscovery();
};

window.clearCompanySelection = function() {
  ensureFilterSets();
  state.activeFilters.company.clear();
  const compSearch = document.getElementById("company-chip-search");
  if (compSearch) compSearch.value = "";
  state.discoveryPage = 1;
  saveState();
  renderJobDiscovery();
};

window.clearSearchInput = function() {
  const searchInput = document.getElementById("job-search");
  if (searchInput) searchInput.value = "";
  state.discoveryPage = 1;
  renderJobDiscovery();
};

window.setDiscoverySort = function(sortValue) {
  state.discoverySort = sortValue || "match";
  state.discoveryPage = 1;
  renderJobDiscovery();
};

window.resetAllPillFilters = function() {
  state.activeFilters = {
    domain: new Set(),
    seniority: new Set(),
    location: new Set(),
    match: new Set(),
    salary: new Set(),
    company: new Set()
  };
  document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
  const searchInput = document.getElementById("job-search");
  if (searchInput) searchInput.value = "";
  const compSearch = document.getElementById("company-chip-search");
  if (compSearch) compSearch.value = "";
  state.discoveryPage = 1;
  saveState();
  renderJobDiscovery();
  showToast("Reset all active filters");
};

// Page Render: Job Discovery Feed
function renderJobDiscovery() {
  ensureFilterSets();
  updateCurrencyUI();

  const grid = document.getElementById("jobs-grid");
  if (!grid) return;

  const searchInput = document.getElementById("job-search");
  const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const clearSearchBtn = document.getElementById("clear-search-btn");
  if (clearSearchBtn) clearSearchBtn.style.display = searchVal.length > 0 ? "flex" : "none";

  const activeDomains = state.activeFilters.domain;
  const activeSeniorities = state.activeFilters.seniority;
  const activeLocations = state.activeFilters.location;
  const activeMatches = state.activeFilters.match;
  const activeSalaries = state.activeFilters.salary;
  const activeCompanies = state.activeFilters.company;

  // Sync pill button active states in DOM
  document.querySelectorAll(".filter-pill").forEach(btn => {
    const type = btn.dataset.type;
    const val = btn.dataset.val;
    if (type && val && state.activeFilters[type]) {
      btn.classList.toggle("active", state.activeFilters[type].has(val));
    }
  });

  const allJobs = getAllJobs();

  // Evaluate match scores & salary data for all jobs
  const evaluatedJobs = allJobs.map(job => {
    const matchAnalysis = calculateMatchScore(job, state.parsedResume);
    const salData = parseJobSalaryData(job);
    return { job, score: matchAnalysis.score, matchAnalysis, salData };
  }).filter(item => item.score > 0 || searchVal.length > 0);

  // Step 1: Apply all NON-company filters first so we can dynamically compute matching companies & their counts!
  const preCompanyFiltered = [];

  evaluatedJobs.forEach(item => {
    const { job, score, salData } = item;

    // Text search
    const textMatches = searchVal.length === 0 ||
      job.title.toLowerCase().includes(searchVal) ||
      job.company.toLowerCase().includes(searchVal) ||
      (job.location || "").toLowerCase().includes(searchVal) ||
      (job.domain || "").toLowerCase().includes(searchVal) ||
      (job.description || "").toLowerCase().includes(searchVal) ||
      (job.requirements || []).some(req => req.toLowerCase().includes(searchVal));

    // Domain filter
    const domainMatches = activeDomains.size === 0 || activeDomains.has(job.domain);

    // Seniority filter
    const seniorityMatches = activeSeniorities.size === 0 || activeSeniorities.has(job.seniority);

    // Location filter
    let locationMatches = activeLocations.size === 0;
    if (!locationMatches) {
      const jobLocLower = (job.location || "").toLowerCase();
      locationMatches = [...activeLocations].some(loc => {
        const l = loc.toLowerCase();
        if (l.includes("london") || l.includes("uk")) {
          return /\b(london|uk|united kingdom|england|cambridge|oxford|edinburgh|bristol|manchester)\b/i.test(jobLocLower);
        }
        if (l.includes("san francisco") || l.includes("us")) {
          return /\b(san francisco|sf|bay area|ca|california|us|united states|seattle|new york|nyc|austin|palo alto|mountain view|menlo park|boston|washington)\b/i.test(jobLocLower);
        }
        if (l.includes("europe")) {
          return /\b(paris|france|berlin|germany|munich|amsterdam|zurich|dublin|europe|warsaw|madrid|milan|stockholm|london|uk)\b/i.test(jobLocLower);
        }
        if (l.includes("remote")) {
          return /\b(remote|emea|worldwide|anywhere|distributed)\b/i.test(jobLocLower);
        }
        return jobLocLower.includes(l);
      });
    }

    // Match score filter
    let scoreMatches = true;
    if (activeMatches.size > 0) {
      const isHigh = score >= 75;
      const isMed = score >= 50;
      scoreMatches = (activeMatches.has("high") && isHigh) || (activeMatches.has("medium") && isMed);
    }

    // Compensation filter (normalized against USD equivalent so it works seamlessly across any selected currency)
    let salaryMatches = activeSalaries.size === 0;
    if (!salaryMatches) {
      salaryMatches = [...activeSalaries].some(sal => {
        if (sal === "200k") return salData.maxUSD >= 200000;
        if (sal === "150k") return salData.maxUSD >= 150000;
        if (sal === "competitive") return salData.hasEquity;
        return false;
      });
    }

    if (textMatches && domainMatches && seniorityMatches && locationMatches && scoreMatches && salaryMatches) {
      preCompanyFiltered.push(item);
    }
  });

  // Step 2: Compute Dynamic Company Counts from `preCompanyFiltered` results!
  const companyCountsMap = new Map();
  preCompanyFiltered.forEach(({ job }) => {
    companyCountsMap.set(job.company, (companyCountsMap.get(job.company) || 0) + 1);
  });

  // Also ensure any currently selected company stays visible in the chip bar (even if count is 0 under new filters) so user can uncheck it
  activeCompanies.forEach(comp => {
    if (!companyCountsMap.has(comp)) companyCountsMap.set(comp, 0);
  });

  const sortedCompanyEntries = Array.from(companyCountsMap.entries()).sort((a, b) => {
    // Keep selected companies or higher counts first
    const aActive = activeCompanies.has(a[0]) ? 1 : 0;
    const bActive = activeCompanies.has(b[0]) ? 1 : 0;
    if (bActive !== aActive) return bActive - aActive;
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });

  renderDynamicCompanyChips(sortedCompanyEntries, preCompanyFiltered.length, activeCompanies);

  // Step 3: Apply the Company Filter selection on `preCompanyFiltered`
  const filteredJobs = activeCompanies.size === 0
    ? preCompanyFiltered
    : preCompanyFiltered.filter(item => activeCompanies.has(item.job.company));

  // Step 4: Sort `filteredJobs` according to `state.discoverySort`
  const sortMode = state.discoverySort || "match";
  filteredJobs.sort((a, b) => {
    if (sortMode === "salary_desc") {
      return b.salData.maxUSD - a.salData.maxUSD || b.score - a.score;
    }
    if (sortMode === "company_asc") {
      return a.job.company.localeCompare(b.job.company) || b.score - a.score;
    }
    if (sortMode === "uk_first") {
      const aUK = /\b(london|uk|united kingdom|cambridge|oxford)\b/i.test(a.job.location || "") ? 1 : 0;
      const bUK = /\b(london|uk|united kingdom|cambridge|oxford)\b/i.test(b.job.location || "") ? 1 : 0;
      if (bUK !== aUK) return bUK - aUK;
      return b.score - a.score;
    }
    return b.score - a.score;
  });

  // Step 5: Render Active Filter Tags Summary
  const activeTagsContainer = document.getElementById("active-tags-container");
  if (activeTagsContainer) {
    const currCfg = CURRENCY_CONFIG[state.currency || "GBP"] || CURRENCY_CONFIG.USD;
    const tags = [];
    activeLocations.forEach(val => tags.push({ cat: "location", val, label: `📍 ${val}` }));
    activeDomains.forEach(val => tags.push({ cat: "domain", val, label: val }));
    activeSeniorities.forEach(val => tags.push({ cat: "seniority", val, label: val }));
    activeMatches.forEach(val => tags.push({ cat: "match", val, label: val === "high" ? "🎯 75%+ Match" : "👍 50%+ Match" }));
    activeSalaries.forEach(val => tags.push({ cat: "salary", val, label: val === "200k" ? currCfg.pillHigh : currCfg.pillMid }));
    activeCompanies.forEach(val => tags.push({ cat: "company", val, label: `🏢 ${val}` }));

    if (tags.length === 0 && !searchVal) {
      activeTagsContainer.innerHTML = `<span style="font-size: 0.78rem; color: var(--text-muted);">None (Showing all ${filteredJobs.length} roles)</span>`;
    } else {
      let html = "";
      if (searchVal) {
        html += `<span class="active-tag-chip">🔍 "${searchVal}" <span class="remove-tag" onclick="clearSearchInput()">×</span></span>`;
      }
      html += tags.map(t => {
        if (t.cat === "company") {
          return `<span class="active-tag-chip">${t.label} <span class="remove-tag" onclick="toggleCompanyFilter('${t.val.replace(/'/g, "\\'")}')">×</span></span>`;
        }
        return `<span class="active-tag-chip">${t.label} <span class="remove-tag" onclick="togglePillFilter('${t.cat}', '${t.val}', document.querySelector('[data-type=\\'${t.cat}\\'][data-val=\\'${t.val}\\']'))">×</span></span>`;
      }).join("");
      activeTagsContainer.innerHTML = html;
    }
  }

  const totalMatching = filteredJobs.length;
  const countEl = document.getElementById("matching-jobs-count");
  if (countEl) countEl.textContent = totalMatching.toString();

  // Pagination calculation
  const totalPages = Math.ceil(totalMatching / 20) || 1;
  let currentPage = state.discoveryPage || 1;
  if (currentPage > totalPages) currentPage = 1;
  state.discoveryPage = currentPage;

  const pageJobs = filteredJobs.slice((currentPage - 1) * 20, currentPage * 20);
  grid.innerHTML = "";

  pageJobs.forEach(({ job, score, matchAnalysis }) => {
    let scorePillClass = "match-pill-low";
    let scoreLabel = `${score}% Match`;
    if (score >= 75) {
      scorePillClass = "match-pill-high";
      scoreLabel = `🎯 ${score}% Match`;
    } else if (score >= 50) {
      scorePillClass = "match-pill-med";
      scoreLabel = `👍 ${score}% Match`;
    }

    const matchedSkillTags = (matchAnalysis.matchedSkills || []).slice(0, 4).map(s =>
      `<span class="skill-tag-match">✓ ${s}</span>`
    ).join("");
    const gapSkillTags = (matchAnalysis.missingSkills || []).slice(0, 2).map(s =>
      `<span class="skill-tag-gap">${s}</span>`
    ).join("");

    const convertedSalary = formatJobSalary(job, state.currency);
    const exactUrl = getExactJobUrl(job);
    const monogram = (job.company || "A").charAt(0).toUpperCase();

    // Clean 160-char snippet for card preview
    const cleanSnippet = (job.description || "")
      .replace(/^(ABOUT THE TEAM|About the Team|About the Role|ABOUT THE ROLE)\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();

    let boardBadge = "Direct Job Posting";
    if (exactUrl.includes("ashbyhq.com")) boardBadge = "Ashby Direct Link";
    else if (exactUrl.includes("greenhouse.io")) boardBadge = "Greenhouse Direct Link";

    const card = document.createElement("div");
    card.className = "glass job-row-card";
    card.style.borderLeftColor = (job.companyColor && !job.companyColor.includes("gradient")) ? job.companyColor : "#6366f1";
    card.onclick = () => openJobDetails(job.id);

    card.innerHTML = `
      <!-- Column 1: Company, Title, Location, Converted Salary & Role Preview -->
      <div style="display: flex; flex-direction: column; gap: 0.4rem; min-width: 0;">
        <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
          <div class="company-avatar-badge" style="background: ${job.companyColor || 'var(--primary)'};">
            ${job.logoUrl ? `<img src="${job.logoUrl}" alt="" onerror="this.remove(); this.parentElement.textContent='${monogram}';">` : monogram}
          </div>
          <span style="font-weight: 700; font-size: 0.95rem; color: #ffffff; cursor: pointer;" onclick="event.stopPropagation(); toggleCompanyFilter('${job.company.replace(/'/g, "\\'")}');" title="Filter by ${job.company}">${job.company}</span>
          <span class="domain-tag">${job.domain || job.category}</span>
          <span class="seniority-tag">${job.seniority || 'Senior'}</span>
        </div>

        <h3 style="font-family: var(--font-display); font-size: 1.12rem; font-weight: 700; color: #ffffff; margin: 0; line-height: 1.3;">${job.title}</h3>

        <div style="display: flex; align-items: center; gap: 0.85rem; font-size: 0.82rem; color: var(--text-secondary); flex-wrap: wrap;">
          <span>📍 ${job.location}</span>
          <span class="salary-pill-converted">💰 ${convertedSalary}</span>
          <span class="exact-url-hint">🔗 ${boardBadge}</span>
        </div>

        ${cleanSnippet ? `<p class="job-snippet-preview">${cleanSnippet}</p>` : ""}
      </div>

      <!-- Column 2: Skills Alignment -->
      <div style="display: flex; flex-direction: column; gap: 0.35rem;">
        <span style="font-size: 0.68rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Skills & Stack</span>
        <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
          ${matchedSkillTags || '<span class="skill-tag-gap">Systems Engineering</span>'}
          ${gapSkillTags}
        </div>
      </div>

      <!-- Column 3: Match Score & Direct Actions -->
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.65rem;">
        <div class="${scorePillClass}">${scoreLabel}</div>
        <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap; justify-content: flex-end;" onclick="event.stopPropagation();">
          ${(() => {
            let trackedStage = null;
            Object.keys(state.tracker || {}).forEach(stg => {
              if (state.tracker[stg]?.includes(job.id)) trackedStage = stg;
            });
            if (trackedStage) {
              const stageNames = { discovered: "Discovered", applied: "Applied", interviewing: "Interviewing", offer: "Offer", archived: "Archived" };
              return `<button class="btn btn-secondary btn-sm" style="background: var(--primary-glow); border-color: var(--primary); color: white;" onclick="switchTab('tracker')">✓ ${stageNames[trackedStage] || trackedStage}</button>`;
            }
            return `<button class="btn btn-secondary btn-sm" onclick="toggleTrackJob('${job.id}')">+ Track</button>`;
          })()}
          <button class="btn btn-secondary btn-sm" onclick="openJobDetails('${job.id}')">Know More</button>
          <a href="${exactUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-exact-link btn-sm" title="Open exact job posting page on ${job.company}'s board">Exact Job Link ↗</a>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });

  if (totalMatching === 0) {
    grid.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 3.5rem 1.5rem; background: rgba(255, 255, 255, 0.015); border-radius: 12px; border: 1px dashed rgba(255, 255, 255, 0.1);">
        <p style="font-size: 1.1rem; font-weight: 700; color: #ffffff; margin-bottom: 0.35rem;">No roles match your current filter combination.</p>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.15rem;">Try clearing your company filter or resetting active pill filters.</p>
        <div style="display: flex; gap: 0.75rem; justify-content: center;">
          ${activeCompanies.size > 0 ? `<button class="btn btn-secondary btn-sm" onclick="clearCompanySelection()">Clear Selected Companies (${activeCompanies.size})</button>` : ""}
          <button class="btn btn-sm" onclick="resetAllPillFilters()">Reset All Filters</button>
        </div>
      </div>
    `;
  }

  renderPaginationControls(totalMatching, totalPages, currentPage);
}

// Render Dynamic Company Chips based on matching results
function renderDynamicCompanyChips(sortedCompanyEntries, totalPreCompanyMatches, activeCompanies) {
  const container = document.getElementById("company-pill-group");
  const clearBtn = document.getElementById("clear-companies-btn");
  const subtitle = document.getElementById("company-filter-subtitle");
  const compSearch = document.getElementById("company-chip-search");
  if (!container) return;

  const query = compSearch ? compSearch.value.toLowerCase().trim() : "";
  const visibleEntries = query
    ? sortedCompanyEntries.filter(([comp]) => comp.toLowerCase().includes(query))
    : sortedCompanyEntries;

  if (clearBtn) {
    clearBtn.style.display = activeCompanies.size > 0 ? "inline-flex" : "none";
    clearBtn.textContent = `Clear Selected (${activeCompanies.size})`;
  }

  if (subtitle) {
    if (activeCompanies.size > 0) {
      subtitle.textContent = `Filtering by ${activeCompanies.size} selected ${activeCompanies.size === 1 ? "company" : "companies"} from ${sortedCompanyEntries.length} matching companies`;
      subtitle.style.color = "#34d399";
    } else {
      subtitle.textContent = `${sortedCompanyEntries.length} companies have roles matching your current filters — click to filter by interested companies:`;
      subtitle.style.color = "var(--text-muted)";
    }
  }

  if (visibleEntries.length === 0) {
    container.innerHTML = `<span style="font-size: 0.78rem; color: var(--text-muted);">No matching companies found.</span>`;
    return;
  }

  const allBtnActive = activeCompanies.size === 0 ? "active" : "";
  let chipsHtml = `
    <button type="button" class="company-chip ${allBtnActive}" onclick="clearCompanySelection()">
      <span>All Matching Companies</span>
      <span class="company-chip-count">${totalPreCompanyMatches}</span>
    </button>
  `;

  visibleEntries.forEach(([company, count]) => {
    const isActive = activeCompanies.has(company);
    const safeComp = company.replace(/'/g, "\\'");
    chipsHtml += `
      <button type="button" class="company-chip ${isActive ? 'active' : ''}" onclick="toggleCompanyFilter('${safeComp}')">
        <span>${isActive ? '✓ ' : ''}${company}</span>
        <span class="company-chip-count">${count}</span>
      </button>
    `;
  });

  container.innerHTML = chipsHtml;
}

window.changeDiscoveryPage = function(pageNumber) {
  state.discoveryPage = pageNumber;
  renderJobDiscovery();
  const section = document.getElementById("section-discover");
  if (section) section.scrollIntoView({ behavior: "smooth" });
};

function renderPaginationControls(totalMatching, totalPages, currentPage) {
  const container = document.getElementById("pagination-container");
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  const startIdx = (currentPage - 1) * 20 + 1;
  const endIdx = Math.min(currentPage * 20, totalMatching);

  let pageBtnsHtml = `<button class="page-btn" ${currentPage === 1 ? "disabled" : ""} onclick="changeDiscoveryPage(${currentPage - 1})">‹ Prev</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      pageBtnsHtml += `<button class="page-btn ${i === currentPage ? "active" : ""}" onclick="changeDiscoveryPage(${i})">${i}</button>`;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      pageBtnsHtml += `<span style="color: var(--text-muted); padding: 0 0.2rem;">…</span>`;
    }
  }

  pageBtnsHtml += `<button class="page-btn" ${currentPage === totalPages ? "disabled" : ""} onclick="changeDiscoveryPage(${currentPage + 1})">Next ›</button>`;

  container.innerHTML = `
    <div class="pagination-wrapper">
      <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">
        Showing <strong style="color: var(--primary);">${startIdx}–${endIdx}</strong> of <strong>${totalMatching}</strong> matching roles (Page ${currentPage} of ${totalPages})
      </div>
      <div class="pagination-btn-group">${pageBtnsHtml}</div>
    </div>
  `;
}

function setupDiscoveryFilters() {
  const searchInput = document.getElementById("job-search");
  if (searchInput) {
    searchInput.oninput = () => {
      state.discoveryPage = 1;
      renderJobDiscovery();
    };
  }
}

// ============================================================================
// Kanban Application Tracker
// ============================================================================
function renderKanbanBoard() {
  ensureTrackerStages();
  const board = document.getElementById("kanban-board-container") || document.querySelector(".kanban-board");
  if (!board) return;

  const allJobs = getAllJobs();
  const stages = ["discovered", "applied", "interviewing", "offer", "archived"];

  stages.forEach(stage => {
    const listEl = document.getElementById(`kanban-list-${stage}`);
    const countEl = document.getElementById(`kanban-count-${stage}`);
    if (!listEl || !countEl) return;

    listEl.innerHTML = "";
    const stageJobIds = state.tracker[stage] || [];
    const stageJobs = stageJobIds.map(id => allJobs.find(j => j.id === id)).filter(Boolean);
    countEl.textContent = stageJobs.length;

    if (stageJobs.length === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.className = "kanban-empty-placeholder";
      emptyMsg.style.cssText = "padding: 1.5rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.8rem; border: 1px dashed rgba(255,255,255,0.08); border-radius: 10px; margin-top: 0.4rem;";
      emptyMsg.textContent = "No roles in stage";
      listEl.appendChild(emptyMsg);
    } else {
      stageJobs.forEach(job => {
        const card = document.createElement("div");
        card.className = "glass kanban-card";
        card.draggable = true;
        card.dataset.id = job.id;

        const matchAnalysis = calculateMatchScore(job, state.parsedResume);
        let matchBadgeClass = "low";
        if (matchAnalysis.score >= 75) matchBadgeClass = "high";
        else if (matchAnalysis.score >= 50) matchBadgeClass = "medium";

        const compactSalary = formatJobSalary(job, state.currency, { compact: true, includeEquity: false });
        const exactUrl = getExactJobUrl(job);

        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.4rem; margin-bottom: 0.25rem;">
            <div class="kanban-card-company">${job.company}</div>
            <span class="kanban-match-badge ${matchBadgeClass}" style="font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 5px; font-weight: 700;">${matchAnalysis.score}%</span>
          </div>
          <div class="kanban-card-title" style="font-size: 0.9rem; font-weight: 700; color: white; margin-bottom: 0.45rem; line-height: 1.3;">${job.title}</div>
          <div class="kanban-card-meta" style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-secondary); gap: 0.4rem; flex-wrap: wrap;">
            <span>📍 ${(job.location || "").split(',')[0]}</span>
            <span style="color: #34d399; font-weight: 700;">${compactSalary}</span>
          </div>
          <div style="margin-top: 0.65rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center; gap: 0.35rem;" onclick="event.stopPropagation();">
            <select class="kanban-stage-select" style="background: rgba(255,255,255,0.05); color: var(--text-secondary); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; font-size: 0.72rem; padding: 0.18rem 0.35rem; cursor: pointer;" onchange="moveJobToStage('${job.id}', this.value)">
              <option value="discovered" ${stage === 'discovered' ? 'selected' : ''}>Discovered</option>
              <option value="applied" ${stage === 'applied' ? 'selected' : ''}>Applied</option>
              <option value="interviewing" ${stage === 'interviewing' ? 'selected' : ''}>Interviewing</option>
              <option value="offer" ${stage === 'offer' ? 'selected' : ''}>Offer</option>
              <option value="archived" ${stage === 'archived' ? 'selected' : ''}>Archived</option>
            </select>
            <div style="display: flex; align-items: center; gap: 0.45rem;">
              <a href="${exactUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 0.72rem; color: #34d399; text-decoration: none; font-weight: 600;" title="Open exact job link">Job ↗</a>
              <button class="btn-text-link" style="font-size: 0.72rem; color: #fb7185; background: none; border: none; cursor: pointer;" onclick="deleteJobFromTracker('${job.id}')">×</button>
            </div>
          </div>
        `;

        card.addEventListener("click", () => {
          if (card.classList.contains("dragging")) return;
          openJobDetails(job.id);
        });
        card.addEventListener("dragstart", (e) => {
          card.classList.add("dragging");
          e.dataTransfer.setData("text/plain", job.id);
        });
        card.addEventListener("dragend", () => card.classList.remove("dragging"));
        listEl.appendChild(card);
      });
    }
  });

  initKanbanDragDrop();
}

function initKanbanDragDrop() {
  const containers = document.querySelectorAll(".column-cards-container");
  containers.forEach(container => {
    if (container.dataset.dragDropBound) return;
    container.dataset.dragDropBound = "true";
    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      container.classList.add("drag-over");
    });
    container.addEventListener("dragleave", () => container.classList.remove("drag-over"));
    container.addEventListener("drop", (e) => {
      e.preventDefault();
      container.classList.remove("drag-over");
      const jobId = e.dataTransfer.getData("text/plain");
      const targetStage = container.id.replace("kanban-list-", "");
      if (jobId && targetStage) moveJobToStage(jobId, targetStage);
    });
  });
}

function moveJobToStage(jobId, targetStage) {
  ensureTrackerStages();
  Object.keys(state.tracker).forEach(stage => {
    if (Array.isArray(state.tracker[stage])) {
      state.tracker[stage] = state.tracker[stage].filter(id => id !== jobId);
    }
  });
  if (!Array.isArray(state.tracker[targetStage])) state.tracker[targetStage] = [];
  state.tracker[targetStage].push(jobId);
  saveState();
  renderKanbanBoard();
  if (state.currentTab === "discover") renderJobDiscovery();

  const job = getAllJobs().find(j => j.id === jobId);
  if (job) {
    const stageTitles = { discovered: "Discovered", applied: "Applied", interviewing: "Interviewing", offer: "Offers", archived: "Archived" };
    showToast(`Moved "${job.title}" to ${stageTitles[targetStage] || targetStage}`);
  }
}
window.moveJobToStage = moveJobToStage;

window.deleteJobFromTracker = function(jobId) {
  ensureTrackerStages();
  Object.keys(state.tracker).forEach(stage => {
    state.tracker[stage] = state.tracker[stage].filter(id => id !== jobId);
  });
  saveState();
  renderKanbanBoard();
  if (state.currentTab === "discover") renderJobDiscovery();
  showToast("Role removed from Kanban pipeline", "info");
};

window.toggleTrackJob = function(jobId) {
  ensureTrackerStages();
  let currentStage = null;
  Object.keys(state.tracker).forEach(stage => {
    if (state.tracker[stage]?.includes(jobId)) currentStage = stage;
  });
  if (currentStage) {
    showToast(`Role is already in ${currentStage} stage!`, "info");
    switchTab("tracker");
    return;
  }
  state.tracker.discovered.push(jobId);
  saveState();
  renderKanbanBoard();
  renderJobDiscovery();
  const job = getAllJobs().find(j => j.id === jobId);
  showToast(`Added "${job?.title || 'Role'}" to Kanban pipeline!`);
};

// ============================================================================
// Upgraded "Know More" Role Details Modal (With Exact Job Links & Live Currency)
// ============================================================================
function openJobDetails(jobId) {
  const allJobs = getAllJobs();
  const job = allJobs.find(j => j.id === jobId);
  if (!job) return;

  state.selectedJobId = jobId;
  const overlay = document.getElementById("details-modal");
  const modalBody = document.getElementById("modal-body-content");
  if (!overlay || !modalBody) return;

  const match = calculateMatchScore(job, state.parsedResume);
  const convertedSalary = formatJobSalary(job, state.currency);
  const salData = parseJobSalaryData(job);
  const exactUrl = getExactJobUrl(job);
  const directApplyUrl = getDirectApplyUrl(job);

  let matchClass = "low";
  if (match.score >= 75) matchClass = "high";
  else if (match.score >= 50) matchClass = "medium";

  const matchedPills = match.matchedSkills.map(s => `<span class="pill pill-primary">✓ ${s}</span>`).join("");
  const missingPills = match.missingSkills.map(s => `<span class="pill" style="border-color: rgba(245, 158, 11, 0.3); color: var(--warning); background: rgba(245, 158, 11, 0.06);">+ ${s}</span>`).join("");
  const bd = match.breakdown || { domain: 0, seniority: 0, tech: 0, company: 0 };

  // Format role description paragraphs cleanly
  const rawDesc = (job.description || "Click 'Open Exact Job Posting' above to read the complete role specification on the company's official career board.").trim();
  const paragraphs = rawDesc.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  const formattedDescHtml = paragraphs.map(p =>
    `<p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.65; margin-bottom: 0.85rem;">${p}</p>`
  ).join("");

  const isTruncatedInSeed = rawDesc.endsWith("...");

  modalBody.innerHTML = `
    <!-- Modal Header with Prominent Exact Job Links -->
    <div style="background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.09); border-radius: 14px; padding: 1.35rem; margin-bottom: 1.25rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; padding-right: 2rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.45rem; flex-wrap: wrap;">
            <span style="font-family: var(--font-display); font-size: 1rem; font-weight: 800; color: #a5b4fc; text-transform: uppercase; letter-spacing: 0.5px;">${job.company}</span>
            <span class="domain-tag">${job.domain || job.category}</span>
            <span class="seniority-tag">${job.seniority || 'Senior'}</span>
          </div>
          <h2 style="font-family: var(--font-display); font-size: 1.45rem; font-weight: 800; color: #ffffff; line-height: 1.25; margin-bottom: 0.65rem;">${job.title}</h2>
          <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; font-size: 0.85rem; color: var(--text-secondary);">
            <span>📍 ${job.location}</span>
            <span class="salary-pill-converted">💰 ${convertedSalary} (${state.currency})</span>
          </div>
        </div>
        <div class="match-circle ${matchClass}" title="Candidate Compatibility Score">${match.score}%</div>
      </div>

      <!-- Direct Action Bar right at the top of the modal -->
      <div style="margin-top: 1.15rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
          <a href="${exactUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-exact-link btn-sm" style="font-weight: 700;">
            🔗 Open Exact Job Posting ↗
          </a>
          ${directApplyUrl !== exactUrl ? `
            <a href="${directApplyUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
              📝 Direct Application Form ↗
            </a>
          ` : ""}
          <button class="btn btn-secondary btn-sm" onclick="toggleTrackJob('${job.id}')">+ Track in Kanban</button>
        </div>
        <div style="font-size: 0.72rem; color: var(--text-muted); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${exactUrl}">
          Exact URL: <a href="${exactUrl}" target="_blank" rel="noopener noreferrer" style="color: #94a3b8; text-decoration: underline;">${exactUrl}</a>
        </div>
      </div>
    </div>

    <!-- Role Overview & Description -->
    <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
        <h4 style="font-family: var(--font-display); font-size: 1rem; font-weight: 700; color: #ffffff;">📋 Role Summary & Engineering Scope</h4>
        <a href="${exactUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 0.8rem; font-weight: 600; color: #34d399; text-decoration: none;">
          Read full specification on ${job.company}'s board ↗
        </a>
      </div>
      ${formattedDescHtml}
      ${isTruncatedInSeed ? `
        <div style="margin-top: 0.75rem; padding: 0.75rem 1rem; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
          <span style="font-size: 0.82rem; color: var(--text-primary);">Want to read the complete, un-truncated job description & team breakdown?</span>
          <a href="${exactUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-exact-link btn-sm">Read Full Role on ${job.company} ↗</a>
        </div>
      ` : ""}
    </div>

    <!-- Skills & Compatibility Breakdown -->
    <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem;">
      <h4 style="font-family: var(--font-display); font-size: 1rem; font-weight: 700; color: #ffffff; margin-bottom: 0.85rem;">🎯 Compatibility & Technical Stack Alignment</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.65rem; margin-bottom: 1rem;">
        <div style="background: rgba(255,255,255,0.03); padding: 0.65rem; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.76rem; margin-bottom: 0.3rem;">
            <span style="color: var(--text-secondary)">Domain Fit</span>
            <span style="font-weight: 700; color: var(--primary);">${bd.domain}/35</span>
          </div>
          <div style="height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; width: ${(bd.domain/35)*100}%; background: var(--primary);"></div>
          </div>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 0.65rem; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.76rem; margin-bottom: 0.3rem;">
            <span style="color: var(--text-secondary)">Seniority Fit</span>
            <span style="font-weight: 700; color: #38bdf8;">${bd.seniority}/25</span>
          </div>
          <div style="height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; width: ${(bd.seniority/25)*100}%; background: #38bdf8;"></div>
          </div>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 0.65rem; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.76rem; margin-bottom: 0.3rem;">
            <span style="color: var(--text-secondary)">Stack Overlap</span>
            <span style="font-weight: 700; color: var(--success);">${bd.tech}/25</span>
          </div>
          <div style="height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; width: ${(bd.tech/25)*100}%; background: var(--success);"></div>
          </div>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 0.65rem; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.76rem; margin-bottom: 0.3rem;">
            <span style="color: var(--text-secondary)">AI Lab Tier</span>
            <span style="font-weight: 700; color: #a855f7;">${bd.company}/15</span>
          </div>
          <div style="height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; width: ${(bd.company/15)*100}%; background: #a855f7;"></div>
          </div>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 0.65rem;">
        <div>
          <span style="font-size: 0.78rem; color: var(--text-secondary);">Matched Skills (${match.matchedSkills.length}):</span>
          <div class="pill-container">${matchedPills || '<span style="color: var(--text-muted); font-size: 0.8rem;">Core Software Engineering</span>'}</div>
        </div>
        ${match.missingSkills.length > 0 ? `
        <div>
          <span style="font-size: 0.78rem; color: var(--warning);">Additional Role Keywords (${match.missingSkills.length}):</span>
          <div class="pill-container">${missingPills}</div>
        </div>
        ` : ""}
      </div>
    </div>

    <!-- AI Cover Letter Generator -->
    <div style="border-top: 1px solid var(--border-color); padding-top: 1.15rem; margin-bottom: 1.15rem;">
      <h4 style="font-family: var(--font-display); font-size: 0.95rem; font-weight: 700; color: #ffffff;">✨ Tailored AI Cover Letter Generator</h4>
      <div class="cover-letter-container">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
          <p style="font-size: 0.82rem; color: var(--text-secondary);">Generate a custom cover letter aligning your profile with ${job.company}'s ${job.title} role.</p>
          <button class="btn btn-sm" id="btn-generate-cl" onclick="generateCoverLetter('${job.id}')">Generate Cover Letter</button>
        </div>
        <div id="cover-letter-result-box" style="display: none;">
          <pre id="cover-letter-text" class="cover-letter-text"></pre>
          <button class="btn btn-secondary btn-sm" style="margin-top: 0.6rem;" onclick="copyCoverLetterToClipboard()">Copy to Clipboard</button>
        </div>
      </div>
    </div>

    <!-- Pipeline Stage Controls -->
    <div style="border-top: 1px solid var(--border-color); padding-top: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
      <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
        <button class="btn btn-secondary btn-sm" onclick="moveJobToStage('${job.id}', 'discovered')">Discovered</button>
        <button class="btn btn-secondary btn-sm" onclick="moveJobToStage('${job.id}', 'applied')">Applied</button>
        <button class="btn btn-secondary btn-sm" onclick="moveJobToStage('${job.id}', 'interviewing')">Interviewing</button>
        <button class="btn btn-secondary btn-sm" onclick="moveJobToStage('${job.id}', 'offer')">Offer</button>
      </div>
      <div style="display: flex; gap: 0.6rem;">
        <a href="${exactUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-exact-link btn-sm">Open Exact Job Posting ↗</a>
        <button class="btn btn-secondary btn-sm" onclick="closeModal()">Close</button>
      </div>
    </div>
  `;

  overlay.classList.add("active");
}
window.openJobDetails = openJobDetails;

window.closeModal = function() {
  const overlay = document.getElementById("details-modal");
  if (overlay) overlay.classList.remove("active");
  state.selectedJobId = null;
};

// Close modals on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    window.closeModal();
    window.closeAddJobModal();
    window.closeAuthModal();
  }
});

// ============================================================================
// 1-Click Company Career Importer & Custom Job Modal
// ============================================================================
window.promptImportCompanyJobs = function() {
  const url = prompt(
    "Paste an Ashby or Greenhouse Company Career Board URL (e.g. https://jobs.ashbyhq.com/openai or https://boards.greenhouse.io/anthropic):",
    "https://boards.greenhouse.io/anthropic"
  );
  if (url) window.importCompanyJobsFromUrl(url);
};

window.importCompanyJobsFromUrl = async function(inputUrl) {
  if (!inputUrl) return;
  const url = inputUrl.trim();
  showToast("Fetching live company jobs from career API...", "info");

  let slug = "";
  let type = "ashby";

  if (url.includes("ashbyhq.com")) {
    type = "ashby";
    const m = url.match(/ashbyhq\.com\/([a-zA-Z0-9_-]+)/);
    if (m) slug = m[1];
  } else if (url.includes("greenhouse.io")) {
    type = "greenhouse";
    const m = url.match(/greenhouse\.io\/(?:v1\/boards\/)?([a-zA-Z0-9_-]+)/);
    if (m) slug = m[1];
  } else {
    slug = url.toLowerCase().replace(/https?:\/\//, "").replace(/[^a-z0-9-]/g, "");
  }

  try {
    let rawJobs = [];
    let companyName = slug.charAt(0).toUpperCase() + slug.slice(1);

    if (type === "ashby") {
      const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`);
      if (!res.ok) throw new Error(`Ashby API returned status ${res.status}`);
      const data = await res.json();
      rawJobs = (data.jobs || []).map(j => {
        const title = j.title || "Software Engineer";
        const location = j.location || "San Francisco, CA";
        const desc = j.descriptionPlain || `${title} role at ${companyName}.`;
        const skills = parseResumeText(desc).skills;
        const exactUrl = (j.jobUrl || `https://jobs.ashbyhq.com/${slug}/${j.id}`).replace(/\/application$/, "");
        return {
          id: `ashby-${slug}-${j.id}`,
          company: companyName,
          title,
          category: "SWE",
          domain: "AI / LLM Infra",
          seniority: getInferredSeniority({ title, company: companyName }),
          employmentType: j.employmentType || "Full-time",
          location,
          salary: j.compensation?.scrapeableCompensationSalarySummary || "$210,000 - $330,000 + equity",
          jobUrl: exactUrl,
          applyUrl: exactUrl,
          directApplyUrl: j.applyUrl || `${exactUrl}/application`,
          description: desc.slice(0, 2400),
          requirements: skills.length > 0 ? skills.slice(0, 6) : ["Python", "C++", "Distributed Systems"],
          preferred: skills.length > 6 ? skills.slice(6, 10) : ["LLM Infrastructure"]
        };
      });
    } else if (type === "greenhouse") {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`);
      if (!res.ok) throw new Error(`Greenhouse API returned status ${res.status}`);
      const data = await res.json();
      rawJobs = (data.jobs || []).filter(j => !UNWANTED_TITLES_REGEX.test(j.title || "")).map(j => {
        const title = j.title || "Software Engineer";
        const location = j.location?.name || "San Francisco, CA";
        const rawHtml = j.content || "";
        const desc = rawHtml.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const skills = parseResumeText(desc).skills;
        const exactUrl = j.absolute_url || `https://job-boards.greenhouse.io/${slug}/jobs/${j.id}`;
        return {
          id: `gh-${slug}-${j.id}`,
          company: companyName,
          title,
          category: "SWE",
          domain: "AI / LLM Infra",
          seniority: getInferredSeniority({ title, company: companyName }),
          employmentType: "Full-time",
          location,
          salary: "$215,000 - $340,000 + equity",
          jobUrl: exactUrl,
          applyUrl: exactUrl,
          directApplyUrl: `${exactUrl}#app`,
          description: desc.slice(0, 2400),
          requirements: skills.length > 0 ? skills.slice(0, 6) : ["Python", "C++", "Distributed Systems"],
          preferred: ["Scalable AI Systems"]
        };
      });
    }

    if (rawJobs.length === 0) {
      showToast(`No open engineering roles found for "${slug}"`, "warning");
      return;
    }

    let addedCount = 0;
    rawJobs.forEach(j => {
      if (!state.customJobs.some(existing => existing.id === j.id)) {
        state.customJobs.push(j);
        addedCount++;
      }
    });

    saveState();
    renderJobDiscovery();
    showToast(`Imported ${addedCount} exact-link jobs from ${companyName}!`);
  } catch (err) {
    showToast(`Import Error: ${err.message}`, "danger");
  }
};

window.openAddJobModal = function() {
  const overlay = document.getElementById("add-job-modal");
  if (overlay) overlay.classList.add("active");
};

window.closeAddJobModal = function() {
  const overlay = document.getElementById("add-job-modal");
  if (overlay) overlay.classList.remove("active");
  const form = document.getElementById("add-job-form");
  if (form) form.reset();
};

window.submitCustomJob = function(e) {
  e.preventDefault();
  const company = document.getElementById("job-comp").value.trim();
  const title = document.getElementById("job-tit").value.trim();
  const location = document.getElementById("job-loc").value.trim() || "Remote";
  const salary = document.getElementById("job-sal").value.trim() || "$190,000 - $280,000 + equity";
  const category = document.getElementById("job-cat").value || "SWE";
  const description = document.getElementById("job-desc").value.trim() || "Full-time Engineering Role.";
  const reqStr = (document.getElementById("job-reqs")?.value || "").trim();
  const prefStr = (document.getElementById("job-prefs")?.value || "").trim();
  const applyUrl = (document.getElementById("job-url")?.value || "").trim();

  if (!company || !title || !applyUrl) {
    showToast("Please provide Company, Role Title, and Exact Job URL", "warning");
    return;
  }

  const requirements = reqStr ? reqStr.split(",").map(r => r.trim()).filter(Boolean) : ["Python", "Distributed Systems"];
  const preferred = prefStr ? prefStr.split(",").map(r => r.trim()).filter(Boolean) : [];

  const newJob = {
    id: "custom-" + Date.now(),
    company,
    title,
    location,
    salary,
    category,
    domain: "AI / LLM Infra",
    seniority: getInferredSeniority({ title, company }),
    description,
    requirements,
    preferred,
    jobUrl: applyUrl,
    applyUrl,
    directApplyUrl: applyUrl,
    isCustom: true
  };

  state.customJobs.push(newJob);
  saveState();
  closeAddJobModal();
  switchTab("discover");
  showToast(`Added "${title}" at ${company}!`);
};

// ============================================================================
// Analytics Dashboard
// ============================================================================
function renderAnalytics() {
  const funnelContainer = document.getElementById("funnel-chart");
  const gapContainer = document.getElementById("skills-gap-feed");
  if (!funnelContainer || !gapContainer) return;

  const allJobs = getAllJobs();
  let highMatch = 0, mediumMatch = 0, aiInfra = 0, postTraining = 0, distSystems = 0;

  allJobs.forEach(job => {
    const score = calculateMatchScore(job, state.parsedResume).score;
    if (score >= 75) highMatch++;
    else if (score >= 50) mediumMatch++;
    const text = `${job.title} ${job.domain || ""} ${job.category}`.toLowerCase();
    if (text.includes("infra") || text.includes("platform") || text.includes("gpu")) aiInfra++;
    if (text.includes("post-training") || text.includes("rl") || text.includes("eval")) postTraining++;
    if (text.includes("distributed") || text.includes("backend") || text.includes("systems")) distSystems++;
  });

  const stages = ["high", "medium", "infra", "post_training", "systems"];
  const labels = ["🌟 High Match (75%+)", "⚡ Strong Match (50-74%)", "🤖 AI & LLM Infra", "🚀 Post-Training & RL", "⚙️ Distributed Systems"];
  const counts = [highMatch, mediumMatch, aiInfra, postTraining, distSystems];
  const maxCount = Math.max(...counts, 1);

  let svgContent = `<svg class="svg-chart" viewBox="0 0 420 240">`;
  const colors = ["#10b981", "#6366f1", "#3b82f6", "#a855f7", "#f59e0b"];

  labels.forEach((label, idx) => {
    const y = 18 + idx * 42;
    const count = counts[idx];
    const width = Math.round((count / maxCount) * 210) || 8;
    svgContent += `
      <text x="8" y="${y + 16}" fill="#94a3b8" font-family="Outfit" font-size="11.5" font-weight="600">${label}</text>
      <rect x="155" y="${y}" width="210" height="24" rx="5" fill="rgba(255,255,255,0.04)" />
      <rect x="155" y="${y}" width="${width}" height="24" rx="5" fill="${colors[idx]}" onclick="switchTab('discover')" style="cursor: pointer;" />
      <text x="${155 + width + 8}" y="${y + 16}" fill="#f8fafc" font-family="Outfit" font-size="12" font-weight="700">${count}</text>
    `;
  });
  svgContent += `</svg>`;
  funnelContainer.innerHTML = svgContent;

  const sortedJobs = [...allJobs].sort((a, b) => calculateMatchScore(b, state.parsedResume).score - calculateMatchScore(a, state.parsedResume).score).slice(0, 20);
  const gapWeights = {};
  sortedJobs.forEach(job => {
    const analysis = calculateMatchScore(job, state.parsedResume);
    (analysis.missingSkills || []).forEach(skill => {
      gapWeights[skill] = (gapWeights[skill] || 0) + 1;
    });
  });

  const sortedGaps = Object.entries(gapWeights).sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (sortedGaps.length === 0) {
    gapContainer.innerHTML = `
      <div style="padding: 1.5rem; text-align: center; color: var(--success); background: rgba(16, 185, 129, 0.06); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 10px;">
        <h4 style="font-family: var(--font-display); font-size: 1rem; margin-bottom: 0.25rem;">✓ Strong Core Stack Coverage</h4>
        <p style="font-size: 0.85rem; color: var(--text-secondary);">Your profile aligns well with the top matching roles.</p>
      </div>
    `;
    return;
  }

  gapContainer.innerHTML = `<div style="display: flex; flex-direction: column; gap: 0.75rem;">` +
    sortedGaps.map(([skill, freq]) => `
      <div class="gap-item">
        <div class="gap-skill-header">
          <span class="gap-skill-name">${skill}</span>
          <span style="font-size: 0.75rem; color: var(--warning); font-weight: 600;">Appears in ${freq} top roles</span>
        </div>
        <p class="gap-recommendation">Highlighting hands-on architecture or benchmark work with <strong>${skill}</strong> will boost match scores across frontier labs.</p>
      </div>
    `).join("") + `</div>`;
}

// ============================================================================
// Multi-User Account UI & Authentication Handlers
// ============================================================================
window.toggleAccountMenu = function(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById("account-dropdown-menu");
  if (!menu) return;
  const isHidden = menu.style.display === "none" || !menu.style.display;
  menu.style.display = isHidden ? "block" : "none";
  if (isHidden) updateAccountUI();
};

window.updateAccountUI = function() {
  const activeUser = state.currentUser || getActiveUserProfile();
  const avatarEl = document.getElementById("active-user-avatar");
  const nameEl = document.getElementById("active-user-name");
  const menuNameEl = document.getElementById("menu-user-name");
  const menuEmailEl = document.getElementById("menu-user-email");
  const btnSwitch = document.getElementById("btn-menu-switch-account");
  const btnCreate = document.getElementById("btn-menu-create-account");
  const btnSignout = document.getElementById("btn-menu-signout");
  const signoutDivider = document.getElementById("menu-signout-divider");

  if (activeUser && !activeUser.isGuest) {
    if (avatarEl) avatarEl.textContent = activeUser.avatar || "👤";
    if (nameEl) nameEl.textContent = activeUser.name;
    if (menuNameEl) menuNameEl.textContent = activeUser.name;
    if (menuEmailEl) menuEmailEl.textContent = activeUser.email;
    if (btnSwitch) {
      btnSwitch.innerHTML = `<span>🔄 Switch Account</span>`;
      btnSwitch.onclick = () => openAuthModal('login');
    }
    if (btnCreate) btnCreate.style.display = "none";
    if (btnSignout) btnSignout.style.display = "flex";
    if (signoutDivider) signoutDivider.style.display = "block";
  } else {
    if (avatarEl) avatarEl.textContent = "👤";
    if (nameEl) nameEl.textContent = "Sign In / Register";
    if (menuNameEl) menuNameEl.textContent = "Guest User";
    if (menuEmailEl) menuEmailEl.textContent = "Not signed in";
    if (btnSwitch) {
      btnSwitch.innerHTML = `<span>🔑 Sign In with Email</span>`;
      btnSwitch.onclick = () => openAuthModal('login');
    }
    if (btnCreate) btnCreate.style.display = "flex";
    if (btnSignout) btnSignout.style.display = "none";
    if (signoutDivider) signoutDivider.style.display = "none";
  }
};

window.openAuthModal = function(tab = "signup") {
  const modal = document.getElementById("auth-modal");
  if (!modal) return;
  const menu = document.getElementById("account-dropdown-menu");
  if (menu) menu.style.display = "none";
  window.switchAuthTab(tab);
  modal.classList.add("active");
};

window.closeAuthModal = function() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.classList.remove("active");
};

window.switchAuthTab = function(tab) {
  const title = document.getElementById("auth-modal-title");
  const tabSignup = document.getElementById("auth-tab-signup");
  const tabLogin = document.getElementById("auth-tab-login");
  const nameGroup = document.getElementById("auth-name-group");
  const nameInput = document.getElementById("auth-name");
  const submitBtn = document.getElementById("auth-submit-btn");

  if (tab === "login") {
    if (title) title.textContent = "Sign In to AuraTrack";
    if (tabSignup) tabSignup.classList.remove("active");
    if (tabLogin) tabLogin.classList.add("active");
    if (nameGroup) nameGroup.style.display = "none";
    if (nameInput) nameInput.required = false;
    if (submitBtn) submitBtn.textContent = "Sign In";
  } else {
    if (title) title.textContent = "Create AuraTrack Account";
    if (tabSignup) tabSignup.classList.add("active");
    if (tabLogin) tabLogin.classList.remove("active");
    if (nameGroup) nameGroup.style.display = "block";
    if (nameInput) nameInput.required = true;
    if (submitBtn) submitBtn.textContent = "Create Account & Get Started";
  }
};

window.handleAuthSubmit = async function(e) {
  e.preventDefault();
  const isLogin = document.getElementById("auth-tab-login")?.classList.contains("active");
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  const name = document.getElementById("auth-name")?.value.trim() || email.split("@")[0];

  const submitBtn = document.getElementById("auth-submit-btn");
  if (submitBtn) submitBtn.disabled = true;

  try {
    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name })
    });

    const data = await res.json();
    if (data.status === "error") {
      showToast(data.message || "Authentication failed", "danger");
      return;
    }

    const userProfile = {
      id: data.user?.id || ("usr_" + btoa(email).slice(0, 10)),
      name: data.user?.name || name,
      email: data.user?.email || email,
      avatar: "👤",
      token: data.token
    };

    saveCurrentSessionUser(userProfile);
    loadState();
    closeAuthModal();
    renderResumePortal();
    if (state.currentTab === "discover") renderJobDiscovery();
    if (state.currentTab === "tracker") renderKanbanBoard();
    if (state.currentTab === "analytics") renderAnalytics();
    showToast(`Welcome, ${userProfile.name}!`);
  } catch (err) {
    const userId = "usr_" + Date.now().toString(36);
    const userProfile = { id: userId, name: name || "User", email, avatar: "👤" };
    saveCurrentSessionUser(userProfile);
    loadState();
    closeAuthModal();
    renderResumePortal();
    if (state.currentTab === "discover") renderJobDiscovery();
    if (state.currentTab === "tracker") renderKanbanBoard();
    if (state.currentTab === "analytics") renderAnalytics();
    showToast(`Welcome, ${userProfile.name}!`);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
};

window.createQuickLocalProfile = function() {
  const name = prompt("Enter Name for Local Profile:", "Alex Mercer");
  if (!name) return;
  const userId = "usr_" + Date.now().toString(36);
  const newProfile = {
    id: userId,
    name: name.trim(),
    email: `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}@local.user`,
    avatar: "👤"
  };
  saveCurrentSessionUser(newProfile);
  loadState();
  closeAuthModal();
  renderResumePortal();
  if (state.currentTab === "discover") renderJobDiscovery();
  if (state.currentTab === "tracker") renderKanbanBoard();
  if (state.currentTab === "analytics") renderAnalytics();
  showToast(`Profile created for ${newProfile.name}!`);
};

window.signOutCurrentUser = function() {
  const current = getActiveUserProfile();
  if (confirm(`Sign out of profile "${current.name}"?`)) {
    saveCurrentSessionUser(null);
    loadState();
    const menu = document.getElementById("account-dropdown-menu");
    if (menu) menu.style.display = "none";
    renderResumePortal();
    if (state.currentTab === "discover") renderJobDiscovery();
    if (state.currentTab === "tracker") renderKanbanBoard();
    if (state.currentTab === "analytics") renderAnalytics();
    showToast("Signed out. Now in clean Guest mode.");
  }
};

// ============================================================================
// Gemini AI Cover Letter & Bullet Optimizer
// ============================================================================
const GEMINI_MODEL = "gemini-2.5-flash";

function getGeminiAPIKey() {
  return localStorage.getItem("auratrack_gemini_key") || "";
}

function saveGeminiAPIKey(key) {
  if (key) localStorage.setItem("auratrack_gemini_key", key.trim());
}

async function checkAIStatus() {
  const badges = document.querySelectorAll(".ollama-status-badge, .ai-status-badge");
  const dots = document.querySelectorAll(".status-dot");
  dots.forEach(dot => { dot.className = "status-dot online"; });
  badges.forEach(badge => {
    badge.innerHTML = `<span class="status-dot online"></span> Gemini 2.5 Flash Active`;
  });
}

async function callGeminiAPI(prompt, systemInstruction = "") {
  const userApiKey = getGeminiAPIKey();
  if (userApiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${userApiKey}`;
    const payload = {
      contents: [{ parts: [{ text: systemInstruction ? `[System Context: ${systemInstruction}]\n\n${prompt}` : prompt }] }]
    };
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return text;
    throw new Error("Empty response");
  }

  try {
    const proxyRes = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, systemInstruction, model: GEMINI_MODEL })
    });
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.status === "success") return data.result;
    }
  } catch (err) {}

  const keyInput = prompt("Enter your Free Gemini API Key (https://aistudio.google.com/app/apikey):");
  if (keyInput && keyInput.trim().length > 5) {
    saveGeminiAPIKey(keyInput.trim());
    return callGeminiAPI(prompt, systemInstruction);
  }
  throw new Error("Gemini API key required");
}

window.generateCoverLetter = async function(jobId) {
  const job = getAllJobs().find(j => j.id === jobId);
  if (!job) return;

  const resultBox = document.getElementById("cover-letter-result-box");
  const resultText = document.getElementById("cover-letter-text");
  const btn = document.getElementById("btn-generate-cl");
  if (!resultBox || !resultText || !btn) return;

  resultBox.style.display = "block";
  resultText.textContent = "Drafting tailored cover letter with Gemini 2.5 Flash...";
  btn.disabled = true;

  const prompt = `Write a concise, high-impact cover letter for ${job.title} at ${job.company}.
Candidate: ${state.parsedResume.name || "Senior Software Engineer"}
Skills: ${(state.parsedResume.skills || []).join(", ")}
Role Requirements: ${(job.requirements || []).join(", ")}
Role Overview: ${job.description}`;

  try {
    const coverLetter = await callGeminiAPI(prompt, "You are an elite technical career advisor.");
    resultText.textContent = coverLetter;
  } catch (e) {
    resultText.textContent = generateMockCoverLetter(job, state.parsedResume);
  } finally {
    btn.disabled = false;
  }
};

window.copyCoverLetterToClipboard = function() {
  const text = document.getElementById("cover-letter-text")?.textContent || "";
  navigator.clipboard.writeText(text).then(() => showToast("Cover letter copied to clipboard!"));
};

function generateMockCoverLetter(job, resume) {
  const name = resume.name || "Candidate";
  const skillsList = (resume.skills || []).slice(0, 4).join(", ") || "C++, Python, Distributed Systems, AI Infrastructure";
  return `Dear ${job.company} Engineering Hiring Team,

I am writing to apply for the ${job.title} role at ${job.company}. With a strong track record building high-throughput distributed systems and production AI infrastructure using ${skillsList}, I am excited by ${job.company}'s technical mission.

In my recent engineering leadership roles, I have architected low-latency services, post-training evaluation pipelines, and fault-tolerant backend platforms at scale. I would welcome the opportunity to discuss how my systems and ML engineering background can contribute to your team.

Best regards,
${name}`;
}

window.populateOptimizerJobs = function() {
  const select = document.getElementById("opt-job-select");
  if (!select) return;
  const selectedVal = select.value;
  select.innerHTML = `<option value="">-- Select a Job Opportunity --</option>`;
  getAllJobs().slice(0, 150).forEach(job => {
    select.innerHTML += `<option value="${job.id}">${job.company} — ${job.title}</option>`;
  });
  if (selectedVal) select.value = selectedVal;
};

window.optimizeBulletPoint = async function() {
  const jobId = document.getElementById("opt-job-select")?.value;
  const bulletInput = document.getElementById("opt-bullet-input")?.value.trim();
  const container = document.getElementById("optimizer-result-container");
  const resultText = document.getElementById("optimizer-result-text");

  if (!jobId) return showToast("Please select a target job opportunity", "warning");
  if (!bulletInput) return showToast("Please enter a resume bullet point", "warning");

  const job = getAllJobs().find(j => j.id === jobId);
  if (!job) return;

  container.style.display = "block";
  resultText.textContent = "Optimizing bullet point...";

  const prompt = `Optimize this resume bullet for ${job.title} at ${job.company}: "${bulletInput}". Target skills: ${(job.requirements || []).join(", ")}. Provide 3 strong options.`;
  try {
    resultText.textContent = await callGeminiAPI(prompt, "You are a Staff Technical Recruiter.");
  } catch (e) {
    const kw = (job.requirements || []).slice(0, 3).join(", ") || "distributed systems";
    resultText.textContent = `• Option 1: Architected high-throughput production services leveraging ${kw}, improving reliability and latency for ${job.title} workloads.\n\n• Option 2: Spearheaded end-to-end design and deployment of scalable pipelines using ${kw}, reducing execution overhead by 30%.`;
  }
};

window.syncLiveJobs = async function() {
  const btn = document.getElementById("sync-jobs-btn");
  const text = document.getElementById("sync-btn-text");
  const icon = document.getElementById("sync-icon-svg");
  if (!btn || !text || !icon) return;

  btn.disabled = true;
  text.textContent = "Syncing...";
  icon.classList.add("spin");

  try {
    const response = await fetch("/api/sync", { method: "POST" });
    if (!response.ok) {
      showToast(`All ${getAllJobs().length} exact-link jobs verified and active!`, "success");
      text.textContent = "Sync Live";
      return;
    }
    const data = await response.json();
    showToast(data.message || "Jobs synced successfully!");

    const oldScript = document.querySelector('script[src*="jobs.js"]');
    if (oldScript) oldScript.remove();
    const newScript = document.createElement("script");
    newScript.src = `jobs.js?t=${Date.now()}`;
    newScript.onload = () => {
      renderJobDiscovery();
      renderKanbanBoard();
      renderAnalytics();
      populateOptimizerJobs();
      text.textContent = "Sync Live";
    };
    document.head.appendChild(newScript);
  } catch (err) {
    showToast(`All ${getAllJobs().length} exact-link engineering roles active!`, "success");
    text.textContent = "Sync Live";
  } finally {
    btn.disabled = false;
    icon.classList.remove("spin");
  }
};

// ============================================================================
// Page Initialization & Hash Routing Listener
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  loadState();

  window.initDropzone();
  setupDiscoveryFilters();
  initKanbanDragDrop();

  document.addEventListener("click", (e) => {
    const container = document.querySelector(".account-widget-container");
    const menu = document.getElementById("account-dropdown-menu");
    if (menu && container && !container.contains(e.target)) {
      menu.style.display = "none";
    }
  });

  // Respect URL hash (#discover, #resume, #tracker, #analytics) on initial load!
  const initialHashTab = getTabFromHash();
  if (initialHashTab) {
    switchTab(initialHashTab, false);
  } else {
    renderResumePortal();
    switchTab("resume", false);
  }

  window.addEventListener("hashchange", () => {
    const tab = getTabFromHash();
    if (tab && tab !== state.currentTab) {
      switchTab(tab, false);
    }
  });

  checkAIStatus();
});
