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
  Save,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getToken } from '../../lib/storage';
import { API_BASE as API } from '../../lib/apiConfig';
import { ppcApi } from '../../api/newRolesApi';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

interface PartDetail {
  common: {
    part_no: string;
    sr_no: any;
    id: number;
    model: string;
    part_number: string;
    sap_part_number: string;
    description: string;
    saleable_no: string;
    assembly_number: string;
    is_ad_hoc: boolean;
    demand_quantity?: number;
    shortage_quantity?: number;
  };
  production_data: Record<string, any>;
  material_data: Record<string, any>;
  inventory_context?: {
    id: number;
    demand_formatted_id: string;
    rm_status: string;
  } | null;
}

interface VehicleModel {
  id: string | number;
  name: string;
}

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

export default function PPCMachineRegistryPage() {
  const [parts, setParts] = useState<PartDetail[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [showMachineDropdown, setShowMachineDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [demands, setDemands] = useState<any[]>([]);
  const [selectedDemand, setSelectedDemand] = useState<string>('');
  const [selectedPart, setSelectedPart] = useState<PartDetail | null>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRMModal, setShowRMModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state for new/edit part
  const [formData, setFormData] = useState({
    sr_no: '',
    model: '',
    part_number: '',
    sap_part_number: '',
    description: '',
    assembly_number: '',
    rm_thk_mm: '',
    sheet_width: '',
    sheet_length: '',
    no_of_comp_per_sheet: '',
    rm_size: '',
    rm_grade: '',
    act_rm_sizes: '',
    revised: '',
    validity: '',
    machine: '',
    no_of_machines: '',
    strokes_per_part: '',
    part_weight: ''
  });

  // RM Form state
  const [rmForm, setRMForm] = useState({
    rm_thk_mm: '', sheet_width: '', sheet_length: '',
    no_of_comp_per_sheet: '', rm_size: '', rm_grade: '',
    act_rm_sizes: '', ppc_notes: ''
  });

  // Auto-calculate RM SIZE
  useEffect(() => {
    if (formData.rm_thk_mm || formData.sheet_width || formData.sheet_length) {
      const calculatedSize = `${formData.rm_thk_mm || ''}${formData.rm_thk_mm && formData.sheet_width ? 'X' : ''}${formData.sheet_width || ''}${(formData.sheet_width || formData.rm_thk_mm) && formData.sheet_length ? 'X' : ''}${formData.sheet_length || ''}`;
      setFormData(prev => ({ ...prev, rm_size: calculatedSize }));
    }
  }, [formData.rm_thk_mm, formData.sheet_width, formData.sheet_length]);

  useEffect(() => {
    if (showAddModal && formData.model) {
      const modelParts = parts.filter(p => p.common.model === formData.model);
      const nextSrNo = modelParts.length + 1;
      setFormData(prev => ({ ...prev, sr_no: String(nextSrNo) }));
    }
  }, [formData.model, showAddModal, parts]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDemand]);

  const fetchData = async (demandId?: number) => {
    setLoading(true);
    try {
      const selectedDemandObj = demands.find(d => d.id === demandId);
      const modelParam = selectedDemandObj ? `?model=${encodeURIComponent(selectedDemandObj.model_name)}` : '';

      const [partsRes, modelsRes, linesRes, invRes, demandsRes] = await Promise.all([
        fetch(`${API}/manager/master-data${modelParam}`, { headers: authHeaders() }),
        fetch(`${API}/manager/vehicle-models`, { headers: authHeaders() }),
        fetch(`${API}/admin/lines`, { headers: authHeaders() }),
        ppcApi.getMachineRegistry(demandId),
        ppcApi.getDemands()
      ]);

      const demandsData = await demandsRes.data;
      if (demandsData.success) {
        setDemands(demandsData.data);
        // Auto-select first demand if none selected
        if (!selectedDemand && demandsData.data.length > 0 && !demandId) {
          const first = demandsData.data[0];
          setSelectedDemand(first.formatted_id);
          // Re-fetch with the first demand ID to get correct inventory context
          fetchData(first.id);
          return;
        }
      }

      const partsData = await partsRes.json();
      const modelsData = await modelsRes.json();
      const linesData = await linesRes.json();

      if (modelsData.success) setModels(modelsData.data);
      // setDemands(demandsRes.data.data); // Already handled above

      if (invRes.data.success) {
        if (demandId) {
          // Map registry items to PartDetail format
          const mapped: PartDetail[] = invRes.data.data.map((item: any) => ({
            common: {
              id: item.id || 0,
              model: item.demand_formatted_id ? `${item.demand_formatted_id} — ${item.vehicle_name || item.model}` : (item.vehicle_name || item.model || ''),
              part_number: item.part_number || item.part_no || item.inventory_item?.part_number || item.inventory_item?.part_no || '',
              sap_part_number: item.sap_part_number || item.inventory_item?.sap_part_number || '',
              description: item.part_description || item.inventory_item?.description || '',
              saleable_no: '',
              assembly_number: item.assembly_number || item.inventory_item?.assembly_number || '',
              sr_no: item.serial_number || item.sn_no || item.sr_no || item.inventory_item?.sr_no || item.inventory_item?.serial_number || '',
              is_ad_hoc: false,
              demand_quantity: item.demand_quantity,
              shortage_quantity: item.shortage_quantity,
            },
            production_data: {
              'SR.NO': item.serial_number || item.sn_no || item.sr_no || item.inventory_item?.sr_no || item.inventory_item?.serial_number || '',
              'Machine': item.machine_group || item.machine || '',
              'SN NO': item.serial_number || item.sn_no || item.sr_no || item.inventory_item?.sr_no || item.inventory_item?.serial_number || ''
            },
            material_data: item.master_material_data || {}
          }));
          setParts(mapped);
        } else {
          if (Array.isArray(partsData)) setParts(partsData);
          else if (partsData.success) setParts(partsData.data);
        }
        setInventoryItems(invRes.data.data);
      }

      if (linesData.success) {
        const machineList: any[] = [];
        linesData.data.forEach((item: any) => {
          if (item.children) {
            item.children.forEach((child: any) => {
              machineList.push({ id: child.id, name: child.name.toUpperCase(), areaName: item.name.toUpperCase() });
            });
          }
        });
        setMachines(machineList);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getMaterialValue = (part: PartDetail, possibleKeys: string[]) => {
    if (!part.material_data) return '—';
    for (const key of possibleKeys) {
      const val = part.material_data[key];
      if (val && val !== 'nan' && String(val).trim() !== '') return val;
    }
    // Also check lowercase and underscored variants if needed
    for (const key of possibleKeys) {
      const lowerKey = key.toLowerCase();
      const underscoredKey = key.toLowerCase().replace(/ /g, '_');
      const val = part.material_data[lowerKey] || part.material_data[underscoredKey];
      if (val && val !== 'nan' && String(val).trim() !== '') return val;
    }
    return '—';
  };

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
    setSubmitting(true);
    try {
      const payload = {
        model: formData.model,
        part_number: formData.part_number,
        sap_part_number: formData.sap_part_number,
        description: formData.description,
        assembly_number: formData.assembly_number,
        material_data: {
          "RM Thk mm": formData.rm_thk_mm, "Sheet Width": formData.sheet_width,
          "Sheet Length": formData.sheet_length, "No of comp per sheet": formData.no_of_comp_per_sheet,
          "RM SIZE": formData.rm_size, "RM Grade": formData.rm_grade,
          "Act RM Sizes": formData.act_rm_sizes, "Revised": formData.revised, "VALIDITY": formData.validity
        },
        production_data: {
          "RM SIZE": formData.rm_size, "SR.NO": formData.sr_no,
          "Machine": formData.machine, "No. of Machines": formData.no_of_machines,
          "Strokes / Part": formData.strokes_per_part, "Part Weight (kg)": formData.part_weight
        }
      };

      const url = isEdit ? `${API}/manager/master-data/${selectedPart?.common.id}` : `${API}/manager/master-data/quick-add`;
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success) {
        toast.success(isEdit ? "Part updated" : "Part added");
        setShowAddModal(false); setShowEditModal(false);
        fetchData();
      } else toast.error(data.message);
    } catch (error) { toast.error("Error saving part"); }
    finally { setSubmitting(false); }
  };

  const openRMForm = () => {
    const inv = inventoryItems.find(i => i.sap_part_number === selectedPart?.common.sap_part_number);
    if (!inv) return;
    const md = selectedPart?.material_data || {};
    setRMForm({
      rm_thk_mm: md['RM Thk mm'] || '',
      sheet_width: md['Sheet Width'] || '',
      sheet_length: md['Sheet Length'] || '',
      no_of_comp_per_sheet: md['No of comp per sheet'] || '',
      rm_size: md['RM SIZE'] || '',
      rm_grade: md['RM Grade'] || '',
      act_rm_sizes: md['Act RM Sizes'] || '',
      ppc_notes: ''
    });
    setShowRMModal(true);
  };

  const handleRMSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart) return;

    // Improved matching logic (trimmed and case-insensitive)
    const inv = inventoryItems.find(i =>
      i.sap_part_number.trim().toLowerCase() === selectedPart.common.sap_part_number.trim().toLowerCase()
    );

    const demand = demands.find(d => d.formatted_id === selectedDemand);

    setSubmitting(true);
    try {
      const payload = {
        ...rmForm,
        demand_id: demand?.id,
        sap_part_number: selectedPart.common.sap_part_number
      };

      // If no inventory item found, we pass 0 as the ID and the backend will create it
      const itemId = inv ? inv.id : 0;
      await ppcApi.submitRM(itemId, payload);

      toast.success("RM data submitted successfully");
      setShowRMModal(false);
      fetchData(demand?.id);
    } catch (err) {
      toast.error("Submission failed. Ensure the demand is active.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredParts = parts.filter(part => {
    const matchesSearch =
      part.common.sap_part_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.common.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredParts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedParts = filteredParts.slice(startIndex, startIndex + itemsPerPage);
  const endItem = Math.min(startIndex + itemsPerPage, filteredParts.length);

  const renderDetailItem = (label: string, value: any, compact = false) => {
    const displayValue = (!value || value === 'nan') ? '—' : String(value);
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
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</span>
        <div className="w-full min-h-[2.5rem] px-4 py-2 bg-slate-50/50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center transition-all">
          <span className={cn("break-words leading-tight", displayValue === '—' ? "text-slate-300" : "text-slate-800 font-black")}>{displayValue}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-ind-bg flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex xl:flex-row xl:items-center justify-between gap-3 bg-white border-b border-slate-100 py-2 ml-2 mb-1">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none px-4">Machine Registry</h1>
      </div>

      <div className="px-1 py-2 flex items-center gap-1 flex-shrink-0">
        <div className="relative group min-w-[180px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-orange-50 flex items-center justify-center">
            <Filter size={12} strokeWidth={2.5} className="text-orange-500" />
          </div>
          <select
            value={selectedDemand}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedDemand(val);
              const demand = demands.find(d => d.formatted_id === val);
              fetchData(demand?.id);
            }}
            className="w-full h-10 pl-10 pr-7 bg-white border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none appearance-none shadow-sm cursor-pointer focus:border-orange-300"
          >
            {demands.map(d => <option key={d.id} value={d.formatted_id}>{d.formatted_id} — {d.model_name}</option>)}
          </select>
          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 rotate-90" size={12} strokeWidth={2.5} />
        </div>

        <div className="relative group flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
          <input
            type="text"
            placeholder="Search by SAP Number, Description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-white border border-slate-100 rounded-xl text-xs font-medium text-slate-700 outline-none shadow-sm focus:border-orange-300 transition-all"
          />
        </div>

        <button
          onClick={() => {
            const currentDemand = demands.find(d => d.formatted_id === selectedDemand);
            setFormData({
              sr_no: '',
              model: currentDemand?.model_name || '',
              part_number: '', sap_part_number: '', description: '', assembly_number: '',
              rm_thk_mm: '', sheet_width: '', sheet_length: '', no_of_comp_per_sheet: '', rm_size: '',
              rm_grade: '', act_rm_sizes: '', revised: '', validity: '',
              machine: '', no_of_machines: '', strokes_per_part: '', part_weight: ''
            });
            setShowAddModal(true);
          }}
          className="flex items-center gap-1 px-4 h-10 bg-ind-primary hover:bg-ind-g2 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-md"
        >
          <Plus size={16} strokeWidth={3} />
          Create New Part
        </button>
      </div>
      {/* Main Content - Table View */}
      <div className="flex-1 mx-1 mb-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-[1500px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b-2 border-[#f37021] bg-white">
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">Sn.no</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">VEHICLE MODEL</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">DEMAND QTY</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">SAP PART NUMBER</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">PART NUMBER</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">PART DESCRIPTION</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">RM Thk Mm</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">Sheet Width</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">Sheet Length</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">No Of Comp Per Sheet</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">RM SIZE</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">RM Grade</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">Act RM Sizes</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">Revised</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">VALIDITY</th>
                <th className="px-6 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-6 py-3 text-center text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={15} className="py-20 text-center">
                    <Loader2 className="animate-spin text-orange-400 mx-auto mb-3" size={32} strokeWidth={2} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Loading Registry...</span>
                  </td>
                </tr>
              ) : paginatedParts.length > 0 ? (
                paginatedParts.map((part, idx) => {
                  const inv = inventoryItems.find(i =>
                    i.sap_part_number.trim().toLowerCase() === part.common.sap_part_number.trim().toLowerCase()
                  );
                  const status = inv?.rm_status || 'PENDING';

                  return (
                    <motion.tr
                      key={part.common.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.01, 0.3) }}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4 text-[11px] font-black text-slate-600 whitespace-nowrap">
                        {(() => {
                          const val = part.common.sr_no || part.production_data?.['SR.NO'] || part.production_data?.['SN NO'];
                          return (!val || val === 'nan') ? '—' : val;
                        })()}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase whitespace-nowrap">
                        {part.common.model}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded-md text-[10px] font-black border border-orange-100 shadow-sm">
                            {part.common.shortage_quantity ?? part.common.demand_quantity ?? 0}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[11px] font-black text-orange-500 whitespace-nowrap">{part.common.sap_part_number}</td>
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-600 whitespace-nowrap">
                        {(() => {
                          const val = part.common.part_number || part.common.part_no || part.production_data?.['PART NUMBER'] || part.production_data?.['PART NO'];
                          return (!val || val === 'nan') ? '—' : val;
                        })()}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-medium text-slate-500 truncate max-w-[250px]" title={part.common.description}>
                        {(!part.common.description || part.common.description === 'nan') ? '—' : part.common.description}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                        {getMaterialValue(part, ['RM Thk mm', 'RM Thk Mm', 'RM Thickness'])}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                        {getMaterialValue(part, ['Sheet Width', 'SHEET WIDTH'])}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                        {getMaterialValue(part, ['Sheet Length', 'SHEET LENGTH'])}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                        {getMaterialValue(part, ['No of comp per sheet', 'No Of Comp Per Sheet', 'NO OF COMP PER SHEET'])}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                        {getMaterialValue(part, ['RM SIZE', 'RM Size'])}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                        {getMaterialValue(part, ['RM Grade', 'RM GRADE'])}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                        {getMaterialValue(part, ['Act RM Sizes', 'ACT RM SIZES'])}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                        {getMaterialValue(part, ['Revised', 'REVISED'])}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                        {getMaterialValue(part, ['VALIDITY', 'Validity'])}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
                            'RM_SUBMITTED': { label: 'WAITING FOR REVIEW', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
                            'RM_ACCEPTED': { label: 'COMPLETED', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
                            'RM_REJECTED': { label: 'REJECTED', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-400' },
                            'PENDING': { label: 'REVIEW RM DATA', bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-300' },
                          };

                          const config = statusConfig[status] || statusConfig['PENDING'];

                          return (
                            <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black tracking-wider uppercase", config.bg, config.text)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", config.dot)} />
                              {config.label}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            disabled={status === 'RM_SUBMITTED' || status === 'RM_ACCEPTED'}
                            onClick={() => {
                              setSelectedPart(part);
                              const md = part.material_data || {};
                              setRMForm({
                                rm_thk_mm: md['RM Thk mm'] || '',
                                sheet_width: md['Sheet Width'] || '',
                                sheet_length: md['Sheet Length'] || '',
                                no_of_comp_per_sheet: md['No of comp per sheet'] || '',
                                rm_size: md['RM SIZE'] || '',
                                rm_grade: md['RM Grade'] || '',
                                act_rm_sizes: md['Act RM Sizes'] || '',
                                ppc_notes: ''
                              });
                              setShowRMModal(true);
                            }}
                            className={cn(
                              "p-1.5 rounded-lg transition-all",
                              (status === 'RM_SUBMITTED' || status === 'RM_ACCEPTED')
                                ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white"
                            )}
                            title={
                              status === 'RM_SUBMITTED' ? "Waiting for Store Keeper review" :
                                status === 'RM_ACCEPTED' ? "RM already accepted" : "Check RM"
                            }
                          >
                            <CheckCircle2 size={14} />
                          </button>
                          <button
                            onClick={() => openEditModal(part)}
                            className="p-1.5 bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white rounded-lg transition-all"
                            title="Edit Details"
                          >
                            <Edit3 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={15} className="py-32 text-center text-slate-300">
                    <Search size={48} strokeWidth={1} className="mx-auto mb-4 opacity-20" />
                    <p className="text-xs font-black uppercase tracking-widest">No Registry Data Found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredParts.length > 0 && (
          <div className="sticky bottom-0 flex items-center justify-between px-6 py-4 bg-white border-t z-10">
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              Showing{" "}
              <span className="text-orange-500">
                {filteredParts.length === 0 ? 0 : startIndex + 1}
              </span>
              {" "}to{" "}
              <span className="text-orange-500">
                {endItem}
              </span>
              {" "}of{" "}
              <span className="text-orange-500">
                {filteredParts.length}
              </span>
              {" "}entries
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-3">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-4 py-2 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  Prev
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400">PAGE</span>
                  <span className="text-[11px] font-black text-orange-500 bg-orange-50 px-2 py-1 rounded-md min-w-[24px] text-center">
                    {currentPage}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OF {totalPages}</span>
                </div>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-4 py-2 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-5xl bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden my-auto">
              <div className="bg-white px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl", showEditModal ? "bg-orange-500" : "bg-emerald-500")}>
                    {showEditModal ? <FileText size={22} /> : <Plus size={24} strokeWidth={3} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">{showEditModal ? 'Edit Component Row' : 'Register New Part'}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{showEditModal ? `PART #${formData.sap_part_number}` : 'Industrial Specification Entry'}</p>
                  </div>
                </div>
                <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-slate-500 hover:bg-slate-50"><X size={20} /></button>
              </div>
              <form onSubmit={(e) => handleFormSubmit(e, showEditModal)} className="p-8 space-y-10 max-h-[75vh] overflow-y-auto custom-scrollbar bg-white">
                {/* Identification Section */}
                <div className="space-y-6">
                  <h4 className="text-[11px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2">Identification</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">VEHICLE MODEL / DEMAND *</label>
                      {selectedDemand !== 'ALL' ? (
                        <div className="relative group">
                          <input
                            type="text"
                            readOnly
                            value={`${demands.find(d => d.formatted_id === selectedDemand)?.formatted_id} — ${formData.model}`}
                            className="w-full h-12 px-4 bg-slate-100/50 border border-slate-100 rounded-xl text-xs font-black text-slate-400 outline-none cursor-not-allowed shadow-inner"
                          />
                        </div>
                      ) : (
                        <div className="relative group">
                          <select
                            required
                            value={formData.model}
                            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                            className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer focus:border-orange-500 shadow-sm"
                          >
                            <option value="">Select Demand Context</option>
                            {demands.map(d => (
                              <option key={d.id} value={d.model_name}>
                                {d.formatted_id} — {d.model_name}
                              </option>
                            ))}
                          </select>
                          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 rotate-90" size={14} strokeWidth={2.5} />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">SR.NO</label>
                      <input type="text" readOnly value={formData.sr_no} className="w-full h-12 px-4 bg-slate-100/50 border border-slate-100 rounded-xl text-xs font-black text-slate-400 outline-none shadow-inner cursor-not-allowed" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">SAP PART NUMBER *</label>
                      <input type="text" required value={formData.sap_part_number} onChange={(e) => setFormData({ ...formData, sap_part_number: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">PART NUMBER *</label>
                      <input type="text" required value={formData.part_number} onChange={(e) => setFormData({ ...formData, part_number: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">PART DESCRIPTION</label>
                      <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ASSEMBLY NUMBER</label>
                      <input type="text" value={formData.assembly_number} onChange={(e) => setFormData({ ...formData, assembly_number: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500" />
                    </div>
                  </div>
                </div>

                {/* Material Data Section */}
                <div className="space-y-6">
                  <h4 className="text-[11px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2">MATERIAL DATA</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">RM Thk Mm</label>
                      <input type="text" value={formData.rm_thk_mm} onChange={(e) => setFormData({ ...formData, rm_thk_mm: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Sheet Width</label>
                      <input type="text" value={formData.sheet_width} onChange={(e) => setFormData({ ...formData, sheet_width: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Sheet Length</label>
                      <input type="text" value={formData.sheet_length} onChange={(e) => setFormData({ ...formData, sheet_length: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">No Of Comp Per Sheet</label>
                      <input type="text" value={formData.no_of_comp_per_sheet} onChange={(e) => setFormData({ ...formData, no_of_comp_per_sheet: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">RM SIZE</label>
                      <input type="text" readOnly value={formData.rm_size} className="w-full h-12 px-4 bg-slate-100/50 border border-slate-100 rounded-xl text-xs font-black text-slate-400 outline-none cursor-not-allowed shadow-inner" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">RM Grade</label>
                      <input type="text" value={formData.rm_grade} onChange={(e) => setFormData({ ...formData, rm_grade: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Act RM Sizes</label>
                      <input type="text" value={formData.act_rm_sizes} onChange={(e) => setFormData({ ...formData, act_rm_sizes: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Revised</label>
                      <input type="text" value={formData.revised} onChange={(e) => setFormData({ ...formData, revised: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">VALIDITY</label>
                      <input type="text" value={formData.validity} onChange={(e) => setFormData({ ...formData, validity: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-orange-500" />
                    </div>
                  </div>
                </div>



                <div className="flex items-center justify-end gap-4 pt-10 border-t border-slate-50">
                  <button type="button" onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="px-10 h-14 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-sm">Cancel</button>
                  <button type="submit" disabled={submitting} className={cn("px-12 h-14 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl flex items-center justify-center gap-3", showEditModal ? "bg-orange-500" : "bg-emerald-500", submitting && "opacity-50")}>
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : (showEditModal ? <Save size={18} /> : <CheckCircle2 size={18} />)}
                    {submitting ? 'Saving...' : (showEditModal ? 'Save Changes' : 'Register Component')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showRMModal && selectedPart && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-4xl bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden">
              <div className="bg-white px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Smaller Logo/Icon */}
                  <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-100 flex-shrink-0">
                    <Factory size={16} />
                  </div>

                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase whitespace-nowrap">RM Data Check</h3>
                    <div className="w-px h-4 bg-slate-200" />
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{selectedPart.common.sap_part_number}</p>

                    {/* Demand Qty Pill Badge - Single line with different colors */}
                    {selectedPart.common.shortage_quantity !== undefined && (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-orange-100 bg-white shadow-sm ml-1 flex-shrink-0">
                        <span className="text-[9px] font-black text-orange-500 uppercase tracking-tighter">Demand Qty</span>
                        <span className="text-[11px] font-black text-slate-800 leading-none">{selectedPart.common.shortage_quantity}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => setShowRMModal(false)} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-all"><X size={20} /></button>
              </div>
              <form onSubmit={handleRMSubmit} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { key: 'rm_thk_mm', label: 'RM Thickness (mm)' },
                    { key: 'rm_grade', label: 'RM Grade' },
                    { key: 'rm_size', label: 'RM Size' },
                    { key: 'act_rm_sizes', label: 'Actual RM Sizes' },
                    { key: 'sheet_width', label: 'Sheet Width' },
                    { key: 'sheet_length', label: 'Sheet Length' },
                    { key: 'no_of_comp_per_sheet', label: 'Components / Sheet' },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">{label}</label>
                      <input type="text" value={rmForm[key as keyof typeof rmForm]} onChange={e => setRMForm({ ...rmForm, [key]: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-800 outline-none focus:border-orange-500 shadow-sm" />
                    </div>
                  ))}
                  <div className="md:col-span-2 lg:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">PPC Notes</label>
                    <textarea rows={3} value={rmForm.ppc_notes} onChange={e => setRMForm({ ...rmForm, ppc_notes: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-800 outline-none focus:border-orange-500 shadow-sm" />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-50">
                  <button type="button" onClick={() => setShowRMModal(false)} className="px-10 h-14 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-12 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50">
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                    Submit to Store Keeper
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
