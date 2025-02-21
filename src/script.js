// /**
//  * @file script.js
//  * @description This script is injected by injector.js and is used to directly interact with the web page’s JS environment. 
//  * It cannot directly use chrome.storage.local.get because it runs in the page environment and lacks direct access to extension APIs. 
//  * To use these APIs, use the background script with chrome.runtime.sendMessage.
//  * 
//  * @version 20240311
//  * 
//  * @global
//  * @type {string|null} selectedAlgorithm - Variable to store the received algorithm.
//  * @type {boolean} stopOptimizationFlag - Flag to stop the optimization process.
//  * @type {NodeList} tvInputs - All numeric input fields in the DOM, typically representing strategy parameters.
//  * @type {number} maxProfit - Maximum profit value initialized with a very low value.
//  * @type {Date} startTime - Start timestamp.
//  * @type {number} totalCount - Total backtest count.
//  * @type {number} testedCount - Count of completed backtests.
//  * @type {number} predictTime - Predicted backtest end time (in seconds).
//  * 
//  * @event window#SelectedAlgorithmEvent - Listener to receive the selectedAlgorithm value from injector.js and store it in selectedAlgorithm variable.
//  * @event window#UserInputsEvent - Listener to receive user inputs for optimization.
//  * @event window#StopOptimizationStatus - Listener to update the stopOptimizationFlag based on user input.
//  * @event window#ReportDataEvent - Dispatches a custom event with optimization report data.
//  * 
//  * @function dispatchCustomEvent - Dispatches a custom event with given data.
//  * @function checkForWarnings - Checks for any warning messages on the page.
//  * @function Process - Main function to start the optimization process.
//  * @function iterateRanges - Function to iterate over the ranges of user inputs and optimize parameters using traversal algorithm.
//  * @function iterateGenetic - Function to optimize parameters using genetic algorithm.
//  * @function iterateBayesian - Function to optimize parameters using Bayesian optimization algorithm.
//  * @function OptimizeParams - Function to optimize parameters by simulating user interactions and observing mutations on the page.
//  * @function ChangeTvInput - Function to change the value of a TradingView input element.
//  * @function Trigger - Function to simulate pressing Enter to trigger backtesting.
//  * @function GetParametersFromWindow - Function to get and format the current active parameters from the TradingView strategy options window.
//  * @function ReportBuilder - Function to build report data from performance overview.
//  * @function sleep - Utility function to sleep for a specified number of milliseconds.
//  * @function fitnessFunction - Global fitness function for both Genetic and Bayesian optimization.
//  * 
//  * @class BayesianOptimizer - Class implementing a lightweight Bayesian optimization routine using a surrogate model based on Gaussian kernel regression.
//  * @method randomCandidate - Generates a random candidate uniformly within the allowed parameter ranges.
//  * @method perturbCandidate - Perturbs an existing candidate by up to ±5% of its range and clamps to valid bounds.
//  * @method gaussianPDF - Gaussian Probability Density Function.
//  * @method gaussianCDF - Gaussian Cumulative Distribution Function using an approximation.
//  * @method getSurrogateEstimate - Computes the surrogate model's estimate (mean and variance) at candidate x using Gaussian kernel regression.
//  * @method computeAcquisition - Computes the Expected Improvement (EI) at candidate x.
//  * @method getNextParameters - Proposes the next candidate parameters to evaluate.
//  * @method update - Updates the optimizer with a new observation.
//  * @method getBestParameters - Returns the best candidate parameters and their fitness.
//  */
// // script.js (injected by injector.js) is used to directly interact with the web page’s JS environment.
// // script.js cannot directly use chrome.storage.local.get because it runs in the page environment and lacks direct access to extension APIs.
// // To use these APIs, use the background script with chrome.runtime.sendMessage.

// //========================================================================================================20240311
// // Define a variable to store the received algorithm
// var selectedAlgorithm = null;

// // Listener to receive the selectedAlgorithm value from injector.js and store it in selectedAlgorithm variable
// window.addEventListener("SelectedAlgorithmEvent", function (e) {
//   selectedAlgorithm = e.detail.algorithm;
// });

// //========================================================================================================20240311
// var stopOptimizationFlag = false;

// // Function to dispatch a custom event with given data
// function dispatchCustomEvent(data) {
//   var event = new CustomEvent("CustomEventForExtension", { detail: data });
//   window.dispatchEvent(event);
// }

