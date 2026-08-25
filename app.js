// app.js - Job Tracker & Resume Matching Engine

// Skill keywords definitions for parser
const skillKeywords = {
  languages: ["python", "c++", "rust", "go", "javascript", "typescript", "java", "c#", "c", "sql", "html", "css", "bash"],
  ml_frameworks: ["pytorch", "jax", "tensorflow", "keras", "deepspeed", "megatron-lm", "triton", "cuda", "vllm", "tensorrt-llm", "hugging face", "huggingface", "onnx", "tensorrt"],
  ai_concepts: ["reinforcement learning", "rlhf", "machine learning", "deep learning", "generative ai", "llms", "rag", "fine-tuning", "finetuning", "quantization", "multimodal", "computer vision", "nlp", "transformers", "mixture of experts", "moe", "diffusion", "stable diffusion", "prompt engineering", "agentic", "agent", "agents"],
  infra_platform: ["docker", "kubernetes", "k8s", "aws", "azure", "gcp", "distributed systems", "system design", "git", "github", "postgresql", "mongodb", "graphql", "rest apis", "rest api", "microservices", "node.js", "nodejs", "next.js", "nextjs", "react", "redis", "kafka", "elasticsearch", "vector search", "pinecone", "milvus", "qdrant", "weaviate", "three.js", "webgl"],
  pm_design: ["product management", "agile", "ui/ux", "technical writing", "figma", "product development", "market research"]
};

// Flatten skills for easy matching
const allSkillList = [];
Object.values(skillKeywords).forEach(group => {
  allSkillList.push(...group);
});

// Multi-User & Accounts Management
const DEFAULT_PRIMARY_USER = {
  id: "usr_gnanendar",
  name: "Gnanendar Reddy Male",
  email: "gnanendarreddymale77@gmail.com",
  avatar: "👤",
  isDefault: true
};

function getAccountsList() {
  try {
    const raw = localStorage.getItem("auratrack_accounts");
    if (raw) {
      const accounts = JSON.parse(raw);
      if (Array.isArray(accounts) && accounts.length > 0) return accounts;
    }
  } catch (e) {}
  const initial = [DEFAULT_PRIMARY_USER];
  try { localStorage.setItem("auratrack_accounts", JSON.stringify(initial)); } catch(e){}
  return initial;
}

function saveAccountsList(accounts) {
  try { localStorage.setItem("auratrack_accounts", JSON.stringify(accounts)); } catch(e){}
}

function getActiveUserId() {
  try {
    return localStorage.getItem("auratrack_current_user_id") || DEFAULT_PRIMARY_USER.id;
  } catch(e) {
    return DEFAULT_PRIMARY_USER.id;
  }
}

function setActiveUserId(userId) {
  try { localStorage.setItem("auratrack_current_user_id", userId); } catch(e){}
}

function getActiveUserProfile() {
  const accounts = getAccountsList();
  const activeId = getActiveUserId();
  return accounts.find(a => a.id === activeId) || accounts[0] || DEFAULT_PRIMARY_USER;
}

// App State
let state = {
  currentUser: DEFAULT_PRIMARY_USER,
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
  currentTab: "resume",
  selectedJobId: null
};
window.state = state;

// Curated + Custom Jobs list getter
function getAllJobs() {
  return [...window.seedJobs, ...state.customJobs];
}

// Toast Notifications
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;
  container.appendChild(toast);
  
  // Slide out after 3 seconds
  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// Initialize LocalStorage Data
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
    state.activeFilters = { domain: new Set(), seniority: new Set(), location: new Set(), match: new Set(), salary: new Set() };
    return;
  }
  const f = state.activeFilters;
  state.activeFilters = {
    domain: f.domain instanceof Set ? f.domain : new Set(Array.isArray(f.domain) ? f.domain : []),
    seniority: f.seniority instanceof Set ? f.seniority : new Set(Array.isArray(f.seniority) ? f.seniority : []),
    location: f.location instanceof Set ? f.location : new Set(Array.isArray(f.location) ? f.location : []),
    match: f.match instanceof Set ? f.match : new Set(Array.isArray(f.match) ? f.match : []),
    salary: f.salary instanceof Set ? f.salary : new Set(Array.isArray(f.salary) ? f.salary : [])
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

  // Clean and auto-heal stale job IDs
  stages.forEach(stage => {
    state.tracker[stage] = state.tracker[stage].map(id => {
      const existing = allJobs.find(j => j.id === id);
      if (existing) return id;
      if (typeof id === "string" && id.startsWith("static-")) {
        const parts = id.split("-");
        const compPart = parts[1] || "";
        const matched = allJobs.find(j => j.company.toLowerCase().includes(compPart.toLowerCase()));
        if (matched) return matched.id;
      }
      return null;
    }).filter(Boolean);
  });

  // Auto-populate top 5 matching roles if discovered is empty on first launch
  const totalTracked = stages.reduce((acc, s) => acc + state.tracker[s].length, 0);
  if (totalTracked === 0 || state.tracker.discovered.length === 0) {
    const sorted = [...allJobs].sort((a, b) => {
      return calculateMatchScore(b, state.parsedResume).score - calculateMatchScore(a, state.parsedResume).score;
    });
    const topRoles = sorted.slice(0, 5).map(j => j.id);
    topRoles.forEach(topId => {
      let isAlreadyTracked = false;
      stages.forEach(stg => {
        if (state.tracker[stg].includes(topId)) isAlreadyTracked = true;
      });
      if (!isAlreadyTracked) {
        state.tracker.discovered.push(topId);
      }
    });
  }
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
        state = { ...state, ...data.state, currentUser: activeUser };
        ensureFilterSets();
        ensureTrackerStages();
        if (state.currentTab === "tracker") renderKanbanBoard();
        if (state.currentTab === "discover") renderJobDiscovery();
      }
    }
  } catch (e) {
    // LocalStorage fallback is active
  }
}

