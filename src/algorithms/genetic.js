/**
 * @file genetic.js
 * @description This file contains the implementation of a genetic algorithm for optimizing parameters.
 * The algorithm initializes a population, selects the best individuals, performs crossover and mutation,
 * and iterates through generations to find the optimal solution.
 *
 * @module genetic
 */

console.log("Genetic algorithm module loaded");

/**
 * Iterates through generations using a genetic algorithm to optimize parameters.
 * @param {number} population_size - The size of the population.
 * @param {Array<Object>} user_inputs - An array of parameter objects with 'start', 'end', and 'stepSize'.
 * @param {number} max_iterations - The maximum number of iterations (generations).
 * @param {number} mutation_probability - The probability of mutation occurring in an individual.
 * @param {Array<Object>} optimization_results - The array to store optimization results.
 * @param {Function} fitness_function - The function to evaluate the fitness of an individual.
 * @returns {Promise<Array<number>>} The best individual found after the iterations.
 */
export async function iterateGenetic(
	population_size,
	user_inputs,
	max_iterations,
	mutation_probability,
	optimization_results,
	fitness_function
) {
	console.log("iterateGenetic called with params:", {
		population_size,
		user_inputs,
		max_iterations,
		mutation_probability,
		optimization_results,
		fitness_function,
	});
	/**
	 * Initializes the population with random individuals.
	 * @param {number} population_size - The size of the population.
	 * @param {Array<Object>} user_inputs - An array of parameter objects.
	 * @returns {Array<Array<number>>} The initialized population.
	 */
	function initializePopulation(population_size, user_inputs) {
		const population = [];
		for (let i = 0; i < population_size; i++) {
			const individual = [];
			user_inputs.forEach((element) => {
				const start = Number(element.start);
				const end = Number(element.end);
				const step = Number(element.stepSize);
				const decimal_part = String(step).split(".")[1];
				const decimal_places = decimal_part ? decimal_part.length : 0;
				individual.push(
					Number((start + Math.random() * (end - start)).toFixed(decimal_places))
				);
			});
			individual.push(0); // profit value
			population.push(individual);
		}
		return population;
	}

	/**
	 * Selects the best individuals from the population based on their fitness.
	 * @param {Array<Array<number>>} population - The current population.
	 * @param {number} population_size - The size of the population.
	 */
	async function selection(population, population_size) {
		const item_length = population[0].length;
		for (const element of population) {
			if (window.stop_optimization_flag) {
				return;
			}
			await fitness_function(element, user_inputs, optimization_results);
		}
		population.sort((a, b) => b[item_length - 1] - a[item_length - 1]);
		population.splice(population_size, population.length);
	}

	/**
	 * Performs crossover between two parent individuals to produce a child.
	 * @param {Array<number>} parent1 - The first parent individual.
	 * @param {Array<number>} parent2 - The second parent individual.
	 * @returns {Array<number>} The child individual.
	 */
	function crossover(parent1, parent2) {
		const child = [];
		const item_length = parent1.length;
		for (let i = 0; i < item_length - 1; i++) {
			const decimal_part = String(parent1[i]).split(".")[1];
			const decimal_places = decimal_part ? decimal_part.length : 0;
			child.push(Number(((parent1[i] + parent2[i]) / 2).toFixed(decimal_places)));
		}
		child.push(0);
		return child;
	}

	/**
	 * Mutates an individual by randomly changing its parameters.
	 * @param {Array<number>} individual - The individual to mutate.
	 * @param {Array<Object>} user_inputs - An array of parameter objects.
	 */
	function mutation(individual, user_inputs) {
		for (let i = 0; i < individual.length - 1; i++) {
			const element = user_inputs[i];
			const start = Number(element.start);
			const end = Number(element.end);
			const step = Number(element.stepSize);
			const decimal_part = String(step).split(".")[1];
			const decimal_places = decimal_part ? decimal_part.length : 0;
			individual[i] = Number((start + Math.random() * (end - start)).toFixed(decimal_places));
		}
	}

	let best_individual;
	let population = initializePopulation(population_size, user_inputs);
	for (let i = 0; i < max_iterations; i++) {
		console.log(i, "population========", population);
		await selection(population, population_size);
		if (window.stop_optimization_flag) {
			console.log("Optimization stopped by user.");
			return;
		}
		const current_best = population[0];
		if (
			!best_individual ||
			current_best[current_best.length - 1] > best_individual[best_individual.length - 1]
		) {
			best_individual = current_best;
			window.maxProfit = best_individual[best_individual.length - 1];
		}
		for (let j = 0; j < population_size; j++) {
			const parent1 = population[Math.floor(Math.random() * population_size)];
			const parent2 = population[Math.floor(Math.random() * population_size)];
			const child = crossover(parent1, parent2);
			if (Math.random() < mutation_probability) {
				mutation(child, user_inputs);
			}
			population.push(child);
		}
	}
	console.log("iterateGenetic completed");
	return best_individual;
}
