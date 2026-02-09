import React, { useEffect, useRef, useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import { geminiService } from '../../services/geminiService';
import { Icons } from '../ui/Icons';
import { ViewType, AgentStatus } from '../../types';

export const FocusEditor: React.FC = () => {
    const { state, dispatch } = useStudio();
    const [prompt, setPrompt] = useState('');
    const [tool, setTool] = useState<'brush' | 'eraser' | 'pan'>('brush');
    const [brushSize, setBrushSize] = useState(30);
    const [isDrawing, setIsDrawing] = useState(false);
    
    // Zoom & Pan State
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

    // Refs
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Find the currently focused image
    const focusedImage = state.generatedConcepts
        .flatMap(c => [c.images.hero, c.images.illustration, c.images.technical])
        .find(img => img?.id === state.focusedImageId);

    const activeConcept = state.generatedConcepts.find(c => c.id === focusedImage?.conceptId);

    // DETERMINE READ-ONLY STATUS
    // If it's not the Hero (Lookbook), it's a generated derivative and shouldn't be edited directly.
    const isReadOnly = focusedImage?.view === ViewType.ILLUSTRATION || focusedImage?.view === ViewType.TECHNICAL;

    // Force 'Pan' tool if read-only
    useEffect(() => {
        if (isReadOnly) {
            setTool('pan');
        } else {
            setTool('brush');
        }
    }, [isReadOnly]);

    // Setup Mask Canvas sizing to match Image
    useEffect(() => {
        if (!focusedImage) return;

        const img = imageRef.current;
        const canvas = maskCanvasRef.current;
        
        if (img && canvas) {
             const handleLoad = () => {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
            };
            
            if (img.complete) {
                handleLoad();
            } else {
                img.onload = handleLoad;
            }
        }
        
        // Reset zoom/pan on new image
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, [focusedImage]);

    // --- Panning Logic ---
    const startPan = (e: React.MouseEvent) => {
        setIsPanning(true);
        setLastMousePos({ x: e.clientX, y: e.clientY });
    };

    const doPan = (e: React.MouseEvent) => {
        if (!isPanning) return;
        const deltaX = e.clientX - lastMousePos.x;
        const deltaY = e.clientY - lastMousePos.y;
        
        setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
        setLastMousePos({ x: e.clientX, y: e.clientY });
    };

    const stopPan = () => {
        setIsPanning(false);
    };

    // --- Zoom Logic ---
    const handleWheel = (e: React.WheelEvent) => {
        const scaleAmount = -e.deltaY * 0.001;
        const newZoom = Math.min(Math.max(0.1, zoom + scaleAmount), 5);
        setZoom(newZoom);
    };


    // --- Drawing Logic ---
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
        if (tool === 'pan') {
            startPan(e);
            return;
        }
        
        // Safety check for Read Only
        if (isReadOnly) return;

        setIsDrawing(true);
        const ctx = maskCanvasRef.current?.getContext('2d');
        if (!ctx) return;

        const { x, y } = getPoint(e);
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const rect = maskCanvasRef.current!.getBoundingClientRect();
        const scale = maskCanvasRef.current!.width / rect.width;
        
        ctx.lineWidth = brushSize * scale;

        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)'; // Red semi-transparent
        }
    };

    const draw = (e: React.MouseEvent) => {
        if (tool === 'pan') {
            doPan(e);
            return;
        }

        if (!isDrawing) return;
        const ctx = maskCanvasRef.current?.getContext('2d');
        if (!ctx) return;

        const { x, y } = getPoint(e);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDraw = () => {
        if (tool === 'pan') {
            stopPan();
            return;
        }
        setIsDrawing(false);
        const ctx = maskCanvasRef.current?.getContext('2d');
        ctx?.closePath();
    };

    // Composite layers for Export
    const handleApplyEdit = async () => {
        if (!focusedImage || !activeConcept || !maskCanvasRef.current || !imageRef.current || isReadOnly) return;
        
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

            // 6. Regenerate Technical Sketch & Mood Sketch
            // NOTE: We regenerate dependent assets to keep them in sync
            const techId = activeConcept.images.technical?.id || `img-${activeConcept.id}-t`;
            const sketchId = activeConcept.images.illustration?.id || `img-${activeConcept.id}-s`;

            // We don't await these to make the UI feel snappier, let them update in background or next step
            geminiService.generateTechnicalSketch(newHeroUrl).then(url => {
                 dispatch({ 
                    type: 'UPDATE_CONCEPT_IMAGE', 
                    payload: { conceptId: activeConcept.id, imageId: techId, view: ViewType.TECHNICAL, url } 
                });
            });

             geminiService.generateFashionIllustration(newHeroUrl).then(url => {
                 dispatch({ 
                    type: 'UPDATE_CONCEPT_IMAGE', 
                    payload: { conceptId: activeConcept.id, imageId: sketchId, view: ViewType.ILLUSTRATION, url } 
                });
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
                <div className="p-4 border-b border-ide-border flex justify-between items-center bg-ide-bg z-10">
                    <div>
                        <h3 className="text-ide-text font-medium flex items-center gap-2">
                            {isReadOnly ? (
                                <><Icons.Zoom size={16} className="text-ide-accent" /> Inspector: {activeConcept?.name}</>
                            ) : (
                                <><Icons.Edit size={16} className="text-ide-accent" /> Editor: {activeConcept?.name}</>
                            )}
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
                    <div 
                        className="flex-1 bg-[#1a1a1a] overflow-hidden relative bg-dot-pattern select-none"
                        onWheel={handleWheel}
                    >
                        {/* Transform Container */}
                        <div 
                            style={{ 
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                transformOrigin: 'center center',
                                transition: isPanning ? 'none' : 'transform 0.1s ease-out'
                            }}
                            className="w-full h-full flex items-center justify-center"
                        >
                            <div 
                                ref={containerRef}
                                className="relative shadow-2xl border border-white/10 inline-block"
                            >
                                {/* 1. Base Image (Read Only) */}
                                <img 
                                    ref={imageRef}
                                    src={focusedImage.url} 
                                    alt="Editing Target"
                                    className="block max-w-none w-auto h-auto pointer-events-none select-none"
                                    style={{ maxHeight: 'none', maxWidth: 'none' }} // Allow scale to determine size
                                    crossOrigin="anonymous"
                                />

                                {/* 2. Mask Canvas (Drawing Layer) */}
                                {/* Hide cursor crosshair if read only */}
                                <canvas 
                                    ref={maskCanvasRef}
                                    onMouseDown={startDraw}
                                    onMouseMove={draw}
                                    onMouseUp={stopDraw}
                                    onMouseLeave={stopDraw}
                                    className={`absolute inset-0 w-full h-full touch-none ${tool === 'pan' ? 'cursor-grab active:cursor-grabbing' : isReadOnly ? 'cursor-default' : 'cursor-crosshair'}`}
                                />
                            </div>
                        </div>

                        {/* Zoom Indicator */}
                        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-mono border border-white/10 pointer-events-none">
                            {Math.round(zoom * 100)}%
                        </div>
                    </div>

                    {/* Tools Panel */}
                    <div className="w-80 bg-ide-panel border-l border-ide-border p-6 flex flex-col gap-6 overflow-y-auto z-10 shadow-xl">
                         
                         {/* Tools Section */}
                         <div className="space-y-4">
                            <label className="text-xs font-bold text-ide-muted uppercase block">
                                {isReadOnly ? 'Inspection Tools' : 'Viewport & Masking'}
                            </label>
                            
                            <div className="flex gap-2 bg-ide-bg p-1 rounded border border-ide-border">
                                <button
                                    onClick={() => setTool('pan')}
                                    title="Pan (Move)"
                                    className={`flex-1 py-2 rounded flex items-center justify-center gap-2 text-xs font-bold transition ${tool === 'pan' ? 'bg-ide-accent text-white shadow-sm' : 'text-ide-muted hover:text-ide-text hover:bg-ide-panel'}`}
                                >
                                    <Icons.Hand size={14} />
                                </button>
                                
                                {!isReadOnly && (
                                    <>
                                        <button
                                            onClick={() => setTool('brush')}
                                            title="Mask Brush"
                                            className={`flex-1 py-2 rounded flex items-center justify-center gap-2 text-xs font-bold transition ${tool === 'brush' ? 'bg-ide-accent text-white shadow-sm' : 'text-ide-muted hover:text-ide-text hover:bg-ide-panel'}`}
                                        >
                                            <Icons.Brush size={14} />
                                        </button>
                                        <button
                                            onClick={() => setTool('eraser')}
                                            title="Eraser"
                                            className={`flex-1 py-2 rounded flex items-center justify-center gap-2 text-xs font-bold transition ${tool === 'eraser' ? 'bg-ide-panel text-ide-text shadow-sm border border-ide-border' : 'text-ide-muted hover:text-ide-text hover:bg-ide-panel'}`}
                                        >
                                            <Icons.Eraser size={14} />
                                        </button>
                                    </>
                                )}
                            </div>

                            <div className="space-y-2 pt-2">
                                <div className="flex justify-between text-xs text-ide-muted">
                                    <span>Zoom Level</span>
                                    <span>{Math.round(zoom * 100)}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0.1" 
                                    max="3" 
                                    step="0.1"
                                    value={zoom}
                                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                                    className="w-full accent-ide-accent h-1.5 bg-ide-border rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                            
                            {!isReadOnly && (
                                <div className="space-y-2 pt-2">
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
                                </div>
                            )}
                         </div>

                         <div className="h-px bg-ide-border w-full"></div>

                         {/* Prompt Section OR Read Only Message */}
                         {!isReadOnly ? (
                             <>
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
                                    Use the Hand tool to move around large images. Highlighting is precise at high zoom levels.
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
                             </>
                         ) : (
                             <div className="flex-1 flex flex-col justify-center items-center text-center p-4 opacity-70 bg-ide-bg rounded border border-ide-border border-dashed">
                                <Icons.Layers size={48} className="text-ide-muted mb-4 opacity-50" />
                                <h4 className="text-sm font-bold text-ide-text uppercase tracking-wide">Read Only View</h4>
                                <p className="text-xs text-ide-muted mt-3 leading-relaxed">
                                    This asset is auto-generated from the Lookbook. <br/><br/>
                                    To modify the design, please edit the <strong>Lookbook (Hero)</strong> image. The sketches will update automatically.
                                </p>
                                <button 
                                    onClick={() => dispatch({ type: 'SET_FOCUSED_IMAGE', payload: activeConcept?.images.hero?.id || null })}
                                    className="mt-6 px-4 py-2 bg-ide-panel border border-ide-border rounded text-xs font-bold hover:border-ide-accent hover:text-ide-accent transition shadow-sm"
                                >
                                    Switch to Lookbook
                                </button>
                             </div>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
};