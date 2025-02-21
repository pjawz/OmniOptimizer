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

// Added JSDoc comments to the Optimizer class and its functions
class Optimizer {
	/**
	 * Creates an instance of Optimizer and binds Chrome event listeners.
	 */
	constructor() {
		// Bind listeners for various Chrome events
		chrome.runtime.onMessage.addListener(this.onMessageReceived.bind(this));
		chrome.runtime.onMessage.addListener(this.onDataMessageReceived.bind(this));
		chrome.storage.onChanged.addListener(this.onStorageChanged.bind(this));
		chrome.runtime.onStartup.addListener(this.setupInitialState.bind(this));
	}

	/**
	 * Handles messages to set the selected optimization algorithm.
	 * @param {Object} message - The message object received containing algorithm data.
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
	 * Retrieves the selected algorithm from storage and performs optimization accordingly.
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
	 * Stores incoming data into local storage and sends a success response.
	 * @param {Object} request - The request object containing data.
	 * @param {Object} sender - Information about the sender.
	 * @param {Function} sendResponse - Callback to send a response.
	 * @returns {boolean} True for asynchronous response handling.
	 */
	onDataMessageReceived(request, sender, sendResponse) {
		chrome.storage.local.set({ data: request.data }, () => {
			sendResponse({ status: "success" });
		});
		return true;
	}

	/**
	 * Initializes the state for user parameters on startup.
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
	 * Handles changes in storage for the selected algorithm and logs the update.
	 * @param {Object} changes - Object containing new and old values.
	 * @param {string} namespace - The namespace where the change occurred.
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

/**
 * Global function to perform optimization using the Optimizer instance.
 */
const performOptimization = () => {
	optimizer_instance.performOptimization();
};

// Listener to open a persistent window instead of a popup
chrome.action.onClicked.addListener(() => {
	chrome.windows.create(
		{
			url: "src/dashboard.html",
			type: "popup",
			width: 720,
			height: 600,
		},
		(newWindow) => {
			console.log("Persistent window opened:", newWindow);
		}
	);
});
