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
const UNWANTED_TITLES_REGEX = /\b(frontend|front-end|front end|ui|ux|ui\/ux|designer|product design|web designer|web developer|css|html|ios|android|mobile|electrical|hardware|analog|asic|silicon|fpga|rf engineer|pcb|mechanical|chip design|board design|data engineer|data engineering|data scientist|data science|data analyst|analytics engineer|business intelligence|intern|internship|co-op|graduate engineer|junior|entry level|apprentice|sales|account executive|business development|gtm|product manager|program manager|project manager|operations|customer success|recruiter|talent acquisition|human resources|hr|legal|finance|marketing|copywriter|strategist)\b/i;

// Resume Parser Heuristics (Client-Side)
function parseResumeText(text) {
  const normalizedText = text.toLowerCase();
  
  // Strip out education lines (e.g. "Bachelor of Technology in Electrical Engineering") to avoid extracting degree names as technical skills
  const cleanSkillsText = text.replace(/Bachelor of Technology in Electrical Engineering/gi, "")
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
  const coreProfileSkills = ["C++", "Python", "Golang", "C", "Distributed Systems", "Machine Learning", "LLMs", "Post-Training", "Evals", "System Design", "Linux", "Docker", "Kubernetes", "PostgreSQL", "Redis", "Vector Search", "REST APIs", "Microservices"];
  coreProfileSkills.forEach(s => {
    if (!foundSkills.includes(s) && cleanSkillsText.includes(s.toLowerCase())) {
      foundSkills.push(s);
    }
  });
  
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

// Compute Job Match Score
function calculateMatchScore(job, parsedResume) {
  if (!job || !job.title) return { score: 0, matchedSkills: [], missingSkills: [] };

  const titleLower = job.title.toLowerCase();

  // 1. HARD EXCLUSION RULES
  // Instantly score 0 for unwanted domains: Frontend, Hardware, Electrical, Data Engineering, Internships, Business/Non-Tech
  if (UNWANTED_TITLES_REGEX.test(titleLower)) {
    return { score: 0, matchedSkills: [], missingSkills: job.requirements || [] };
  }

  // 2. SKILL MATCHING
  const resumeSkillsUpper = (parsedResume && parsedResume.skills) ? parsedResume.skills.map(s => s.toLowerCase()) : [];
  const reqMatches = [];
  const reqGaps = [];
  
  (job.requirements || []).forEach(req => {
    const reqLow = req.toLowerCase();
    if (resumeSkillsUpper.some(s => s === reqLow || s.includes(reqLow) || reqLow.includes(s))) {
      reqMatches.push(req);
    } else {
      reqGaps.push(req);
    }
  });

  const reqRatio = (job.requirements && job.requirements.length > 0) ? (reqMatches.length / job.requirements.length) : 0.8;
  let baseScore = reqRatio * 50;

  // Preferred skills bonus
  const prefMatches = [];
  (job.preferred || []).forEach(pref => {
    const prefLow = pref.toLowerCase();
    if (resumeSkillsUpper.some(s => s === prefLow || s.includes(prefLow))) {
      prefMatches.push(pref);
    }
  });
  if (job.preferred && job.preferred.length > 0) {
    baseScore += (prefMatches.length / job.preferred.length) * 15;
  } else {
    baseScore += 15;
  }

  // 3. SENIORITY & PROFILE ALIGNMENT
  // User is Senior / Staff / Tech Lead
  const isSeniorTitle = /\b(senior|lead|staff|principal|mts|architect|tech lead|head)\b/i.test(titleLower);
  if (isSeniorTitle) {
    baseScore += 25; // Direct alignment bonus for Senior/Staff roles
  } else if (/\b(junior|intern|associate|graduate)\b/i.test(titleLower)) {
    return { score: 0, matchedSkills: [], missingSkills: job.requirements || [] };
  } else {
    baseScore += 10;
  }

  // Core Tech Stack Bonus (C++, Python, Golang, C, Distributed Systems, Post-Training, Evals, AI Infra)
  const fullText = job.title + " " + job.description + " " + (job.requirements || []).join(" ");
  if (/\b(c\+\+|python|golang|go|c|distributed systems|system design|linux|docker|kubernetes|post-training|evals|evaluations|benchmarking|microservices|vllm|triton|cuda|pytorch|jax)\b/i.test(fullText)) {
    baseScore += 10;
  }

  const finalScore = Math.min(99, Math.max(0, Math.round(baseScore)));
  return {
    score: finalScore,
    matchedSkills: [...new Set([...reqMatches, ...prefMatches])],
    missingSkills: reqGaps
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
      
      <div style="margin-top: 1.5rem; padding: 1rem; border-radius: var(--radius-sm); background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.15)">
        <h4 style="font-family: var(--font-display); color: var(--success); font-size: 0.95rem; margin-bottom: 0.25rem;">✓ Active Matching Profiles</h4>
        <p style="font-size: 0.85rem; color: var(--text-secondary);">Your profile is active. Open the <strong>Job Discovery</strong> feed to view percentage compatibility scores tailored to your experiences.</p>
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
  showToast("Profile data cleared", "warning");
};

// Process Resume Submission
window.submitResumeText = function() {
  const area = document.getElementById("text-paste-area");
  if (!area || !area.value.trim()) {
    showToast("Please enter some resume text first", "warning");
    return;
  }
  
  state.resumeText = area.value.trim();
  state.parsedResume = parseResumeText(state.resumeText);
  saveState();
  renderResumePortal();
  showToast("Resume parsed and synchronized successfully!");
};

// Handle File Drag & Drop
window.initDropzone = function() {
  const dropzone = document.getElementById("dropzone");
  if (!dropzone) return;
  
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
  
  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });
  
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUploadedFile(files[0]);
    }
  });
  
  dropzone.addEventListener("click", () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".pdf,.txt";
    fileInput.onchange = (e) => {
      if (e.target.files.length > 0) {
        handleUploadedFile(e.target.files[0]);
      }
    };
    fileInput.click();
  });
};

