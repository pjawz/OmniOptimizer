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
// ...existing code if needed...
