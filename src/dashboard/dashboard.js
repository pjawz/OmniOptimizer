/**
 * Entry point: dashboard.js, bound to dashboard.html.
 * Clicking the "Optimize" button triggers the execution of injector.js.
 * This injects controller.js into TradingView.com and acts as a middle controller layer between dashboard.js and controller.js.
 * optimizer.js manages Chrome message passing and other event handlers.
 * reports.js is bound to reports.html to display data in the UI.
 *
 * Storage:
 * - Successful optimization reports are saved in chrome.storage.local with the format "report-data-" + "strategyId".
 * - User input values during a Chrome session are also stored in chrome.storage.local. Starting a new session refreshes these values.
 */

//===========================
// Event listener for skip checkbox (first row)
document.getElementById("roundCheckbox").addEventListener("change", function () {
  var startInput = document.getElementById("inputStart");
  var endInput = document.getElementById("inputEnd");
  var stepInput = document.getElementById("inputStep");
  var defaultInput = document.getElementById("inputDefault");

  if (this.checked) {
    startInput.style.display = "none";
    endInput.style.display = "none";
    stepInput.style.display = "none";
    defaultInput.style.display = "block";
  } else {
    startInput.style.display = "block";
    endInput.style.display = "block";
    stepInput.style.display = "block";
    defaultInput.style.display = "none";
  }
});

//===========================
// Event listener for skip checkbox (subsequent rows)
document.getElementById("parameters").addEventListener("change", function (event) {
  // Check if the event originated from a skip checkbox for additional parameters
  if (event.target.className.startsWith("roundCheckbox")) {
    const index = event.target.className.match(/\d+$/)[0];
    var startInput = document.querySelector(".inputStart" + index);
    var endInput = document.querySelector(".inputEnd" + index);
    var stepInput = document.querySelector(".inputStep" + index);
    var defaultInput = document.querySelector(".inputDefault" + index);

    if (event.target.checked) {
      startInput.style.setProperty("display", "none", "important");
      endInput.style.setProperty("display", "none", "important");
      stepInput.style.setProperty("display", "none", "important");
      defaultInput.style.setProperty("display", "block", "important");
    } else {
      startInput.style.setProperty("display", "block", "important");
      endInput.style.setProperty("display", "block", "important");
      stepInput.style.setProperty("display", "block", "important");
      defaultInput.style.setProperty("display", "none", "important");
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  fetch(chrome.runtime.getURL("_locales/en/messages.json"))
    .then(r => r.json())
    .then(messages => {
      window.localized_messages = messages; // store messages globally
      document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (messages[key]?.message) {
          el.textContent = messages[key].message;
        }
      });     
    });

  // If Bootstrap Table is used, update column titles with new translations.
  if (window.$ && typeof $("#table").bootstrapTable === "function") {
    const loc_msgs = window.localized_messages || {}; // use global messages if already loaded
    const newColumns = [
      {
        field: "strategyID",
        title: loc_msgs.id ? loc_msgs.id.message : "ID",
        visible: false,
      },
      {
        field: "strategyName",
        title: loc_msgs.name ? loc_msgs.name.message : "Name",
        sortable: true,
        cellStyle: window.strategyNameColumnStyle || undefined,
      },
      {
        field: "date",
        title: loc_msgs.date ? loc_msgs.date.message : "Date",
        sortable: true,
        sorter: window.dateSorter || undefined,
      },
      {
        field: "symbol",
        title: loc_msgs.symbol ? loc_msgs.symbol.message : "Symbol",
        sortable: true,
        sorter: window.dateSorter || undefined,
        cellStyle: window.symbolColumnStyle || undefined,
      },
      {
        field: "timePeriod",
        title: loc_msgs.period ? loc_msgs.period.message : "Period",
        sortable: false,
      },
      {
        field: "parameters",
        title: loc_msgs.parameters ? loc_msgs.parameters.message : "Parameters",
        sortable: false,
        cellStyle: window.parametersColumnStyle || undefined,
      },
      {
        field: "maxprofit",
        title: loc_msgs.maxProfit ? loc_msgs.maxProfit.message : "Max Profit",
        sortable: true,
        cellStyle: window.maxProfitColumnStyle || undefined,
      },
      {
        field: "detail",
        title: loc_msgs.reportDetail ? loc_msgs.reportDetail.message : "Report Detail",
        sortable: false,
        cellStyle: window.reportDetailButtonStyle || undefined,
        events: window.openReportDetail || undefined,
      },
    ];

    $("#table").bootstrapTable("refreshOptions", {
      columns: [newColumns],
    });
    console.log("Table headers refreshed with new translations");
  }
});

