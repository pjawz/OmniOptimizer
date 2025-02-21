/**
 * @file controller.js
 * @description This file contains the main logic for the OmniOptimizerExtension, including the initialization of event listeners, 
 *              execution of the optimization process, and core algorithm logic for optimizing parameters.
 * @module controller
 * @requires ./utils/listeners.js
 * @requires ./utils/utils.js
 * @requires ./algorithms/algorithm_manager.js
 * 
 * Global Variables:
 * @var {Object} selectedAlgorithm - The algorithm selected for optimization.
 * @var {boolean} stopOptimizationFlag - Flag to stop the optimization process.
 * @var {NodeList} window.tvInputs - List of numeric input elements in the indicator properties dialog.
 * @var {number} maxProfit - Maximum profit achieved during optimization.
 * @var {Date} startTime - Start time of the optimization process.
 * @var {number} totalCount - Total number of configurations to be tested.
 * @var {number} testedCount - Number of configurations tested so far.
 * @var {number} predictTime - Predicted end time of the optimization process.
 * 
 * Functions:
 * @function executeOptimizationProcess - Main function to start the optimization process.
 * @function optimizeParams - Function to optimize parameters by simulating user interactions and observing mutations on the page.
 */
import init_listeners from "./utils/listeners.js";
import { sleep, checkForWarnings, changeTvInput, trigger, getParametersFromWindow, reportBuilder } from "./utils/utils.js";
import { runAlgorithm, evaluateOutcome } from "./algorithms/algorithm_manager.js";

// Global variable declarations
var selectedAlgorithm = null;
var stopOptimizationFlag = false;
window.tvInputs = document.querySelectorAll("div[data-name='indicator-properties-dialog'] input[inputmode='numeric']");
var maxProfit = -99999;
var startTime = new Date();
var totalCount = 1;
var testedCount = 0;
var predictTime = 0;

init_listeners();

// Run Optimization Process
executeOptimizationProcess();

// Main function to start the optimization process
const executeOptimizationProcess = async () => {
    stopOptimizationFlag = false; // Reset to false
    let userInputs = [];

    // Callback to build userInputs
    const userInputsEventCallback = (evt) => {
        window.removeEventListener("UserInputsEvent", userInputsEventCallback, false);
        userInputs = evt.detail;
    };

    window.addEventListener("UserInputsEvent", userInputsEventCallback, false);

    // Wait for the UserInputsEvent callback
    await sleep(500);

    // Store optimization results: A Map object (named optimizationResults) is used to store backtesting results for each configuration.
    let optimizationResults = new Map();

    startTime = new Date();
    // Instead of inline if/else, delegate to algorithm_manager
    await runAlgorithm(userInputs, optimizationResults, {
        change_tv_input: changeTvInput,
        sleep: sleep,
        optimizeParams: optimizeParams, 
        evaluateOutcome: evaluateOutcome,
        get_parameters_from_window: getParametersFromWindow, // Existing function below
        report_builder: reportBuilder  // Existing function below
    });

    // Build a report message with parameters and profit info
    const strategyName = document.querySelector("div[class*=strategyGroup]")?.innerText;
    let strategyTimePeriod = "";

    const timePeriodGroup = document.querySelectorAll("div[class*=innerWrap] div[class*=group]");
    if (timePeriodGroup.length > 1) {
        const selectedPeriod = timePeriodGroup[1].querySelector("button[aria-checked*=true]");
        if (selectedPeriod != null) {
            strategyTimePeriod = selectedPeriod.querySelector("div[class*=value]")?.innerHTML;
        } else {
            strategyTimePeriod = timePeriodGroup[1].querySelector("div[class*=value]")?.innerHTML;
        }
    }

    const title = document.querySelector("title")?.innerText;
    const strategySymbol = title.split(" ")[0];
    const optimizationResultsObject = Object.fromEntries(optimizationResults);
    let userInputsToString = "";

    // Convert each user input range to a string representation.
    userInputs.forEach((element, index) => {
        if (index === userInputs.length - 1) {
            userInputsToString += element.start + "→" + element.end;
        } else {
            userInputsToString += element.start + "→" + element.end + " ";
        }
    });

    const reportDataMessage = {
        strategyID: Date.now(),
        created: Date.now(),
        strategyName: strategyName,
        symbol: strategySymbol,
        timePeriod: strategyTimePeriod,
        parameters: userInputsToString,
        maxProfit: maxProfit,
        reportData: optimizationResultsObject,
    };
    const evt = new CustomEvent("ReportDataEvent", { detail: reportDataMessage });
    window.dispatchEvent(evt);
};

