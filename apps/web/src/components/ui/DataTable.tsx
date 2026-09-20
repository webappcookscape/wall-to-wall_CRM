import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
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
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  isLoading?: boolean;
}

const DataTable: React.FC<DataTableProps> = ({ 
  columns, 
  data, 
  total, 
  page, 
  pageSize = 10,
  onPageChange, 
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  isLoading 
}) => {
  const effectivePageSize = pageSize > 0 ? pageSize : 10;
  const totalPages = Math.max(1, Math.ceil(total / effectivePageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const startEntry = total === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1;
  const endEntry = Math.min(currentPage * effectivePageSize, total);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const pageNumbers = getPageNumbers();

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
              [...Array(effectivePageSize > 10 ? 10 : effectivePageSize)].map((_, i) => (
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
      
      {/* Pagination Container */}
      <div className="bg-[#f3f6f8] px-4 sm:px-6 py-4 flex flex-col lg:flex-row items-center justify-between border-t border-[#e3eaef] gap-4">
        {/* Left: Summary & Page Size */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto justify-between sm:justify-start">
          <p className="text-xs md:text-sm font-bold text-gray-600 uppercase tracking-wider font-rubik text-center sm:text-left">
            Showing <span className="text-gray-900 font-extrabold">{startEntry}</span> to <span className="text-gray-900 font-extrabold">{endEntry}</span> of <span className="text-gray-900 font-extrabold">{total}</span> entries
          </p>

          {onPageSizeChange && (
            <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600 font-bold font-rubik">
              <span className="shrink-0">Rows:</span>
              <select
                value={effectivePageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="bg-white border border-[#d3dee6] text-gray-800 font-black rounded-lg px-2.5 py-1 text-xs md:text-sm focus:outline-none focus:border-brand shadow-xs cursor-pointer"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right: Page Navigation Controls */}
        <div className="flex items-center flex-wrap justify-center gap-1 sm:gap-1.5">
          {/* First Page */}
          <button 
            type="button"
            title="First Page"
            className="p-2 rounded-lg border border-[#d3dee6] text-gray-600 hover:bg-white hover:text-brand hover:border-brand transition-all text-sm font-bold disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-600 disabled:hover:border-[#d3dee6] disabled:cursor-not-allowed cursor-pointer"
            disabled={currentPage === 1 || isLoading}
            onClick={() => onPageChange(1)}
          >
            <ChevronsLeft size={16} />
          </button>

          {/* Previous Page */}
          <button 
            type="button"
            title="Previous Page"
            className="p-2 rounded-lg border border-[#d3dee6] text-gray-600 hover:bg-white hover:text-brand hover:border-brand transition-all text-sm font-bold disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-600 disabled:hover:border-[#d3dee6] disabled:cursor-not-allowed cursor-pointer"
            disabled={currentPage === 1 || isLoading}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft size={16} />
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {pageNumbers.map((pNum, idx) => {
              if (pNum === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400 font-extrabold text-sm select-none">
                    ...
                  </span>
                );
              }
              const isSelected = pNum === currentPage;
              return (
                <button
                  key={`page-${pNum}`}
                  type="button"
                  disabled={isLoading}
                  onClick={() => onPageChange(Number(pNum))}
                  className={`min-w-[34px] h-[34px] px-2.5 rounded-lg text-xs md:text-sm font-black transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-brand text-white shadow-sm ring-1 ring-brand'
                      : 'border border-[#d3dee6] text-gray-700 hover:bg-white hover:text-brand hover:border-brand'
                  }`}
                >
                  {pNum}
                </button>
              );
            })}
          </div>

          {/* Next Page */}
          <button 
            type="button"
            title="Next Page"
            className="p-2 rounded-lg border border-[#d3dee6] text-gray-600 hover:bg-white hover:text-brand hover:border-brand transition-all text-sm font-bold disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-600 disabled:hover:border-[#d3dee6] disabled:cursor-not-allowed cursor-pointer"
            disabled={currentPage >= totalPages || isLoading}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <ChevronRight size={16} />
          </button>

          {/* Last Page */}
          <button 
            type="button"
            title="Last Page"
            className="p-2 rounded-lg border border-[#d3dee6] text-gray-600 hover:bg-white hover:text-brand hover:border-brand transition-all text-sm font-bold disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-600 disabled:hover:border-[#d3dee6] disabled:cursor-not-allowed cursor-pointer"
            disabled={currentPage >= totalPages || isLoading}
            onClick={() => onPageChange(totalPages)}
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
