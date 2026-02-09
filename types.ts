// Domain Types

export enum ViewType {
    FRONT = 'FRONT',
    BACK = 'BACK'
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
        front?: DesignImage;
        back?: DesignImage;
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
    BLUEPRINT = 'BLUEPRINT'
}

export enum AgentStatus {
    IDLE = 'IDLE',
    THINKING = 'THINKING',
    GENERATING = 'GENERATING',
    EDITING = 'EDITING'
}

export interface AppState {
    theme: 'light' | 'dark';
    currentTab: AppTab;
    agentStatus: AgentStatus;
    inspirationBoard: InspirationAsset[];
    generatedConcepts: DesignConcept[];
    activeConceptId: string | null;
    chatHistory: ChatMessage[];
    focusedImageId: string | null; // For the editor
}

export type Action =
    | { type: 'TOGGLE_THEME' }
    | { type: 'SET_TAB'; payload: AppTab }
    | { type: 'ADD_INSPIRATION'; payload: InspirationAsset }
    | { type: 'SET_AGENT_STATUS'; payload: AgentStatus }
    | { type: 'ADD_MESSAGE'; payload: ChatMessage }
    | { type: 'SET_CONCEPTS'; payload: DesignConcept[] }
    | { type: 'UPDATE_CONCEPT_IMAGE'; payload: { conceptId: string; view: ViewType; url: string } }
    | { type: 'SELECT_CONCEPT'; payload: string }
    | { type: 'FINALIZE_CONCEPT'; payload: string }
    | { type: 'SET_FOCUSED_IMAGE'; payload: string | null };
