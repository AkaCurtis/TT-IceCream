const tracker = document.getElementById("tracker");
const icecreamDisplay = document.getElementById("icecream-count");
const chestDisplay = document.getElementById("chest-count");
const soldDisplay = document.getElementById("icecream-sold");
const debugConsole = document.getElementById("debug-console");
const resizeHandle = document.getElementById("resize-handle");
const settingsToggleBtn = document.getElementById("settings-toggle");
const settingsPanel = document.getElementById("settings-panel");
const sellingToggle = document.getElementById("selling-toggle");
const debugToggle = document.getElementById("debug-toggle");
const sellerTitleDisplay = document.getElementById("seller-title");

if (sellerTitleDisplay) {
  sellerTitleDisplay.style.fontSize = "13px";
  sellerTitleDisplay.style.color = "#aaa";
  sellerTitleDisplay.style.marginTop = "4px";
}

let totalSold = null;
let sellingMode = false;
let summerChestCount = 0;

const SELLER_TITLES = [
  { amount: 10, title: "🍦 Vanilla Swirl 🍦" },
  { amount: 50, title: "🍦 Neapolitan 🍦" },
  { amount: 75, title: "🍫 Chocolate Chip 🍫" },
  { amount: 150, title: "Scoop there it is!" },
  { amount: 250, title: "💨 Brain Freeze 💨" },
  { amount: 500, title: "🍍 Tropical Twist 🍍" },
  { amount: 1000, title: "🏆 Summer Legend 🏆" }
];

function logDebug(msg) {
  if (debugToggle.checked) {
    debugConsole.style.display = "block";
    debugConsole.textContent += msg + "\n";
    debugConsole.scrollTop = debugConsole.scrollHeight;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sleepUntil(predicate, interval = 50, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (predicate()) return resolve();
      if (Date.now() - start >= timeout) return reject("Timeout");
      setTimeout(check, interval);
    };
    check();
  });
}

