
import React from 'react';
import { ChevronRight, Users, Star, MapPin, Building2, FileDown } from 'lucide-react';

export interface ProgramSummary {
  id: string;
  programName: string;
  bahagian: string;
  tempat: string;
  penganjur: string;
  variantCount: number;
  totalRespondents: number;
  averageScore: number;
  lastUpdated: string;
}

interface SubmissionTableProps {
  data: ProgramSummary[];
  onSelect: (programName: string) => void;
  onExportPDF: (programName: string) => void;
}

export const SubmissionTable: React.FC<SubmissionTableProps> = ({ data, onSelect, onExportPDF }) => {
  if (data.length === 0) {
    return (
      <div className="p-12 text-center text-gray-400">
        <p className="text-sm font-medium">Tiada rekod program dijumpai.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Program & Penganjur</th>
            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Responden</th>
            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Skor</th>
            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Tindakan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((program) => (
            <tr 
              key={program.id} 
              className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
              onClick={() => onSelect(program.programName)}
            >
              <td className="px-6 py-5">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-dark text-sm uppercase line-clamp-1 group-hover:text-lime-600 transition-colors">
                    {program.programName}
                  </span>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Building2 size={10} /> {program.penganjur}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={10} /> {program.bahagian}
                    </span>
                    {program.variantCount > 1 && (
                      <span className="inline-flex items-center rounded-full bg-lime-50 px-2 py-0.5 text-[9px] text-lime-700 border border-lime-100">
                        {program.variantCount} VARIASI
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-5 text-center">
                <div className="inline-flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full text-gray-600 font-black text-[10px]">
                  <Users size={10} />
                  {program.totalRespondents}
                </div>
              </td>
              <td className="px-6 py-5 text-center">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 text-dark font-black text-sm">
                    <Star size={12} className="text-lime-500" fill="currentColor" />
                    {program.averageScore.toFixed(2)}
                  </div>
                  <div className="text-[8px] text-gray-400 font-bold uppercase">Purata</div>
                </div>
              </td>
              <td className="px-6 py-5 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onExportPDF(program.programName);
                    }}
                    className="p-2 text-gray-400 hover:text-lime-600 hover:bg-lime-50 rounded-lg transition-all"
                    title="Export PDF"
                  >
                    <FileDown size={18} />
                  </button>
                  <button className="p-2 text-gray-300 group-hover:text-dark transition-all group-hover:translate-x-1">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