// // Select all numeric input fields in the DOM, typically representing strategy parameters
// var tvInputs = document.querySelectorAll(
//   "div[data-name='indicator-properties-dialog'] input[inputmode='numeric']"
// );
// // Initialize maxProfit with a very low value to compare with subsequent profit values
// var maxProfit = -99999;

// var startTime = new Date(); // Start timestamp
// var totalCount = 1; // Total backtest count
// var testedCount = 0; // Count of completed backtests
// var predictTime = 0; // Predicted backtest end time (in seconds)

// // Function to check for warnings
// function checkForWarnings() {
//   // Check for any warning messages on the page
//   var warningMessages = document.querySelectorAll(".warning-message");
//   if (warningMessages.length > 0) {
//     return true;
//   }
//   return false;
// }
// // Run Optimization Process
// Process();
// // Main function to start the optimization process
// async function Process() {
//   stopOptimizationFlag = false; // Reset to false
//   var userInputs = [];

//   // Callback to build userInputs
//   var userInputsEventCallback = function (evt) {
//     window.removeEventListener(
//       "UserInputsEvent",
//       userInputsEventCallback,
//       false
//     );
//     userInputs = evt.detail;
//   };

//   window.addEventListener("UserInputsEvent", userInputsEventCallback, false);

//   // Wait for the UserInputsEvent callback
//   await sleep(500);

//   // Store optimization results: A Map object (named optimizationResults) is used to store backtesting results for each configuration.
//   var optimizationResults = new Map();

//   // Calculate total backtest count using userInputs ranges.
//   userInputs.forEach((element) => {
//     var count = (element.end - element.start) / element.stepSize;
//     count = count ? Math.round(count * 100) / 100 + 1 : 1;
//     totalCount = totalCount * count;
//   });

//   startTime = new Date();
//   // Process parameters
//   if (selectedAlgorithm === "traversal") {
//     await iterateRanges(userInputs, optimizationResults, userInputs.length - 1);
//   } else if (selectedAlgorithm === "genetic") {
//     // Genetic algorithm
//     // Dynamically calculate populationSize and maxIterations based on totalCount

//     function calculateDynamicPopulationSize(totalCount) {
//       let adjustedSize = Math.ceil(totalCount / 4); // Increase population size for every 4 units of range
//       return Math.min(adjustedSize, 1000); // Cap at 1000
//     }

//     const populationSize = calculateDynamicPopulationSize(totalCount);
//     function calculateDynamicMaxIterations(totalCount, populationSize) {
//       let iterations = Math.ceil((totalCount / populationSize) * 0.6);
//       return Math.max(iterations, 10);
//     }

//     const maxIterations = calculateDynamicMaxIterations(
//       totalCount,
//       populationSize
//     );
//     const mutationProbability = 0.1;
//     const bestParameters = await iterateGenetic(
//       populationSize,
//       userInputs,
//       maxIterations,
//       mutationProbability,
//       optimizationResults
//     );
//   }
//   //================================Below is the Bayesian Optimization Algorithm=======================================
//     else if (selectedAlgorithm === "bayesian") {
//       const maxIterations = 50; // Maximum iterations
//       const bayesianOptimizationResults = await iterateBayesian(
//         userInputs,
//         maxIterations,
//         optimizationResults
//       );
//       console.log("Bayesian Optimization Results:", bayesianOptimizationResults);
//     }
//   //================================Above is the Bayesian Optimization Algorithm=======================================

//   // Build a report message with parameters and profit info
//   var strategyName = document.querySelector(
//     "div[class*=strategyGroup]"
//   )?.innerText;
//   var strategyTimePeriod = "";

//   var timePeriodGroup = document.querySelectorAll(
//     "div[class*=innerWrap] div[class*=group]"
//   );
//   if (timePeriodGroup.length > 1) {
//     selectedPeriod = timePeriodGroup[1].querySelector(
//       "button[aria-checked*=true]"
//     );
//     if (selectedPeriod != null) {
//       strategyTimePeriod =
//         selectedPeriod.querySelector("div[class*=value]")?.innerHTML;
//     } else {
//       strategyTimePeriod =
//         timePeriodGroup[1].querySelector("div[class*=value]")?.innerHTML;
//     }
//   }

//   var title = document.querySelector("title")?.innerText;
//   var strategySymbol = title.split(" ")[0];
//   var optimizationResultsObject = Object.fromEntries(optimizationResults);
//   var userInputsToString = "";

//   // Convert each user input range to a string representation.
//   userInputs.forEach((element, index) => {
//     if (index == userInputs.length - 1) {
//       userInputsToString += element.start + "→" + element.end;
//     } else {
//       userInputsToString += element.start + "→" + element.end + " ";
//     }
//   });

