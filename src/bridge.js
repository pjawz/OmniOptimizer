/**
 * @file bridge.js
 * @description This file configures the extension to interact with the webpage's DOM by listening for custom events
 * then relays the event details to the background script in a robust manner.
 */

window.addEventListener("CustomEventForExtension", (event) => {
	try {
		// Dispatch the event detail to the background script via the Chrome runtime messaging API.
		chrome.runtime.sendMessage({ data: event.detail }, (response) => {
			// Log the response obtained from the background script.
			console.log("Response from background:", response);
		});
	} catch (error) {
		// Check if the error indicates that the extension context has been invalidated.
		if (error.message === "Extension context invalidated.") {
			console.log("Extension context invalidated. Message not sent.");
		} else {
			// Log any unexpected errors for further investigation.
			console.error("Unexpected error:", error);
		}
	}
});
