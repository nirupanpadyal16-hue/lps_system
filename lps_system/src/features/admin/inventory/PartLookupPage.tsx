import { useState, useEffect } from 'react';
import {
    Search,
    Filter,
    ChevronRight,
    Box,
    
    Loader2,
    Database,
   
    FileText,

    CheckCircle2,
    X,
    Plus,
    Factory,
    Edit3,
    Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getToken } from '../../../lib/storage';
import { API_BASE as API } from '../../../lib/apiConfig';
import { cn } from '../../../lib/utils';

interface PartDetail {
    common: {
        id: number;
        model: string;
        part_number: string;
        sap_part_number: string;
        description: string;
        saleable_no: string;
        assembly_number: string;
        is_ad_hoc: boolean;
    };
    production_data: Record<string, any>;
    material_data: Record<string, any>;
}

interface VehicleModel {
    id: string | number;
    name: string;
}

const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
});

export default function PartLookupPage() {
    const [parts, setParts] = useState<PartDetail[]>([]);
    const [models, setModels] = useState<VehicleModel[]>([]);
    const [machines, setMachines] = useState<any[]>([]);
    const [showMachineDropdown, setShowMachineDropdown] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedModel, setSelectedModel] = useState<string>('ALL');
    const [selectedPart, setSelectedPart] = useState<PartDetail | null>(null);

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state for new/edit part
    const [formData, setFormData] = useState({
        sr_no: '',
        model: '',
        part_number: '',
        sap_part_number: '',
        description: '',
        assembly_number: '',
        // Material Data
        rm_thk_mm: '',
        sheet_width: '',
        sheet_length: '',
        no_of_comp_per_sheet: '',
        rm_size: '',
        rm_grade: '',
        act_rm_sizes: '',
        revised: '',
        validity: '',
        // Industrial Metrics
        machine: '',
        no_of_machines: '',
        strokes_per_part: '',
        part_weight: ''
    });

    // Auto-calculate RM SIZE
    useEffect(() => {
        if (formData.rm_thk_mm || formData.sheet_width || formData.sheet_length) {
            const calculatedSize = `${formData.rm_thk_mm || ''}${formData.rm_thk_mm && formData.sheet_width ? 'X' : ''}${formData.sheet_width || ''}${(formData.sheet_width || formData.rm_thk_mm) && formData.sheet_length ? 'X' : ''}${formData.sheet_length || ''}`;
            setFormData(prev => ({ ...prev, rm_size: calculatedSize }));
        }
    }, [formData.rm_thk_mm, formData.sheet_width, formData.sheet_length]);

    // Auto-calculate SR.NO when model is selected (Only for new parts)
    useEffect(() => {
        if (showAddModal && formData.model) {
            const modelParts = parts.filter(p => p.common.model === formData.model);
            const nextSrNo = modelParts.length + 1;
            setFormData(prev => ({ ...prev, sr_no: String(nextSrNo) }));
        }
    }, [formData.model, showAddModal, parts]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [partsRes, modelsRes, linesRes] = await Promise.all([
                fetch(`${API}/manager/master-data`, { headers: authHeaders() }),
                fetch(`${API}/manager/vehicle-models`, { headers: authHeaders() }),
                fetch(`${API}/admin/lines`, { headers: authHeaders() })
            ]);

            const partsData = await partsRes.json();
            const modelsData = await modelsRes.json();
            const linesData = await linesRes.json();

            if (Array.isArray(partsData)) {
                setParts(partsData);
            } else if (partsData.success) {
                setParts(partsData.data);
            }

            if (modelsData.success) {
                setModels(modelsData.data);
            }

            if (linesData.success) {
                // Flatten and filter for Machines (Level 1)
                const allLines = linesData.data;
                console.log("Fetched Lines Data:", allLines);
                const machineList: any[] = [];

                // Robust flattening logic: handle both hierarchical and flat data
                allLines.forEach((item: any) => {
                    if (item.children && item.children.length > 0) {
                        // Hierarchical: children are machines
                        item.children.forEach((child: any) => {
                            machineList.push({
                                id: child.id,
                                name: child.name.toUpperCase(),
                                areaName: item.name.toUpperCase()
                            });
                        });
                    } else if (item.parent_id) {
                        // Flat but has parent_id: likely a machine
                        machineList.push({
                            id: item.id,
                            name: item.name.toUpperCase(),
                            areaName: "GENERAL"
                        });
                    }
                });

                console.log("Processed Machines List:", machineList);
                setMachines(machineList);
            }
        } catch (error) {
            console.error("Error fetching part lookup data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openEditModal = (part: PartDetail) => {
        setFormData({
            sr_no: part.production_data?.['SN NO'] || part.production_data?.['SR NO'] || part.production_data?.['SR.NO'] || '',
            model: part.common.model || '',
            part_number: part.common.part_number || '',
            sap_part_number: part.common.sap_part_number || '',
            description: part.common.description || '',
            assembly_number: part.common.assembly_number || '',
            // Material
            rm_thk_mm: part.material_data?.['RM Thk mm'] || part.material_data?.['RM_THK_MM'] || part.material_data?.['rm_thk_mm'] || '',
            sheet_width: part.material_data?.['Sheet Width'] || part.material_data?.['sheet_width'] || '',
            sheet_length: part.material_data?.['Sheet Length'] || part.material_data?.['sheet_length'] || '',
            no_of_comp_per_sheet: part.material_data?.['No of comp per sheet'] || part.material_data?.['no_of_comp_per_sheet'] || '',
            rm_size: part.material_data?.['RM SIZE'] || part.material_data?.['rm_size'] || '',
            rm_grade: part.material_data?.['RM Grade'] || part.material_data?.['rm_grade'] || '',
            act_rm_sizes: part.material_data?.['Act RM Sizes'] || part.material_data?.['act_rm_sizes'] || '',
            revised: part.material_data?.['Revised'] || part.material_data?.['revised'] || '',
            validity: part.material_data?.['VALIDITY'] || part.material_data?.['validity'] || '',
            // Industrial Metrics
            machine: part.production_data?.['Machine'] || '',
            no_of_machines: part.production_data?.['No. of Machines'] || '',
            strokes_per_part: part.production_data?.['Strokes / Part'] || '',
            part_weight: part.production_data?.['Part Weight (kg)'] || ''
        });
        setShowEditModal(true);
    };

    const handleFormSubmit = async (e: React.FormEvent, isEdit: boolean = false) => {
        e.preventDefault();
        if (!formData.model || !formData.sap_part_number || !formData.part_number) {
            alert("Model, SAP #, and Part # are required");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                model: formData.model,
                part_number: formData.part_number,
                sap_part_number: formData.sap_part_number,
                description: formData.description,
                assembly_number: formData.assembly_number,
                material_data: {
                    "RM Thk mm": formData.rm_thk_mm,
                    "Sheet Width": formData.sheet_width,
                    "Sheet Length": formData.sheet_length,
                    "No of comp per sheet": formData.no_of_comp_per_sheet,
                    "RM SIZE": formData.rm_size,
                    "RM Grade": formData.rm_grade,
                    "Act RM Sizes": formData.act_rm_sizes,
                    "Revised": formData.revised,
                    "VALIDITY": formData.validity
                },
                production_data: {
                    "RM SIZE": formData.rm_size,
                    "SR.NO": formData.sr_no,
                    "Machine": formData.machine,
                    "No. of Machines": formData.no_of_machines,
                    "Strokes / Part": formData.strokes_per_part,
                    "Part Weight (kg)": formData.part_weight
                }
            };

            const url = isEdit
                ? `${API}/manager/master-data/${selectedPart?.common.id}`
                : `${API}/manager/master-data/quick-add`;

            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: authHeaders(),
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (data.success) {
                alert(isEdit ? "Part updated successfully" : "Part added successfully");
                setShowAddModal(false);
                setShowEditModal(false);
                if (isEdit && data.data) setSelectedPart(data.data);
                fetchData();
            } else {
                alert(data.message || "Operation failed");
            }
        } catch (error) {
            alert("Network error. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredParts = parts.filter(part => {
        const matchesSearch =
            part.common.sap_part_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            part.common.part_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            part.common.description?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesModel = selectedModel === 'ALL' || part.common.model === selectedModel;

        return matchesSearch && matchesModel;
    });

    const handlePartSelect = (part: PartDetail) => {
        setSelectedPart(part);
    };

    const renderDetailItem = (label: string, value: any, compact = false) => {
        let displayValue = (value === undefined || value === null || value === '' || value === 'nan' || value === 'None') ? '—' : String(value);

        // Clean up machine display by removing (AREA) or (PARENT) info
        if (label.toLowerCase() === 'machine' && displayValue !== '—') {
            displayValue = displayValue.replace(/\s*\([^)]*\)/g, '');
        }

        if (compact) {
            return (
                <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</span>
                    <span className="text-[13px] font-black text-slate-800 break-all leading-tight">{displayValue}</span>
                </div>
            );
        }

        return (
            <div className="space-y-1.5 flex flex-col h-full">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    {label.replace(/_/g, ' ')}
                </span>
                <div className="w-full min-h-[2.5rem] px-4 py-2 bg-slate-50/50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center transition-all">
                    <span className={cn(
                        "break-words leading-tight tracking-tight",
                        displayValue === '—' ? "text-slate-300" : "text-slate-800 font-black"
                    )}>
                        {displayValue}
                    </span>
                </div>
            </div>
        );
    };

    // Helper to safely get material data with fallback
    const getMaterialData = (part: PartDetail): Record<string, any> => {
        if (part.material_data && Object.keys(part.material_data).length > 0) {
            return part.material_data;
        }
        return {};
    };

    const materialEntries = selectedPart ? Object.entries(getMaterialData(selectedPart)) : [];

    return (
        <div className="bg-ind-bg flex flex-col h-[calc(100vh-64px)] overflow-hidden">
            {/* Header Section */}
            <div className="flex  xl:flex-row xl:items-center justify-between gap-3 bg-white border-b border-slate-100 py-1 ml-2 mb-1">
                <div className="flex items-center">
                    <div>
                    <h1 className="text-3xl md:text-3xl xl:text-2xl font-black text-slate-800 tracking-tight leading-none">
  Part Lookup
</h1>
                    </div>
                </div>

                {/* <div className="flex items-center bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-4 py-2 border-r border-slate-50 text-center">
                        <span className="block text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">TOTAL REGISTRY</span>
                        <span className="text-base font-black text-slate-800 leading-none">{parts.length}</span>
                    </div>
                </div> */}
            </div>

            {/* Filter Bar */}
            <div className="px-1 py-2 flex items-center gap-1 flex-shrink-0 bg-transparent">
                <div className="relative group min-w-[180px]">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-orange-50 flex items-center justify-center">
                        <Filter size={12} strokeWidth={2.5} className="text-orange-500" />
                    </div>
                    <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full h-10 pl-10 pr-7 bg-white border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none appearance-none shadow-sm cursor-pointer focus:border-orange-300 transition-all"
                    >
                        <option value="ALL">All Models</option>
                        {models.map(m => (
                            <option key={m.id} value={m.name}>{m.name.toUpperCase()}</option>
                        ))}
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 rotate-90" size={12} strokeWidth={2.5} />
                </div>

                <div className="relative group flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input
                        type="text"
                        placeholder="Search by SAP Number, Part Number or Keyword..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 bg-white border border-slate-100 rounded-xl text-xs font-medium text-slate-700 outline-none shadow-sm placeholder:text-slate-300 focus:border-orange-300 transition-all"
                    />
                </div>

                <button
                    onClick={() => {
                        setFormData({
                            sr_no: '', model: '', part_number: '', sap_part_number: '', description: '',
                            assembly_number: '', rm_thk_mm: '',
                            sheet_width: '', sheet_length: '', no_of_comp_per_sheet: '',
                            rm_size: '', rm_grade: '', act_rm_sizes: '', revised: '', validity: '',
                            machine: '', no_of_machines: '', strokes_per_part: '', part_weight: ''
                        });
                        setShowAddModal(true);
                    }}
                    className="flex items-center gap-1 px-4 h-10 bg-ind-primary hover:bg-ind-g2 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-md shadow-orange-100"
                >
                    <Plus size={16} strokeWidth={3} />
                    Create New Part
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 mx-1 mb-2 gap-2 flex overflow-hidden">
                {/* Left Panel - Part List */}
                <div className="w-[280px] flex-shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
                                <Loader2 className="animate-spin text-orange-400" size={32} strokeWidth={2} />
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Loading...</span>
                            </div>
                        ) : filteredParts.length > 0 ? (
                            filteredParts.map((part, idx) => {
                                const isSelected = selectedPart?.common.id === part.common.id;
                                return (
                                    <motion.button
                                        key={part.common.id}
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: Math.min(idx * 0.01, 0.3) }}
                                        onClick={() => handlePartSelect(part)}
                                        className={cn(
                                            "w-full px-4 py-2.5 rounded-xl transition-all duration-200 text-left relative overflow-hidden group",
                                            isSelected
                                                ? "bg-orange-500 text-white shadow-md shadow-orange-200"
                                                : "bg-white text-slate-700 hover:bg-slate-50 border border-transparent"
                                        )}
                                    >
                                        <span className={cn(
                                            "text-xs font-black tracking-tight",
                                            isSelected ? "text-white" : "text-slate-800"
                                        )}>
                                            {part.common.sap_part_number}
                                        </span>
                                    </motion.button>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-3 py-16 text-center">
                                <Search size={20} className="text-slate-200" />
                                <p className="text-[10px] font-bold text-slate-400">No results</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Part Details */}
                <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col relative">
                    {selectedPart ? (
                        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                            {/* Unified Action Header Area */}
                            <div className="px-8 py-4 flex items-center justify-between gap-4 border-b border-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 border border-orange-100 shadow-sm">
                                        <Box size={16} strokeWidth={2.5} />
                                    </div>
                                    <h1 className="text-lg font-black text-slate-800 tracking-tight uppercase">
                                        {selectedPart.common.model}
                                    </h1>
                                </div>

                                <button
                                    onClick={() => openEditModal(selectedPart)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-slate-200 group shadow-sm"
                                >
                                    <Edit3 size={13} className="text-orange-500 group-hover:scale-110 transition-transform" />
                                    Edit Details
                                </button>
                            </div>

                            {/* High-Density Data Row */}
                            <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/10">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                                    <div className="lg:col-span-3">
                                        {renderDetailItem("SAP PART NUMBER", selectedPart.common.sap_part_number, true)}
                                    </div>
                                    <div className="lg:col-span-3">
                                        {renderDetailItem("PART NUMBER", selectedPart.common.part_number, true)}
                                    </div>
                                    <div className="lg:col-span-6">
                                        <div className="flex flex-col gap-1 min-w-0">
                                            <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest leading-none text-nowrap">PART DESCRIPTION:</span>
                                            <span className="text-[12px] font-black text-slate-800 uppercase leading-tight truncate" title={selectedPart.common.description}>
                                                {selectedPart.common.description}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CAPACITY DATA */}
                            <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/20">
                                <div className="max-w-6xl">
                                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-4">Capacity Metrics</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        {renderDetailItem("Machine", selectedPart.production_data?.['Machine'])}
                                        {renderDetailItem("No. of Machines", selectedPart.production_data?.['No. of Machines'])}
                                        {renderDetailItem("Strokes / Part", selectedPart.production_data?.['Strokes / Part'])}
                                        {renderDetailItem("Part Weight (kg)", selectedPart.production_data?.['Part Weight (kg)'])}
                                    </div>
                                </div>
                            </div>

                            {/* MATERIAL DATA */}
                            <div className="flex-1 px-8 py-6 bg-white">
                                <div className="max-w-6xl">
                                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-4">Material Data</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        {renderDetailItem("RM Thk Mm", selectedPart.material_data?.['RM Thk mm'])}
                                        {renderDetailItem("Sheet Width", selectedPart.material_data?.['Sheet Width'])}
                                        {renderDetailItem("Sheet Length", selectedPart.material_data?.['Sheet Length'])}
                                        {renderDetailItem("No of Comp Per Sheet", selectedPart.material_data?.['No of comp per sheet'])}

                                        {renderDetailItem("RM Size", selectedPart.material_data?.['RM SIZE'])}
                                        {renderDetailItem("RM Grade", selectedPart.material_data?.['RM Grade'])}
                                        {renderDetailItem("Act RM Sizes", selectedPart.material_data?.['Act RM Sizes'])}
                                        {renderDetailItem("Revised", selectedPart.material_data?.['Revised'])}

                                        {renderDetailItem("Validity", selectedPart.material_data?.['VALIDITY'])}
                                    </div>

                                    {!materialEntries.length && (
                                        <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-slate-100">
                                            <Database size={24} className="text-slate-200 mx-auto mb-4" />
                                            <p className="text-xs font-bold text-slate-400">No Material Data Available</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/30">
                            <Database size={48} strokeWidth={1} className="text-slate-200 mb-6" />
                            <h3 className="text-sm font-black text-slate-300 uppercase tracking-[0.3em]">Select a Registry Entry</h3>
                        </div>
                    )}
                </div>
            </div>

            {/* Comprehensive Form Modal (Add/Edit) */}
            <AnimatePresence>
                {
                    (showAddModal || showEditModal) && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-5xl bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden my-auto"
                            >
                                {/* Modal Header */}
                                <div className="bg-white px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl",
                                            showEditModal ? "bg-orange-500 shadow-orange-100" : "bg-emerald-500 shadow-emerald-100"
                                        )}>
                                            {showEditModal ? <FileText size={22} /> : <Plus size={24} strokeWidth={3} />}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">
                                                {showEditModal ? 'Edit Component Row' : 'Register New Part'}
                                            </h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                {showEditModal ? `PART #${formData.sap_part_number} · MASTER DATA ENTRY` : 'Industrial Specification Entry'}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-all"><X size={20} /></button>
                                </div>

                                <form onSubmit={(e) => handleFormSubmit(e, showEditModal)} className="p-8 space-y-10 max-h-[75vh] overflow-y-auto custom-scrollbar bg-white">
                                    {/* Identification Section */}
                                    <div className="space-y-6">
                                        <h4 className="text-[11px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                            Identification
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">VEHICLE MODEL *</label>
                                                <select
                                                    required
                                                    value={formData.model}
                                                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm shadow-slate-100 appearance-none cursor-pointer"
                                                >
                                                    <option value="">Select Model</option>
                                                    {models.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">SR.NO</label>
                                                <input type="text" readOnly value={formData.sr_no} className="w-full h-12 px-4 bg-slate-100/50 border border-slate-100 rounded-xl text-xs font-black text-slate-400 outline-none cursor-not-allowed shadow-inner" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">SAP PART NUMBER *</label>
                                                <input type="text" required value={formData.sap_part_number} onChange={(e) => setFormData({ ...formData, sap_part_number: e.target.value })} className={cn("w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm shadow-slate-100", !formData.sap_part_number && "border-orange-200")} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">PART NUMBER *</label>
                                                <input type="text" required value={formData.part_number} onChange={(e) => setFormData({ ...formData, part_number: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm shadow-slate-100" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">PART DESCRIPTION</label>
                                                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm shadow-slate-100" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ASSEMBLY NUMBER</label>
                                                <input type="text" value={formData.assembly_number} onChange={(e) => setFormData({ ...formData, assembly_number: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm shadow-slate-100" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Material Data Section */}
                                    <div className="space-y-6 pb-4">
                                        <h4 className="text-[11px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                            MATERIAL DATA
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">RM Thk Mm</label>
                                                <input type="text" value={formData.rm_thk_mm} onChange={(e) => setFormData({ ...formData, rm_thk_mm: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm shadow-slate-100" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Sheet Width</label>
                                                <input type="text" value={formData.sheet_width} onChange={(e) => setFormData({ ...formData, sheet_width: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm shadow-slate-100" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Sheet Length</label>
                                                <input type="text" value={formData.sheet_length} onChange={(e) => setFormData({ ...formData, sheet_length: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm shadow-slate-100" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">No Of Comp Per Sheet</label>
                                                <input type="text" value={formData.no_of_comp_per_sheet} onChange={(e) => setFormData({ ...formData, no_of_comp_per_sheet: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm shadow-slate-100" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">RM SIZE</label>
                                                <input type="text" readOnly value={formData.rm_size} className="w-full h-12 px-4 bg-slate-100/50 border border-slate-100 rounded-xl text-xs font-black text-slate-400 outline-none cursor-not-allowed shadow-inner" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">RM Grade</label>
                                                <input type="text" value={formData.rm_grade} onChange={(e) => setFormData({ ...formData, rm_grade: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm shadow-slate-100" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Act RM Sizes</label>
                                                <input type="text" placeholder="Enter Act Rm Sizes..." value={formData.act_rm_sizes} onChange={(e) => setFormData({ ...formData, act_rm_sizes: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm shadow-slate-100" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Revised</label>
                                                <input type="text" placeholder="Enter Revised..." value={formData.revised} onChange={(e) => setFormData({ ...formData, revised: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm shadow-slate-100" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">VALIDITY</label>
                                                <input type="text" placeholder="Enter Validity..." value={formData.validity} onChange={(e) => setFormData({ ...formData, validity: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm shadow-slate-100" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Capacity Section */}
                                    <div className="space-y-6">
                                        <h4 className="text-[11px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                            CAPACITY METRICS
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            <div className="space-y-2 col-span-2 relative">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Assign Machines</label>

                                                {/* Compact Dropdown Header */}
                                                <button
                                                    type="button"
                                                    onClick={() => setShowMachineDropdown(!showMachineDropdown)}
                                                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs font-bold text-slate-700 hover:border-orange-200 transition-all shadow-sm"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <Factory size={14} className="text-slate-400" />
                                                        {(formData.machine || '').split('; ').filter(x => x !== '').length > 0
                                                            ? `${(formData.machine || '').split('; ').filter(x => x !== '').length} MACHINE(S) SELECTED`
                                                            : 'SELECT MACHINES...'
                                                        }
                                                    </span>
                                                    <ChevronRight className={`text-slate-300 transition-transform ${showMachineDropdown ? 'rotate-90' : ''}`} size={16} />
                                                </button>

                                                {/* Dropdown Menu */}
                                                <AnimatePresence>
                                                    {showMachineDropdown && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: 10 }}
                                                            className="absolute z-[100] left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl shadow-slate-200 overflow-hidden max-h-[300px] overflow-y-auto p-2 space-y-1"
                                                        >
                                                            {machines.map(m => {
                                                                const uniqueKey = `${m.name} (${m.areaName})`;
                                                                const isSelected = (formData.machine || '').split('; ').includes(uniqueKey);
                                                                return (
                                                                    <button
                                                                        key={m.id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            let current = (formData.machine || '').split('; ').filter(x => x !== '');
                                                                            if (isSelected) {
                                                                                current = current.filter(x => x !== uniqueKey);
                                                                            } else {
                                                                                current.push(uniqueKey);
                                                                            }
                                                                            const newValue = current.join('; ');
                                                                            setFormData({
                                                                                ...formData,
                                                                                machine: newValue,
                                                                                no_of_machines: current.length > 0 ? current.length.toString() : ''
                                                                            });
                                                                        }}
                                                                        className={`w-full px-4 py-3 rounded-xl flex items-center justify-between transition-all ${isSelected ? 'bg-orange-50 text-orange-600' : 'hover:bg-slate-50 text-slate-600'
                                                                            }`}
                                                                    >
                                                                        <div className="flex flex-col items-start">
                                                                            <span className="text-xs font-black uppercase tracking-wider">{m.name}</span>
                                                                            <span className="text-[9px] font-bold opacity-50">{m.areaName}</span>
                                                                        </div>
                                                                        {isSelected && <CheckCircle2 size={16} strokeWidth={3} className="text-orange-500" />}
                                                                    </button>
                                                                );
                                                            })}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">No. of Machines</label>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    placeholder="Auto-calculated"
                                                    value={formData.no_of_machines || ''}
                                                    className="w-full h-12 px-4 bg-slate-100/50 border border-slate-100 rounded-xl text-xs font-black text-slate-400 outline-none cursor-not-allowed shadow-inner"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Strokes / Part</label>
                                                <input type="text" placeholder="e.g. 4" value={formData.strokes_per_part || ''} onChange={(e) => setFormData({ ...formData, strokes_per_part: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm shadow-slate-100" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Part Weight (kg)</label>
                                                <input type="text" placeholder="e.g. 0.89" value={formData.part_weight || ''} onChange={(e) => setFormData({ ...formData, part_weight: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm shadow-slate-100" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Form Actions */}
                                    <div className="flex items-center justify-end gap-4 pt-10 border-t border-slate-50">
                                        <button
                                            type="button"
                                            onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                                            className="px-10 h-14 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className={cn(
                                                "px-12 h-14 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl flex items-center justify-center gap-3",
                                                showEditModal ? "bg-orange-500 hover:bg-orange-600 shadow-orange-100" : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100",
                                                submitting && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            {submitting ? <Loader2 className="animate-spin" size={18} /> : (showEditModal ? <Save size={18} /> : <CheckCircle2 size={18} />)}
                                            {submitting ? (showEditModal ? 'Saving...' : 'Registering...') : (showEditModal ? 'Save Changes' : 'Register Component')}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div >
                    )
                }
            </AnimatePresence >
        </div >
    );
}
