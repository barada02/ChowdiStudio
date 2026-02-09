import React from 'react';
import { useStudio } from '../../context/StudioContext';
import { DesignConcept, ViewType } from '../../types';
import { Icons } from '../ui/Icons';

export const GenerationBoard: React.FC = () => {
    const { state, dispatch } = useStudio();

    const handleSelect = (id: string | null) => {
        // If clicking existing active, or explicitly setting null
        if (state.activeConceptId === id) {
            return;
        }
        dispatch({ type: 'SELECT_CONCEPT', payload: id || '' });
    };

    const handleFocus = (imageId: string) => {
        dispatch({ type: 'SET_FOCUSED_IMAGE', payload: imageId });
    };

    const handleBackToGrid = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch({ type: 'SELECT_CONCEPT', payload: '' }); 
    };

    // Find the active concept
    const activeConcept = state.generatedConcepts.find(c => c.id === state.activeConceptId);

    // --- Empty State ---
    if (state.generatedConcepts.length === 0) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <Icons.Cut size={48} className="mx-auto mb-4 text-ide-muted opacity-20" />
                    <p className="text-ide-muted text-sm font-light">Awaiting Design Concepts...</p>
                    <p className="text-xs text-ide-muted mt-2 opacity-50">Upload inspiration or chat with the agent.</p>
                </div>
            </div>
        );
    }

    // --- Detail View (Maximized) ---
    if (activeConcept) {
        return (
            <div className="h-full flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* Detail Header */}
                <div className="flex items-center justify-between p-4 border-b border-ide-border bg-ide-panel/50 backdrop-blur-sm flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleBackToGrid}
                            className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-ide-bg text-ide-muted hover:text-ide-text transition border border-transparent hover:border-ide-border group"
                            title="Back to Grid"
                        >
                            <Icons.ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform"/>
                            <span className="text-xs font-medium uppercase tracking-wide">Back</span>
                        </button>
                        <div className="h-6 w-px bg-ide-border mx-2"></div>
                        <div>
                            <h2 className="text-sm font-bold text-ide-text uppercase tracking-wider flex items-center gap-2">
                                {activeConcept.name}
                                <span className="bg-ide-accent/10 text-ide-accent text-[10px] px-2 py-0.5 rounded-full border border-ide-accent/20">Active</span>
                            </h2>
                            <p className="text-[10px] text-ide-muted font-mono">{activeConcept.id}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => dispatch({ type: 'FINALIZE_CONCEPT', payload: activeConcept.id })}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded flex items-center gap-2 shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5"
                    >
                        <Icons.Check size={14} /> FINALIZE DESIGN
                    </button>
                </div>

                {/* Detail Body */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Visuals (Takes max space) */}
                    <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center gap-6 bg-ide-bg">
                        {['front', 'back'].map((view) => {
                            const img = activeConcept.images[view as 'front' | 'back'];
                            return (
                                <div key={view} className="relative group h-full max-h-[80vh] aspect-[3/4] bg-ide-panel rounded-lg shadow-2xl border border-ide-border overflow-hidden transition-transform duration-500">
                                    <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/50 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-white text-xs font-bold uppercase tracking-widest">{view} VIEW</span>
                                    </div>
                                    
                                    {img ? (
                                        <img src={img.url} className="w-full h-full object-cover" alt={view} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Icons.Spinner className="animate-spin text-ide-muted" />
                                        </div>
                                    )}

                                    {img && (
                                        <button 
                                            onClick={() => handleFocus(img.id)}
                                            className="absolute bottom-4 right-4 p-3 bg-ide-accent text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition transform scale-90 group-hover:scale-100 hover:bg-blue-600"
                                            title="Edit / Inpaint"
                                        >
                                            <Icons.Edit size={16} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Sidebar Info */}
                    <div className="w-80 bg-ide-panel border-l border-ide-border p-6 overflow-y-auto shadow-xl z-10">
                        <h3 className="text-xs font-bold text-ide-muted uppercase mb-4 flex items-center gap-2">
                            <Icons.Cut size={14}/> Design Concept
                        </h3>
                        <p className="text-sm text-ide-text leading-relaxed font-light mb-8">
                            {activeConcept.description}
                        </p>

                        <h3 className="text-xs font-bold text-ide-muted uppercase mb-4 flex items-center gap-2">
                             Details
                        </h3>
                        <div className="space-y-3">
                            <div className="p-3 bg-ide-bg rounded border border-ide-border">
                                <span className="block text-[10px] text-ide-muted uppercase mb-1">Generated</span>
                                <span className="text-xs font-mono text-ide-text">Gemini 3 Pro Image</span>
                            </div>
                            <div className="p-3 bg-ide-bg rounded border border-ide-border">
                                <span className="block text-[10px] text-ide-muted uppercase mb-1">Style</span>
                                <span className="text-xs font-mono text-ide-text">High Fashion / Sketch</span>
                            </div>
                        </div>

                         <div className="mt-8 pt-6 border-t border-ide-border text-center">
                            <p className="text-[10px] text-ide-muted italic">
                                "Click the Edit icon on the image to refine details using the mask editor."
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- Grid View (Overview) ---
    return (
        <div className="h-full p-8 overflow-y-auto">
            <h2 className="text-lg font-light mb-6 text-ide-text border-b border-ide-border pb-2 flex items-center gap-2">
                <Icons.Layers size={18} className="text-ide-accent"/> Generation Canvas
            </h2>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {state.generatedConcepts.map((concept) => (
                    <div 
                        key={concept.id} 
                        className={`
                            group cursor-pointer border rounded-lg p-4 transition duration-200 relative bg-ide-panel shadow-sm hover:shadow-md hover:-translate-y-1
                            ${state.activeConceptId === concept.id ? 'border-ide-accent ring-1 ring-ide-accent' : 'border-ide-border hover:border-ide-muted'}
                        `}
                        onClick={() => handleSelect(concept.id)}
                    >
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold text-ide-text uppercase tracking-wide group-hover:text-ide-accent transition-colors">{concept.name}</h3>
                        </div>
                        
                        <p className="text-xs text-ide-muted mb-4 h-8 overflow-hidden text-ellipsis leading-relaxed line-clamp-2">{concept.description}</p>

                        <div className="grid grid-cols-2 gap-3 pointer-events-none">
                            {/* Previews (pointer-events-none so clicking them selects the card) */}
                            <div className="aspect-[3/4] bg-ide-bg rounded border border-ide-border overflow-hidden opacity-80 group-hover:opacity-100 transition">
                                {concept.images.front ? (
                                    <img src={concept.images.front.url} className="w-full h-full object-cover" alt="Front" />
                                ) : (
                                    <div className="w-full h-full bg-ide-bg animate-pulse"></div>
                                )}
                            </div>
                            <div className="aspect-[3/4] bg-ide-bg rounded border border-ide-border overflow-hidden opacity-80 group-hover:opacity-100 transition">
                                {concept.images.back ? (
                                    <img src={concept.images.back.url} className="w-full h-full object-cover" alt="Back" />
                                ) : (
                                    <div className="w-full h-full bg-ide-bg animate-pulse"></div>
                                )}
                            </div>
                        </div>
                        
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5">
                            <span className="bg-ide-panel text-ide-text text-xs font-bold px-3 py-1.5 rounded shadow-sm border border-ide-border">
                                OPEN DETAILS
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};