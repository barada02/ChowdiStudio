import React, { useState, useEffect, useRef } from 'react';
import { useStudio } from '../../context/StudioContext';
import { geminiService } from '../../services/geminiService';
import { Icons } from '../ui/Icons';
import { AgentStatus, ChatMessage, ViewType, DesignConcept } from '../../types';

export const AgentConsole: React.FC = () => {
    const { state, dispatch } = useStudio();
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [state.chatHistory]);

    const handleSend = async () => {
        if (!input.trim() || state.agentStatus !== AgentStatus.IDLE) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: Date.now()
        };

        dispatch({ type: 'ADD_MESSAGE', payload: userMsg });
        dispatch({ type: 'SET_AGENT_STATUS', payload: AgentStatus.THINKING });
        setInput('');

        // PASS FULL ASSETS to Service for Multimodal Vision
        const response = await geminiService.chatWithMasterAgent(
            state.chatHistory,
            userMsg.content,
            state.inspirationBoard // Pass the actual objects, not a string
        );

        const agentMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'agent',
            content: response.text,
            timestamp: Date.now(),
            thoughtSignature: response.thought
        };

        dispatch({ type: 'ADD_MESSAGE', payload: agentMsg });
        dispatch({ type: 'SET_AGENT_STATUS', payload: AgentStatus.IDLE });

        // Handle Tool Calls
        if (response.toolCalls && response.toolCalls.length > 0) {
            const toolCall = response.toolCalls[0];
            if (toolCall.name === 'generate_concepts') {
                const args = toolCall.args;
                await handleGeneration(args);
            }
        }
    };

    const handleGeneration = async (args: any) => {
        dispatch({ type: 'SET_AGENT_STATUS', payload: AgentStatus.GENERATING });

        const concept1Id = Date.now().toString();
        const concept2Id = (Date.now() + 1).toString();

        // Optimistic UI update
        const newConcepts: DesignConcept[] = [
            {
                id: concept1Id,
                name: args.concept1_name || "Concept Alpha",
                description: args.concept1_description || "Awaiting description...",
                images: {},
                isFinalized: false
            },
            {
                id: concept2Id,
                name: args.concept2_name || "Concept Beta",
                description: args.concept2_description || "Awaiting description...",
                images: {},
                isFinalized: false
            }
        ];

        dispatch({ type: 'SET_CONCEPTS', payload: newConcepts });

        // Trigger Image Generations
        const c1FrontProm = geminiService.generateImage(args.concept1_description, 'Front View');
        const c1BackProm = geminiService.generateImage(args.concept1_description, 'Back View');
        const c2FrontProm = geminiService.generateImage(args.concept2_description, 'Front View');
        const c2BackProm = geminiService.generateImage(args.concept2_description, 'Back View');

        const [c1f, c1b, c2f, c2b] = await Promise.all([c1FrontProm, c1BackProm, c2FrontProm, c2BackProm]);

        dispatch({ type: 'UPDATE_CONCEPT_IMAGE', payload: { conceptId: concept1Id, view: ViewType.FRONT, url: c1f } });
        dispatch({ type: 'UPDATE_CONCEPT_IMAGE', payload: { conceptId: concept1Id, view: ViewType.BACK, url: c1b } });
        dispatch({ type: 'UPDATE_CONCEPT_IMAGE', payload: { conceptId: concept2Id, view: ViewType.FRONT, url: c2f } });
        dispatch({ type: 'UPDATE_CONCEPT_IMAGE', payload: { conceptId: concept2Id, view: ViewType.BACK, url: c2b } });

        dispatch({ type: 'SET_AGENT_STATUS', payload: AgentStatus.IDLE });
    };

    return (
        <div className="h-full flex flex-col bg-studio-900 border-l border-studio-700 w-80 lg:w-96">
            <div className="p-3 border-b border-studio-700 bg-studio-800 flex justify-between items-center">
                <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <Icons.Chat size={14} /> Master Agent
                </h2>
                <div className={`w-2 h-2 rounded-full ${state.agentStatus === AgentStatus.IDLE ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {state.chatHistory.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div 
                            className={`
                                max-w-[90%] p-3 rounded-lg text-sm
                                ${msg.role === 'user' ? 'bg-studio-accent text-white rounded-br-none' : 'bg-studio-700 text-gray-200 rounded-bl-none'}
                            `}
                        >
                            {msg.content}
                        </div>
                        {msg.thoughtSignature && (
                            <div className="max-w-[90%] mt-1 text-[10px] text-gray-500 font-mono bg-black/20 p-2 rounded border border-studio-700 border-dashed">
                                <span className="text-yellow-600 font-bold">THOUGHTS:</span> {msg.thoughtSignature}
                            </div>
                        )}
                        <span className="text-[10px] text-gray-600 mt-1 uppercase">{msg.role}</span>
                    </div>
                ))}
                
                {state.agentStatus !== AgentStatus.IDLE && (
                    <div className="flex items-center gap-2 text-xs text-studio-accent animate-pulse p-2">
                        <Icons.Spinner size={14} className="animate-spin" />
                        {state.agentStatus === AgentStatus.THINKING ? 'Reasoning...' : 'Generating Assets...'}
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-studio-700 bg-studio-800">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Describe your design vision..."
                        className="flex-1 bg-studio-900 border border-studio-600 rounded p-2 text-sm text-white focus:border-studio-accent outline-none"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={state.agentStatus !== AgentStatus.IDLE}
                        className="bg-studio-accent p-2 rounded hover:bg-blue-600 disabled:opacity-50 transition"
                    >
                        <Icons.Send size={18} color="white" />
                    </button>
                </div>
            </div>
        </div>
    );
};
