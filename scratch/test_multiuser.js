// test_multiuser.js - Exhaustive Privacy & Multi-User Verification Suite
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync("/Users/gnany/AuraTrack/index.html", "utf8");
const jobsJs = fs.readFileSync("/Users/gnany/AuraTrack/jobs.js", "utf8");
const appJs = fs.readFileSync("/Users/gnany/AuraTrack/app.js", "utf8");

async function runPrivacyTestSuite() {
  console.log("\n===============================================================");
  console.log("  AURATRACK AI - STRICT PRIVACY & MULTI-USER TEST SUITE        ");
  console.log("===============================================================\n");

  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable",
    url: "http://localhost:8000/"
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

  dom.window.fetch = async (url, opts) => {
    return { ok: true, json: async () => ({ status: "success" }) };
  };

  // 1. Evaluate scripts
  dom.window.eval(jobsJs);
  dom.window.eval(appJs);

  const event = dom.window.document.createEvent("Event");
  event.initEvent("DOMContentLoaded", true, true);
  dom.window.document.dispatchEvent(event);

  console.log("--- TEST 1: Unauthenticated Guest Privacy Check ---");
  const activeBtnText = dom.window.document.getElementById("active-user-name").textContent;
  const menuUser = dom.window.document.getElementById("menu-user-name").textContent;
  const menuEmail = dom.window.document.getElementById("menu-user-email").textContent;
  
  console.log(`  ✓ Topbar Account Button: "${activeBtnText}"`);
  console.log(`  ✓ Menu Header: "${menuUser}" (${menuEmail})`);
  
  if (activeBtnText !== "Sign In / Register") {
    throw new Error(`Expected button to say 'Sign In / Register' for unauthenticated visitor, got '${activeBtnText}'`);
  }
  if (dom.window.document.getElementById("account-profiles-list")) {
    throw new Error("Found public profiles list! Privacy violation: other profiles must never be listed publicly.");
  }
  console.log("  ✓ PASS: Zero private user names or profiles leaked to new visitors");

  console.log("\n--- TEST 2: User A (Sarah Chen) Signs In ---");
  const sarahUser = {
    id: "usr_sarah",
    name: "Sarah Chen",
    email: "sarah@chen.ai",
    avatar: "👩‍💻",
    token: "token_sarah_123"
  };
  dom.window.saveCurrentSessionUser(sarahUser);
  dom.window.loadState();

  const sarahBtnText = dom.window.document.getElementById("active-user-name").textContent;
  const sarahMenuEmail = dom.window.document.getElementById("menu-user-email").textContent;
  console.log(`  ✓ Sarah's Active Button: "${sarahBtnText}"`);
  console.log(`  ✓ Sarah's Menu Email: "${sarahMenuEmail}"`);
  
  if (sarahBtnText !== "Sarah Chen" || sarahMenuEmail !== "sarah@chen.ai") {
    throw new Error("Sarah's profile was not loaded properly");
  }

  // Sarah uploads resume & tracks jobs
  const SARAH_RESUME = `Sarah Chen\nSan Francisco | sarah@chen.ai\nPyTorch, JAX, Reinforcement Learning, Diffusion, CUDA`;
  dom.window.state.resumeText = SARAH_RESUME;
  dom.window.state.parsedResume = dom.window.parseResumeText(SARAH_RESUME);
  dom.window.saveState();

  const testJob = dom.window.seedJobs[0];
  dom.window.moveJobToStage(testJob.id, "applied");
  console.log(`  ✓ Sarah tracked job "${testJob.title}" into applied stage`);

  console.log("\n--- TEST 3: User A Signs Out ---");
  dom.window.saveCurrentSessionUser(null);
  dom.window.loadState();

  const guestBtnText = dom.window.document.getElementById("active-user-name").textContent;
  console.log(`  ✓ Post Sign-Out Button: "${guestBtnText}"`);
  if (guestBtnText !== "Sign In / Register") {
    throw new Error("Expected session to reset to Guest mode after sign out");
  }
  if (dom.window.state.resumeText !== "") {
    throw new Error("Resume text was not cleared after sign out!");
  }
  console.log("  ✓ PASS: Session cleared cleanly, zero data visible to guest");

  console.log("\n--- TEST 4: User B (Alex Mercer) Signs In ---");
  const alexUser = {
    id: "usr_alex",
    name: "Alex Mercer",
    email: "alex@mercer.dev",
    avatar: "👨‍💻",
    token: "token_alex_456"
  };
  dom.window.saveCurrentSessionUser(alexUser);
  dom.window.loadState();

  const alexBtnText = dom.window.document.getElementById("active-user-name").textContent;
  console.log(`  ✓ Alex's Active Button: "${alexBtnText}"`);
  if (alexBtnText !== "Alex Mercer") {
    throw new Error("Alex's profile was not loaded");
  }
  if (dom.window.state.tracker.applied.includes(testJob.id)) {
    throw new Error("Sarah's applied jobs leaked into Alex's private session!");
  }
  console.log("  ✓ PASS: Alex sees ONLY his own clean profile, zero data from Sarah");

  console.log("\n===============================================================");
  console.log("  ALL PRIVACY & ISOLATION TESTS PASSED SUCCESSFULLY!          ");
  console.log("===============================================================\n");
}

runPrivacyTestSuite().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
