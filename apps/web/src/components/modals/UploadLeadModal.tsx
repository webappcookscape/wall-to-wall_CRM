import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  UserCheck, 
  Calendar, 
  Check, 
  HelpCircle
} from 'lucide-react';
import { leadService } from '../../services/api';
import type { MasterData } from '../../types/crm';

interface UploadLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  masters?: MasterData | null;
}

interface ParsedLeadRow {
  sNo?: string | number;
  name: string;
  phone: string;
  email?: string;
  nextDate?: string;
  nextDateFormatted?: string;
  nextFollowUp?: string;
  status?: string;
  requirement?: string;
  siteLocation?: string;
  employeeEmail?: string;
  project?: string;
  isValid: boolean;
  invalidReason?: string;
}

const MONTH_NAMES: { [key: string]: number } = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

// Smart date parser: handles '17 Sep', '17-Sep-2026', '17/09/2026', Excel serial codes
const parseFlexibleDate = (raw: any): { isoString: string; displayString: string } | null => {
  if (!raw) return null;

  const currentYear = new Date().getFullYear();

  // If already a JS Date
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return {
      isoString: raw.toISOString(),
      displayString: raw.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };
  }

  // If numeric (Excel serial date like 45552)
  if (typeof raw === 'number' && raw > 20000 && raw < 80000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(excelEpoch.getTime() + raw * 86400 * 1000);
    if (!isNaN(jsDate.getTime())) {
      return {
        isoString: jsDate.toISOString(),
        displayString: jsDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      };
    }
  }

  const str = String(raw).trim();
  if (!str) return null;

  // Match '17 Sep' or '17 September' or '17 Sep 2026' or '17-Sep'
  const dayMonthRegex = /^(\d{1,2})[\s\-\/\.]*([A-Za-z]+)(?:[\s\-\/\.]*(\d{2,4}))?$/;
  const match1 = str.match(dayMonthRegex);
  if (match1) {
    const day = parseInt(match1[1]!, 10);
    const monthStr = match1[2]!.toLowerCase();
    const month = MONTH_NAMES[monthStr];

    if (month !== undefined && day >= 1 && day <= 31) {
      const year = match1[3] ? (match1[3].length === 2 ? 2000 + parseInt(match1[3], 10) : parseInt(match1[3], 10)) : currentYear;
      const d = new Date(year, month, day, 10, 0, 0);
      if (!isNaN(d.getTime())) {
        return {
          isoString: d.toISOString(),
          displayString: `${day} ${match1[2]} ${year}`
        };
      }
    }
  }

  // Match 'DD/MM/YYYY' or 'DD-MM-YYYY'
  const dmyRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/;
  const match2 = str.match(dmyRegex);
  if (match2) {
    const day = parseInt(match2[1]!, 10);
    const month = parseInt(match2[2]!, 10) - 1;
    const year = match2[3]!.length === 2 ? 2000 + parseInt(match2[3]!, 10) : parseInt(match2[3]!, 10);
    const d = new Date(year, month, day, 10, 0, 0);
    if (!isNaN(d.getTime())) {
      return {
        isoString: d.toISOString(),
        displayString: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      };
    }
  }

  // Fallback to standard parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return {
      isoString: parsed.toISOString(),
      displayString: parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };
  }

  return null;
};

const normalizePhoneString = (val: any): string => {
  const cleaned = String(val || '').replace(/\D/g, '');
  return cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
};

