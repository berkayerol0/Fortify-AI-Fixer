import { Vulnerability } from '../core/group';
import { CodeContext } from '../core/contextResolver';

export function generateChosenIssuePrompt(vulnerability: Vulnerability, allContexts: CodeContext[]): string {
  
  const contextBlocks = allContexts.map(ctx => 
    `# Full Code Context for File: ${ctx.filePath}\n\`\`\`${ctx.language}\n${ctx.content}\n\`\`\``
  ).join('\n\n---\n\n');

  return `
# Task
Your primary goal is to fix the software security vulnerability detailed below. You are an expert senior developer who writes clean, efficient, and production-ready code.

# Critical Instructions (Follow these rules strictly)
1.  **Analyze Layered Architecture:** This project uses a layered architecture. I have provided you with the full code context of the primary file AND any related files (Repositories, Services) I could find. Your fix MUST be applied to all necessary layers.
2.  **Verify Existing Code:** Before inventing a new method, CHECK if a similar method already exists in the provided code contexts. Do not call methods that are not defined in the contexts I provide.
3.  **Provide Complete Files:** For each file you modify, you MUST return the ENTIRE, complete code.
4.  **Multi-File Response:** If your solution touches more than one file, you MUST provide a separate, complete code block for each file.

# Vulnerability Details
- Category: ${vulnerability.category}
- Description: ${vulnerability.abstract}
- **Primary Vulnerable File:** ${vulnerability.filePath}
- Vulnerable Line: ${vulnerability.line}

${contextBlocks}

# Response Format (Strictly adhere to this format!)
# Explanation:
Write a brief technical explanation of your solution. If you modified multiple files, explain why it was necessary for each layer.

# path/to/modified/file1.java
\`\`\`java
// The fully corrected and complete code for this file goes here.
\`\`\`

# (IF NECESSARY) path/to/other/affected/file2.java
\`\`\`java
// The fully corrected and complete code for the other affected file goes here.
\`\`\`
`;
}