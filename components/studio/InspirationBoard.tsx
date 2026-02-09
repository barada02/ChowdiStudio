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
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="h-10 px-3 border-b border-ide-border flex justify-between items-center bg-ide-panel">
                <h2 className="text-xs font-bold text-ide-muted uppercase tracking-wider">Inspiration</h2>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1 hover:bg-ide-bg rounded text-ide-text transition"
                    title="Upload Image or Video"
                >
                    <Icons.Upload size={14} />
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,video/*,audio/*"
                    onChange={handleFileUpload}
                />
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-ide-bg">
                {state.inspirationBoard.length === 0 && (
                    <div className="text-center text-ide-muted mt-10 p-4 border-2 border-dashed border-ide-border rounded-lg">
                        <Icons.Image className="mx-auto mb-2 opacity-50" size={24} />
                        <p className="text-xs">Drag & Drop inspiration here.</p>
                    </div>
                )}

                {state.inspirationBoard.map(asset => (
                    <div key={asset.id} className="relative group rounded overflow-hidden border border-ide-border bg-ide-panel shadow-sm">
                        {asset.type === 'image' && (
                            <img src={asset.content} alt={asset.name} className="w-full h-24 object-cover" />
                        )}
                        {asset.type === 'video' && (
                            <video src={asset.content} className="w-full h-24 object-cover" controls={false} autoPlay muted loop />
                        )}
                        {asset.type === 'audio' && (
                             <div className="w-full h-12 flex items-center justify-center bg-ide-panel text-ide-muted">
                                <span className="text-xs">Audio Clip</span>
                             </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
                            <span className="text-[10px] text-white font-mono px-2 text-center truncate w-full">{asset.name}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
