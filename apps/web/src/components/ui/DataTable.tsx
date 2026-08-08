import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';

export interface Column {
  header: React.ReactNode;
  accessor: string;
  render?: (row: any) => React.ReactNode;
}

export interface DataTableProps {
  columns: Column[];
  data: any[];
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

const DataTable: React.FC<DataTableProps> = ({ columns, data, total, page, onPageChange, isLoading }) => {
  return (
    <div className="bg-white rounded shadow-sm border border-[#e3eaef] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left font-roboto">
          <thead className="bg-[#f3f6f8] border-b border-[#e3eaef]">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="px-6 py-4 font-bold text-[#313a46] uppercase tracking-widest text-[10px] font-rubik">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e3eaef] relative">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="px-6 py-5">
                      <div className="h-4 bg-[#f3f6f8] rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : (data?.length || 0) > 0 ? (
              data.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-brand/5 transition-colors group">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-6 py-4 text-gray-600">
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-20 text-center text-gray-400 italic font-roboto">
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="bg-[#f3f6f8] px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-[#e3eaef] gap-4">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-rubik text-center sm:text-left">
          Showing 1 to {data?.length || 0} of {total} entries
        </p>
        <div className="flex items-center gap-1">
           <button 
             className="px-2 py-1.5 rounded border border-[#d3dee6] text-gray-500 hover:bg-white hover:text-brand transition-all text-xs font-bold disabled:opacity-30"
             disabled={page === 1}
             onClick={() => onPageChange(page - 1)}
           >
             <ChevronLeft size={16} />
           </button>
           <button className="px-3 py-1.5 rounded bg-brand text-white text-xs font-bold shadow-sm">
             {page}
           </button>
           <button 
             className="px-2 py-1.5 rounded border border-[#d3dee6] text-gray-500 hover:bg-white hover:text-brand transition-all text-xs font-bold"
             onClick={() => onPageChange(page + 1)}
           >
             <ChevronRight size={16} />
           </button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