const UploadLeadModal: React.FC<UploadLeadModalProps> = ({ isOpen, onClose, onSuccess, masters }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedLeadRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Batch Defaults
  const [defaultStatusId, setDefaultStatusId] = useState('');
  const [defaultAssignedToId, setDefaultAssignedToId] = useState('');
  const [customEmployeeEmail, setCustomEmployeeEmail] = useState('');
  const [defaultBrandId, setDefaultBrandId] = useState('');
  const [defaultSourceId, setDefaultSourceId] = useState('');
  const [defaultProjectId, setDefaultProjectId] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Result state
  const [importResult, setImportResult] = useState<{
    imported: number;
    updated: number;
    skipped: number;
    errors: { row: number; leadName?: string; error: string }[];
  } | null>(null);

  // Set intelligent defaults once masters load
  useEffect(() => {
    if (masters) {
      if (!defaultStatusId && masters.statuses?.length > 0) {
        // Recommend 'Follow-up' status so followed leads don't land in Fresh!
        const followUp = masters.statuses.find(s => s.name.toLowerCase() === 'follow-up');
        if (followUp) setDefaultStatusId(followUp.id);
        else setDefaultStatusId(masters.statuses[0]!.id);
      }
      if (!defaultBrandId && masters.brands?.length > 0) {
        setDefaultBrandId(masters.brands[0]!.id);
      }
      if (!defaultSourceId && masters.sources?.length > 0) {
        const importSrc = masters.sources.find(s => /upload|import|sheet/i.test(s.name));
        setDefaultSourceId(importSrc ? importSrc.id : masters.sources[0]!.id);
      }
    }
  }, [masters, defaultStatusId, defaultBrandId, defaultSourceId]);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]!);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]!);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    setImportResult(null);
    parseSpreadsheet(selectedFile);
  };

  const parseSpreadsheet = async (f: File) => {
    setIsParsing(true);
    try {
      const buffer = await f.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error('No sheet found in workbook');

      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet) throw new Error('Worksheet is empty');

      // Convert sheet to 2D array of rows
      const rawMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (!rawMatrix || rawMatrix.length === 0) {
        alert('The uploaded spreadsheet is empty.');
        setIsParsing(false);
        return;
      }

      // Step 1: Find the header row index
      // The header row contains words like 'client name', 'name', 'number', 'phone', 'next date', 'status'
      let headerRowIdx = -1;
      for (let r = 0; r < Math.min(rawMatrix.length, 10); r++) {
        const row = rawMatrix[r] || [];
        const rowStr = row.map(c => String(c).toLowerCase().trim()).join(' ');
        if (
          (rowStr.includes('client name') || rowStr.includes('name')) &&
          (rowStr.includes('number') || rowStr.includes('phone') || rowStr.includes('mobile'))
        ) {
          headerRowIdx = r;
          break;
        }
      }

      // Fallback: use row 0 if no header pattern matched
      if (headerRowIdx === -1) {
        headerRowIdx = 0;
      }

      const headerRow = (rawMatrix[headerRowIdx] || []).map(c => String(c).toLowerCase().trim());

      // Map column positions
      const colMap: { [key: string]: number } = {};
      headerRow.forEach((h, idx) => {
        if (!h) return;
        if (/^(s\.?\s*no|sl\.?\s*no|sno|id)$/i.test(h)) colMap['sNo'] = idx;
        else if (/(client\s*name|customer\s*name|^name$|^client$)/i.test(h)) colMap['name'] = idx;
        else if (/(^number$|^phone$|^mobile$|contact|ph\s*no|phone\s*no)/i.test(h)) colMap['phone'] = idx;
        else if (/(next\s*date|follow\s*up\s*date|contactable\s*date|next\s*follow\s*up)/i.test(h)) colMap['nextDate'] = idx;
        else if (/status/i.test(h)) colMap['status'] = idx;
        else if (/(requirement|scope|work|service)/i.test(h)) colMap['requirement'] = idx;
        else if (/(site\s*location|location|address|place)/i.test(h)) colMap['siteLocation'] = idx;
        else if (/(employee\s*email|staff\s*email|assignee\s*email|assigned\s*to|executive)/i.test(h)) colMap['employeeEmail'] = idx;
        else if (/project/i.test(h)) colMap['project'] = idx;
        else if (/email/i.test(h) && !colMap['email']) colMap['email'] = idx;
      });

      // Step 2: Parse data rows starting after headerRowIdx
      const parsed: ParsedLeadRow[] = [];
      for (let r = headerRowIdx + 1; r < rawMatrix.length; r++) {
        const row = rawMatrix[r] || [];
        // Skip purely empty rows
        if (row.every(cell => String(cell).trim() === '')) continue;

        // Skip banner / section header rows (e.g. "Aug month positive" spanning across cells with no phone)
        const nameVal = colMap['name'] !== undefined ? String(row[colMap['name']] || '').trim() : '';
        const phoneVal = colMap['phone'] !== undefined ? String(row[colMap['phone']] || '').trim() : '';

        // If phone and name are both empty, or if this row has only 1 filled cell (banner row), skip it!
        const filledCells = row.filter(cell => String(cell).trim() !== '');
        if (filledCells.length <= 1 && (!phoneVal || !nameVal)) {
          continue; // Skips title banner rows like 'Aug month positive'
        }

        const normalizedPhone = normalizePhoneString(phoneVal);
        const sNoVal = colMap['sNo'] !== undefined ? row[colMap['sNo']] : r;
        const nextDateVal = colMap['nextDate'] !== undefined ? row[colMap['nextDate']] : '';
        const statusVal = colMap['status'] !== undefined ? String(row[colMap['status']] || '').trim() : '';
        const requirementVal = colMap['requirement'] !== undefined ? String(row[colMap['requirement']] || '').trim() : '';
        const siteLocationVal = colMap['siteLocation'] !== undefined ? String(row[colMap['siteLocation']] || '').trim() : '';
        const employeeEmailVal = colMap['employeeEmail'] !== undefined ? String(row[colMap['employeeEmail']] || '').trim() : '';
        const projectVal = colMap['project'] !== undefined ? String(row[colMap['project']] || '').trim() : '';
        const emailVal = colMap['email'] !== undefined ? String(row[colMap['email']] || '').trim() : '';

        const parsedDate = parseFlexibleDate(nextDateVal);

        let isValid = true;
        let invalidReason = '';

        if (!nameVal) {
          isValid = false;
          invalidReason = 'Missing client name';
        } else if (!normalizedPhone || normalizedPhone.length < 10) {
          isValid = false;
          invalidReason = `Invalid phone number: "${phoneVal}"`;
        }

        parsed.push({
          sNo: sNoVal,
          name: nameVal,
          phone: normalizedPhone,
          email: emailVal,
          nextDate: nextDateVal ? String(nextDateVal) : undefined,
          nextDateFormatted: parsedDate?.displayString,
          nextFollowUp: parsedDate?.isoString,
          status: statusVal,
          requirement: requirementVal,
          siteLocation: siteLocationVal,
          employeeEmail: employeeEmailVal,
          project: projectVal,
          isValid,
          invalidReason
        });
      }

      setParsedRows(parsed);
    } catch (err: any) {
      console.error('Spreadsheet parse error:', err);
      alert(`Failed to parse file: ${err.message || 'Invalid format'}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDownloadSample = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['S.no', 'Next date', 'Client name', 'Number', 'Site location', 'Requirement', 'status', 'Employee Email'],
      ['1', '17 Sep', 'Thulasi Subramanian', '9566013424', 'Velachery', 'Wall Cladding', 'shared brochure /visited /waiting for selection / need to share estimation', 'arun.cre@wall2wall.com'],
      ['2', '18 Sep', 'Rajesh Kannan', '9840112233', 'Anna Nagar', 'Modular Kitchen', 'First consultation done, budget 5L', 'cre@wall2wall.com'],
      ['3', '20 Sep', 'Sneha Reddy', '9962045678', 'OMR Chennai', 'Full Interior', 'Follow-up call scheduled', '']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Leads Template');
    XLSX.writeFile(wb, 'Cookscape_Leads_Upload_Template.xlsx');
  };

  const handleImportSubmit = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('No valid lead rows to import. Please check that names and 10-digit phone numbers are present.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        leads: validRows.map(r => ({
          sNo: r.sNo,
          name: r.name,
          phone: r.phone,
          email: r.email || null,
          nextFollowUp: r.nextFollowUp || null,
          nextDate: r.nextDate || null,
          status: r.status || null,
          requirement: r.requirement || null,
          siteLocation: r.siteLocation || null,
          employeeEmail: r.employeeEmail || customEmployeeEmail || null,
          assignedToId: defaultAssignedToId || null,
          projectName: r.project || null,
          brandId: defaultBrandId || null,
          sourceId: defaultSourceId || null,
          projectId: defaultProjectId || null,
        })),
        defaultStatusId: defaultStatusId || null,
        defaultAssignedToId: defaultAssignedToId || null,
        defaultEmployeeEmail: customEmployeeEmail || null,
        defaultBrandId: defaultBrandId || null,
        defaultSourceId: defaultSourceId || null,
        defaultProjectId: defaultProjectId || null,
        skipDuplicates,
      };

      const res = await leadService.importLeads(payload);
      setImportResult(res.data);
      onSuccess();
    } catch (error: any) {
      console.error('Import failed:', error);
      alert(error.response?.data?.message || 'Failed to import leads.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-gray-100">
        
        {/* Header */}
        <div className="bg-[#1f2937] text-white p-4 sm:p-5 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand/20 border border-brand/40 flex items-center justify-center text-brand">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider font-rubik m-0">
                Import & Upload Leads
              </h3>
              <p className="text-[11px] text-gray-300 m-0">
                Upload your Excel (.xlsx, .xls) or CSV sheet directly into the CRM
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSample}
              type="button"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-600 text-gray-200 hover:text-white hover:bg-gray-800 text-[11px] font-bold transition-all"
              title="Download formatted sample file"
            >
              <Download size={13} /> Sample Sheet
            </button>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* Success summary view */}
          {importResult ? (
            <div className="space-y-6 py-6 text-center">
              <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-200">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-800 m-0">Import Completed Successfully!</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Your leads have been processed and added to the CRM database.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <div className="text-2xl font-black text-emerald-700">{importResult.imported}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">New Leads Added</div>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <div className="text-2xl font-black text-blue-700">{importResult.updated}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Updated Leads</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="text-2xl font-black text-gray-700">{importResult.skipped}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Skipped / Exists</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="max-w-lg mx-auto text-left bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                    <AlertCircle size={16} /> Notice on skipped rows ({importResult.errors.length}):
                  </div>
                  <ul className="text-[11px] text-amber-700 list-disc pl-5 max-h-32 overflow-y-auto space-y-1">
                    {importResult.errors.map((e, idx) => (
                      <li key={idx}>
                        Row {e.row} ({e.leadName || 'Unnamed'}): {e.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setParsedRows([]);
                    setFile(null);
                    setImportResult(null);
                  }}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 uppercase tracking-wider"
                >
                  Upload Another File
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-brand text-white text-xs font-bold hover:bg-[#004d30] uppercase tracking-wider shadow-md"
                >
                  Done & View Leads
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Dropzone Area */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  file ? 'border-brand bg-brand/5' : 'border-gray-300 hover:border-brand hover:bg-gray-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="h-12 w-12 rounded-full bg-brand/10 text-brand flex items-center justify-center">
                    <Upload size={24} />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-gray-700">
                      {file ? file.name : 'Click to upload or drag & drop your Excel sheet'}
                    </span>
                    <p className="text-xs text-gray-400 m-0 mt-0.5">
                      Supports .xlsx, .xls, and .csv files
                    </p>
                  </div>
                  {file && (
                    <span className="text-[11px] font-bold text-brand bg-brand/10 px-3 py-1 rounded-full">
                      {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} rows detected
                    </span>
                  )}
                </div>
              </div>

              {/* Batch Assignment & Status Configuration */}
              <div className="bg-gray-50/80 border border-gray-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 m-0 flex items-center gap-1.5">
                    <UserCheck size={16} className="text-brand" /> Assign & Status Defaults
                  </h4>
                  <span className="text-[11px] text-gray-400 italic">
                    Applied automatically to all imported leads
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Default Status */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      Default Status <span className="text-red-500">*</span>
                      <span title="Choose 'Follow-up' if your sheet contains active followed leads" className="text-gray-400">
                        <HelpCircle size={12} />
                      </span>
                    </label>
                    <select
                      className="form-control !bg-white !py-2 !text-[12px] font-bold text-gray-700"
                      value={defaultStatusId}
                      onChange={(e) => setDefaultStatusId(e.target.value)}
                    >
                      {masters?.statuses?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.name.toLowerCase() === 'follow-up' ? '(Recommended for followed leads)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assign to Employee (Dropdown) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      Assign To Employee
                      <span title="Select employee to assign all leads to directly, avoiding manual bulk assign" className="text-gray-400">
                        <HelpCircle size={12} />
                      </span>
                    </label>
                    <select
                      className="form-control !bg-white !py-2 !text-[12px] font-bold text-gray-700"
                      value={defaultAssignedToId}
                      onChange={(e) => {
                        setDefaultAssignedToId(e.target.value);
                        if (e.target.value) setCustomEmployeeEmail('');
                      }}
                    >
                      <option value="">- Leave Unassigned / Match from Sheet -</option>
                      {masters?.users?.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} {u.email ? `(${u.email})` : ''} — {u.role}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Or Assign by Employee Email */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Or Enter Employee Email
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. arun.cre@wall2wall.com"
                      className="form-control !bg-white !py-1.5 !text-[12px]"
                      value={customEmployeeEmail}
                      onChange={(e) => {
                        setCustomEmployeeEmail(e.target.value);
                        if (e.target.value) setDefaultAssignedToId('');
                      }}
                    />
                  </div>

                  {/* Default Brand */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Brand <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="form-control !bg-white !py-2 !text-[12px] font-bold text-gray-700"
                      value={defaultBrandId}
                      onChange={(e) => setDefaultBrandId(e.target.value)}
                    >
                      {masters?.brands?.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Default Source */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Source <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="form-control !bg-white !py-2 !text-[12px] font-bold text-gray-700"
                      value={defaultSourceId}
                      onChange={(e) => setDefaultSourceId(e.target.value)}
                    >
                      {masters?.sources?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Default Project (Optional) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Project (Optional)
                    </label>
                    <select
                      className="form-control !bg-white !py-2 !text-[12px] font-bold text-gray-700"
                      value={defaultProjectId}
                      onChange={(e) => setDefaultProjectId(e.target.value)}
                    >
                      <option value="">- None / From Sheet -</option>
                      {masters?.projects?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Duplicates Checkbox */}
                <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-gray-600 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                      className="rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    <span>Update existing leads with new remarks & follow-up dates (prevents duplicate error)</span>
                  </label>
                </div>
              </div>

              {/* Data Preview Table */}
              {isParsing ? (
                <div className="py-8 text-center text-gray-400 space-y-2">
                  <div className="w-6 h-6 border-2 border-brand/30 border-t-brand animate-spin rounded-full mx-auto" />
                  <p className="text-xs font-bold">Reading and analyzing spreadsheet columns...</p>
                </div>
              ) : parsedRows.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Sheet Preview
                      </span>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        {validCount} valid leads
                      </span>
                      {invalidCount > 0 && (
                        <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                          {invalidCount} invalid
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400">
                      Showing first {Math.min(parsedRows.length, 10)} of {parsedRows.length} rows
                    </span>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-gray-100/80 text-gray-600 font-bold uppercase sticky top-0 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2 w-12">#</th>
                          <th className="px-3 py-2">Client Name</th>
                          <th className="px-3 py-2">Phone</th>
                          <th className="px-3 py-2">Next Date</th>
                          <th className="px-3 py-2">Requirement</th>
                          <th className="px-3 py-2">Status / Notes</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsedRows.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className={row.isValid ? 'hover:bg-gray-50' : 'bg-red-50/50'}>
                            <td className="px-3 py-2 text-gray-400">{row.sNo || idx + 1}</td>
                            <td className="px-3 py-2 font-bold text-gray-800">{row.name || <span className="text-red-400 italic">Empty</span>}</td>
                            <td className="px-3 py-2 font-medium text-brand">{row.phone || <span className="text-red-400 italic">Invalid</span>}</td>
                            <td className="px-3 py-2">
                              {row.nextDateFormatted ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium text-[10px]">
                                  <Calendar size={11} /> {row.nextDateFormatted}
                                </span>
                              ) : row.nextDate ? (
                                <span className="text-gray-500">{row.nextDate}</span>
                              ) : (
                                <span className="text-gray-300 italic">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate" title={row.requirement}>
                              {row.requirement || '—'}
                            </td>
                            <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate" title={row.status}>
                              {row.status || '—'}
                            </td>
                            <td className="px-3 py-2">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[10px]">
                                  <Check size={12} /> Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-500 font-bold text-[10px]" title={row.invalidReason}>
                                  <AlertCircle size={12} /> Error
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </>
          )}

        </div>

        {/* Modal Footer */}
        {!importResult && (
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={handleDownloadSample}
              type="button"
              className="sm:hidden inline-flex items-center gap-1 text-brand text-xs font-bold"
            >
              <Download size={12} /> Template
            </button>
            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-gray-500 hover:text-gray-700 text-xs font-bold uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || isParsing || validCount === 0}
                onClick={handleImportSubmit}
                className="px-6 py-2.5 rounded-xl bg-brand hover:bg-[#004d30] text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-brand/20 disabled:opacity-50 flex items-center gap-2 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Importing {validCount} Leads...
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    Import {validCount > 0 ? `${validCount} Leads` : 'Leads'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default UploadLeadModal;
