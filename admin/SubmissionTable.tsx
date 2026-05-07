
import React, { useState } from 'react';
import { ChevronRight, Users, Star, MapPin, Building2, FileDown } from 'lucide-react';

export interface ProgramVariantChoice {
  id: string;
  label: string;
  initialFilters: {
    year?: string;
    month?: string;
    quarter?: string;
    date?: string;
    bahagian?: string;
    location?: string;
    penganjur?: string;
  };
  totalRespondents?: number;
  averageScore?: number;
  bahagian?: string;
  tempat?: string;
  penganjur?: string;
}

export interface ProgramSummary {
  id: string;
  programName: string;
  bahagian: string;
  tempat: string;
  penganjur: string;
  variantCount: number;
  variantPreview: string[];
  variants: ProgramVariantChoice[];
  totalRespondents: number;
  averageScore: number;
  lastUpdated: string;
}

interface SubmissionTableProps {
  data: ProgramSummary[];
  onSelect: (programName: string, initialFilters?: Record<string, string | undefined>) => void;
  onSelectVariant?: (programName: string, variant: ProgramVariantChoice) => void;
  onExportPDF: (programName: string) => void;
}

export const SubmissionTable: React.FC<SubmissionTableProps> = ({ data, onSelect, onSelectVariant, onExportPDF }) => {
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const safeData = data || [];

  const handleVariantChange = (program: ProgramSummary, variantId: string) => {
    setSelectedVariants(prev => ({ ...prev, [program.id]: variantId }));
    if (variantId === 'SEMUA') return;

    const selected = (program.variants || []).find(v => v.id === variantId);
    if (selected && onSelectVariant) {
      onSelectVariant(program.programName, selected);
    }
  };

  if (safeData.length === 0) {
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
          {safeData.map((program) => {
            const variants = program.variants || [];
            const variantPreview = program.variantPreview || [];
            const selectedVariantId = selectedVariants[program.id] || 'SEMUA';
            const activeVariant = selectedVariantId === 'SEMUA' ? null : variants.find(v => v.id === selectedVariantId);

            const displayRespondents = activeVariant?.totalRespondents ?? program.totalRespondents;
            const displayScore = activeVariant?.averageScore ?? program.averageScore;
            const displayBahagian = activeVariant?.bahagian ?? program.bahagian;
            const displayPenganjur = activeVariant?.penganjur ?? program.penganjur;

            return (
            <tr 
              key={program.id} 
              className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
              onClick={() => onSelect(program.programName, activeVariant?.initialFilters)}
            >
              <td className="px-6 py-5">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-dark text-sm uppercase line-clamp-1 group-hover:text-lime-600 transition-colors">
                    {program.programName}
                  </span>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Building2 size={10} /> {displayPenganjur}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={10} /> {displayBahagian}
                    </span>
                    {program.variantCount > 1 && (
                      <span className="inline-flex items-center rounded-full bg-lime-50 px-2 py-0.5 text-[9px] text-lime-700 border border-lime-100">
                        {program.variantCount} VARIASI
                      </span>
                    )}
                  </div>
                  {program.variantCount > 1 && variantPreview.length > 0 && !activeVariant && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {variantPreview.map((variantLabel) => (
                        <span
                          key={variantLabel}
                          className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-gray-500"
                          title={variantLabel}
                        >
                          {variantLabel}
                        </span>
                      ))}
                    </div>
                  )}
                  {program.variantCount > 1 && variants.length > 0 && (
                    <div className="mt-3 max-w-[680px]" onClick={(e) => e.stopPropagation()}>
                      <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-gray-400">
                        Pilih Variasi
                      </label>
                      <select
                        value={selectedVariants[program.id] || 'SEMUA'}
                        onChange={(e) => handleVariantChange(program, e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 outline-none transition-all hover:border-lime-300 focus:border-lime-400"
                      >
                        <option value="SEMUA">Semua Variasi ({program.variantCount})</option>
                        {variants.map((variant, idx) => (
                          <option key={variant.id} value={variant.id}>
                            {`${idx + 1}. ${variant.label}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-5 text-center">
                <div className="inline-flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full text-gray-600 font-black text-[10px]">
                  <Users size={10} />
                  {displayRespondents}
                </div>
              </td>
              <td className="px-6 py-5 text-center">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 text-dark font-black text-sm">
                    <Star size={12} className="text-lime-500" fill="currentColor" />
                    {displayScore.toFixed(2)}
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
