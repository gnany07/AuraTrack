import urllib.request
import json
import re
import os
import datetime

# Accents colors for companies
COMPANY_COLORS = {
    "OpenAI": "linear-gradient(135deg, #10a37f, #000000)",
    "Anthropic": "linear-gradient(135deg, #cc7b5c, #191919)",
    "Sierra": "linear-gradient(135deg, #ff4500, #ff8c00)",
    "Google DeepMind": "linear-gradient(135deg, #4285F4, #34A853)",
    "Microsoft AI": "linear-gradient(135deg, #0078D4, #00B2F0)",
    "Meta AI": "linear-gradient(135deg, #0668E1, #0080FF)",
    "Perplexity AI": "linear-gradient(135deg, #13c2c2, #006d75)",
    "Scale AI": "linear-gradient(135deg, #000000, #f1c40f)",
    "Cohere": "linear-gradient(135deg, #9b59b6, #8e44ad)",
    "Mistral AI": "linear-gradient(135deg, #e67e22, #d35400)",
    "xAI": "linear-gradient(135deg, #22d3ee, #111827)",
    "Stability AI": "linear-gradient(135deg, #f43f5e, #111827)",
    "Groq": "linear-gradient(135deg, #60a5fa, #1d4ed8)",
    "Cerebras": "linear-gradient(135deg, #34d399, #064e3b)",
    "Anysphere": "linear-gradient(135deg, #0284c7, #0f172a)",
    "Harvey": "linear-gradient(135deg, #1e293b, #000000)",
    "Abridge": "linear-gradient(135deg, #059669, #022c22)",
    "Decagon": "linear-gradient(135deg, #7c3aed, #1e1b4b)",
    "Physical Intelligence": "linear-gradient(135deg, #ea580c, #431407)",
    "Anduril": "linear-gradient(135deg, #4b5563, #000000)",
    "ElevenLabs": "linear-gradient(135deg, #e0f2fe, #0f172a)",
    "Cognition": "linear-gradient(135deg, #f97316, #7c2d12)",
    "Imbue": "linear-gradient(135deg, #ec4899, #4c1d95)",
    "Hebbia": "linear-gradient(135deg, #3b82f6, #1e3a8a)",
    "Poolside": "linear-gradient(135deg, #10b981, #064e3b)",
    "Glean": "linear-gradient(135deg, #f59e0b, #78350f)",
    "RunwayML": "linear-gradient(135deg, #ef4444, #1e1b4b)",
    "Reflection AI": "linear-gradient(135deg, #6366f1, #0f172a)",
    "Wayve": "linear-gradient(135deg, #2563eb, #1e293b)",
    "Nscale": "linear-gradient(135deg, #0ea5e9, #0369a1)",
    "Isomorphic Labs": "linear-gradient(135deg, #10b981, #047857)",
    "Synthesia": "linear-gradient(135deg, #8b5cf6, #4c1d95)",
    "Granola": "linear-gradient(135deg, #f59e0b, #b45309)",
    "Recraft": "linear-gradient(135deg, #ec4899, #be185d)",
    "Humanloop": "linear-gradient(135deg, #06b6d4, #0e7490)",
    "V7 Labs": "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    "PolyAI": "linear-gradient(135deg, #10b981, #065f46)",
    "Robin AI": "linear-gradient(135deg, #f97316, #c2410c)",
    "PhysicsX": "linear-gradient(135deg, #64748b, #0f172a)",
    "Basecamp Research": "linear-gradient(135deg, #14b8a6, #0f766e)",
    "Unitary": "linear-gradient(135deg, #a855f7, #6b21a8)",
    "Causaly": "linear-gradient(135deg, #3b82f6, #1e40af)",
    "Speechmatics": "linear-gradient(135deg, #f43f5e, #be123c)",
    "Automata": "linear-gradient(135deg, #6366f1, #3730a3)",
    "Quantexa": "linear-gradient(135deg, #0284c7, #075985)",
    "Thought Machine": "linear-gradient(135deg, #10b981, #064e3b)",
    "Faculty": "linear-gradient(135deg, #475569, #0f172a)",
    "Cleo": "linear-gradient(135deg, #ec4899, #9d174d)",
    "Omnea": "linear-gradient(135deg, #f59e0b, #d97706)",
    "Papercup": "linear-gradient(135deg, #8b5cf6, #5b21b6)",
    "Healx": "linear-gradient(135deg, #06b6d4, #155e75)",
    "Multiverse": "linear-gradient(135deg, #6366f1, #4338ca)",
    "Unlikely AI": "linear-gradient(135deg, #a855f7, #581c87)",
    "Airspeed": "linear-gradient(135deg, #38bdf8, #0369a1)"
}

COMPANY_DOMAINS = {
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
    "Omnea": "omnea.co",
    "Papercup": "papercup.com",
    "Healx": "healx.ai",
    "Multiverse": "multiverse.io",
    "Unlikely AI": "unlikely.ai",
    "Airspeed": "airspeed.ai"
}

SKILL_LIST = [
    "Python", "PyTorch", "JAX", "TensorFlow", "CUDA", "Triton", "vLLM", 
    "TensorRT-LLM", "C++", "Rust", "Go", "Golang", "C", "Docker", 
    "Kubernetes", "AWS", "Azure", "GCP", "Distributed Systems", "System Design", 
    "Git", "GitHub", "PostgreSQL", "MongoDB", "MySQL", "Redis", "Kafka", 
    "ElasticSearch", "Vector Search", "TypeScript", "JavaScript", "React", 
    "Node.js", "Next.js", "LLMs", "RAG", "RLHF", "NLP", "Computer Vision", 
    "Transformers", "Deep Learning", "Machine Learning", "MoE", "Quantization", 
    "Fine-tuning", "LLM Development", "OOPs", "LLD", "HLD", "Design Patterns", 
    "API Design", "Operating Systems", "Computer Networking", "WebSockets",
    "Three.js", "WebGL", "Product Management", "UI/UX"
]

TARGET_LOCATION_PATTERNS = [
    re.compile(r"\blondon\b", re.IGNORECASE),
    re.compile(r"\buk\b", re.IGNORECASE),
    re.compile(r"united\s+kingdom", re.IGNORECASE),
]

# Only keep software-engineering roles:
# - include: SWE / Platform / MLE (engineering-focused ML engineering)
# - exclude: Research and Product
ALLOWED_CATEGORIES = {"SWE", "Platform", "MLE"}

# Explicitly exclude data engineer roles, even if the category guess is SWE.
DATA_ENGINEERING_PATTERNS = [
    re.compile(r"\bdata engineer\b", re.IGNORECASE),
    re.compile(r"\bdata engineering\b", re.IGNORECASE),
    re.compile(r"\bdata scientist\b", re.IGNORECASE),
]

def get_employment_type(title: str, employment_type: str = "") -> str:
    title_lower = title.lower()
    if "intern" in title_lower:
        return "Internship"
    elif "contract" in title_lower or "temp" in title_lower:
        return "Contract"
    elif "part" in title_lower and "time" in title_lower:
        return "Part-time"
    
    emp = (employment_type or "").lower()
    if "intern" in emp:
        return "Internship"
    elif "contract" in emp:
        return "Contract"
    elif "part-time" in emp or "part time" in emp:
        return "Part-time"
    
    return "Full-time"

def location_matches_target(location_str: str) -> bool:
    return True  # Relaxed to fetch all locations

def is_data_engineering_role(full_text: str) -> bool:
    text = (full_text or "").lower()
    return any(p.search(text) for p in DATA_ENGINEERING_PATTERNS)

EXCLUDED_ROLE_PATTERNS = [
    # Sales / bizdev
    re.compile(r"\bsales\b", re.IGNORECASE),
    re.compile(r"\baccount executive\b", re.IGNORECASE),
    re.compile(r"\bbusiness development\b", re.IGNORECASE),
    re.compile(r"\brevenue\b", re.IGNORECASE),
    re.compile(r"\bgo[- ]to[- ]market\b", re.IGNORECASE),
    re.compile(r"\bgtm\b", re.IGNORECASE),
    # Program / project management
    re.compile(r"\bprogram manager\b", re.IGNORECASE),
    re.compile(r"\btechnical program manager\b", re.IGNORECASE),
    re.compile(r"\btpm\b", re.IGNORECASE),
    re.compile(r"\bprogram management\b", re.IGNORECASE),
    re.compile(r"\bproject manager\b", re.IGNORECASE),
    # Operations (business/customer oriented; avoid excluding SRE-style engineering)
    re.compile(r"\brevenue operations\b", re.IGNORECASE),
    re.compile(r"\bbusiness operations\b", re.IGNORECASE),
    re.compile(r"\bcustomer success\b", re.IGNORECASE),
    re.compile(r"\boperations manager\b", re.IGNORECASE),
    re.compile(r"\bops manager\b", re.IGNORECASE),
    re.compile(r"\boperations lead\b", re.IGNORECASE),
    re.compile(r"\bsupport operations\b", re.IGNORECASE),
    # Additional user exclusions
    re.compile(r"\bsecurity\b", re.IGNORECASE),
    re.compile(r"\bprocess manager\b", re.IGNORECASE),
    re.compile(r"\bprocess management\b", re.IGNORECASE),
    re.compile(r"\bstrategy\b", re.IGNORECASE),
    re.compile(r"\bstrategist\b", re.IGNORECASE),
    re.compile(r"\binvestigator\b", re.IGNORECASE),
    re.compile(r"\bthreat investigator\b", re.IGNORECASE),
    re.compile(r"\bfreelance\b", re.IGNORECASE),
    re.compile(r"\bfreelancer\b", re.IGNORECASE),
]

def is_excluded_non_engineering_role(full_text: str) -> bool:
    text = (full_text or "").lower()
    return any(p.search(text) for p in EXCLUDED_ROLE_PATTERNS)

def clean_html(raw_html):
    if not raw_html:
        return ""
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, ' ', raw_html)
    return re.sub(r'\s+', ' ', cleantext).strip()

