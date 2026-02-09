import React, { useEffect } from 'react';
import { useStudio } from '../../context/StudioContext';
import { geminiService } from '../../services/geminiService';
import { AppTab, ViewType, AgentStatus } from '../../types';
import { Icons } from '../ui/Icons';

export const BlueprintLab: React.FC = () => {
    const { state, dispatch } = useStudio();

    // Find finalized concept (concept active when finalized)
    const finalConcept = state.activeConceptId 
        ? state.generatedConcepts.find(c => c.id === state.activeConceptId)
        : null;

    // --- 1. Auto-generate Technical Flat ---
    useEffect(() => {
        const generateFlat = async () => {
            if (finalConcept && finalConcept.images.hero && !finalConcept.images.technical) {
                const techId = `img-${finalConcept.id}-t`;
                // Temporary placeholder URL or just rely on async state update
                const techUrl = await geminiService.generateTechnicalSketch(finalConcept.images.hero.url);
                
                dispatch({ 
                    type: 'UPDATE_CONCEPT_IMAGE', 
                    payload: { 
                        conceptId: finalConcept.id, 
                        imageId: techId, 
                        view: ViewType.TECHNICAL, 
                        url: techUrl 
                    } 
                });
            }
        };

        generateFlat();
    }, [finalConcept]);

    // --- 2. Auto-generate Tech Pack Data ---
    useEffect(() => {
        const generateData = async () => {
            if (finalConcept && finalConcept.images.hero && !finalConcept.techPack && state.agentStatus === AgentStatus.IDLE) {
                dispatch({ type: 'SET_AGENT_STATUS', payload: AgentStatus.ANALYZING });
                
                try {
                    // Step A: Generate JSON Data
                    const techPack = await geminiService.generateTechPack(finalConcept.images.hero.url);
                    dispatch({ type: 'UPDATE_TECH_PACK', payload: { conceptId: finalConcept.id, techPack } });
                    
                    // Step B: Source Main Material (Async)
                    const mainFabric = techPack.bom.find(i => i.location.toLowerCase().includes('body') || i.location.toLowerCase().includes('main'));
                    if (mainFabric) {
                        const results = await geminiService.searchSuppliers(`${mainFabric.item} ${mainFabric.description} wholesale fabric`);
                        dispatch({ type: 'ADD_SOURCING_RESULTS', payload: { conceptId: finalConcept.id, results } });
                    }

                } catch (e) {
                    console.error("Tech Pack Gen Failed", e);
                } finally {
                    dispatch({ type: 'SET_AGENT_STATUS', payload: AgentStatus.IDLE });
                }
            }
        };

        generateData();
    }, [finalConcept, state.agentStatus]);


    if (!finalConcept) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-ide-muted bg-ide-bg">
                <Icons.Blueprint size={64} className="mb-4 opacity-20" />
                <h2 className="text-xl font-light text-ide-text">No Design Finalized</h2>
                <p className="mt-2 text-sm">Return to the Design Studio to create and finalize a concept.</p>
                <button 
                    onClick={() => dispatch({ type: 'SET_TAB', payload: AppTab.STUDIO })}
                    className="mt-6 px-6 py-2 border border-ide-border rounded hover:bg-ide-panel text-ide-text transition bg-ide-panel"
                >
                    Go to Studio
                </button>
            </div>
        );
    }

    const { techPack } = finalConcept;
    const isAnalyzing = state.agentStatus === AgentStatus.ANALYZING;

    return (
        <div className="h-full bg-ide-bg flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-ide-border bg-ide-panel flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-500/10 rounded-full text-green-600">
                        <Icons.Check size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-ide-text">{finalConcept.name}</h1>
                        <p className="text-ide-muted font-mono text-sm">
                            STYLE: {techPack?.style_number || 'GEN-000'} | SEASON: {techPack?.season || 'SS25'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                     <button className="px-4 py-2 bg-ide-accent hover:bg-ide-accent-hover text-white rounded text-sm font-bold flex items-center gap-2 shadow-sm">
                        <Icons.Save size={16} /> Export Tech Pack (PDF)
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="flex-1 overflow-hidden flex bg-dot-pattern">
                
                {/* 1. Spec Sheet (Left) */}
                <div className="w-1/3 border-r border-ide-border overflow-y-auto p-6 bg-ide-panel/50 backdrop-blur-sm">
                     <h3 className="text-xs font-bold text-ide-muted uppercase mb-4 flex items-center gap-2">
                        <Icons.Scissors size={14}/> Construction Specifications
                    </h3>

                    {isAnalyzing && !techPack ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-4 bg-ide-border rounded w-3/4"></div>
                            <div className="h-4 bg-ide-border rounded w-1/2"></div>
                            <div className="h-32 bg-ide-border rounded w-full"></div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Measurements Table */}
                            <div className="bg-ide-bg border border-ide-border rounded overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-ide-panel border-b border-ide-border">
                                        <tr>
                                            <th className="p-2 text-left font-mono text-xs text-ide-muted">POM</th>
                                            <th className="p-2 text-right font-mono text-xs text-ide-muted">Val ({techPack?.measurements[0]?.unit})</th>
                                            <th className="p-2 text-right font-mono text-xs text-ide-muted">Tol +/-</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {techPack?.measurements.map((m, i) => (
                                            <tr key={i} className="border-b border-ide-border last:border-0 hover:bg-ide-panel transition">
                                                <td className="p-2 text-ide-text">{m.pom}</td>
                                                <td className="p-2 text-right font-mono text-ide-accent">{m.value}</td>
                                                <td className="p-2 text-right text-ide-muted text-xs">{m.tolerance}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Construction Notes */}
                            <div className="bg-ide-panel p-4 rounded border border-ide-border shadow-sm">
                                <h4 className="text-xs font-bold text-ide-text mb-2">Technologist Notes</h4>
                                <ul className="list-disc list-inside space-y-1">
                                    {techPack?.construction_details.map((note, i) => (
                                        <li key={i} className="text-sm text-ide-muted">{note}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Visuals (Center) */}
                <div className="w-1/3 border-r border-ide-border overflow-y-auto p-6 flex flex-col gap-6">
                     <h3 className="text-xs font-bold text-ide-muted uppercase flex items-center gap-2">
                        <Icons.Layers size={14}/> Technical Drawings
                    </h3>
                    
                    <div className="relative aspect-[3/4] bg-white rounded border border-ide-border shadow-sm overflow-hidden group">
                        {finalConcept.images.technical ? (
                            <img src={finalConcept.images.technical.url} className="w-full h-full object-contain p-4" alt="Technical Flat" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
                                <Icons.Spinner className="animate-spin text-ide-accent mb-2" />
                                <span className="text-xs text-gray-500">Drafting Schematics...</span>
                            </div>
                        )}
                        <div className="absolute bottom-2 right-2 bg-black/10 text-black px-2 py-1 text-[10px] rounded font-bold uppercase">Flat View</div>
                    </div>

                    <div className="relative aspect-[3/4] bg-ide-bg rounded border border-ide-border shadow-sm overflow-hidden opacity-80 hover:opacity-100 transition">
                         <img src={finalConcept.images.hero?.url} className="w-full h-full object-cover" alt="Reference" />
                         <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 text-[10px] rounded font-bold uppercase">Reference</div>
                    </div>
                </div>

                {/* 3. BOM & Sourcing (Right) */}
                <div className="w-1/3 overflow-y-auto p-6 bg-ide-panel/50 backdrop-blur-sm">
                    <h3 className="text-xs font-bold text-ide-muted uppercase mb-4 flex items-center gap-2">
                        <Icons.Upload size={14} className="rotate-180"/> Material & Costing
                    </h3>

                    {isAnalyzing && !techPack ? (
                        <div className="flex flex-col items-center justify-center h-32 text-ide-muted">
                            <Icons.Spinner className="animate-spin mb-2"/>
                            <span className="text-xs">Calculating Yields & Sourcing...</span>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* BOM List */}
                            <div className="space-y-3">
                                {techPack?.bom.map((item, i) => (
                                    <div key={i} className="bg-ide-panel p-3 rounded border border-ide-border flex justify-between items-start shadow-sm hover:border-ide-accent transition group">
                                        <div>
                                            <span className="text-[10px] text-ide-accent uppercase font-bold tracking-wider">{item.location}</span>
                                            <h4 className="text-sm font-bold text-ide-text">{item.item}</h4>
                                            <p className="text-xs text-ide-muted mt-1">{item.description}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-sm font-mono font-bold">{item.quantity}</span>
                                            <span className="block text-xs text-ide-muted">Est. ${item.cost_estimate}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Total Cost */}
                            <div className="bg-ide-bg p-4 rounded border border-ide-border flex justify-between items-center">
                                <span className="text-sm font-bold text-ide-muted uppercase">Total Unit Cost</span>
                                <span className="text-xl font-mono font-bold text-green-500">
                                    ${techPack?.total_cost_estimate.toFixed(2)}
                                </span>
                            </div>

                            {/* Sourcing Agent Results */}
                            <div className="pt-6 border-t border-ide-border">
                                <h3 className="text-xs font-bold text-ide-muted uppercase mb-4 flex items-center gap-2">
                                    <Icons.Zoom size={14}/> Sourcing Agent (Live)
                                </h3>
                                
                                {techPack?.sourcing_results && techPack.sourcing_results.length > 0 ? (
                                    <div className="space-y-3">
                                        {techPack.sourcing_results.map((res, i) => (
                                            <a 
                                                key={i} 
                                                href={res.url} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="block p-3 bg-ide-bg hover:bg-ide-panel border border-ide-border hover:border-blue-400 rounded transition group"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1 p-1 bg-blue-500/10 rounded text-blue-500">
                                                        <Icons.Upload size={12} className="rotate-45" />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <h5 className="text-xs font-bold text-blue-400 truncate group-hover:underline">{res.title}</h5>
                                                        <p className="text-[10px] text-ide-muted mt-1 truncate">{res.url}</p>
                                                    </div>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-ide-muted italic p-2">Searching global suppliers...</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
