const initializeListeners = () => {
	// Listener: SelectedAlgorithmEvent updates window.selected_algorithm
	window.addEventListener("SelectedAlgorithmEvent", (e) => {
		window.selected_algorithm = e.detail.algorithm;
	});
	// Listener: UserInputsEvent updates window.user_inputs
	window.addEventListener("UserInputsEvent", (e) => {
		window.user_inputs = e.detail;
	});
	// Listener: StopOptimizationStatus updates window.stop_optimization_flag
	window.addEventListener("StopOptimizationStatus", (e) => {
		window.stop_optimization_flag = e.detail;
	});
};

export default initializeListeners;
