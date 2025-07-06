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

let totalSold = null;
let sellingMode = false;

function logDebug(msg) {
	if (debugToggle.checked) {
		debugConsole.style.display = "block";
		debugConsole.textContent += msg + "\n";
		debugConsole.scrollTop = debugConsole.scrollHeight;
	}
}

const savedX = localStorage.getItem("tracker_x");
const savedY = localStorage.getItem("tracker_y");
if (savedX && savedY) {
	tracker.style.left = savedX + "px";
	tracker.style.top = savedY + "px";
}

const savedSelling = localStorage.getItem("selling_mode") === "true";
sellingToggle.checked = savedSelling;
sellingMode = savedSelling;
soldDisplay.style.display = sellingMode ? "block" : "none";

const savedDebug = localStorage.getItem("debug_enabled") === "true";
debugToggle.checked = savedDebug;
debugConsole.style.display = savedDebug ? "block" : "none";

sellingToggle.addEventListener("change", (e) => {
	sellingMode = e.target.checked;
	localStorage.setItem("selling_mode", sellingMode);
	soldDisplay.style.display = sellingMode ? "block" : "none";
});

debugToggle.addEventListener("change", (e) => {
	const enabled = e.target.checked;
	debugConsole.style.display = enabled ? "block" : "none";
	localStorage.setItem("debug_enabled", enabled);
});

settingsToggleBtn.addEventListener("click", () => {
	settingsPanel.style.display = settingsPanel.style.display === "none" ? "block" : "none";
});

let isDragging = false;
let offsetX, offsetY;

tracker.addEventListener("mousedown", (e) => {
	if (e.target.id === "resize-handle" || e.target.closest("#resize-handle")) return;

	if (e.target.id === "header" || e.target === tracker) {
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

	if (isResizing) isResizing = false;
});

document.addEventListener("mousemove", (e) => {
	if (isDragging) {
		tracker.style.left = `${e.clientX - offsetX}px`;
		tracker.style.top = `${e.clientY - offsetY}px`;
	}

	if (isResizing) {
		const newWidth = startWidth + (e.clientX - startX);
		const newHeight = startHeight + (e.clientY - startY);
		tracker.style.width = newWidth + "px";
		tracker.style.height = newHeight + "px";
	}
});

window.addEventListener("keydown", (e) => {
	if (e.key === "Escape") {
		window.parent.postMessage({ type: "pin" }, "*");
	}
});

let isResizing = false;
let startWidth, startHeight, startX, startY;

resizeHandle.addEventListener("mousedown", (e) => {
	e.preventDefault();
	isResizing = true;
	startWidth = tracker.offsetWidth;
	startHeight = tracker.offsetHeight;
	startX = e.clientX;
	startY = e.clientY;
});

function updateSoldDisplay() {
	soldDisplay.textContent = `🧾 Ice Creams Sold: ${totalSold}`;
}

window.addEventListener("message", (event) => {
	const msg = event.data;

	if (!window._initialDumped && typeof msg === "object") {
		logDebug("🧪 Full getData payload:\n" + JSON.stringify(msg, null, 2));
		window._initialDumped = true;
	}

	let invString = null;
	if (typeof msg.inventory === "string") {
		invString = msg.inventory;
	} else if (typeof msg.data?.inventory === "string") {
		invString = msg.data.inventory;
	} else if (typeof msg.payload?.inventory === "string") {
		invString = msg.payload.inventory;
	}

	if (invString) {
		try {
			const inv = JSON.parse(invString);
			const icecream = inv["icecream_2025"]?.amount || 0;
			const chest = inv["chest_summer25"]?.amount || 0;

			icecreamDisplay.textContent = `🍦 Ice Creams Held: ${icecream}`;
			chestDisplay.textContent = `🎁 Summer Chests: ${chest}`;
		} catch {
			icecreamDisplay.textContent = "⚠️ Inventory Error!";
			chestDisplay.textContent = "";
		}
	}

	if (msg?.data?.notification) {
		logDebug("📩 Notification field: " + msg.data.notification);

		if (sellingMode && typeof msg.data.notification === "string") {
			const match = msg.data.notification.match(/Total sold: (\d+)/);
			if (match) {
				const sold = parseInt(match[1]);
				if (totalSold === null) {
					totalSold = sold;
				} else if (sold > totalSold) {
					totalSold = sold;
				} else {
					totalSold++;
				}
				updateSoldDisplay();
			}
		}
	}
});

window.addEventListener("DOMContentLoaded", () => {
	window.parent.postMessage({ type: "getData" }, "*");
	logDebug("✅ Debug console initialized and working.");
});
