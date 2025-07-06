const tracker = document.getElementById("tracker");
const icecreamDisplay = document.getElementById("icecream-count");
const chestDisplay = document.getElementById("chest-count");
const soldDisplay = document.getElementById("icecream-sold");
const debugConsole = document.getElementById("debug-console");
const resizeHandle = document.getElementById("resize-handle");
const chestUI = document.getElementById("chest-ui");
const chestUIList = document.getElementById("chest-ui-list");
const clearChestLogBtn = document.getElementById("clear-chest-log");
const chestHeader = document.getElementById("chest-ui-header");
const settingsToggleBtn = document.getElementById("settings-toggle");
const settingsPanel = document.getElementById("settings-panel");
const sellingToggle = document.getElementById("selling-toggle");
const debugToggle = document.getElementById("debug-toggle");
const chestsToggle = document.getElementById("chests-toggle");

let totalSold = null;
let sellingMode = false;
let chestItems = {};
let summerChestCount = 0;
let chestOpeningActive = false;

function logDebug(msg) {
	if (debugToggle.checked) {
		document.getElementById("debug-console").style.display = "block";
		document.getElementById("debug-console").textContent += msg + "\n";
		document.getElementById("debug-console").scrollTop = debugConsole.scrollHeight;
	}
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function openChestsLoop() {
	while (chestOpeningActive && summerChestCount > 0) {
		window.parent.postMessage({
			type: "sendCommand",
			command: "item chest_summer25 open"
		}, "*");
		logDebug(`🗝️ Sent open command. Remaining: ${summerChestCount}`);
		summerChestCount--;
		await sleep(1500);
	}
}

function updateSoldDisplay() {
	soldDisplay.textContent = `🧾 Ice Creams Sold: ${totalSold}`;
}

function updateChestLog() {
	chestUIList.innerHTML = Object.entries(chestItems)
		.map(([item, count]) => `<div>${item} x${count}</div>`)
		.join('');
}

const savedX = localStorage.getItem("tracker_x");
const savedY = localStorage.getItem("tracker_y");
if (savedX && savedY) {
	tracker.style.left = savedX + "px";
	tracker.style.top = savedY + "px";
}

const savedChestX = localStorage.getItem("chest_x");
const savedChestY = localStorage.getItem("chest_y");
if (savedChestX && savedChestY) {
	chestUI.style.left = savedChestX + "px";
	chestUI.style.top = savedChestY + "px";
}

sellingToggle.checked = localStorage.getItem("selling_mode") === "true";
sellingMode = sellingToggle.checked;
soldDisplay.style.display = sellingMode ? "block" : "none";

debugToggle.checked = localStorage.getItem("debug_enabled") === "true";
debugConsole.style.display = debugToggle.checked ? "block" : "none";

chestsToggle.checked = localStorage.getItem("chests_enabled") === "true";
chestUI.style.display = chestsToggle.checked ? "block" : "none";

sellingToggle.addEventListener("change", (e) => {
	sellingMode = e.target.checked;
	localStorage.setItem("selling_mode", sellingMode);
	soldDisplay.style.display = sellingMode ? "block" : "none";
});

debugToggle.addEventListener("change", (e) => {
	localStorage.setItem("debug_enabled", e.target.checked);
	document.getElementById("debug-console").style.display = e.target.checked ? "block" : "none";
});

chestsToggle.addEventListener("change", async (e) => {
	const enabled = e.target.checked;
	localStorage.setItem("chests_enabled", enabled);
	chestUI.style.display = enabled ? "block" : "none";

	if (enabled) {
		chestOpeningActive = true;
		await openChestsLoop();
	} else {
		chestOpeningActive = false;
	}
});

clearChestLogBtn.addEventListener("click", () => {
	chestItems = {};
	updateChestLog();
});

settingsToggleBtn.addEventListener("click", () => {
	settingsPanel.style.display = settingsPanel.style.display === "none" ? "block" : "none";
});

let isDragging = false, isChestDragging = false, isResizing = false;
let offsetX = 0, offsetY = 0, chestOffsetX = 0, chestOffsetY = 0;
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

chestHeader.addEventListener("mousedown", (e) => {
	isChestDragging = true;
	chestOffsetX = e.clientX - chestUI.offsetLeft;
	chestOffsetY = e.clientY - chestUI.offsetTop;
	chestUI.style.cursor = "grabbing";
});

document.addEventListener("mouseup", () => {
	if (isDragging) {
		localStorage.setItem("tracker_x", tracker.offsetLeft);
		localStorage.setItem("tracker_y", tracker.offsetTop);
	}
	isDragging = false;
	tracker.style.cursor = "grab";

	if (isChestDragging) {
		localStorage.setItem("chest_x", chestUI.offsetLeft);
		localStorage.setItem("chest_y", chestUI.offsetTop);
	}
	isChestDragging = false;
	chestUI.style.cursor = "grab";

	isResizing = false;
});

document.addEventListener("mousemove", (e) => {
	if (isDragging) {
		tracker.style.left = `${e.clientX - offsetX}px`;
		tracker.style.top = `${e.clientY - offsetY}px`;
	}
	if (isChestDragging) {
		chestUI.style.left = `${e.clientX - chestOffsetX}px`;
		chestUI.style.top = `${e.clientY - chestOffsetY}px`;
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

window.addEventListener("message", (event) => {
	const msg = event.data;

	if (!window._initialDumped && typeof msg === "object") {
		logDebug("\uD83E\uDDEA Full getData payload:\n" + JSON.stringify(msg, null, 2));
		window._initialDumped = true;
	}

	let invString = msg.inventory || msg?.data?.inventory || msg?.payload?.inventory;
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

	if (msg?.data?.notification) {
		const note = msg.data.notification;
		logDebug("\uD83D\uDCEC Notification field: " + note);

		if (sellingMode) {
			const match = note.match(/Total sold: (\d+)/);
			if (match) {
				const sold = parseInt(match[1]);
				totalSold = totalSold === null ? sold : Math.max(totalSold + 1, sold);
				updateSoldDisplay();
			}
		}

		if (chestsToggle.checked) {
			const match = note.match(/Received (\d+) ~g~(.+?)~s~/);
			if (match) {
				const qty = parseInt(match[1]);
				let item = match[2].trim();
				item = item.replace(/<\/?[^>]+>/g, '').replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code)).replace(/~[a-z]~/gi, '');
				chestItems[item] = (chestItems[item] || 0) + qty;
				updateChestLog();
			}
		}
	}
});

window.addEventListener("DOMContentLoaded", () => {
	window.parent.postMessage({ type: "getData" }, "*");
	logDebug("✅ Debug console initialized and working.");
});