//===========================
// Listen for messages to unlock the optimize button
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "unlockOptimizeButton") {
    document.getElementById("optimize").disabled = false;
  }
});

//===========================
// Main popup functionality and state management
document.addEventListener("DOMContentLoaded", function () {
  // Set saveReport flag to true
  chrome.storage.local.set({ saveReport: true });

  // Load and save the selected algorithm
  const algorithmSelect = document.getElementById("algorithmSelect");
  chrome.storage.local.get("selectedAlgorithm", function (result) {
    if (result.selectedAlgorithm) {
      algorithmSelect.value = result.selectedAlgorithm;
    } else {
      algorithmSelect.value = "traversal";
      chrome.storage.local.set({ selectedAlgorithm: "traversal" });
    }
  });

  algorithmSelect.addEventListener("change", function () {
    const selectedAlgorithm = algorithmSelect.value;
    chrome.storage.local.set({ selectedAlgorithm: selectedAlgorithm }, function () {
      console.log("Algorithm selection saved:", selectedAlgorithm);
    });
  });
  chrome.storage.local.get("selectedAlgorithm", function (result) {
    if (result.selectedAlgorithm) {
      document.getElementById("algorithmSelect").value = result.selectedAlgorithm;
    }
  });

  // Define elements for optimization parameters
  const optimizeButton = document.getElementById("optimize");
  const cancelButton = document.getElementById("cancelOptimize");
  const inputStart = document.getElementById("inputStart");
  const inputEnd = document.getElementById("inputEnd");
  const inputStep = document.getElementById("inputStep");

  // Save input values to chrome.storage.local
  function saveInputValue(key, value) {
    let obj = {};
    obj[key] = value;
    chrome.storage.local.set(obj, function () {
      console.log(`Value ${value} for ${key} saved.`);
    });
  }
  inputStart.addEventListener("input", () => saveInputValue("inputStart", inputStart.value));
  inputEnd.addEventListener("input", () => saveInputValue("inputEnd", inputEnd.value));
  inputStep.addEventListener("input", () => saveInputValue("inputStep", inputStep.value));

  chrome.storage.local.get(["inputStart", "inputEnd", "inputStep"], function (result) {
    if (result.inputStart !== undefined) inputStart.value = result.inputStart;
    if (result.inputEnd !== undefined) inputEnd.value = result.inputEnd;
    if (result.inputStep !== undefined) inputStep.value = result.inputStep;
  });

  // Message handling for optimize button state
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message.popupAction) {
      switch (message.popupAction.event) {
        case "lockOptimizeButton":
          chrome.storage.local.set({ isOptimizing: true });
          optimizeButton.style.display = "none";
          cancelButton.style.display = "block";
          break;
        case "unlockOptimizeButton":
          chrome.storage.local.set({ isOptimizing: false });
          optimizeButton.style.display = "block";
          cancelButton.style.display = "none";
          break;
      }
    }
  });

  // "Add Parameter" button event listener
  const addParameter = document.getElementById("addParameter");


  // "Add Parameter" click event now always adds a parameter block
  addParameter.addEventListener("click", async () => {
    addParameterBlock();

    console.log("New parameter block added.");
  });

  chrome.storage.local.get("isOptimizing", function (result) {
    if (result.isOptimizing) {
      optimizeButton.style.display = "none";
      cancelButton.style.display = "block";
    } else {
      optimizeButton.style.display = "block";
      cancelButton.style.display = "none";
    }
  });

  chrome.storage.local.get(["resetButtonVisible"], function (result) {
    if (result.resetButtonVisible) {
      document.getElementById("resetButton").style.display = "flex";
    } else {
      document.getElementById("resetButton").style.display = "none";
    }
  });

  // External link handling
  var externalLinks = document.querySelectorAll(".externalLink");
  externalLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      chrome.tabs.create({ active: true, url: link.getAttribute("href") });
    });
  });


  function checkForDataUpdate() {
    chrome.storage.local.get(["data"], function (result) {
      if (result.data) {
        document.getElementById("predictTimeElement").innerHTML =
          "Estimated End Time:<br>" + result.data.formattedTime;
        document.getElementById("totalCountElement").innerHTML =
          "Total Count:<br>" + result.data.totalCount;
        document.getElementById("resetButton").style.display = "flex";
        chrome.storage.local.set({ resetButtonVisible: true });
      } else {
        document.getElementById("resetButton").style.display = "none";
        chrome.storage.local.set({ resetButtonVisible: false });
      }
    });
  }
  setInterval(checkForDataUpdate, 1000);

  // Optimize button event listener (no login check)
  optimizeButton.addEventListener("click", function () {
    performOptimizeFunction();
    checkForDataUpdate();
    chrome.storage.local.set({ isOptimizing: true, stopOptimization: false });
  });

  function saveCurrentReport() {
    chrome.storage.local.get(null, function (items) {
      var reportData = [];
      for (const [key, value] of Object.entries(items)) {
        if (key.startsWith("report-data-")) {
          reportData.push(value);
        }
      }
      if (reportData.length > 0) {
        var newReportId = "report-data-" + Date.now();
        chrome.storage.local.set({ [newReportId]: reportData }, function () {});
      }
    });
  }

  cancelButton.addEventListener("click", function () {
    if (confirm("⚠️ Do you want to cancel the optimization? \n\nNote: Once cancelled, you will not receive any report results.")) {
      cancelButton.style.display = "none";
      optimizeButton.style.display = "block";
      if (confirm("Do you want to save the current report results?")) {
        chrome.storage.local.set({ saveReport: true, userCanceled: true }, function () {
          saveCurrentReport();
        });
      } else {
        chrome.storage.local.set({ saveReport: false, userCanceled: false });
      }
    }
    chrome.storage.local.set({ stopOptimization: true, isOptimizing: false });
  });

  const closeResetButton = document.getElementById("closeResetButton");
  closeResetButton.addEventListener("click", function () {
    document.getElementById("resetButton").style.display = "none";
    chrome.storage.local.set({ resetButtonVisible: false });
  });

  const resetButton = document.getElementById("resetButton");
  resetButton.addEventListener("click", function () {
    chrome.storage.local.remove(["data"], function () {
      console.log("Data cleared from storage.");
    });
    document.getElementById("predictTimeElement").textContent = "";
    document.getElementById("totalCountElement").textContent = "";
  });

  // Removed login/account button event listeners
});

