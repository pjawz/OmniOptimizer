console.log("Bayesian algorithm module loaded");

/**
 * Class representing a Bayesian Optimizer.
 * This optimizer uses surrogate modeling with a Gaussian kernel
 * to estimate the fitness landscape and balance exploration and exploitation.
 */
export class BayesianOptimizer {
	/**
	 * Creates a BayesianOptimizer instance.
	 * @param {Array<Object>} user_inputs - An array of parameter objects with at least 'start' and 'end'. Optionally, a step size key can be provided.
	 * @param {Object} [config={}] - Optional configuration parameters.
	 * @param {number} [config.kernel_bandwidth=0.2] - Bandwidth used for the Gaussian kernel.
	 * @param {number} [config.xi=0.01] - Exploration factor added to the improvement.
	 * @param {number} [config.ei_threshold=1e-6] - Threshold for expected improvement below which perturbation is triggered.
	 * @param {boolean} [config.verbose=false] - Flag to enable verbose logging for debugging.
	 * @throws Will throw an error if user_inputs is not a non-empty array or contains invalid number parameters.
	 */
	constructor(user_inputs, config = {}) {
		if (!Array.isArray(user_inputs) || user_inputs.length === 0) {
			throw new Error("user_inputs must be a non-empty array");
		}
		this.user_inputs = user_inputs;
		this.param_info = user_inputs.map((input) => {
			const start = Number(input.start);
			const end = Number(input.end);
			const step = Number(input.step_size || input.stepSize);
			if (isNaN(start) || isNaN(end) || isNaN(step)) {
				throw new Error("All user input parameters must be valid numbers");
			}
			const range = end - start;
			const decimal_places = (step.toString().split(".")[1] || "").length;
			return { start, end, range, step, decimal_places };
		});
		this.samples = [];
		this.fitness_values = [];
		this.best_params = null;
		this.best_fitness = -Infinity;
		this.kernel_bandwidth = config.kernel_bandwidth || 0.2;
		this.xi = config.xi || 0.01;
		this.ei_threshold = config.ei_threshold || 1e-6;
		this.verbose = config.verbose || false;
	}

	/**
	 * Generates a random candidate parameter set within the input ranges.
	 * @return {Array<number>} An array representing the candidate parameters.
	 */
	randomCandidate() {
		return this.param_info.map((info) => {
			let value = info.start + Math.random() * (info.end - info.start);
			return Number(value.toFixed(info.decimal_places));
		});
	}

	/**
	 * Perturbs a candidate parameter set by a small random amount.
	 * Keeps the perturbed values within the defined bounds.
	 * @param {Array<number>} candidate - The candidate parameter set.
	 * @return {Array<number>} The perturbed candidate parameters.
	 */
	perturbCandidate(candidate) {
		return candidate.map((value, i) => {
			let info = this.param_info[i];
			let range = info.range;
			let perturbation = (Math.random() - 0.5) * 0.1 * range;
			let new_value = value + perturbation;
			new_value = Math.min(info.end, Math.max(info.start, new_value));
			return Number(new_value.toFixed(info.decimal_places));
		});
	}

	/**
	 * Computes the probability density function of a standard Gaussian.
	 * @param {number} x - The value at which to evaluate the PDF.
	 * @return {number} The computed probability density.
	 */
	gaussianPDF(x) {
		return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
	}

	/**
	 * Approximates the cumulative distribution function of a standard Gaussian.
	 * Uses a numerical approximation (Abramowitz and Stegun formula).
	 * @param {number} x - The value at which to evaluate the CDF.
	 * @return {number} The computed cumulative probability.
	 */
	gaussianCDF(x) {
		const a1 = 0.254829592,
			a2 = -0.284496736,
			a3 = 1.421413741,
			a4 = -1.453152027,
			a5 = 1.061405429,
			p = 0.3275911;
		const sign = x < 0 ? -1 : 1;
		x = Math.abs(x) / Math.sqrt(2.0);
		const t = 1.0 / (1.0 + p * x);
		const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
		return 0.5 * (1.0 + sign * y);
	}

	/**
	 * Estimates the surrogate model's mean and uncertainty (sigma) at a given point.
	 * Uses a kernel-weighted average of observed fitness values.
	 * @param {Array<number>} x - The candidate parameter set.
	 * @return {Object} An object with properties {@code mu} and {@code sigma}.
	 */
	getSurrogateEstimate(x) {
		if (this.samples.length === 0) {
			return { mu: 0, sigma: 1 };
		}
		let weighted_sum = 0,
			weight_total = 0,
			weighted_squared_sum = 0;
		for (let j = 0; j < this.samples.length; j++) {
			let sample = this.samples[j];
			let fitness = this.fitness_values[j];
			let distance_squared = 0;
			for (let i = 0; i < x.length; i++) {
				let info = this.param_info[i];
				let diff = (x[i] - sample[i]) / (info.range || 1);
				distance_squared += diff * diff;
			}
			const weight = Math.exp(
				-distance_squared / (2 * this.kernel_bandwidth * this.kernel_bandwidth)
			);
			weighted_sum += weight * fitness;
			weighted_squared_sum += weight * fitness * fitness;
			weight_total += weight;
		}
		const mu = weighted_sum / weight_total;
		const variance = weighted_squared_sum / weight_total - mu * mu;
		const sigma = Math.sqrt(Math.max(variance, 1e-6));
		return { mu, sigma };
	}