def extract_skills(text):
    text_lower = text.lower()
    found = []
    for skill in SKILL_LIST:
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        # Special cases
        if skill.lower() in ["pytorch", "tensorflow", "deepspeed", "huggingface", "vllm", "nextjs", "nodejs", "golang"]:
            # Match with or without hyphen/space
            norm_skill = skill.lower().replace("-", "").replace(".", "")
            if norm_skill in text_lower.replace("-", "").replace(".", ""):
                found.append(skill)
                continue
        if re.search(pattern, text_lower):
            found.append(skill)
    # Map Golang to Go/Golang
    if "Golang" in found and "Go" not in found:
        found.append("Go")
    if "Go" in found and "Golang" not in found:
        found.append("Golang")
    return list(set(found))

def fetch_ashby(company_name, board_slug=None):
    print(f"Fetching {company_name} jobs from Ashby...")
    # Org name slug mapping
    slug = board_slug or company_name.lower().replace(" ", "")
    url = f"https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true"
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode())
            jobs = []
            for item in data.get("jobs", []):
                title = item.get("title", "")
                team = item.get("team", "") or ""
                dept = item.get("department", "") or ""
                
                # Filter for technical roles
                keywords = ["engineer", "developer", "scientist", "researcher", "technical staff", "mts", "infrastructure", "systems", "platform", "product manager", "architect", "lead"]
                is_tech = (
                    any(kw in title.lower() for kw in keywords) or 
                    any(kw in team.lower() for kw in ["engineering", "research", "technical", "product", "infrastructure"]) or
                    any(kw in dept.lower() for kw in ["engineering", "research", "technical", "product", "infrastructure"])
                )
                if not is_tech:
                    continue
                
                location = item.get("location", "")
                desc_plain = item.get("descriptionPlain", "")
                employment_type = item.get("employmentType", "")
                
                full_text = title + " " + team + " " + dept + " " + desc_plain
                skills = extract_skills(full_text)
                
                # Guess Category
                category = "SWE"
                if "research" in title.lower() or "scientist" in title.lower():
                    category = "Research"
                elif "machine learning" in title.lower() or "ml" in title.lower() or "applied science" in title.lower():
                    category = "MLE"
                elif any(kw in title.lower() for kw in ["infrastructure", "platform", "reliability", "sre", "hardware", "systems"]):
                    category = "Platform"
                elif "product manager" in title.lower():
                    category = "Product"
                
                # Keep only London + software-engineering-relevant roles.
                if category not in ALLOWED_CATEGORIES:
                    continue
                if is_data_engineering_role(full_text):
                    continue
                if is_excluded_non_engineering_role(full_text):
                    continue
                if not location_matches_target(location):
                    continue
                
                # Extract salary
                salary_match = re.search(r'\$\d{3,},\d{3}\s*(?:-|to)\s*\$\d{3,},\d{3}', desc_plain)
                salary = salary_match.group(0) if salary_match else "$200,000 - $330,000 + equity"
                
                domain = COMPANY_DOMAINS.get(company_name, "github.com")
                logoUrl = f"https://logo.clearbit.com/{domain}"
                
                jobs.append({
                    "id": f"{slug}-{item.get('id')}",
                    "company": company_name,
                    "title": title,
                    "category": category,
                    "employmentType": get_employment_type(title, employment_type),
                    "location": f"{location} (Hybrid)" if "hybrid" not in location.lower() and "remote" not in location.lower() else location,
                    "salary": salary,
                    "applyUrl": item.get("applyUrl") or item.get("jobUrl") or f"https://jobs.ashbyhq.com/{slug}",
                    "description": desc_plain[:300] + "...",
                    "requirements": skills[:8],
                    "preferred": skills[8:12] if len(skills) > 8 else ["High performance distributed processing"],
                    "companyColor": COMPANY_COLORS.get(company_name, "linear-gradient(135deg, #a855f7, #6366f1)"),
                    "logoUrl": logoUrl
                })
            print(f"Parsed {len(jobs)} {company_name} jobs.")
            return jobs
    except Exception as e:
        print(f"Failed to fetch {company_name} jobs: {e}")
        return []