async function openChestsLoop() {
  logDebug("\u26a1 Starting menu-based open sequence...");
  window.parent.postMessage({ type: "sendCommand", command: "rm_inventory" }, "*");
  logDebug("📱 Sent rm_inventory. Waiting for menu choices to populate...");
  await sleep(500);

  let success = false;
  let attempts = 0;

  while (!success && attempts < 2) {
    attempts++;
    try {
      await sleepUntil(() => {
        const choices = window.state?.cache?.menu_choices ?? [];
        return choices.some(choice =>
          choice[0]?.replace(/(<.+?>)|(&#.+?;)/g, '').includes('Treasure Chest')
        );
      }, 40, 6000);


      const targetOption = (window.state.cache.menu_choices ?? []).find(
        c => c[0]?.replace(/(<.+?>)|(&#.+?;)/g, '') === 'Treasure Chest [Summer 2025]'
      )?.[0];

      if (targetOption) {
        logDebug("✅ Found chest menu option: " + targetOption);
        window.parent.postMessage({ type: "forceMenuChoice", choice: targetOption, mod: 0 }, "*");
        logDebug("✅ Selected Summer Chest. Waiting for submenu...");

        await sleepUntil(() => {
          const submenu = window.state?.cache?.menu_choices ?? [];
          return submenu.length > 0 && submenu.some(c => /open/i.test(c[0]));
        }, 40, 4000);

        await sleep(300);

        const submenuChoice = (window.state.cache.menu_choices ?? []).find(c =>
          /open/i.test(c[0])
        )?.[0];

        if (submenuChoice) {
          window.parent.postMessage({ type: "forceMenuChoice", choice: submenuChoice, mod: -1 }, "*");
          logDebug("🎉 Sent 'Open' submenu click to chest.");
          success = true;
        } else {
          logDebug("⚠️ 'Open' option was not found in submenu.");
        }
      } else {
        logDebug("❌ Option not found after condition passed?");
      }
    } catch (e) {
      logDebug(`❌ Attempt ${attempts} failed: ${e}`);
      await sleep(1000);
    }
  }

  if (!success) {
    logDebug("❌ Failed to open Summer 2025 Chest after retries.");
  }
}

function updateSoldDisplay() {
  soldDisplay.textContent = `💰Ice Creams Sold: ${totalSold}`;
  if (sellerTitleDisplay) {
    const next = SELLER_TITLES.find(t => totalSold < t.amount);
    if (next) {
      const remaining = next.amount - totalSold;
      sellerTitleDisplay.textContent = `Next Title: ${next.title} (${remaining} more)`;
      sellerTitleDisplay.style.display = "block";
    } else {
      sellerTitleDisplay.textContent = `🌟 You are a ${SELLER_TITLES[SELLER_TITLES.length - 1].title}!`;
      sellerTitleDisplay.style.display = "block";
    }
  }
}

const savedX = localStorage.getItem("tracker_x");
const savedY = localStorage.getItem("tracker_y");
if (savedX && savedY) {
  tracker.style.left = savedX + "px";
  tracker.style.top = savedY + "px";
}

sellingToggle.checked = localStorage.getItem("selling_mode") === "true";
sellingMode = sellingToggle.checked;
soldDisplay.style.display = sellingMode ? "block" : "none";
sellerTitleDisplay.style.display = sellingMode ? "block" : "none";

debugToggle.checked = localStorage.getItem("debug_enabled") === "true";
debugConsole.style.display = debugToggle.checked ? "block" : "none";

sellingToggle.addEventListener("change", (e) => {
  sellingMode = e.target.checked;
  localStorage.setItem("selling_mode", sellingMode);
  soldDisplay.style.display = sellingMode ? "block" : "none";
  sellerTitleDisplay.style.display = sellingMode ? "block" : "none";
});

debugToggle.addEventListener("change", (e) => {
  localStorage.setItem("debug_enabled", e.target.checked);
  document.getElementById("debug-console").style.display = e.target.checked ? "block" : "none";
});

settingsToggleBtn.addEventListener("click", () => {
  settingsPanel.style.display = settingsPanel.style.display === "none" ? "block" : "none";
});

let isDragging = false, isResizing = false;
let offsetX = 0, offsetY = 0;
let startWidth, startHeight, startX, startY;

tracker.addEventListener("mousedown", (e) => {
  if (e.target.closest("#resize-handle")) return;
  if (e.target.id === "header") {
    isDragging = true;
    offsetX = e.clientX - tracker.offsetLeft;
    offsetY = e.clientY - tracker.offsetTop;
    tracker.style.cursor = "grabbing";
  }
});

document.addEventListener("mouseup", () => {
  if (isDragging) {
    localStorage.setItem("tracker_x", tracker.offsetLeft);
    localStorage.setItem("tracker_y", tracker.offsetTop);
  }
  isDragging = false;
  tracker.style.cursor = "grab";
  isResizing = false;
});

document.addEventListener("mousemove", (e) => {
  if (isDragging) {
    tracker.style.left = `${e.clientX - offsetX}px`;
    tracker.style.top = `${e.clientY - offsetY}px`;
  }
  if (isResizing) {
    tracker.style.width = startWidth + (e.clientX - startX) + "px";
    tracker.style.height = startHeight + (e.clientY - startY) + "px";
  }
});

resizeHandle.addEventListener("mousedown", (e) => {
  e.preventDefault();
  isResizing = true;
  startWidth = tracker.offsetWidth;
  startHeight = tracker.offsetHeight;
  startX = e.clientX;
  startY = e.clientY;
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    window.parent.postMessage({ type: "pin" }, "*");
  }
});

window.addEventListener("message", async (event) => {
  const raw = event.data;
  const msg = raw?.data || raw;
  const note = msg?.notification || msg?.data?.notification;

  console.log("🥪 Full message received:", raw);

  const data = raw?.data || raw;
  if (
    data &&
    typeof data === "object" &&
    "trigger_open_chests" in data &&
    Object.keys(data).length === 1 &&
    typeof data.trigger_open_chests === "number"
  ) {
    logDebug("🎯 'Open Chest' keybind manually triggered!");
    await openChestsLoop();
  }



  if (!window.state) window.state = { cache: {} };

  if (!window._initialDumped && typeof msg === "object") {
    window._initialDumped = true;
  }

  if (typeof msg === "object") {
    for (const [key, value] of Object.entries(msg)) {
      if (key === 'menu_choices') {
        try {
          const parsed = JSON.parse(value ?? '[]');
          window.state.cache.menu_choices = parsed;
          const readable = parsed.map(c => c[0]).join(" | ");
          logDebug("📋 menu_choices received: " + readable);
        } catch {
          window.state.cache.menu_choices = [];
          logDebug("⚠️ Failed to parse menu_choices.");
        }
      } else if (key === 'menu_open') {
        window.state.cache.menu_open = value;
        logDebug(value ? "📂 Menu has opened." : "📪 Menu closed.");
      } else {
        window.state.cache[key] = value;
      }
    }
  }

  let invString = msg?.inventory || msg?.data?.inventory || msg?.payload?.inventory;
  if (typeof invString === "string") {
    try {
      const inv = JSON.parse(invString);
      const ice = inv["icecream_2025"]?.amount || 0;
      const chests = inv["chest_summer25"]?.amount || 0;
      icecreamDisplay.textContent = `🍦 Ice Creams: ${ice}`;
      chestDisplay.textContent = `🎁 Summer Chests: ${chests}`;
      summerChestCount = chests;
    } catch {
      icecreamDisplay.textContent = "⚠️ Inventory Error!";
      chestDisplay.textContent = "";
    }
  }

  if (note) {
    logDebug("📨 Notification field: " + note);

    if (sellingMode && typeof note === "string") {
      const match = note.match(/You sold \d+ ice cream\(s\)! Total sold: (\d+)/i);
      if (match) {
        const sold = parseInt(match[1]);
        totalSold = sold;
        updateSoldDisplay();
        logDebug("🍦 Sale detected. Updated totalSold to " + totalSold);
      }
    }
  }
});

window.addEventListener("DOMContentLoaded", () => {
  window.parent.postMessage({ type: "getData" }, "*");
  window.parent.postMessage({
    type: "registerTrigger",
    trigger: "open_chests",
    name: "Open Summer Chest"
  }, "*");
  logDebug("✅ Debug console initialized and working.");
});
