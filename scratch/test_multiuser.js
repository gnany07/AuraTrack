// test_multiuser.js - Exhaustive Verification Suite (Privacy + Currency + Dynamic Company Filter + Exact Job Links + Hash Routing)
const fs = require("fs");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync("/Users/gnany/AuraTrack/index.html", "utf8");
const jobsJs = fs.readFileSync("/Users/gnany/AuraTrack/jobs.js", "utf8");
const appJs = fs.readFileSync("/Users/gnany/AuraTrack/app.js", "utf8");

async function runVerificationSuite() {
  console.log("\n===============================================================");
  console.log("  AURATRACK AI v2.0 - FULL VERIFICATION SUITE                 ");
  console.log("===============================================================\n");

  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "https://auratrack.pages.dev/#discover"
  });

  const storage = {};
  const mockStorage = {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => { storage[k] = v; },
    removeItem: (k) => { delete storage[k]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
  };
  Object.defineProperty(dom.window, "localStorage", {
    value: mockStorage,
    configurable: true,
    writable: true
  });

  dom.window.fetch = async () => ({ ok: true, json: async () => ({ status: "success" }) });
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};

  dom.window.eval(jobsJs);
  dom.window.eval(appJs);

  const event = dom.window.document.createEvent("Event");
  event.initEvent("DOMContentLoaded", true, true);
  dom.window.document.dispatchEvent(event);

  // TEST 1: Direct #discover Hash Routing
  console.log("--- TEST 1: Direct #discover Hash Routing ---");
  if (dom.window.state.currentTab !== "discover") {
    throw new Error(`Expected #discover hash to open 'discover' tab, got '${dom.window.state.currentTab}'`);
  }
  console.log("  ✓ PASS: Visiting /#discover opens Job Discovery tab directly");

  // TEST 2: Exact Job Links (Zero generic /careers links)
  console.log("\n--- TEST 2: Exact Job Links Verification ---");
  const allJobs = dom.window.state ? dom.window.seedJobs : [];
  const firstCardLink = dom.window.document.querySelector(".job-row-card a.btn-exact-link");
  if (!firstCardLink) throw new Error("No Exact Job Link button found on job cards!");
  const href = firstCardLink.getAttribute("href");
  if (href.endsWith("/careers") || href.endsWith("/application")) {
    throw new Error(`Expected exact job overview link without /careers or /application, got: ${href}`);
  }
  console.log(`  ✓ PASS: Job cards link directly to exact role posting (e.g. ${href})`);

  // TEST 3: Top-Bar Currency Selector & Live Salary Conversion
  console.log("\n--- TEST 3: Top-Bar Currency Switcher (GBP / USD / EUR / INR) ---");
  dom.window.setCurrency("GBP");
  const gbpSalary = dom.window.document.querySelector(".salary-pill-converted").textContent;
  const gbpPill = dom.window.document.getElementById("salary-pill-200k").textContent;
  console.log(`  ✓ GBP Salary on Card: ${gbpSalary} | Filter Pill: ${gbpPill}`);
  if (!gbpSalary.includes("£") || !gbpPill.includes("£")) {
    throw new Error("Expected GBP (£) symbols when currency is set to GBP");
  }

  dom.window.setCurrency("INR");
  const inrSalary = dom.window.document.querySelector(".salary-pill-converted").textContent;
  const inrPill = dom.window.document.getElementById("salary-pill-200k").textContent;
  console.log(`  ✓ INR Salary on Card: ${inrSalary} | Filter Pill: ${inrPill}`);
  if (!inrSalary.includes("₹") || !inrPill.includes("₹")) {
    throw new Error("Expected INR (₹) symbols when currency is set to INR");
  }

  dom.window.setCurrency("USD");
  const usdSalary = dom.window.document.querySelector(".salary-pill-converted").textContent;
  console.log(`  ✓ USD Salary on Card: ${usdSalary}`);
  if (!usdSalary.includes("$")) {
    throw new Error("Expected USD ($) symbols when currency is set to USD");
  }
  console.log("  ✓ PASS: All salaries & filter pills dynamically convert across currencies");

  // TEST 4: Dynamic Companies Filter Based on Results
  console.log("\n--- TEST 4: Dynamic Companies Filter Based on Results ---");
  const initialCompanyChips = dom.window.document.querySelectorAll("#company-pill-group .company-chip");
  console.log(`  ✓ Initial company filter chips rendered: ${initialCompanyChips.length}`);
  if (initialCompanyChips.length < 3) {
    throw new Error("Expected dynamic company chips to be populated from results");
  }

  // Filter by a specific company ("OpenAI")
  dom.window.toggleCompanyFilter("OpenAI");
  const renderedCards = dom.window.document.querySelectorAll(".job-row-card");
  renderedCards.forEach(c => {
    if (!c.textContent.includes("OpenAI")) {
      throw new Error("Found non-OpenAI card when OpenAI company filter was active!");
    }
  });
  console.log(`  ✓ PASS: Selecting 'OpenAI' filters results strictly to OpenAI roles (${dom.window.document.getElementById("matching-jobs-count").textContent} matching)`);
  dom.window.clearCompanySelection();

  // TEST 5: Multi-User Privacy & Isolation
  console.log("\n--- TEST 5: Multi-User Privacy & Session Isolation ---");
  const activeBtnText = dom.window.document.getElementById("active-user-name").textContent;
  if (activeBtnText !== "Sign In / Register") {
    throw new Error(`Expected 'Sign In / Register', got '${activeBtnText}'`);
  }
  const sarahUser = { id: "usr_sarah", name: "Sarah Chen", email: "sarah@chen.ai", avatar: "👩‍💻", token: "token_sarah_123" };
  dom.window.saveCurrentSessionUser(sarahUser);
  dom.window.loadState();
  const SARAH_RESUME = `Sarah Chen\nSan Francisco | sarah@chen.ai\nPyTorch, JAX, Reinforcement Learning, Diffusion, CUDA`;
  dom.window.state.resumeText = SARAH_RESUME;
  dom.window.state.parsedResume = dom.window.parseResumeText(SARAH_RESUME);
  dom.window.saveState();
  const testJob = dom.window.seedJobs[0];
  dom.window.moveJobToStage(testJob.id, "applied");

  dom.window.saveCurrentSessionUser(null);
  dom.window.loadState();
  if (dom.window.state.resumeText !== "") throw new Error("Resume text leaked after sign out!");

  const alexUser = { id: "usr_alex", name: "Alex Mercer", email: "alex@mercer.dev", avatar: "👨‍💻", token: "token_alex_456" };
  dom.window.saveCurrentSessionUser(alexUser);
  dom.window.loadState();
  if (dom.window.state.tracker.applied.includes(testJob.id)) {
    throw new Error("Sarah's applied jobs leaked into Alex's private session!");
  }
  console.log("  ✓ PASS: Multi-user privacy & session isolation verified");

  console.log("\n===============================================================");
  console.log("  ALL 5 TEST SUITES PASSED 100%!                              ");
  console.log("===============================================================\n");
}

runVerificationSuite().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
