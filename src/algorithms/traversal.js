/**
 * Iterates over a range of values for each user input and performs optimization.
 *
 * @async
 * @function iterateRanges
 * @param {Array<Object>} user_inputs - Array of user input objects containing start, end, and stepSize.
 * @param {Array<Object>} optimization_results - Array to store the results of the optimization.
 * @param {number} index - The current index of the user input being processed.
 * @param {Function} change_tv_input - Function to change the input value in the TV interface.
 * @param {Function} sleep - Function to pause execution for a specified duration.
 * @param {Function} OptimizeParams - Function to perform the optimization with the current parameters.
 * @returns {Promise<void>} - A promise that resolves when the iteration and optimization are complete.
 *
 * @throws {Error} If an error occurs during the optimization process.
 *
 * @example
 * const user_inputs = [
 *   { start: 0, end: 10, stepSize: 1 },
 *   { start: 0, end: 5, stepSize: 0.5 }
 * ];
 * const optimization_results = [];
 * await iterateRanges(user_inputs, optimization_results, user_inputs.length - 1, change_tv_input, sleep, OptimizeParams);
 */
export async function iterateRanges(
	user_inputs,
	optimization_results,
	index,
	change_tv_input,
	sleep,
	OptimizeParams
) {
	if (window.stop_optimization_flag) {
		console.log("Optimization stopped by user.");
		return;
	}
	const user_input = user_inputs[index];
	const start = Number(user_input.start);
	const end = Number(user_input.end);
	const step = Number(user_input.stepSize);
	const decimal_part = String(step).split(".")[1];
	const decimal_places = decimal_part ? decimal_part.length : 0;
	if (index === 0) {
		for (let i = start; i <= end; i += step ? step : 0.1) {
			const rounded_value = Number(i.toFixed(decimal_places));
			user_inputs[index].currentValue = rounded_value;
			if (step === 0) {
				setTimeout(() => {
					window.tvInputs[0].dispatchEvent(
						new MouseEvent("mouseover", { bubbles: true })
					);
					document.querySelectorAll("button[class*=controlIncrease]")[0].click();
				}, 100);
				await OptimizeParams(user_inputs, 0, optimization_results);
			}
			const value = step ? i.toFixed(decimal_places) : i;
			await change_tv_input(window.tvInputs[0], value);
			await OptimizeParams(user_inputs, 0, optimization_results);
		}
		return;
	}
	for (let i = start; i <= end; i += step ? step : 0.1) {
		const value = step ? i.toFixed(decimal_places) : i;
		await change_tv_input(window.tvInputs[index], value);
		await iterateRanges(
			user_inputs,
			optimization_results,
			index - 1,
			change_tv_input,
			sleep,
			OptimizeParams
		);
	}
}