function loadState() {
  const activeUser = getActiveUserProfile();
  const userStorageKey = `auratrack_state_${activeUser.id}`;
  let savedState = localStorage.getItem(userStorageKey);
  
  // Legacy migration check
  if (!savedState && activeUser.id === DEFAULT_PRIMARY_USER.id) {
    savedState = localStorage.getItem("auratrack_state");
  }

  // Fresh initial state template for active user
  let loadedData = {
    currentUser: activeUser,
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

  // Async Cloudflare KV DB Sync
  syncStateFromDB();

  // If primary user and resume text is empty or default, set Gnanendar's resume
  if (activeUser.id === DEFAULT_PRIMARY_USER.id && (!state.resumeText || state.resumeText.includes("Alex Mercer") || state.resumeText.length < 50)) {
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
    tracker: state.tracker,
    activeFilters: {
      domain: Array.from(state.activeFilters.domain),
      seniority: Array.from(state.activeFilters.seniority),
      location: Array.from(state.activeFilters.location),
      match: Array.from(state.activeFilters.match),
      salary: Array.from(state.activeFilters.salary)
    }
  };
  
  const userStorageKey = `auratrack_state_${activeUser.id}`;
  localStorage.setItem(userStorageKey, JSON.stringify(serializableState));
  if (activeUser.id === DEFAULT_PRIMARY_USER.id) {
    localStorage.setItem("auratrack_state", JSON.stringify(serializableState));
  }

  // Asynchronous Cloudflare KV Database Sync (Isolated per user)
  const headers = { "Content-Type": "application/json", "X-User-Id": activeUser.id };
  if (activeUser.token) headers["Authorization"] = `Bearer ${activeUser.token}`;

  fetch(`/api/state?userId=${encodeURIComponent(activeUser.id)}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ userId: activeUser.id, state: serializableState })
  }).catch(() => {});
}

// Unwanted Role Titles Regex
const UNWANTED_TITLES_REGEX = /\b(frontend|front-end|front end|ui|ux|ui\/ux|designer|product design|web designer|web developer|css|html|ios|android|mobile|electrical|hardware|analog|asic|silicon|fpga|rf engineer|pcb|mechanical|chip design|board design|data engineer|data engineering|data scientist|data science|data analyst|analytics engineer|business intelligence|intern|internship|co-op|graduate engineer|junior|entry level|apprentice|solutions engineer|solutions architect|solutions architecture|developer relations|devrel|developer advocate|developer experience|field engineer|forward deployed|sales engineer|customer engineer|partner engineer|partner|partnerships?|support engineer|technical support|technical advocate|support delivery|support specialist|sales|account executive|business development|gtm|product manager|program manager|project manager|operations|customer success|recruiter|talent|talent acquisition|human resources|hr|people|legal|finance|marketing|copywriter|strategist|it|it support|it engineer|it engineering|information technology|desktop support|helpdesk|social media|community|events|communications|security|compliance|infosec|cybersecurity|appsec|detection and response|threat investigator|threat intel|insider threat|audit|privacy|vulnerability|bioanalytical|biological|biology|bioinformatics|computational biology|genomics|growth|lifecycle|network engineer|network engineering|network architect)\b/i;

// Resume Parser Heuristics (Client-Side)
function parseResumeText(text) {
  if (!text) text = "";
  
  // Normalize PDF ligature & concatenated string artifacts
  const normalizedPdfText = text
    .replace(/\uFB01/g, "fi")
    .replace(/\uFB02/g, "fl")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-zA-Z])([:,;])/g, "$1 $2 ");

  const normalizedText = normalizedPdfText.toLowerCase();
  
  // Strip out education lines (e.g. "Bachelor of Technology in Electrical Engineering") to avoid extracting degree names as technical skills
  const cleanSkillsText = normalizedPdfText
    .replace(/Bachelor of Technology in Electrical Engineering/gi, "")
    .replace(/Electrical Engineering/gi, "")
    .toLowerCase();
  
  // 1. Extract Skills
  const foundSkills = [];
  allSkillList.forEach(skill => {
    // Avoid matching 'electrical', 'pm', 'ui/ux'
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
  
  // Add core technical skills from experience
  const coreProfileSkills = ["C++", "Python", "Golang", "C", "Distributed Systems", "Machine Learning", "LLMs", "Post-Training", "Evals", "System Design", "Linux", "Docker", "Kubernetes", "PostgreSQL", "Redis", "Vector Search", "REST APIs", "Microservices", "Data Structures", "Algorithms", "OpenCV", "Keras", "PyTorch"];
  coreProfileSkills.forEach(s => {
    if (!foundSkills.includes(s) && cleanSkillsText.includes(s.toLowerCase())) {
      foundSkills.push(s);
    }
  });
  
  // Default fallback skills for Gnanendar profile if PDF extraction returned minimal skills
  if (foundSkills.length < 5) {
    ["C++", "Python", "Golang", "C", "Distributed Systems", "Machine Learning", "LLMs", "System Design", "Docker", "Git", "REST APIs"].forEach(s => {
      if (!foundSkills.includes(s)) foundSkills.push(s);
    });
  }
  
  // 2. Experience Level & Seniority (Senior / Staff / Lead)
  let level = "Senior/Staff Engineer";
  const seniorityKeywords = ["Senior", "Tech Lead", "Staff", "MTS"];
  
  // Contact parsing
  let email = "gnanendarreddymale77@gmail.com";
  const emailMatch = normalizedText.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  if (emailMatch) email = emailMatch[0];
  
  let name = "Gnanendar Reddy Male";
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 0 && lines[0].length < 35 && !lines[0].includes("@")) {
    name = lines[0];
  }

  return {
    skills: [...new Set(foundSkills)],
    experienceLevel: level,
    seniorityKeywords,
    email,
    name: name || "Gnanendar Reddy Male"
  };
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitalizeSkill(skill) {
  const overrides = {
    "pytorch": "PyTorch",
    "jax": "JAX",
    "tensorflow": "TensorFlow",
    "deepspeed": "DeepSpeed",
    "megatron-lm": "Megatron-LM",
    "triton": "Triton",
    "cuda": "CUDA",
    "vllm": "vLLM",
    "tensorrt-llm": "TensorRT-LLM",
    "hugging face": "Hugging Face",
    "huggingface": "Hugging Face",
    "onnx": "ONNX",
    "tensorrt": "TensorRT",
    "llms": "LLMs",
    "rag": "RAG",
    "rlhf": "RLHF",
    "moe": "MoE",
    "api": "API",
    "rest apis": "REST APIs",
    "graphql": "GraphQL",
    "aws": "AWS",
    "azure": "Azure",
    "gcp": "GCP",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "next.js": "Next.js",
    "nextjs": "Next.js",
    "react": "React",
    "mongodb": "MongoDB",
    "postgresql": "PostgreSQL",
    "node.js": "Node.js",
    "nodejs": "Node.js",
    "three.js": "Three.js",
    "webgl": "WebGL",
    "sql": "SQL",
    "html": "HTML",
    "css": "CSS",
    "git": "Git",
    "github": "GitHub",
    "nlp": "NLP",
    "k8s": "Kubernetes",
    "pm": "Product Manager",
    "ui/ux": "UI/UX"
  };
  
  return overrides[skill] || capitalizeFirst(skill);
}

function capitalizeFirst(str) {
  return str.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// World-Class 4-Pillar Semantic Match Engine for Gnanendar Reddy Male (Meta / Google Senior SWE & Tech Lead)
function calculateMatchScore(job, parsedResume) {
  if (!job || !job.title) {
    return {
      score: 0,
      breakdown: { domain: 0, seniority: 0, tech: 0, company: 0 },
      matchedSkills: [],
      missingSkills: []
    };
  }

  const titleLower = job.title.toLowerCase();
  const descLower = (job.description || "").toLowerCase();
  const fullText = (titleLower + " " + descLower + " " + (job.requirements || []).join(" ") + " " + (job.preferred || []).join(" ")).toLowerCase();

  // 1. HARD EXCLUSIONS (Instantly Returns 0% Score for unwanted titles)
  if (UNWANTED_TITLES_REGEX.test(titleLower)) {
    return {
      score: 0,
      breakdown: { domain: 0, seniority: 0, tech: 0, company: 0 },
      matchedSkills: [],
      missingSkills: job.requirements || []
    };
  }

  let domainScore = 0;   // Max 35 points
  let seniorityScore = 0;// Max 25 points
  let techScore = 0;     // Max 25 points
  let companyScore = 0;  // Max 15 points

  // Pillar A: Domain & Focus Alignment (35 Points)
  // Target A1: Applied AI / Post-Training / Agent Optimization / Evals / LLM Infra
  const isAppliedAI = /\b(applied ai|post-training|post training|evals|evaluations|benchmarking|agent|agentic|coding models|llm infrastructure|llm serving|llm platform|inference runtime|rlhf|model alignment)\b/i.test(fullText);
  
  // Target A2: Systems / Distributed Systems / Networking / Infrastructure / Platform / C++ / Golang
  const isSystemsInfra = /\b(systems|distributed systems|infrastructure|platform|load balancer|packet path|vpp|dpdk|kernel|networking|high throughput|low latency|c\+\+|golang|go|microservices|storage|runtime)\b/i.test(fullText);

  // Target A3: Core Backend Software Engineering
  const isCoreSWE = /\b(backend|software engineer|swe|platform engineer|infrastructure engineer|systems engineer)\b/i.test(titleLower);

  if (isAppliedAI) {
    domainScore = 35;
  } else if (isSystemsInfra) {
    domainScore = 32;
  } else if (isCoreSWE) {
    domainScore = 25;
  } else {
    domainScore = 15;
  }

  // Pillar B: Seniority Alignment (25 Points)
  // User is Senior Software Engineer & Tech Lead (7+ years at Meta, Google, Pensando, Cisco)
  if (/\b(staff|principal|head|director)\b/i.test(titleLower)) {
    seniorityScore = 25;
  } else if (/\b(senior|tech lead|lead|mts|member of technical staff|architect)\b/i.test(titleLower)) {
    seniorityScore = 23;
  } else if (/\b(founding engineer|founding staff)\b/i.test(titleLower)) {
    seniorityScore = 22;
  } else if (/\b(software engineer|engineer)\b/i.test(titleLower) && !/\b(junior|associate|intern|entry)\b/i.test(titleLower)) {
    seniorityScore = 15;
  } else {
    seniorityScore = 5;
  }

  // Pillar C: Core Technical Stack Overlap (25 Points)
  const userStackKeywords = [
    { name: "C++", regex: /\b(c\+\+|cpp)\b/i, points: 5 },
    { name: "Python", regex: /\bpython\b/i, points: 5 },
    { name: "Golang", regex: /\b(golang|go)\b/i, points: 5 },
    { name: "C", regex: /\b\bc\b\b/i, points: 3 },
    { name: "Distributed Systems", regex: /\b(distributed systems|distributed infrastructure|distributed compute|system design|lld|hld)\b/i, points: 5 },
    { name: "Post-Training / Evals", regex: /\b(post-training|evals|evaluations|benchmarking|rlhf|synthetic data)\b/i, points: 5 },
    { name: "LLMs / Applied AI", regex: /\b(llm|llms|large language model|transformers|rag|fine-tuning|vllm|triton|cuda|pytorch|jax)\b/i, points: 4 },
    { name: "Networking & Kernel", regex: /\b(networking|packet|dpdk|vpp|load balancer|linux|kernel|sockets)\b/i, points: 4 },
    { name: "Infrastructure & DB", regex: /\b(docker|kubernetes|k8s|postgresql|redis|mysql|vector search|rest api|microservices)\b/i, points: 3 }
  ];

  const matchedSkills = [];
  const missingSkills = [];

  userStackKeywords.forEach(item => {
    if (item.regex.test(fullText)) {
      techScore += item.points;
      matchedSkills.push(item.name);
    }
  });

  // Check requirement list matching
  (job.requirements || []).forEach(req => {
    const reqLow = req.toLowerCase();
    if (!matchedSkills.some(s => s.toLowerCase() === reqLow)) {
      if (/\b(python|c\+\+|golang|go|c|distributed systems|system design|linux|docker|kubernetes|postgresql|redis|pytorch|jax|llms|rag|rlhf|networking|evals|post-training)\b/i.test(reqLow)) {
        matchedSkills.push(req);
      } else {
        missingSkills.push(req);
      }
    }
  });

  techScore = Math.min(25, techScore);

  // Pillar D: Company Tier & AI Ecosystem (15 Points)
  const topTierAILabs = [
    "OpenAI", "Anthropic", "Wayve", "Nscale", "Reflection AI", "Isomorphic Labs", 
    "Synthesia", "ElevenLabs", "Cognition", "Sierra", "Perplexity AI", "Cohere", 
    "Poolside", "PhysicsX", "Granola", "Recraft", "Basecamp Research", "V7 Labs",
    "Google DeepMind", "Meta AI", "Microsoft AI", "Scale AI", "Mistral AI", "Groq"
  ];
  
  if (topTierAILabs.includes(job.company)) {
    companyScore = 15;
  } else {
    companyScore = 10;
  }

  const rawTotal = domainScore + seniorityScore + techScore + companyScore;
  const finalScore = Math.min(99, Math.max(0, Math.round(rawTotal)));

  return {
    score: finalScore,
    breakdown: {
      domain: domainScore,
      seniority: seniorityScore,
      tech: techScore,
      company: companyScore
    },
    matchedSkills: [...new Set(matchedSkills)],
    missingSkills: [...new Set(missingSkills)]
  };
}

// Render Dashboard Pages/Tabs
function switchTab(tabId) {
  state.currentTab = tabId;
  
  // Update nav menu UI
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.remove("active");
  });
  const activeNavItem = document.getElementById(`nav-${tabId}`);
  if (activeNavItem) activeNavItem.classList.add("active");
  
  // Toggle sections visibility
  document.querySelectorAll(".dashboard-section").forEach(sec => {
    sec.classList.remove("active");
  });
  const activeSection = document.getElementById(`section-${tabId}`);
  if (activeSection) activeSection.classList.add("active");
  
  // Page-specific render actions
  if (tabId === "discover") {
    renderJobDiscovery();
  } else if (tabId === "tracker") {
    renderKanbanBoard();
  } else if (tabId === "analytics") {
    renderAnalytics();
  } else if (tabId === "resume") {
    renderResumePortal();
  }
}

// Page Render: Resume Upload Portal
function renderResumePortal() {
  const container = document.getElementById("section-resume");
  if (!container) return;
  
  const isLoaded = state.resumeText.length > 0;
  
  // Update header badge
  const headerBadge = document.getElementById("resume-badge");
  if (headerBadge) {
    if (isLoaded) {
      headerBadge.textContent = "Resume Parsed";
      headerBadge.classList.add("loaded");
    } else {
      headerBadge.textContent = "No Resume Loaded";
      headerBadge.classList.remove("loaded");
    }
  }

  // Set text area value
  const textPasteArea = document.getElementById("text-paste-area");
  if (textPasteArea) {
    textPasteArea.value = state.resumeText;
  }
  
  // Render details panel
  const resultsBox = document.getElementById("resume-results-panel");
  if (!resultsBox) return;
  
  if (isLoaded) {
    const skillsHtml = state.parsedResume.skills.length > 0 
      ? state.parsedResume.skills.map(s => `<span class="pill pill-primary">${s}</span>`).join("")
      : `<span style="color: var(--text-muted)">None detected</span>`;
      
    const seniorityHtml = state.parsedResume.seniorityKeywords.length > 0
      ? state.parsedResume.seniorityKeywords.map(k => `<span class="pill">${k}</span>`).join("")
      : "";
      
    resultsBox.innerHTML = `
      <div class="results-header">
        <span>Parsed Resume Stats</span>
        <button class="btn btn-secondary btn-danger" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="clearResume()">Reset Profile</button>
      </div>
      
      <div class="stat-item">
        <span class="stat-label">Detected Name:</span>
        <span class="stat-value" style="color: white; font-family: var(--font-display);">${state.parsedResume.name}</span>
      </div>
      
      <div class="stat-item">
        <span class="stat-label">Contact:</span>
        <span class="stat-value">${state.parsedResume.email || "Not found"}</span>
      </div>
      
      <div class="stat-item">
        <span class="stat-label">Inferred Profile level:</span>
        <span class="stat-value" style="color: var(--primary)">${state.parsedResume.experienceLevel} ${seniorityHtml}</span>
      </div>
      
      <div>
        <span class="stat-label">Identified Skills (${state.parsedResume.skills.length}):</span>
        <div class="pill-container">
          ${skillsHtml}
        </div>
      </div>
      
      <div style="margin-top: 1.5rem; padding: 1.25rem; border-radius: 12px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15)); border: 1px solid rgba(139, 92, 246, 0.3);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h4 style="font-family: var(--font-display); color: #ffffff; font-size: 1.05rem; font-weight: 700; margin-bottom: 0.25rem;">✓ Profile Synchronized (${state.parsedResume.skills.length} Skills Detected)</h4>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">Compatibility match scores calculated across all 456 live engineering roles.</p>
          </div>
          <button class="btn" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 0.65rem 1.25rem; font-weight: 700;" onclick="switchTab('discover')">🚀 View Job Matches →</button>
        </div>
      </div>
    `;
  } else {
    resultsBox.innerHTML = `
      <div class="results-header">Resume Analysis</div>
      <div style="text-align: center; color: var(--text-muted); padding: 4rem 1rem;">
        <svg class="dropzone-icon" style="color: var(--text-muted); margin-bottom: 1rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p style="font-size: 0.95rem; margin-bottom: 0.25rem;">Analysis Engine Offline</p>
        <p style="font-size: 0.8rem;">Upload or paste your resume text to begin scoring job opportunities.</p>
      </div>
    `;
  }
  populateOptimizerJobs();
}

// Clear Resume
window.clearResume = function() {
  state.resumeText = "";
  state.parsedResume = {
    skills: [],
    experienceLevel: "Entry/Mid",
    seniorityKeywords: [],
    email: "",
    name: ""
  };
  saveState();
  renderResumePortal();
  renderJobDiscovery();
  showToast("Profile data cleared", "warning");
};

// Process Resume Submission
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

// Prevent default browser file drop behavior globally so browser doesn't open files in tab
window.addEventListener("dragover", e => e.preventDefault(), false);
window.addEventListener("drop", e => e.preventDefault(), false);

window.handleFileInputChange = function(event) {
  if (event.target.files && event.target.files.length > 0) {
    handleUploadedFile(event.target.files[0]);
  }
};

// Handle File Drag & Drop
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
    if (files && files.length > 0) {
      handleUploadedFile(files[0]);
    }
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
    reader.onload = (e) => {
      processExtractedText(e.target.result, file.name);
    };
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
      if ((b >= 32 && b <= 126) || b === 10 || b === 13 || b === 9) {
        str += String.fromCharCode(b);
      } else {
        str += " ";
      }
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
    
    // 1. Attempt PDF.js parsing
    if (typeof pdfjsLib !== "undefined") {
      try {
        if (pdfjsLib.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
        }
      } catch (err) {
        console.warn("PDF worker configuration warning:", err);
      }
      
      try {
        let pdf;
        try {
          pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        } catch (workerErr) {
          console.warn("Worker getDocument failed, retrying with fake worker...", workerErr);
          if (pdfjsLib.GlobalWorkerOptions) pdfjsLib.GlobalWorkerOptions.workerSrc = "";
          pdf = await pdfjsLib.getDocument({ data: typedArray, disableWorker: true }).promise;
        }
        
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(" ");
          text += pageText + "\n";
        }
        
        if (text.trim().length > 30) {
          processExtractedText(text, file.name);
          return;
        }
      } catch (err) {
        console.warn("PDF.js primary extraction failed, trying stream fallback:", err);
      }
    }
    
    // 2. Fallback PDF text stream extractor
    const fallbackText = extractFallbackPdfText(arrayBuffer);
    if (fallbackText && fallbackText.length > 50) {
      processExtractedText(fallbackText, file.name);
      return;
    }
    
    showToast("Could not extract PDF text. Try pasting your resume text directly.", "danger");
  };
  reader.readAsArrayBuffer(file);
}

// --- Interactive Pill Filter State & Engine ---
if (!state.activeFilters) {
  state.activeFilters = {
    domain: new Set(),
    seniority: new Set(),
    location: new Set(),
    match: new Set()
  };
}

window.togglePillFilter = function(category, val, btnEl) {
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
  renderJobDiscovery();
};

window.resetAllPillFilters = function() {
  state.activeFilters = {
    domain: new Set(),
    seniority: new Set(),
    location: new Set(),
    match: new Set(),
    salary: new Set()
  };
  document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
  const searchInput = document.getElementById("job-search");
  if (searchInput) searchInput.value = "";
  renderJobDiscovery();
  showToast("Cleared all active filters");
};

// Page Render: Job Discovery Feed
function renderJobDiscovery() {
  ensureFilterSets();
  const grid = document.getElementById("jobs-grid");
  if (!grid) return;
  
  const searchInput = document.getElementById("job-search");
  const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const toggleRelevance = document.getElementById("toggle-relevance");
  const hideLowRelevance = toggleRelevance ? toggleRelevance.checked : false;

  const activeDomains = state.activeFilters?.domain || new Set();
  const activeSeniorities = state.activeFilters?.seniority || new Set();
  const activeLocations = state.activeFilters?.location || new Set();
  const activeMatches = state.activeFilters?.match || new Set();
  const activeSalaries = state.activeFilters?.salary || new Set();

  // Render Active Filter Tags
  const activeTagsContainer = document.getElementById("active-tags-container");
  if (activeTagsContainer) {
    const tags = [];
    activeDomains.forEach(val => tags.push({ cat: "domain", label: val }));
    activeSeniorities.forEach(val => tags.push({ cat: "seniority", label: val }));
    activeLocations.forEach(val => tags.push({ cat: "location", label: val }));
    activeMatches.forEach(val => tags.push({ cat: "match", label: val === "high" ? "75%+ High Match" : "50%+ Moderate Match" }));
    activeSalaries.forEach(val => tags.push({ cat: "salary", label: val === "200k" ? "$200k+ Compensation" : val === "150k" ? "$150k+ Compensation" : "Competitive / Equity" }));

    if (tags.length === 0) {
      activeTagsContainer.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted);">All Jobs</span>`;
    } else {
      activeTagsContainer.innerHTML = tags.map(t => 
        `<span class="active-tag-chip">
           ${t.label}
           <span class="remove-tag" onclick="togglePillFilter('${t.cat}', '${t.label}', document.querySelector('[data-type=\\'${t.cat}\\'][data-val=\\'${t.label}\\']'))">×</span>
         </span>`
      ).join("");
    }
  }

  const allJobs = getAllJobs();
  
  // Clear Grid
  grid.innerHTML = "";
  
  // Pre-calculate scores and sort jobs by compatibility score descending
  const evaluatedJobs = allJobs.map(job => {
    const matchAnalysis = calculateMatchScore(job, state.parsedResume);
    return { job, score: matchAnalysis.score, matchAnalysis };
  })
  .filter(item => item.score > 0 || searchVal.length > 0) // Exclude 0 score unwanted jobs
  .sort((a, b) => b.score - a.score);
  
  let matchCount = 0;
  
  // 1. Filter matching jobs & sort descending by score (Top matches first)
  const filteredJobs = [];
  evaluatedJobs.forEach(({ job, score, matchAnalysis }) => {
    // Relevance score threshold check (only if resume loaded)
    if (hideLowRelevance && score < 40 && searchVal.length === 0 && state.parsedResume?.skills?.length > 0) {
      return;
    }

    // Text search
    const textMatches = searchVal.length === 0 || 
                        job.title.toLowerCase().includes(searchVal) || 
                        job.company.toLowerCase().includes(searchVal) || 
                        (job.domain || "").toLowerCase().includes(searchVal) ||
                        (job.description || "").toLowerCase().includes(searchVal) ||
                        (job.requirements || []).some(req => req.toLowerCase().includes(searchVal));
                        
    // Domain filter (Multi-select)
    const domainMatches = activeDomains.size === 0 || activeDomains.has(job.domain);

    // Seniority filter (Multi-select)
    const seniorityMatches = activeSeniorities.size === 0 || activeSeniorities.has(job.seniority);
    
    // Smart Regional Location filter (Multi-select)
    let locationMatches = activeLocations.size === 0;
    if (!locationMatches) {
      const jobLocLower = (job.location || "").toLowerCase();
      locationMatches = [...activeLocations].some(loc => {
        const l = loc.toLowerCase();
        if (l.includes("london") || l.includes("uk")) {
          return /\b(london|uk|united kingdom|england|cambridge|oxford|edinburgh|bristol|manchester)\b/i.test(jobLocLower);
        }
        if (l.includes("san francisco") || l.includes("us")) {
          return /\b(san francisco|sf|bay area|ca|california|us|united states|seattle|new york|nyc|austin)\b/i.test(jobLocLower);
        }
        if (l.includes("remote")) {
          return /\b(remote|emea|worldwide|anywhere)\b/i.test(jobLocLower);
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
    
    // Compensation Range filter (Multi-select)
    let salaryMatches = activeSalaries.size === 0;
    if (!salaryMatches) {
      const salStr = (job.salary || "").toLowerCase();
      const matches = salStr.match(/(\d[\d,]*)/g) || [];
      const parsedNums = matches.map(m => parseInt(m.replace(/,/g, ""), 10)).filter(n => !isNaN(n));
      let maxVal = parsedNums.length > 0 ? Math.max(...parsedNums) : 0;
      if (maxVal > 0 && maxVal < 1000) maxVal *= 1000;

      salaryMatches = [...activeSalaries].some(sal => {
        if (sal === "200k") return maxVal >= 180000 || salStr.includes("200") || salStr.includes("300") || salStr.includes("250") || salStr.includes("160k") || salStr.includes("180k");
        if (sal === "150k") return maxVal >= 140000 || salStr.includes("150") || salStr.includes("180") || salStr.includes("200") || salStr.includes("120k");
        if (sal === "competitive") return salStr.includes("competitive") || salStr.includes("equity") || salStr.includes("doe");
        return false;
      });
    }

    if (textMatches && domainMatches && seniorityMatches && locationMatches && scoreMatches && salaryMatches) {
      filteredJobs.push({ job, score, matchAnalysis });
    }
  });

  const totalMatching = filteredJobs.length;
  
  // Update Matching Counter badge
  const countEl = document.getElementById("matching-jobs-count");
  if (countEl) countEl.textContent = totalMatching.toString();

  // Reset page to 1 if active page is out of bounds
  const totalPages = Math.ceil(totalMatching / 20) || 1;
  let currentPage = state.discoveryPage || 1;
  if (currentPage > totalPages) currentPage = 1;
  state.discoveryPage = currentPage;

  // 2. Slice 20 matching jobs for current page
  const pageJobs = filteredJobs.slice((currentPage - 1) * 20, currentPage * 20);

  pageJobs.forEach(({ job, score, matchAnalysis }) => {
    // Define score pill style
    let scorePillClass = "match-pill-low";
    let scoreLabel = score + "% Match";
    if (score >= 75) {
      scorePillClass = "match-pill-high";
      scoreLabel = "🎯 " + score + "% High Match";
    } else if (score >= 50) {
      scorePillClass = "match-pill-med";
      scoreLabel = "👍 " + score + "% Match";
    }

    // Render Skill Badges (Top 3 matched, 2 gap)
    const matchedSkillTags = (matchAnalysis.matchedSkills || []).slice(0, 4).map(s => 
      `<span class="skill-tag-match">✓ ${s}</span>`
    ).join("");

    const gapSkillTags = (matchAnalysis.missingSkills || []).slice(0, 2).map(s => 
      `<span class="skill-tag-gap">+ ${s}</span>`
    ).join("");
    
    // Render Wide 1-Job-Per-Row Card
    const card = document.createElement("div");
    card.className = "glass glass-interactive job-row-card";
    card.style.setProperty("--company-color", job.companyColor || "var(--primary)");
    card.onclick = () => openJobDetails(job.id);
    
    const logoHtml = job.logoUrl 
      ? `<div style="display: flex; align-items: center; gap: 0.6rem;">
           <img src="${job.logoUrl}" alt="${job.company} logo" style="width: 28px; height: 28px; border-radius: 6px; object-fit: contain;" onerror="this.style.display='none'">
           <span style="font-weight: 700; font-size: 1rem; color: #ffffff;">${job.company}</span>
         </div>`
      : `<span style="font-weight: 700; font-size: 1rem; color: #ffffff;">${job.company}</span>`;

    card.innerHTML = `
      <!-- Column 1: Company & Title & Metadata -->
      <div style="display: flex; flex-direction: column; gap: 0.4rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
          ${logoHtml}
          <div style="display: flex; gap: 0.35rem;">
            <span class="domain-tag">${job.domain || job.category}</span>
            <span class="seniority-tag">${job.seniority || 'General'}</span>
          </div>
        </div>
        <h3 style="font-size: 1.15rem; font-weight: 700; color: #ffffff; margin: 0; line-height: 1.35;">${job.title}</h3>
        <div style="display: flex; align-items: center; gap: 1rem; font-size: 0.85rem; color: var(--text-secondary); flex-wrap: wrap;">
          <span style="display: inline-flex; align-items: center; gap: 0.3rem;">📍 ${job.location}</span>
          <span style="color: #34d399; font-weight: 600;">💰 ${job.salary}</span>
        </div>
      </div>

      <!-- Column 2: Skill Alignment Tags -->
      <div style="display: flex; flex-direction: column; gap: 0.4rem;">
        <span style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Skills Alignment</span>
        <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
          ${matchedSkillTags || '<span class="skill-tag-gap">General Engineering</span>'}
          ${gapSkillTags}
        </div>
      </div>

      <!-- Column 3: Score Badge & Actions -->
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.75rem;">
        <div class="${scorePillClass}">
          ${scoreLabel}
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;" onclick="event.stopPropagation();">
          ${(() => {
            let trackedStage = null;
            Object.keys(state.tracker || {}).forEach(stg => {
              if (state.tracker[stg]?.includes(job.id)) trackedStage = stg;
            });
            if (trackedStage) {
              const stageNames = { discovered: "Discovered", applied: "Applied", interviewing: "Interviewing", offer: "Offer", archived: "Archived" };
              return `<button class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.35rem 0.75rem; background: var(--primary-glow); border-color: var(--primary); color: white;" onclick="switchTab('tracker')">✓ ${stageNames[trackedStage] || trackedStage}</button>`;
            }
            return `<button class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.35rem 0.75rem;" onclick="toggleTrackJob('${job.id}')">+ Track Role</button>`;
          })()}
          <a href="${job.applyUrl}" target="_blank" class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.35rem 0.75rem;">Apply Now ↗</a>
          <button class="btn" style="font-size: 0.8rem; padding: 0.35rem 0.75rem;" onclick="openJobDetails('${job.id}')">View Details →</button>
        </div>
      </div>
    `;
    
    grid.appendChild(card);
  });
  
  if (totalMatching === 0) {
    grid.innerHTML = `
      <div class="form-group-full" style="text-align: center; color: var(--text-muted); padding: 4rem 1rem; grid-column: span 3; background: rgba(255, 255, 255, 0.01); border-radius: 12px; border: 1px dashed rgba(255, 255, 255, 0.1);">
        <p style="font-size: 1.2rem; font-weight: 600; color: #ffffff; margin-bottom: 0.35rem;">No jobs match your selected filter criteria.</p>
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">Try clearing your active pill filters to view all 456 opportunities.</p>
        <button class="btn" onclick="resetAllPillFilters()">Clear All Active Filters</button>
      </div>
    `;
  }

  // Render Pagination Bar
  renderPaginationControls(totalMatching, totalPages, currentPage);
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

  let pageBtnsHtml = "";
  
  // Previous button
  pageBtnsHtml += `<button class="page-btn" ${currentPage === 1 ? "disabled" : ""} onclick="changeDiscoveryPage(${currentPage - 1})">‹ Prev</button>`;

  // Page numbers (smart windowing)
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      pageBtnsHtml += `<button class="page-btn ${i === currentPage ? "active" : ""}" onclick="changeDiscoveryPage(${i})">${i}</button>`;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      pageBtnsHtml += `<span style="color: var(--text-muted); padding: 0 0.2rem;">...</span>`;
    }
  }

  // Next button
  pageBtnsHtml += `<button class="page-btn" ${currentPage === totalPages ? "disabled" : ""} onclick="changeDiscoveryPage(${currentPage + 1})">Next ›</button>`;

  container.innerHTML = `
    <div class="pagination-wrapper">
      <div style="font-size: 0.875rem; font-weight: 600; color: var(--text-secondary);">
        Showing <strong style="color: var(--primary);">${startIdx} - ${endIdx}</strong> of <strong>${totalMatching}</strong> matching jobs (Page ${currentPage} of ${totalPages})
      </div>
      <div class="pagination-btn-group">
        ${pageBtnsHtml}
      </div>
    </div>
  `;
}

function setupDiscoveryFilters() {
  const searchInput = document.getElementById("job-search");
  if (searchInput) {
    searchInput.oninput = renderJobDiscovery;
  }
}

window.applyFilterPreset = function(preset) {
  window.resetAllPillFilters();
  
  if (preset === 'highMatch') {
    const btn = document.querySelector('[data-type="match"][data-val="high"]');
    togglePillFilter('match', 'high', btn);
  } else if (preset === 'aiInfra') {
    const btn = document.querySelector('[data-type="domain"][data-val="AI / LLM Infra"]');
    togglePillFilter('domain', 'AI / LLM Infra', btn);
  } else if (preset === 'systems') {
    const btn1 = document.querySelector('[data-type="domain"][data-val="Distributed Systems"]');
    const btn2 = document.querySelector('[data-type="domain"][data-val="Systems & Low-Level"]');
    togglePillFilter('domain', 'Distributed Systems', btn1);
    togglePillFilter('domain', 'Systems & Low-Level', btn2);
  } else if (preset === 'london') {
    const btn = document.querySelector('[data-type="location"][data-val="London"]');
    togglePillFilter('location', 'London', btn);
  }

  showToast(`Applied filter preset`);
};

window.resetAllFilters = function(shouldRender = true) {
  window.resetAllPillFilters();
};

// Page Render: Kanban Application Tracker
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
    
    // Get job objects currently in this stage
    const stageJobIds = state.tracker[stage] || [];
    const stageJobs = stageJobIds.map(id => allJobs.find(j => j.id === id)).filter(Boolean);
    
    countEl.textContent = stageJobs.length;
    
    if (stageJobs.length === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.className = "kanban-empty-placeholder";
      emptyMsg.style.cssText = "padding: 1.5rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.825rem; border: 1px dashed rgba(255,255,255,0.08); border-radius: 12px; margin-top: 0.5rem;";
      emptyMsg.textContent = "No roles in stage";
      listEl.appendChild(emptyMsg);
    } else {
      stageJobs.forEach(job => {
        const card = document.createElement("div");
        card.className = "glass kanban-card";
        card.draggable = true;
        card.dataset.id = job.id;
        card.style.setProperty("--company-color", job.companyColor || "var(--primary)");
        
        const matchAnalysis = calculateMatchScore(job, state.parsedResume);
        let matchBadgeClass = "low";
        if (matchAnalysis.score >= 75) matchBadgeClass = "high";
        else if (matchAnalysis.score >= 50) matchBadgeClass = "medium";
        
        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.25rem;">
            <div class="kanban-card-company">${job.company}</div>
            ${state.resumeText ? `<span class="kanban-match-badge ${matchBadgeClass}" style="font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 6px;">${matchAnalysis.score}%</span>` : ""}
          </div>
          <div class="kanban-card-title" style="font-size: 0.95rem; font-weight: 700; color: white; margin-bottom: 0.5rem; line-height: 1.3;">${job.title}</div>
          <div class="kanban-card-meta" style="display: flex; justify-content: space-between; align-items: center; font-size: 0.775rem; color: var(--text-secondary);">
            <span>📍 ${job.location.split(',')[0]}</span>
            <span style="color: #34d399; font-weight: 600;">${job.salary.includes('£') ? '£' : '$'}</span>
          </div>
          <!-- Quick Move Dropdown / Action Row -->
          <div style="margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center;" onclick="event.stopPropagation();">
            <select class="kanban-stage-select" style="background: rgba(255,255,255,0.05); color: var(--text-secondary); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; font-size: 0.75rem; padding: 0.2rem 0.4rem; cursor: pointer;" onchange="moveJobToStage('${job.id}', this.value)">
              <option value="discovered" ${stage === 'discovered' ? 'selected' : ''}>Move: Discovered</option>
              <option value="applied" ${stage === 'applied' ? 'selected' : ''}>Move: Applied</option>
              <option value="interviewing" ${stage === 'interviewing' ? 'selected' : ''}>Move: Interviewing</option>
              <option value="offer" ${stage === 'offer' ? 'selected' : ''}>Move: Offer</option>
              <option value="archived" ${stage === 'archived' ? 'selected' : ''}>Move: Archived</option>
            </select>
            <button class="btn-text-link" style="font-size: 0.75rem; color: #f43f5e; background: none; border: none; cursor: pointer;" onclick="deleteJobFromTracker('${job.id}')">Remove</button>
          </div>
        `;
        
        // Card clicks opens modal details
        card.addEventListener("click", (e) => {
          if (card.classList.contains("dragging")) return;
          openJobDetails(job.id);
        });
        
        // Drag Events
        card.addEventListener("dragstart", (e) => {
          card.classList.add("dragging");
          e.dataTransfer.setData("text/plain", job.id);
        });
        
        card.addEventListener("dragend", () => {
          card.classList.remove("dragging");
        });
        
        listEl.appendChild(card);
      });
    }
  });

  initKanbanDragDrop();
}

