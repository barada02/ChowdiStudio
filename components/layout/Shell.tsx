import React, { useState, useRef, useEffect } from 'react';
import { useStudio } from '../../context/StudioContext';
import { AppTab } from '../../types';
import { Icons } from '../ui/Icons';
import { InspirationBoard } from '../studio/InspirationBoard';
import { GenerationBoard } from '../studio/GenerationBoard';
import { AgentConsole } from '../studio/AgentConsole';
import { BlueprintLab } from '../blueprint/BlueprintLab';
import { FocusEditor } from '../studio/FocusEditor';
import { RunwayStage } from '../runway/RunwayStage';

// --- Header Component ---
const Header: React.FC = () => {
    const { state, dispatch } = useStudio();
    return (
        <header className="h-10 flex items-center justify-between px-4 bg-ide-panel border-b border-ide-border flex-shrink-0">
            <div className="flex items-center gap-2">
                <Icons.Scissors size={18} className="text-ide-accent" />
                <span className="font-semibold text-sm tracking-wide">ChowdiStudio</span>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-xs text-ide-muted bg-ide-bg px-2 py-1 rounded border border-ide-border">
                   {process.env.API_KEY ? 'CONNECTED' : 'DEMO MODE'}
                </span>
                <button 
                    onClick={() => dispatch({ type: 'TOGGLE_THEME' })}
                    className="p-1 hover:bg-ide-bg rounded text-ide-muted hover:text-ide-text transition"
                >
                    {state.theme === 'dark' ? <Icons.Sun size={16} /> : <Icons.Moon size={16} />}
                </button>
            </div>
        </header>
    );
};

// --- Resizable Shell ---
export const Shell: React.FC = () => {
    const { state, dispatch } = useStudio();
    
    // Resize State
    const [leftWidth, setLeftWidth] = useState(260);
    const [rightWidth, setRightWidth] = useState(320);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDraggingLeft = useRef(false);
    const isDraggingRight = useRef(false);

    // Resize Logic
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();

            if (isDraggingLeft.current) {
                const newWidth = e.clientX - containerRect.left - 48; // 48 is ActivityBar width
                if (newWidth > 150 && newWidth < 500) setLeftWidth(newWidth);
            }

            if (isDraggingRight.current) {
                const newWidth = containerRect.right - e.clientX;
                if (newWidth > 250 && newWidth < 600) setRightWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            isDraggingLeft.current = false;
            isDraggingRight.current = false;
            document.body.style.cursor = 'default';
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const startLeftResize = () => {
        isDraggingLeft.current = true;
        document.body.style.cursor = 'col-resize';
    };

    const startRightResize = () => {
        isDraggingRight.current = true;
        document.body.style.cursor = 'col-resize';
    };

    return (
        <div className="flex flex-col h-screen w-screen bg-ide-bg text-ide-text overflow-hidden">
            <Header />
            
            <div className="flex flex-1 overflow-hidden" ref={containerRef}>
                {/* Activity Bar (Fixed Left) */}
                <div className="w-12 flex flex-col items-center bg-ide-panel border-r border-ide-border py-4 gap-4 z-20 flex-shrink-0">
                    <button 
                        onClick={() => dispatch({ type: 'SET_TAB', payload: AppTab.STUDIO })}
                        className={`p-2 rounded transition ${state.currentTab === AppTab.STUDIO ? 'text-ide-accent border-l-2 border-ide-accent bg-ide-bg' : 'text-ide-muted hover:text-ide-text'}`}
                        title="Design Studio"
                    >
                        <Icons.Studio size={24} />
                    </button>
                    <button 
                        onClick={() => dispatch({ type: 'SET_TAB', payload: AppTab.BLUEPRINT })}
                        className={`p-2 rounded transition ${state.currentTab === AppTab.BLUEPRINT ? 'text-ide-accent border-l-2 border-ide-accent bg-ide-bg' : 'text-ide-muted hover:text-ide-text'}`}
                        title="Blueprint Lab"
                    >
                        <Icons.Blueprint size={24} />
                    </button>
                    <button 
                        onClick={() => dispatch({ type: 'SET_TAB', payload: AppTab.RUNWAY })}
                        className={`p-2 rounded transition ${state.currentTab === AppTab.RUNWAY ? 'text-ide-accent border-l-2 border-ide-accent bg-ide-bg' : 'text-ide-muted hover:text-ide-text'}`}
                        title="Runway"
                    >
                        <Icons.Runway size={24} />
                    </button>
                </div>

                {state.currentTab === AppTab.STUDIO ? (
                    <>
                        {/* Resizable Left Panel (Inspiration) */}
                        <div style={{ width: leftWidth }} className="flex-shrink-0 flex flex-col bg-ide-panel border-r border-ide-border">
                            <InspirationBoard />
                        </div>
                        
                        {/* Drag Handle Left */}
                        <div 
                            onMouseDown={startLeftResize}
                            className="w-1 cursor-col-resize hover:bg-ide-accent transition-colors flex items-center justify-center z-10"
                        >
                        </div>

                        {/* Center Stage (Canvas) */}
                        <div className="flex-1 relative bg-dot-pattern overflow-hidden flex flex-col">
                            {/* The GenerationBoard acts as the canvas */}
                            <GenerationBoard />
                            {state.focusedImageId && <FocusEditor />}
                        </div>

                        {/* Drag Handle Right */}
                        <div 
                            onMouseDown={startRightResize}
                            className="w-1 cursor-col-resize hover:bg-ide-accent transition-colors flex items-center justify-center z-10"
                        >
                        </div>

                        {/* Resizable Right Panel (Chat) */}
                        <div style={{ width: rightWidth }} className="flex-shrink-0 flex flex-col bg-ide-panel border-l border-ide-border shadow-xl">
                            <AgentConsole />
                        </div>
                    </>
                ) : state.currentTab === AppTab.BLUEPRINT ? (
                    <div className="flex-1 bg-ide-bg">
                        <BlueprintLab />
                    </div>
                ) : (
                    <div className="flex-1 bg-ide-bg">
                        <RunwayStage />
                    </div>
                )}
            </div>
            
            {!process.env.API_KEY && (
                 <div className="absolute bottom-0 left-0 w-full bg-red-600 text-white text-[10px] font-bold text-center py-0.5 z-50">
                    WARNING: API_KEY missing.
                </div>
            )}
        </div>
    );
};
