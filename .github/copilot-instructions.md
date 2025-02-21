# Custom Instructions for GitHub Copilot in VS Code

## General Context
- **Project Types:** Web development, Chrome extensions, stock strategy apps, and complex algorithms. Getting into machine learning.
- **Programming Languages:** JavaScript (ECMAScript 2020, latest version), HTML, CSS, and Pine Script v5 for TradingView strategies.
- **Frameworks & Libraries:** React, Vue, Vite.
- **Coding Standards:**
  - **Style Guide:** Airbnb JavaScript Style Guide.
  - **Linting:** ESLint for static code analysis.
  - **Naming Conventions:**
    - `camelCase` for variables and functions.
    - `PascalCase` for classes and TypeScript interfaces.
    - `UPPER_CASE` for constants.
  - **Code Structure:**
    - Prefer `const` and `let` over `var`.
    - Use arrow functions (`=>`) where applicable.
    - Avoid deeply nested callbacks (prefer async/await).
  - **Modules:**
    - Use ES6 modules (import/export).
    - Keep functions and classes in separate files.
    - Keep HTML, CSS in separate files as needed.

## Code-Generation Instructions
- **Documentation:** Professional comment headers for JavaScript files but avoid excessive comments. Generate comments for complex logic, but not for simple or self-explanatory code.
- **Naming:** Use descriptive, purpose-relevant names; avoid generic names.
- **Error Handling:** Include `try/catch` and assertions where applicable.
- **File Structure:** Keep functions, classes in separate files; keep HTML, CSS in separate files.
- **Design Patterns:** Project-dependent, use best-fit patterns based on context. Flexibility is key, consider alternatives and best options for each case.
- **Context-Aware Updates:** Ensure if variables are renamed or modified, the change reflects across all references to avoid errors.

## Test-Generation Instructions
- **Testing Frameworks:** Jest for JavaScript, JUnit for Java.
- **Test Scope:** Generate tests only when requested. Ensure clarity on test coverage for specific modules.
- **Test Organization:** Follow high-level best practices (modular, independent, repeatable tests). Tests should be organized for readability and maintainability.
- **Mock Data:** Use mock data where applicable, unless real data is necessary.
- **TDD:** Not required.

## Code Review Instructions
### Issues to Flag
1. **Syntax & Compilation Errors:**
   - Missing brackets, incorrect declarations.
   - Unreachable code and unused variables/imports.
2. **Logical Errors & Code Smells:**
   - Off-by-one errors in loops.
   - Incorrect boolean checks, type coercion (`==` vs `===`).
   - Direct state mutation in React.
3. **Performance Issues:**
   - Inefficient loops, unnecessary nested iterations.
   - Unnecessary re-renders in React.
   - Repeated database queries (e.g., N+1 problem).
4. **Security Vulnerabilities:**
   - SQL injection risks (unparameterized queries).
   - Hardcoded secrets, API keys, credentials.
   - XSS risks from unsanitized user input.
5. **Maintainability & Readability:**
   - Magic numbers, hardcoded strings.
   - Long functions (>100 lines) or deeply nested logic.
   - Non-descriptive names.
6. **Best Practices & Styling:**
   - Inconsistent indentation, spacing, and formatting.
   - Missing linter rules (ESLint, Prettier).
   - Mixing `var`, `let`, `const`.
7. **Language-Specific Issues:**
   - Handling of `null`/`undefined` in JS/TypeScript.
   - Misuse of `async/await`, missing error handling.

### Review Approach
- Focus on **readability** with a **balance of optimization** improvements.
- Do not eliminate code for readability alone; highlight improvement areas.
- Address **security concerns** thoroughly.
- Suggest **refactoring** for long functions or repeated code.
- Provide feedback inline or in chat—avoid excessive in-line comments unless necessary.

## Commit Message Generation Instructions
- **Commit Message Format:** Follow **Conventional Commits**.
- **Detail Level:** Brief summary (no need for detailed explanations unless requested).
- **Issue References:** Optional.
- **Git Conventions:** No specific requirement.
- **Alternative Suggestions:** Optional.