function handleUploadedFile(file) {
  const isTxt = file.type === "text/plain" || file.name.endsWith(".txt");
  const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
  
  if (!isTxt && !isPdf) {
    showToast("Unsupported file type. Please upload a .txt or .pdf file.", "danger");
    return;
  }
  
  if (isTxt) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      processExtractedText(text, file.name);
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
  showToast(`Loaded and parsed ${filename}`);
}

async function parsePdfFile(file) {
  if (typeof pdfjsLib === "undefined") {
    showToast("PDF parsing library not loaded. Please check your internet connection.", "danger");
    return;
  }
  
  showToast("Reading PDF file...", "warning");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    const arrayBuffer = e.target.result;
    try {
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = "";
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        text += pageText + "\n";
      }
      
      if (!text.trim()) {
        showToast("Parsed PDF text was empty. Is the PDF scanned or an image?", "warning");
      }
      
      processExtractedText(text, file.name);
    } catch (err) {
      console.error("PDF.js processing error:", err);
      showToast("Failed to parse PDF. Ensure it is a valid text PDF.", "danger");
    }
  };
  reader.readAsArrayBuffer(file);
}

// Page Render: Job Discovery Feed
function renderJobDiscovery() {
  const grid = document.getElementById("jobs-grid");
  if (!grid) return;
  
  const searchVal = document.getElementById("job-search").value.toLowerCase();
  const companySelect = document.getElementById("filter-company");
  const matchSelect = document.getElementById("filter-match");
  const categorySelect = document.getElementById("filter-category");
  const typeSelect = document.getElementById("filter-type");
  const locationSelect = document.getElementById("filter-location");
  
  // Multi-select support: filter passes if job matches ANY selected value.
  const companyVals = companySelect
    ? Array.from(companySelect.selectedOptions).map(o => o.value).filter(v => v !== "")
    : [];
  const matchVals = matchSelect
    ? Array.from(matchSelect.selectedOptions).map(o => o.value).filter(v => v !== "")
    : [];
  const categoryVals = categorySelect
    ? Array.from(categorySelect.selectedOptions).map(o => o.value).filter(v => v !== "")
    : [];
  const typeVals = typeSelect
    ? Array.from(typeSelect.selectedOptions).map(o => o.value).filter(v => v !== "")
    : [];
  const locationVals = locationSelect
    ? Array.from(locationSelect.selectedOptions).map(o => o.value).filter(v => v !== "")
    : [];
  
  const allJobs = getAllJobs();
  
  // Clear Grid
  grid.innerHTML = "";
  
  // Pre-calculate scores and sort jobs by compatibility score descending
  const evaluatedJobs = allJobs.map(job => {
    const matchAnalysis = calculateMatchScore(job, state.parsedResume);
    return { job, score: matchAnalysis.score, matchAnalysis };
  })
  .filter(item => item.score > 0 || searchVal.length > 0) // Exclude 0 score unwanted jobs unless user is explicitly searching
  .sort((a, b) => b.score - a.score);
  
  let matchCount = 0;
  
  evaluatedJobs.forEach(({ job, score, matchAnalysis }) => {
    // 2. Apply Filters
    // Text search
    const textMatches = searchVal.length === 0 || 
                        job.title.toLowerCase().includes(searchVal) || 
                        job.company.toLowerCase().includes(searchVal) || 
                        job.description.toLowerCase().includes(searchVal) ||
                        (job.requirements || []).some(req => req.toLowerCase().includes(searchVal));
                        
    // Company select filter
    const companyMatches = companyVals.length === 0 || companyVals.includes(job.company);
    
    // Category select filter
    const categoryMatches = categoryVals.length === 0 || categoryVals.includes(job.category);
    
    // Job Type select filter
    const typeMatches = typeVals.length === 0 || typeVals.includes(job.employmentType || "Full-time");
    
    // Location select filter
    const locationMatches = locationVals.length === 0 || locationVals.includes(job.location);
    
    // Match score filter
    let scoreMatches = true;
    if (matchVals.length > 0) {
      const scoreBand = score >= 75 ? "high" : (score >= 50 ? "medium" : "low");
      scoreMatches = matchVals.includes(scoreBand);
    }
    
    if (!textMatches || !companyMatches || !categoryMatches || !typeMatches || !locationMatches || !scoreMatches) {
      return;
    }
    
    matchCount++;
    
    // Define score class
    let scoreClass = "low";
    if (score >= 75) scoreClass = "high";
    else if (score >= 50) scoreClass = "medium";
    
    // Render Job Card
    const card = document.createElement("div");
    card.className = "glass glass-interactive job-card";
    card.style.setProperty("--company-color", job.companyColor || "var(--primary)");
    card.onclick = () => openJobDetails(job.id);
    
    const logoHtml = job.logoUrl 
      ? `<div class="company-logo-container">
           <img src="${job.logoUrl}" class="company-logo" alt="${job.company} logo" onerror="this.style.display='none'">
           <span class="company-badge">${job.company}</span>
         </div>`
      : `<span class="company-badge">${job.company}</span>`;

    card.innerHTML = `
      <div>
        <div class="job-card-header">
          ${logoHtml}
          <div class="match-circle ${scoreClass}">
            ${state.resumeText ? score + "%" : "--"}
          </div>
        </div>
        <h3 class="job-title">${job.title}</h3>
        <div class="job-details">
          <div class="detail-line">
            <svg class="detail-line-icon" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span>${job.location}</span>
          </div>
          <div class="detail-line">
            <svg class="detail-line-icon" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>${job.salary}</span>
          </div>
        </div>
      </div>
      <div class="job-card-footer">
        <span class="job-tag">${job.category}</span>
        <span style="font-size: 0.8rem; color: var(--primary); font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem;">
          View details
          <svg style="width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 2;" viewBox="0 0 24 24">
            <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </div>
    `;
    
    grid.appendChild(card);
  });
  
  if (matchCount === 0) {
    grid.innerHTML = `
      <div class="form-group-full" style="text-align: center; color: var(--text-muted); padding: 4rem 1rem; grid-column: span 3;">
        <p style="font-size: 1.1rem; margin-bottom: 0.25rem;">No jobs match your search parameters.</p>
        <p style="font-size: 0.9rem;">Try clearing your filters or adding custom jobs.</p>
      </div>
    `;
  }
}

