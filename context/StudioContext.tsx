import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, Action, AppTab, AgentStatus, DesignConcept, ViewType } from '../types';

const initialState: AppState = {
    currentTab: AppTab.STUDIO,
    agentStatus: AgentStatus.IDLE,
    inspirationBoard: [],
    generatedConcepts: [],
    activeConceptId: null,
    chatHistory: [{
        id: 'init',
        role: 'system',
        content: 'Welcome to ChowdiStudio. I am your Master Agent. Upload inspiration or describe your vision to begin.',
        timestamp: Date.now()
    }],
    focusedImageId: null,
};

const reducer = (state: AppState, action: Action): AppState => {
    switch (action.type) {
        case 'SET_TAB':
            return { ...state, currentTab: action.payload };
        case 'ADD_INSPIRATION':
            return { ...state, inspirationBoard: [...state.inspirationBoard, action.payload] };
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
                        return {
                            ...c,
                            images: {
                                ...c.images,
                                [action.payload.view === ViewType.FRONT ? 'front' : 'back']: {
                                    ...c.images[action.payload.view === ViewType.FRONT ? 'front' : 'back'],
                                    url: action.payload.url
                                }
                            }
                        };
                    }
                    return c;
                })
            };
        case 'FINALIZE_CONCEPT':
            // Logic to move to blueprint tab could go here
            return { ...state, currentTab: AppTab.BLUEPRINT };
        case 'SET_FOCUSED_IMAGE':
            return { ...state, focusedImageId: action.payload };
        default:
            return state;
    }
};

const StudioContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | undefined>(undefined);

export const StudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(reducer, initialState);
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