//===========================
// Optimization process function
function performOptimizeFunction() {
  const optimizeButton = document.getElementById("optimize");
  const cancelButton = document.getElementById("cancelOptimize");
  const proceedWithOptimization = confirm(
    "Start executing optimization operations. \nIMPORTANT: - Keep the 'Indicator Properties' dialog open. \n- Ensure the 'Overview' tab in the 'Strategy Tester' is open. \nFailing to do so may cause errors or terminate the optimization process."
  );

  if (!proceedWithOptimization) {
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    let tab = tabs[0];
    var userInputs = [];
    var err = CreateUserInputsMessage(userInputs);

    if (err.message == "") {
      chrome.storage.local.set({ userInputs: userInputs });
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["/src/injector.js"],
      });
      optimizeButton.style.display = "none";
      cancelButton.style.display = "block";
    } else if (err.message === "missing-parameters") {
      alert("⚠️ Fill all parameter inputs accordingly & use dot '.' as the decimal separator");
      chrome.storage.local.set({ isOptimizing: false });
    } else if (err.message === "wrong-parameter-values") {
      alert("⚠️ 'Start' value must be less than 'End' value.");
      chrome.storage.local.set({ isOptimizing: false });
    } else if (err.message === "step-too-big") {
      alert("⚠️ 'End' value cannot be smaller than 'Step' value.");
      chrome.storage.local.set({ isOptimizing: false });
    } else if (err.message === "step-zero") {
      alert("⚠️ 'Step', 'Start', and 'End' values cannot be 0 or less than 0.");
      chrome.storage.local.set({ isOptimizing: false });
    }
  });
}

