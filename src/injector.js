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

(() => {
	console.log("injector.js has been successfully started");

	// reportDataEventCallback updated to an arrow function.
	const reportDataEventCallback = (evt) => {
		// Send a message to unlock the optimize button.
		chrome.runtime.sendMessage({
			popupAction: {
				event: "unlockOptimizeButton",
			},
		});
		// Reset isOptimizing flag.
		chrome.storage.local.set({ isOptimizing: false });
		// Retrieve relevant flags and data.
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
			removeGradientBox();
		});
		window.removeEventListener("ReportDataEvent", reportDataEventCallback, false);
	};

	// createGradientBox as an arrow function.
	const createGradientBox = () => {
		gradientBox = document.createElement("div");
		gradientBox.style.width = "100vw";
		gradientBox.style.height = "100vh";
		gradientBox.style.background =
			"linear-gradient(90deg, rgba(213, 0, 249, 0.2), rgba(41, 98, 255, 0.2) 50.31%, rgba(0, 188, 230, 0.2))";
		gradientBox.style.position = "fixed";
		gradientBox.style.top = "0";
		gradientBox.style.left = "0";
		gradientBox.style.zIndex = "1000";
		gradientBox.style.pointerEvents = "auto";
		gradientBox.style.display = "flex";
		gradientBox.style.justifyContent = "center";
		gradientBox.style.alignItems = "center";

		const textMessage = document.createElement("div");
		textMessage.innerHTML =
			"OmniOptimizer is running...<br>Please wait or click 'Cancel' to stop.";
		textMessage.style.background =
			"linear-gradient(90deg, rgba(0, 188, 230, 1), rgba(41, 98, 255, 1) 50.31%, rgba(213, 0, 249, 1))";
		textMessage.style.webkitBackgroundClip = "text";
		textMessage.style.backgroundClip = "text";
		textMessage.style.webkitTextFillColor = "transparent";
		textMessage.style.display = "inline-block";
		textMessage.style.fontSize = "36px";
		textMessage.style.fontWeight = "bold";
		textMessage.style.textAlign = "center";

		gradientBox.appendChild(textMessage);

		[
			"click",
			"mousedown",
			"mouseup",
			"mousemove",
			"wheel",
			"keydown",
			"keyup",
			"keypress",
		].forEach((eventType) => {
			gradientBox.addEventListener(
				eventType,
				(e) => {
					e.preventDefault();
					e.stopPropagation();
				},
				true
			);
		});
		document.body.appendChild(gradientBox);
	};

	// removeGradientBox as an arrow function.
	const removeGradientBox = () => {
		if (gradientBox) {
			document.body.removeChild(gradientBox);
			gradientBox = null;
		}
	};

	// Global variable for the gradientBox.
	let gradientBox;

	// injectScriptIntoDOM updated to an arrow function.
	const injectScriptIntoDOM = () => {
		createGradientBox();

		// Define sendUserInputsMessage before its usage.
		const sendUserInputsMessage = (userInputs) => {
			const evt = new CustomEvent("UserInputsEvent", { detail: userInputs });
			window.dispatchEvent(evt);
		};

		if (document.querySelectorAll("div[data-name=indicator-properties-dialog]").length < 1) {
			return false;
		}
		const s = document.createElement("script");
		s.src = chrome.runtime.getURL("src/controller.js");
		s.type = "module";
		s.onload = () => {
			s.remove();
			console.log("✅ script.js has been successfully injected into the DOM.");
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

	// Initiate injection and then set up event listener and messaging accordingly.
	const isInjected = injectScriptIntoDOM();
	if (isInjected) {
		window.addEventListener("ReportDataEvent", reportDataEventCallback, false);
		chrome.runtime.sendMessage({
			popupAction: {
				event: "lockOptimizeButton",
			},
		});
	} else {
		chrome.runtime.sendMessage({
			notify: {
				type: "warning",
				content: "Error Optimization - Open Strategy Settings on Tradingview.com",
			},
		});
		chrome.storage.local.set({ isOptimizing: false });
		removeGradientBox();
	}
})();
