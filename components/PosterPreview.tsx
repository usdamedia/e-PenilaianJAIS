import React from 'react';
import { Square, Smartphone, PenLine, Share2, Loader2, Image as ImageIcon, MapPin, Clock, Building2, LayoutDashboard } from 'lucide-react';
import { EvaluationFormData } from '../types';

interface PosterPreviewProps {
  formData: EvaluationFormData;
  posterRef: React.RefObject<HTMLDivElement | null>;
  posterRatio: 'square' | 'story';
  setPosterRatio: (ratio: 'square' | 'story') => void;
  onEditProgramName: (name: string) => void;
  onShare: () => void;
  onSave: () => void;
  isSharing: boolean;
  isSaving: boolean;
}

export const PosterPreview: React.FC<PosterPreviewProps> = ({
  formData,
  posterRef,
  posterRatio,
  setPosterRatio,
  onEditProgramName,
  onShare,
  onSave,
  isSharing,
  isSaving,
}) => {
  return (
    <div className="w-full mb-6">
      <div className="flex justify-between items-end mb-3">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
          ✨ Kongsi Pencapaian Anda
        </p>
        {/* Ratio Toggles */}
        <div className="bg-gray-200 p-1 rounded-lg flex gap-1">
          <button 
            onClick={() => setPosterRatio('square')}
            className={`p-1.5 rounded-md transition-all ${posterRatio === 'square' ? 'bg-white shadow-sm text-dark' : 'text-gray-400 hover:text-dark'}`}
            title="Square 1:1"
          >
            <Square size={16} />
          </button>
          <button 
            onClick={() => setPosterRatio('story')}
            className={`p-1.5 rounded-md transition-all ${posterRatio === 'story' ? 'bg-white shadow-sm text-dark' : 'text-gray-400 hover:text-dark'}`}
            title="Story 9:16"
          >
            <Smartphone size={16} />
          </button>
        </div>
      </div>
      
      {/* EDITABLE NAME SECTION */}
      <div className="bg-white rounded-xl p-3 mb-4 shadow-sm border border-gray-100 flex flex-col gap-2">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
          <PenLine size={12}/> Edit Nama Program (Poster)
        </label>
        <input 
          type="text" 
          value={formData.namaProgram}
          onChange={(e) => onEditProgramName(e.target.value.toUpperCase())}
          className="w-full font-bold text-dark text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-lime-400 focus:outline-none uppercase"
          placeholder="NAMA PROGRAM"
        />
      </div>

      {/* The Actual Poster to be Captured */}
      <div 
        ref={posterRef}
        className={`
          w-full bg-[#0F0F0F] rounded-[2rem] p-8 flex flex-col justify-between relative overflow-hidden shadow-2xl border-[3px] border-lime-400
          ${posterRatio === 'square' ? 'aspect-square' : 'aspect-[9/16]'}
          transition-all duration-300
        `}
      >
        {/* Background Accents (Reference Style) */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-lime-400 rounded-full blur-[60px] opacity-20"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-lime-400 rounded-full blur-[60px] opacity-10"></div>
        
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div>
            {/* Badge */}
            <div className="inline-block bg-lime-400 text-[#0F0F0F] text-[11px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest mb-6">
              Tamat Program
            </div>
            
            {/* Organizer */}
            <div className="flex items-center gap-2 text-lime-400 mb-2 opacity-90">
              <Building2 size={16} className="shrink-0"/>
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider line-clamp-1">
                {formData.penganjurUtama || "PENGANJUR"}
              </span>
            </div>

            {/* Title */}
            <h2 
              className={`text-white font-black uppercase leading-[0.9] tracking-tighter mb-4 break-words ${posterRatio === 'story' ? 'text-5xl' : 'text-4xl'}`}
              style={{ overflowWrap: 'break-word', wordWrap: 'break-word' }}
            >
              {formData.namaProgram || "NAMA PROGRAM"}
            </h2>
            
            {/* Location & Date Group */}
            <div className="space-y-3 mt-4 border-l-2 border-white/20 pl-4">
              {/* Location */}
              <div className="flex items-center gap-3 text-gray-300">
                <MapPin size={18} className="text-white shrink-0"/>
                <span className="text-sm font-bold uppercase tracking-wide leading-tight line-clamp-2">
                  {formData.tempatProgram || "LOKASI PROGRAM"}
                </span>
              </div>
              
              {/* Date */}
              <div className="flex items-center gap-3 text-gray-300">
                <Clock size={18} className="text-white shrink-0"/>
                <span className="text-sm font-bold uppercase tracking-wide">
                  {new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-6 border-t border-white/10 mt-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                <LayoutDashboard size={20} className="text-[#0F0F0F]"/>
              </div>
              <div>
                <div className="text-white font-bold text-base leading-none mb-1">e-Penilaian JAIS</div>
                <div className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">Jabatan Agama Islam Sarawak</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="space-y-3 mt-4">
        {/* WhatsApp Share */}
        <button 
          onClick={onShare}
          disabled={isSharing}
          className="w-full bg-[#25D366] text-white py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 hover:bg-[#20bd5a] active:scale-95 transition-all"
        >
          {isSharing ? <Loader2 className="animate-spin" /> : <Share2 size={24} />}
          Share to WhatsApp Status
        </button>

        {/* Save to Album */}
        <button 
          onClick={onSave}
          disabled={isSaving}
          className="w-full bg-[#1A1C1E] text-white py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 hover:bg-black active:scale-95 transition-all border border-gray-800"
        >
          {isSaving ? <Loader2 className="animate-spin text-lime-400" /> : <ImageIcon size={24} className="text-lime-400" />}
          Simpan Poster (Album)
        </button>
      </div>
      
      <p className="text-center text-xs text-gray-400 mt-3">Simpan kenangan ini!</p>
    </div>
  );
};