def fetch_greenhouse(company_name, board_slug):
    print(f"Fetching {company_name} jobs from Greenhouse...")
    url = f"https://boards-api.greenhouse.io/v1/boards/{board_slug}/jobs?content=true"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode())
            jobs = []
            for item in data.get("jobs", []):
                title = item.get("title", "")
                depts = " ".join([d.get("name", "") for d in item.get("departments", [])])
                
                # Technical filters
                keywords = ["engineer", "developer", "scientist", "researcher", "technical staff", "mts", "infrastructure", "systems", "platform", "product manager", "architect", "lead"]
                is_tech = (
                    any(kw in title.lower() for kw in keywords) or 
                    any(kw in depts.lower() for kw in ["engineering", "research", "technical", "product"])
                )
                if not is_tech:
                    continue
                
                location = item.get("location", {}).get("name", "") if item.get("location") else ""
                content = clean_html(item.get("content", ""))
                skills = extract_skills(title + " " + depts + " " + content)
                
                # Guess Category
                category = "SWE"
                if "research" in title.lower() or "scientist" in title.lower():
                     category = "Research"
                elif "machine learning" in title.lower() or "ml" in title.lower() or "applied science" in title.lower():
                     category = "MLE"
                elif any(kw in title.lower() for kw in ["infrastructure", "platform", "reliability", "sre", "hardware", "systems"]):
                     category = "Platform"
                elif "product manager" in title.lower():
                     category = "Product"
                
                # Keep only London + software-engineering-relevant roles.
                full_text = title + " " + depts + " " + content
                if category not in ALLOWED_CATEGORIES:
                    continue
                if is_data_engineering_role(full_text):
                    continue
                if is_excluded_non_engineering_role(full_text):
                    continue
                if not location_matches_target(location):
                    continue
                
                # Salary extraction
                salary_match = re.search(r'\$\d{3,},\d{3}\s*(?:-|to)\s*\$\d{3,},\d{3}', content)
                salary = salary_match.group(0) if salary_match else "$185,000 - $330,000 + equity"
                
                domain = COMPANY_DOMAINS.get(company_name, "github.com")
                logoUrl = f"https://logo.clearbit.com/{domain}"
                
                jobs.append({
                    "id": f"{board_slug}-{item.get('id')}",
                    "company": company_name,
                    "title": title,
                    "category": category,
                    "employmentType": get_employment_type(title),
                    "location": location,
                    "salary": salary,
                    "applyUrl": item.get("absolute_url", f"https://boards.greenhouse.io/{board_slug}"),
                    "description": content[:300] + "...",
                    "requirements": skills[:8],
                    "preferred": skills[8:12] if len(skills) > 8 else ["Transformer model fine-tuning"],
                    "companyColor": COMPANY_COLORS.get(company_name, "linear-gradient(135deg, #cc7b5c, #191919)"),
                    "logoUrl": logoUrl
                })
            print(f"Parsed {len(jobs)} {company_name} jobs.")
            return jobs
    except Exception as e:
        print(f"Failed to fetch {company_name} jobs: {e}")
        return []

