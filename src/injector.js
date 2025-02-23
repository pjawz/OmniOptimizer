/**
 * @file injector.js
 * @description This script handles the injection of another script (controller.js) into the current webpage.
 * It interacts with the page's JavaScript environment.
 * The script also manages the optimization process, including locking/unlocking the optimize button,
 * storing reports, and displaying an overlay to prevent user interaction during optimization.
 *
 * @license MIT
 *
 * @requires chrome.runtime
 * @requires chrome.storage
 *
 * @function injectScriptIntoDOM
 * @description Injects script.js into the current webpage and sets up necessary event listeners.
 *
 * @function reportDataEventCallback
 * @description Handles the report data sent from script.js after an optimization completes.
 *
 * @function createGradientBox
 * @description Creates an overlay to prevent unintended user interactions during optimization.
 *
 * @function removeGradientBox
 * @description Removes the overlay from the page once the operation concludes.
 *
 * @event ReportDataEvent
 * @description Custom event dispatched by script.js to send optimization report data.
 *
 * @event SelectedAlgorithmEvent
 * @description Custom event dispatched to pass the selected algorithm to script.js.
 *
 * @event StopOptimizationStatus
 * @description Custom event dispatched to notify script.js about the stop optimization status.
 *
 * @event UserInputsEvent
 * @description Custom event dispatched to pass user input data to script.js.
 *
 */

let haloOverlay;

console.log("injector.js has been successfully started");

// Updated handler for ReportDataEvent; now calls removeHaloOverlay
const reportDataEventHandler = (evt) => {
	chrome.storage.local.get(["saveReport", "userCanceled", "selectedAlgorithm"], (data) => {
		if (data.saveReport) {
			const reportKey = "report-data-" + evt.detail.strategyID;
			if (Object.keys(evt.detail.reportData).length > 0) {
				let reportName = evt.detail.strategyName;
				if (data.userCanceled) {
					reportName += " (Canceled)";
					chrome.storage.local.set({ userCanceled: false });
				}
				if (data.selectedAlgorithm) {
					reportName += " - " + data.selectedAlgorithm;
				}
				const reportDetail = {
					...evt.detail,
					strategyName: reportName,
				};
				chrome.storage.local.set({ [reportKey]: reportDetail }, () => {
					console.log(
						"✅ Optimization Completed Successfully & Added to OmniOptimizer Reports."
					);
				});
			} else {
				console.warn("⚠️ Optimization Failed. Please try again with fewer steps.");
			}
		}
		removeHaloOverlay();
	});
	window.removeEventListener("ReportDataEvent", reportDataEventHandler, false);
};

// showHaloOverlay creates a halo-style overlay with a top-positioned content container and a cancel button.
const showHaloOverlay = () => {
	haloOverlay = document.createElement("div");
	haloOverlay.style.position = "fixed";
	haloOverlay.style.top = "0";
	haloOverlay.style.left = "0";
	haloOverlay.style.width = "100vw";
	haloOverlay.style.height = "100vh";
	haloOverlay.style.zIndex = "1000";
	haloOverlay.style.pointerEvents = "auto";
	// Halo effect: transparent center with intense dark edges
	haloOverlay.style.background =
		"radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.7) 100%)";

	// Create a content container positioned at the top center
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

	// Message text
	const message = document.createElement("div");
	message.innerHTML = "OmniOptimizer is running...";

	// Cancel button without confirmation
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

	// Prevent interactions with the underlying page
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
};

// removeHaloOverlay removes the halo overlay from the DOM
const removeHaloOverlay = () => {
	if (haloOverlay) {
		document.body.removeChild(haloOverlay);
		haloOverlay = null;
	}
};

// cancelOptimization immediately cancels the optimization process without an alert
const cancelOptimization = () => {
	chrome.runtime.sendMessage({
		popupAction: { event: "cancelOptimization" },
	});
	removeHaloOverlay();
};

// injectScriptIntoDOM updated to use the halo overlay and its new behavior
const injectScriptIntoDOM = () => {
	// Show the halo overlay with updated styling and cancel functionality
	const overlayShown = showHaloOverlay();

	// Define sendUserInputsMessage before its usage
	const sendUserInputsMessage = (userInputs) => {
		const evt = new CustomEvent("UserInputsEvent", { detail: userInputs });
		window.dispatchEvent(evt);
	};

	console.log("Checking for indicator-properties-dialog element...");
	if (document.querySelectorAll("div[data-name=indicator-properties-dialog]").length < 1) {
		console.warn(
			"Element 'div[data-name=indicator-properties-dialog]' not found. Aborting script injection."
		);
		return false;
	}

	const s = document.createElement("script");
	s.src = chrome.runtime.getURL("src/controller.js");
	s.type = "module";
	s.onload = () => {
		s.remove();
		console.log("✅ controller.js has been successfully injected into the DOM.");
		chrome.storage.local.get("selectedAlgorithm", ({ selectedAlgorithm }) => {
			if (selectedAlgorithm) {
				console.log(
					"injector.js received Selected Algorithm from storage:",
					selectedAlgorithm
				);
				const evt = new CustomEvent("SelectedAlgorithmEvent", {
					detail: { algorithm: selectedAlgorithm },
				});
				window.dispatchEvent(evt);
			}
		});
	};
	(document.head || document.documentElement).appendChild(s);

	chrome.storage.onChanged.addListener((changes) => {
		if (changes.stopOptimization) {
			const event = new CustomEvent("StopOptimizationStatus", {
				detail: changes.stopOptimization.newValue,
			});
			window.dispatchEvent(event);
		}
	});

	chrome.storage.local.get("userInputs", ({ userInputs }) => {
		setTimeout(sendUserInputsMessage, 500, userInputs);
	});

	return overlayShown;
};

// Wait for the DOM to be fully loaded before initiating the injection
window.addEventListener("DOMContentLoaded", (event) => {
	console.log("DOM fully loaded and parsed");
	const isInjected = injectScriptIntoDOM();
	if (isInjected) {
		window.addEventListener("ReportDataEvent", reportDataEventHandler, false);
		chrome.runtime.sendMessage({
			popupAction: { event: "lockOptimizeButton" },
		});
	} else {
		chrome.runtime.sendMessage({
			notify: {
				type: "warning",
				content: "Error Optimization - Open Strategy Settings on Tradingview.com",
			},
		});
		chrome.storage.local.set({ isOptimizing: false });
		removeHaloOverlay();
	}
});

injectScriptIntoDOM();