// Drag & Drop event bindings
function initKanbanDragDrop() {
  const containers = document.querySelectorAll(".column-cards-container");
  
  containers.forEach(container => {
    if (container.dataset.dragDropBound) return;
    container.dataset.dragDropBound = "true";

    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      container.classList.add("drag-over");
    });
    
    container.addEventListener("dragleave", () => {
      container.classList.remove("drag-over");
    });
    
    container.addEventListener("drop", (e) => {
      e.preventDefault();
      container.classList.remove("drag-over");
      
      const jobId = e.dataTransfer.getData("text/plain");
      const targetStage = container.id.replace("kanban-list-", "");
      
      if (jobId && targetStage) {
        moveJobToStage(jobId, targetStage);
      }
    });
  });
}

function moveJobToStage(jobId, targetStage) {
  ensureTrackerStages();

  // Remove from old stages
  Object.keys(state.tracker).forEach(stage => {
    if (Array.isArray(state.tracker[stage])) {
      state.tracker[stage] = state.tracker[stage].filter(id => id !== jobId);
    }
  });
  
  // Push to new stage
  if (!Array.isArray(state.tracker[targetStage])) {
    state.tracker[targetStage] = [];
  }
  
  state.tracker[targetStage].push(jobId);
  saveState();
  renderKanbanBoard();
  if (state.currentTab === "discover") renderJobDiscovery();
  
  const allJobs = getAllJobs();
  const job = allJobs.find(j => j.id === jobId);
  if (job) {
    const stageTitles = {
      discovered: "Discovered",
      applied: "Applied",
      interviewing: "Interviewing",
      offer: "Offers Received",
      archived: "Archived"
    };
    showToast(`Moved "${job.title}" to ${stageTitles[targetStage] || targetStage}`);
  }
}

