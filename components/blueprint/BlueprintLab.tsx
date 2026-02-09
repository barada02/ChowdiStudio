import React, { useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { useStudio } from '../../context/StudioContext';
import { geminiService } from '../../services/geminiService';
import { AppTab, ViewType, AgentStatus } from '../../types';
import { Icons } from '../ui/Icons';

export const BlueprintLab: React.FC = () => {
    const { state, dispatch } = useStudio();

    // Find finalized concept (concept active when finalized)
    const finalConcept = state.activeConceptId 
        ? state.generatedConcepts.find(c => c.id === state.activeConceptId)
        : null;

    // --- 1. Auto-generate Technical Flat ---
    useEffect(() => {
        const generateFlat = async () => {
            if (finalConcept && finalConcept.images.hero && !finalConcept.images.technical) {
                const techId = `img-${finalConcept.id}-t`;
                const techUrl = await geminiService.generateTechnicalSketch(finalConcept.images.hero.url);
                
                dispatch({ 
                    type: 'UPDATE_CONCEPT_IMAGE', 
                    payload: { 
                        conceptId: finalConcept.id, 
                        imageId: techId, 
                        view: ViewType.TECHNICAL, 
                        url: techUrl 
                    } 
                });
            }
        };
        generateFlat();
    }, [finalConcept]);

    // --- 2. Auto-generate Tech Pack Data ---
    useEffect(() => {
        const generateData = async () => {
            if (finalConcept && finalConcept.images.hero && !finalConcept.techPack && state.agentStatus === AgentStatus.IDLE) {
                dispatch({ type: 'SET_AGENT_STATUS', payload: AgentStatus.ANALYZING });
                
                try {
                    // Step A: Generate JSON Data
                    const techPack = await geminiService.generateTechPack(finalConcept.images.hero.url);
                    dispatch({ type: 'UPDATE_TECH_PACK', payload: { conceptId: finalConcept.id, techPack } });
                    
                    // Step B: Source Main Material (Async)
                    const mainFabric = techPack.bom.find(i => i.location.toLowerCase().includes('body') || i.location.toLowerCase().includes('main'));
                    if (mainFabric) {
                        const results = await geminiService.searchSuppliers(`${mainFabric.item} ${mainFabric.description} wholesale fabric`);
                        dispatch({ type: 'ADD_SOURCING_RESULTS', payload: { conceptId: finalConcept.id, results } });
                    }

                } catch (e) {
                    console.error("Tech Pack Gen Failed", e);
                } finally {
                    dispatch({ type: 'SET_AGENT_STATUS', payload: AgentStatus.IDLE });
                }
            }
        };

        generateData();
    }, [finalConcept, state.agentStatus]);

    // --- 3. Export PDF Function ---
    const handleExportPdf = () => {
        if (!finalConcept || !finalConcept.techPack) return;
        const { techPack } = finalConcept;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let yPos = 20;

        // --- Header ---
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text(finalConcept.name.toUpperCase(), margin, yPos);
        
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont("courier", "normal");
        doc.text(`STYLE: ${techPack.style_number} | SEASON: ${techPack.season}`, margin, yPos);
        doc.text(`DATE: ${new Date().toLocaleDateString()}`, pageWidth - margin - 40, yPos);

        yPos += 15;

        // --- Visuals (Page 1) ---
        const imgWidth = (pageWidth - (margin * 3)) / 2;
        const imgHeight = imgWidth * 1.33; // 3:4 aspect ratio

        try {
            if (finalConcept.images.hero) {
                doc.setFont("helvetica", "bold");
                doc.text("REFERENCE LOOK", margin, yPos - 3);
                doc.addImage(finalConcept.images.hero.url, 'PNG', margin, yPos, imgWidth, imgHeight);
            }

            if (finalConcept.images.technical) {
                doc.text("TECHNICAL FLAT", margin + imgWidth + margin, yPos - 3);
                doc.addImage(finalConcept.images.technical.url, 'PNG', margin + imgWidth + margin, yPos, imgWidth, imgHeight);
            }
        } catch (e) {
            console.error("Image export error:", e);
        }

        yPos += imgHeight + 20;

        // --- Measurements ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("CONSTRUCTION SPECIFICATIONS", margin, yPos);
        yPos += 8;

        doc.setDrawColor(200);
        doc.setLineWidth(0.1);
        doc.line(margin, yPos, pageWidth - margin, yPos); // Header line
        yPos += 5;

        doc.setFontSize(9);
        doc.text("POINT OF MEASURE (POM)", margin, yPos);
        doc.text(`VALUE (${techPack.measurements[0]?.unit})`, pageWidth - margin - 40, yPos, { align: 'right' });
        doc.text("TOL +/-", pageWidth - margin, yPos, { align: 'right' });
        yPos += 3;
        doc.line(margin, yPos, pageWidth - margin, yPos); 
        yPos += 6;

        doc.setFont("helvetica", "normal");
        techPack.measurements.forEach((m, i) => {
            if (yPos > 280) {
                doc.addPage();
                yPos = 20;
            }
            
            // Striping
            if (i % 2 === 1) {
                doc.setFillColor(245, 245, 245);
                doc.rect(margin, yPos - 4, pageWidth - (margin * 2), 6, 'F');
            }

            doc.text(m.pom, margin + 2, yPos);
            doc.text(m.value.toString(), pageWidth - margin - 40, yPos, { align: 'right' });
            doc.text(m.tolerance.toString(), pageWidth - margin, yPos, { align: 'right' });
            yPos += 6;
        });

        // --- BOM (New Page) ---
        doc.addPage();
        yPos = 20;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("BILL OF MATERIALS (BOM)", margin, yPos);
        yPos += 15;

        techPack.bom.forEach((item) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }

            doc.setDrawColor(220);
            doc.rect(margin, yPos, pageWidth - (margin * 2), 25);

            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(item.location.toUpperCase(), margin + 5, yPos + 8);
            
            doc.setFontSize(11);
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text(item.item, margin + 5, yPos + 15);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(80);
            doc.text(item.description, margin + 5, yPos + 21);

            doc.setFont("courier", "bold");
            doc.setTextColor(0);
            doc.text(`QTY: ${item.quantity}`, pageWidth - margin - 50, yPos + 10);
            doc.text(`EST: $${item.cost_estimate}`, pageWidth - margin - 50, yPos + 18);

            yPos += 30;
        });

        // Total Cost
        yPos += 5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("TOTAL ESTIMATED COST:", pageWidth - margin - 60, yPos);
        doc.setTextColor(0, 150, 0); // Green
        doc.text(`$${techPack.total_cost_estimate.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
        doc.setTextColor(0);

        doc.save(`${finalConcept.name.replace(/\s+/g, '_')}_TechPack.pdf`);
    };


    if (!finalConcept) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-ide-muted bg-ide-bg">
                <Icons.Blueprint size={64} className="mb-4 opacity-20" />
                <h2 className="text-xl font-light text-ide-text">No Design Finalized</h2>
                <p className="mt-2 text-sm">Return to the Design Studio to create and finalize a concept.</p>
                <button 
                    onClick={() => dispatch({ type: 'SET_TAB', payload: AppTab.STUDIO })}
                    className="mt-6 px-6 py-2 border border-ide-border rounded hover:bg-ide-panel text-ide-text transition bg-ide-panel"
                >
                    Go to Studio
                </button>
            </div>
        );
    }

    const { techPack } = finalConcept;
    const isAnalyzing = state.agentStatus === AgentStatus.ANALYZING;

    return (
        <div className="h-full flex flex-col bg-ide-bg text-ide-text overflow-hidden font-sans">
            {/* --- Header Bar --- */}
            <div className="h-16 border-b border-ide-border bg-ide-panel flex items-center justify-between px-6 flex-shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20 text-green-500">
                        <Icons.Check size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-ide-text flex items-center gap-3">
                            {finalConcept.name}
                        </h1>
                        <div className="flex items-center gap-3 text-xs font-mono text-ide-muted mt-0.5">
                            <span className="opacity-70">STYLE: {techPack?.style_number || 'GEN-000'}</span>
                            <span className="w-px h-3 bg-ide-border"></span>
                            <span className="opacity-70">SEASON: {techPack?.season || 'SS25 Resort'}</span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={handleExportPdf}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2 transition shadow-md"
                >
                    <Icons.Download size={14} /> Export Tech Pack (PDF)
                </button>
            </div>

            {/* --- Main 3-Column Layout --- */}
            <div className="flex-1 grid grid-cols-12 overflow-hidden bg-ide-bg">
                
                {/* 1. LEFT PANEL: Specs (Scrollable) - span 3 */}
                <div className="col-span-3 border-r border-ide-border flex flex-col overflow-hidden bg-ide-panel/30">
                    <div className="p-3 border-b border-ide-border bg-ide-bg/50 backdrop-blur-sm sticky top-0 z-10">
                        <h3 className="text-[10px] font-bold text-ide-muted uppercase tracking-wider flex items-center gap-2">
                            <Icons.Scissors size={12}/> Construction Specifications
                        </h3>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                         {isAnalyzing && !techPack ? (
                            <div className="space-y-4 animate-pulse">
                                <div className="h-4 bg-ide-border rounded w-3/4"></div>
                                <div className="h-64 bg-ide-border/50 rounded w-full"></div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Measurements Table */}
                                <div className="border border-ide-border rounded-lg overflow-hidden bg-ide-panel">
                                    <table className="w-full text-xs">
                                        <thead className="bg-ide-bg border-b border-ide-border">
                                            <tr>
                                                <th className="p-2 text-left font-bold text-ide-muted pl-3">POM</th>
                                                <th className="p-2 text-right font-mono text-ide-muted">Val ({techPack?.measurements[0]?.unit})</th>
                                                <th className="p-2 text-right font-mono text-ide-muted pr-3">Tol +/-</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-ide-border/50">
                                            {techPack?.measurements.map((m, i) => (
                                                <tr key={i} className="hover:bg-ide-bg/50 transition-colors group">
                                                    <td className="p-2 pl-3 font-medium text-ide-text group-hover:text-ide-accent transition-colors">{m.pom}</td>
                                                    <td className="p-2 text-right font-mono text-ide-accent font-bold">{m.value}</td>
                                                    <td className="p-2 pr-3 text-right text-ide-muted">{m.tolerance}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Technologist Notes */}
                                <div className="bg-ide-panel border border-ide-border rounded-lg p-4 shadow-sm">
                                    <h4 className="text-[10px] font-bold text-ide-muted uppercase mb-3 border-b border-ide-border pb-2">Technologist Notes</h4>
                                    <ul className="space-y-2">
                                        {techPack?.construction_details.map((note, i) => (
                                            <li key={i} className="text-xs text-ide-text leading-relaxed flex items-start gap-2 opacity-90">
                                                <span className="w-1 h-1 bg-ide-accent rounded-full mt-1.5 flex-shrink-0"></span>
                                                {note}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. CENTER PANEL: Visuals (Scrollable Canvas) - span 5 */}
                <div className="col-span-5 border-r border-ide-border flex flex-col relative bg-[#111] overflow-hidden">
                    <div className="p-3 border-b border-ide-border/30 bg-black/20 absolute top-0 w-full z-10 backdrop-blur-sm">
                        <h3 className="text-[10px] font-bold text-ide-muted uppercase tracking-wider flex items-center gap-2">
                            <Icons.Layers size={12}/> Technical Drawings
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-dot-pattern pt-16 custom-scrollbar">
                        {/* Technical Flat */}
                        <div className="relative w-full aspect-[4/3] bg-white rounded-sm shadow-2xl overflow-hidden group border border-white/10">
                            {finalConcept.images.technical ? (
                                <img src={finalConcept.images.technical.url} className="w-full h-full object-contain p-6" alt="Technical Flat" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
                                    <Icons.Spinner className="animate-spin text-gray-400 mb-2" />
                                    <span className="text-xs text-gray-400">Generating Schematics...</span>
                                </div>
                            )}
                            <div className="absolute bottom-3 right-3 bg-gray-100 text-gray-600 px-2 py-1 text-[9px] font-bold uppercase tracking-wider border border-gray-200 rounded-sm shadow-sm">
                                Flat View
                            </div>
                        </div>

                        {/* Hero Reference */}
                        <div className="relative w-full aspect-[3/4] bg-ide-panel rounded-sm shadow-2xl overflow-hidden border border-ide-border opacity-90 hover:opacity-100 transition duration-500">
                             <img src={finalConcept.images.hero?.url} className="w-full h-full object-cover" alt="Reference" />
                             <div className="absolute bottom-3 right-3 bg-black/60 text-white px-2 py-1 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md rounded-sm border border-white/10">
                                Reference
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. RIGHT PANEL: Material & Costing (Scrollable with Sticky Footer) - span 4 */}
                <div className="col-span-4 flex flex-col overflow-hidden bg-ide-panel/30">
                    <div className="p-3 border-b border-ide-border bg-ide-bg/50 backdrop-blur-sm sticky top-0 z-10">
                        <h3 className="text-[10px] font-bold text-ide-muted uppercase tracking-wider flex items-center gap-2">
                            <Icons.Upload size={12} className="rotate-180"/> Material & Costing
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                         {isAnalyzing && !techPack ? (
                            <div className="flex flex-col items-center justify-center h-48 text-ide-muted space-y-3">
                                <Icons.Spinner className="animate-spin text-ide-accent" size={24}/>
                                <span className="text-xs font-mono">Calculating Yields & Sourcing...</span>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* BOM Cards */}
                                {techPack?.bom.map((item, i) => (
                                    <div key={i} className="bg-ide-panel border border-ide-border rounded p-3 hover:border-ide-accent/50 transition-all group shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">{item.location}</span>
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <div className="pr-4">
                                                <h4 className="text-sm font-bold text-ide-text leading-tight">{item.item}</h4>
                                                <p className="text-[11px] text-ide-muted mt-1 leading-snug">{item.description}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <span className="block text-xs font-mono font-bold text-ide-text">{item.quantity}</span>
                                                <span className="block text-[10px] text-ide-muted mt-0.5">Est. ${item.cost_estimate}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Sourcing Section */}
                                <div className="pt-6 mt-6 border-t border-ide-border">
                                    <h3 className="text-[10px] font-bold text-ide-muted uppercase mb-3 flex items-center gap-2">
                                        <Icons.Zoom size={12}/> Verified Suppliers
                                    </h3>
                                    <div className="space-y-2">
                                        {techPack?.sourcing_results && techPack.sourcing_results.length > 0 ? (
                                            techPack.sourcing_results.map((res, i) => (
                                                <a 
                                                    key={i} 
                                                    href={res.url} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="flex items-center gap-3 p-2 rounded border border-transparent hover:bg-ide-panel hover:border-ide-border transition group"
                                                >
                                                    <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                                        <Icons.Upload size={14} className="rotate-45" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className="text-xs font-bold text-ide-text truncate group-hover:text-blue-400 transition-colors">{res.title}</h5>
                                                        <p className="text-[10px] text-ide-muted truncate opacity-60">{res.url}</p>
                                                    </div>
                                                </a>
                                            ))
                                        ) : (
                                            <p className="text-[10px] text-ide-muted italic pl-1">Searching global supplier database...</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Total Cost Footer */}
                    <div className="p-4 border-t border-ide-border bg-ide-panel z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.1)]">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-ide-muted uppercase tracking-wider">Total Unit Cost</span>
                            <span className="text-xl font-mono font-bold text-green-500">
                                ${techPack?.total_cost_estimate.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
