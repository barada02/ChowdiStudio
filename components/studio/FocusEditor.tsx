import React, { useEffect, useRef, useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import { geminiService } from '../../services/geminiService';
import { Icons } from '../ui/Icons';
import { ViewType, AgentStatus } from '../../types';

export const FocusEditor: React.FC = () => {
    const { state, dispatch } = useStudio();
    const [prompt, setPrompt] = useState('');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

    // Find the currently focused image object
    const focusedImage = state.generatedConcepts
        .flatMap(c => [c.images.front, c.images.back])
        .find(img => img?.id === state.focusedImageId);

    const activeConcept = state.generatedConcepts.find(c => c.id === focusedImage?.conceptId);

    useEffect(() => {
        if (canvasRef.current && focusedImage) {
            const context = canvasRef.current.getContext('2d');
            setCtx(context);
            
            const img = new Image();
            img.src = focusedImage.url;
            img.onload = () => {
                if (canvasRef.current) {
                    canvasRef.current.width = img.width;
                    canvasRef.current.height = img.height;
                    context?.drawImage(img, 0, 0);
                }
            };
        }
    }, [focusedImage]);

    const startDraw = (e: React.MouseEvent) => {
        if (!ctx) return;
        setIsDrawing(true);
        ctx.beginPath();
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Visual mask
        ctx.lineWidth = 20;
        ctx.lineCap = 'round';
    };

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing || !ctx) return;
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.stroke();
    };

    const stopDraw = () => {
        setIsDrawing(false);
        ctx?.closePath();
    };

    const handleApplyEdit = async () => {
        if (!focusedImage || !activeConcept) return;
        
        dispatch({ type: 'SET_AGENT_STATUS', payload: AgentStatus.EDITING });
        
        // In a real implementation with Gemini 3, we might send the canvas (image + mask)
        // Here, we send the original image + instructions for simplicity and speed in this demo
        const newImageUrl = await geminiService.editImage(focusedImage.url, prompt);
        
        dispatch({ 
            type: 'UPDATE_CONCEPT_IMAGE', 
            payload: { 
                conceptId: activeConcept.id, 
                view: focusedImage.view, 
                url: newImageUrl 
            } 
        });
        
        dispatch({ type: 'SET_AGENT_STATUS', payload: AgentStatus.IDLE });
        dispatch({ type: 'SET_FOCUSED_IMAGE', payload: null }); // Close editor
    };

    if (!focusedImage) return null;

    return (
        <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-10 backdrop-blur-sm">
            <div className="bg-studio-800 border border-studio-600 rounded-lg shadow-2xl flex flex-col max-h-full max-w-5xl w-full overflow-hidden">
                <div className="p-4 border-b border-studio-700 flex justify-between items-center bg-studio-900">
                    <div>
                        <h3 className="text-white font-medium flex items-center gap-2">
                            <Icons.Edit size={16} /> Focus View: {activeConcept?.name} ({focusedImage.view})
                        </h3>
                        <p className="text-xs text-gray-400">Draw over the area you want to change, then describe the change.</p>
                    </div>
                    <button 
                        onClick={() => dispatch({ type: 'SET_FOCUSED_IMAGE', payload: null })}
                        className="text-gray-400 hover:text-white"
                    >
                        X
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Canvas Area */}
                    <div className="flex-1 bg-black/50 p-4 flex items-center justify-center overflow-auto cursor-crosshair">
                        <canvas 
                            ref={canvasRef}
                            onMouseDown={startDraw}
                            onMouseMove={draw}
                            onMouseUp={stopDraw}
                            onMouseLeave={stopDraw}
                            className="max-h-full max-w-full shadow-lg border border-studio-700"
                            style={{ maxHeight: '60vh' }}
                        />
                    </div>

                    {/* Controls */}
                    <div className="w-80 bg-studio-900 border-l border-studio-700 p-6 flex flex-col gap-4">
                         <div className="bg-studio-800 p-3 rounded text-xs text-gray-300 border border-studio-700">
                            <strong>Tool:</strong> Masking Pen <br/>
                            <span className="text-gray-500">Highlight area to preserve or modify context.</span>
                         </div>

                         <div className="flex-1"></div>

                         <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Modification Prompt</label>
                            <textarea 
                                className="w-full bg-studio-950 border border-studio-700 rounded p-2 text-sm text-gray-200 focus:border-studio-accent outline-none resize-none h-24"
                                placeholder="e.g., Change the fabric to red velvet..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                         </div>

                         <button 
                            onClick={handleApplyEdit}
                            disabled={state.agentStatus === AgentStatus.EDITING || !prompt}
                            className={`
                                w-full py-3 rounded font-bold text-sm flex items-center justify-center gap-2
                                ${state.agentStatus === AgentStatus.EDITING ? 'bg-studio-700 cursor-wait' : 'bg-studio-accent hover:bg-blue-600 text-white'}
                            `}
                         >
                             {state.agentStatus === AgentStatus.EDITING ? (
                                 <><Icons.Spinner className="animate-spin" size={16} /> Processing...</>
                             ) : (
                                 <><Icons.Send size={16} /> Generate Edit</>
                             )}
                         </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
