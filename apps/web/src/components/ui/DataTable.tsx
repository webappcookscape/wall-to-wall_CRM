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
    <div className="bg-white rounded-xl shadow-sm border border-[#e3eaef] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-base text-left font-roboto">
          <thead className="bg-[#f3f6f8] border-b border-[#e3eaef]">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="px-6 py-4 font-black text-gray-800 uppercase tracking-wider text-xs md:text-sm font-rubik">
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
                      <div className="h-5 bg-[#f3f6f8] rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : (data?.length || 0) > 0 ? (
              data.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-brand/5 transition-colors group">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-6 py-4 text-gray-800 text-sm md:text-base font-medium align-middle">
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-20 text-center text-gray-500 font-semibold text-base italic font-roboto">
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="bg-[#f3f6f8] px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-[#e3eaef] gap-4">
        <p className="text-xs md:text-sm font-bold text-gray-600 uppercase tracking-wider font-rubik text-center sm:text-left">
          Showing 1 to {data?.length || 0} of {total} entries
        </p>
        <div className="flex items-center gap-1.5">
           <button 
             className="px-3 py-2 rounded-lg border border-[#d3dee6] text-gray-600 hover:bg-white hover:text-brand transition-all text-sm font-bold disabled:opacity-30 disabled:hover:bg-transparent"
             disabled={page === 1}
             onClick={() => onPageChange(page - 1)}
           >
             <ChevronLeft size={18} />
           </button>
           <button className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-black shadow-sm">
             {page}
           </button>
           <button 
             className="px-3 py-2 rounded-lg border border-[#d3dee6] text-gray-600 hover:bg-white hover:text-brand transition-all text-sm font-bold disabled:opacity-30"
             disabled={data?.length < 10 && page * 10 >= total}
             onClick={() => onPageChange(page + 1)}
           >
             <ChevronRight size={18} />
           </button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
