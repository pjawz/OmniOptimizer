/********************************************************************
 *                     OMNIOPTIMIZER EXTENSION
 *
 * This file implements the Optimizer class used in the OmniOptimizer
 * extension. It listens for messages from other parts of the
 * extension (or other extensions) and handles optimization tasks based
 * on the selected algorithm. The class also handles data and storage
 * events to maintain the internal state of user parameters.
 *
 ********************************************************************/

class Optimizer {
	constructor() {
		// Bind listeners for various Chrome events
		chrome.runtime.onMessage.addListener(this.onMessageReceived.bind(this));
		chrome.runtime.onMessage.addListener(this.onDataMessageReceived.bind(this));
		chrome.storage.onChanged.addListener(this.onStorageChanged.bind(this));
		chrome.runtime.onStartup.addListener(this.setupInitialState.bind(this));
	}

	/**
	 * Listener for setting the selected optimization algorithm.
	 * Receives a message with a new algorithm and updates internal storage.
	 *
	 * @param {Object} message - The message object received.
	 * @param {Object} sender - Information about the sender.
	 * @param {Function} sendResponse - Callback to send a response.
	 */
	onMessageReceived(message, sender, sendResponse) {
		if (message.type === "setAlgorithm") {
			chrome.storage.local.set({ selected_algorithm: message.algorithm }, () => {
				console.log("Algorithm set to:", message.algorithm);
			});
		}
	}

	/**
	 * Performs optimization based on the selected algorithm stored in local storage.
	 * Retrieves the algorithm setting and logs the corresponding optimization process.
	 */
	performOptimization() {
		chrome.storage.local.get("selectedAlgorithm", (data) => {
			if (data.selectedAlgorithm === "traversal") {
				console.log("Performing traversal optimization");
			} else if (data.selectedAlgorithm === "genetic") {
				console.log("Performing genetic optimization");
			}
		});
	}

	/**
	 * Message listener responsible for storing data into local storage.
	 * Returns success status after storing the received data.
	 *
	 * @param {Object} request - The request object containing data.
	 * @param {Object} sender - Information about the sender.
	 * @param {Function} sendResponse - Callback to send a response.
	 * @returns {boolean} Returns true to indicate asynchronous response.
	 */
	onDataMessageReceived(request, sender, sendResponse) {
		chrome.storage.local.set({ data: request.data }, () => {
			sendResponse({ status: "success" });
		});
		return true;
	}

	/**
	 * Initializes the state for user parameters upon termination or system startup.
	 * Sets default values for user parameter count and input parameters.
	 */
	setupInitialState() {
		chrome.storage.local.set({
			user_parameter_count: 1,
			input_start0: null,
			input_end0: null,
			input_step0: null,
		});
	}

	/**
	 * Listens for changes in local storage specifically for the selected algorithm.
	 * Logs any changes to the selected algorithm.
	 *
	 * @param {Object} changes - The object containing changes in storage.
	 * @param {string} namespace - The namespace in which the change occurred.
	 */
	onStorageChanged(changes, namespace) {
		if (namespace === "local" && changes.selectedAlgorithm) {
			const new_algorithm = changes.selectedAlgorithm.newValue;
			console.log("Selected algorithm changed to:", new_algorithm);
		}
	}
}

// Create an instance to preserve backwards compatibility
const optimizer_instance = new Optimizer();

// Global function to perform optimization, accessible throughout the app
function performOptimization() {
	optimizer_instance.performOptimization();
}

// Add this listener to open a persistent window instead of a popup
chrome.action.onClicked.addListener(() => {
	chrome.windows.create(
		{
			url: "src/dashboard.html", // Create this file in your project folder
			type: "popup",
			width: 720,
			height: 600,
		},
		function (newWindow) {
			console.log("Persistent window opened:", newWindow);
		}
	);
});
