import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
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

        // Pass selectedAssetIds to the service
        const response = await geminiService.chatWithMasterAgent(
            state.chatHistory,
            userMsg.content,
            state.inspirationBoard,
            state.selectedAssetIds 
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

        if (response.toolCalls && response.toolCalls.length > 0) {
            const toolCall = response.toolCalls.find((tc: any) => tc.name === 'generate_concepts');
            if (toolCall) {
                const args = toolCall.args;
                await handleGeneration(args);
            }
        }
    };

    const handleGeneration = async (args: any) => {
        dispatch({ type: 'SET_AGENT_STATUS', payload: AgentStatus.GENERATING });

        const concept1Id = Date.now().toString();
        const concept2Id = (Date.now() + 1).toString();

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

        // Helper to run sequence for one concept
        const generateConceptAssets = async (conceptId: string, description: string) => {
             const heroId = `img-${conceptId}-h`;
             const sketchId = `img-${conceptId}-s`;

             // 1. Generate Hero (Source of Truth)
             const heroUrl = await geminiService.generateHeroImage(description);
             
             dispatch({ 
                type: 'UPDATE_CONCEPT_IMAGE', 
                payload: { conceptId, imageId: heroId, view: ViewType.HERO, url: heroUrl } 
             });

             // 2. Generate Fashion Illustration (Derived from Hero, Artistic)
             const sketchUrl = await geminiService.generateFashionIllustration(heroUrl);

             dispatch({ 
                type: 'UPDATE_CONCEPT_IMAGE', 
                payload: { conceptId, imageId: sketchId, view: ViewType.ILLUSTRATION, url: sketchUrl } 
             });
        };

        // Run both concepts in parallel
        await Promise.all([
            generateConceptAssets(concept1Id, args.concept1_description),
            generateConceptAssets(concept2Id, args.concept2_description)
        ]);

        dispatch({ type: 'SET_AGENT_STATUS', payload: AgentStatus.IDLE });
    };

    return (
        <div className="h-full flex flex-col bg-ide-panel">
            <div className="h-10 px-3 border-b border-ide-border flex justify-between items-center bg-ide-panel flex-shrink-0">
                <h2 className="text-xs font-bold text-ide-muted uppercase tracking-wider flex items-center gap-2">
                    <Icons.Chat size={14} /> Atelier Agent
                </h2>
                <div className={`w-2 h-2 rounded-full ${state.agentStatus === AgentStatus.IDLE ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-ide-panel" ref={scrollRef}>
                {state.chatHistory.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div 
                            className={`
                                max-w-[90%] p-3 rounded-lg text-sm shadow-sm
                                ${msg.role === 'user' ? 'bg-ide-accent text-white rounded-br-none' : 'bg-ide-bg border border-ide-border text-ide-text rounded-bl-none'}
                            `}
                        >
                            <ReactMarkdown
                                components={{
                                    strong: ({node, ...props}) => <span className={`font-bold ${msg.role === 'user' ? 'text-white' : 'text-ide-accent'}`} {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc pl-4 mt-2 space-y-1" {...props} />,
                                    ol: ({node, ...props}) => <ol className="list-decimal pl-4 mt-2 space-y-1" {...props} />,
                                    li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                    p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                                }}
                            >
                                {msg.content}
                            </ReactMarkdown>
                        </div>
                        {msg.thoughtSignature && (
                            <div className="max-w-[90%] mt-1 text-[10px] text-ide-muted font-mono bg-ide-bg p-2 rounded border border-ide-border border-dashed">
                                <span className="text-yellow-600 font-bold">THOUGHTS:</span> {msg.thoughtSignature}
                            </div>
                        )}
                        <span className="text-[10px] text-ide-muted mt-1 uppercase ml-1">{msg.role}</span>
                    </div>
                ))}
                
                {state.agentStatus !== AgentStatus.IDLE && (
                    <div className="flex items-center gap-2 text-xs text-ide-accent animate-pulse p-2">
                        <Icons.Spinner size={14} className="animate-spin" />
                        {state.agentStatus === AgentStatus.THINKING ? 'Reasoning & Analyzing...' : 'Generating Assets...'}
                    </div>
                )}
            </div>

            <div className="p-3 border-t border-ide-border bg-ide-bg flex-shrink-0">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Describe your design vision..."
                        className="flex-1 bg-ide-panel border border-ide-border rounded p-2 text-sm text-ide-text focus:border-ide-accent focus:ring-1 focus:ring-ide-accent outline-none transition"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={state.agentStatus !== AgentStatus.IDLE}
                        className="bg-ide-accent p-2 rounded hover:bg-ide-accent-hover disabled:opacity-50 transition text-white"
                    >
                        <Icons.Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};