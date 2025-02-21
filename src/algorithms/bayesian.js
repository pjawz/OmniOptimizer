export class BayesianOptimizer {
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
	randomCandidate() {
		return this.param_info.map((info) => {
			let value = info.start + Math.random() * (info.end - info.start);
			return Number(value.toFixed(info.decimal_places));
		});
	}
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
	gaussianPDF(x) {
		return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
	}
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
	getBestParameters() {
		return { parameters: this.best_params, fitness: this.best_fitness };
	}
}
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
// ...existing code if needed...