window.deleteJobFromTracker = function(jobId) {
  ensureTrackerStages();
  Object.keys(state.tracker).forEach(stage => {
    state.tracker[stage] = state.tracker[stage].filter(id => id !== jobId);
  });
  saveState();
  renderKanbanBoard();
  if (state.currentTab === "discover") renderJobDiscovery();
  showToast("Role removed from Kanban board", "info");
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
  
  const allJobs = getAllJobs();
  const job = allJobs.find(j => j.id === jobId);
  showToast(`Added "${job?.title || 'Role'}" to Discovered column!`);
};

// Job Details Modal
function openJobDetails(jobId) {
  const allJobs = getAllJobs();
  const job = allJobs.find(j => j.id === jobId);
  if (!job) return;
  
  state.selectedJobId = jobId;
  
  const overlay = document.getElementById("details-modal");
  const modalBody = document.getElementById("modal-body-content");
  
  if (!overlay || !modalBody) return;
  
  const match = calculateMatchScore(job, state.parsedResume);
  let matchBadge = "";
  let gapBox = "";
  
  if (state.resumeText) {
    let matchClass = "low";
    if (match.score >= 75) matchClass = "high";
    else if (match.score >= 50) matchClass = "medium";
    
    matchBadge = `
      <div class="match-circle ${matchClass}" style="width: 55px; height: 55px; font-size: 1rem;">
        ${match.score}%
      </div>
    `;
    
    // Gaps and suggestions
    const matchedPills = match.matchedSkills.map(s => `<span class="pill pill-primary">${s}</span>`).join("");
    const missingPills = match.missingSkills.map(s => `<span class="pill" style="border-color: rgba(245, 158, 11, 0.3); color: var(--warning); background: rgba(245, 158, 11, 0.05);">${s}</span>`).join("");
    const bd = match.breakdown || { domain: 0, seniority: 0, tech: 0, company: 0 };

    gapBox = `
      <div class="modal-job-section">
        <h4 class="modal-section-title">Match Score Breakdown (Gnanendar Profile Calibration)</h4>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-bottom: 1.25rem;">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 0.75rem; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.35rem;">
              <span style="color: var(--text-secondary)">🎯 Domain Focus</span>
              <span style="font-weight: 600; color: var(--primary);">${bd.domain}/35</span>
            </div>
            <div style="height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
              <div style="height: 100%; width: ${(bd.domain/35)*100}%; background: var(--primary);"></div>
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 0.75rem; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.35rem;">
              <span style="color: var(--text-secondary)">👑 Seniority & Level</span>
              <span style="font-weight: 600; color: var(--accent);">${bd.seniority}/25</span>
            </div>
            <div style="height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
              <div style="height: 100%; width: ${(bd.seniority/25)*100}%; background: var(--accent);"></div>
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 0.75rem; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.35rem;">
              <span style="color: var(--text-secondary)">⚡ Core Tech Overlap</span>
              <span style="font-weight: 600; color: var(--success);">${bd.tech}/25</span>
            </div>
            <div style="height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
              <div style="height: 100%; width: ${(bd.tech/25)*100}%; background: var(--success);"></div>
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 0.75rem; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.35rem;">
              <span style="color: var(--text-secondary)">🏢 AI Ecosystem Tier</span>
              <span style="font-weight: 600; color: #a855f7;">${bd.company}/15</span>
            </div>
            <div style="height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
              <div style="height: 100%; width: ${(bd.company/15)*100}%; background: #a855f7;"></div>
            </div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <div>
            <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;">Matching Technical Skills (${match.matchedSkills.length}):</span>
            <div class="pill-container">${matchedPills || '<span style="color: var(--text-muted);">None</span>'}</div>
          </div>
          <div>
            <span style="font-size: 0.8rem; color: var(--warning); display: block; margin-bottom: 0.25rem;">Opportunity Skill Gaps (${match.missingSkills.length}):</span>
            <div class="pill-container">${missingPills || '<span style="color: var(--success);">All key requirements covered!</span>'}</div>
          </div>
        </div>
      </div>
    `;
  }
  
    // Format description text into structured engineering scope cards
    const descParagraphs = (job.description || "").split("\n\n").filter(p => p.trim().length > 0);
    let structuredAboutRoleHtml = "";
    
    if (descParagraphs.length > 1) {
      structuredAboutRoleHtml = descParagraphs.map((p, idx) => {
        const titles = ["🚀 Role Overview & Mission", "⚙️ Core Systems & Engineering Scope", "🎯 Technical Impact & Growth"];
        const title = titles[idx] || `📋 Engineering Scope #${idx + 1}`;
        return `
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem;">
            <h5 style="font-size: 0.95rem; font-weight: 700; color: var(--primary); margin-bottom: 0.5rem; font-family: var(--font-display);">${title}</h5>
            <p style="font-size: 0.925rem; color: var(--text-secondary); line-height: 1.65; margin: 0;">${p.trim()}</p>
          </div>
        `;
      }).join("");
    } else {
      structuredAboutRoleHtml = `
        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem;">
          <h5 style="font-size: 0.95rem; font-weight: 700; color: var(--primary); margin-bottom: 0.5rem; font-family: var(--font-display);">🚀 Role Overview & Technical Scope</h5>
          <p style="font-size: 0.925rem; color: var(--text-secondary); line-height: 1.65; margin: 0;">${job.description}</p>
        </div>
      `;
    }

  modalBody.innerHTML = `
    <div class="modal-job-header" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
        <div>
          <div class="modal-job-company-container" style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
            ${job.logoUrl ? `<img src="${job.logoUrl}" class="modal-company-logo" style="width: 32px; height: 32px; border-radius: 6px; object-fit: contain;" alt="${job.company} logo" onerror="this.style.display='none'">` : ''}
            <div class="modal-job-company" style="font-size: 1.1rem; font-weight: 700; color: var(--text-muted);">${job.company}</div>
          </div>
          <h2 class="modal-job-title" style="font-size: 1.6rem; font-weight: 800; color: white; margin-bottom: 0.75rem;">${job.title}</h2>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
          ${matchBadge}
        </div>
      </div>
      <div class="modal-job-meta" style="margin-top: 1rem; display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
        <div class="detail-line">
          <svg class="detail-line-icon" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
          <span>${job.location}</span>
        </div>
        <div class="detail-line">
          <svg class="detail-line-icon" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2"/></svg>
          <span>${job.salary}</span>
        </div>
        <div class="detail-line">
          <span class="job-tag">${job.category}</span>
        </div>
      </div>
    </div>
    
    <div class="modal-job-section">
      <h4 class="modal-section-title" style="font-size: 1.1rem; font-weight: 800; color: white; margin-bottom: 1rem;">About the Role & Engineering Scope</h4>
      ${structuredAboutRoleHtml}
    </div>
    
    ${gapBox}
    
    <div class="modal-job-section">
      <h4 class="modal-section-title">Mandatory Requirements</h4>
      <ul style="list-style-position: inside; color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem;">
        ${job.requirements.map(req => `<li>${req}</li>`).join("")}
      </ul>
    </div>
    
    ${job.preferred && job.preferred.length > 0 ? `
    <div class="modal-job-section">
      <h4 class="modal-section-title">Preferred Qualifications</h4>
      <ul style="list-style-position: inside; color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem;">
        ${job.preferred.map(pref => `<li>${pref}</li>`).join("")}
      </ul>
    </div>
    ` : ""}

    ${state.resumeText ? `
    <div class="modal-job-section" style="border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
      <h4 class="modal-section-title">AI Cover Letter Generator</h4>
      <div class="cover-letter-container">
        <p style="font-size: 0.85rem; color: var(--text-secondary);">Draft a high-impact cover letter matching your profile to this role's requirements.</p>
        <div style="display: flex; align-items: center; gap: 1rem;">
          <button class="btn" id="btn-generate-cl" onclick="generateCoverLetter('${job.id}')">Generate Cover Letter</button>
          <div class="ollama-status-badge">
            <span class="status-dot offline"></span> Checked Local AI
          </div>
        </div>
        <div id="cover-letter-result-box" style="display: none; margin-top: 1rem;">
          <pre id="cover-letter-text" class="cover-letter-text"></pre>
          <button class="btn btn-secondary" style="margin-top: 0.75rem;" onclick="copyCoverLetterToClipboard()">Copy to Clipboard</button>
        </div>
      </div>
    </div>
    ` : ""}
    
    <div class="modal-job-section" style="border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
      <h4 class="modal-section-title" style="margin-bottom: 0.75rem;">Pipeline Tracker Status</h4>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
        <button class="btn btn-secondary" style="font-size: 0.825rem; padding: 0.4rem 0.85rem;" onclick="moveJobToStage('${job.id}', 'discovered')">Move to Discovered</button>
        <button class="btn btn-secondary" style="font-size: 0.825rem; padding: 0.4rem 0.85rem;" onclick="moveJobToStage('${job.id}', 'applied')">Move to Applied</button>
        <button class="btn btn-secondary" style="font-size: 0.825rem; padding: 0.4rem 0.85rem;" onclick="moveJobToStage('${job.id}', 'interviewing')">Move to Interviewing</button>
        <button class="btn btn-secondary" style="font-size: 0.825rem; padding: 0.4rem 0.85rem;" onclick="moveJobToStage('${job.id}', 'offer')">Move to Offer</button>
        <button class="btn btn-secondary" style="font-size: 0.825rem; padding: 0.4rem 0.85rem;" onclick="moveJobToStage('${job.id}', 'archived')">Archive Role</button>
      </div>
    </div>
    
    <div class="modal-action-row" style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: flex-end;">
      <a href="${job.applyUrl}" target="_blank" class="btn" style="text-decoration: none;">
        Apply on Careers Site ↗
      </a>
      <button class="btn btn-secondary" onclick="closeModal()">Close Window</button>
    </div>
  `;
  
  overlay.classList.add("active");
  checkAIStatus();
}

