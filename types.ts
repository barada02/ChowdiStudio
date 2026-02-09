// Domain Types

export enum ViewType {
    HERO = 'HERO', // Realistic Model View (Source of Truth)
    ILLUSTRATION = 'ILLUSTRATION', // Artistic Fashion Sketch (Mood/Texture)
    TECHNICAL = 'TECHNICAL' // Combined Front/Back Schematic (Production)
}

export interface DesignImage {
    id: string;
    url: string; // Base64 data URL
    view: ViewType;
    conceptId: string;
}

export interface DesignConcept {
    id: string;
    name: string;
    description: string;
    images: {
        hero?: DesignImage;
        illustration?: DesignImage;
        technical?: DesignImage;
    };
    isFinalized: boolean;
}

export interface InspirationAsset {
    id: string;
    type: 'image' | 'video' | 'text' | 'audio';
    mimeType: string;
    content: string; // Text content or Base64 data URL
    name: string;
}

export interface RunwayAsset {
    id: string;
    type: 'video' | 'image';
    url: string; // Blob URL or Base64
    thumbnailUrl?: string; 
    conceptId: string;
    scenario: string;
    timestamp: number;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'agent' | 'system';
    content: string;
    timestamp: number;
    thoughtSignature?: string; // For tracking reasoning steps
    toolCall?: string;
}

export enum AppTab {
    STUDIO = 'STUDIO',
    BLUEPRINT = 'BLUEPRINT',
    RUNWAY = 'RUNWAY'
}

export enum AgentStatus {
    IDLE = 'IDLE',
    THINKING = 'THINKING',
    GENERATING = 'GENERATING',
    EDITING = 'EDITING',
    PRODUCING = 'PRODUCING' // New status for video generation
}

export interface AppState {
    theme: 'light' | 'dark';
    currentTab: AppTab;
    agentStatus: AgentStatus;
    inspirationBoard: InspirationAsset[];
    selectedAssetIds: string[]; 
    generatedConcepts: DesignConcept[];
    activeConceptId: string | null;
    chatHistory: ChatMessage[];
    focusedImageId: string | null; 
    runwayAssets: RunwayAsset[]; // New gallery
}

export type Action =
    | { type: 'TOGGLE_THEME' }
    | { type: 'SET_TAB'; payload: AppTab }
    | { type: 'ADD_INSPIRATION'; payload: InspirationAsset }
    | { type: 'TOGGLE_ASSET_SELECTION'; payload: string } 
    | { type: 'SET_AGENT_STATUS'; payload: AgentStatus }
    | { type: 'ADD_MESSAGE'; payload: ChatMessage }
    | { type: 'SET_CONCEPTS'; payload: DesignConcept[] }
    | { type: 'UPDATE_CONCEPT_IMAGE'; payload: { conceptId: string; imageId: string; view: ViewType; url: string } }
    | { type: 'SELECT_CONCEPT'; payload: string }
    | { type: 'FINALIZE_CONCEPT'; payload: string }
    | { type: 'SET_FOCUSED_IMAGE'; payload: string | null }
    | { type: 'ADD_RUNWAY_ASSET'; payload: RunwayAsset };
