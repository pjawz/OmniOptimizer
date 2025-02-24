// New overlay UI code exported from this module
let haloOverlay;

export function showHaloOverlay() {
	haloOverlay = document.createElement("div");
	haloOverlay.style.position = "fixed";
	haloOverlay.style.top = "0";
	haloOverlay.style.left = "0";
	haloOverlay.style.width = "100vw";
	haloOverlay.style.height = "100vh";
	haloOverlay.style.zIndex = "1000";
	haloOverlay.style.pointerEvents = "auto";
	haloOverlay.style.background =
		"radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.7) 100%)";

	const contentContainer = document.createElement("div");
	contentContainer.style.position = "fixed";
	contentContainer.style.top = "10%";
	contentContainer.style.left = "50%";
	contentContainer.style.transform = "translateX(-50%)";
	contentContainer.style.color = "#fff";
	contentContainer.style.fontSize = "24px";
	contentContainer.style.fontWeight = "bold";
	contentContainer.style.textAlign = "center";
	contentContainer.style.background = "rgba(0, 0, 0, 0.5)";
	contentContainer.style.padding = "10px 20px";
	contentContainer.style.borderRadius = "8px";

	const message = document.createElement("div");
	message.innerHTML = "OmniOptimizer is running...";

	const cancelButton = document.createElement("button");
	cancelButton.textContent = "Cancel";
	cancelButton.style.marginLeft = "20px";
	cancelButton.style.fontSize = "inherit";
	cancelButton.style.padding = "5px 10px";
	cancelButton.addEventListener("click", () => {
		cancelOptimization();
	});

	contentContainer.appendChild(message);
	contentContainer.appendChild(cancelButton);
	haloOverlay.appendChild(contentContainer);

	["click", "mousedown", "mouseup", "mousemove", "wheel", "keydown", "keyup", "keypress"].forEach(
		(eventType) => {
			haloOverlay.addEventListener(
				eventType,
				(e) => {
					e.preventDefault();
					e.stopPropagation();
				},
				true
			);
		}
	);

	document.body.appendChild(haloOverlay);
	return true;
}

export function removeHaloOverlay() {
	if (haloOverlay) {
		document.body.removeChild(haloOverlay);
		haloOverlay = null;
	}
}

export function cancelOptimization() {
	chrome.runtime.sendMessage({
		popupAction: { event: "cancelOptimization" },
	});
	removeHaloOverlay();
}
