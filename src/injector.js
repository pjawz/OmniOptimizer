/**
 * @file injector.js
 * @description This script handles the injection of another script (script.js) into the current webpage.
 * It interacts with the page's JavaScript environment, specifically for accessing React Props.
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

console.log("injector.js has been successfully started");

// injectScriptIntoDOM initiates the process of injecting script.js into the current webpage.
// The script is used to interact with the page’s JS environment (e.g. access React Props).
var is_injected = injectScriptIntoDOM();

// reportDataEventCallback handles the report data sent from script.js after an optimization completes.
// It unlocks the optimize button, stores the report using chrome.storage, and removes the overlay.
var reportDataEventCallback = function (evt) {
    // Send a message to unlock the optimize button in the extension popup.
    chrome.runtime.sendMessage({
        popupAction: {
            event: "unlockOptimizeButton",
        },
    });
    // Reset the isOptimizing flag in local storage.
    chrome.storage.local.set({ isOptimizing: false });
    // Retrieve reporting related flags and data from storage.
    chrome.storage.local.get(
        ["saveReport", "userCanceled", "selectedAlgorithm"],
        function (data) {
            if (data.saveReport) {
                // Construct a unique report key using the strategy ID.
                var report_key = "report-data-" + evt.detail.strategyID;
                // Check if the report data is not empty.
                if (Object.keys(evt.detail.reportData).length > 0) {
                    // Start with the original strategy name.
                    var report_name = evt.detail.strategyName;
                    // If the user canceled the optimization, append a suffix.
                    if (data.userCanceled) {
                        report_name += " (Canceled)";
                        // Reset the userCanceled flag in storage.
                        chrome.storage.local.set({ userCanceled: false });
                    }
                    // Append the selected algorithm name to the report name, if available.
                    if (data.selectedAlgorithm) {
                        report_name += " - " + data.selectedAlgorithm;
                    }
                    // Create a report detail object by merging the event details with the updated strategy name.
                    var report_detail = {
                        ...evt.detail,
                        strategyName: report_name,
                    };
                    // Save the report detail into chrome.storage.
                    chrome.storage.local.set({ [report_key]: report_detail }, function () {
                        console.log("✅ Optimization Completed Successfully & Added to OmniOptimizer Reports.");
                    });
                } else {
                    console.warn("⚠️ Optimization Failed. Please try again with fewer steps.");
                }
            }
            // Remove the overlay gradient box once the process completes.
            removeGradientBox();
        }
    );
    // Remove the event listener to prevent duplicate handling.
    window.removeEventListener("ReportDataEvent", reportDataEventCallback, false);
};

// If the script is injected successfully, set up the event and lock the optimize button.
// Otherwise, notify the user of an error and remove the overlay.
if (is_injected) {
    window.addEventListener("ReportDataEvent", reportDataEventCallback, false);
    // Lock the optimize button to avoid multiple submissions.
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

// Global variable to hold the gradient overlay element.
var gradient_box;

// createGradientBox creates an overlay to prevent unintended user interactions during optimization.
// The overlay also displays a custom message indicating that optimization is in progress.
function createGradientBox() {
    gradient_box = document.createElement("div");
    gradient_box.style.width = "100vw";
    gradient_box.style.height = "100vh";
    // Set a semi-transparent background gradient that controls opacity.
    gradient_box.style.background =
        "linear-gradient(90deg, rgba(213, 0, 249, 0.2), rgba(41, 98, 255, 0.2) 50.31%, rgba(0, 188, 230, 0.2))";
    gradient_box.style.position = "fixed";
    gradient_box.style.top = "0";
    gradient_box.style.left = "0";
    gradient_box.style.zIndex = "1000";
    gradient_box.style.pointerEvents = "auto";
    gradient_box.style.display = "flex";
    gradient_box.style.justifyContent = "center";
    gradient_box.style.alignItems = "center";

    // Create a text element to display an optimization status message.
    var text_message = document.createElement("div");
    text_message.innerHTML = "OmniOptimizer is running...<br>Please wait or click 'Cancel' to stop.";
    text_message.style.background =
        "linear-gradient(90deg, rgba(0, 188, 230, 1), rgba(41, 98, 255, 1) 50.31%, rgba(213, 0, 249, 1))";
    text_message.style.webkitBackgroundClip = "text";
    text_message.style.backgroundClip = "text";
    text_message.style.webkitTextFillColor = "transparent";
    text_message.style.textFillColor = "transparent"; // Note: Non-standard; may not be widely supported.
    text_message.style.display = "inline-block"; // Ensures proper application of background clipping.
    text_message.style.fontSize = "36px"; // Adjust font size as required.
    text_message.style.fontWeight = "bold";
    text_message.style.textAlign = "center";

    // Append the text message to the gradient overlay.
    gradient_box.appendChild(text_message);

    // Prevent the user from interacting with the underlying page by capturing various events.
    [
        "click",
        "mousedown",
        "mouseup",
        "mousemove",
        "wheel",
        "keydown",
        "keyup",
        "keypress",
    ].forEach((event_type) => {
        gradient_box.addEventListener(
            event_type,
            function (e) {
                e.preventDefault();
                e.stopPropagation();
            },
            true
        );
    });

    // Finally, add the fully configured gradient overlay to the document body.
    document.body.appendChild(gradient_box);
}

// removeGradientBox removes the overlay from the page once the operation concludes.
function removeGradientBox() {
    if (gradient_box) {
        document.body.removeChild(gradient_box);
        gradient_box = null;
    }
}

// injectScriptIntoDOM handles the injection of script.js into the page.
// It creates an overlay, checks for the presence of TradingView's Strategy Settings, and injects the script.
// Additionally, it passes key data (like selected algorithm and user inputs) to the injected script via custom events.
function injectScriptIntoDOM() {
    // Create the overlay to prevent user interaction during injection.
    createGradientBox();

    // Verify that the TradingView Strategy Settings dialog is open.
    if (
        document.querySelectorAll("div[data-name=indicator-properties-dialog]").length < 1
    ) {
        return false;
    }

    // Create a new script element for injecting script.js.
    var s = document.createElement("script");
    // Set the source URL using chrome.runtime.getURL for proper resolution.
    s.src = chrome.runtime.getURL("src/controller.js");
    // Set the script type to module for ES6 module support.
    s.type = "module";

    // Once script.js is loaded, remove it and dispatch the selectedAlgorithm event.
    s.onload = function () {
        this.remove();
        // Retrieve the selected algorithm value from chrome.storage.
        chrome.storage.local.get("selectedAlgorithm", ({ selectedAlgorithm }) => {
            if (selectedAlgorithm) {
                console.log("injector.js received Selected Algorithm from storage:", selectedAlgorithm);
                // Dispatch a custom event to pass the selected algorithm to script.js.
                var evt = new CustomEvent("SelectedAlgorithmEvent", {
                    detail: { algorithm: selectedAlgorithm },
                });
                window.dispatchEvent(evt);
                
            }
        });
    };

    // Append the script element to the head or document element.
    (document.head || document.documentElement).appendChild(s);

    // Listen for changes in the stopOptimization flag and dispatch a corresponding custom event.
    chrome.storage.onChanged.addListener(function (changes, namespace) {
        if (changes.stopOptimization) {
            var event = new CustomEvent("StopOptimizationStatus", {
                detail: changes.stopOptimization.newValue,
            });
            window.dispatchEvent(event);
        }
    });

    // Retrieve the userInputs from chrome.storage and dispatch them after a short delay.
    chrome.storage.local.get("userInputs", ({ userInputs }) => {
        setTimeout(sendUserInputsMessage, 500, userInputs);
    });

    // sendUserInputsMessage dispatches a custom event to pass user input data to controller.js.
    function sendUserInputsMessage(user_inputs) {
        var user_inputs_message = user_inputs;
        var evt = new CustomEvent("UserInputsEvent", { detail: user_inputs_message });
        window.dispatchEvent(evt);
    }

    return true;
}
