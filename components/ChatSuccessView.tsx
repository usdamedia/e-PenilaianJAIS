import React from 'react';
import { CheckCircle2, Sparkles, Square, Smartphone, Building2, MapPin, Clock, LayoutDashboard, Share2, Loader2, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { EvaluationFormData } from '../types';

interface ChatSuccessViewProps {
  formData: Partial<EvaluationFormData>;
  posterRef: React.RefObject<HTMLDivElement | null>;
  posterRatio: 'square' | 'story';
  setPosterRatio: (ratio: 'square' | 'story') => void;
  handleSharePoster: () => void;
  handleSaveToAlbum: () => void;
  isSharing: boolean;
  isSaving: boolean;
  onBack: () => void;
}

export const ChatSuccessView: React.FC<ChatSuccessViewProps> = ({
  formData,
  posterRef,
  posterRatio,
  setPosterRatio,
  handleSharePoster,
  handleSaveToAlbum,
  isSharing,
  isSaving,
  onBack,
}) => {
  return (
    <div className="absolute inset-0 bg-white z-20 flex flex-col overflow-y-auto animate-in fade-in slide-in-from-bottom-10 duration-700">
      {/* Success Header */}
      <div className="bg-lime-400 p-8 pb-12 rounded-b-[3rem] shadow-glow relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-lime-600 mb-4 shadow-lg">
            <CheckCircle2 size={32} strokeWidth={4} />
          </div>
          <h2 className="text-3xl font-black text-dark tracking-tight mb-2">Terima Kasih!</h2>
          <p className="text-dark/80 font-bold text-sm max-w-xs leading-relaxed">
            Kerana memberikan penilaian kepada Program Jabatan Agama Islam Sarawak.
          </p>
        </div>
      </div>

      {/* Social Poster Section */}
      <div className="flex-1 p-6 flex flex-col items-center -mt-8">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl p-4 shadow-xl border border-gray-100">
            <div className="flex justify-between items-center mb-4 px-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-lime-100 rounded-lg text-lime-700">
                  <Sparkles size={14} fill="currentColor"/>
                </div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kongsikan Di Media Sosial</span>
              </div>
              {/* Ratio Toggles */}
              <div className="bg-gray-100 p-0.5 rounded-lg flex gap-1">
                <button onClick={() => setPosterRatio('square')} className={`p-1 rounded-md ${posterRatio === 'square' ? 'bg-white shadow-sm text-dark' : 'text-gray-400'}`}><Square size={12} /></button>
                <button onClick={() => setPosterRatio('story')} className={`p-1 rounded-md ${posterRatio === 'story' ? 'bg-white shadow-sm text-dark' : 'text-gray-400'}`}><Smartphone size={12} /></button>
              </div>
            </div>

            {/* Poster Preview */}
            <div className="flex justify-center mb-4">
              <div 
                ref={posterRef}
                className={`
                  w-full bg-[#0F0F0F] rounded-[1.5rem] p-6 flex flex-col justify-between relative overflow-hidden shadow-2xl border-[3px] border-lime-400
                  ${posterRatio === 'square' ? 'aspect-square max-w-[260px]' : 'aspect-[9/16] max-w-[180px]'}
                  transition-all duration-300
                `}
              >
                {/* Background Accents */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-lime-400/20 rounded-full blur-2xl -mr-6 -mt-6"></div>
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-lime-400/10 rounded-full blur-2xl -ml-6 -mb-6"></div>
                
                <div className="relative z-10">
                  <div className="bg-lime-400 text-black text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider inline-block mb-2">
                    Tamat Program
                  </div>
                  <div className="flex items-center gap-1.5 text-lime-400 mb-1 opacity-90">
                    <Building2 size={10} className="shrink-0"/>
                    <span className="text-[9px] font-bold uppercase tracking-wider line-clamp-1">
                    {formData.penganjurUtama || "PENGANJUR"}
                    </span>
                  </div>
                  <h2 className={`text-white font-black uppercase leading-none tracking-tighter mb-2 break-words ${posterRatio === 'story' ? 'text-xl' : 'text-lg'}`}>
                  {formData.namaProgram || "PROGRAM"}
                  </h2>
                  <div className="space-y-1.5 mt-2 border-l-2 border-white/20 pl-2">
                    <div className="flex items-center gap-1.5 text-gray-300">
                      <MapPin size={10} className="text-white shrink-0"/>
                      <span className="text-[9px] font-bold uppercase tracking-wide leading-tight line-clamp-2">
                        {formData.tempatProgram || "LOKASI"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-300">
                      <Clock size={10} className="text-white shrink-0"/>
                      <span className="text-[9px] font-bold uppercase tracking-wide">
                        {new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="relative z-10 pt-3 border-t border-white/10 mt-auto">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                      <LayoutDashboard size={12} className="text-[#0F0F0F]"/>
                    </div>
                    <div>
                      <div className="text-white font-bold text-[10px] leading-none mb-0.5">e-Penilaian JAIS</div>
                      <div className="text-gray-500 text-[6px] uppercase tracking-widest font-bold">Sarawak</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button 
                onClick={handleSharePoster}
                disabled={isSharing}
                className="w-full bg-[#25D366] text-white py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 hover:bg-[#20bd5a] active:scale-95 transition-all"
              >
                {isSharing ? <Loader2 className="animate-spin" size={16} /> : <Share2 size={16} />}
                Share WhatsApp Status
              </button>
              <button 
                onClick={handleSaveToAlbum}
                disabled={isSaving}
                className="w-full bg-dark text-white py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 hover:bg-black active:scale-95 transition-all"
              >
                {isSaving ? <Loader2 className="animate-spin text-lime-400" size={16} /> : <ImageIcon size={16} className="text-lime-400" />}
                Simpan ke Album
              </button>
            </div>
          </div>

          <button 
            onClick={onBack} 
            className="w-full mt-6 text-gray-400 hover:text-dark font-bold text-xs py-2 flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw size={14}/> Kembali ke Menu Utama
          </button>
        </div>
      </div>
    </div>
  );
};