//   var reportDataMessage = {
//     strategyID: Date.now(),
//     created: Date.now(),
//     strategyName: strategyName,
//     symbol: strategySymbol,
//     timePeriod: strategyTimePeriod,
//     parameters: userInputsToString,
//     maxProfit: maxProfit,
//     reportData: optimizationResultsObject,
//   };
//   var evt = new CustomEvent("ReportDataEvent", { detail: reportDataMessage });
//   window.dispatchEvent(evt);
// }

// /***************************************
//  *         Algorithm Section Begins    *
//  *  The following code contains core   *
//  *  algorithm logic.                    *
//  ***************************************/

// // Event listener to update the stopOptimizationFlag based on user input
// window.addEventListener("StopOptimizationStatus", function (e) {
//   stopOptimizationFlag = e.detail;
// });
// // Function to iterate over the ranges of user inputs and optimize parameters
// //===================================================================================================
// // Traversal Algorithm
// //===================================================================================================
// async function iterateRanges(userInputs, optimizationResults, index) {
//   if (stopOptimizationFlag) {
//     console.log("Optimization stopped by user.");
//     return;
//   }
//   // Recursive function to iterate over the given range array and perform optimization
//   const userInput = userInputs[index];
//   const start = Number(userInput["start"]);
//   const end = Number(userInput["end"]);
//   const step = Number(userInput["stepSize"]);

//   const decimalPart = String(step).split(".")[1];
//   const decimalPlaces = decimalPart ? decimalPart.length : 0;
//   // Base loop: When the code reaches the innermost level (i.e., no more parameters to adjust), it tries each possible value of the current parameter.
//   // Efficiency and clarity: This separate handling makes the code clearer and more efficient.
//   // It reduces unnecessary checks (e.g., no need to recurse at the innermost level) and ensures that only necessary operations are performed at each level.
//   if (index === 0) {
//     // If already at the innermost loop, perform optimization operations
//     for (let i = start; i <= end; i += step ? step : 0.1) {
//       //=========================Floating point bug fix by JaimeLee 20240316
//       const roundedValue = Number(i.toFixed(decimalPlaces));
//       userInputs[index].currentValue = roundedValue;
//       //=========================Floating point bug fix by JaimeLee 20240316

//       if (step == 0) {
//         // Simulate clicking the increase value arrow to trigger backtesting when the last parameter is skipped
//         setTimeout(() => {
//           tvInputs[0].dispatchEvent(
//             new MouseEvent("mouseover", { bubbles: true })
//           );
//           document
//             .querySelectorAll("button[class*=controlIncrease]")[0]
//             .click();
//         }, 100);
//         await OptimizeParams(userInputs, 0, optimizationResults);
//       }

//       const value = step ? i.toFixed(decimalPlaces) : i;
//       await ChangeTvInput(tvInputs[0], value);
//       await OptimizeParams(userInputs, 0, optimizationResults);
//     }
//     return;
//   }
//   // Recursive loop: If there are more parameters to adjust, the code enters a recursive loop.
//   // In this loop, it tries each value of the current parameter and calls itself (iterateRanges) for the next parameter.
//   // Otherwise, perform a recursive call to continue optimization
//   for (let i = start; i <= end; i += step ? step : 0.1) {
//     // Recursive call to iterateRanges function to continue optimization
//     const value = step ? i.toFixed(decimalPlaces) : i;
//     await ChangeTvInput(tvInputs[index], value);
//     await iterateRanges(userInputs, optimizationResults, index - 1);
//   }
// }
// //===================================================================================================
// // Genetic Algorithm
// //===================================================================================================
// async function iterateGenetic(
//   populationSize,
//   userInputs,
//   maxIterations,
//   mutationProbability,
//   optimizationResults
// ) {
//   // Initialize population
//   function initializePopulation(populationSize, userInputs) {
//     const population = [];
//     for (let i = 0; i < populationSize; i++) {
//       const individual = [];
//       userInputs.forEach((element) => {
//         const start = Number(element.start);
//         const end = Number(element.end);
//         const step = Number(element.stepSize);

//         const decimalPart = String(step).split(".")[1];
//         const decimalPlaces = decimalPart ? decimalPart.length : 0;
//         individual.push(
//           Number((start + Math.random() * (end - start)).toFixed(decimalPlaces))
//         );
//       });
//       individual.push(0); // 改组参数对应的利润
//       population.push(individual);
//     }
//     return population;
//   }

