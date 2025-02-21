/**
 * @file reports.js
 * @description Processes and retrieves report data from storage using a strategy ID passed via URL parameters.
 */

// Create a Proxy to retrieve URL parameters using ES6 features
const params = new Proxy(new URLSearchParams(window.location.search), {
	get: (searchParams, prop) => searchParams.get(prop),
});

// Retrieve strategyID from URL parameters
let strategyID = params.strategyID;

/**
 * DOMContentLoaded event callback to initialize report page.
 */
document.addEventListener("DOMContentLoaded", () => {
	// Apply initial theme settings if needed
	// Removed: applyThemeSettings();
});

/**
 * Retrieves report data from Chrome storage for the given strategyID and processes it.
 * @param {Object} item - The object returned by chrome.storage.local.get containing report data.
 */
chrome.storage.local.get("report-data-" + strategyID, (item) => {
	let reportDetailData = [];
	const values = Object.values(item)[0].reportData;

	// Iterate over report data and convert format
	for (const [key, value] of Object.entries(values)) {
		const reportDetail = {
			parameters: key,
			netProfitAmount: value.netProfit.amount,
			netProfitPercent: value.netProfit.percent,
			closedTrades: value.closedTrades,
			percentProfitable: value.percentProfitable,
			profitFactor: value.profitFactor,
			maxDrawdownAmount: value.maxDrawdown.amount,
			maxDrawdownPercent: value.maxDrawdown.percent,
			averageTradeAmount: value.averageTrade.amount,
			averageTradePercent: value.averageTrade.percent,
			avgerageBarsInTrades: value.avgerageBarsInTrades,
		};
		reportDetailData.push(reportDetail);
	}

	// Create a Bootstrap table to display the data
	const $table = $("#table");
	$table.bootstrapTable("showLoading");

	// Load report data and hide loading state after 250 milliseconds
	setTimeout(() => {
		$table.bootstrapTable("load", reportDetailData);
		$table.bootstrapTable("hideLoading");
	}, 250);

	// Create download report button
	const $downloadReportButton = $("#download-report");

	// Call downloadCSVReport function when download report button is clicked
	$downloadReportButton.click(function () {
		downloadCSVReport(reportDetailData);
	});
});

// JSDoc: Downloads the CSV report using report detail data
// @param {Array} reportDetailData - Array of report detail objects
function downloadCSVReport(reportDetailData) {
	chrome.storage.local.get("report-data-" + strategyID, function (item) {
		const reportData = item["report-data-" + strategyID];
		const strategyName = reportData.strategyName; // Extract strategy name
		const strategySymbol = reportData.symbol;
		const userInputsToString = reportData.parameters;
		const createdTimestamp = reportData.created;
		const createdDate = new Date(createdTimestamp);
		const formattedDate = createdDate.toISOString().slice(0, 10);
		const csv = convertReportToCSV(reportDetailData);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute(
			"download",
			`${strategyName}/${strategySymbol}/${userInputsToString}/${formattedDate}.csv`
		);
		// Simulate click to download link
		link.click();
	});
}

// JSDoc: Converts an array of report detail objects to a CSV formatted string
// @param {Array} reportDetailData - Array of report detail objects
// @returns {string} CSV formatted string
function convertReportToCSV(reportDetailData) {
	const keys = Object.keys(reportDetailData[0]);
	let result =
		keys
			.map((key) => {
				return key.toUpperCase();
			})
			.join(",") + "\n";

	for (let i = 0; i < reportDetailData.length; i++) {
		const line = [];
		for (let j = 0; j < keys.length; j++) {
			let value = reportDetailData[i][keys[j]];
			// If the value is a string and contains a comma, enclose it in double quotes to preserve format
			if (typeof value === "string" && value.indexOf(",") !== -1) {
				value = '"' + value + '"';
			}
			line.push(value);
		}
		result += line.join(",") + "\n";
	}
	return result;
}

// JSDoc: Custom sort function that handles non-numeric characters and negative values
// @param {string} sortName - The key to sort by
// @param {string} sortOrder - Sort order: 'asc' or 'desc'
// @param {Array} data - Array of objects to be sorted
function customSort(sortName, sortOrder, data) {
	const order = sortOrder === "desc" ? -1 : 1;
	data.sort(function (a, b) {
		let aa = "";
		let bb = "";
		// Use regular expression to check for negative numbers and reconstruct and remove non-numeric characters
		if (a[sortName].charAt(0).match(/\D/) != null) {
			aa = "-" + a[sortName].substring(1, a[sortName].length);
			aa = +(aa + "").replace(/[^0-9.-]+/g, "");
		} else {
			aa = +(a[sortName] + "").replace(/[^0-9.-]+/g, "");
		}

		if (b[sortName].charAt(0).match(/\D/) != null) {
			bb = "-" + b[sortName].substring(1, b[sortName].length);
			bb = +(bb + "").replace(/[^0-9.-]+/g, "");
		} else {
			bb = +(b[sortName] + "").replace(/[^0-9.-]+/g, "");
		}

		if (aa < bb) {
			return order * -1;
		}
		if (aa > bb) {
			return order;
		}
		return 0;
	});
}
