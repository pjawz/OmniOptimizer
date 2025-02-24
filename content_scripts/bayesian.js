// BayesianOptimizer.js
// Implements Bayesian Optimization for TradingView strategy optimization in a Chrome extension
// Requires numeric.js (http://numericjs.com/) and jstat (https://jstat.github.io/)
import numeric from "../lib/numeric";
import jstat from "../lib/jstat";

/**
 * Generates the search space as the Cartesian product of parameter values.
 * @param {Object} AllRangeParams - Dictionary of parameter names and possible values
 * @param {Array} paramsNames - Array of parameter names
 * @returns {Array} Array of parameter objects
 */
function generateSearchSpace(AllRangeParams, paramsNames) {
    const values = paramsNames.map((name) => AllRangeParams[name]);
    const cartesianProduct = (arrays) =>
        arrays.reduce((a, b) => a.flatMap((d) => b.map((e) => [d, e].flat())), [[]]);
    const searchSpace = cartesianProduct(values).map((combination) => {
        const params = {};
        paramsNames.forEach((key, index) => {
            params[key] = combination[index];
        });
        console.log("Generated parameters in search space:", params);
        return params;
    });
    console.log("Generated search space:", searchSpace);
    return searchSpace;
}

/**
 * Converts parameters to a normalized numerical vector [0,1].
 * @param {Object} config - Configuration object containing AllRangeParams and paramsNames
 * @param {Object} params - Parameter set
 * @returns {Array} Normalized vector
 */
function getVector(config, params) {
    const { AllRangeParams, paramsNames } = config;
    const vector = paramsNames.map((name) => {
        const values = AllRangeParams[name];
        const min = Math.min(...values);
        const max = Math.max(...values);
        const val = params[name];
        return (val - min) / (max - min); // Normalize to [0,1]
    });
    console.log("Converted parameters to vector:", params, vector);
    return vector;
}

/**
 * Computes the RBF kernel between two vectors.
 * @param {Object} config - Configuration object containing sigma_f and l
 * @param {Array} x1 - First vector
 * @param {Array} x2 - Second vector
 * @returns {number} Kernel value
 */
function rbfKernel(config, x1, x2) {
    const { sigma_f, l } = config;
    const diff = numeric.sub(x1, x2);
    const squaredDistance = numeric.dot(diff, diff);
    const kernelValue = sigma_f * sigma_f * Math.exp((-0.5 * squaredDistance) / (l * l));
    console.log("Computed RBF kernel:", x1, x2, kernelValue);
    return kernelValue;
}

/**
 * Computes the RBF kernel matrix for the observed points.
 * @param {Object} config - Configuration object containing sigma_f and l
 * @param {Array} X - Array of vectors
 * @returns {Array} Kernel matrix
 */
function computeKernelMatrix(config, X) {
    const n = X.length;
    const K = numeric.rep([n, n], 0);
    for (let i = 0; i < n; i++) {
        for (let j = i; j < n; j++) {
            const k = rbfKernel(config, X[i], X[j]);
            K[i][j] = k;
            K[j][i] = k;
        }
    }
    console.log("Computed kernel matrix:", K);
    return K;
}

/**
 * Computes the kernel vector between a new point and observed points.
 * @param {Object} config - Configuration object containing sigma_f and l
 * @param {Array} x_star - New vector
 * @param {Array} X - Observed vectors
 * @returns {Array} Kernel vector
 */
