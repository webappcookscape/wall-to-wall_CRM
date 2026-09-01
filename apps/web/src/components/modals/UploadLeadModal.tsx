import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  RefreshCw, 
  Table, 
  Info,
  Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { leadService } from '../../services/api';
import type { MasterData } from '../../types/crm';

interface UploadLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
}

interface ParsedLeadRow {
  name: string;
  phone: string;
  email?: string;
  project?: string;
  source?: string;
  brand?: string;
  notes?: string;
  rating?: number;
  isValid: boolean;
  validationError?: string;
}

const SAMPLE_LEAD_DATA = [
  { Name: 'John Doe', Phone: '9876543210', Email: 'john.doe@example.com', Project: 'Cookscape Heights', Source: 'Facebook', Brand: 'Wall to Wall', Notes: 'Interested in 3BHK interiors' },
  { Name: 'Jane Smith', Phone: '9876543211', Email: 'jane.smith@example.com', Project: 'Cookscape Valley', Source: 'Website', Brand: 'Wall to Wall', Notes: 'Looking for immediate consultation' },
  { Name: 'Alice Johnson', Phone: '9876543212', Email: 'alice.j@example.com', Project: 'Cookscape Gardens', Source: 'Walk-in', Brand: 'Wall to Wall', Notes: 'Modular kitchen requirement' },
  { Name: 'Bob Brown', Phone: '9876543213', Email: 'bob.b@example.com', Project: 'Cookscape Heights', Source: 'Referral', Brand: 'Wall to Wall', Notes: 'Budget: 10-15 Lakhs' },
];

