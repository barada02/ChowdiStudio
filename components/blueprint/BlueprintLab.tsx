import React from 'react';
import { useStudio } from '../../context/StudioContext';
import { AppTab } from '../../types';
import { Icons } from '../ui/Icons';

export const BlueprintLab: React.FC = () => {
    const { state, dispatch } = useStudio();

    // Find finalized concept (concept active when finalized)
    const finalConcept = state.activeConceptId 
        ? state.generatedConcepts.find(c => c.id === state.activeConceptId)
        : null;

    if (!finalConcept) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Icons.Blueprint size={64} className="mb-4 opacity-20" />
                <h2 className="text-xl font-light">No Design Finalized</h2>
                <p className="mt-2 text-sm">Return to the Design Studio to create and finalize a concept.</p>
                <button 
                    onClick={() => dispatch({ type: 'SET_TAB', payload: AppTab.STUDIO })}
                    className="mt-6 px-6 py-2 border border-studio-600 rounded hover:bg-studio-700 text-white transition"
                >
                    Go to Studio
                </button>
            </div>
        );
    }

    return (
        <div className="h-full bg-studio-900 p-8 text-white overflow-y-auto">
            <div className="flex items-center gap-4 mb-8 border-b border-studio-700 pb-4">
                <div className="p-3 bg-green-600/20 rounded-full text-green-500">
                    <Icons.Check size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">{finalConcept.name} - Technical Blueprint</h1>
                    <p className="text-gray-400 font-mono text-sm">ID: {finalConcept.id.substring(0,8)} | STATUS: READY_FOR_SOURCING</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Tech Pack Left */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-studio-800 p-4 rounded border border-studio-700">
                            <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase">Front Elevation</h3>
                            <img src={finalConcept.images.front?.url} className="w-full rounded" alt="Front" />
                        </div>
                        <div className="bg-studio-800 p-4 rounded border border-studio-700">
                            <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase">Back Elevation</h3>
                            <img src={finalConcept.images.back?.url} className="w-full rounded" alt="Back" />
                        </div>
                    </div>

                    <div className="bg-studio-800 p-6 rounded border border-studio-700">
                        <h3 className="text-lg font-medium mb-4 flex items-center gap-2"><Icons.Cut size={18}/> Construction Notes</h3>
                        <p className="text-gray-300 leading-relaxed font-mono text-sm">
                            {finalConcept.description}
                            <br/><br/>
                            [System Placeholder: Material Sourcing Logic & Pattern Grading algorithms would execute here in Phase 3.]
                        </p>
                    </div>
                </div>

                {/* Sourcing Right */}
                <div className="bg-studio-800 border-l border-studio-700 p-6 space-y-6">
                    <div>
                        <h3 className="text-sm font-bold text-studio-accent mb-2 uppercase">Material Bill of Materials</h3>
                        <ul className="space-y-2 text-sm text-gray-300">
                            <li className="flex justify-between border-b border-studio-700 pb-1"><span>Primary Fabric</span> <span>Silk/Cotton Blend</span></li>
                            <li className="flex justify-between border-b border-studio-700 pb-1"><span>Lining</span> <span>Viscose</span></li>
                            <li className="flex justify-between border-b border-studio-700 pb-1"><span>Hardware</span> <span>Gunmetal Zippers</span></li>
                        </ul>
                    </div>

                     <div className="p-4 bg-studio-900 border border-studio-700 rounded-lg">
                        <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase">AI Analysis</h3>
                        <p className="text-xs text-gray-400 italic">
                            "The structural integrity of the sleeve design requires reinforced stitching. Suggesting French seams for the bodice."
                        </p>
                    </div>
                    
                    <button className="w-full bg-studio-700 hover:bg-studio-600 text-white py-3 rounded flex items-center justify-center gap-2 transition">
                        <Icons.Save size={16} /> Export PDF
                    </button>
                </div>
            </div>
        </div>
    );
};