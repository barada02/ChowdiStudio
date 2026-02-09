import { GoogleGenAI, Type, FunctionDeclaration, Schema } from "@google/genai";
import { MODELS, SYSTEM_INSTRUCTIONS } from "../constants";
import { ChatMessage, InspirationAsset, TechPack, SourcingResult } from "../types";

// Helper to get API Key safely
const getApiKey = (): string => {
    return process.env.API_KEY || '';
};

// --- Tool Definitions ---

const generateConceptsTool: FunctionDeclaration = {
    name: 'generate_concepts',
    description: 'Generates two distinct fashion design concepts based on a detailed description.',
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

const viewAssetsTool: FunctionDeclaration = {
    name: 'view_assets',
    description: 'Request visual access to specific files from the inspiration library to analyze them. Use this when the user refers to a file you have not seen yet.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            asset_ids: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of asset IDs to view.'
            }
        },
        required: ['asset_ids']
    }
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
            return { text: `[Asset: ${asset.name}] ${asset.content}` };
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
     * Supports "Selective Context" and "Tool-based Asset Loading".
     */
    async chatWithMasterAgent(
        history: ChatMessage[], 
        lastUserMessage: string,
        inspirationAssets: InspirationAsset[],
        selectedAssetIds: string[]
    ): Promise<{ text: string; thought?: string; toolCalls?: any[] }> {
        if (!getApiKey()) return { text: "API Key missing. Please set process.env.API_KEY." };

        try {
            // 1. Prepare Metadata about ALL assets (so the AI knows what exists)
            const assetManifest = inspirationAssets.map(a => 
                `- ID: "${a.id}", Name: "${a.name}", Type: ${a.type}`
            ).join('\n');

            const dynamicSystemInstruction = `
${SYSTEM_INSTRUCTIONS.MASTER_AGENT}

AVAILABLE ASSETS (You see names only, unless selected):
${assetManifest || "No assets uploaded."}
            `;

            // 2. Identify "Active" assets (User selected)
            const activeAssets = inspirationAssets.filter(a => selectedAssetIds.includes(a.id));
            
            // 3. Construct Initial Payload
            const userContentParts: any[] = [];
            
            // Inject explicitly selected assets
            for (const asset of activeAssets) {
                const part = this.getPartFromAsset(asset);
                if (part) {
                    userContentParts.push(part);
                    userContentParts.push({ text: `[System: User is sharing asset "${asset.name}" with you]` });
                }
            }
            
            // Add user text
            userContentParts.push({ text: lastUserMessage });

            // 4. Build Context (History)
            const historyContext = history
                .filter(h => h.id !== 'init')
                .map(h => `${h.role.toUpperCase()}: ${h.content}`)
                .join('\n');
            
            const promptContext = `PREVIOUS CONVERSATION:\n${historyContext}`;

            // 5. First Call: Reasoning & Discovery
            let response = await this.ai.models.generateContent({
                model: MODELS.ORCHESTRATION, 
                contents: {
                    role: 'user',
                    parts: [{ text: promptContext }, ...userContentParts]
                },
                config: {
                    systemInstruction: dynamicSystemInstruction,
                    tools: [
                        { functionDeclarations: [generateConceptsTool, viewAssetsTool] }
                    ],
                }
            });

            // 6. Handle Tool Calls Loop (Specifically 'view_assets')
            const toolCalls = response.candidates?.[0]?.content?.parts?.filter(p => p.functionCall).map(p => p.functionCall);

            if (toolCalls && toolCalls.length > 0) {
                const viewCall = toolCalls.find(tc => tc.name === 'view_assets');
                
                // --- If AI wants to SEE something it hasn't seen yet ---
                if (viewCall) {
                    const idsToView = (viewCall.args as any).asset_ids || [];
                    const assetsToView = inspirationAssets.filter(a => idsToView.includes(a.id));
                    
                    if (assetsToView.length > 0) {
                        const newParts: any[] = [];
                        for (const asset of assetsToView) {
                            const part = this.getPartFromAsset(asset);
                            if (part) {
                                newParts.push(part);
                                newParts.push({ text: `[System: Loading requested asset "${asset.name}" into context]` });
                            }
                        }

                        // RE-PROMPT the model immediately with the requested data
                        // We treat this as an extension of the current turn
                        response = await this.ai.models.generateContent({
                            model: MODELS.ORCHESTRATION,
                            contents: {
                                role: 'user',
                                parts: [
                                    { text: promptContext }, 
                                    ...userContentParts, // Original User Input
                                    ...newParts, // The assets the AI just asked for
                                    { text: "I have loaded the assets you requested. Please proceed with the user's request." }
                                ]
                            },
                            config: {
                                systemInstruction: dynamicSystemInstruction,
                                tools: [
                                    { functionDeclarations: [generateConceptsTool] } // Don't need view_assets again in this immediate loop
                                ],
                            }
                        });
                    }
                }
            }

            // 7. Final Response Parsing
            const finalContent = response.candidates?.[0]?.content;
            const textParts = finalContent?.parts.filter(p => p.text).map(p => p.text).join('\n');
            const finalToolCalls = finalContent?.parts.filter(p => p.functionCall).map(p => p.functionCall);

            return {
                text: textParts || (finalToolCalls?.length ? "Processing design parameters..." : "I'm thinking..."),
                thought: finalToolCalls?.length ? "Orchestrating design parameters based on context..." : undefined,
                toolCalls: finalToolCalls
            };

        } catch (error) {
            console.error("Master Agent Error:", error);
            return { text: "I encountered an error processing the inputs. Please ensure assets are valid format." };
        }
    }

    /**
     * GENERATION STEP 1: Hero Image (Source of Truth)
     * Creates a high-fidelity, realistic lookbook shot.
     */
    async generateHeroImage(prompt: string): Promise<string> {
        if (!getApiKey()) return "https://picsum.photos/800/1200";

        try {
            // Updated Prompt: Strict Single Subject Enforcement
            const finalPrompt = `
                High fashion photography, full body shot of a SINGLE model wearing: ${prompt}.
                Professional studio lighting, 8k resolution, detailed texture, vogue editorial style.
                
                NEGATIVE PROMPT / CONSTRAINTS:
                - Single person only. Do NOT generate multiple figures.
                - Do NOT use split screen, collage, or grid layout.
                - No zoomed-in insets or detail shots in the main image.
                - No text overlays.
            `;

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
            console.error("Hero Gen Error:", error);
            return "https://picsum.photos/seed/error/800/1200"; 
        }
    }

    /**
     * GENERATION STEP 2: Fashion Illustration (Artistic Mood Sketch)
     * Takes the Hero Image and converts it into a dual-view (Front/Back) Fashion Croquis.
     */
    async generateFashionIllustration(heroImageBase64: string): Promise<string> {
        if (!getApiKey()) return "https://picsum.photos/800/600"; 

        try {
            const base64Data = heroImageBase64.split(',')[1];
            
            const sketchPrompt = `
                Create a professional Fashion Design Sketch showing TWO views side-by-side:
                1. Front View (Walking pose)
                2. Back View (Standing pose, showing rear details)
                
                Style: High-fashion croquis illustration.
                Medium: Copic markers, watercolor wash, and fine ink outlines.
                Proportions: Elongated 9-head fashion figure (stylized long legs, small head).
                Execution: Informative but artistic. Show drape, seam lines, and texture clearly.
                Background: Cream colored textured art paper. Isolate the figures. Remove all photorealistic scenery.
            `;

            const response = await this.ai.models.generateContent({
                model: MODELS.IMAGE_GEN,
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/png', data: base64Data } },
                        { text: sketchPrompt }
                    ]
                }
            });

            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
            return heroImageBase64; 

        } catch (error) {
            console.error("Illustration Gen Error:", error);
            return heroImageBase64;
        }
    }

    /**
     * GENERATION STEP 3: Technical Sketch (Production Ready)
     * Takes the Hero Image and converts it into a combined Front & Back technical flat.
     * This is usually called when moving to Blueprint.
     */
    async generateTechnicalSketch(heroImageBase64: string): Promise<string> {
        if (!getApiKey()) return "https://picsum.photos/800/600";

        try {
            const base64Data = heroImageBase64.split(',')[1];
            
            const technicalPrompt = `
                Create a professional Fashion Design Technical Flat Sketch based on the outfit in the image.
                Layout: Show BOTH Front View and Back View side-by-side in a single frame.
                Style: Black and white line art, clean lines, minimal shading, white background.
                Detail: Capture all seams, pockets, and construction details from the source image.
                No model, just the garment (or mannequin).
            `;

            const response = await this.ai.models.generateContent({
                model: MODELS.IMAGE_GEN,
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/png', data: base64Data } },
                        { text: technicalPrompt }
                    ]
                }
            });

            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
            return heroImageBase64;

        } catch (error) {
            console.error("Technical Gen Error:", error);
            return heroImageBase64;
        }
    }

    /**
     * GENERATES TECH PACK DATA (JSON)
     * Analyzes the images to produce specifications, BOM, and measurements.
     */
    async generateTechPack(heroUrl: string): Promise<TechPack> {
        if (!getApiKey()) throw new Error("API Key missing");

        try {
             const base64Data = heroUrl.split(',')[1];

             const schema: Schema = {
                type: Type.OBJECT,
                properties: {
                    style_number: { type: Type.STRING },
                    season: { type: Type.STRING },
                    currency: { type: Type.STRING },
                    fabrication_notes: { type: Type.ARRAY, items: { type: Type.STRING } },
                    construction_details: { type: Type.ARRAY, items: { type: Type.STRING } },
                    total_cost_estimate: { type: Type.NUMBER },
                    bom: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                location: { type: Type.STRING },
                                item: { type: Type.STRING },
                                description: { type: Type.STRING },
                                quantity: { type: Type.STRING },
                                cost_estimate: { type: Type.NUMBER }
                            }
                        }
                    },
                    measurements: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                pom: { type: Type.STRING },
                                value: { type: Type.NUMBER },
                                unit: { type: Type.STRING },
                                tolerance: { type: Type.NUMBER }
                            }
                        }
                    }
                },
                required: ['style_number', 'bom', 'measurements']
            };

            const response = await this.ai.models.generateContent({
                model: MODELS.REASONING, // Gemini 3 Pro
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/png', data: base64Data } },
                        { text: "Analyze this fashion design and generate a complete Technical Pack JSON. Act as a senior garment technologist. Estimate realistic measurements for a sample size M." }
                    ]
                },
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: schema
                }
            });

            if (response.text) {
                return JSON.parse(response.text) as TechPack;
            }
            throw new Error("Failed to generate Tech Pack JSON");

        } catch (error) {
            console.error("TechPack Gen Error:", error);
            throw error;
        }
    }

    /**
     * CODE EXECUTION: DEEP COST & YIELD ANALYSIS
     * Uses Gemini to write and run Python code to calculate precise yields and generate charts.
     */
    async runDeepCostAnalysis(techPack: TechPack): Promise<{yieldText: string, chartUrl: string}> {
        if (!getApiKey()) return { yieldText: "API Key Required", chartUrl: "" };

        try {
            // Context for the Python Agent
            const bomContext = techPack.bom.map(i => `${i.item} (${i.description}): ${i.quantity} @ $${i.cost_estimate}`).join('; ');
            const prompt = `
                I have a fashion tech pack with the following BOM: ${bomContext}.
                Total Est Cost: ${techPack.total_cost_estimate}.
                
                TASK 1: Write a Python script to calculate the Total Fabric Yield for 100 units.
                Assume standard 58" fabric width. Calculate efficiency with 15% wastage.
                Print the result clearly.

                TASK 2: In the same script, use 'matplotlib' to generate a Pie Chart for the Cost Breakdown.
                Categories: Fabric, Trims, Labor (Assume labor is 40% of total if not specified), Overhead.
                Save the chart.
            `;

            const response = await this.ai.models.generateContent({
                model: MODELS.REASONING, // Reasoning model handles code execution best
                contents: { parts: [{ text: prompt }] },
                config: {
                    tools: [{ codeExecution: {} }]
                }
            });

            let yieldText = "";
            let chartUrl = "";

            // Parse Response for Text output and Image artifacts
            const parts = response.candidates?.[0]?.content?.parts;
            if (parts) {
                for (const part of parts) {
                    // 1. Text Output (Yield Calculation)
                    if (part.text) {
                        yieldText += part.text;
                    }
                    
                    // 2. Image Output (Matplotlib Chart)
                    // Code execution results often return inlineData with mimeType 'image/png'
                    if (part.inlineData && part.inlineData.mimeType === 'image/png') {
                        chartUrl = `data:image/png;base64,${part.inlineData.data}`;
                    }
                    
                    // Sometimes it comes in executableCodeResult (less common in simple API, but good to check)
                     if ((part as any).executableCodeResult?.outcome === 'OUTCOME_OK') {
                        // The text output might be here in some versions, but usually it's in a separate text part
                    }
                }
            }

            return { yieldText, chartUrl };

        } catch (error) {
            console.error("Deep Analysis Error:", error);
            return { yieldText: "Failed to execute analysis logic.", chartUrl: "" };
        }
    }

    /**
     * SOURCING AGENT
     * Finds real world suppliers for fabrics using Google Search Grounding.
     */
    async searchSuppliers(query: string): Promise<SourcingResult[]> {
        if (!getApiKey()) return [];

        try {
            const response = await this.ai.models.generateContent({
                model: MODELS.REASONING, // Gemini 3 Pro supports tools
                contents: {
                    parts: [{ text: `Find wholesale fabric suppliers for: ${query}. Return a list of specific products found.` }]
                },
                config: {
                    tools: [{ googleSearch: {} }]
                }
            });

            const results: SourcingResult[] = [];
            
            // Extract from Grounding Chunks
            const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (chunks) {
                chunks.forEach(chunk => {
                    if (chunk.web?.uri && chunk.web?.title) {
                        results.push({
                            query: query,
                            title: chunk.web.title,
                            url: chunk.web.uri,
                            snippet: '' // Grounding chunks might not have snippets in this exact structure
                        });
                    }
                });
            }

            return results.slice(0, 5); // Limit to top 5

        } catch (error) {
            console.error("Sourcing Error:", error);
            return [];
        }
    }

    /**
     * Edits an image based on a mask (drawing) and instruction.
     */
    async editImage(canvasBase64: string, instruction: string): Promise<string> {
        if (!getApiKey()) return canvasBase64;

        try {
            const base64Data = canvasBase64.split(',')[1];
            
            const visualPrompt = `
                I have provided an image with RED SEMI-TRANSPARENT STROKES drawn over it.
                These red strokes represent a MASK.
                
                TASK:
                1. Identify the area covered by the RED strokes.
                2. Apply the following change ONLY to that area: "${instruction}".
                3. Keep the rest of the image exactly the same.
                4. The final output must NOT have the red strokes. It should look like a finished, clean fashion design.
            `;

            const response = await this.ai.models.generateContent({
                model: MODELS.IMAGE_EDIT, 
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/png', data: base64Data } },
                        { text: visualPrompt }
                    ]
                }
            });

             for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
            return canvasBase64;

        } catch (error) {
            console.error("Edit Error:", error);
            return canvasBase64;
        }
    }

    /**
     * Generates a video using Veo (gemini-video model).
     */
    async generateRunwayVideo(imageBase64: string, scenarioPrompt: string): Promise<string> {
        if (!getApiKey()) throw new Error("API Key missing");
        
        try {
            const base64Data = imageBase64.split(',')[1];
            const mimeType = imageBase64.split(';')[0].split(':')[1];

            // Use Veo model for video generation
            // Note: In a real paid environment, we use 'veo-3.1-fast-generate-preview' or 'veo-3.1-generate-preview'
            // We follow the protocol: generateVideos -> poll operation -> fetch result
            
            console.log("Starting Video Generation...");
            
            let operation = await this.ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt: `Cinematic fashion video. A fashion model wearing this exact dress design walking in a ${scenarioPrompt}. High fashion, detailed texture, 4k, slow motion walk.`,
                image: {
                    imageBytes: base64Data,
                    mimeType: mimeType || 'image/png',
                },
                config: {
                    numberOfVideos: 1,
                    resolution: '720p',
                    aspectRatio: '9:16' // Portrait for mobile/Instagram style
                }
            });

            console.log("Video Operation started:", operation);

            // Poll for completion
            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
                operation = await this.ai.operations.getVideosOperation({operation: operation});
                console.log("Polling video status...");
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!downloadLink) throw new Error("No video URI returned");

            // Fetch the actual bytes (appending key is required for Veo links)
            const videoResponse = await fetch(`${downloadLink}&key=${getApiKey()}`);
            const videoBlob = await videoResponse.blob();
            
            return URL.createObjectURL(videoBlob);

        } catch (error) {
            console.error("Runway Video Gen Error:", error);
            throw error; // Propagate to UI
        }
    }

    /**
     * Generates a high-quality photoshoot image using Imagen or Gemini Pro Image.
     */
    async generateRunwayPhoto(imageBase64: string, scenarioPrompt: string): Promise<string> {
        if (!getApiKey()) return imageBase64;

        try {
            const base64Data = imageBase64.split(',')[1];
            
            // Image-to-Image generation for context placement
            const prompt = `Professional fashion photography, full body shot. A model wearing this outfit in a ${scenarioPrompt}. Photorealistic, 8k, vogue magazine style, dramatic lighting.`;

            const response = await this.ai.models.generateContent({
                model: 'gemini-3-pro-image-preview', // Using Pro for highest fidelity
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/png', data: base64Data } },
                        { text: prompt }
                    ]
                }
            });

            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
            throw new Error("No photo generated");

        } catch (error) {
            console.error("Runway Photo Error:", error);
            throw error;
        }
    }
}

export const geminiService = new GeminiService();