	/**
	 * Computes the acquisition function value for a candidate parameter set.
	 * The acquisition function balances exploration and exploitation using Expected Improvement (EI).
	 * @param {Array<number>} x - The candidate parameter set.
	 * @return {Object} An object containing the surrogate mean ({@code mu}), standard deviation ({@code sigma}), and Expected Improvement ({@code EI}).
	 */
	computeAcquisition(x) {
		const { mu, sigma } = this.getSurrogateEstimate(x);
		const improvement = mu - this.best_fitness - this.xi;
		const Z = sigma > 0 ? improvement / sigma : 0;
		const EI = sigma > 0 ? improvement * this.gaussianCDF(Z) + sigma * this.gaussianPDF(Z) : 0;
		if (this.verbose) {
			console.log(`Acquisition at ${x}: EI=${EI}, mu=${mu}, sigma=${sigma}`);
		}
		return { mu, sigma, EI };
	}

	/**
	 * Determines the next candidate parameters to evaluate.
	 * Uses a mixture of random sampling and acquisition function maximization.
	 * @return {Array<number>} The next candidate parameter set.
	 */
	getNextParameters() {
		if (this.samples.length === 0) {
			return this.randomCandidate();
		}
		if (Math.random() < 0.1) {
			if (this.verbose) console.log("Exploration: Random candidate chosen.");
			return this.randomCandidate();
		}
		let best_candidate = null;
		let best_EI = -Infinity;
		const num_candidates = 50;
		for (let i = 0; i < num_candidates; i++) {
			const candidate = this.randomCandidate();
			const { EI } = this.computeAcquisition(candidate);
			if (EI > best_EI) {
				best_EI = EI;
				best_candidate = candidate;
			}
		}
		if (this.verbose) {
			console.log(`Best EI among candidates: ${best_EI}`);
		}
		if (best_EI < this.ei_threshold && this.best_params) {
			if (this.verbose) {
				console.log(
					`EI below threshold (${this.ei_threshold}). Perturbing best candidate.`
				);
			}
			best_candidate = this.perturbCandidate(this.best_params);
		}
		return best_candidate || this.randomCandidate();
	}

	/**
	 * Updates the optimizer's history with a new candidate's fitness.
	 * Also updates the best observed parameters if an improvement is found.
	 * @param {Array<number>} params - The candidate parameter set.
	 * @param {number} fitness - The fitness value corresponding to the candidate.
	 */
	update(params, fitness) {
		this.samples.push(params.slice());
		this.fitness_values.push(fitness);
		if (this.verbose) {
			console.log(`Update: params=${params}, fitness=${fitness}`);
		}
		if (fitness > this.best_fitness) {
			this.best_fitness = fitness;
			this.best_params = params.slice();
			if (this.verbose) {
				console.log(
					`New best found: ${this.best_params} with fitness ${this.best_fitness}`
				);
			}
		}
	}

	/**
	 * Retrieves the best observed parameters and corresponding fitness.
	 * @return {Object} An object with properties {@code parameters} and {@code fitness}.
	 */
	getBestParameters() {
		return { parameters: this.best_params, fitness: this.best_fitness };
	}
}

/**
 * Conducts Bayesian optimization for a given number of iterations.
 * Iteratively updates the surrogate model and selects new candidate parameters.
 *
 * @async
 * @param {Array<Object>} user_inputs - Array of input parameter objects.
 * @param {number} max_iterations - Maximum number of iterations for the optimization loop.
 * @param {Map} optimization_results - Map to store the evaluated parameter sets and their fitness values.
 * @param {Function} fitness_function - Async function that evaluates the candidate parameters.
 *        The function should return a numeric fitness value.
 * @return {Object} The best parameters and fitness obtained after optimization.
 */
export async function iterateBayesian(
	user_inputs,
	max_iterations,
	optimization_results,
	fitness_function
) {
	const optimizer = new BayesianOptimizer(user_inputs);
	for (let i = 0; i < max_iterations; i++) {
		if (window.stop_optimization_flag) {
			console.log("Optimization stopped by user.");
			break;
		}
		const next_params = optimizer.getNextParameters();
		const fitness = await fitness_function(next_params, user_inputs, optimization_results);
		optimizer.update(next_params, fitness);
		optimization_results.set(next_params.toString(), fitness);
	}
	return optimizer.getBestParameters();
}

export function runBayesianAlgorithm(params) {
	console.log("runBayesianAlgorithm initiated with params:", params);
	// ...existing bayesian algorithm logic...
	console.log("runBayesianAlgorithm completed");
	return {};
}
