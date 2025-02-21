![OmniOptimizer Logo](/images/icons/OmniOptimizerLogo.png)

# OmniOptimizer: The Ultimate Trading Strategy Optimizer

OmniOptimizer is a Chrome extension that leverages advanced algorithmic optimization techniques—such as Genetic, Traversal, and Bayesian algorithms—to dynamically refine trading strategies on TradingView. By simulating user interactions and monitoring performance metrics, OmniOptimizer helps traders optimize their strategy parameters and maximize profits.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture & File Structure](#architecture--file-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Technical Details](#technical-details)
- [Contribution](#contribution)
- [License](#license)

---

## Overview

OmniOptimizer is designed to simplify the process of optimizing trading strategies. The extension injects scripts into TradingView’s pages to simulate trading parameter adjustments, monitors key performance indicators such as net profit and drawdowns, and generates detailed reports accessible via a dashboard.

---

## Features

- **Multi-Algorithm Optimization:** Choose between Traversal, Genetic, and Bayesian algorithms.
- **Real-Time Reports:** Generates detailed reports with performance metrics and downloadable CSV reports.
- **User-Friendly Interface:** Dashboard and report pages built with Bootstrap for a modern look.
- **Seamless Integration:** Injects scripts into TradingView’s indicator properties dialog for dynamic parameter tuning.
- **Robust Error Handling:** Uses try/catch structures and custom events to ensure a smooth optimization process.

---

## Architecture & File Structure

- **manifest.json** – Chrome extension manifest specifying content scripts, background scripts, and permissions.
- **src/**
  - **dashboard/** – Contains `dashboard.html`, `dashboard.css`, and `dashboard.js` for the main UI.
  - **report/** – Houses `reports.html`, `reports.css`, and `reports.js` for displaying optimization reports.
  - **controller.js** – Main logic for executing optimization routines.
  - **optimizer.js** – Handles background tasks and message passing.
  - **injector.js** – Injects scripts into TradingView pages and manages overlay UI.
  - **utils/** – Utility scripts including event listeners and helper functions.
  - **algorithms/** – Implements optimization logic (genetic, traversal, bayesian).

---

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/OmniOptimizer.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `/Users/pgjoslyn/Desktop/Development/OmniOptimizerExtension` directory.
5. The extension is now installed and will integrate with TradingView when active.

---

## Usage

1. Navigate to TradingView and open the strategy settings dialog.
2. Launch the OmniOptimizer dashboard from the extension popup.
3. Choose your desired optimization algorithm from the dropdown (Genetic, Traversal, Bayesian).
4. Enter your parameter ranges and step values in the provided fields.
5. Click **Optimize** to start the process. The extension will simulate parameter changes, perform backtests, and update real-time predictions.
6. Once complete, view detailed reports and download CSV summaries from the reports page.

---

## Technical Details

- **Languages:** JavaScript (ES2020), HTML5, CSS3
- **Frameworks & Libraries:** Bootstrap, jQuery, Bootstrap-Table
- **Coding Standards:** Following Airbnb JavaScript Style Guide with ESLint for code quality.
- **Module Structure:** Utilizes ES6 module imports/exports with clear separation of concerns for UI and logic.
- **Optimization Techniques:** Offers multiple algorithms based on dynamic population sizing, mutation probability, and Bayesian surrogate modeling.

---

## Contribution

Contributions are welcome. Please fork the repository and submit pull requests for improvements or new features. Make sure to follow the existing coding conventions and add tests where applicable.

---

## License

This project is licensed under the GNU General Public License. See the [LICENSE](LICENSE) file for details.

---

OmniOptimizer is designed to empower traders with advanced optimization tools while maintaining an intuitive and robust user experience.
