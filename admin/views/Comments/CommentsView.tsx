
import React from 'react';
import { FileText, Calendar, Building, Star } from 'lucide-react';
import { DashboardData } from '../../../dashboard/types';

interface CommentsViewProps {
  filteredData: DashboardData[];
  typo: any;
}

export const CommentsView: React.FC<CommentsViewProps> = ({ filteredData, typo }) => {
  const feedbackData = filteredData.filter(d => d.komen || d.cadangan);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className={typo.h3}>Koleksi Komen & Cadangan</h3>
              <p className={`${typo.small} text-gray-500 mt-1`}>Senarai lengkap maklum balas peserta program</p>
            </div>
            <div className="bg-lime-50 px-4 py-2 rounded-xl border border-lime-100">
               <span className="text-lime-700 font-bold text-sm">{feedbackData.length} Maklum Balas</span>
            </div>
          </div>

          <div className="space-y-4">
            {feedbackData.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <FileText size={32} />
                </div>
                <p className="text-gray-400 font-bold">Tiada komen atau cadangan ditemui.</p>
              </div>
            ) : (
              feedbackData.map((item, idx) => (
                <div key={idx} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-lime-400 transition-all group">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h4 className="font-black text-dark text-sm uppercase tracking-tight group-hover:text-lime-700 transition-colors">{item.programName}</h4>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          <Calendar size={12} /> {new Date(item.programDate).toLocaleDateString('ms-MY')}
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          <Building size={12} /> {item.penganjur}
                        </span>
                        <div className="flex items-center gap-0.5 ml-2">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={10} className={i < item.skorKeseluruhan ? "text-lime-500 fill-lime-500" : "text-gray-200"} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {item.komen && (
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-[10px] font-black text-lime-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-lime-500"></div> Komen Program
                        </p>
                        <p className="text-sm text-gray-600 leading-relaxed italic">"{item.komen}"</p>
                      </div>
                    )}
                    {item.cadangan && (
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Cadangan Penambahbaikan
                        </p>
                        <p className="text-sm text-gray-600 leading-relaxed italic">"{item.cadangan}"</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
       </div>
    </div>
  );
};
