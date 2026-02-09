import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { AppState, Action, AppTab, AgentStatus, DesignConcept, ViewType } from '../types';

const initialState: AppState = {
    theme: 'dark', // Default
    currentTab: AppTab.STUDIO,
    agentStatus: AgentStatus.IDLE,
    inspirationBoard: [],
    selectedAssetIds: [], // Default empty
    generatedConcepts: [],
    activeConceptId: null,
    chatHistory: [{
        id: 'init',
        role: 'system',
        content: 'Welcome to ChowdiStudio. I am your Master Agent. Select assets to share them with me, or simply start chatting.',
        timestamp: Date.now()
    }],
    focusedImageId: null,
    runwayAssets: [],
};

const reducer = (state: AppState, action: Action): AppState => {
    switch (action.type) {
        case 'TOGGLE_THEME':
            return { ...state, theme: state.theme === 'dark' ? 'light' : 'dark' };
        case 'SET_TAB':
            return { ...state, currentTab: action.payload };
        case 'ADD_INSPIRATION':
            return { ...state, inspirationBoard: [...state.inspirationBoard, action.payload] };
        case 'TOGGLE_ASSET_SELECTION':
            return {
                ...state,
                selectedAssetIds: state.selectedAssetIds.includes(action.payload)
                    ? state.selectedAssetIds.filter(id => id !== action.payload)
                    : [...state.selectedAssetIds, action.payload]
            };
        case 'SET_AGENT_STATUS':
            return { ...state, agentStatus: action.payload };
        case 'ADD_MESSAGE':
            return { ...state, chatHistory: [...state.chatHistory, action.payload] };
        case 'SET_CONCEPTS':
            return { ...state, generatedConcepts: action.payload, activeConceptId: null };
        case 'SELECT_CONCEPT':
            return { ...state, activeConceptId: action.payload };
        case 'UPDATE_CONCEPT_IMAGE':
            return {
                ...state,
                generatedConcepts: state.generatedConcepts.map(c => {
                    if (c.id === action.payload.conceptId) {
                        let targetKey: 'hero' | 'illustration' | 'technical';
                        if (action.payload.view === ViewType.HERO) targetKey = 'hero';
                        else if (action.payload.view === ViewType.ILLUSTRATION) targetKey = 'illustration';
                        else targetKey = 'technical';
                        
                        // Construct a proper DesignImage object
                        return {
                            ...c,
                            images: {
                                ...c.images,
                                [targetKey]: {
                                    id: action.payload.imageId, // Explicit ID from payload
                                    conceptId: c.id,
                                    view: action.payload.view,
                                    url: action.payload.url
                                }
                            }
                        };
                    }
                    return c;
                })
            };
        case 'FINALIZE_CONCEPT':
            return { ...state, currentTab: AppTab.BLUEPRINT };
        case 'SET_FOCUSED_IMAGE':
            return { ...state, focusedImageId: action.payload };
        case 'ADD_RUNWAY_ASSET':
            return { ...state, runwayAssets: [action.payload, ...state.runwayAssets] };
        default:
            return state;
    }
};

const StudioContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | undefined>(undefined);

export const StudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(reducer, initialState);

    // Effect to apply theme class to html element
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(state.theme);
    }, [state.theme]);

    return (
        <StudioContext.Provider value={{ state, dispatch }}>
            {children}
        </StudioContext.Provider>
    );
};

export const useStudio = () => {
    const context = useContext(StudioContext);
    if (!context) throw new Error("useStudio must be used within a StudioProvider");
    return context;
};
