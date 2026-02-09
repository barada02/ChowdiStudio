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
        <div className="h-full flex flex-col bg-studio-900 border-r border-studio-700">
            <div className="p-3 border-b border-studio-700 flex justify-between items-center">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inspiration Board</h2>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1 hover:bg-studio-700 rounded text-gray-300 transition"
                    title="Upload Image or Video"
                >
                    <Icons.Upload size={16} />
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,video/*,audio/*"
                    onChange={handleFileUpload}
                />
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {state.inspirationBoard.length === 0 && (
                    <div className="text-center text-gray-600 mt-10 p-4 border-2 border-dashed border-studio-700 rounded-lg">
                        <Icons.Image className="mx-auto mb-2 opacity-50" size={32} />
                        <p className="text-sm">Drag & Drop or Upload images/videos here to inspire the Master Agent.</p>
                    </div>
                )}

                {state.inspirationBoard.map(asset => (
                    <div key={asset.id} className="relative group rounded-md overflow-hidden border border-studio-700 bg-studio-800">
                        {asset.type === 'image' && (
                            <img src={asset.content} alt={asset.name} className="w-full h-32 object-cover" />
                        )}
                        {asset.type === 'video' && (
                            <video src={asset.content} className="w-full h-32 object-cover" controls={false} autoPlay muted loop />
                        )}
                        {asset.type === 'audio' && (
                             <div className="w-full h-16 flex items-center justify-center bg-studio-800 text-gray-400">
                                <span className="text-xs">Audio Clip</span>
                             </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
                            <span className="text-xs text-white font-mono px-2 text-center">{asset.name}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
