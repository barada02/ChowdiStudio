import React from 'react';
import { useStudio } from '../../context/StudioContext';
import { ViewType } from '../../types';
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
                    <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center gap-8 bg-ide-bg">
                        
                        {/* 1. Hero View (Realistic) - Editable */}
                        <div className="relative group h-full max-h-[85vh] aspect-[3/4] bg-ide-panel rounded-lg shadow-2xl border border-ide-border overflow-hidden">
                             <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/50 to-transparent z-10">
                                <span className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                    <Icons.Camera size={14}/> Lookbook (Hero)
                                </span>
                            </div>
                            {activeConcept.images.hero ? (
                                <img src={activeConcept.images.hero.url} className="w-full h-full object-cover" alt="Hero" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Icons.Spinner className="animate-spin text-ide-muted" />
                                </div>
                            )}
                            
                            {/* Edit Button for Hero */}
                            {activeConcept.images.hero && (
                                <button 
                                    onClick={() => handleFocus(activeConcept.images.hero!.id)}
                                    className="absolute bottom-6 right-6 p-4 bg-ide-accent text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition transform scale-90 group-hover:scale-100 hover:bg-blue-600 z-20"
                                    title="Edit Design"
                                >
                                    <Icons.Edit size={20} />
                                </button>
                            )}
                        </div>

                         {/* 2. Illustration View (Artistic Mood) - Read Only */}
                        <div className="relative group h-[70vh] aspect-[3/4] bg-white rounded-lg shadow-xl border border-ide-border overflow-hidden rotate-1 transform hover:rotate-0 transition duration-300">
                             <div className="absolute top-0 left-0 right-0 p-3 bg-white/90 border-b border-gray-100 z-10">
                                <span className="text-black text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                    <Icons.PenTool size={14}/> Mood Sketch
                                </span>
                            </div>
                            {activeConcept.images.illustration ? (
                                <img src={activeConcept.images.illustration.url} className="w-full h-full object-cover" alt="Fashion Illustration" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                    <Icons.Spinner className="animate-spin text-gray-400" />
                                    <span className="text-xs text-gray-400 ml-2">Sketching...</span>
                                </div>
                            )}
                        </div>
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
                             Workflow
                        </h3>
                        <div className="space-y-3">
                            <div className="p-3 bg-ide-bg rounded border border-ide-border">
                                <span className="block text-[10px] text-ide-muted uppercase mb-1">Primary Asset</span>
                                <span className="text-xs font-mono text-ide-text">Hero Image (Editable)</span>
                            </div>
                            <div className="p-3 bg-ide-bg rounded border border-ide-border">
                                <span className="block text-[10px] text-ide-muted uppercase mb-1">Secondary Asset</span>
                                <span className="text-xs font-mono text-ide-text">Fashion Illustration (Auto)</span>
                            </div>
                        </div>

                         <div className="mt-8 pt-6 border-t border-ide-border text-center">
                            <p className="text-[10px] text-ide-muted italic">
                                "Editing the Hero image will automatically update the Mood Sketch."
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

                        <div className="grid grid-cols-5 gap-3 pointer-events-none">
                            {/* Hero Image (Larger) */}
                            <div className="col-span-3 aspect-[3/4] bg-ide-bg rounded border border-ide-border overflow-hidden opacity-90 group-hover:opacity-100 transition relative">
                                {concept.images.hero ? (
                                    <img src={concept.images.hero.url} className="w-full h-full object-cover" alt="Hero" />
                                ) : (
                                    <div className="w-full h-full bg-ide-bg animate-pulse"></div>
                                )}
                                <div className="absolute bottom-0 left-0 bg-black/50 text-white text-[9px] px-2 py-0.5">LOOKBOOK</div>
                            </div>
                            
                            {/* Illustration (Smaller) */}
                            <div className="col-span-2 aspect-[3/4] bg-white rounded border border-ide-border overflow-hidden opacity-90 group-hover:opacity-100 transition relative">
                                {concept.images.illustration ? (
                                    <img src={concept.images.illustration.url} className="w-full h-full object-cover" alt="Illustration" />
                                ) : (
                                    <div className="w-full h-full bg-gray-100 animate-pulse"></div>
                                )}
                                 <div className="absolute bottom-0 left-0 bg-gray-200 text-gray-800 text-[9px] px-2 py-0.5">SKETCH</div>
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
