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
            <div className="h-full flex items-center justify-center bg-studio-900 text-gray-600">
                <div className="text-center">
                    <Icons.Cut size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Awaiting Design Concepts from Master Agent...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-studio-800 p-8 overflow-y-auto">
            <h2 className="text-xl font-light mb-6 text-white border-b border-studio-600 pb-2">Design Generations</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {state.generatedConcepts.map((concept) => (
                    <div 
                        key={concept.id} 
                        className={`
                            border-2 rounded-lg p-4 transition duration-300 relative
                            ${state.activeConceptId === concept.id ? 'border-studio-accent bg-studio-700/30' : 'border-studio-700 hover:border-studio-600 bg-studio-900'}
                        `}
                        onClick={() => handleSelect(concept.id)}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-200">{concept.name}</h3>
                            {state.activeConceptId === concept.id && (
                                <span className="flex items-center text-xs text-studio-accent bg-studio-accent/10 px-2 py-1 rounded">
                                    <Icons.Check size={12} className="mr-1" /> Active
                                </span>
                            )}
                        </div>
                        
                        <p className="text-xs text-gray-400 mb-4 h-10 overflow-hidden text-ellipsis">{concept.description}</p>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Front View */}
                            <div className="group relative aspect-[3/4] bg-black/20 rounded-md overflow-hidden border border-studio-700">
                                <span className="absolute top-1 left-1 text-[10px] bg-black/60 px-1 text-gray-400">FRONT</span>
                                {concept.images.front ? (
                                    <img src={concept.images.front.url} className="w-full h-full object-cover" alt="Front" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-600 animate-pulse">
                                        Generating...
                                    </div>
                                )}
                                {concept.images.front && (
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); handleFocus(concept.images.front!.id); }}
                                        className="absolute bottom-2 right-2 p-2 bg-studio-accent text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                                     >
                                        <Icons.Edit size={14} />
                                     </button>
                                )}
                            </div>

                            {/* Back View */}
                            <div className="group relative aspect-[3/4] bg-black/20 rounded-md overflow-hidden border border-studio-700">
                                <span className="absolute top-1 left-1 text-[10px] bg-black/60 px-1 text-gray-400">BACK</span>
                                {concept.images.back ? (
                                    <img src={concept.images.back.url} className="w-full h-full object-cover" alt="Back" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-600 animate-pulse">
                                        Generating...
                                    </div>
                                )}
                                {concept.images.back && (
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); handleFocus(concept.images.back!.id); }}
                                        className="absolute bottom-2 right-2 p-2 bg-studio-accent text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                                     >
                                        <Icons.Edit size={14} />
                                     </button>
                                )}
                            </div>
                        </div>

                        {state.activeConceptId === concept.id && (
                            <div className="mt-4 flex justify-end">
                                <button 
                                    onClick={() => dispatch({ type: 'FINALIZE_CONCEPT', payload: concept.id })}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded flex items-center"
                                >
                                    <Icons.Check size={14} className="mr-2" /> FINALIZE
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};