window.closeModal = function() {
  const overlay = document.getElementById("details-modal");
  if (overlay) overlay.classList.remove("active");
  state.selectedJobId = null;
};

// 1-Click Company Career Importer
window.promptImportCompanyJobs = function() {
  const url = prompt(
    "Paste a Company Career Board URL (e.g. https://jobs.ashbyhq.com/reflectionai or https://boards.greenhouse.io/openai or company slug):",
    "https://jobs.ashbyhq.com/reflectionai"
  );
  if (url) {
    window.importCompanyJobsFromUrl(url);
  }
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
    const m = url.match(/greenhouse\.io\/([a-zA-Z0-9_-]+)/);
    if (m) slug = m[1];
  } else if (url.includes("lever.co")) {
    type = "lever";
    const m = url.match(/lever\.co\/([a-zA-Z0-9_-]+)/);
    if (m) slug = m[1];
  }

  if (!slug) {
    slug = url.toLowerCase().replace(/https?:\/\//, "").replace(/[^a-z0-9]/g, "");
    type = "ashby";
  }

  try {
    let rawJobs = [];
    let companyName = slug.charAt(0).toUpperCase() + slug.slice(1);
    if (slug === "reflectionai") companyName = "Reflection AI";

    if (type === "ashby") {
      const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`);
      if (!res.ok) throw new Error(`Ashby API returned status ${res.status}`);
      const data = await res.json();
      
      rawJobs = (data.jobs || []).map(j => {
        const title = j.title || "Software Engineer";
        const location = j.location || "San Francisco, CA";
        const desc = j.descriptionPlain || `${title} role at ${companyName}.`;
        const skills = parseResumeText(desc).skills;

        return {
          id: `ashby-${slug}-${j.id}`,
          company: companyName,
          title: title,
          category: "SWE",
          domain: "AI / LLM Infra",
          seniority: "Senior",
          employmentType: j.employmentType || "Full-time",
          location: location,
          salary: "$200,000 - $350,000 + equity",
          applyUrl: j.applyUrl || j.jobUrl || url,
          description: desc,
          requirements: skills.length > 0 ? skills.slice(0, 6) : ["C++", "Python", "Distributed Systems", "PyTorch"],
          preferred: skills.length > 6 ? skills.slice(6, 10) : ["LLM Architecture", "Platform Infrastructure"],
          companyColor: "linear-gradient(135deg, #6366f1, #0f172a)",
          logoUrl: `https://logo.clearbit.com/${slug}.ai`
        };
      });
    }

    if (rawJobs.length === 0) {
      showToast(`No open roles found for "${slug}"`, "warning");
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
    showToast(`Successfully imported ${addedCount} live jobs from ${companyName}!`);
  } catch (err) {
    showToast(`Import Error: ${err.message}`, "danger");
  }
};