//   // Selection algorithm (simply select the individuals with higher fitness as parents)
//   async function selection(population, populationSize) {
//     const itemLength = population[0].length;
//     for (let i = 0; i < population.length; i++) {
//       // Loop 2: Calculate the value of each individual in this generation
//       if (stopOptimizationFlag) {
//         return;
//       }
//       await fitnessFunction(population[i], userInputs, optimizationResults);
//     }
//     population.sort((a, b) => b[itemLength - 1] - a[itemLength - 1]);
//     population.splice(populationSize, population.length);
//   }

//   // Crossover operation (simply take the average of the corresponding parameters from two parents as the child)
//   function crossover(parent1, parent2) {
//     const child = [];
//     const itemLength = parent1.length;
//     for (let i = 0; i < itemLength - 1; i++) {
//       const decimalPart = String(parent1[i]).split(".")[1];
//       const decimalPlaces = decimalPart ? decimalPart.length : 0;

//       child.push(
//         Number(((parent1[i] + parent2[i]) / 2).toFixed(decimalPlaces))
//       );
//     }
//     child.push(0);
//     return child;
//   }

//   // Mutation operation (randomly modify parameter values)
//   function mutation(individual, userInputs) {
//     const mutatedIndividual = [];
//     for (let i = 0; i < individual.length - 1; i++) {
//       const element = userInputs[i];
//       const start = Number(element.start);
//       const end = Number(element.end);
//       const step = Number(element.stepSize);
//       const decimalPart = String(step).split(".")[1];
//       const decimalPlaces = decimalPart ? decimalPart.length : 0;
//       individual[i] = Number(
//         (start + Math.random() * (end - start)).toFixed(decimalPlaces)
//       );
//     }
//     return mutatedIndividual;
//   }

//   let bestIndividual;
//   let population = initializePopulation(populationSize, userInputs); // Initialize population
//   // Genetic algorithm iteration process ======= Loop 1: Number of iterations for population evolution
//   for (let i = 0; i < maxIterations; i++) {
//     console.log(i, "population========", population);
//     await selection(population, populationSize); // Select and sort the best-performing parameters
//     if (stopOptimizationFlag) {
//       console.log("Optimization stopped by user.");
//       return;
//     }

//     // Update the best individual
//     const currentBestIndividual = population[0];
//     if (
//       !bestIndividual ||
//       currentBestIndividual[currentBestIndividual.length - 1] >
//         bestIndividual[bestIndividual.length - 1]
//     ) {
//       bestIndividual = currentBestIndividual;
//       maxProfit = bestIndividual[bestIndividual.length - 1]; // Update maxProfit
//     }

//     for (let j = 0; j < populationSize; j++) {
//       const parent1 = population[Math.floor(Math.random() * populationSize)];
//       const parent2 = population[Math.floor(Math.random() * populationSize)];
//       const child = crossover(parent1, parent2); // Generate child parameters

//       // Mutate the child with a certain probability
//       if (Math.random() < mutationProbability) {
//         mutation(child, userInputs);
//       }
//       population.push(child);
//     }
//   }
//   // Return the best individual (set of parameters) found by the genetic algorith
//   return bestIndividual;
// }
// //===================================================================================================
// // Bayesian Optimization Algorithm
// //===================================================================================================
// // Bayesian optimization process
// async function iterateBayesian(userInputs, maxIterations, optimizationResults) {
//   // Initialize Bayesian optimizer
//   const optimizer = new BayesianOptimizer(userInputs);

//   for (let i = 0; i < maxIterations; i++) {
//     if (stopOptimizationFlag) {
//       console.log("Optimization stopped by user.");
//       break;
//     }

//     // Get the next set of parameters to optimize
//     const nextParams = optimizer.getNextParameters();

//     // Calculate the fitness function (e.g., net profit of the strategy)
//     const fitness = await fitnessFunction(nextParams, userInputs, optimizationResults);

//     // Update the Bayesian optimizer
//     optimizer.update(nextParams, fitness);

//     // Save optimization results
//     optimizationResults.set(nextParams.toString(), fitness);
//   }

//   // Return the best parameters and corresponding fitness value
//   return optimizer.getBestParameters();
// }

// /**
//  * Enhanced BayesianOptimizer Class
//  *
//  * This class implements a lightweight Bayesian optimization routine using a surrogate model based on
//  * Gaussian kernel regression. It estimates the mean and variance of the fitness function from previous
//  * samples and uses an Expected Improvement (EI) acquisition function to propose new candidate parameters.