//===========================
// Create user inputs message function
function CreateUserInputsMessage(userInputs) {
  var err = new Error("");
  var parameters = document.getElementById("parameters");
  var parameterCount = parameters.children.length;

  for (let i = 0; i < parameterCount; i++) {
    var defaultInput = parameters.children[i].querySelector("#inputDefault");
    var inputDefault = defaultInput.value;
    var inputStart = parameters.children[i].querySelector("#inputStart").value;
    var inputEnd = parameters.children[i].querySelector("#inputEnd").value;
    var inputStep = parameters.children[i].querySelector("#inputStep").value;

    if (defaultInput.style.display === "none") {
      if (!isNumeric(inputStart) || !isNumeric(inputEnd) || !isNumeric(inputStep)) {
        err.message = "missing-parameters";
        return err;
      }
      var start = parseFloat(inputStart);
      var end = parseFloat(inputEnd);
      var step = parseFloat(inputStep);

      if (start >= end || step < 0) {
        err.message = "wrong-parameter-values";
        return err;
      }
      if (step > end) {
        err.message = "step-too-big";
        return err;
      }
      if (step === 0) {
        err.message = "step-zero";
        return err;
      }
    } else {
      if (!isNumeric(inputDefault)) {
        err.message = "missing-parameters";
        return err;
      } else {
        inputStart = inputDefault;
        inputEnd = inputDefault;
        inputStep = "0";
      }
    }
    userInputs.push({ start: inputStart, end: inputEnd, stepSize: inputStep });
  }
  return err;
}

function isNumeric(str) {
  if (typeof str != "string") {
    return false;
  }
  return !isNaN(str) && !isNaN(parseFloat(str));
}

let optimize = document.getElementById("optimize");
let addParameter = document.getElementById("addParameter");

//===========================
// Initialize popup according to last saved parameter count
chrome.storage.local.get("userParameterCount", ({ userParameterCount }) => {
  for (let i = 1; i < userParameterCount; i++) {
    addParameterBlock();
  }
  setLastUserParameters(userParameterCount);
});
addTabEventListeners();
addSaveInputEventListener(0);

// Message handling for popup actions (duplicate listener consolidated above)
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  const optimizeButton = document.getElementById("optimize");
  const cancelButton = document.getElementById("cancelOptimize");

  if (message.popupAction) {
    switch (message.popupAction.event) {
      case "lockOptimizeButton":
        chrome.storage.local.set({ isOptimizing: true });
        optimizeButton.style.display = "none";
        cancelButton.style.display = "block";
        break;
      case "unlockOptimizeButton":
        chrome.storage.local.set({ isOptimizing: false });
        optimizeButton.style.display = "block";
        cancelButton.style.display = "none";
        break;
    }
  }
});

//===========================
// Report table creation and related event listeners
createReportTable();
addRefreshDataEventListener();

