import urllib.request
import json
import re
import os
import html
import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# Accent colors for companies
COMPANY_COLORS = {
    "OpenAI": "linear-gradient(135deg, #10a37f, #0d8a6a)",
    "Anthropic": "linear-gradient(135deg, #d97757, #a85538)",
    "Sierra": "linear-gradient(135deg, #ff4500, #ff8c00)",
    "Google DeepMind": "linear-gradient(135deg, #4285F4, #34A853)",
    "Microsoft AI": "linear-gradient(135deg, #0078D4, #00B2F0)",
    "Meta AI": "linear-gradient(135deg, #0668E1, #0080FF)",
    "Perplexity AI": "linear-gradient(135deg, #20b2aa, #006d75)",
    "Scale AI": "linear-gradient(135deg, #a855f7, #6366f1)",
    "Cohere": "linear-gradient(135deg, #9b59b6, #8e44ad)",
    "Mistral AI": "linear-gradient(135deg, #f97316, #ea580c)",
    "xAI": "linear-gradient(135deg, #38bdf8, #1d4ed8)",
    "Stability AI": "linear-gradient(135deg, #f43f5e, #be123c)",
    "Groq": "linear-gradient(135deg, #60a5fa, #1d4ed8)",
    "Cerebras": "linear-gradient(135deg, #34d399, #059669)",
    "Anysphere": "linear-gradient(135deg, #0284c7, #2563eb)",
    "Harvey": "linear-gradient(135deg, #64748b, #334155)",
    "Abridge": "linear-gradient(135deg, #10b981, #047857)",
    "Decagon": "linear-gradient(135deg, #7c3aed, #4f46e5)",
    "Physical Intelligence": "linear-gradient(135deg, #ea580c, #c2410c)",
    "Anduril": "linear-gradient(135deg, #6b7280, #374151)",
    "ElevenLabs": "linear-gradient(135deg, #6366f1, #4338ca)",
    "Cognition": "linear-gradient(135deg, #f97316, #c2410c)",
    "Imbue": "linear-gradient(135deg, #ec4899, #8b5cf6)",
    "Hebbia": "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    "Poolside": "linear-gradient(135deg, #10b981, #059669)",
    "Glean": "linear-gradient(135deg, #f59e0b, #d97706)",
    "RunwayML": "linear-gradient(135deg, #ef4444, #b91c1c)",
    "Reflection AI": "linear-gradient(135deg, #6366f1, #4f46e5)",
    "Wayve": "linear-gradient(135deg, #2563eb, #1d4ed8)",
    "Nscale": "linear-gradient(135deg, #0ea5e9, #0369a1)",
    "Isomorphic Labs": "linear-gradient(135deg, #10b981, #047857)",
    "Synthesia": "linear-gradient(135deg, #8b5cf6, #6d28d9)",
    "Granola": "linear-gradient(135deg, #f59e0b, #b45309)",
    "Recraft": "linear-gradient(135deg, #ec4899, #be185d)",
    "Humanloop": "linear-gradient(135deg, #06b6d4, #0e7490)",
    "V7 Labs": "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    "PolyAI": "linear-gradient(135deg, #10b981, #065f46)",
    "Robin AI": "linear-gradient(135deg, #f97316, #c2410c)",
    "PhysicsX": "linear-gradient(135deg, #64748b, #334155)",
    "Basecamp Research": "linear-gradient(135deg, #14b8a6, #0f766e)",
    "Unitary": "linear-gradient(135deg, #a855f7, #6b21a8)",
    "Causaly": "linear-gradient(135deg, #3b82f6, #1e40af)",
    "Speechmatics": "linear-gradient(135deg, #f43f5e, #be123c)",
    "Automata": "linear-gradient(135deg, #6366f1, #3730a3)",
    "Quantexa": "linear-gradient(135deg, #0284c7, #075985)",
    "Thought Machine": "linear-gradient(135deg, #10b981, #064e3b)",
    "Faculty": "linear-gradient(135deg, #475569, #1e293b)",
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
    "Fine-tuning", "LLM Development", "API Design", "Operating Systems",
    "Computer Networking", "WebSockets", "Linux", "gRPC", "Ray", "Spark"
]

ALLOWED_CATEGORIES = {"SWE", "Platform", "MLE"}

DATA_ENGINEERING_PATTERNS = [
    re.compile(r"\bdata engineer\b", re.IGNORECASE),
    re.compile(r"\bdata engineering\b", re.IGNORECASE),
    re.compile(r"\bdata scientist\b", re.IGNORECASE),
]

EXCLUDED_TITLE_PATTERNS = [
    # Frontend & Design
    re.compile(r"\bfrontend\b", re.IGNORECASE),
    re.compile(r"\bfront-end\b", re.IGNORECASE),
    re.compile(r"\bfront end\b", re.IGNORECASE),
    re.compile(r"\bui\b", re.IGNORECASE),
    re.compile(r"\bux\b", re.IGNORECASE),
    re.compile(r"\bui/ux\b", re.IGNORECASE),
    re.compile(r"\bdesigner\b", re.IGNORECASE),
    re.compile(r"\bdesign engineer\b", re.IGNORECASE),
    re.compile(r"\bproduct design\b", re.IGNORECASE),
    re.compile(r"\bweb designer\b", re.IGNORECASE),
    re.compile(r"\bweb developer\b", re.IGNORECASE),
    re.compile(r"\bios\b", re.IGNORECASE),
    re.compile(r"\bandroid\b", re.IGNORECASE),
    re.compile(r"\bmobile\b", re.IGNORECASE),

    # Electrical & Hardware Engineering
    re.compile(r"\belectrical\b", re.IGNORECASE),
    re.compile(r"\bhardware\b", re.IGNORECASE),
    re.compile(r"\banalog\b", re.IGNORECASE),
    re.compile(r"\basic\b", re.IGNORECASE),
    re.compile(r"\bsilicon\b", re.IGNORECASE),
    re.compile(r"\bfpga\b", re.IGNORECASE),
    re.compile(r"\brf engineer\b", re.IGNORECASE),
    re.compile(r"\bpcb\b", re.IGNORECASE),
    re.compile(r"\bmechanical\b", re.IGNORECASE),
    re.compile(r"\bchip design\b", re.IGNORECASE),
    re.compile(r"\bboard design\b", re.IGNORECASE),

    # Data Engineering / Data Science / Analytics
    re.compile(r"\bdata engineer\b", re.IGNORECASE),
    re.compile(r"\bdata engineering\b", re.IGNORECASE),
    re.compile(r"\bdata scientist\b", re.IGNORECASE),
    re.compile(r"\bdata science\b", re.IGNORECASE),
    re.compile(r"\bdata analyst\b", re.IGNORECASE),
    re.compile(r"\banalytics engineer\b", re.IGNORECASE),
    re.compile(r"\bbusiness intelligence\b", re.IGNORECASE),

    # Internships / Junior / Entry Level
    re.compile(r"\bintern\b", re.IGNORECASE),
    re.compile(r"\binternship\b", re.IGNORECASE),
    re.compile(r"\bco-op\b", re.IGNORECASE),
    re.compile(r"\bgraduate engineer\b", re.IGNORECASE),
    re.compile(r"\bjunior\b", re.IGNORECASE),
    re.compile(r"\bentry level\b", re.IGNORECASE),
    re.compile(r"\bapprentice\b", re.IGNORECASE),

    # IT Engineering & IT Roles
    re.compile(r"\bit support\b", re.IGNORECASE),
    re.compile(r"\bit engineer\b", re.IGNORECASE),
    re.compile(r"\bit engineering\b", re.IGNORECASE),
    re.compile(r"\bit systems\b", re.IGNORECASE),
    re.compile(r"\bit infrastructure\b", re.IGNORECASE),
    re.compile(r"\bcorporate it\b", re.IGNORECASE),
    re.compile(r"\binformation technology\b", re.IGNORECASE),
    re.compile(r"\bdesktop support\b", re.IGNORECASE),
    re.compile(r"\bhelpdesk\b", re.IGNORECASE),
    re.compile(r"\bsystem admin\b", re.IGNORECASE),
    re.compile(r"\bsystems administrator\b", re.IGNORECASE),

    # Social Media & Community & Comms & Events
    re.compile(r"\bsocial media\b", re.IGNORECASE),
    re.compile(r"\bcommunity\b", re.IGNORECASE),
    re.compile(r"\bevents\b", re.IGNORECASE),
    re.compile(r"\bcommunications\b", re.IGNORECASE),

    # Partner Engineering & Partner Roles & Partnerships
    re.compile(r"\bpartner\b", re.IGNORECASE),
    re.compile(r"\bpartnerships?\b", re.IGNORECASE),

    # Talent, Recruiting & HR & People
    re.compile(r"\btalent\b", re.IGNORECASE),
    re.compile(r"\brecruiting\b", re.IGNORECASE),
    re.compile(r"\brecruitment\b", re.IGNORECASE),
    re.compile(r"\brecruiter\b", re.IGNORECASE),
    re.compile(r"\bpeople\b", re.IGNORECASE),
    re.compile(r"\bhuman resources\b", re.IGNORECASE),
    re.compile(r"\bhr\b", re.IGNORECASE),

    # Solutions Engineering, DevRel, Field & Support Roles
    re.compile(r"\bsolutions engineer\b", re.IGNORECASE),
    re.compile(r"\bsolutions architect\b", re.IGNORECASE),
    re.compile(r"\bdeveloper relations\b", re.IGNORECASE),
    re.compile(r"\bdevrel\b", re.IGNORECASE),
    re.compile(r"\bdeveloper advocate\b", re.IGNORECASE),
    re.compile(r"\bfield engineer\b", re.IGNORECASE),
    re.compile(r"\bforward deployed\b", re.IGNORECASE),
    re.compile(r"\bsales engineer\b", re.IGNORECASE),
    re.compile(r"\bcustomer engineer\b", re.IGNORECASE),
    re.compile(r"\bsupport engineer\b", re.IGNORECASE),
    re.compile(r"\btechnical support\b", re.IGNORECASE),
    re.compile(r"\btechnical advocate\b", re.IGNORECASE),
    re.compile(r"\bsupport delivery\b", re.IGNORECASE),
    re.compile(r"\bsupport specialist\b", re.IGNORECASE),

    # Non-Engineering & Business Roles
    re.compile(r"\bsales\b", re.IGNORECASE),
    re.compile(r"\baccount executive\b", re.IGNORECASE),
    re.compile(r"\bbusiness development\b", re.IGNORECASE),
    re.compile(r"\brevenue\b", re.IGNORECASE),
    re.compile(r"\bgtm\b", re.IGNORECASE),
    re.compile(r"\bproduct manager\b", re.IGNORECASE),
    re.compile(r"\bprogram manager\b", re.IGNORECASE),
    re.compile(r"\bproject manager\b", re.IGNORECASE),
    re.compile(r"\boperations\b", re.IGNORECASE),
    re.compile(r"\bcustomer success\b", re.IGNORECASE),
    re.compile(r"\blegal\b", re.IGNORECASE),
    re.compile(r"\bfinance\b", re.IGNORECASE),
    re.compile(r"\baccounting\b", re.IGNORECASE),
    re.compile(r"\bmarketing\b", re.IGNORECASE),
    re.compile(r"\bcopywriter\b", re.IGNORECASE),
    re.compile(r"\bstrategist\b", re.IGNORECASE),
    re.compile(r"\bfreelance\b", re.IGNORECASE),
    re.compile(r"\bsourcing\b", re.IGNORECASE),
    re.compile(r"\bpolicy\b", re.IGNORECASE),

    # Security & Compliance Roles
    re.compile(r"\bsecurity\b", re.IGNORECASE),
    re.compile(r"\bcompliance\b", re.IGNORECASE),
    re.compile(r"\binfosec\b", re.IGNORECASE),
    re.compile(r"\bcybersecurity\b", re.IGNORECASE),
    re.compile(r"\bappsec\b", re.IGNORECASE),
    re.compile(r"\bdetection and response\b", re.IGNORECASE),
    re.compile(r"\bthreat\b", re.IGNORECASE),
    re.compile(r"\baudit\b", re.IGNORECASE),
    re.compile(r"\bprivacy\b", re.IGNORECASE),
    re.compile(r"\bvulnerability\b", re.IGNORECASE),

    # Bioanalytical & Biological Roles
    re.compile(r"\bbioanalytical\b", re.IGNORECASE),
    re.compile(r"\bbiological\b", re.IGNORECASE),
    re.compile(r"\bbiology\b", re.IGNORECASE),
    re.compile(r"\bbioinformatics\b", re.IGNORECASE),
    re.compile(r"\bcomputational biology\b", re.IGNORECASE),
    re.compile(r"\bgenomics\b", re.IGNORECASE),

    # Growth & Network Engineering Roles
    re.compile(r"\bgrowth\b", re.IGNORECASE),
    re.compile(r"\blifecycle\b", re.IGNORECASE),
    re.compile(r"\bnetwork engineer\b", re.IGNORECASE),
    re.compile(r"\bnetwork engineering\b", re.IGNORECASE),
    re.compile(r"\bnetwork architect\b", re.IGNORECASE),

    # Defense / Manufacturing / Aerospace / Physical Hardware Roles
    re.compile(r"\bmanufacturing\b", re.IGNORECASE),
    re.compile(r"\bquality\b", re.IGNORECASE),
    re.compile(r"\baerospace\b", re.IGNORECASE),
    re.compile(r"\bavionics\b", re.IGNORECASE),
    re.compile(r"\bpropulsion\b", re.IGNORECASE),
    re.compile(r"\bflight\b", re.IGNORECASE),
    re.compile(r"\bthermal\b", re.IGNORECASE),
    re.compile(r"\bstructural\b", re.IGNORECASE),
    re.compile(r"\btechnician\b", re.IGNORECASE),
    re.compile(r"\bindustrial\b", re.IGNORECASE),
    re.compile(r"\bsupply chain\b", re.IGNORECASE),
    re.compile(r"\blogistics\b", re.IGNORECASE),
    re.compile(r"\bfacilities\b", re.IGNORECASE),
    re.compile(r"\bmaterials\b", re.IGNORECASE),
    re.compile(r"\bchemical\b", re.IGNORECASE),
    re.compile(r"\bcivil\b", re.IGNORECASE),
    re.compile(r"\btest engineer\b", re.IGNORECASE),
    re.compile(r"\bintegration engineer\b", re.IGNORECASE),
    re.compile(r"\bdeployment engineer\b", re.IGNORECASE),
    re.compile(r"\bmission\b", re.IGNORECASE),
    re.compile(r"\bguidance\b", re.IGNORECASE),
    re.compile(r"\bnavigation\b", re.IGNORECASE),
    re.compile(r"\bsensor\b", re.IGNORECASE),
    re.compile(r"\bradar\b", re.IGNORECASE),
    re.compile(r"\boptical\b", re.IGNORECASE),
    re.compile(r"\bphoton\b", re.IGNORECASE),
    re.compile(r"\bmaritime\b", re.IGNORECASE),
    re.compile(r"\bsubsea\b", re.IGNORECASE),
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

def is_data_engineering_role(title_and_dept: str) -> bool:
    text = (title_and_dept or "").lower()
    return any(p.search(text) for p in DATA_ENGINEERING_PATTERNS)

def is_unwanted_role_title(title: str) -> bool:
    text = (title or "").lower()
    return any(p.search(text) for p in EXCLUDED_TITLE_PATTERNS)

def get_seniority_level(title: str, company: str = "") -> str:
    t = (title or "").lower()
    if any(k in t for k in ["staff", "principal", "distinguished", "architect", "head", "director", "tech lead", "lead"]):
        return "Staff / Lead"
    elif any(k in t for k in ["senior", "sr.", "sr ", "snr", "mts", "member of technical staff", "founding"]):
        return "Senior"
    # Frontier labs like OpenAI & Anthropic use flat titles ("Software Engineer", "Research Engineer") for Senior/Staff-level IC roles
    if company in {"OpenAI", "Anthropic", "Reflection AI", "Cognition", "Physical Intelligence", "Poolside", "Anysphere", "Sierra"}:
        return "Senior"
    return "Mid / General"

def get_technical_domain(title: str, reqs: list = None, desc: str = "") -> str:
    t = (title or "").lower()
    req_str = " ".join(reqs or [])
    txt = (t + " " + req_str + " " + desc).lower()

    if any(k in t for k in ["rl training", "agent", "llm", "rlhf", "model inference", "post-training", "evals", "vllm", "transformers", "multimodal", "generative ai", "frontier", "pre-training", "fine-tuning", "inference"]):
        return "AI / LLM Infra"
    if any(k in txt for k in ["post-training", "rlhf", "llms", "rag", "evals", "vllm", "tensorrt-llm"]):
        return "AI / LLM Infra"

    if any(k in t for k in ["cuda", "c++", "kernel", "compiler", "low level", "vpp", "performance", "gpu", "accelerator", "runtime"]):
        return "Systems & Low-Level"
    if any(k in txt for k in ["cuda", "triton", "tensorrt-llm", "c++", "vpp", "assembly"]):
        return "Systems & Low-Level"

    if any(k in t for k in ["machine learning", "mle", "applied science", "computer vision", "nlp", "speech", "autonomy", "robotics"]):
        return "ML Engineering"
    if any(k in txt for k in ["pytorch", "jax", "tensorflow", "deep learning", "computer vision", "nlp"]):
        return "ML Engineering"

    if any(k in t for k in ["distributed", "storage", "cloud", "kubernetes", "infra", "infrastructure", "fleet", "observability", "reliability", "platform", "data platform", "compute"]):
        return "Distributed Systems"
    if any(k in txt for k in ["distributed systems", "kubernetes", "docker", "kafka", "redis", "postgresql", "gcp", "aws"]):
        return "Distributed Systems"

    return "Backend & Platform"

def clean_html(raw_html: str) -> str:
    if not raw_html:
        return ""
    unescaped = html.unescape(raw_html)
    # Replace block tags with newlines for clean paragraph structure
    unescaped = re.sub(r'</?(?:p|div|br|li|ul|ol|h[1-6]|tr)[^>]*>', '\n', unescaped, flags=re.IGNORECASE)
    clean_text = re.sub(r'<[^>]+>', ' ', unescaped)
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in clean_text.splitlines()]
    lines = [l for l in lines if l]
    return "\n\n".join(lines).strip()

def clean_plain_description(desc_plain: str) -> str:
    if not desc_plain:
        return ""
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in desc_plain.splitlines()]
    paragraphs = []
    current = []
    for line in lines:
        if not line:
            if current:
                paragraphs.append(" ".join(current))
                current = []
        else:
            current.append(line)
    if current:
        paragraphs.append(" ".join(current))
    return "\n\n".join(paragraphs).strip()

def extract_skills(text: str) -> list:
    text_lower = text.lower()
    found = []
    for skill in SKILL_LIST:
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        if skill.lower() in ["pytorch", "tensorflow", "vllm", "nextjs", "nodejs", "golang"]:
            norm_skill = skill.lower().replace("-", "").replace(".", "")
            if norm_skill in text_lower.replace("-", "").replace(".", ""):
                found.append(skill)
                continue
        if skill == "C++":
            if re.search(r'\bc\+\+|cpp\b', text_lower):
                found.append("C++")
            continue
        if re.search(pattern, text_lower):
            found.append(skill)
    if "Golang" in found and "Go" not in found:
        found.append("Go")
    return list(dict.fromkeys(found))

def estimate_salary_band(company: str, title: str, location: str, seniority: str):
    loc_lower = (location or "").lower()
    is_uk = any(k in loc_lower for k in ["london", "uk", "united kingdom", "cambridge", "oxford", "edinburgh", "bristol", "manchester"])
    is_eu = any(k in loc_lower for k in ["paris", "france", "berlin", "germany", "munich", "amsterdam", "zurich", "dublin", "europe"])
    is_ca = any(k in loc_lower for k in ["toronto", "vancouver", "montreal", "canada", "ottawa"])

    tier1 = {"OpenAI", "Anthropic", "Google DeepMind", "Meta AI", "Reflection AI", "Cognition", "Physical Intelligence", "Sierra", "Wayve", "Isomorphic Labs", "Anysphere", "Poolside", "Perplexity AI", "Scale AI", "Anduril", "Glean", "Harvey", "Databricks"}
    is_tier1 = company in tier1

    # Add deterministic subtle variance based on title hash so every role has a tailored, realistic band
    h = sum(ord(c) for c in (title or "")) % 5
    step_usd = h * 5000
    step_gbp = h * 4000

    if is_uk:
        if seniority == "Staff / Lead":
            low, high = (175000 if is_tier1 else 145000) + step_gbp, (265000 if is_tier1 else 210000) + step_gbp
        elif seniority == "Senior":
            low, high = (140000 if is_tier1 else 115000) + step_gbp, (215000 if is_tier1 else 175000) + step_gbp
        else:
            low, high = (110000 if is_tier1 else 90000) + step_gbp, (165000 if is_tier1 else 140000) + step_gbp
        return low, high, "GBP", f"£{low:,} - £{high:,} + equity"

    if is_eu:
        if seniority == "Staff / Lead":
            low, high = 160000 + step_gbp, 240000 + step_gbp
        elif seniority == "Senior":
            low, high = 130000 + step_gbp, 195000 + step_gbp
        else:
            low, high = 100000 + step_gbp, 150000 + step_gbp
        return low, high, "EUR", f"€{low:,} - €{high:,} + equity"

    if is_ca:
        if seniority == "Staff / Lead":
            low, high = 220000 + step_usd, 320000 + step_usd
        elif seniority == "Senior":
            low, high = 185000 + step_usd, 265000 + step_usd
        else:
            low, high = 150000 + step_usd, 215000 + step_usd
        return low, high, "CAD", f"C${low:,} - C${high:,} + equity"

    # Default US / Global USD
    if seniority == "Staff / Lead":
        low, high = (260000 if is_tier1 else 220000) + step_usd, (390000 if is_tier1 else 320000) + step_usd
    elif seniority == "Senior":
        low, high = (215000 if is_tier1 else 185000) + step_usd, (325000 if is_tier1 else 270000) + step_usd
    else:
        low, high = (175000 if is_tier1 else 155000) + step_usd, (260000 if is_tier1 else 225000) + step_usd
    return low, high, "USD", f"${low:,} - ${high:,} + equity"

def parse_salary_from_text_or_ashby(comp_obj, text: str, company: str, title: str, location: str, seniority: str):
    # 1. Check Ashby structured compensation object first
    if isinstance(comp_obj, dict):
        components = comp_obj.get("summaryComponents") or []
        for comp in components:
            if comp.get("compensationType") == "Salary":
                min_v = comp.get("minValue")
                max_v = comp.get("maxValue")
                curr = comp.get("currencyCode") or "USD"
                if min_v and max_v and min_v >= 30000:
                    min_i, max_i = int(min_v), int(max_v)
                    sym = {"USD": "$", "GBP": "£", "EUR": "€", "CAD": "C$"}.get(curr, "$")
                    return min_i, max_i, curr, f"{sym}{min_i:,} - {sym}{max_i:,} + equity"
                elif min_v and min_v >= 30000:
                    min_i = int(min_v)
                    max_i = int(min_v * 1.25)
                    sym = {"USD": "$", "GBP": "£", "EUR": "€", "CAD": "C$"}.get(curr, "$")
                    return min_i, max_i, curr, f"{sym}{min_i:,} - {sym}{max_i:,} + equity"

    # 2. Check explicit salary range in description text
    if text:
        # Match e.g. $200,000 - $330,000 or £140,000 — £220,000 or $220K - $300K
        range_pattern = re.compile(
            r'([\$£€])\s*(\d{2,3}(?:,\d{3}|\s*[kK]))\s*(?:[\-\u2013\u2014]|to)\s*([\$£€])?\s*(\d{2,3}(?:,\d{3}|\s*[kK]))'
        )
        m = range_pattern.search(text)
        if m:
            sym = m.group(1)
            raw_low = m.group(2).lower().replace(",", "").strip()
            raw_high = m.group(4).lower().replace(",", "").strip()
            low = int(float(raw_low[:-1]) * 1000) if raw_low.endswith("k") else int(raw_low)
            high = int(float(raw_high[:-1]) * 1000) if raw_high.endswith("k") else int(raw_high)
            if 40000 <= low <= 1500000 and low <= high <= 2000000:
                curr = {"£": "GBP", "€": "EUR", "$": "USD"}.get(sym, "USD")
                return low, high, curr, f"{sym}{low:,} - {sym}{high:,} + equity"

    # 3. Fallback to realistic market estimation by company tier, location, and seniority
    return estimate_salary_band(company, title, location, seniority)

def get_logo_url(company_name: str) -> str:
    domain = COMPANY_DOMAINS.get(company_name, "github.com")
    return f"https://www.google.com/s2/favicons?domain={domain}&sz=128"

def fetch_ashby(company_name: str, board_slug: str = None) -> list:
    slug = board_slug or company_name.lower().replace(" ", "")
    url = f"https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true"
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        with urllib.request.urlopen(req, timeout=12) as response:
            data = json.loads(response.read().decode())
            jobs = []
            for item in data.get("jobs", []):
                title = item.get("title", "")
                team = item.get("team", "") or ""
                dept = item.get("department", "") or ""

                if is_unwanted_role_title(title):
                    continue

                keywords = ["engineer", "developer", "scientist", "researcher", "technical staff", "mts", "infrastructure", "systems", "platform", "architect", "lead", "autonomy", "ml"]
                is_tech = (
                    any(kw in title.lower() for kw in keywords) or
                    any(kw in team.lower() for kw in ["engineering", "research", "technical", "infrastructure", "systems"]) or
                    any(kw in dept.lower() for kw in ["engineering", "research", "technical", "infrastructure", "systems"])
                )
                if not is_tech:
                    continue

                location = item.get("location", "") or "San Francisco, CA"
                desc_plain = clean_plain_description(item.get("descriptionPlain", ""))
                employment_type = item.get("employmentType", "")

                full_text = f"{title} {team} {dept} {desc_plain}"
                skills = extract_skills(full_text)

                category = "SWE"
                if "research" in title.lower() or "scientist" in title.lower():
                    category = "Research"
                elif "machine learning" in title.lower() or "ml" in title.lower() or "applied science" in title.lower():
                    category = "MLE"
                elif any(kw in title.lower() for kw in ["infrastructure", "platform", "reliability", "sre", "systems"]):
                    category = "Platform"

                if category not in ALLOWED_CATEGORIES:
                    continue
                if is_data_engineering_role(f"{title} {team} {dept}"):
                    continue

                tech_domain = get_technical_domain(title, skills, desc_plain)
                seniority = get_seniority_level(title, company_name)
                sal_min, sal_max, sal_curr, salary_str = parse_salary_from_text_or_ashby(
                    item.get("compensation"), desc_plain, company_name, title, location, seniority
                )

                job_id = item.get("id")
                exact_job_url = item.get("jobUrl") or f"https://jobs.ashbyhq.com/{slug}/{job_id}"
                if exact_job_url.endswith("/application"):
                    exact_job_url = exact_job_url[:-12]
                direct_apply_url = item.get("applyUrl") or f"{exact_job_url}/application"

                jobs.append({
                    "id": f"{slug}-{job_id}",
                    "company": company_name,
                    "title": title,
                    "category": category,
                    "domain": tech_domain,
                    "seniority": seniority,
                    "employmentType": get_employment_type(title, employment_type),
                    "location": f"{location} (Hybrid)" if "hybrid" not in location.lower() and "remote" not in location.lower() else location,
                    "salary": salary_str,
                    "salaryMin": sal_min,
                    "salaryMax": sal_max,
                    "salaryCurrency": sal_curr,
                    "jobUrl": exact_job_url,
                    "applyUrl": exact_job_url,
                    "directApplyUrl": direct_apply_url,
                    "description": desc_plain[:2400] if len(desc_plain) > 2400 else desc_plain,
                    "requirements": skills[:8] if skills else ["Python", "Distributed Systems", "System Design"],
                    "preferred": skills[8:12] if len(skills) > 8 else ["High performance distributed processing"],
                    "companyColor": COMPANY_COLORS.get(company_name, "linear-gradient(135deg, #a855f7, #6366f1)"),
                    "logoUrl": get_logo_url(company_name)
                })
            print(f"[Ashby] Parsed {len(jobs)} {company_name} jobs.")
            return jobs
    except Exception as e:
        print(f"[Ashby] Failed {company_name}: {e}")
        return []

def fetch_greenhouse(company_name: str, board_slug: str) -> list:
    url = f"https://boards-api.greenhouse.io/v1/boards/{board_slug}/jobs?content=true"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode())
            jobs = []
            for item in data.get("jobs", []):
                title = item.get("title", "")
                depts = " ".join([d.get("name", "") for d in item.get("departments", [])])

                # Only check title for unwanted role patterns (not full description text!)
                if is_unwanted_role_title(title):
                    continue

                sw_title_keywords = [
                    "software", "swe", "machine learning", "ml ", "mle", "ai ", "llm",
                    "backend", "back-end", "distributed", "platform", "infrastructure",
                    "systems engineer", "research engineer", "research scientist",
                    "applied scientist", "member of technical staff", "mts", "autonomy",
                    "computer vision", "deep learning", "kernel", "compiler", "cuda",
                    "data platform", "cloud engineer", "reliability", "sre", "full stack", "fullstack"
                ]
                if company_name == "Anduril":
                    is_tech = any(kw in title.lower() for kw in ["software", "machine learning", "ai ", "autonomy", "computer vision", "distributed", "platform engineer", "robotics software"])
                else:
                    is_tech = any(kw in title.lower() for kw in sw_title_keywords) or (
                        "engineer" in title.lower() and not any(bad in title.lower() for bad in ["customer", "field", "sales", "support", "partner", "solutions", "facilities", "physical", "mechanical", "electrical", "hardware", "quality", "manufacturing", "test"])
                    )
                if not is_tech:
                    continue

                location = item.get("location", {}).get("name", "") if item.get("location") else "San Francisco, CA"
                content = clean_html(item.get("content", ""))
                skills = extract_skills(f"{title} {depts} {content}")

                category = "SWE"
                if "research" in title.lower() or "scientist" in title.lower():
                    category = "Research"
                elif "machine learning" in title.lower() or "ml" in title.lower() or "applied science" in title.lower():
                    category = "MLE"
                elif any(kw in title.lower() for kw in ["infrastructure", "platform", "reliability", "sre", "systems"]):
                    category = "Platform"
                elif "product manager" in title.lower():
                    category = "Product"

                if category not in ALLOWED_CATEGORIES:
                    continue
                if is_data_engineering_role(f"{title} {depts}"):
                    continue

                tech_domain = get_technical_domain(title, skills, content)
                seniority = get_seniority_level(title, company_name)
                sal_min, sal_max, sal_curr, salary_str = parse_salary_from_text_or_ashby(
                    None, content, company_name, title, location, seniority
                )

                job_id = item.get("id")
                exact_job_url = item.get("absolute_url") or f"https://job-boards.greenhouse.io/{board_slug}/jobs/{job_id}"

                jobs.append({
                    "id": f"{board_slug}-{job_id}",
                    "company": company_name,
                    "title": title,
                    "category": category,
                    "domain": tech_domain,
                    "seniority": seniority,
                    "employmentType": get_employment_type(title),
                    "location": location,
                    "salary": salary_str,
                    "salaryMin": sal_min,
                    "salaryMax": sal_max,
                    "salaryCurrency": sal_curr,
                    "jobUrl": exact_job_url,
                    "applyUrl": exact_job_url,
                    "directApplyUrl": f"{exact_job_url}#app",
                    "description": content[:2400] if len(content) > 2400 else content,
                    "requirements": skills[:8] if skills else ["Python", "C++", "Distributed Systems", "System Design"],
                    "preferred": skills[8:12] if len(skills) > 8 else ["Large-scale distributed systems & AI infrastructure"],
                    "companyColor": COMPANY_COLORS.get(company_name, "linear-gradient(135deg, #d97757, #a85538)"),
                    "logoUrl": get_logo_url(company_name)
                })
            print(f"[Greenhouse] Parsed {len(jobs)} {company_name} jobs.")
            return jobs
    except Exception as e:
        print(f"[Greenhouse] Failed {company_name}: {e}")
        return []