//  */
// class BayesianOptimizer {
//     constructor(user_inputs, config = {}) {
//         if (!Array.isArray(user_inputs) || user_inputs.length === 0) {
//             throw new Error("user_inputs must be a non-empty array");
//         }
//         this.user_inputs = user_inputs;
//         // Pre-compute parameter ranges and decimal precision for each input
//         this.param_info = user_inputs.map(input => {
//             const start = Number(input.start);
//             const end = Number(input.end);
//             const step = Number(input.step_size || input.stepSize);
//             if (isNaN(start) || isNaN(end) || isNaN(step)) {
//                 throw new Error("All user input parameters must be valid numbers");
//             }
//             const range = end - start;
//             const decimal_places = (step.toString().split('.')[1] || "").length;
//             return { start, end, range, step, decimal_places };
//         });
//         this.samples = [];        // Array of candidate parameter vectors
//         this.fitness_values = []; // Corresponding fitness values
//         this.best_params = null;
//         this.best_fitness = -Infinity;
//         // Configurable parameters for the surrogate model and acquisition function
//         this.kernel_bandwidth = config.kernel_bandwidth || 0.2;
//         this.xi = config.xi || 0.01;
//         this.ei_threshold = config.ei_threshold || 1e-6; // Early stopping threshold for EI
//         this.verbose = config.verbose || false;
//     }

//     // Generates a random candidate uniformly within the allowed parameter ranges.
//     randomCandidate() {
//         return this.param_info.map(info => {
//             let value = info.start + Math.random() * (info.end - info.start);
//             return Number(value.toFixed(info.decimal_places));
//         });
//     }

//     // Perturbs an existing candidate by up to ±5% of its range and clamps to valid bounds.
//     perturbCandidate(candidate) {
//         return candidate.map((value, i) => {
//             let info = this.param_info[i];
//             let range = info.range;
//             let perturbation = (Math.random() - 0.5) * 0.1 * range;
//             let new_value = value + perturbation;
//             new_value = Math.min(info.end, Math.max(info.start, new_value));
//             return Number(new_value.toFixed(info.decimal_places));
//         });
//     }

//     // Gaussian Probability Density Function.
//     gaussianPDF(x) {
//         return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
//     }

//     // Gaussian Cumulative Distribution Function using an approximation.
//     gaussianCDF(x) {
//         const a1 = 0.254829592,
//               a2 = -0.284496736,
//               a3 = 1.421413741,
//               a4 = -1.453152027,
//               a5 = 1.061405429,
//               p = 0.3275911;
//         const sign = x < 0 ? -1 : 1;
//         x = Math.abs(x) / Math.sqrt(2.0);
//         const t = 1.0 / (1.0 + p * x);
//         const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
//         return 0.5 * (1.0 + sign * y);
//     }

//     /**
//      * Computes the surrogate model's estimate (mean and variance) at candidate x using Gaussian kernel regression.
//      * Distances are normalized using each parameter's range.
//      */
//     getSurrogateEstimate(x) {
//         if (this.samples.length === 0) {
//             return { mu: 0, sigma: 1 };
//         }
//         let weighted_sum = 0, weight_total = 0, weighted_squared_sum = 0;
//         for (let j = 0; j < this.samples.length; j++) {
//             let sample = this.samples[j];
//             let fitness = this.fitness_values[j];
//             let distance_squared = 0;
//             for (let i = 0; i < x.length; i++) {
//                 let info = this.param_info[i];
//                 let diff = (x[i] - sample[i]) / (info.range || 1);
//                 distance_squared += diff * diff;
//             }
//             const weight = Math.exp(-distance_squared / (2 * this.kernel_bandwidth * this.kernel_bandwidth));
//             weighted_sum += weight * fitness;
//             weighted_squared_sum += weight * fitness * fitness;
//             weight_total += weight;
//         }
//         const mu = weighted_sum / weight_total;
//         const variance = (weighted_squared_sum / weight_total) - (mu * mu);
//         const sigma = Math.sqrt(Math.max(variance, 1e-6));
//         return { mu, sigma };
//     }

//     /**
//      * Computes the Expected Improvement (EI) at candidate x.
//      * EI(x) = (mu(x) - best_fitness - xi) * Phi(Z) + sigma(x) * phi(Z)
//      * where Z = (mu(x) - best_fitness - xi) / sigma(x)
//      */
//     computeAcquisition(x) {
//         const { mu, sigma } = this.getSurrogateEstimate(x);
//         const improvement = mu - this.best_fitness - this.xi;
//         const Z = sigma > 0 ? improvement / sigma : 0;
//         const EI = sigma > 0 ? (improvement * this.gaussianCDF(Z) + sigma * this.gaussianPDF(Z)) : 0;
//         if (this.verbose) {
//             console.log(`Acquisition at ${x}: EI=${EI}, mu=${mu}, sigma=${sigma}`);
//         }
//         return { mu, sigma, EI };
//     }

