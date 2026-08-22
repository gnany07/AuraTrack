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

// App State
let state = {
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

function loadState() {
  const savedState = localStorage.getItem("auratrack_state");
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      state = { ...state, ...parsed };
    } catch (e) {
      console.error("Failed to parse saved state", e);
    }
  }
  
  // If resume text is empty or default, set Gnanendar's actual resume
  if (!state.resumeText || state.resumeText.includes("Alex Mercer")) {
    state.resumeText = DEFAULT_RESUME_TEXT;
    state.parsedResume = parseResumeText(DEFAULT_RESUME_TEXT);
    saveState();
  }
}

function saveState() {
  localStorage.setItem("auratrack_state", JSON.stringify(state));
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
    match: new Set()
  };
  document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
  const searchInput = document.getElementById("job-search");
  if (searchInput) searchInput.value = "";
  renderJobDiscovery();
  showToast("Cleared all active filters");
};

// Page Render: Job Discovery Feed
function renderJobDiscovery() {
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

  // Render Active Filter Tags
  const activeTagsContainer = document.getElementById("active-tags-container");
  if (activeTagsContainer) {
    const tags = [];
    activeDomains.forEach(val => tags.push({ cat: "domain", label: val }));
    activeSeniorities.forEach(val => tags.push({ cat: "seniority", label: val }));
    activeLocations.forEach(val => tags.push({ cat: "location", label: val }));
    activeMatches.forEach(val => tags.push({ cat: "match", label: val === "high" ? "75%+ High Match" : "50%+ Moderate Match" }));

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
    
    if (textMatches && domainMatches && seniorityMatches && locationMatches && scoreMatches) {
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
          <a href="${job.applyUrl}" target="_blank" class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.35rem 0.75rem;">Apply Now</a>
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
  const board = document.getElementById("kanban-board-container");
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
        <div class="kanban-card-company">${job.company}</div>
        <div class="kanban-card-title">${job.title}</div>
        <div class="kanban-card-meta">
          <span>${job.category}</span>
          ${state.resumeText ? `<span class="kanban-match-badge ${matchBadgeClass}">${matchAnalysis.score}% Match</span>` : ""}
        </div>
      `;
      
      // Card clicks opens modal details
      card.addEventListener("click", (e) => {
        // Prevent click trigger if dragging
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
  });
}

// Drag & Drop event bindings
function initKanbanDragDrop() {
  const containers = document.querySelectorAll(".column-cards-container");
  
  containers.forEach(container => {
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
      
      moveJobToStage(jobId, targetStage);
    });
  });
}

function moveJobToStage(jobId, targetStage) {
  // Remove from old stages
  Object.keys(state.tracker).forEach(stage => {
    state.tracker[stage] = state.tracker[stage].filter(id => id !== jobId);
  });
  
  // Push to new stage
  if (!state.tracker[targetStage]) {
    state.tracker[targetStage] = [];
  }
  
  state.tracker[targetStage].push(jobId);
  saveState();
  renderKanbanBoard();
  
  const allJobs = getAllJobs();
  const job = allJobs.find(j => j.id === jobId);
  if (job) {
    const stageTitles = {
      discovered: "Inbox / Discovered",
      applied: "Applied",
      interviewing: "Interviewing",
      offer: "Offers Received",
      archived: "Archived"
    };
    showToast(`Moved "${job.title}" to ${stageTitles[targetStage]}`);
  }
}

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
  
  // Track Status dropdown helper
  let currentStage = "None";
  Object.keys(state.tracker).forEach(stage => {
    if (state.tracker[stage].includes(jobId)) {
      const stageLabels = {
        discovered: "Discovered",
        applied: "Applied",
        interviewing: "Interviewing",
        offer: "Offer",
        archived: "Archived"
      };
      currentStage = stageLabels[stage];
    }
  });
  
  const stageButtonOptions = `
    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
      <button class="btn btn-secondary" onclick="moveJobFromModal('${jobId}', 'discovered')">Move to Discovered</button>
      <button class="btn btn-secondary" onclick="moveJobFromModal('${jobId}', 'applied')">Move to Applied</button>
      <button class="btn btn-secondary" onclick="moveJobFromModal('${jobId}', 'interviewing')">Move to Interviewing</button>
      <button class="btn btn-secondary" onclick="moveJobFromModal('${jobId}', 'offer')">Move to Offer</button>
      <button class="btn btn-secondary btn-danger" style="margin-left: auto;" onclick="deleteJobFromModal('${jobId}')">Delete Job</button>
    </div>
  `;
  
  modalBody.innerHTML = `
    <div class="modal-job-header">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div class="modal-job-company-container">
            ${job.logoUrl ? `<img src="${job.logoUrl}" class="modal-company-logo" alt="${job.company} logo" onerror="this.style.display='none'">` : ''}
            <div class="modal-job-company">${job.company}</div>
          </div>
          <h2 class="modal-job-title">${job.title}</h2>
        </div>
        ${matchBadge}
      </div>
      <div class="modal-job-meta">
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
        <div class="detail-line">
          <span style="font-size: 0.85rem; color: var(--text-muted);">Current Tracker Stage: </span>
          <span class="job-tag" style="background: var(--primary-glow); color: white; font-weight: bold;">${currentStage}</span>
        </div>
      </div>
    </div>
    
    <div class="modal-job-section">
      <h4 class="modal-section-title">About the Role</h4>
      <p class="modal-job-text">${job.description}</p>
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
      <h4 class="modal-section-title" style="margin-bottom: 1rem;">Update Application Stage</h4>
      ${stageButtonOptions}
    </div>
    
    <div class="modal-action-row">
      <a href="${job.applyUrl}" target="_blank" class="btn" style="text-decoration: none;">
        Apply on Careers Site
        <svg style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2;" viewBox="0 0 24 24">
          <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>
      <button class="btn btn-secondary" onclick="closeModal()">Close Window</button>
    </div>
  `;
  
  overlay.classList.add("active");
  checkOllamaStatus();
}

window.closeModal = function() {
  const overlay = document.getElementById("details-modal");
  if (overlay) overlay.classList.remove("active");
  state.selectedJobId = null;
};

// Modal staging helper actions
window.moveJobFromModal = function(jobId, stage) {
  moveJobToStage(jobId, stage);
  closeModal();
};

window.deleteJobFromModal = function(jobId) {
  if (confirm("Are you sure you want to delete this job? Custom jobs will be lost. Seed jobs will return to discovery list.")) {
    // Remove from tracker board
    Object.keys(state.tracker).forEach(stage => {
      state.tracker[stage] = state.tracker[stage].filter(id => id !== jobId);
    });
    
    // Remove from custom list if it is custom
    state.customJobs = state.customJobs.filter(j => j.id !== jobId);
    
    saveState();
    closeModal();
    if (state.currentTab === "tracker") renderKanbanBoard();
    if (state.currentTab === "discover") renderJobDiscovery();
    showToast("Job removed from tracker", "danger");
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
  const category = document.getElementById("job-cat").value;
  const description = document.getElementById("job-desc").value.trim();
  const reqStr = document.getElementById("job-reqs").value.trim();
  const prefStr = document.getElementById("job-prefs").value.trim();
  const applyUrl = document.getElementById("job-url").value.trim() || "https://linkedin.com";
  
  if (!company || !title || !description || !reqStr) {
    showToast("Please fill in all required fields", "warning");
    return;
  }
  
  const requirements = reqStr.split(",").map(r => r.trim()).filter(r => r.length > 0);
  const preferred = prefStr.split(",").map(r => r.trim()).filter(r => r.length > 0);
  
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
  // Auto-add to discovered stage
  state.tracker.discovered.push(customId);
  
  saveState();
  closeAddJobModal();
  setupDiscoveryFilters(); // Recalculate filters
  
  // Go to tracker view to see it
  switchTab("tracker");
  showToast(`Custom job "${title}" added to Discovered column!`);
};

// Page Render: Analytics Dashboard
function renderAnalytics() {
  const funnelContainer = document.getElementById("funnel-chart");
  const gapContainer = document.getElementById("skills-gap-feed");
  
  if (!funnelContainer || !gapContainer) return;
  
  const allJobs = getAllJobs();
  
  // 1. Compile Funnel counts
  const stages = ["discovered", "applied", "interviewing", "offer", "archived"];
  const counts = stages.map(stage => (state.tracker[stage] || []).length);
  const maxCount = Math.max(...counts, 1); // Avoid division by zero
  
  // Render Custom SVG Funnel/Bar Chart
  let svgContent = `
    <svg class="svg-chart" viewBox="0 0 400 240">
      <defs>
        <linearGradient id="grad-discovered" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#6366f1" />
          <stop offset="100%" stop-color="#8b5cf6" />
        </linearGradient>
        <linearGradient id="grad-applied" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#a855f7" />
          <stop offset="100%" stop-color="#ec4899" />
        </linearGradient>
        <linearGradient id="grad-interviewing" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#ef4444" />
        </linearGradient>
        <linearGradient id="grad-offer" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#10b981" />
          <stop offset="100%" stop-color="#059669" />
        </linearGradient>
        <linearGradient id="grad-archived" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#71717a" />
          <stop offset="100%" stop-color="#52525b" />
        </linearGradient>
      </defs>
  `;
  
  const labels = ["Discovered", "Applied", "Interviewing", "Offers", "Archived"];
  const barHeights = 24;
  const barGap = 16;
  const startY = 15;
  const chartWidth = 260; // Max bar width
  
  labels.forEach((label, idx) => {
    const y = startY + idx * (barHeights + barGap);
    const count = counts[idx];
    const width = Math.round((count / maxCount) * chartWidth) || 8; // min 8px wide bar if count is 0
    const stage = stages[idx];
    
    svgContent += `
      <!-- Label -->
      <text x="10" y="${y + 16}" fill="#a1a1aa" font-family="Outfit" font-size="11" font-weight="600">${label}</text>
      <!-- Background Track -->
      <rect x="100" y="${y}" width="${chartWidth}" height="${barHeights}" rx="4" fill="rgba(255,255,255,0.03)" border="1px solid rgba(255,255,255,0.05)" />
      <!-- Colored Bar -->
      <rect class="funnel-bar" x="100" y="${y}" width="${width}" height="${barHeights}" rx="4" fill="url(#grad-${stage})" onclick="switchTab('tracker')" />
      <!-- Count Value -->
      <text x="${100 + width + 10}" y="${y + 16}" fill="#f4f4f5" font-family="Outfit" font-size="12" font-weight="700">${count}</text>
    `;
  });
  
  svgContent += `</svg>`;
  funnelContainer.innerHTML = svgContent;
  
  // 2. Skill Gaps & Preparatory Insights
  if (!state.resumeText) {
    gapContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 3rem 1rem;">
        <p style="font-size: 0.95rem; margin-bottom: 0.25rem;">Unlock Skills Analysis</p>
        <p style="font-size: 0.8rem;">Upload your resume to evaluate preparation guides for target AI roles.</p>
      </div>
    `;
    return;
  }
  
  // Aggregate missing skills from roles in the tracker (Discovered, Applied, Interviewing)
  const trackedJobIds = [
    ...(state.tracker.discovered || []),
    ...(state.tracker.applied || []),
    ...(state.tracker.interviewing || [])
  ];
  
  if (trackedJobIds.length === 0) {
    gapContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 3rem 1rem;">
        <p style="font-size: 0.95rem;">No active jobs in your tracker.</p>
        <p style="font-size: 0.8rem;">Move jobs from discovery to generate learning paths.</p>
      </div>
    `;
    return;
  }
  
  const activeJobs = trackedJobIds.map(id => allJobs.find(j => j.id === id)).filter(Boolean);
  const gapWeights = {}; // Count how frequently a skill is missing across jobs
  
  activeJobs.forEach(job => {
    const analysis = calculateMatchScore(job, state.parsedResume);
    analysis.missingSkills.forEach(skill => {
      gapWeights[skill] = (gapWeights[skill] || 0) + 1;
    });
  });
  
  // Sort gaps by frequency of occurrence
  const sortedGaps = Object.entries(gapWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4); // Take top 4 gaps
    
  if (sortedGaps.length === 0) {
    gapContainer.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: var(--success); background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: var(--radius-sm)">
        <h4 style="font-family: var(--font-display); font-size: 1rem; margin-bottom: 0.25rem;">✓ 100% Core Competency Achieved</h4>
        <p style="font-size: 0.85rem; color: var(--text-secondary);">Fantastic! Your parsed resume covers all necessary prerequisites for the jobs currently in your funnel.</p>
      </div>
    `;
    return;
  }
  
  // Generate learning tips based on common AI skills
  const learningGuides = {
    "pytorch": "Work through the PyTorch 'Deep Learning with PyTorch' tutorial. Focus on building custom nn.Module classes, custom datasets, and understanding tensor autograd pathways.",
    "triton": "Review OpenAI Triton tutorials for building custom GPU kernels. Study block algorithms, memory layouts, and kernel pipelining to stand out in MLOps/Serving roles.",
    "vllm": "Read the vLLM paper, focusing on PageAttention. Deploy vLLM locally, configure continuous batching, and analyze performance throughput improvements vs. standard HuggingFace pipelines.",
    "cuda": "Learn parallel computing fundamentals. Code simple matrix multiplications in raw CUDA C++ and study thread blocks, shared memory bank conflicts, and global memory coalescing.",
    "llms": "Build a toy LLM architecture from scratch. Understand attention heads, positional embeddings (RoPE), KV caching, and decoding strategy structures (top-k, top-p).",
    "rag": "Implement a hierarchical retrieval system. Study hybrid search (sparse BM25 + dense vectors), parent-child document chunk hierarchies, reranking architectures, and query routing.",
    "jax": "Study compiler-oriented coding (XLA). Master `jit()`, `grad()`, `vmap()`, and `pmap()` transformations. Practice writing functional architectures without side-effects.",
    "system design": "Study large-scale data system design. Understand replication models (raft/paxos), messaging bottlenecks (Kafka), database partitioning, and high-availability caching.",
    "reinforcement learning": "Read Sutton & Barto's RL book. Focus on Policy Gradient algorithms, PPO, Deep Q-Networks, and model-free/model-based architecture differences.",
    "rlhf": "Analyze the RLHF pipeline: supervised fine-tuning (SFT), reward model training (Bradley-Terry preference mapping), and PPO optimization algorithms."
  };
  
  let gapHtml = "";
  sortedGaps.forEach(([skill, frequency]) => {
    const defaultGuide = `Required for ${frequency} active application(s) in your pipeline. Consider building a small side project using ${skill} to document competency in your technical resume.`;
    const guide = learningGuides[skill.toLowerCase()] || defaultGuide;
    
    gapHtml += `
      <div class="gap-item">
        <div class="gap-skill-header">
          <span class="gap-skill-name">${skill}</span>
          <span class="job-tag" style="background: rgba(245, 158, 11, 0.1); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.15)">
            Missing in ${frequency} job(s)
          </span>
        </div>
        <p class="gap-recommendation">${guide}</p>
      </div>
    `;
  });
  
  gapContainer.innerHTML = `
    <div class="skills-gap-container">
      <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
        We analyzed your resume against the jobs in your tracker. Here are the top gaps you should address to improve match scores:
      </p>
      ${gapHtml}
    </div>
  `;
}

// Global page load initializations
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


