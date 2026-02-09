import React from 'react';
import { useStudio } from '../../context/StudioContext';
import { DesignConcept, ViewType } from '../../types';
import { Icons } from '../ui/Icons';

export const GenerationBoard: React.FC = () => {
    const { state, dispatch } = useStudio();

    const handleSelect = (id: string) => {
        dispatch({ type: 'SELECT_CONCEPT', payload: id });
    };

    const handleFocus = (imageId: string) => {
        dispatch({ type: 'SET_FOCUSED_IMAGE', payload: imageId });
    };

    if (state.generatedConcepts.length === 0) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <Icons.Cut size={32} className="mx-auto mb-4 text-ide-muted opacity-40" />
                    <p className="text-ide-muted text-sm font-light">Awaiting Design Concepts...</p>
                </div>
            </div>
        );
    }

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
                            border rounded-lg p-4 transition duration-200 relative bg-ide-panel shadow-sm
                            ${state.activeConceptId === concept.id ? 'border-ide-accent ring-1 ring-ide-accent' : 'border-ide-border hover:border-ide-muted'}
                        `}
                        onClick={() => handleSelect(concept.id)}
                    >
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold text-ide-text uppercase tracking-wide">{concept.name}</h3>
                            {state.activeConceptId === concept.id && (
                                <span className="flex items-center text-[10px] text-white bg-ide-accent px-2 py-0.5 rounded-full">
                                    <Icons.Check size={10} className="mr-1" /> Active
                                </span>
                            )}
                        </div>
                        
                        <p className="text-xs text-ide-muted mb-4 h-8 overflow-hidden text-ellipsis leading-relaxed">{concept.description}</p>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Front View */}
                            <div className="group relative aspect-[3/4] bg-ide-bg rounded border border-ide-border overflow-hidden">
                                <span className="absolute top-1 left-1 text-[9px] bg-ide-panel/80 px-1 text-ide-muted border border-ide-border rounded">FRONT</span>
                                {concept.images.front ? (
                                    <img src={concept.images.front.url} className="w-full h-full object-cover" alt="Front" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-ide-muted text-xs animate-pulse">
                                        Generating...
                                    </div>
                                )}
                                {concept.images.front && (
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); handleFocus(concept.images.front!.id); }}
                                        className="absolute bottom-2 right-2 p-1.5 bg-ide-panel border border-ide-border text-ide-text rounded-full opacity-0 group-hover:opacity-100 transition shadow-lg hover:text-ide-accent"
                                     >
                                        <Icons.Edit size={12} />
                                     </button>
                                )}
                            </div>

                            {/* Back View */}
                            <div className="group relative aspect-[3/4] bg-ide-bg rounded border border-ide-border overflow-hidden">
                                <span className="absolute top-1 left-1 text-[9px] bg-ide-panel/80 px-1 text-ide-muted border border-ide-border rounded">BACK</span>
                                {concept.images.back ? (
                                    <img src={concept.images.back.url} className="w-full h-full object-cover" alt="Back" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-ide-muted text-xs animate-pulse">
                                        Generating...
                                    </div>
                                )}
                                {concept.images.back && (
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); handleFocus(concept.images.back!.id); }}
                                        className="absolute bottom-2 right-2 p-1.5 bg-ide-panel border border-ide-border text-ide-text rounded-full opacity-0 group-hover:opacity-100 transition shadow-lg hover:text-ide-accent"
                                     >
                                        <Icons.Edit size={12} />
                                     </button>
                                )}
                            </div>
                        </div>

                        {state.activeConceptId === concept.id && (
                            <div className="mt-3 flex justify-end">
                                <button 
                                    onClick={() => dispatch({ type: 'FINALIZE_CONCEPT', payload: concept.id })}
                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold rounded flex items-center tracking-wider"
                                >
                                    FINALIZE
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