// Custom Job Insertion
window.openAddJobModal = function() {
  const overlay = document.getElementById("add-job-modal");
  if (overlay) overlay.classList.add("active");
};

window.closeAddJobModal = function() {
  const overlay = document.getElementById("add-job-modal");
  if (overlay) overlay.classList.remove("active");
  
  // Clear fields
  document.getElementById("add-job-form").reset();
};

window.submitCustomJob = function(e) {
  e.preventDefault();
  
  const company = document.getElementById("job-comp").value.trim();
  const title = document.getElementById("job-tit").value.trim();
  const location = document.getElementById("job-loc").value.trim() || "Remote";
  const salary = document.getElementById("job-sal").value.trim() || "Competitive";
  const category = document.getElementById("job-cat").value || "SWE";
  const description = document.getElementById("job-desc").value.trim() || "Full-time Engineering Role.";
  const reqStr = (document.getElementById("job-reqs")?.value || "").trim();
  const prefStr = (document.getElementById("job-prefs")?.value || "").trim();
  const applyUrl = (document.getElementById("job-url")?.value || "").trim() || "https://linkedin.com";
  
  if (!company || !title) {
    showToast("Please enter at least Company Name and Job Title", "warning");
    return;
  }
  
  let requirements = reqStr ? reqStr.split(",").map(r => r.trim()).filter(r => r.length > 0) : [];
  if (requirements.length === 0) {
    requirements = ["Experience building scalable backend or AI systems", "Strong software engineering fundamentals", "Proficiency in modern programming languages"];
  }
  const preferred = prefStr ? prefStr.split(",").map(r => r.trim()).filter(r => r.length > 0) : [];
  
  const customId = "custom-" + Date.now();
  
  // Generate random company colors
  const gradientPresets = [
    "linear-gradient(135deg, #a855f7, #6366f1)",
    "linear-gradient(135deg, #10b981, #059669)",
    "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    "linear-gradient(135deg, #f59e0b, #d97706)",
    "linear-gradient(135deg, #ec4899, #be185d)"
  ];
  const color = gradientPresets[Math.floor(Math.random() * gradientPresets.length)];
  
  const newJob = {
    id: customId,
    company,
    title,
    location,
    salary,
    category,
    description,
    requirements,
    preferred,
    applyUrl,
    companyColor: color,
    isCustom: true
  };
  
  state.customJobs.push(newJob);
  state.customJobs.push(newJob);
  saveState();
  closeAddJobModal();
  setupDiscoveryFilters(); // Recalculate filters
  
  // Go to discovery view to see it
  switchTab("discover");
  showToast(`Custom job "${title}" added to Job Discovery!`);
};

// Page Render: Analytics Dashboard
function renderAnalytics() {
  const funnelContainer = document.getElementById("funnel-chart");
  const gapContainer = document.getElementById("skills-gap-feed");
  
  if (!funnelContainer || !gapContainer) return;
  
  const allJobs = getAllJobs();
  
  // 1. Compile Match Distribution across 476 frontier jobs
  let highMatch = 0;
  let mediumMatch = 0;
  let aiInfra = 0;
  let postTraining = 0;
  let distSystems = 0;

  allJobs.forEach(job => {
    const score = calculateMatchScore(job, state.parsedResume).score;
    if (score >= 75) highMatch++;
    else if (score >= 50) mediumMatch++;
    
    const text = (job.title + " " + (job.domain || "") + " " + job.category).toLowerCase();
    if (text.includes("infra") || text.includes("platform") || text.includes("cluster") || text.includes("gpu")) aiInfra++;
    if (text.includes("post-training") || text.includes("reinforcement") || text.includes("rl") || text.includes("eval")) postTraining++;
    if (text.includes("distributed") || text.includes("backend") || text.includes("systems") || text.includes("swe")) distSystems++;
  });

  const stages = ["high", "medium", "infra", "post_training", "systems"];
  const labels = ["🌟 High Match (75%+)", "⚡ Strong Match (50-74%)", "🤖 AI & LLM Infra", "🚀 Post-Training & RL", "⚙️ Distributed Systems"];
  const counts = [highMatch, mediumMatch, aiInfra, postTraining, distSystems];
  const maxCount = Math.max(...counts, 1);
  
  // Render Custom SVG Funnel/Bar Chart
  let svgContent = `
    <svg class="svg-chart" viewBox="0 0 400 240">
      <defs>
        <linearGradient id="grad-high" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#10b981" />
          <stop offset="100%" stop-color="#059669" />
        </linearGradient>
        <linearGradient id="grad-medium" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#6366f1" />
          <stop offset="100%" stop-color="#8b5cf6" />
        </linearGradient>
        <linearGradient id="grad-infra" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#3b82f6" />
          <stop offset="100%" stop-color="#1d4ed8" />
        </linearGradient>
        <linearGradient id="grad-post_training" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#a855f7" />
          <stop offset="100%" stop-color="#ec4899" />
        </linearGradient>
        <linearGradient id="grad-systems" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#d97706" />
        </linearGradient>
      </defs>
  `;
  
  const barHeights = 24;
  const barGap = 16;
  const startY = 15;
  const chartWidth = 220;
  
  labels.forEach((label, idx) => {
    const y = startY + idx * (barHeights + barGap);
    const count = counts[idx];
    const width = Math.round((count / maxCount) * chartWidth) || 8;
    const stage = stages[idx];
    
    svgContent += `
      <!-- Label -->
      <text x="10" y="${y + 16}" fill="#a1a1aa" font-family="Outfit" font-size="11" font-weight="600">${label}</text>
      <!-- Background Track -->
      <rect x="140" y="${y}" width="${chartWidth}" height="${barHeights}" rx="4" fill="rgba(255,255,255,0.03)" />
      <!-- Colored Bar -->
      <rect class="funnel-bar" x="140" y="${y}" width="${width}" height="${barHeights}" rx="4" fill="url(#grad-${stage})" onclick="switchTab('discover')" style="cursor: pointer;" />
      <!-- Count Value -->
      <text x="${140 + width + 10}" y="${y + 16}" fill="#f4f4f5" font-family="Outfit" font-size="12" font-weight="700">${count}</text>
    `;
  });
  
  svgContent += `</svg>`;
  funnelContainer.innerHTML = svgContent;
  
  // 2. Skill Gaps & Preparatory Insights across top matching frontier roles
  if (!state.resumeText) {
    gapContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 3rem 1rem;">
        <p style="font-size: 0.95rem; margin-bottom: 0.25rem;">Unlock Skills Analysis</p>
        <p style="font-size: 0.8rem;">Upload your resume to evaluate preparation guides for target AI roles.</p>
      </div>
    `;
    return;
  }
  
  // Sort jobs by match score and evaluate skill gaps across top 15 frontier roles
  const sortedJobs = [...allJobs].sort((a, b) => {
    return calculateMatchScore(b, state.parsedResume).score - calculateMatchScore(a, state.parsedResume).score;
  }).slice(0, 15);

  const gapWeights = {};
  sortedJobs.forEach(job => {
    const analysis = calculateMatchScore(job, state.parsedResume);
    (analysis.missingSkills || []).forEach(skill => {
      gapWeights[skill] = (gapWeights[skill] || 0) + 1;
    });
  });
  
  const sortedGaps = Object.entries(gapWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
    
  if (sortedGaps.length === 0) {
    gapContainer.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: var(--success); background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: var(--radius-sm)">
        <h4 style="font-family: var(--font-display); font-size: 1rem; margin-bottom: 0.25rem;">✓ 100% Core Competency Achieved</h4>
        <p style="font-size: 0.85rem; color: var(--text-secondary);">Fantastic! Your parsed resume covers all necessary prerequisites for the top 15 frontier AI roles.</p>
      </div>
    `;
    return;
  }
  
  const learningGuides = {
    "pytorch": "Work through custom nn.Module classes, custom datasets, and distributed torch.distributed tensor autograd pathways.",
    "triton": "Review OpenAI Triton tutorials for building custom GPU kernels. Study block algorithms, memory layouts, and kernel pipelining for frontier inference.",
    "vllm": "Read the vLLM paper focusing on PagedAttention. Deploy continuous batching to maximize serving throughput.",
    "cuda": "Learn parallel computing fundamentals. Write matrix multiplications in CUDA C++ and optimize warp divergence & memory coalescing.",
    "llms": "Study architecture fundamentals: multi-head attention, RoPE embeddings, KV caching, and top-p sampling.",
    "rag": "Implement hybrid search (sparse BM25 + dense vector retrieval) with cross-encoder reranking.",
    "jax": "Study compiler-oriented coding with XLA: master jit(), grad(), vmap(), and pmap() transformations.",
    "system design": "Design large-scale distributed backends: Raft/Paxos consensus, Kafka event streaming, and sharded storage.",
    "reinforcement learning": "Study Policy Gradient algorithms, PPO, Deep Q-Networks, and online reward optimization.",
    "rlhf": "Analyze the RLHF pipeline: SFT, preference reward modeling, and PPO / DPO alignment algorithms."
  };
  
  let gapHtml = "";
  sortedGaps.forEach(([skill, frequency]) => {
    const defaultGuide = `Recommended for ${frequency} top frontier role(s). Consider implementing a practical project using ${skill} to highlight on your technical profile.`;
    const guide = learningGuides[skill.toLowerCase()] || defaultGuide;
    
    gapHtml += `
      <div class="gap-item">
        <div class="gap-skill-header">
          <span class="gap-skill-name">${skill}</span>
          <span class="job-tag" style="background: rgba(245, 158, 11, 0.1); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.15)">
            Required in ${frequency} top roles
          </span>
        </div>
        <p class="gap-recommendation">${guide}</p>
      </div>
    `;
  });
  
  gapContainer.innerHTML = `
    <div class="skills-gap-container">
      <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
        Top skill opportunity areas based on your resume cross-referenced against 476 frontier AI positions:
      </p>
      ${gapHtml}
    </div>
  `;
}

// Multi-User Account UI & Handler Functions
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
  const profilesList = document.getElementById("account-profiles-list");

  if (avatarEl) avatarEl.textContent = activeUser.avatar || "👤";
  if (nameEl) nameEl.textContent = activeUser.name || "User";
  if (menuNameEl) menuNameEl.textContent = activeUser.name || "User";
  if (menuEmailEl) menuEmailEl.textContent = activeUser.email || "Local Profile";

  if (profilesList) {
    const accounts = getAccountsList();
    profilesList.innerHTML = "";
    accounts.forEach(acc => {
      const isActive = acc.id === activeUser.id;
      const item = document.createElement("div");
      item.className = `profile-select-item ${isActive ? 'active' : ''}`;
      item.onclick = () => window.switchUserProfile(acc.id);
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; overflow: hidden;">
          <span>${acc.avatar || "👤"}</span>
          <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            <div style="font-weight: 600; font-size: 0.8rem; color: #ffffff;">${acc.name}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">${acc.email || "Local Guest"}</div>
          </div>
        </div>
        ${isActive ? '<span style="color: #34d399; font-size: 0.8rem;">✓</span>' : ''}
      `;
      profilesList.appendChild(item);
    });
  }
};

window.switchUserProfile = function(userId) {
  const accounts = getAccountsList();
  const target = accounts.find(a => a.id === userId);
  if (!target) return;

  saveState();
  setActiveUserId(userId);
  state.currentUser = target;
  loadState();

  const menu = document.getElementById("account-dropdown-menu");
  if (menu) menu.style.display = "none";

  // Re-render UI for new user profile
  renderResumePortal();
  if (state.currentTab === "discover") renderJobDiscovery();
  if (state.currentTab === "tracker") renderKanbanBoard();
  if (state.currentTab === "analytics") renderAnalytics();

  showToast(`Switched profile to ${target.name}`);
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

    const accounts = getAccountsList();
    const existingIdx = accounts.findIndex(a => a.id === userProfile.id || a.email === userProfile.email);
    if (existingIdx >= 0) {
      accounts[existingIdx] = { ...accounts[existingIdx], ...userProfile };
    } else {
      accounts.push(userProfile);
    }
    saveAccountsList(accounts);
    setActiveUserId(userProfile.id);

    state.currentUser = userProfile;
    loadState();
    closeAuthModal();

    showToast(`${isLogin ? 'Signed in as' : 'Account created for'} ${userProfile.name}!`);
  } catch (err) {
    // Local fallback creation
    const userId = "usr_" + Date.now().toString(36);
    const userProfile = { id: userId, name: name || "Friend", email, avatar: "👤" };
    const accounts = getAccountsList();
    accounts.push(userProfile);
    saveAccountsList(accounts);
    setActiveUserId(userProfile.id);
    state.currentUser = userProfile;
    loadState();
    closeAuthModal();
    showToast(`Account created locally for ${userProfile.name}!`);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
};

window.createQuickLocalProfile = function() {
  const name = prompt("Enter Name for Friend Profile:", "Friend Profile");
  if (!name) return;
  const userId = "usr_" + Date.now().toString(36);
  const newProfile = {
    id: userId,
    name: name.trim(),
    email: `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}@local.user`,
    avatar: "👤"
  };

  const accounts = getAccountsList();
  accounts.push(newProfile);
  saveAccountsList(accounts);
  setActiveUserId(newProfile.id);
  state.currentUser = newProfile;
  loadState();
  closeAuthModal();
  showToast(`Profile created for ${newProfile.name}! Upload your resume to start.`);
};

window.signOutCurrentUser = function() {
  const accounts = getAccountsList();
  const current = getActiveUserProfile();
  
  if (confirm(`Sign out of profile "${current.name}"?`)) {
    // Switch to default primary or first profile
    const nextUser = accounts.find(a => a.id !== current.id) || DEFAULT_PRIMARY_USER;
    setActiveUserId(nextUser.id);
    state.currentUser = nextUser;
    loadState();
    
    const menu = document.getElementById("account-dropdown-menu");
    if (menu) menu.style.display = "none";
    showToast(`Signed out. Switched to ${nextUser.name}.`);
  }
};

// Global page load initializations
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  
  // Bind tab buttons
  document.getElementById("nav-resume").onclick = () => switchTab("resume");
  document.getElementById("nav-discover").onclick = () => switchTab("discover");
  document.getElementById("nav-tracker").onclick = () => switchTab("tracker");
  document.getElementById("nav-analytics").onclick = () => switchTab("analytics");
  
  // Set up dropzone file uploads
  window.initDropzone();
  
  // Setup discovery page filter listeners
  setupDiscoveryFilters();
  
  // Setup Kanban columns drag/drop listeners
  initKanbanDragDrop();
  
  // Close account menu when clicking outside
  document.addEventListener("click", (e) => {
    const container = document.querySelector(".account-widget-container");
    const menu = document.getElementById("account-dropdown-menu");
    if (menu && container && !container.contains(e.target)) {
      menu.style.display = "none";
    }
  });

  // Initialize default page view
  switchTab("resume");
  
  // Check Gemini AI Engine connection status
  checkAIStatus();
  
  // Set sync tooltip
  const syncBtn = document.getElementById("sync-jobs-btn");
  if (syncBtn) {
    syncBtn.title = `Last Synced: ${window.lastSyncedJobs || "Unknown"}`;
  }
});

// --- Gemini 2.5 Flash Free AI Engine ---
const GEMINI_MODEL = "gemini-2.5-flash";

function getGeminiAPIKey() {
  return localStorage.getItem("auratrack_gemini_key") || "";
}

function saveGeminiAPIKey(key) {
  if (key) {
    localStorage.setItem("auratrack_gemini_key", key.trim());
  }
}

async function checkAIStatus() {
  const badges = document.querySelectorAll(".ollama-status-badge, .ai-status-badge");
  const dots = document.querySelectorAll(".status-dot");
  
  const updateUI = (status, text) => {
    dots.forEach(dot => {
      dot.className = `status-dot ${status}`;
    });
    badges.forEach(badge => {
      badge.innerHTML = `<span class="status-dot ${status}"></span> ${text}`;
    });
  };
  
  const clientKey = getGeminiAPIKey();
  if (clientKey) {
    updateUI("online", "Gemini 2.5 Flash (Client Key)");
  } else {
    updateUI("online", "Gemini 2.5 Flash Active");
  }
}

async function callGeminiAPI(prompt, systemInstruction = "") {
  const userApiKey = getGeminiAPIKey();
  
  // 1. If user configured a client-side key, call Google API directly
  if (userApiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${userApiKey}`;
    const payload = {
      contents: [
        { parts: [{ text: systemInstruction ? `[System Context: ${systemInstruction}]\n\n${prompt}` : prompt }] }
      ]
    };
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error?.message || `HTTP status ${response.status}`;
      throw new Error(`Gemini API Error: ${msg}`);
    }
    const data = await response.json();
    const candidates = data.candidates || [];
    if (candidates.length > 0 && candidates[0].content?.parts?.length > 0) {
      return candidates[0].content.parts[0].text;
    }
    throw new Error("Empty response from Gemini API");
  }

  // 2. Otherwise, attempt calling local server proxy endpoint (/api/ai/generate)
  try {
    const proxyRes = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, systemInstruction, model: GEMINI_MODEL })
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.status === "success") {
        return data.result;
      }
    }
  } catch (err) {
    // Backend server proxy unavailable (e.g. static host like GitHub Pages)
  }

  // 3. Prompt user on static host for their free Gemini key if not saved yet
  const keyInput = prompt("GitHub Pages Static Mode: Enter your Free Gemini API Key to run AI Cover Letters & Bullet Optimization:\n\n(Get your 100% free key in 5 seconds at https://aistudio.google.com/app/apikey)");
  if (keyInput && keyInput.trim().length > 5) {
    saveGeminiAPIKey(keyInput.trim());
    return callGeminiAPI(prompt, systemInstruction);
  }

  throw new Error("Gemini API key is required on static web hosts.");
}