def compile_all():
    print("Starting parallel job collection pipeline...")

    ashby_targets = [
        ("OpenAI", "openai"),
        ("Sierra", "sierra"),
        ("Anysphere", "anysphere"),
        ("ElevenLabs", "elevenlabs"),
        ("Cognition", "cognition"),
        ("Imbue", "imbue"),
        ("Hebbia", "hebbia"),
        ("Perplexity AI", "perplexity"),
        ("Cohere", "cohere"),
        ("Poolside", "poolside"),
        ("Reflection AI", "reflectionai"),
        ("Nscale", "nscale"),
        ("Synthesia", "synthesia"),
        ("Granola", "granola"),
        ("Recraft", "recraft"),
        ("Humanloop", "humanloop"),
        ("V7 Labs", "v7labs"),
        ("Basecamp Research", "basecamp-research"),
        ("Unitary", "unitary"),
        ("Omnea", "omnea"),
        ("Unlikely AI", "unlikely-ai"),
        ("Airspeed", "airspeed"),
    ]

    greenhouse_targets = [
        ("Anthropic", "anthropic"),
        ("xAI", "xai"),
        ("Scale AI", "scaleai"),
        ("Wayve", "wayve"),
        ("Isomorphic Labs", "isomorphiclabs"),
        ("Harvey", "harvey"),
        ("Abridge", "abridge"),
        ("Decagon", "decagon"),
        ("Physical Intelligence", "physicalintelligence"),
        ("Anduril", "andurilindustries"),
        ("Glean", "glean"),
        ("RunwayML", "runwayml"),
        ("Stability AI", "stabilityai"),
        ("Cerebras", "cerebrassystems"),
        ("Groq", "groq"),
        ("PolyAI", "polyai"),
        ("Robin AI", "robinai"),
        ("PhysicsX", "physicsx"),
        ("Causaly", "causaly"),
        ("Speechmatics", "speechmatics"),
        ("Automata", "automata"),
        ("Quantexa", "quantexa"),
        ("Thought Machine", "thoughtmachine"),
        ("Faculty", "faculty"),
        ("Cleo", "cleo"),
        ("Papercup", "papercup"),
        ("Healx", "healx"),
        ("Multiverse", "multiverse"),
    ]

    all_jobs = []
    futures = []
    with ThreadPoolExecutor(max_workers=16) as executor:
        for comp, slug in ashby_targets:
            futures.append(executor.submit(fetch_ashby, comp, slug))
        for comp, slug in greenhouse_targets:
            futures.append(executor.submit(fetch_greenhouse, comp, slug))

        for future in as_completed(futures):
            try:
                res = future.result()
                if res:
                    all_jobs.extend(res)
            except Exception as exc:
                print(f"Worker exception: {exc}")

    # Filter out any role without an exact job posting URL
    all_jobs = [
        j for j in all_jobs
        if j.get("applyUrl")
        and not j["applyUrl"].rstrip("/").endswith("/careers")
        and not j["applyUrl"].rstrip("/").endswith("/jobs/results")
    ]

    # Sort deterministically by company and title
    all_jobs.sort(key=lambda j: (j.get("company", ""), j.get("title", "")))

    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %I:%M %p")

    js_content = f"""// Generated automatically by fetch_jobs.py
const seedJobs = {json.dumps(all_jobs, indent=2)};

if (typeof window !== "undefined") {{
  window.seedJobs = seedJobs;
  window.lastSyncedJobs = "{timestamp}";
}}

if (typeof module !== "undefined" && typeof module.exports !== "undefined") {{
  module.exports = {{ seedJobs }};
}}
"""

    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "jobs.js")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(js_content)

    print(f"Job collection pipeline completed. Saved {len(all_jobs)} exact-link jobs to {output_path} at {timestamp}.")
    return len(all_jobs), timestamp

if __name__ == "__main__":
    compile_all()