//     /**
//      * Proposes the next candidate parameters to evaluate.
//      * - If no samples exist, returns a random candidate.
//      * - With a 10% chance, returns a random candidate for exploration.
//      * - Otherwise, randomly samples candidates and selects the one with the highest EI.
//      * - If the best EI is below a threshold, it perturbs the best candidate.
//      */
//     getNextParameters() {
//         if (this.samples.length === 0) {
//             return this.randomCandidate();
//         }
//         if (Math.random() < 0.1) {
//             if (this.verbose) console.log("Exploration: Random candidate chosen.");
//             return this.randomCandidate();
//         }
//         let best_candidate = null;
//         let best_EI = -Infinity;
//         const num_candidates = 50;
//         for (let i = 0; i < num_candidates; i++) {
//             const candidate = this.randomCandidate();
//             const { EI } = this.computeAcquisition(candidate);
//             if (EI > best_EI) {
//                 best_EI = EI;
//                 best_candidate = candidate;
//             }
//         }
//         if (this.verbose) {
//             console.log(`Best EI among candidates: ${best_EI}`);
//         }
//         if (best_EI < this.ei_threshold && this.best_params) {
//             if (this.verbose) {
//                 console.log(`EI below threshold (${this.ei_threshold}). Perturbing best candidate.`);
//             }
//             best_candidate = this.perturbCandidate(this.best_params);
//         }
//         return best_candidate || this.randomCandidate();
//     }

//     /**
//      * Updates the optimizer with a new observation.
//      * Records the candidate and its fitness, and updates the best candidate if the new fitness is higher.
//      */
//     update(params, fitness) {
//         this.samples.push(params.slice());
//         this.fitness_values.push(fitness);
//         if (this.verbose) {
//             console.log(`Update: params=${params}, fitness=${fitness}`);
//         }
//         if (fitness > this.best_fitness) {
//             this.best_fitness = fitness;
//             this.best_params = params.slice();
//             if (this.verbose) {
//                 console.log(`New best found: ${this.best_params} with fitness ${this.best_fitness}`);
//             }
//         }
//     }

//     // Returns the best candidate parameters and their fitness.
//     getBestParameters() {
//         return { parameters: this.best_params, fitness: this.best_fitness };
//     }
// }

// // Function to optimize parameters by simulating user interactions and observing mutations on the page
// async function OptimizeParams(
//   userInputs,
//   tvParameterIndex,
//   optimizationResults
// ) {
//   // Check if optimization should be stopped ---jaime
//   if (stopOptimizationFlag) {
//     console.log("Optimization has been stopped by the user.");
//     return; // Exit the optimization process
//   }
//   // Initialize report data object
//   const reportData = new Object({
//     netProfit: {
//       amount: 0,
//       percent: "",
//     },
//     closedTrades: 0,
//     percentProfitable: "",
//     profitFactor: 0.0,
//     maxDrawdown: {
//       amount: 0,
//       percent: "",
//     },
//     averageTrade: {
//       amount: 0,
//       percent: "",
//     },
//     avgerageBarsInTrades: 0,
//   });
//   // Simulate input and trigger backtesting
//   Trigger(tvInputs[tvParameterIndex]); // Simulate pressing Enter to trigger backtesting

//   // Observe mutations to get new test results and save them in optimizationResults Map
//   const p1 = new Promise((resolve, reject) => {
//     // MutationObserver logic goes here
//     // This includes observing changes, building report data, updating optimizationResults, and resolving the promise
//     var observer = new MutationObserver(function (mutations) {
//       mutations.every(function (mutation) {
//         if (mutation.type === "characterData") {
//           if (mutation.oldValue != mutation.target.data) {
//             var params = GetParametersFromWindow(userInputs);

//             if (
//               !optimizationResults.has(params) &&
//               params != "ParameterOutOfRange"
//             ) {
//               ReportBuilder(reportData, mutation);
//               optimizationResults.set(params, reportData);

//               // 更新回测预测结束时间
//               testedCount = optimizationResults.size;
//               predictTime = new Date(
//                 ((new Date().getTime() - startTime.getTime()) / testedCount) *
//                   totalCount +
//                   startTime.getTime()
//               );

