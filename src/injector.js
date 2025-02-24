/**
 * @file injector.js
 * @description This script handles the injection of the optimizer.js script into the current webpage.
 * It interacts with the page's JavaScript environment and manages the optimization process.
 * The script also handles locking/unlocking the optimize button and dispatching user inputs and selected algorithm events.
 *
 * @license MIT
 *
 * @requires chrome.runtime
 * @requires chrome.storage
 *
 * @function injectScriptIntoDOM
 * @description Injects optimizer.js into the current webpage and sets up necessary event listeners.
 *
 * @event SelectedAlgorithmEvent
 * @description Custom event dispatched to pass the selected algorithm to optimizer.js.
 *
 * @event StopOptimizationStatus
 * @description Custom event dispatched to notify optimizer.js about the stop optimization status.
 *
 * @event UserInputsEvent
 * @description Custom event dispatched to pass user input data to optimizer.js.
 *
 */

console.log("injector.js has been successfully started");

// Update injectScriptIntoDOM to remove overlay UI invocation
const injectScriptIntoDOM = () => {
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
	// Changed from src/controller.js to src/optimizer.js for consistency with renamed file
	s.src = chrome.runtime.getURL("src/optimizer.js");
	s.type = "module";
	s.onload = () => {
		s.remove();
		console.log("✅ optimizer.js has been successfully injected into the DOM.");
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

	return true;
};

// Wait for the DOM to be fully loaded before initiating the injection
window.addEventListener("DOMContentLoaded", (event) => {
	console.log("DOM fully loaded and parsed");
	const isInjected = injectScriptIntoDOM();
	if (isInjected) {
		// Removed overlay related listener: ReportDataEvent already handled in optimizer.js
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
	}
});

injectScriptIntoDOM();
xzx;
