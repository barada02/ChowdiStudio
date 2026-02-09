import React, { useRef } from 'react';
import { useStudio } from '../../context/StudioContext';
import { Icons } from '../ui/Icons';
import { InspirationAsset } from '../../types';

export const InspirationBoard: React.FC = () => {
    const { state, dispatch } = useStudio();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target?.result as string;
            
            let type: InspirationAsset['type'] = 'text';
            if (file.type.startsWith('image')) type = 'image';
            if (file.type.startsWith('video')) type = 'video';
            if (file.type.startsWith('audio')) type = 'audio';

            const newAsset: InspirationAsset = {
                id: Date.now().toString(),
                type: type,
                mimeType: file.type,
                content: base64,
                name: file.name
            };
            dispatch({ type: 'ADD_INSPIRATION', payload: newAsset });
            // Optionally auto-select new uploads
            dispatch({ type: 'TOGGLE_ASSET_SELECTION', payload: newAsset.id });
        };
        reader.readAsDataURL(file);
    };

    const toggleSelection = (id: string) => {
        dispatch({ type: 'TOGGLE_ASSET_SELECTION', payload: id });
    };

    return (
        <div className="h-full flex flex-col bg-ide-panel">
            {/* Header */}
            <div className="h-10 px-3 border-b border-ide-border flex justify-between items-center bg-ide-panel flex-shrink-0">
                <h2 className="text-xs font-bold text-ide-muted uppercase tracking-wider flex items-center gap-2">
                     Inspiration
                </h2>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 hover:bg-ide-bg rounded text-ide-text transition flex items-center justify-center"
                        title="Upload Image or Video"
                    >
                        <Icons.Upload size={14} />
                    </button>
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,video/*,audio/*"
                    onChange={handleFileUpload}
                />
            </div>
            
            {/* Grid Container */}
            <div className="flex-1 overflow-y-auto p-3 bg-ide-bg">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
                    
                    {/* Empty State */}
                    {state.inspirationBoard.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center text-center text-ide-muted mt-10 p-6 border-2 border-dashed border-ide-border rounded-lg bg-ide-panel/50">
                            <Icons.Image className="mb-3 opacity-40" size={32} />
                            <p className="text-xs font-medium">Drag & Drop Assets</p>
                            <p className="text-[10px] mt-1 opacity-70">Images, Videos, Audio</p>
                        </div>
                    )}

                    {/* Assets */}
                    {state.inspirationBoard.map(asset => {
                        const isSelected = state.selectedAssetIds.includes(asset.id);
                        return (
                            <div 
                                key={asset.id} 
                                onClick={() => toggleSelection(asset.id)}
                                className={`
                                    relative group rounded-md overflow-hidden border cursor-pointer transition-all duration-200 break-inside-avoid
                                    ${isSelected ? 'border-ide-accent ring-2 ring-ide-accent ring-opacity-50 shadow-md' : 'border-ide-border bg-ide-panel opacity-80 hover:opacity-100'}
                                `}
                            >
                                {/* Selection Indicator */}
                                <div className={`absolute top-2 right-2 z-20 w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${isSelected ? 'bg-ide-accent border-ide-accent' : 'bg-black/30 border-white/50'}`}>
                                    {isSelected && <Icons.Check size={10} className="text-white" />}
                                </div>

                                {/* Media Content */}
                                {asset.type === 'image' && (
                                    <img 
                                        src={asset.content} 
                                        alt={asset.name} 
                                        className="w-full h-auto block" 
                                        loading="lazy"
                                    />
                                )}
                                {asset.type === 'video' && (
                                    <video 
                                        src={asset.content} 
                                        className="w-full h-auto block bg-black" 
                                        controls={false} 
                                        autoPlay={false} // Don't autoplay to save resources, preview on hover?
                                        muted 
                                        loop 
                                        playsInline 
                                    />
                                )}
                                {asset.type === 'audio' && (
                                     <div className="w-full h-20 flex flex-col items-center justify-center bg-ide-panel text-ide-muted p-2">
                                        <div className="w-8 h-8 rounded-full bg-ide-bg flex items-center justify-center mb-2">
                                            <div className="w-2 h-2 bg-ide-accent rounded-full animate-pulse"></div>
                                        </div>
                                        <span className="text-[9px] uppercase tracking-widest">Audio</span>
                                     </div>
                                )}

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-ide-bg/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 backdrop-blur-sm">
                                    <span className="text-[10px] text-ide-text font-mono text-center break-all line-clamp-3 leading-tight">
                                        {asset.name}
                                    </span>
                                    <p className="text-[9px] text-ide-accent mt-2 font-bold">
                                        {isSelected ? 'SHARED WITH AI' : 'CLICK TO SHARE'}
                                    </p>
                                </div>
                                
                                {/* Type Badge */}
                                <div className="absolute bottom-1 right-1 opacity-60 group-hover:opacity-0 transition-opacity">
                                    <span className="text-[9px] font-bold bg-black/50 text-white px-1.5 py-0.5 rounded backdrop-blur-md uppercase">
                                        {asset.type}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