def get_static_seeds():
    # Seed roles are intentionally London-focused and engineering-focused
    # to match the user's current preferences.
    return [
      {
        "id": "static-openai-swe-inference",
        "company": "OpenAI",
        "title": "Software Engineer - LLM Inference Services",
        "category": "SWE",
        "location": "London, UK (Hybrid)",
        "salary": "£120,000 - £220,000 + bonus + equity",
        "applyUrl": "https://openai.com/careers",
        "description": "Design and ship production-grade inference services for low-latency model execution. Work on batching, caching, request routing, and reliability tooling.",
        "requirements": ["Python", "C++", "Distributed Systems", "System Design", "Linux", "Docker", "Kubernetes", "APIs"],
        "preferred": ["Go", "Vector Search", "Observability", "WebSockets"],
        "companyColor": COMPANY_COLORS["OpenAI"]
      },
      {
        "id": "static-cohere-backend-rag",
        "company": "Cohere",
        "title": "Backend Engineer - RAG Retrieval & Ranking",
        "category": "SWE",
        "location": "London, UK (Hybrid)",
        "salary": "£110,000 - £200,000 + equity",
        "applyUrl": "https://cohere.ai/careers",
        "description": "Build backend services for retrieval-augmented generation, including indexing, hybrid search, reranking pipelines, and evaluation harnesses.",
        "requirements": ["Python", "PostgreSQL", "Redis", "Vector Search", "RAG", "System Design", "APIs", "Git"],
        "preferred": ["ElasticSearch", "Kafka", "Monitoring", "Node.js"],
        "companyColor": COMPANY_COLORS["Cohere"]
      },
      {
        "id": "static-mistral-serving-platform",
        "company": "Mistral AI",
        "title": "Software Engineer - Model Serving Infrastructure",
        "category": "Platform",
        "location": "London, UK (Hybrid)",
        "salary": "£120,000 - £210,000 + equity",
        "applyUrl": "https://mistral.ai/careers",
        "description": "Own core serving infrastructure for frontier models, improving throughput, latency, and cost. Collaborate on autoscaling, caching, and incident response playbooks.",
        "requirements": ["Python", "Go", "Kubernetes", "Distributed Systems", "Linux", "System Design", "Docker", "PostgreSQL"],
        "preferred": ["CUDA", "Triton", "Observability", "Incident Management"],
        "companyColor": COMPANY_COLORS["Mistral AI"]
      },
      {
        "id": "static-stability-platform-deploy",
        "company": "Stability AI",
        "title": "Platform Engineer - Generative Model Deployment",
        "category": "Platform",
        "location": "London, UK (Onsite)",
        "salary": "£100,000 - £190,000 + bonus + equity",
        "applyUrl": "https://stability.ai/careers",
        "description": "Create reliable pipelines for deploying generative models at scale. Focus on inference orchestration, versioning, and automated regression testing.",
        "requirements": ["Python", "Docker", "Kubernetes", "System Design", "CI/CD", "APIs", "Linux", "GitHub"],
        "preferred": ["Kafka", "Vector Search", "WebSockets", "Observability"],
        "companyColor": COMPANY_COLORS["Stability AI"]
      },
      {
        "id": "static-xai-backend-systems",
        "company": "xAI",
        "title": "Backend Engineer - Conversational Systems",
        "category": "SWE",
        "location": "London, UK (Hybrid)",
        "salary": "£110,000 - £200,000 + equity",
        "applyUrl": "https://x.ai/careers",
        "description": "Build backend systems for conversational experiences: orchestration, tool routing, prompt/response pipelines, and robust telemetry for debugging.",
        "requirements": ["TypeScript", "Node.js", "APIs", "System Design", "PostgreSQL", "Redis", "Git", "Distributed Systems"],
        "preferred": ["React", "WebSockets", "LLMs", "RAG"],
        "companyColor": COMPANY_COLORS["xAI"]
      },
      {
        "id": "static-groq-inference-optim",
        "company": "Groq",
        "title": "Software Engineer - Inference Optimization & Tooling",
        "category": "Platform",
        "location": "London, UK (Hybrid)",
        "salary": "£120,000 - £230,000 + equity",
        "applyUrl": "https://groq.com/careers",
        "description": "Work on inference optimization tooling and performance engineering, helping improve throughput and latency for large language model workloads.",
        "requirements": ["Python", "C++", "System Design", "Linux", "Performance", "Distributed Systems", "Docker", "APIs"],
        "preferred": ["Rust", "CUDA", "Triton", "Observability"],
        "companyColor": COMPANY_COLORS["Groq"]
      },
      {
        "id": "static-cerebras-hw-compiler",
        "company": "Cerebras",
        "title": "Software Engineer - Hardware/Compiler Integration",
        "category": "Platform",
        "location": "London, UK (Hybrid)",
        "salary": "£120,000 - £220,000 + equity",
        "applyUrl": "https://cerebras.ai/careers",
        "description": "Partner with engineering teams to integrate model execution flows with hardware compilation paths. Drive improvements in reliability and developer tooling.",
        "requirements": ["Python", "C++", "Linux", "System Design", "Distributed Systems", "Git", "APIs", "Operating Systems"],
        "preferred": ["CUDA", "Rust", "Performance Profiling", "Testing Automation"],
        "companyColor": COMPANY_COLORS["Cerebras"]
      },
      {
        "id": "static-deepmind-swe-platform",
        "company": "Google DeepMind",
        "title": "Software Engineer - Scalable ML Platform",
        "category": "Platform",
        "location": "London, UK (Hybrid)",
        "salary": "£120,000 - £230,000 + bonus + equity",
        "applyUrl": "https://careers.google.com/jobs/results/",
        "description": "Build and maintain scalable training/inference platform services. Improve distributed execution, monitoring, and developer experience for ML engineering teams.",
        "requirements": ["Python", "C++", "Distributed Systems", "System Design", "Kubernetes", "Docker", "Linux", "Git"],
        "preferred": ["JAX", "CUDA", "Observability", "Performance Engineering"],
        "companyColor": COMPANY_COLORS["Google DeepMind"]
      },
      {
        "id": "static-anthropic-swe-model-serving",
        "company": "Anthropic",
        "title": "Software Engineer - Model Serving & Safety Tooling",
        "category": "SWE",
        "location": "London, UK (Hybrid)",
        "salary": "£110,000 - £210,000 + equity",
        "applyUrl": "https://www.anthropic.com/careers",
        "description": "Own pieces of the model serving stack and safety tooling needed to run production workloads reliably. Work closely with infra and product teams to improve reliability and evaluation flows.",
        "requirements": ["Python", "Go", "Linux", "Distributed Systems", "System Design", "Docker", "Kubernetes", "APIs"],
        "preferred": ["Vector Search", "Observability", "Incident Response"],
        "companyColor": COMPANY_COLORS["Anthropic"]
      },
      {
        "id": "static-microsoft-platform-ai",
        "company": "Microsoft AI",
        "title": "Software Engineer - AI Platform & Infrastructure",
        "category": "Platform",
        "location": "London, UK (Hybrid)",
        "salary": "£120,000 - £230,000 + bonus + equity",
        "applyUrl": "https://careers.microsoft.com/",
        "description": "Build and scale infrastructure powering AI workloads. Focus on distributed systems, reliability, and platform services that support model execution and developer tooling.",
        "requirements": ["C#", "Python", "Azure", "Kubernetes", "Distributed Systems", "System Design", "Linux", "APIs"],
        "preferred": ["Go", "Rust", "Observability", "Performance Engineering"],
        "companyColor": COMPANY_COLORS["Microsoft AI"]
      },
      {
        "id": "static-meta-swe-llama-runtime",
        "company": "Meta AI",
        "title": "Backend Engineer - Llama Runtime Performance",
        "category": "SWE",
        "location": "London, UK (Hybrid)",
        "salary": "£110,000 - £210,000 + equity",
        "applyUrl": "https://www.metacareers.com/",
        "description": "Improve runtime performance and system efficiency for LLM workloads. Work on scheduling, batching, caching, and reliability for production inference pipelines.",
        "requirements": ["Python", "C++", "Linux", "Distributed Systems", "System Design", "Docker", "Kubernetes", "APIs"],
        "preferred": ["CUDA", "Profiling", "Observability", "WebSockets"],
        "companyColor": COMPANY_COLORS["Meta AI"]
      },
      {
        "id": "static-perplexity-swe-search",
        "company": "Perplexity AI",
        "title": "Backend Engineer - Search & Retrieval",
        "category": "SWE",
        "location": "London, UK (Hybrid)",
        "salary": "£100,000 - £190,000 + equity",
        "applyUrl": "https://www.perplexity.ai/careers",
        "description": "Build retrieval-augmented search backends: indexing, ranking, and integration with LLM-based response generation. Optimize latency and relevance evaluation loops.",
        "requirements": ["Python", "Go", "PostgreSQL", "Redis", "Vector Search", "RAG", "System Design", "Distributed Systems"],
        "preferred": ["ElasticSearch", "Kafka", "Node.js", "Observability"],
        "companyColor": COMPANY_COLORS["Perplexity AI"]
      },
      {
        "id": "static-scale-swe-core-platform",
        "company": "Scale AI",
        "title": "Software Engineer - Core Platform & Pipelines",
        "category": "SWE",
        "location": "London, UK (Hybrid)",
        "salary": "£110,000 - £200,000 + equity",
        "applyUrl": "https://scale.com/careers",
        "description": "Build high-throughput platform services used across AI workflows. Focus on microservices, reliability, and developer APIs for pipeline orchestration.",
        "requirements": ["Python", "TypeScript", "Node.js", "PostgreSQL", "Redis", "AWS", "System Design", "Git"],
        "preferred": ["Kubernetes", "Kafka", "Docker", "Observability"],
        "companyColor": COMPANY_COLORS["Scale AI"]
      },
      {
        "id": "static-reflection-swe-agent-runtime",
        "company": "Reflection AI",
        "title": "Software Engineer - Autonomous Agent Runtime & Post-Training",
        "category": "SWE",
        "location": "London, UK (Hybrid)",
        "salary": "£130,000 - £250,000 + significant equity",
        "applyUrl": "https://reflection.ai/careers",
        "description": "Build high-throughput post-training pipelines and execution runtimes for autonomous coding agents (Asimov). Optimize RLHF, synthetic data loops, and distributed inference.",
        "requirements": ["Python", "PyTorch", "C++", "CUDA", "LLMs", "RLHF", "Distributed Systems", "System Design"],
        "preferred": ["Triton", "vLLM", "Docker", "Kubernetes"],
        "companyColor": COMPANY_COLORS["Reflection AI"]
      },
      {
        "id": "static-nscale-mts-gpu-infra",
        "company": "Nscale",
        "title": "Member of Technical Staff - Sovereign GPU Cloud Platform",
        "category": "Platform",
        "location": "London, UK (Hybrid)",
        "salary": "£120,000 - £240,000 + equity",
        "applyUrl": "https://nscale.com/careers",
        "description": "Architect and scale distributed compute orchestrators for multi-thousand GPU clusters. Build high-availability control planes and telemetry systems.",
        "requirements": ["Go", "C++", "Kubernetes", "Distributed Systems", "System Design", "Linux", "Docker", "AWS"],
        "preferred": ["CUDA", "Triton", "Observability", "Terraform"],
        "companyColor": COMPANY_COLORS["Nscale"]
      },
      {
        "id": "static-robinai-swe-legal-copilot",
        "company": "Robin AI",
        "title": "Senior Software Engineer - Legal Contract Intelligence",
        "category": "SWE",
        "location": "London, UK (Hybrid)",
        "salary": "£100,000 - £180,000 + equity",
        "applyUrl": "https://www.robinai.com/careers",
        "description": "Develop contract analysis engines using state-of-the-art LLMs. Design real-time editing workflows, RAG pipelines, and enterprise integrations.",
        "requirements": ["Python", "TypeScript", "React", "PostgreSQL", "RAG", "LLMs", "APIs", "System Design"],
        "preferred": ["Next.js", "Redis", "Vector Search", "Docker"],
        "companyColor": COMPANY_COLORS["Robin AI"]
      },
      {
        "id": "static-humanloop-fullstack-eval",
        "company": "Humanloop",
        "title": "Full Stack Engineer - LLM Evaluation & Prompt Engineering Platform",
        "category": "SWE",
        "location": "London, UK (Hybrid)",
        "salary": "£95,000 - £170,000 + equity",
        "applyUrl": "https://humanloop.com/careers",
        "description": "Build modern web and API interfaces for testing, evaluating, and monitoring enterprise LLM applications in production.",
        "requirements": ["TypeScript", "Python", "React", "Next.js", "PostgreSQL", "APIs", "LLMs", "System Design"],
        "preferred": ["Vector Search", "Redis", "Docker", "Tailwind"],
        "companyColor": COMPANY_COLORS["Humanloop"]
      },
      {
        "id": "static-v7labs-backend-vision-data",
        "company": "V7 Labs",
        "title": "Senior Backend Engineer - Vision AI & Automation Pipelines",
        "category": "Platform",
        "location": "London, UK (Hybrid)",
        "salary": "£100,000 - £180,000 + equity",
        "applyUrl": "https://www.v7labs.com/careers",
        "description": "Scale high-volume image/video data annotation and model training pipelines. Build real-time streaming backends and computer vision tooling.",
        "requirements": ["Python", "Go", "PostgreSQL", "Redis", "Distributed Systems", "Docker", "Kubernetes", "AWS"],
        "preferred": ["PyTorch", "Computer Vision", "WebSockets", "Kafka"],
        "companyColor": COMPANY_COLORS["V7 Labs"]
      },
      {
        "id": "static-causaly-mle-platform",
        "company": "Causaly",
        "title": "Senior ML Platform Engineer - Biomedical Causal AI",
        "category": "MLE",
        "location": "London, UK (Hybrid)",
        "salary": "£110,000 - £190,000 + equity",
        "applyUrl": "https://www.causaly.com/careers",
        "description": "Engine causal graph algorithms and entity extraction pipelines over millions of scientific papers to accelerate pharmaceutical research.",
        "requirements": ["Python", "PyTorch", "Graph Databases", "NLP", "LLMs", "Vector Search", "Docker", "System Design"],
        "preferred": ["Neo4j", "ElasticSearch", "JAX", "Kubernetes"],
        "companyColor": COMPANY_COLORS["Causaly"]
      },
      {
        "id": "static-automata-robotics-swe",
        "company": "Automata",
        "title": "Software Engineer - Lab Automation & Robotics Systems",
        "category": "SWE",
        "location": "London, UK (Hybrid)",
        "salary": "£90,000 - £160,000 + equity",
        "applyUrl": "https://automata.tech/careers",
        "description": "Design motion planning and hardware control software for automated lab robotics platforms used in life sciences.",
        "requirements": ["Python", "C++", "Linux", "ROS", "System Design", "Git", "APIs", "Docker"],
        "preferred": ["WebSockets", "TypeScript", "Embedded Linux", "Testing"],
        "companyColor": COMPANY_COLORS["Automata"]
      }
    ]