// Function to optimize parameters by simulating user interactions and observing mutations on the page
const optimizeParams = async (userInputs, tvParameterIndex, optimizationResults) => {
    // Check if optimization should be stopped ---jaime
    if (stopOptimizationFlag) {
        console.log("Optimization has been stopped by the user.");
        return; // Exit the optimization process
    }
    // Initialize report data object
    const reportData = {
        netProfit: {
            amount: 0,
            percent: "",
        },
        closedTrades: 0,
        percentProfitable: "",
        profitFactor: 0.0,
        maxDrawdown: {
            amount: 0,
            percent: "",
        },
        averageTrade: {
            amount: 0,
            percent: "",
        },
        avgerageBarsInTrades: 0,
    };
    // Simulate input and trigger backtesting
    trigger(tvInputs[tvParameterIndex]); // Simulate pressing Enter to trigger backtesting

    // Observe mutations to get new test results and save them in optimizationResults Map
    const p1 = new Promise((resolve, reject) => {
        // MutationObserver logic goes here
        // This includes observing changes, building report data, updating optimizationResults, and resolving the promise
        const observer = new MutationObserver((mutations) => {
            mutations.every((mutation) => {
                if (mutation.type === "characterData") {
                    if (mutation.oldValue != mutation.target.data) {
                        const params = getParametersFromWindow(userInputs);

                        if (!optimizationResults.has(params) && params != "ParameterOutOfRange") {
                            reportBuilder(reportData, mutation);
                            optimizationResults.set(params, reportData);

                            // Update backtest predicted end time
                            testedCount = optimizationResults.size;
                            predictTime = new Date(
                                ((new Date().getTime() - startTime.getTime()) / testedCount) *
                                    totalCount +
                                    startTime.getTime()
                            );

                            // 格式化时间
                            const month = predictTime.toLocaleString("en-US", {
                                month: "short",
                            });
                            const day = predictTime.getDate();
                            const hours = predictTime.toLocaleString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                                timeZoneName: "long",
                            });
                            const formattedTime = `${month} ${day}, ${hours}`;

                            // Dispatch an event with the latest formattedTime
                            dispatchCustomEvent({
                                formattedTime: formattedTime,
                                totalCount: totalCount,
                            });

                            // Update Max Profit
                            const replacedNDashProfit = reportData.netProfit.amount.replace("−", "-");
                            const profit = Number(replacedNDashProfit.replace(/[^0-9-\.]+/g, ""));
                            if (profit > maxProfit) {
                                maxProfit = profit;
                            }
                            resolve(
                                "Optimization param added to map: " +
                                    params +
                                    " Profit: " +
                                    optimizationResults.get(params).netProfit.amount
                            );
                        } else if (optimizationResults.has(params)) {
                            resolve("Optimization param already exist " + params);
                        } else {
                            resolve("Parameter is out of range, omitted");
                        }
                        observer.disconnect();
                        return false;
                    }
                }
                return true;
            });
        });

        const element = document.querySelector("div[class*=widgetContainer]");
        const options = {
            childList: true,
            subtree: true,
            characterData: true,
            characterDataOldValue: true,
            attributes: true,
            attributeOldValue: true,
        };
        if (element) {
            observer.observe(element, options);
        } else {
            reject("Observer element not found");
        }
    });

    const p2 = new Promise((resolve, reject) => {
        setTimeout(() => {
            reject("Timeout exceed");
        }, 10 * 1000);
    });

    await sleep(600);
    // Use Promise.race to set a 10-second timeout in case the Strategy Test Overview window fails to load
    await Promise.race([p1, p2])
        .then()
        .catch((reason) => console.log(`Rejected: ${reason}`));
};