const UploadLeadModal: React.FC<UploadLeadModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  title = 'Upload Leads (Bulk Import)' 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedLeadRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    skippedCount: number;
    errors?: string[];
  } | null>(null);

  // Default values mapping
  const [masters, setMasters] = useState<MasterData | null>(null);
  const [defaultBrandId, setDefaultBrandId] = useState('');
  const [defaultProjectId, setDefaultProjectId] = useState('');
  const [defaultSourceId, setDefaultSourceId] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset state on open
      setFile(null);
      setParsedRows([]);
      setParseError(null);
      setImportResult(null);
      
      leadService.getMasters().then(data => {
        setMasters(data);
        if (data?.brands && data.brands.length > 0) {
          setDefaultBrandId(data.brands[0].id);
        }
      }).catch(err => console.error('Error fetching masters for upload:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Download Sample Template CSV
  const handleDownloadSample = () => {
    const csvRows = [
      ['Name', 'Phone', 'Email', 'Project', 'Source', 'Brand', 'Notes'],
      ...SAMPLE_LEAD_DATA.map(r => [
        `"${r.Name}"`,
        `"${r.Phone}"`,
        `"${r.Email}"`,
        `"${r.Project}"`,
        `"${r.Source}"`,
        `"${r.Brand}"`,
        `"${r.Notes}"`
      ])
    ];

    const csvContent = csvRows.map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_lead_upload_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Process and parse uploaded file (CSV or XLSX)
  const processFile = (selectedFile: File) => {
    setParseError(null);
    setImportResult(null);
    setFile(selectedFile);
    setIsParsing(true);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setParseError('The uploaded file is empty or does not contain any valid rows.');
          setParsedRows([]);
          setIsParsing(false);
          return;
        }

        // Map and validate each row
        const mapped: ParsedLeadRow[] = rawJson.map((row) => {
          // Normalize column names
          const keys = Object.keys(row);
          const getVal = (nameRegex: RegExp) => {
            const matchedKey = keys.find(k => nameRegex.test(k.trim()));
            return matchedKey ? String(row[matchedKey]).trim() : '';
          };

          const name = getVal(/^name$|^customer\s*name$|^client\s*name$/i);
          const rawPhone = getVal(/^phone$|^mobile$|^contact$|^phno1$/i);
          const email = getVal(/^email$|^email\s*id$/i);
          const project = getVal(/^project$|^project\s*name$/i);
          const source = getVal(/^source$|^source\s*name$|^lead\s*source$/i);
          const brand = getVal(/^brand$|^brand\s*name$/i);
          const notes = getVal(/^notes$|^comments$|^feedback$/i);
          const ratingStr = getVal(/^rating$/i);

          const normalizedPhone = rawPhone.replace(/\D/g, '');

          let isValid = true;
          let validationError = '';

          if (!name) {
            isValid = false;
            validationError = 'Missing customer name';
          } else if (!normalizedPhone || normalizedPhone.length < 7) {
            isValid = false;
            validationError = 'Invalid or missing phone number';
          }

          return {
            name,
            phone: normalizedPhone,
            email: email || undefined,
            project: project || undefined,
            source: source || undefined,
            brand: brand || undefined,
            notes: notes || undefined,
            rating: ratingStr ? Number(ratingStr) : undefined,
            isValid,
            validationError
          };
        });

        setParsedRows(mapped);
      } catch (err: any) {
        console.error('File parsing error:', err);
        setParseError(`Failed to parse file: ${err.message || 'Unknown format error'}`);
        setParsedRows([]);
      } finally {
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      setParseError('Could not read the uploaded file. Please verify file permissions.');
      setIsParsing(false);
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setParsedRows([]);
    setParseError(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validRowsCount = parsedRows.filter(r => r.isValid).length;

  // Execute Import
  const handleImport = async () => {
    const validLeads = parsedRows.filter(r => r.isValid);
    if (validLeads.length === 0) {
      alert('No valid lead rows found to import. Please check required fields.');
      return;
    }

    setIsUploading(true);
    setParseError(null);

    try {
      const response = await leadService.bulkImportLeads({
        leads: validLeads,
        defaultBrandId: defaultBrandId || undefined,
        defaultProjectId: defaultProjectId || undefined,
        defaultSourceId: defaultSourceId || undefined,
      });

      const resData = response?.data || response;
      setImportResult({
        importedCount: resData.importedCount || validLeads.length,
        skippedCount: resData.skippedCount || 0,
        errors: resData.errors || []
      });

      onSuccess();
    } catch (error: any) {
      console.error('Import error:', error);
      setParseError(error?.response?.data?.message || 'Failed to import leads. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-100 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-[#313a46] p-5 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center text-emerald-400">
              <Upload size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold font-rubik text-white">{title}</h3>
              <p className="text-xs text-gray-300">Upload multiple leads at once using CSV or Excel spreadsheets</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-300 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Step 1: Sample Format & Download Template Box */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 text-blue-900">
                <Table size={18} className="text-blue-600 shrink-0" />
                <h5 className="font-bold text-sm m-0">Standard Sample Format</h5>
              </div>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
              >
                <Download size={14} /> Download Sample Template (.CSV)
              </button>
            </div>

            {/* Sample Table Preview */}
            <div className="overflow-x-auto rounded-xl border border-blue-200/80 bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-blue-100/60 text-blue-900 font-bold uppercase text-[10px] tracking-wider border-b border-blue-200/60">
                  <tr>
                    <th className="py-2 px-3">Name *</th>
                    <th className="py-2 px-3">Phone *</th>
                    <th className="py-2 px-3">Email</th>
                    <th className="py-2 px-3">Project</th>
                    <th className="py-2 px-3">Source</th>
                    <th className="py-2 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50 text-gray-600">
                  {SAMPLE_LEAD_DATA.slice(0, 2).map((s, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 px-3 font-semibold text-gray-800">{s.Name}</td>
                      <td className="py-1.5 px-3 font-mono">{s.Phone}</td>
                      <td className="py-1.5 px-3">{s.Email}</td>
                      <td className="py-1.5 px-3">{s.Project}</td>
                      <td className="py-1.5 px-3">{s.Source}</td>
                      <td className="py-1.5 px-3 truncate max-w-[150px]">{s.Notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-blue-700 flex items-center gap-1.5 font-medium">
              <Info size={13} className="shrink-0" />
              Columns marked with * (Name and Phone) are mandatory for lead creation.
            </p>
          </div>

          {/* Step 2: File Type & Requirements Specification */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0">
                CSV
              </div>
              <div>
                <p className="font-bold text-gray-800">Supported File Types</p>
                <p className="text-[11px] text-gray-500 font-medium">.csv, .xlsx, .xls</p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                <FileText size={16} />
              </div>
              <div>
                <p className="font-bold text-gray-800">Max File Size</p>
                <p className="text-[11px] text-gray-500 font-medium">Up to 5 MB per file</p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
                <FileSpreadsheet size={16} />
              </div>
              <div>
                <p className="font-bold text-gray-800">Header Encoding</p>
                <p className="text-[11px] text-gray-500 font-medium">UTF-8 character format</p>
              </div>
            </div>
          </div>

          {/* Step 3: Drag and Drop Upload Area */}
          {!file ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-brand bg-gray-50/60 hover:bg-brand/5 p-8 rounded-2xl text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-gray-200 flex items-center justify-center text-brand">
                <Upload size={26} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">
                  Click to browse or drag & drop your lead file here
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Accepts CSV, Excel (.xlsx, .xls) formatted files
                </p>
              </div>
              <button
                type="button"
                className="bg-white border border-gray-300 hover:border-brand text-gray-700 font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all"
              >
                Browse File
              </button>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/70 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{file.name}</p>
                    <p className="text-xs text-gray-400">
                      {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} total rows detected
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  title="Remove file"
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* Status & Preview Summary */}
              {isParsing ? (
                <div className="flex items-center gap-2 text-xs text-gray-500 py-3">
                  <RefreshCw size={14} className="animate-spin text-brand" /> Parsing file contents...
                </div>
              ) : (
                <div className="space-y-3 pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700">Preview Parsed Leads ({parsedRows.length} rows):</span>
                    <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      {validRowsCount} Valid Leads Ready
                    </span>
                  </div>

                  {/* Parsed Preview Table */}
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider sticky top-0 border-b border-gray-200">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Name</th>
                          <th className="py-2 px-3">Phone</th>
                          <th className="py-2 px-3">Project</th>
                          <th className="py-2 px-3">Source</th>
                          <th className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsedRows.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className={row.isValid ? '' : 'bg-red-50/40'}>
                            <td className="py-2 px-3 font-mono text-gray-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-bold text-gray-800">{row.name || <span className="text-red-500 italic">Empty</span>}</td>
                            <td className="py-2 px-3 font-mono">{row.phone || <span className="text-red-500 italic">Invalid</span>}</td>
                            <td className="py-2 px-3 text-gray-600">{row.project || '-'}</td>
                            <td className="py-2 px-3 text-gray-600">{row.source || '-'}</td>
                            <td className="py-2 px-3 text-center">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 size={11} /> Valid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full" title={row.validationError}>
                                  <AlertCircle size={11} /> {row.validationError}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedRows.length > 10 && (
                    <p className="text-[11px] text-gray-400 italic text-right">
                      Showing first 10 of {parsedRows.length} records.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Optional Default Master Mappings */}
          {file && (
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
              <p className="text-xs font-bold text-gray-700">Fallback Defaults (used if empty in uploaded file):</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Default Brand</label>
                  <select
                    value={defaultBrandId}
                    onChange={(e) => setDefaultBrandId(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand"
                  >
                    <option value="">- None -</option>
                    {masters?.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Default Project</label>
                  <select
                    value={defaultProjectId}
                    onChange={(e) => setDefaultProjectId(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand"
                  >
                    <option value="">- None -</option>
                    {masters?.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Default Source</label>
                  <select
                    value={defaultSourceId}
                    onChange={(e) => setDefaultSourceId(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand"
                  >
                    <option value="">- None -</option>
                    {masters?.sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Parse or Upload Errors */}
          {parseError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Import Result Success Notification */}
          {importResult && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                Import Completed: {importResult.importedCount} leads successfully added!
              </div>
              {importResult.skippedCount > 0 && (
                <p className="text-xs text-amber-800">
                  {importResult.skippedCount} rows were skipped due to validation issues.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-bold text-xs hover:bg-gray-100 transition-colors uppercase tracking-wider"
          >
            {importResult ? 'Close' : 'Cancel'}
          </button>

          {!importResult ? (
            <button
              type="button"
              disabled={isUploading || validRowsCount === 0 || isParsing}
              onClick={handleImport}
              className="px-6 py-2.5 rounded-xl bg-brand text-white font-bold text-xs hover:bg-[#004d30] transition-all uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-brand/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Importing Leads...
                </>
              ) : (
                <>
                  <Upload size={14} /> Import {validRowsCount > 0 ? `${validRowsCount} Leads` : ''}
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-brand text-white font-bold text-xs hover:bg-[#004d30] transition-all uppercase tracking-wider"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadLeadModal;
