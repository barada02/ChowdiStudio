import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { MODELS, SYSTEM_INSTRUCTIONS } from "../constants";
import { ChatMessage, InspirationAsset, ViewType } from "../types";

// Helper to get API Key safely
const getApiKey = (): string => {
    return process.env.API_KEY || '';
};

// --- Tool Definitions ---

const generateConceptsTool: FunctionDeclaration = {
    name: 'generate_concepts',
    description: 'Generates two distinct fashion design concepts (Front and Back views) based on a detailed description.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            concept1_description: { type: Type.STRING, description: 'Visual prompt for Concept 1' },
            concept1_name: { type: Type.STRING, description: 'Creative name for Concept 1' },
            concept2_description: { type: Type.STRING, description: 'Visual prompt for Concept 2' },
            concept2_name: { type: Type.STRING, description: 'Creative name for Concept 2' },
        },
        required: ['concept1_description', 'concept1_name', 'concept2_description', 'concept2_name'],
    },
};

// --- Service Class ---

class GeminiService {
    private ai: GoogleGenAI;

    constructor() {
        const key = getApiKey();
        this.ai = new GoogleGenAI({ apiKey: key });
    }

    /**
     * Converts a data URL (e.g. "data:image/png;base64,ABC...") into the part format expected by GenAI SDK.
     */
    private getPartFromAsset(asset: InspirationAsset) {
        if (asset.type === 'text') {
            return { text: `[Inspiration Text: ${asset.name}] ${asset.content}` };
        }

        // For Image/Video/Audio, extract base64 data
        const base64Data = asset.content.split(',')[1];
        if (!base64Data) return null;

        return {
            inlineData: {
                mimeType: asset.mimeType,
                data: base64Data
            }
        };
    }

    /**
     * The Master Agent orchestrates the conversation and tool usage.
     * Now supports Multimodal Inputs (Images/Videos).
     */
    async chatWithMasterAgent(
        history: ChatMessage[], 
        lastUserMessage: string,
        inspirationAssets: InspirationAsset[]
    ): Promise<{ text: string; thought?: string; toolCalls?: any[] }> {
        if (!getApiKey()) return { text: "API Key missing. Please set process.env.API_KEY." };

        try {
            // 1. Build the Multimodal Message for the *current* turn.
            // We append all inspiration board items to the current user message so the model "sees" them now.
            const userContentParts: any[] = [];

            // Add Assets
            for (const asset of inspirationAssets) {
                const part = this.getPartFromAsset(asset);
                if (part) userContentParts.push(part);
            }

            // Add User Text
            userContentParts.push({ text: lastUserMessage });

            // 2. Construct Conversation History for Context
            // We convert the simplified ChatMessage history into what the SDK expects (Content objects),
            // but for simplicity and statelessness in this demo, we often rely on the 'systemInstruction' + current payload.
            // Ideally, you would format `history` into `Content[]`. 
            // For this implementation, we will treat previous history as text context to save token overhead on repeated images,
            // but strictly send the *current* inspiration board assets as real multimodal parts.
            
            const historyContext = history
                .filter(h => h.id !== 'init') // Skip init message
                .map(h => `${h.role.toUpperCase()}: ${h.content}`)
                .join('\n');

            const systemPrompt = `${SYSTEM_INSTRUCTIONS.MASTER_AGENT}\n\nPREVIOUS CONVERSATION:\n${historyContext}`;

            // 3. Call the API
            const response = await this.ai.models.generateContent({
                model: MODELS.ORCHESTRATION, 
                contents: {
                    role: 'user',
                    parts: userContentParts // Contains Images, Videos, and Text
                },
                config: {
                    systemInstruction: systemPrompt,
                    tools: [
                        { functionDeclarations: [generateConceptsTool] }
                    ],
                }
            });

            // 4. Parse Response
            const candidates = response.candidates;
            if (!candidates || candidates.length === 0) return { text: "No response from AI." };

            const content = candidates[0].content;
            
            const textParts = content.parts.filter(p => p.text).map(p => p.text).join('\n');
            const toolCalls = content.parts.filter(p => p.functionCall).map(p => p.functionCall);

            return {
                text: textParts || (toolCalls.length > 0 ? "Analyzing visual data and generating concepts..." : ""),
                thought: toolCalls.length > 0 ? "Orchestrating design parameters based on visual input..." : undefined,
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined
            };

        } catch (error) {
            console.error("Master Agent Error:", error);
            return { text: "I encountered an error processing the multimodal inputs. Please check if the video/image size is within limits." };
        }
    }

    /**
     * Generates an image using the high-quality image model.
     */
    async generateImage(prompt: string, view: 'Front View' | 'Back View'): Promise<string> {
        if (!getApiKey()) return "https://picsum.photos/800/1200";

        try {
            const finalPrompt = `High fashion technical drawing, ${view}, ${prompt}, plain neutral background, photorealistic 8k, fashion design sketch style.`;

            const response = await this.ai.models.generateContent({
                model: MODELS.IMAGE_GEN,
                contents: { parts: [{ text: finalPrompt }] },
            });

            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
            throw new Error("No image generated");

        } catch (error) {
            console.error("Image Gen Error:", error);
            return "https://picsum.photos/seed/error/800/1200"; 
        }
    }

    /**
     * Edits an image based on a mask (drawing) and instruction.
     */
    async editImage(originalBase64: string, instruction: string): Promise<string> {
        if (!getApiKey()) return originalBase64;

        try {
            const base64Data = originalBase64.split(',')[1];
            const response = await this.ai.models.generateContent({
                model: MODELS.IMAGE_EDIT, 
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/png', data: base64Data } },
                        { text: `Edit this fashion design: ${instruction}. Keep the rest of the design exactly the same.` }
                    ]
                }
            });

             for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
            return originalBase64;

        } catch (error) {
            console.error("Edit Error:", error);
            return originalBase64;
        }
    }
}

export const geminiService = new GeminiService();