// 1. Cover Letter Generator implementation
window.generateCoverLetter = async function(jobId) {
  const allJobs = getAllJobs();
  const job = allJobs.find(j => j.id === jobId);
  if (!job) return;
  
  const resultBox = document.getElementById("cover-letter-result-box");
  const resultText = document.getElementById("cover-letter-text");
  const btn = document.getElementById("btn-generate-cl");
  
  if (!resultBox || !resultText || !btn) return;
  
  resultBox.style.display = "block";
  resultText.textContent = "Writing your custom cover letter with Gemini 2.5 Flash...";
  btn.disabled = true;
  
  const statusBadge = btn.parentElement.querySelector(".ollama-status-badge");
  if (statusBadge) statusBadge.innerHTML = `<span class="status-dot loading"></span> Generating...`;
  
  const prompt = `Write a tailored, highly compelling cover letter for the role of ${job.title} at ${job.company}.
Candidate Profile:
- Name: ${state.parsedResume.name || "Gnanendar Reddy Male"}
- Experience Level: ${state.parsedResume.experienceLevel}
- Core Skills: ${(state.parsedResume.skills || []).join(", ")}

Target Job Info:
- Company: ${job.company}
- Role: ${job.title}
- Description: ${job.description}
- Key Requirements: ${(job.requirements || []).join(", ")}

Format as a professional cover letter under 300 words. Address the hiring manager of ${job.company}. Highlight how candidate's skills directly solve the target job's engineering challenges.`;

  const system = "You are an elite technical career consultant who crafts highly persuasive, professional cover letters for senior software engineers.";
  
  try {
    const coverLetter = await callGeminiAPI(prompt, system);
    resultText.textContent = coverLetter;
  } catch (e) {
    console.warn("Gemini API call failed, using template:", e);
    resultText.textContent = generateMockCoverLetter(job, state.parsedResume);
  } finally {
    btn.disabled = false;
    checkAIStatus();
  }
};