function computeKStar(config, x_star, X) {
    const kStar = X.map((x) => rbfKernel(config, x_star, x);
    console.log("Computed kernel vector k*:", x_star, kStar);
    return kStar;
}

/**
 * Initializes the optimizer state.
 * @param {Object} AllRangeParams - Dictionary of parameter names and possible values
 * @param {Object} TestResults - Strategy info including isMaximizing, paramsNames, etc.
 * @param {Object} OptimizationState - State tracking (not used internally)
 * @returns {Object} Initial optimizer state with config and state
 */
function initializeOptimizer(AllRangeParams, TestResults, OptimizationState) {
    const config = {
        AllRangeParams,
        isMaximizing: TestResults.isMaximizing,
        paramsNames: TestResults.paramsNames,
        startParams: TestResults.startParams,
        shouldSkipInitBestResult: TestResults.shouldSkipInitBestResult,
        cycles: TestResults.cycles,
        optParamName: TestResults.optParamName,
        sigma_f: 1, // Signal variance
        l: 0.5, // Length scale (for normalized inputs)
        sigma: 0.05, // Noise variance (increased slightly for robustness)
        relativeEiThreshold: 0.001, // Relative EI threshold (e.g., 0.1% of f_plus)
        searchSpace: generateSearchSpace(AllRangeParams, TestResults.paramsNames),
    };
    const state = {
        observedParams: [],
        observedValues: [],
    };
    console.log("BayesianOptimizer initialized with parameters:", AllRangeParams);
    return { config, state };
}

/**
 * Creates a Bayesian Optimizer instance using a functional approach.
 * Uses closures to maintain state, providing methods similar to the class-based version.
 * @param {Object} AllRangeParams - Dictionary of parameter names and possible values
 * @param {Object} TestResults - Strategy info including isMaximizing, paramsNames, cycles, etc.
 * @param {Object} OptimizationState - State tracking (not used internally)
 * @returns {Object} Object with suggestNext, update, and optimize methods
 */
function createBayesianOptimizer(AllRangeParams, TestResults, OptimizationState) {
    let optimizer = initializeOptimizer(AllRangeParams, TestResults, OptimizationState);

    /** @type {() => Object|null} */
    const suggestNext = () => {
        const { config, state } = optimizer;
        const { searchSpace, isMaximizing, relativeEiThreshold } = config;
        const { observedParams, observedValues } = state;

        if (observedParams.length === 0) {
            const randomIndex = Math.floor(Math.random() * searchSpace.length);
            const randomParams = searchSpace[randomIndex];
            console.log("No observations yet, suggesting random parameters:", randomParams);
            return randomParams;
        }

        const X = observedParams.map((params) => getVector(config, params));
        const y = observedValues;

        const K = computeKernelMatrix(config, X);
        const K_noise = numeric.add(
            K,
            numeric.mul(config.sigma * config.sigma, numeric.identity(X.length))
        );
        const inv_K = numeric.inv(K_noise);
        const alpha = numeric.dot(inv_K, y);

        const f_plus = isMaximizing ? Math.max(...y) : Math.min(...y);
        const dynamicEiThreshold = relativeEiThreshold * Math.abs(f_plus);

        let maxEI = -Infinity;
        let bestParams = null;
        const observedKeys = new Set(observedParams.map((p) => JSON.stringify(p)));

        for (const params of searchSpace) {
            const paramKey = JSON.stringify(params);
            if (observedKeys.has(paramKey)) {
                continue;
            }
            const x_star = getVector(config, params);
            const k_star = computeKStar(config, x_star, X);
            const mu = numeric.dot(k_star, alpha);
            const v = numeric.dot(inv_K, k_star);
            const var_ = rbfKernel(config, x_star, x_star) - numeric.dot(k_star, v);
            const sigma = var_ > 0 ? Math.sqrt(var_) : 0;

            let ei = 0;
            if (sigma > 0) {
                const delta = isMaximizing ? mu - f_plus : f_plus - mu;
                const z = delta / sigma;
                const Phi_z = jstat.normal.cdf(z, 0, 1);
                const phi_z = jstat.normal.pdf(z, 0, 1);
                ei = delta * Phi_z + sigma * phi_z;
            }

            if (ei > maxEI) {
                maxEI = ei;
                bestParams = params;
            }
        }

        console.log("Suggested next parameters:", bestParams, "with EI:", maxEI);

        if (maxEI < dynamicEiThreshold) {
            console.log("Maximum EI below threshold, stopping optimization.");
            return null;
        } else {
            return bestParams;
        }
    };

    /** @type {(newParams: Object, newValue: number) => void} */
    const update = (newParams, newValue) => {
        const { config, state } = optimizer;
        const newState = {
            observedParams: [...state.observedParams, newParams],
            observedValues: [...state.observedValues, newValue],
        };
        optimizer = { config, state: newState };
        console.log("Updated with new observation:", newParams, newValue);
    };

    /** @type {(testResults: Object, allRangeParams: Object, optimizationState: Object) => Promise<Object|null>} */
    const optimize = async (testResults, allRangeParams, optimizationState) => {
        const nextParams = suggestNext();
        if (nextParams === null) {
            return null;
        }

        try {
            const optRes = await backtest.getTestIterationResult(testResults, nextParams);
            if (optRes && optRes.data && optRes.error === null) {
                const newValue = optRes.data[testResults.optParamName];
                update(nextParams, newValue);
                console.log("Optimization iteration result:", optRes);
                return optRes;
            } else {
                throw new Error("Backtest failed: " + (optRes.error || "Unknown error"));
            }
        } catch (error) {
            console.error("Optimization error:", error);
            throw error;
        }
    };

    return {
        suggestNext,
        update,
        optimize,
    };
}

export default createBayesianOptimizer;