// Populating filter drop-downs dynamically
function setupDiscoveryFilters() {
  const companySelect = document.getElementById("filter-company");
  const categorySelect = document.getElementById("filter-category");
  const typeSelect = document.getElementById("filter-type");
  const locationSelect = document.getElementById("filter-location");
  const matchSelect = document.getElementById("filter-match");
  
  if (!companySelect || !categorySelect || !typeSelect || !locationSelect || !matchSelect) return;
  
  // Clear options except first
  companySelect.innerHTML = `<option value="">All Companies</option>`;
  categorySelect.innerHTML = `<option value="">All Categories</option>`;
  locationSelect.innerHTML = `<option value="">All Locations</option>`;
  
  const allJobs = getAllJobs();
  
  const companies = [...new Set(allJobs.map(j => j.company))].sort();
  companies.forEach(company => {
    companySelect.innerHTML += `<option value="${company}">${company}</option>`;
  });
  
  const categories = [...new Set(allJobs.map(j => j.category))].sort();
  categories.forEach(cat => {
    categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
  });
  
  const locations = [...new Set(allJobs.map(j => j.location))].sort();
  locations.forEach(location => {
    locationSelect.innerHTML += `<option value="${location}">${location}</option>`;
  });
  
  // Set listener
  document.getElementById("job-search").oninput = renderJobDiscovery;
  companySelect.onchange = renderJobDiscovery;
  categorySelect.onchange = renderJobDiscovery;
  typeSelect.onchange = renderJobDiscovery;
  locationSelect.onchange = renderJobDiscovery;
  matchSelect.onchange = renderJobDiscovery;

  // Native <select multiple> typically requires Cmd/Ctrl for multi-selection.
  // This wrapper allows plain-click toggling so users can pick multiple options naturally.
  function enablePlainClickToggle(selectEl) {
    if (!selectEl || !selectEl.multiple) return;
    
    selectEl.addEventListener("mousedown", (e) => {
      const opt = e.target;
      if (!opt || opt.tagName !== "OPTION") return;
      
      // If user is using modifier keys, allow native behavior.
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      
      // Handle "All ..." option like a reset.
      if (opt.value === "") {
        Array.from(selectEl.options).forEach(o => { o.selected = o.value === ""; });
      } else {
        // Deselect the "All ..." option if present.
        const allOpt = Array.from(selectEl.options).find(o => o.value === "");
        if (allOpt) allOpt.selected = false;
        
        // Toggle the clicked option.
        opt.selected = !opt.selected;
      }
      
      // Prevent native behavior from replacing the selection.
      e.preventDefault();
      
      renderJobDiscovery();
    });
  }

  enablePlainClickToggle(companySelect);
  enablePlainClickToggle(categorySelect);
  enablePlainClickToggle(typeSelect);
  enablePlainClickToggle(locationSelect);
  enablePlainClickToggle(matchSelect);
}

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
    
    gapBox = `
      <div class="modal-job-section">
        <h4 class="modal-section-title">Resume Skills Match Analysis</h4>
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <div>
            <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;">Matching Skills (${match.matchedSkills.length}):</span>
            <div class="pill-container">${matchedPills || '<span style="color: var(--text-muted);">None</span>'}</div>
          </div>
          <div>
            <span style="font-size: 0.8rem; color: var(--warning); display: block; margin-bottom: 0.25rem;">Opportunity Skill Gaps (${match.missingSkills.length}):</span>
            <div class="pill-container">${missingPills || '<span style="color: var(--success);">All skills matched!</span>'}</div>
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
  
  // Check Ollama Local AI connection status
  checkOllamaStatus();
  
  // Set sync tooltip
  const syncBtn = document.getElementById("sync-jobs-btn");
  if (syncBtn) {
    syncBtn.title = `Last Synced: ${window.lastSyncedJobs || "Unknown"}`;
  }
});

// --- ML Features: Ollama & Offline Fallbacks ---
let isOllamaOnline = false;
const OLLAMA_URL = "http://localhost:11434";
const OLLAMA_MODEL = "qwen2.5:0.5b";

async function checkOllamaStatus() {
  const badges = document.querySelectorAll(".ollama-status-badge");
  const dots = document.querySelectorAll(".status-dot");
  
  const updateUI = (status, text) => {
    dots.forEach(dot => {
      dot.className = `status-dot ${status}`;
    });
    badges.forEach(badge => {
      const dotEl = badge.querySelector(".status-dot");
      const dotHtml = dotEl ? dotEl.outerHTML : `<span class="status-dot ${status}"></span>`;
      badge.innerHTML = `${dotHtml} ${text}`;
    });
  };
  
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { method: "GET" });
    if (res.ok) {
      isOllamaOnline = true;
      updateUI("online", "Local AI Online");
    } else {
      isOllamaOnline = false;
      updateUI("offline", "Offline Mock Active");
    }
  } catch (e) {
    isOllamaOnline = false;
    updateUI("offline", "Offline Mock Active");
  }
}

async function callLocalLLM(prompt, systemPrompt = "") {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        system: systemPrompt,
        stream: false
      })
    });
    
    if (!response.ok) throw new Error("Local LLM API error");
    const data = await response.json();
    return data.response;
  } catch (err) {
    console.warn("LLM API call failed, falling back.", err);
    throw err;
  }
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
  resultText.textContent = "Writing your cover letter...";
  btn.disabled = true;
  
  const statusBadge = btn.parentElement.querySelector(".ollama-status-badge");
  if (statusBadge) statusBadge.innerHTML = `<span class="status-dot loading"></span> Generating...`;
  
  const prompt = `Write a professional cover letter for the role of ${job.title} at ${job.company}.
