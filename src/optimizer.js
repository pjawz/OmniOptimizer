/**
 * @file optimizer.js
 * @description This file contains the main logic for the OmniOptimizerExtension, including the initialization of event listeners,
 *              execution of the optimization process, and core algorithm logic for optimizing parameters.
 *              It has been refactored to use an Optimizer class for better encapsulation and maintainability.
 * @module optimizer
 * @requires ./utils/listeners.js
 * @requires ./utils/utils.js
 * @requires ./algorithms/algorithm_manager.js
 */

console.log("Optimizer script successfully injected");

import init_listeners from "./utils/listeners.js";
import {
	sleep,
	checkForWarnings,
	changeTvInput,
	trigger,
	getParametersFromWindow,
	reportBuilder,
} from "./utils/utils.js";
import { runAlgorithm, evaluateOutcome } from "./algorithms/algorithm_manager.js";
import { showHaloOverlay, removeHaloOverlay } from "./utils/overlay.js";

// Encapsulate optimization functionality within the Optimizer class
class Optimizer {
	constructor() {
		this.stopOptimizationFlag = false;
		this.maxProfit = -99999;
		this.startTime = new Date();
		this.totalCount = 1;
		this.testedCount = 0;
		this.predictTime = 0;
		this.optimizationResults = new Map();
		this.tvInputs = document.querySelectorAll(
			"div[data-name='indicator-properties-dialog'] input[inputmode='numeric']"
		);
	}

	async run() {
		console.log("executeOptimizationProcess started");
		this.stopOptimizationFlag = false; // Reset flag

		// Show overlay at start of optimization
		showHaloOverlay();

		let userInputs = await this.waitForUserInputs();
		console.log("About to run algorithm with user inputs:", userInputs);
		this.startTime = new Date();
		// Run the algorithm with dependency injection
		await runAlgorithm(userInputs, this.optimizationResults, {
			change_tv_input: changeTvInput,
			sleep: sleep,
			optimizeParams: this.optimizeParams.bind(this),
			evaluateOutcome: evaluateOutcome,
			get_parameters_from_window: getParametersFromWindow,
			report_builder: reportBuilder,
		});
		console.log("Algorithm execution completed");

		this.dispatchReport(userInputs);
	}

	waitForUserInputs() {
		return new Promise((resolve) => {
			const userInputsEventCallback = (evt) => {
				console.log("UserInputsEvent received:", evt.detail);
				window.removeEventListener("UserInputsEvent", userInputsEventCallback, false);
				resolve(evt.detail);
			};
			window.addEventListener("UserInputsEvent", userInputsEventCallback, false);
			// Fallback resolution in case event is not dispatched
			setTimeout(() => {
				resolve([]);
			}, 500);
		});
	}

	dispatchReport(userInputs) {
		const strategyName = document.querySelector("div[class*=strategyGroup]")?.innerText || "";
		let strategyTimePeriod = "";
		const timePeriodGroup = document.querySelectorAll(
			"div[class*=innerWrap] div[class*=group]"
		);
		if (timePeriodGroup.length > 1) {
			const selectedPeriod = timePeriodGroup[1].querySelector("button[aria-checked*=true]");
			strategyTimePeriod = selectedPeriod
				? selectedPeriod.querySelector("div[class*=value]")?.innerHTML
				: timePeriodGroup[1].querySelector("div[class*=value]")?.innerHTML;
		}
		const title = document.querySelector("title")?.innerText || "";
		const strategySymbol = title.split(" ")[0] || "";
		const userInputsToString = userInputs
			.map((element, index) =>
				index === userInputs.length - 1
					? element.start + "→" + element.end
					: element.start + "→" + element.end + " "
			)
			.join("");
		const reportDataMessage = {
			strategyID: Date.now(),
			created: Date.now(),
			strategyName,
			symbol: strategySymbol,
			timePeriod: strategyTimePeriod,
			parameters: userInputsToString,
			maxProfit: this.maxProfit,
			reportData: Object.fromEntries(this.optimizationResults),
		};
		const evt = new CustomEvent("ReportDataEvent", { detail: reportDataMessage });
		window.dispatchEvent(evt);

		// Remove overlay after dispatching report
		removeHaloOverlay();
	}

	async optimizeParams(userInputs, tvParameterIndex, optimizationResults) {
		if (this.stopOptimizationFlag) {
			console.log("Optimization has been stopped by the user.");
			return;
		}
		const reportData = {
			netProfit: { amount: 0, percent: "" },
			closedTrades: 0,
			percentProfitable: "",
			profitFactor: 0.0,
			maxDrawdown: { amount: 0, percent: "" },
			averageTrade: { amount: 0, percent: "" },
			avgerageBarsInTrades: 0,
		};
		trigger(this.tvInputs[tvParameterIndex]);
		const p1 = new Promise((resolve, reject) => {
			const observer = new MutationObserver((mutations) => {
				mutations.every((mutation) => {
					if (mutation.type === "characterData") {
						if (mutation.oldValue !== mutation.target.data) {
							const params = getParametersFromWindow(userInputs);
							if (
								!optimizationResults.has(params) &&
								params !== "ParameterOutOfRange"
							) {
								reportBuilder(reportData, mutation);
								optimizationResults.set(params, reportData);
								this.testedCount = optimizationResults.size;
								this.predictTime = new Date(
									((new Date().getTime() - this.startTime.getTime()) /
										this.testedCount) *
										this.totalCount +
										this.startTime.getTime()
								);
								const month = this.predictTime.toLocaleString("en-US", {
									month: "short",
								});
								const day = this.predictTime.getDate();
								const hours = this.predictTime.toLocaleString("en-US", {
									hour: "2-digit",
									minute: "2-digit",
									hour12: true,
									timeZoneName: "long",
								});
								const formattedTime = `${month} ${day}, ${hours}`;
								dispatchCustomEvent({ formattedTime, totalCount: this.totalCount });
								const replacedNDashProfit = reportData.netProfit.amount.replace(
									"−",
									"-"
								);
								const profit = Number(
									replacedNDashProfit.replace(/[^0-9-\.]+/g, "")
								);
								if (profit > this.maxProfit) {
									this.maxProfit = profit;
								}
								resolve(
									`Optimization param added: ${params} Profit: ${
										optimizationResults.get(params).netProfit.amount
									}`
								);
							} else if (optimizationResults.has(params)) {
								resolve(`Optimization param already exists ${params}`);
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
				reject("Timeout exceeded");
			}, 10000);
		});
		await sleep(600);
		await Promise.race([p1, p2]).catch((reason) => console.log(`Rejected: ${reason}`));
	}
}

// Initialize listeners and run the optimizer
init_listeners();

const optimizerInstance = new Optimizer();
optimizerInstance.run();
