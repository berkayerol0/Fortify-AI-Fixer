import fetch from 'node-fetch';

export interface ParsedAIResponse {
    explanation: string;
    codeBlocks: Map<string, string>; 
}

function parseAIResponse(responseText: string): ParsedAIResponse {
    const explanationMatch = responseText.match(/# Explanation:\s*([\s\S]*?)(?=#\s\w|#\s*$)/);
    const explanation = explanationMatch ? explanationMatch[1].trim() : "AI did not provide an explanation.";

    const codeBlocks = new Map<string, string>();
    const codeBlockRegex = /#\s*([^\n]+)\s*```(?:\w*\n)?([\s\S]*?)```/g;
    
    let match;
    while ((match = codeBlockRegex.exec(responseText)) !== null) {
        const filePath = match[1].trim().replace(/['"`]/g, '');
        const code = match[2].trim();

        if (filePath.includes('(IF NECESSARY)') || filePath.includes('path/to/other/affected/file')) {
            continue; 
        }

        codeBlocks.set(filePath, code);
    }

    if (codeBlocks.size === 0) {
        console.error("Full AI response text (no code blocks found):\n", responseText);
        throw new Error("AI response did not return a code block in the expected format.");
    }

    return { explanation, codeBlocks };
}

export async function callAIApiForFix(prompt: string, apiKey: string): Promise<ParsedAIResponse> {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.2,
                    topP: 0.95,
                    maxOutputTokens: 8192 
                }
            })
        });

        const data: any = await response.json();

        if (!response.ok || data.error) {
            const errorMessage = data.error?.message || `API request failed with status ${response.status}.`;
            console.error("AI API Error Detail:", JSON.stringify(data, null, 2));
            throw new Error(errorMessage);
        }

        if (!data.candidates || data.candidates.length === 0) {
            console.error("AI did not return a candidate solution (likely due to safety filter):", JSON.stringify(data, null, 2));
            throw new Error("AI could not generate a solution. (Response may have been blocked by safety filters)");
        }

        const responseText = data.candidates[0].content.parts[0].text;
        
        return parseAIResponse(responseText);

    } catch (error: any) {
        throw new Error(`AI API call or response processing failed: ${error.message}`);
    }
}