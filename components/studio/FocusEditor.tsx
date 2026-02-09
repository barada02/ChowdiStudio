import React, { useEffect, useRef, useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import { geminiService } from '../../services/geminiService';
import { Icons } from '../ui/Icons';
import { ViewType, AgentStatus } from '../../types';

export const FocusEditor: React.FC = () => {
    const { state, dispatch } = useStudio();
    const [prompt, setPrompt] = useState('');
    const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
    const [brushSize, setBrushSize] = useState(30);
    const [isDrawing, setIsDrawing] = useState(false);
    
    // Refs
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Find the currently focused image
    const focusedImage = state.generatedConcepts
        .flatMap(c => [c.images.hero, c.images.technical])
        .find(img => img?.id === state.focusedImageId);

    const activeConcept = state.generatedConcepts.find(c => c.id === focusedImage?.conceptId);

    // Setup Mask Canvas sizing to match Image
    useEffect(() => {
        if (!focusedImage) return;

        // When the image loads, we sync the mask canvas size to it
        const img = imageRef.current;
        const canvas = maskCanvasRef.current;
        
        if (img && canvas) {
             const handleLoad = () => {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
            };
            
            // If already loaded
            if (img.complete) {
                handleLoad();
            } else {
                img.onload = handleLoad;
            }
        }
    }, [focusedImage]);

    // Drawing Logic
    const getPoint = (e: React.MouseEvent) => {
        const canvas = maskCanvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const startDraw = (e: React.MouseEvent) => {
        setIsDrawing(true);
        const ctx = maskCanvasRef.current?.getContext('2d');
        if (!ctx) return;

        const { x, y } = getPoint(e);
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = brushSize * (maskCanvasRef.current!.width / maskCanvasRef.current!.getBoundingClientRect().width); // Scale brush size relative to view? Actually brushSize is pixels on canvas.

        // Re-calculate brush size to be relative to the image resolution, 
        // otherwise a 30px brush on a 4K image is tiny.
        // Let's assume brushSize from UI is "Screen Pixels".
        // We need to map screen pixels to canvas pixels.
        const scale = maskCanvasRef.current!.width / maskCanvasRef.current!.getBoundingClientRect().width;
        ctx.lineWidth = brushSize * scale;

        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)'; // Red semi-transparent
        }
    };

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        const ctx = maskCanvasRef.current?.getContext('2d');
        if (!ctx) return;

        const { x, y } = getPoint(e);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDraw = () => {
        setIsDrawing(false);
        const ctx = maskCanvasRef.current?.getContext('2d');
        ctx?.closePath();
    };

    // Composite layers for Export
    const handleApplyEdit = async () => {
        if (!focusedImage || !activeConcept || !maskCanvasRef.current || !imageRef.current) return;
        
        dispatch({ type: 'SET_AGENT_STATUS', payload: AgentStatus.EDITING });
        
        try {
            // 1. Create a composite canvas
            const width = imageRef.current.naturalWidth;
            const height = imageRef.current.naturalHeight;
            const compositeCanvas = document.createElement('canvas');
            compositeCanvas.width = width;
            compositeCanvas.height = height;
            const ctx = compositeCanvas.getContext('2d');
            
            if (!ctx) throw new Error("Could not create context");

            // 2. Draw Base Image
            ctx.drawImage(imageRef.current, 0, 0);

            // 3. Draw Mask Overlay
            ctx.drawImage(maskCanvasRef.current, 0, 0);

            // 4. Get Data URL
            const maskedImageBase64 = compositeCanvas.toDataURL('image/png');

            // 5. Generate New Hero Image
            const newHeroUrl = await geminiService.editImage(maskedImageBase64, prompt);
            
            // Update Hero immediately
            dispatch({ 
                type: 'UPDATE_CONCEPT_IMAGE', 
                payload: { 
                    conceptId: activeConcept.id, 
                    imageId: focusedImage.id, 
                    view: ViewType.HERO, 
                    url: newHeroUrl 
                } 
            });

            // 6. Regenerate Technical Sketch
            const techId = activeConcept.images.technical?.id || `img-${activeConcept.id}-t`;
            const newTechUrl = await geminiService.generateTechnicalSketch(newHeroUrl);

            dispatch({ 
                type: 'UPDATE_CONCEPT_IMAGE', 
                payload: { 
                    conceptId: activeConcept.id, 
                    imageId: techId, 
                    view: ViewType.TECHNICAL, 
                    url: newTechUrl 
                } 
            });
            
            // Cleanup
            dispatch({ type: 'SET_FOCUSED_IMAGE', payload: null });
            
        } catch (e) {
            console.error(e);
        } finally {
            dispatch({ type: 'SET_AGENT_STATUS', payload: AgentStatus.IDLE });
        }
    };

    if (!focusedImage) return null;

    return (
        <div className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-ide-panel border border-ide-border rounded-lg shadow-2xl flex flex-col h-[90vh] w-full max-w-6xl overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-ide-border flex justify-between items-center bg-ide-bg">
                    <div>
                        <h3 className="text-ide-text font-medium flex items-center gap-2">
                            <Icons.Edit size={16} className="text-ide-accent" /> Focus Editor: {activeConcept?.name}
                        </h3>
                    </div>
                    <button 
                        onClick={() => dispatch({ type: 'SET_FOCUSED_IMAGE', payload: null })}
                        className="p-1.5 rounded-full hover:bg-ide-border transition"
                    >
                        <Icons.X size={20} className="text-ide-muted" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Canvas Area */}
                    <div className="flex-1 bg-[#1a1a1a] p-8 flex items-center justify-center overflow-hidden relative bg-dot-pattern select-none">
                        
                        {/* Container for Image + Canvas Stacking */}
                        <div 
                            ref={containerRef}
                            className="relative shadow-2xl border border-white/10 inline-block max-w-full max-h-full"
                        >
                            {/* 1. Base Image (Read Only) */}
                            <img 
                                ref={imageRef}
                                src={focusedImage.url} 
                                alt="Editing Target"
                                className="block max-w-full max-h-[75vh] w-auto h-auto object-contain pointer-events-none select-none"
                                crossOrigin="anonymous"
                            />

                            {/* 2. Mask Canvas (Drawing Layer) */}
                            <canvas 
                                ref={maskCanvasRef}
                                onMouseDown={startDraw}
                                onMouseMove={draw}
                                onMouseUp={stopDraw}
                                onMouseLeave={stopDraw}
                                className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                            />
                        </div>
                    </div>

                    {/* Tools Panel */}
                    <div className="w-80 bg-ide-panel border-l border-ide-border p-6 flex flex-col gap-6 overflow-y-auto">
                         
                         {/* Tools Section */}
                         <div className="space-y-4">
                            <label className="text-xs font-bold text-ide-muted uppercase block">Masking Tools</label>
                            
                            <div className="flex gap-2 bg-ide-bg p-1 rounded border border-ide-border">
                                <button
                                    onClick={() => setTool('brush')}
                                    className={`flex-1 py-2 rounded flex items-center justify-center gap-2 text-xs font-bold transition ${tool === 'brush' ? 'bg-ide-accent text-white shadow-sm' : 'text-ide-muted hover:text-ide-text hover:bg-ide-panel'}`}
                                >
                                    <Icons.Brush size={14} /> Brush
                                </button>
                                <button
                                    onClick={() => setTool('eraser')}
                                    className={`flex-1 py-2 rounded flex items-center justify-center gap-2 text-xs font-bold transition ${tool === 'eraser' ? 'bg-ide-panel text-ide-text shadow-sm border border-ide-border' : 'text-ide-muted hover:text-ide-text hover:bg-ide-panel'}`}
                                >
                                    <Icons.Eraser size={14} /> Eraser
                                </button>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-ide-muted">
                                    <span>Brush Size</span>
                                    <span>{brushSize}px</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="5" 
                                    max="100" 
                                    value={brushSize}
                                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                    className="w-full accent-ide-accent h-1.5 bg-ide-border rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-center pt-2 h-8">
                                    <div 
                                        className="rounded-full bg-red-500/50" 
                                        style={{ width: brushSize / 2, height: brushSize / 2 }} // Preview scaled down visually
                                    ></div>
                                </div>
                            </div>
                         </div>

                         <div className="h-px bg-ide-border w-full"></div>

                         {/* Prompt Section */}
                         <div className="flex-1 flex flex-col gap-2">
                            <label className="text-xs font-bold text-ide-muted uppercase">Edit Instruction</label>
                            <textarea 
                                className="w-full flex-1 bg-ide-bg border border-ide-border rounded p-3 text-sm text-ide-text focus:border-ide-accent outline-none resize-none focus:ring-1 focus:ring-ide-accent transition min-h-[120px]"
                                placeholder="Highlight an area and describe the change (e.g., 'Change fabric to sheer lace', 'Add gold embroidery')..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                         </div>
                         
                         <div className="bg-ide-bg p-3 rounded text-[10px] text-ide-muted border border-ide-border">
                             <strong className="block mb-1 text-ide-text">Pro Tip:</strong>
                             Only the highlighted area will be modified. The rest of the image will remain identical.
                         </div>

                         <button 
                            onClick={handleApplyEdit}
                            disabled={state.agentStatus === AgentStatus.EDITING || !prompt}
                            className={`
                                w-full py-4 rounded font-bold text-sm flex items-center justify-center gap-2 transition
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