async function createReportTable() {
  await sleep(200);
  chrome.storage.local.get(null, function (items) {
    var reportData = [];
    if (items == null) {
      return;
    }
    for (const [key, value] of Object.entries(items)) {
      if (key.startsWith("report-data-")) {
        if (
          value.strategyID === "-" ||
          value.strategyName === "-" ||
          value.symbol === "-" ||
          value.timePeriod === "-" ||
          value.parameters === "-" ||
          value.maxProfit === "-"
        ) {
          continue;
        }
        var date = new Date(value.created);
        if (isNaN(date.getTime())) {
          continue;
        }
        var formattedDate =
          (date.getMonth() + 1).toString() +
          "/" +
          date.getDate() +
          "/" +
          date.getFullYear() +
          " " +
          ("0" + date.getHours()).slice(-2) +
          ":" +
          ("0" + date.getMinutes()).slice(-2);
        var report = {
          strategyID: value.strategyID,
          strategyName: value.strategyName,
          date: formattedDate,
          symbol: value.symbol,
          timePeriod: value.timePeriod,
          parameters: value.parameters,
          maxprofit: value.maxProfit,
          detail: reportDetailHtml(value.strategyID),
        };
        reportData.push(report);
      }
    }
    var $table = $("#table");
    $table.bootstrapTable({ data: reportData });
    $table.bootstrapTable("load", reportData);
  });
}

function reportDetailHtml(strategyID) {
  return (
    '<button id="report-detail-button" strategy-id="' +
    strategyID +
    '" type="button" class="btn btn-primary btn-sm"><i class="bi bi-clipboard2-data-fill"> Open</i></button>\
  <button id="remove-report" type="button" class="btn btn-danger btn-sm"><i class="bi bi-trash"></i></button>'
  );
}

function reportDetailButtonStyle(value, row, index) {
  return {
    css: {
      "text-align": "center",
      "white-space": "nowrap",
    },
  };
}

function maxProfitColumnStyle(value, row, index) {
  return { css: { "word-break": "break-all" } };
}

function parametersColumnStyle(value, row, index) {
  return { css: { "word-break": "break-word" } };
}

function symbolColumnStyle(value, row, index) {
  return { css: { "word-break": "break-all" } };
}

function strategyNameColumnStyle(value, row, index) {
  return {
    css: { "word-break": "break-word", "font-weight": "500" },
  };
}

window.openReportDetail = {
  "click #report-detail-button": function (e, value, row, index) {
    chrome.tabs.create({
      url: "report/reportdetail.html?strategyID=" + row.strategyID,
    });
  },
  "click #remove-report": function (e, value, row, index) {
    var $table = $("#table");
    chrome.storage.local.remove(["report-data-" + row.strategyID]);
    $table.bootstrapTable("remove", {
      field: "strategyID",
      values: [row.strategyID],
    });
  },
};

function addParameterBlock() {
  var parameters = document.getElementById("parameters");
  var parameterCount = parameters.children.length;

  if (parameterCount < 9999) {
    if (parameterCount > 1) {
      var removeDiv = "#remove" + parameterCount;
      parameters.lastElementChild.querySelector(removeDiv).style = "display:none;";
    }
    var orderOfParameter = parameterCount + 1;
    var divToAppend = addParameterBlockHtml(orderOfParameter);
    parameters.insertAdjacentHTML("beforeend", divToAppend);
    chrome.storage.local.set({ userParameterCount: parameterCount + 1 });
    addRemoveParameterBlockEventListener(parameterCount);
    addSaveInputEventListener(parameterCount);
  }
}

function addParameterBlockHtml(orderOfParameter) {
  return (
    '<div class="row g-2 pb-2">\
    <div>\
      <div class="d-flex justify-content-between">\
        <label for="inputStart" class="form-label">' +
    orderOfParameter +
    '. Parameter</label>\
        <div class="text-end" id="remove' +
    orderOfParameter +
    '">\
          <label for="close" class="form-label text-muted">Remove</label>\
          <button type="button" class="btn-close align-text-top remove-parameters" aria-label="Close"></button>\
        </div>\
      </div>\
      <div class="mt-auto">\
        <div class="input-group input-group">\
          <label class="custom-checkbox">\
            <input type="checkbox" class="roundCheckbox' +
    orderOfParameter +
    '" id="roundCheckbox">\
            <span class="checkmark">Skip</span>\
          </label>\
          <input type="text" aria-label="Start" placeholder="Start (Can\'t be < 0)" class="form-control inputWindow inputStart' +
    orderOfParameter +
    '" id="inputStart">\
          <input type="text" aria-label="End" placeholder="End (Must be > start)" class="form-control inputWindow inputEnd' +
    orderOfParameter +
    '" id="inputEnd">\
          <input type="text" aria-label="Step" placeholder="Step ( > 0,= script step)" class="form-control inputWindow inputStep' +
    orderOfParameter +
    '" id="inputStep">\
          <input type="text" aria-label="Default" placeholder="⚠️ Set default value (≥0) to skip" class="form-control inputWindow inputDefault' +
    orderOfParameter +
    '" id="inputDefault" style="display:none;">\
        </div>\
      </div>\
  </div>'
  );
}