Candidate Details:
- Name: ${state.parsedResume.name}
- Inferred level: ${state.parsedResume.experienceLevel}
- Key Skills: ${state.parsedResume.skills.join(", ")}

Job Details:
- Description: ${job.description}
- Key requirements: ${job.requirements.join(", ")}

Keep it professional, engaging, structured, and under 300 words. Address the hiring manager of ${job.company}.`;

  const system = "You are a professional technical career advisor who writes exceptional, concise cover letters.";
  
  try {
    let coverLetter = "";
    if (isOllamaOnline) {
      coverLetter = await callLocalLLM(prompt, system);
    } else {
      // Simulate delay for realism
      await new Promise(resolve => setTimeout(resolve, 800));
      coverLetter = generateMockCoverLetter(job, state.parsedResume);
    }
    resultText.textContent = coverLetter;
  } catch (e) {
    resultText.textContent = generateMockCoverLetter(job, state.parsedResume);
  } finally {
    btn.disabled = false;
    checkOllamaStatus();
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
  const name = resume.name || "Candidate Name";
  const email = resume.email || "candidate@email.com";
  const company = job.company;
  const title = job.title;
  const location = job.location;
  const matchedSkills = resume.skills.filter(s => job.requirements.some(r => r.toLowerCase() === s.toLowerCase()));
  const skillsList = matchedSkills.length > 0 ? matchedSkills.slice(0, 4).join(", ") : "Python, Machine Learning, Systems Architecture";
  
  return `Dear Hiring Team at ${company},

