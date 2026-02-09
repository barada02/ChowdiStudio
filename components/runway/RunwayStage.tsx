import React, { useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import { geminiService } from '../../services/geminiService';
import { Icons } from '../ui/Icons';
import { AgentStatus, RunwayAsset } from '../../types';

const SCENARIOS = [
    { id: 'paris', label: 'Paris Fashion Week', prompt: 'Paris fashion week runway, flash photography, audience in background, elegant lighting' },
    { id: 'neon', label: 'Cyberpunk Neon', prompt: 'futuristic neon city street at night, rain reflections, cyberpunk aesthetic, dramatic blue and pink lighting' },
    { id: 'studio', label: 'Minimalist Studio', prompt: 'clean white infinity cove studio, softbox lighting, high fashion editorial style' },
    { id: 'desert', label: 'Sahara Dune', prompt: 'golden hour in the desert dunes, wind blowing fabric, cinematic sunlight, nature background' },
    { id: 'urban', label: 'NYC Street Style', prompt: 'busy New York City street, daytime, yellow taxis in blur background, urban chic vibe' },
];

export const RunwayStage: React.FC = () => {
    const { state, dispatch } = useStudio();
    const [selectedConceptId, setSelectedConceptId] = useState<string>('');
    const [selectedScenarioId, setSelectedScenarioId] = useState<string>('studio');
    const [mode, setMode] = useState<'video' | 'image'>('video');
    const [error, setError] = useState<string | null>(null);
    const [viewingAsset, setViewingAsset] = useState<RunwayAsset | null>(null);

    // Filter valid concepts (must have a hero image)
    const validConcepts = state.generatedConcepts.filter(c => c.images.hero);

    const handleProduce = async () => {
        const concept = state.generatedConcepts.find(c => c.id === selectedConceptId);
        if (!concept || !concept.images.hero) return;

        dispatch({ type: 'SET_AGENT_STATUS', payload: AgentStatus.PRODUCING });
        setError(null);

        try {
            const scenario = SCENARIOS.find(s => s.id === selectedScenarioId);
            const prompt = scenario ? scenario.prompt : 'fashion runway';
            let resultUrl = '';

            if (mode === 'video') {
                // Generate Video
                resultUrl = await geminiService.generateRunwayVideo(concept.images.hero.url, prompt);
            } else {
                // Generate Photo
                resultUrl = await geminiService.generateRunwayPhoto(concept.images.hero.url, prompt);
            }

            const newAsset: RunwayAsset = {
                id: Date.now().toString(),
                type: mode,
                url: resultUrl,
                conceptId: concept.id,
                scenario: scenario?.label || 'Custom',
                timestamp: Date.now()
            };

            dispatch({ type: 'ADD_RUNWAY_ASSET', payload: newAsset });

        } catch (err: any) {
            console.error("Production Failed", err);
            setError("Production failed. Ensure API Key supports Veo/Imagen.");
        } finally {
            dispatch({ type: 'SET_AGENT_STATUS', payload: AgentStatus.IDLE });
        }
    };

    if (validConcepts.length === 0) {
        return (
            <div className="h-full flex items-center justify-center bg-ide-bg text-ide-muted">
                <div className="text-center">
                    <Icons.Runway size={48} className="mx-auto mb-4 opacity-20" />
                    <h2 className="text-xl font-light">The Runway is Closed</h2>
                    <p className="mt-2 text-sm">Design some concepts in the Studio first.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex bg-ide-bg text-ide-text relative">
            {/* Left Panel: Production Controls */}
            <div className="w-80 flex-shrink-0 bg-ide-panel border-r border-ide-border p-6 flex flex-col overflow-y-auto">
                <div className="flex items-center gap-2 mb-6 text-ide-accent">
                    <Icons.Runway size={24} />
                    <h2 className="text-lg font-bold uppercase tracking-wider">Runway</h2>
                </div>

                <div className="space-y-6">
                    {/* Concept Selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-ide-muted uppercase">1. Cast Model (Select Design)</label>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                            {validConcepts.map(c => (
                                <div 
                                    key={c.id}
                                    onClick={() => setSelectedConceptId(c.id)}
                                    className={`
                                        cursor-pointer rounded border p-1 transition relative aspect-[3/4] overflow-hidden group
                                        ${selectedConceptId === c.id ? 'border-ide-accent ring-1 ring-ide-accent' : 'border-ide-border opacity-70 hover:opacity-100'}
                                    `}
                                >
                                    <img src={c.images.hero?.url} className="w-full h-full object-cover rounded-sm" alt={c.name} />
                                    <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 truncate text-[10px] text-white">
                                        {c.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Scenario Selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-ide-muted uppercase">2. Set Design (Scenario)</label>
                        <select 
                            value={selectedScenarioId} 
                            onChange={(e) => setSelectedScenarioId(e.target.value)}
                            className="w-full bg-ide-bg border border-ide-border rounded p-2 text-sm outline-none focus:border-ide-accent"
                        >
                            {SCENARIOS.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Mode Selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-ide-muted uppercase">3. Production Format</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setMode('video')}
                                className={`flex-1 py-2 px-3 rounded text-xs font-bold flex items-center justify-center gap-2 border transition
                                    ${mode === 'video' ? 'bg-ide-accent text-white border-ide-accent' : 'bg-ide-bg text-ide-muted border-ide-border hover:border-ide-text'}
                                `}
                            >
                                <Icons.Video size={14} /> Video (Veo)
                            </button>
                            <button 
                                onClick={() => setMode('image')}
                                className={`flex-1 py-2 px-3 rounded text-xs font-bold flex items-center justify-center gap-2 border transition
                                    ${mode === 'image' ? 'bg-ide-accent text-white border-ide-accent' : 'bg-ide-bg text-ide-muted border-ide-border hover:border-ide-text'}
                                `}
                            >
                                <Icons.Camera size={14} /> Photo
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-auto pt-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded">
                            {error}
                        </div>
                    )}
                    <button 
                        onClick={handleProduce}
                        disabled={!selectedConceptId || state.agentStatus === AgentStatus.PRODUCING}
                        className={`
                            w-full py-3 rounded font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg
                            ${!selectedConceptId || state.agentStatus === AgentStatus.PRODUCING
                                ? 'bg-ide-muted cursor-not-allowed opacity-50' 
                                : 'bg-gradient-to-r from-purple-600 to-ide-accent hover:opacity-90 text-white'}
                        `}
                    >
                        {state.agentStatus === AgentStatus.PRODUCING ? (
                            <><Icons.Spinner className="animate-spin" size={16} /> Producing...</>
                        ) : (
                            <><Icons.Runway size={16} /> Start Production</>
                        )}
                    </button>
                </div>
            </div>

            {/* Right Panel: Gallery */}
            <div className="flex-1 p-8 overflow-y-auto bg-dot-pattern">
                <h3 className="text-sm font-bold text-ide-muted uppercase mb-4 flex items-center gap-2">
                    <Icons.Video size={16} /> Production Gallery
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                    {state.runwayAssets.map(asset => (
                        <div 
                            key={asset.id} 
                            onClick={() => setViewingAsset(asset)}
                            className="group relative bg-ide-panel rounded-lg overflow-hidden border border-ide-border shadow-md hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer"
                        >
                            <div className="aspect-[9/16] bg-black relative">
                                {asset.type === 'video' ? (
                                    <video 
                                        src={asset.url} 
                                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                        muted
                                        playsInline
                                        onMouseOver={e => e.currentTarget.play()}
                                        onMouseOut={e => {
                                            e.currentTarget.pause();
                                            e.currentTarget.currentTime = 0;
                                        }}
                                    />
                                ) : (
                                    <img src={asset.url} alt="Photoshoot" className="w-full h-full object-cover" />
                                )}

                                <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 rounded text-[10px] text-white uppercase font-bold backdrop-blur-sm z-10">
                                    {asset.type}
                                </div>
                                
                                {/* Overlay hint */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 z-0">
                                     <div className="bg-black/50 text-white p-2 rounded-full backdrop-blur-sm">
                                         <Icons.Zoom size={20} />
                                     </div>
                                </div>
                            </div>
                            <div className="p-3">
                                <h4 className="text-sm font-bold text-ide-text truncate">{asset.scenario}</h4>
                                <p className="text-[10px] text-ide-muted mt-1">Generated via Gemini</p>
                            </div>
                        </div>
                    ))}
                    
                    {/* Placeholder for when producing */}
                    {state.agentStatus === AgentStatus.PRODUCING && (
                        <div className="aspect-[9/16] bg-ide-panel rounded-lg border border-ide-border border-dashed flex flex-col items-center justify-center p-6 animate-pulse">
                            <Icons.Spinner size={32} className="text-ide-accent animate-spin mb-4" />
                            <p className="text-xs font-bold text-ide-text">On Set...</p>
                            <p className="text-[10px] text-ide-muted text-center mt-2">
                                Lights, Camera, Action. <br/>This may take a minute.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Cinema Mode Lightbox */}
            {viewingAsset && (
                <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center p-8 backdrop-blur-sm animate-in fade-in duration-200">
                    <button 
                        onClick={() => setViewingAsset(null)}
                        className="absolute top-4 right-4 text-white/50 hover:text-white transition p-2 bg-white/10 rounded-full"
                    >
                        <Icons.X size={24} />
                    </button>
                    
                    <div className="relative max-h-full max-w-full flex flex-col items-center justify-center h-full">
                         {viewingAsset.type === 'video' ? (
                            <video 
                                src={viewingAsset.url} 
                                controls 
                                autoPlay 
                                className="max-h-[85vh] w-auto rounded shadow-2xl border border-white/10 bg-black"
                            />
                        ) : (
                            <img 
                                src={viewingAsset.url} 
                                alt="Full View" 
                                className="max-h-[85vh] w-auto rounded shadow-2xl border border-white/10" 
                            />
                        )}
                        <h3 className="text-white mt-4 font-light text-lg tracking-widest uppercase opacity-80">{viewingAsset.scenario}</h3>
                    </div>
                </div>
            )}
        </div>
    );
};