function addRemoveParameterBlockEventListener(parameterCount) {
  document.querySelectorAll(".btn-close.remove-parameters")[parameterCount - 1].addEventListener("click", async (evt) => {
    var evtPath = eventPath(evt);
    for (let i = 0; i < evtPath.length; i++) {
      const element = evtPath[i];
      if (element.className == "row g-2 pb-2") {
        element.remove();
        break;
      }
    }
    var parameters = document.getElementById("parameters");
    var parameterCount = parameters.children.length;
    chrome.storage.local.set({ userParameterCount: parameterCount });
    var start = "inputStart" + parameterCount;
    var end = "inputEnd" + parameterCount;
    var step = "inputStep" + parameterCount;
    chrome.storage.local.set({ [start]: null, [end]: null, [step]: null });
    if (parameterCount > 1) {
      var removeDiv = document.getElementById("remove" + parameterCount);
      if (removeDiv) {
        removeDiv.style.display = "block";
      }
    }
  });
}

async function setLastUserParameters(parameterCount) {
  for (let i = 0; i < parameterCount; i++) {
    chrome.storage.local.get(["inputStart" + i], function (result) {
      var userValue = result["inputStart" + i] || "";
      document.querySelectorAll("#inputStart")[i].value = userValue;
    });
    chrome.storage.local.get(["inputEnd" + i], function (result) {
      var userValue = result["inputEnd" + i] || "";
      document.querySelectorAll("#inputEnd")[i].value = userValue;
    });
    chrome.storage.local.get(["inputStep" + i], function (result) {
      var userValue = result["inputStep" + i] || "";
      document.querySelectorAll("#inputStep")[i].value = userValue;
    });
  }
}

function addSaveInputEventListener(parameterCount) {
  document.querySelectorAll("#inputStart")[parameterCount].addEventListener("blur", function (e) {
    var start = "inputStart" + parameterCount;
    var value = document.querySelectorAll("#inputStart")[parameterCount].value;
    chrome.storage.local.set({ [start]: value });
  });
  document.querySelectorAll("#inputEnd")[parameterCount].addEventListener("blur", function (e) {
    var end = "inputEnd" + parameterCount;
    var value = document.querySelectorAll("#inputEnd")[parameterCount].value;
    chrome.storage.local.set({ [end]: value });
  });
  document.querySelectorAll("#inputStep")[parameterCount].addEventListener("blur", function (e) {
    var step = "inputStep" + parameterCount;
    var value = document.querySelectorAll("#inputStep")[parameterCount].value;
    chrome.storage.local.set({ [step]: value });
  });
}

function addTabEventListeners() {
  document.querySelector("#reports-tab").addEventListener("click", function () {
    document.body.style.width = "720px";
  });
  document.querySelector("#home-tab").addEventListener("click", function () {
    document.body.style.width = "720px";
  });
}

function addRefreshDataEventListener() {
  document.querySelector("#refresh").addEventListener("click", function () {
    createReportTable();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function dateSorter(a, b) {
  return new Date(a) - new Date(b);
}

function eventPath(evt) {
  var path = (evt.composedPath && evt.composedPath()) || evt.path,
    target = evt.target;
  if (path != null) {
    return path.indexOf(window) < 0 ? path.concat(window) : path;
  }
  if (target === window) {
    return [window];
  }
  function getParents(node, memo) {
    memo = memo || [];
    var parentNode = node.parentNode;
    if (!parentNode) {
      return memo;
    } else {
      return getParents(parentNode, memo.concat(parentNode));
    }
  }
  return [target].concat(getParents(target), window);
}