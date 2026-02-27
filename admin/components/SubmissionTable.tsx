
import React, { useState, useEffect } from 'react';
import { Users, MapPin, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, Search } from 'lucide-react';

export interface ProgramSummary {
  id: string;
  programName: string;
  tempat: string;
  bahagian: string;
  penganjur: string;
  totalRespondents: number;
  averageScore: number;
}

interface SubmissionTableProps {
  data: ProgramSummary[];
  onSelect: (programName: string) => void;
}

// Helper color function for scores
const getScoreColor = (score: number) => {
  if (score >= 4.5) return 'bg-lime-500'; // Excellent
  if (score >= 4.0) return 'bg-lime-300'; // Good
  if (score >= 3.0) return 'bg-yellow-400'; // Average
  return 'bg-red-400'; // Poor
};

const getScoreTextColor = (score: number) => {
  if (score >= 4.5) return 'text-lime-700';
  if (score >= 4.0) return 'text-lime-600';
  if (score >= 3.0) return 'text-yellow-600';
  return 'text-red-600';
};

export const SubmissionTable: React.FC<SubmissionTableProps> = ({ data, onSelect }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(data.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleRowsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
    }
    return pages;
  };

  return (
    <div className="bg-white flex flex-col h-full">
      {/* Table Header with Summary Stats (Principle: Context) */}
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/30">
        <div>
          <h3 className="text-lg font-black text-[#1A1C1E] tracking-tight uppercase">Senarai Program</h3>
          <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mt-1">
             {data.length} Rekod Dijumpai
          </p>
        </div>
        
        <div className="flex items-center gap-3">
             <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-4">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-lime-500"></div>Cemerlang</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div>Sederhana</span>
             </div>

            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                <span>Papar:</span>
                <select 
                    value={itemsPerPage} 
                    onChange={handleRowsChange} 
                    className="bg-transparent text-dark outline-none cursor-pointer font-extrabold"
                >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={40}>40</option>
                </select>
            </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto min-h-[400px]">
        {data.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
             <div className="bg-gray-50 p-6 rounded-full mb-4">
                 <Search size={32} className="opacity-20" />
             </div>
             <p className="font-bold text-sm">Tiada rekod program dijumpai.</p>
             <p className="text-xs mt-1">Cuba ubah tetapan penapis anda.</p>
           </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-white sticky top-0 z-10">
                <th className="py-4 px-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] w-[45%]">Program / Penganjur</th>
                <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">Lokasi</th>
                <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] text-center">Responden</th>
                <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] text-left">Prestasi Skor</th>
                <th className="py-4 px-6 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentItems.map((row) => (
                <tr 
                  key={row.id} 
                  onClick={() => onSelect(row.programName)}
                  className="hover:bg-lime-50/20 transition-all group cursor-pointer"
                >
                  <td className="py-5 px-8">
                    <div className="font-extrabold text-[#1A1C1E] text-sm line-clamp-2 uppercase group-hover:text-lime-800 transition-colors mb-1.5">
                        {row.programName}
                    </div>
                    <div className="inline-block bg-gray-100 px-2 py-0.5 rounded text-[10px] text-gray-500 font-bold uppercase tracking-wide">
                        {row.penganjur}
                    </div>
                  </td>
                  <td className="py-5 px-6 align-middle">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700 uppercase">
                        <MapPin size={12} className="text-lime-600" />
                        {row.tempat}
                      </div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase pl-4">{row.bahagian}</div>
                    </div>
                  </td>
                  <td className="py-5 px-6 text-center align-middle">
                    <div className="inline-flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                      <Users size={14} className="text-gray-400" />
                      <span className="font-black text-dark text-xs">{row.totalRespondents}</span>
                    </div>
                  </td>
                  <td className="py-5 px-6 align-middle">
                    <div className="flex flex-col w-32">
                      <div className="flex justify-between items-end mb-1.5">
                          <span className={`font-black text-sm ${getScoreTextColor(row.averageScore)}`}>
                            {row.averageScore.toFixed(2)}
                          </span>
                          <span className="text-gray-300 text-[9px] font-bold">/ 5.0</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                              className={`h-full rounded-full ${getScoreColor(row.averageScore)}`} 
                              style={{ width: `${(row.averageScore / 5) * 100}%` }}
                          ></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-6 text-right align-middle">
                      <div className="w-8 h-8 rounded-full bg-transparent group-hover:bg-lime-400 flex items-center justify-center transition-all">
                        <ChevronRight size={18} className="text-gray-300 group-hover:text-black" />
                      </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer - Improved spacing and touch targets */}
      {data.length > 0 && (
        <div className="border-t border-gray-100 p-4 sm:px-8 sm:py-5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white mt-auto">
            
            <div className="text-xs text-gray-500 font-medium order-2 sm:order-1">
                <span className="font-bold text-dark">{indexOfFirstItem + 1}</span> - <span className="font-bold text-dark">{Math.min(indexOfLastItem, data.length)}</span> daripada <span className="font-bold text-dark">{data.length}</span>
            </div>

            <div className="flex items-center gap-1 order-1 sm:order-2">
                <button 
                    onClick={() => handlePageChange(1)} 
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                    <ChevronsLeft size={16} className="text-dark" />
                </button>
                
                <button 
                    onClick={() => handlePageChange(currentPage - 1)} 
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                    <ChevronLeft size={16} className="text-dark" />
                </button>

                <div className="flex items-center gap-1 mx-2">
                    {getPageNumbers().map(number => (
                        <button
                            key={number}
                            onClick={() => handlePageChange(number)}
                            className={`
                                w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all
                                ${currentPage === number 
                                    ? 'bg-lime-400 text-dark shadow-sm' 
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-dark'
                                }
                            `}
                        >
                            {number}
                        </button>
                    ))}
                </div>

                <button 
                    onClick={() => handlePageChange(currentPage + 1)} 
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                    <ChevronRight size={16} className="text-dark" />
                </button>

                 <button 
                    onClick={() => handlePageChange(totalPages)} 
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                    <ChevronsRight size={16} className="text-dark" />
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
