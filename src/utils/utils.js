/**
 * Sleeps for the specified number of milliseconds.
 * @param {number} ms - The number of milliseconds to sleep.
 * @returns {Promise<void>} A promise that resolves after the specified time.
 */
export const sleep = (ms) => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Checks the document for warning messages.
 * @returns {boolean} True if warning messages exist; otherwise false.
 */
export const checkForWarnings = () => {
	// Check for any warning messages on the page
	const warning_messages = document.querySelectorAll(".warning-message");
	return warning_messages.length > 0;
};

/**
 * Changes the TradingView input value if needed and triggers an update.
 * @param {HTMLInputElement} input - The input element to change.
 * @param {string|number} value - The new value to set on the input.
 * @returns {Promise<void>} A promise that resolves after triggering the change.
 */
export const changeTvInput = async (input, value) => {
	const previous_value = input.value;
	if (previous_value !== value.toString()) {
		const event = new Event("input", { bubbles: true });
		input.value = value;
		input._valueTracker.setValue(previous_value);
		input.dispatchEvent(event);
		trigger(input);
		await sleep(100);
	}
};

/**
 * Triggers a keyboard event on the given input after a short delay.
 * @param {HTMLInputElement} input - The input element on which to dispatch the event.
 */
export const trigger = (input) => {
	setTimeout(() => {
		input.dispatchEvent(
			new KeyboardEvent("keydown", {
				keyCode: 13,
				cancelable: true,
				bubbles: true,
			})
		);
	}, 600);
};

/**
 * Retrieves parameters from window.tvInputs and validates them against user inputs.
 * @param {Array<Object>} user_inputs - Array of user input configuration objects with 'start' and 'end'.
 * @returns {string} A comma-separated string of parameters or "ParameterOutOfRange" if invalid.
 */
export const getParametersFromWindow = (user_inputs) => {
	// Assumes tvInputs is defined in the global scope as in script.js
	let parameters = "";
	for (let i = 0; i < user_inputs.length; i++) {
		if (
			user_inputs[i].start > parseFloat(window.tvInputs[i].value) ||
			parseFloat(window.tvInputs[i].value) > user_inputs[i].end
		) {
			parameters = "ParameterOutOfRange";
			break;
		}
		parameters +=
			i === user_inputs.length - 1
				? window.tvInputs[i].value
				: window.tvInputs[i].value + ", ";
	}
	return parameters;
};

/**
 * Builds the report data by extracting values from DOM mutation.
 * @param {Object} report_data - The report data object to be populated.
 * @param {MutationRecord} mutation - The mutation record triggering the report build.
 */
export const reportBuilder = (report_data, mutation) => {
	// Using snake_case for fields
	const report_data_selector =
		mutation.target.ownerDocument.querySelectorAll("[class^='secondRow']");
	report_data.net_profit = {
		amount: report_data_selector[0].querySelectorAll("div")[0].innerText,
		percent: report_data_selector[0].querySelectorAll("div")[1].innerText,
	};
	report_data.closed_trades = report_data_selector[1].querySelector("div").innerText;
	report_data.percent_profitable = report_data_selector[2].querySelector("div").innerText;
	report_data.profit_factor = report_data_selector[3].querySelector("div").innerText;
	report_data.max_drawdown = {
		amount: report_data_selector[4].querySelectorAll("div")[0].innerText,
		percent: report_data_selector[4].querySelectorAll("div")[1].innerText,
	};
	report_data.average_trade = {
		amount: report_data_selector[5].querySelectorAll("div")[0].innerText,
		percent: report_data_selector[5].querySelectorAll("div")[1].innerText,
	};
	report_data.avgerage_bars_in_trades = report_data_selector[6].querySelector("div").innerText;
};
