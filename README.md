# Fortify AI Fixer

A powerful Visual Studio Code extension for managing, reviewing, and remediating Fortify SCA vulnerabilities—now with AI-powered auto-fix, persistent status management, and seamless Git integration.

This extension transforms the manual, time-consuming process of fixing security findings into a streamlined, semi-automated workflow directly within the developer's IDE.

## Features

-   **Direct `.fpr` Report Loading:** Import and parse Fortify Static Code Analyzer (`.fpr`) reports directly in VS Code, eliminating the need for external tools.
-   **Vulnerability Explorer:** Browse, group by severity (`Critical`, `High`, etc.), and navigate vulnerabilities in a dedicated sidebar. Clicking an issue takes you directly to the code.
-   **AI-Powered Remediation:** Utilizes the Google Gemini API to generate intelligent, context-aware code fixes with a single click. The underlying prompt engineering is designed to understand layered architectures (e.g., Controller -> Service -> Repository).
-   **Batch & Group Fixing:** Accelerate remediation by fixing all vulnerabilities in a specific severity group (e.g., "Fix All High") or all open vulnerabilities at once.
-   **Interactive Diff Review:** Before applying any AI-generated change, a clear side-by-side "Diff View" is presented, ensuring the developer has full control and must explicitly approve every modification.
-   **Persistent Status Management:** Mark findings as `[FIXED]` after applying a fix or as `[IGNORED]` for false positives. This status is saved per workspace, ensuring consistency across sessions and for the entire team.
-   **Automated Build Validation:** After applying fixes, trigger a project build (`mvn` or `gradlew`) directly from the extension with a single click to instantly verify that the AI's changes have not introduced compilation errors.
-   **Integrated Git Workflow:** Streamline your workflow with built-in prompts to `Commit & Push` or `Commit Only` after a successful fix, closing the loop from detection to integration.

## Getting Started

### 1. Installation
-   Download the `.vsix` file.
-   In Visual Studio Code, navigate to the **Extensions** view (`Ctrl+Shift+X`).
-   Click the `...` menu in the top-right corner, select **"Install from VSIX..."**, and choose the downloaded file.

### 2. Configuration
-   Open your VS Code User or Workspace Settings (`Ctrl+,`).
-   Search for **"Fortify AI Fixer"**.
-   In the **"Fortify-plugin-deneme1: Gemini Api Key"** field, enter your Google Gemini API key.

### 3. Usage Workflow
1.  **Load a Fortify Report:** Open the "Fortify Findings" sidebar (`🛡️` icon) and click the Folder icon (`📂`) to load your `.fpr` report.
2.  **Review Vulnerabilities:** Browse the vulnerabilities, which are automatically grouped by severity.
3.  **Take Action:** Hover over any vulnerability or severity group to use the inline action icons:
    -   `✨` **Fix with AI:** Generate an AI-powered fix for a single issue.
    -   `🔧` **Fix All In This Group:** Fix all vulnerabilities in that severity group.
    -   `🚫` **Mark as False Positive:** Ignore a finding.
    -   `↩️` **Unmark as Fixed/Ignored:** Revert the status of an issue.
4.  **Batch Fix:** Use the Lightning Bolt icon (`⚡`) in the panel header to fix all open vulnerabilities at once.
5.  **Build Your Project:** After applying fixes, you will be prompted to run a build to validate the changes.
6.  **Commit Your Changes:** After a successful build, you will be prompted to commit your changes using the integrated Git workflow.

## How it Works
The extension follows a logical, end-to-end process to ensure a seamless experience:

1.  **Parse & Map:** The user loads an `.fpr` report. The extension parses the zipped XML data and intelligently maps build paths (e.g., `target/classes`) to editable source paths (`src/main/java`).
2.  **Display:** Vulnerabilities are displayed in the custom tree view, with their status (`Fixed`, `Ignored`) loaded from persistent workspace storage.
3.  **Analyze Context for AI:** When a fix is requested, the `contextResolver` module analyzes the vulnerable file's `import` statements to find related files (e.g., Repositories, Services). The full code of all relevant files is sent to the AI to provide maximum context.
4.  **Generate & Review:** A detailed prompt is sent to the Gemini API. The AI's suggested fix is then presented to the user in a Diff View for final review and approval. Nothing is applied automatically.
5.  **Validate & Integrate:** Once approved, the fix is applied. The extension then offers to run a build for immediate validation. Finally, it presents options to commit the changes, completing the workflow.

## Security & Privacy
Security and data privacy are paramount. The extension is designed with the following principles in mind:

🛡️ **How Security Works**
-   **User Control:** No code is ever modified without your explicit approval via the Diff View. You are in full control of every change.
-   **Build Validation:** The automated build step acts as a crucial safeguard, immediately flagging any AI-generated code that causes compilation failures.
-   **Local Processing:** All report parsing and status management happens entirely on your local machine.

🔐 **Data Privacy**
-   **API Keys:** Your Google Gemini API key is stored securely in your local VS Code settings and is only used to communicate with the Google API. It is never transmitted elsewhere.
-   **Code Transmission:** To provide the necessary context for an accurate fix, the content of the vulnerable file and its directly related, imported files are sent to the AI provider. The extension does not send your entire project's codebase.
-   **No Data Collection:** The extension does not collect, store, or transmit any telemetry or user data.

⚠️ **Security Best Practices for Users**
-   **Always Review AI Suggestions:** Treat AI-generated code as you would a code review suggestion from a colleague. Always review it before accepting.
-   **Test After Fixes:** Use the integrated build feature and run your own tests to ensure the application's logic remains correct after a fix.
-   **Use Version Control:** Commit changes frequently to maintain a clear history of what has been modified.

## FAQ
**Q: Which AI model is used?**
A: The extension is currently configured for Google's Gemini API (`gemini-pro` model) for its balance of performance, cost, and availability in the free tier.

**Q: How do I handle a "Model is overloaded" or "Quota exceeded" error?**
A: These errors come directly from the Google API. "Overloaded" errors are usually temporary; wait a few minutes and try again. "Quota" errors mean you have exceeded your free usage limits for the day or minute; you may need to wait or check your Google Cloud account.

**Q: How do I sign in to Git/GitHub?**
A: The extension uses your existing Git authentication within VS Code. As long as you are logged into your account via the Source Control panel, the `Commit & Push` feature will work seamlessly.

## Contributing
Contributions, bug reports, and feature requests are welcome! Please open an issue or submit a pull request on the project's GitHub repository.

## License
This project is licensed under the **MIT License**.