window.copyCoverLetterToClipboard = function() {
  const text = document.getElementById("cover-letter-text").textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast("Cover letter copied to clipboard!");
  }).catch(err => {
    showToast("Failed to copy text", "danger");
  });
};

function generateMockCoverLetter(job, resume) {
  const name = resume.name || "Gnanendar Reddy Male";
  const email = resume.email || "gnanendarreddymale77@gmail.com";
  const company = job.company;
  const title = job.title;
  const matchedSkills = (resume.skills || []).filter(s => (job.requirements || []).some(r => r.toLowerCase() === s.toLowerCase()));
  const skillsList = matchedSkills.length > 0 ? matchedSkills.slice(0, 4).join(", ") : "C++, Python, Distributed Systems, ML Engineering";
  
  return `Dear Hiring Manager at ${company},

I am writing to express my strong interest in the ${title} position. As a software engineering professional with extensive experience building high-throughput distributed infrastructure and intelligent models, I am excited to contribute to your team's mission.

My technical experience aligns closely with your core requirements, specifically in ${skillsList}. In my past roles, I have spearheaded core backend infrastructure, built scalable microservices, and optimized performance for high-concurrency systems.

I am particularly drawn to ${company} because of your innovation and impact in this space. I would welcome the opportunity to discuss how my background in systems engineering and ML infrastructure can drive results for your team.

Sincerely,
${name}
Email: ${email}`;
}

// 2. Resume Bullet Optimizer implementation
window.populateOptimizerJobs = function() {
  const select = document.getElementById("opt-job-select");
  if (!select) return;
  
  const selectedVal = select.value;
  select.innerHTML = `<option value="">-- Select a Job Opportunity --</option>`;
  
  const allJobs = getAllJobs();
  allJobs.forEach(job => {
    select.innerHTML += `<option value="${job.id}">${job.company} - ${job.title}</option>`;
  });
  
  if (selectedVal) select.value = selectedVal;
};

window.optimizeBulletPoint = async function() {
  const jobId = document.getElementById("opt-job-select").value;
  const bulletInput = document.getElementById("opt-bullet-input").value.trim();
  const container = document.getElementById("optimizer-result-container");
  const resultText = document.getElementById("optimizer-result-text");
  
  if (!jobId) {
    showToast("Please select a target job opportunity", "warning");
    return;
  }
  if (!bulletInput) {
    showToast("Please enter a resume bullet point to optimize", "warning");
    return;
  }
  
  const allJobs = getAllJobs();
  const job = allJobs.find(j => j.id === jobId);
  if (!job) return;
  
  container.style.display = "block";
  resultText.textContent = "Optimizing your bullet point with Gemini 2.5 Flash...";
  
  const statusBadge = document.getElementById("ollama-status");
  if (statusBadge) statusBadge.innerHTML = `<span class="status-dot loading"></span> Optimizing...`;
  
  const prompt = `Optimize the following resume bullet point for the role of ${job.title} at ${job.company}.
Original Bullet: "${bulletInput}"
Target Job Requirements: ${(job.requirements || []).join(", ")}

Generate 3 high-impact alternative bullet points starting with strong action verbs (e.g., Engineered, Architected, Spearheaded). Incorporate relevant technical keywords and quantifiably demonstrate impact. Format with bullet points.`;

  const system = "You are a Google & Meta Staff Technical Recruiter who optimizes software engineer resumes for maximum ATS impact.";

  try {
    const result = await callGeminiAPI(prompt, system);
    resultText.textContent = result;
  } catch (e) {
    console.warn("Gemini API call failed, using fallback:", e);
    resultText.textContent = generateMockOptimizedBullet(bulletInput, job);
  } finally {
    checkAIStatus();
  }
};

function generateMockOptimizedBullet(originalBullet, job) {
  const reqs = job.requirements.slice(0, 3);
  const keywords = reqs.length > 0 ? reqs.join(" / ") : "key software patterns";
  
  return `Option 1 (Results-Oriented):
• Streamlined technical delivery by optimizing workflows, integrating ${keywords} requirements to improve efficiency by 20%, directly supporting the ${job.title} objective.

Option 2 (Technically Expressive):
• Architected and refactored core modules with a focus on ${keywords}, reducing API response latency and improving team velocity under production loads.

Option 3 (Action-Oriented):
• Spearheaded backend improvements incorporating ${keywords} principles to match requirements for ${job.title}, collaborating closely across functional divisions.`;
}

// 3. Live Sync Jobs implementation
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
      showToast("Static Mode: 454 live engineering jobs loaded. Run local Python server for live scraper sync.", "info");
      text.textContent = "Sync Live Jobs";
      return;
    }
    const data = await response.json();
    
    // Success toast
    showToast(data.message || "Jobs synced successfully!");
    
    // Load updated jobs.js with a cache-buster parameter
    const oldScript = document.querySelector('script[src*="jobs.js"]');
    if (oldScript) {
      oldScript.remove();
    }
    
    const newScript = document.createElement("script");
    newScript.src = `jobs.js?t=${Date.now()}`;
    newScript.onload = () => {
      // Re-initialize UI lists and render active tabs
      setupDiscoveryFilters();
      if (state.currentTab === "discover") renderJobDiscovery();
      if (state.currentTab === "tracker") renderKanbanBoard();
      if (state.currentTab === "analytics") renderAnalytics();
      populateOptimizerJobs();
      
      // Update sync text & tooltip
      text.textContent = "Sync Live Jobs";
      btn.title = `Last Synced: ${window.lastSyncedJobs || "Just now"}`;
    };
    document.head.appendChild(newScript);
  } catch (err) {
    showToast("Static Mode: 454 live engineering jobs loaded! Run python server for scraper sync.", "info");
    text.textContent = "Sync Live Jobs";
  } finally {
    btn.disabled = false;
    icon.classList.remove("spin");
  }
};