//               // 格式化时间
//               const month = predictTime.toLocaleString("en-US", {
//                 month: "short",
//               });
//               const day = predictTime.getDate();
//               const hours = predictTime.toLocaleString("en-US", {
//                 hour: "2-digit",
//                 minute: "2-digit",
//                 hour12: true,
//                 timeZoneName: "long",
//               });
//               const formattedTime = `${month} ${day}, ${hours}`;

//               // 派发带有最新 formattedTime 的事件
//               dispatchCustomEvent({
//                 formattedTime: formattedTime,
//                 totalCount: totalCount,
//               });

//               //   console.log(totalCount);
//               //   console.log(formattedTime);
//               // 发送数据到 popup.js
//               // sendUpdatedData(formattedTime, totalCount);
//               // Update Max Profit
//               replacedNDashProfit = reportData.netProfit.amount.replace(
//                 "−",
//                 "-"
//               );
//               profit = Number(replacedNDashProfit.replace(/[^0-9-\.]+/g, ""));
//               if (profit > maxProfit) {
//                 maxProfit = profit;
//               }
//               resolve(
//                 "Optimization param added to map: " +
//                   params +
//                   " Profit: " +
//                   optimizationResults.get(params).netProfit.amount
//               );
//             } else if (optimizationResults.has(params)) {
//               resolve("Optimization param already exist " + params);
//             } else {
//               resolve("Parameter is out of range, omitted");
//             }
//             observer.disconnect();
//             return false;
//           }
//         }
//         return true;
//       });
//     });

//     var element = document.querySelector("div[class*=widgetContainer]");
//     let options = {
//       childList: true,
//       subtree: true,
//       characterData: true,
//       characterDataOldValue: true,
//       attributes: true,
//       attributeOldValue: true,
//     };
//     if (element) {
//       observer.observe(element, options);
//     } else {
//       reject("Observer element not found");
//     }
//   });

//   const p2 = new Promise((resolve, reject) => {
//     setTimeout(() => {
//       reject("Timeout exceed");
//     }, 10 * 1000);
//   });

//   await sleep(600);
//   // Use Promise.race to set a 10-second timeout in case the Strategy Test Overview window fails to load
//   await Promise.race([p1, p2])
//     .then()
//     .catch((reason) => console.log(`Rejected: ${reason}`));
// }
// // Function to change the value of a TradingView input element
// async function ChangeTvInput(input, value) {
//   // Input change logic goes here
//   // This includes setting the value, dispatching the input event, and triggering backtesting
//   const previousValue = input.value;

//   if (previousValue !== value.toString()) {
//     const event = new Event("input", { bubbles: true });
//     input.value = value;
//     input._valueTracker.setValue(previousValue);
//     input.dispatchEvent(event);

//     Trigger(input);
//     await sleep(100);
//   }
// }

// // Function to simulate pressing Enter to trigger backtesting
// function Trigger(input) {
//   // Trigger logic goes here
//   // This includes dispatching a KeyboardEvent with keyCode 13 (Enter key)
//   setTimeout(() => {
//     input.dispatchEvent(
//       new KeyboardEvent("keydown", {
//         keyCode: 13,
//         cancelable: true,
//         bubbles: true,
//       })
//     );
//   }, 600);
// }

// // Function to get and format the current active parameters from the TradingView strategy options window
// function GetParametersFromWindow(userInputs) {
//   // Parameter extraction and formatting logic goes here
//   // This includes checking if the parameters are within the specified range and formatting them as a string
//   var parameters = "";

//   for (let i = 0; i < userInputs.length; i++) {
//     if (
//       userInputs[i].start > parseFloat(tvInputs[i].value) ||
//       parseFloat(tvInputs[i].value) > userInputs[i].end
//     ) {
//       parameters = "ParameterOutOfRange";
//       break;
//     }

//     if (i == userInputs.length - 1) {
//       parameters += tvInputs[i].value;
//     } else {
//       parameters += tvInputs[i].value + ", ";
//     }
//   }
//   return parameters;
// }
// // Function to build report data from performance overview.
// function ReportBuilder(reportData, mutation) {
//   // Report building logic goes here
//   // This includes extracting performance indicators from the page and updating the reportData object
//   var reportDataSelector = mutation.target.ownerDocument.querySelectorAll(
//     "[class^='secondRow']"
//   );

