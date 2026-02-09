import React from 'react';
import { useStudio } from '../../context/StudioContext';
import { AppTab } from '../../types';
import { Icons } from '../ui/Icons';
import { InspirationBoard } from '../studio/InspirationBoard';
import { GenerationBoard } from '../studio/GenerationBoard';
import { AgentConsole } from '../studio/AgentConsole';
import { BlueprintLab } from '../blueprint/BlueprintLab';
import { FocusEditor } from '../studio/FocusEditor';

export const Shell: React.FC = () => {
    const { state, dispatch } = useStudio();

    return (
        <div className="flex h-screen w-screen bg-studio-900 text-studio-text overflow-hidden">
            {/* Sidebar Activity Bar */}
            <div className="w-12 flex flex-col items-center bg-studio-800 border-r border-studio-700 py-4 gap-6 z-20">
                <button 
                    onClick={() => dispatch({ type: 'SET_TAB', payload: AppTab.STUDIO })}
                    className={`p-2 rounded hover:bg-studio-700 transition ${state.currentTab === AppTab.STUDIO ? 'text-studio-accent border-l-2 border-studio-accent' : 'text-gray-500'}`}
                    title="Design Studio"
                >
                    <Icons.Studio size={24} />
                </button>
                <button 
                    onClick={() => dispatch({ type: 'SET_TAB', payload: AppTab.BLUEPRINT })}
                    className={`p-2 rounded hover:bg-studio-700 transition ${state.currentTab === AppTab.BLUEPRINT ? 'text-studio-accent border-l-2 border-studio-accent' : 'text-gray-500'}`}
                    title="Blueprint Lab"
                >
                    <Icons.Blueprint size={24} />
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden relative">
                {state.currentTab === AppTab.STUDIO ? (
                    <>
                        {/* Panel 1: Inspiration (Collapsible/Fixed for now) */}
                        <div className="w-64 flex-shrink-0 hidden md:block">
                            <InspirationBoard />
                        </div>

                        {/* Panel 2: Center Stage */}
                        <div className="flex-1 bg-studio-950 relative">
                            <GenerationBoard />
                            {/* Overlay Editor */}
                            {state.focusedImageId && <FocusEditor />}
                        </div>

                        {/* Panel 3: Agent Console */}
                        <div className="flex-shrink-0 z-10 shadow-xl">
                            <AgentConsole />
                        </div>
                    </>
                ) : (
                    <BlueprintLab />
                )}
            </div>
            
            {/* Global API Key Warning if missing */}
            {!process.env.API_KEY && (
                 <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-xs font-bold text-center py-1 z-50">
                    WARNING: process.env.API_KEY is missing. AI features will run in simulation mode or fail.
                </div>
            )}
        </div>
    );
};
