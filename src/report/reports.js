// Create a Proxy object to get the value of strategyID from URL parameters.
const params = new Proxy(new URLSearchParams(window.location.search), {
	get: (searchParams, prop) => searchParams.get(prop),
});

// Get the value of strategyID
let strategyID = params.strategyID;

document.addEventListener("DOMContentLoaded", function () {
	// Apply initial theme settings
	// Removed: applyThemeSettings();
});

// Get report data related to strategyID from local storage
chrome.storage.local.get("report-data-" + strategyID, function (item) {
	var reportDetailData = [];
	var values = Object.values(item)[0].reportData;

	// Iterate over report data and convert format
	for (const [key, value] of Object.entries(values)) {
		var reportDetail = {
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
	var $table = $("#table");
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

// Function to download CSV report
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

// Function to convert report data to CSV format
function convertReportToCSV(reportDetailData) {
	const keys = Object.keys(reportDetailData[0]);
	var result =
		keys
			.map((key) => {
				return key.toUpperCase();
			})
			.join(",") + "\n";

	for (var i = 0; i < reportDetailData.length; i++) {
		var line = [];
		for (var j = 0; j < keys.length; j++) {
			var value = reportDetailData[i][keys[j]];
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

// Custom sort function to handle non-numeric characters and negative values
function customSort(sortName, sortOrder, data) {
	var order = sortOrder === "desc" ? -1 : 1;
	data.sort(function (a, b) {
		var aa = "";
		var bb = "";
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