//   //1. Column
//   reportData.netProfit.amount =
//     reportDataSelector[0].querySelectorAll("div")[0].innerText;
//   reportData.netProfit.percent =
//     reportDataSelector[0].querySelectorAll("div")[1].innerText;
//   //2.
//   reportData.closedTrades =
//     reportDataSelector[1].querySelector("div").innerText;
//   //3.
//   reportData.percentProfitable =
//     reportDataSelector[2].querySelector("div").innerText;
//   //4.
//   reportData.profitFactor =
//     reportDataSelector[3].querySelector("div").innerText;
//   //5.
//   reportData.maxDrawdown.amount =
//     reportDataSelector[4].querySelectorAll("div")[0].innerText;
//   reportData.maxDrawdown.percent =
//     reportDataSelector[4].querySelectorAll("div")[1].innerText;
//   //6.
//   reportData.averageTrade.amount =
//     reportDataSelector[5].querySelectorAll("div")[0].innerText;
//   reportData.averageTrade.percent =
//     reportDataSelector[5].querySelectorAll("div")[1].innerText;

//   reportData.avgerageBarsInTrades =
//     reportDataSelector[6].querySelector("div").innerText;
// }
// // Utility function to sleep for a specified number of milliseconds
// function sleep(ms) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

// //Mutation Observer Code for console debugging purposes
//         var observer = new MutationObserver(function (mutations) {
//             mutations.every(function (mutation) {
//                 if (mutation.type === 'characterData') {
//                     if(mutation.oldValue != mutation.target.data){
//                         console.log(mutation)
//                         observer.disconnect()
//                         return false
//                     }
//                 }
//                 return true
//             });
//         });

//         var element = document.querySelector(".backtesting-content-wrapper.widgetContainer-Lo3sdooi")
//         let options = {
//             attributes: false,
//             childList: true,
//             subtree: true,
//             characterData: true,
//             characterDataOldValue: true,
//             attributes: true,
//             attributeOldValue: true
//         }
//         observer.observe(element, options);

// // GLOBAL fitness function for both Genetic and Bayesian optimization
// async function fitnessFunction(parameters, userInputs, optimizationResults) {
//     const reportData = new Object({
//         netProfit: { amount: 0, percent: "" },
//         closedTrades: 0,
//         percentProfitable: "",
//         profitFactor: 0.0,
//         maxDrawdown: { amount: 0, percent: "" },
//         averageTrade: { amount: 0, percent: "" },
//         avgerageBarsInTrades: 0,
//     });
//     let key = "";
//     for (let i = 0; i < userInputs.length; i++) {
//         key += i === userInputs.length - 1 ? parameters[i] : parameters[i] + ", ";
//     }
//     if (optimizationResults.has(key)) {
//         parameters[parameters.length - 1] = optimizationResults.get(key).profit;
//         return true;
//     }
//     if (userInputs[0]["stepSize"] === "0") {
//         setTimeout(() => {
//             tvInputs[0].dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
//             document.querySelectorAll("button[class*=controlIncrease]")[0].click();
//         }, 100);
//         await OptimizeParams(userInputs, 0, optimizationResults);
//     }
//     for (let i = 0; i < parameters.length - 1; i++) {
//         await ChangeTvInput(tvInputs[i], parameters[i]);
//     }
//     const p1 = new Promise((resolve, reject) => {
//         var observer = new MutationObserver(function (mutations) {
//             mutations.every(function (mutation) {
//                 if (mutation.type === "characterData" && mutation.oldValue !== mutation.target.data) {
//                     const params = GetParametersFromWindow(userInputs);
//                     if (params !== "ParameterOutOfRange") {
//                         ReportBuilder(reportData, mutation);
//                         replacedNDashProfit = reportData.netProfit.amount.replace("−", "-");
//                         let profit = Number(replacedNDashProfit.replace(/[^0-9-\.]+/g, ""));
//                         reportData.profit = profit;
//                         optimizationResults.set(params, reportData);
//                         parameters[parameters.length - 1] = profit;
//                         resolve("");
//                     } else {
//                         resolve("Parameter is out of range, omitted");
//                     }
//                     observer.disconnect();
//                     return false;
//                 }
//                 return true;
//             });
//         });
//         var element = document.querySelector("div[class*=widgetContainer]");
//         let options = {
//             childList: true,
//             subtree: true,
//             characterData: true,
//             characterDataOldValue: true,
//             attributes: true,
//             attributeOldValue: true,
//         };
//         if (element) {
//             observer.observe(element, options);
//         } else {
//             reject("Observer element not found");
//         }
//     });
//     const p2 = new Promise((resolve, reject) => {
//         setTimeout(() => { reject("Timeout exceed" + key); }, 5000);
//     });
//     await sleep(300);
//     await Promise.race([p1, p2]).catch((reason) => console.log(`Rejected: ${reason}`));
// }
