import { iterateRanges } from "./traversal.js";
import { iterateGenetic } from "./genetic.js";
import { iterateBayesian } from "./bayesian.js";

// Top-level manager: chooses which algorithm to run.
export async function runAlgorithm(user_inputs, optimization_results, deps) {
	console.log("runAlgorithm started with inputs:", user_inputs);
	// Calculate total backtest count.
	let total_count = 1;
	user_inputs.forEach((element) => {
		let count = (element.end - element.start) / element.stepSize;
		count = count ? Math.round(count * 100) / 100 + 1 : 1;
		total_count *= count;
	});
	const selected_algorithm = window.selectedAlgorithm;
	if (selected_algorithm === "traversal") {
		await iterateRanges(
			user_inputs,
			optimization_results,
			user_inputs.length - 1,
			deps.change_tv_input,
			deps.sleep,
			deps.optimizeParams
		);
	} else if (selected_algorithm === "genetic") {
		function calculateDynamicPopulationSize(total_count) {
			let adjusted = Math.ceil(total_count / 4);
			return Math.min(adjusted, 1000);
		}
		const population_size = calculateDynamicPopulationSize(total_count);
		function calculateDynamicMaxIterations(total_count, population_size) {
			let iterations = Math.ceil((total_count / population_size) * 0.6);
			return Math.max(iterations, 10);
		}
		const max_iterations = calculateDynamicMaxIterations(total_count, population_size);
		const mutation_probability = 0.1;
		await iterateGenetic(
			population_size,
			user_inputs,
			max_iterations,
			mutation_probability,
			optimization_results,
			(params, inputs, results) => evaluateOutcome(params, inputs, results, deps)
		);
	} else if (selected_algorithm === "bayesian") {
		const max_iterations = 50;
		await iterateBayesian(
			user_inputs,
			max_iterations,
			optimization_results,
			(params, inputs, results) => evaluateOutcome(params, inputs, results, deps)
		);
	}
	console.log("runAlgorithm completed with results:", optimization_results);
}

// Global objective function with dependency injection for utility functions.
// Expect dependencies: { change_tv_input, sleep, get_parameters_from_window, report_builder, OptimizeParams }
export async function evaluateOutcome(parameters, user_inputs, optimization_results, deps) {
	console.log("evaluateOutcome invoked with outcome:", parameters);
	const report_data = {
		net_profit: { amount: 0, percent: "" },
		closed_trades: 0,
		percent_profitable: "",
		profit_factor: 0.0,
		max_drawdown: { amount: 0, percent: "" },
		average_trade: { amount: 0, percent: "" },
		avgerage_bars_in_trades: 0,
	};
	let key = "";
	for (let i = 0; i < user_inputs.length; i++) {
		key += i === user_inputs.length - 1 ? parameters[i] : parameters[i] + ", ";
	}
	if (optimization_results.has(key)) {
		parameters[parameters.length - 1] = optimization_results.get(key).profit;
		return true;
	}
	if (user_inputs[0].stepSize === "0") {
		setTimeout(() => {
			window.tvInputs[0].dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
			document.querySelectorAll("button[class*=controlIncrease]")[0].click();
		}, 100);
		await deps.OptimizeParams(user_inputs, 0, optimization_results);
	}
	for (let i = 0; i < parameters.length - 1; i++) {
		await deps.change_tv_input(window.tvInputs[i], parameters[i]);
	}
	const p1 = new Promise((resolve, reject) => {
		let observer = new MutationObserver(function (mutations) {
			mutations.every(function (mutation) {
				if (
					mutation.type === "characterData" &&
					mutation.oldValue !== mutation.target.data
				) {
					const params = deps.get_parameters_from_window(user_inputs);
					if (params !== "ParameterOutOfRange") {
						deps.report_builder(report_data, mutation);
						const replaced = report_data.net_profit.amount.replace("−", "-");
						const profit = Number(replaced.replace(/[^0-9-\.]+/g, ""));
						report_data.profit = profit;
						optimization_results.set(params, report_data);
						parameters[parameters.length - 1] = profit;
						resolve("");
					} else {
						resolve("Parameter is out of range, omitted");
					}
					observer.disconnect();
					return false;
				}
				return true;
			});
		});
		const element = document.querySelector("div[class*=widgetContainer]");
		let options = {
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
			reject("Timeout exceed" + key);
		}, 5000);
	});
	await deps.sleep(300);
	await Promise.race([p1, p2]).catch((reason) => console.log(`Rejected: ${reason}`));
	console.log("evaluateOutcome finished processing");
}