def compile_all():
    print("Starting job collection pipeline...")
    
    # 1. Fetch live jobs
    all_jobs = []
    all_jobs.extend(fetch_ashby("OpenAI"))
    all_jobs.extend(fetch_ashby("Sierra"))
    all_jobs.extend(fetch_ashby("Anysphere"))
    all_jobs.extend(fetch_greenhouse("Anthropic", "anthropic"))
    all_jobs.extend(fetch_greenhouse("Harvey", "harvey"))
    all_jobs.extend(fetch_greenhouse("Abridge", "abridge"))
    all_jobs.extend(fetch_greenhouse("Decagon", "decagon"))
    all_jobs.extend(fetch_greenhouse("Physical Intelligence", "physicalintelligence"))
    all_jobs.extend(fetch_greenhouse("Anduril", "andurilindustries"))
    
    # New AI startups dynamically scraped
    all_jobs.extend(fetch_ashby("ElevenLabs"))
    all_jobs.extend(fetch_ashby("Cognition"))
    all_jobs.extend(fetch_ashby("Imbue"))
    all_jobs.extend(fetch_ashby("Hebbia"))
    all_jobs.extend(fetch_ashby("Perplexity AI", "perplexity"))
    all_jobs.extend(fetch_ashby("Cohere"))
    all_jobs.extend(fetch_ashby("Poolside"))
    all_jobs.extend(fetch_greenhouse("Glean", "glean"))
    all_jobs.extend(fetch_greenhouse("Scale AI", "scaleai"))
    all_jobs.extend(fetch_greenhouse("RunwayML", "runwayml"))
    
    # Reflection AI & Top London AI Startups
    all_jobs.extend(fetch_ashby("Reflection AI", "reflection"))
    all_jobs.extend(fetch_greenhouse("Wayve", "wayve"))
    all_jobs.extend(fetch_ashby("Nscale", "nscale"))
    all_jobs.extend(fetch_greenhouse("Isomorphic Labs", "isomorphiclabs"))
    all_jobs.extend(fetch_ashby("Synthesia", "synthesia"))
    all_jobs.extend(fetch_ashby("Granola", "granola"))
    all_jobs.extend(fetch_ashby("Recraft", "recraft"))
    all_jobs.extend(fetch_ashby("Humanloop", "humanloop"))
    all_jobs.extend(fetch_ashby("V7 Labs", "v7labs"))
    all_jobs.extend(fetch_greenhouse("PolyAI", "polyai"))
    all_jobs.extend(fetch_greenhouse("Robin AI", "robinai"))
    all_jobs.extend(fetch_greenhouse("PhysicsX", "physicsx"))
    all_jobs.extend(fetch_ashby("Basecamp Research", "basecamp-research"))
    all_jobs.extend(fetch_ashby("Unitary", "unitary"))
    all_jobs.extend(fetch_greenhouse("Causaly", "causaly"))
    all_jobs.extend(fetch_greenhouse("Speechmatics", "speechmatics"))
    all_jobs.extend(fetch_greenhouse("Automata", "automata"))
    all_jobs.extend(fetch_greenhouse("Quantexa", "quantexa"))
    all_jobs.extend(fetch_greenhouse("Thought Machine", "thoughtmachine"))
    all_jobs.extend(fetch_greenhouse("Faculty", "faculty"))
    all_jobs.extend(fetch_greenhouse("Cleo", "cleo"))
    all_jobs.extend(fetch_ashby("Omnea", "omnea"))
    all_jobs.extend(fetch_greenhouse("Papercup", "papercup"))
    all_jobs.extend(fetch_greenhouse("Healx", "healx"))
    all_jobs.extend(fetch_greenhouse("Multiverse", "multiverse"))
    all_jobs.extend(fetch_ashby("Unlikely AI", "unlikely-ai"))
    all_jobs.extend(fetch_ashby("Airspeed", "airspeed"))
    
    # 2. Add static fallback jobs (only if we didn't fetch active live jobs for that company)
    scraped_companies = set(job["company"] for job in all_jobs)
    for seed in get_static_seeds():
        if seed["company"] in scraped_companies:
            continue
        seed["employmentType"] = get_employment_type(seed["title"])
        seed["logoUrl"] = f"https://logo.clearbit.com/{COMPANY_DOMAINS.get(seed['company'], 'github.com')}"
        full_text = seed["title"] + " " + seed["description"] + " " + " ".join(seed["requirements"])
        if is_excluded_non_engineering_role(full_text):
            continue
        if is_data_engineering_role(full_text):
            continue
        all_jobs.append(seed)
    
    # 3. Save as jobs.js
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %I:%M %p")
    
    js_content = f"""// Generated automatically by fetch_jobs.py
const seedJobs = {json.dumps(all_jobs, indent=2)};

window.seedJobs = seedJobs;
window.lastSyncedJobs = "{timestamp}";

if (typeof module !== "undefined" && typeof module.exports !== "undefined") {{
  module.exports = {{ seedJobs }};
}}
"""
    
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "jobs.js")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(js_content)
        
    print(f"Job collection pipeline completed. Saved {len(all_jobs)} jobs to {output_path} at {timestamp}.")
    return len(all_jobs), timestamp

if __name__ == "__main__":
    compile_all()
