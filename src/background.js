/********************************************************************
 *                     OMNIOPTIMIZER EXTENSION
 *
 * This file serves as the background script for the OmniOptimizer
 * extension. It listens for messages from other parts of the extension
 * to set the selected algorithm, perform optimization tasks, and store
 * data. It also handles browser action clicks to open the dashboard.
 *
 ********************************************************************/

// Single listener for handling various messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "setAlgorithm") {
        chrome.storage.local.set({ selectedAlgorithm: message.algorithm }, () => {
            console.log("Algorithm set to:", message.algorithm);
        });
    } else if (message.type === "performOptimization") {
        console.log("Perform optimization message received");
        // Optionally send a response or further info
        return true;
    } else if (message.data) {
        chrome.storage.local.set({ data: message.data }, () => {
            sendResponse({ status: "success" });
        });
        return true;
    }
});

// Handle browser action click: open popup window if needed
chrome.action.onClicked.addListener(() => {
    chrome.windows.create(
        {
            url: "src/dashboard/dashboard.html",
            type: "popup",
            width: 720,
            height: 600,
        },
        (newWindow) => {
            console.log("Persistent window opened:", newWindow);
        }
    );
});
