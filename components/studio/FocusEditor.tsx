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
    // Note: The logic here relies on valid ID matching. 
    // The previous reducer fix ensures IDs are present.
    const focusedImage = state.generatedConcepts
        .flatMap(c => [c.images.front, c.images.back])
        .find(img => img?.id === state.focusedImageId);

    const activeConcept = state.generatedConcepts.find(c => c.id === focusedImage?.conceptId);

    // Initialize Canvas with Image
    useEffect(() => {
        if (canvasRef.current && focusedImage) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                setCtx(context);
                const img = new Image();
                img.src = focusedImage.url;
                img.crossOrigin = "anonymous"; // Needed if using external URLs, though here it's mostly base64
                img.onload = () => {
                    if (canvasRef.current) {
                        // Set canvas size to match image resolution
                        canvasRef.current.width = img.width;
                        canvasRef.current.height = img.height;
                        context.drawImage(img, 0, 0);
                    }
                };
            }
        }
    }, [focusedImage]);

    const startDraw = (e: React.MouseEvent) => {
        if (!ctx) return;
        setIsDrawing(true);
        ctx.beginPath();
        
        // Calculate coordinate based on scaling (visual size vs actual canvas size)
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
        
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Visual mask color (Red, 50% opacity)
        ctx.lineWidth = 25 * scaleX; // Scale stroke width relative to image size
        ctx.lineCap = 'round';
    };

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing || !ctx || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
        ctx.stroke();
    };

    const stopDraw = () => {
        setIsDrawing(false);
        ctx?.closePath();
    };

    const handleApplyEdit = async () => {
        if (!focusedImage || !activeConcept || !canvasRef.current) return;
        
        dispatch({ type: 'SET_AGENT_STATUS', payload: AgentStatus.EDITING });
        
        // --- KEY CHANGE: Send the CANVAS data (Image + Drawing), not the original URL ---
        const maskedImageBase64 = canvasRef.current.toDataURL('image/png');

        // This effectively delegates the task to the "Edit Agent" (Service function)
        const newImageUrl = await geminiService.editImage(maskedImageBase64, prompt);
        
        dispatch({ 
            type: 'UPDATE_CONCEPT_IMAGE', 
            payload: { 
                conceptId: activeConcept.id, 
                imageId: focusedImage.id, // Keep same ID or generate new one? Keeping same ID updates the view in place.
                view: focusedImage.view, 
                url: newImageUrl 
            } 
        });
        
        dispatch({ type: 'SET_AGENT_STATUS', payload: AgentStatus.IDLE });
        dispatch({ type: 'SET_FOCUSED_IMAGE', payload: null }); // Close editor
    };

    if (!focusedImage) return null;

    return (
        <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-10 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-ide-panel border border-ide-border rounded-lg shadow-2xl flex flex-col max-h-full max-w-5xl w-full overflow-hidden">
                <div className="p-4 border-b border-ide-border flex justify-between items-center bg-ide-bg">
                    <div>
                        <h3 className="text-ide-text font-medium flex items-center gap-2">
                            <Icons.Edit size={16} className="text-ide-accent" /> Focus View: {activeConcept?.name} ({focusedImage.view})
                        </h3>
                        <p className="text-xs text-ide-muted">Draw over the area you want to change, then describe the change.</p>
                    </div>
                    <button 
                        onClick={() => dispatch({ type: 'SET_FOCUSED_IMAGE', payload: null })}
                        className="p-1 rounded hover:bg-red-500/10 hover:text-red-500 text-ide-muted transition"
                    >
                        <Icons.X size={20} />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Canvas Area */}
                    <div className="flex-1 bg-ide-bg p-4 flex items-center justify-center overflow-auto cursor-crosshair relative bg-dot-pattern">
                        <canvas 
                            ref={canvasRef}
                            onMouseDown={startDraw}
                            onMouseMove={draw}
                            onMouseUp={stopDraw}
                            onMouseLeave={stopDraw}
                            className="max-h-full max-w-full shadow-lg border border-ide-border"
                        />
                    </div>

                    {/* Controls */}
                    <div className="w-80 bg-ide-panel border-l border-ide-border p-6 flex flex-col gap-4">
                         <div className="bg-ide-bg p-3 rounded text-xs text-ide-muted border border-ide-border">
                            <strong className="text-ide-text block mb-1">Tool: Masking Pen</strong>
                            <span className="opacity-80">Highlight the specific area you want to change. The AI will preserve the rest.</span>
                         </div>

                         <div className="flex-1"></div>

                         <div className="space-y-2">
                            <label className="text-xs font-bold text-ide-text uppercase">Modification Prompt</label>
                            <textarea 
                                className="w-full bg-ide-bg border border-ide-border rounded p-3 text-sm text-ide-text focus:border-ide-accent outline-none resize-none h-32 focus:ring-1 focus:ring-ide-accent transition"
                                placeholder="e.g., Change the sleeve fabric to sheer lace..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                         </div>

                         <button 
                            onClick={handleApplyEdit}
                            disabled={state.agentStatus === AgentStatus.EDITING || !prompt}
                            className={`
                                w-full py-3 rounded font-bold text-sm flex items-center justify-center gap-2 transition
                                ${state.agentStatus === AgentStatus.EDITING 
                                    ? 'bg-ide-muted cursor-wait opacity-70' 
                                    : 'bg-ide-accent hover:bg-ide-accent-hover text-white shadow-lg hover:shadow-xl'}
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