I am writing to express my strong interest in the ${title} position. As a software professional at the ${resume.experienceLevel} level, I am excited about the opportunity to contribute to your engineering and research efforts.

In reviewing the requirements for the role, I was thrilled to see a close alignment with my background. I have hands-on experience and solid proficiency in key technologies requested by your team, specifically: ${skillsList}.

Throughout my career, I have focused on building robust, scalable solutions, optimizing pipelines, and collaborating with cross-functional teams to deliver high-quality systems. I am particularly drawn to ${company} because of your leadership and innovation in this domain.

Thank you for your time and consideration. I welcome the opportunity to discuss how my skills and experience can support the team's goals.

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
  resultText.textContent = "Optimizing your bullet point for matching keywords...";
  
  const statusBadge = document.getElementById("ollama-status");
  if (statusBadge) statusBadge.innerHTML = `<span class="status-dot loading"></span> Optimizing...`;
  
  const prompt = `Optimize the following resume bullet point for the role of ${job.title} at ${job.company}.
Original Bullet: "${bulletInput}"
Target Job Requirements: ${job.requirements.join(", ")}

Generate 3 alternative optimized bullets. Ensure they start with strong action verbs, focus on results/impact, and highlight target keywords. Do not explain the output; only output the 3 bullet options.`;

  const system = "You are a professional technical recruiter who optimizes resumes to pass ATS screeners.";

  try {
    let result = "";
    if (isOllamaOnline) {
      result = await callLocalLLM(prompt, system);
    } else {
      await new Promise(resolve => setTimeout(resolve, 800));
      result = generateMockOptimizedBullet(bulletInput, job);
    }
    resultText.textContent = result;
  } catch (e) {
    resultText.textContent = generateMockOptimizedBullet(bulletInput, job);
  } finally {
    checkOllamaStatus();
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
    if (!response.ok) throw new Error("Sync failed");
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
    showToast("Sync failed. Check if local Python server is running.", "danger");
    text.textContent = "Sync Live Jobs";
  } finally {
    btn.disabled = false;
    icon.classList.remove("spin");
  }
};


