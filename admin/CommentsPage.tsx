
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Search, Filter, Calendar, MapPin, Building2, 
  ArrowRight, Quote, Heart, Star, Sparkles, MessageCircle, 
  User, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import { DashboardData } from '../dashboard/types';

interface CommentsPageProps {
  data: DashboardData[];
  onProgramSelect: (programName: string) => void;
}

const TEMPLATE_WORDS = [
  'terbaik', 'teruskan', 'mantap', 'baik', 'ok', 'good', 'nice', 'padu', 
  'alhamdulillah', 'tq', 'terbaikk', 'terbaikkk', 'terbaikkkk', 'tahniah',
  'syabas', 'steady', 'terbaik!', 'terbaik 👍', 'memuaskan', 'sangat baik',
  'bagus', 'okay', 'nice one', 'teruskan usaha', 'kekalkan', 'terbaik jais',
  'good job', 'well done', 'excellent', 'tambah lagi program', 'terbaikkkkk'
];

export const CommentsPage: React.FC<CommentsPageProps> = ({ data, onProgramSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'honest'>('honest');

  const filteredComments = useMemo(() => {
    // 1. Combine komen and cadangan into a flat list of comment objects
    const allComments: any[] = [];
    
    data.forEach(item => {
      // Check 'komen'
      if (item.komen && item.komen.trim().length > 2 && item.komen !== 'KOMEN PROGRAM') {
        allComments.push({
          text: item.komen.trim(),
          source: 'KOMEN',
          programName: item.programName || 'PROGRAM TIDAK DINYATAKAN',
          location: item.tempat || '-',
          bahagian: item.bahagian || '-',
          date: item.programDate ? new Date(item.programDate).toLocaleDateString('ms-MY') : '-',
          original: item
        });
      }
      
      // Check 'cadangan'
      if (item.cadangan && item.cadangan.trim().length > 2 && item.cadangan !== 'CADANGAN PROGRAM') {
        allComments.push({
          text: item.cadangan.trim(),
          source: 'CADANGAN',
          programName: item.programName || 'PROGRAM TIDAK DINYATAKAN',
          location: item.tempat || '-',
          bahagian: item.bahagian || '-',
          date: item.programDate ? new Date(item.programDate).toLocaleDateString('ms-MY') : '-',
          original: item
        });
      }
    });

    // 2. Filter out templates and search term
    return allComments.filter(comment => {
      const textLower = comment.text.toLowerCase();
      
      // Honest filter: Exclude template words and require length > 10
      if (activeFilter === 'honest') {
        const isTemplate = TEMPLATE_WORDS.some(word => textLower === word || textLower === word + '!' || textLower === word + '.');
        const isShort = comment.text.length < 10;
        if (isTemplate || isShort) return false;
      }

      // Search term filter
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        return (
          comment.text.toLowerCase().includes(lowerSearch) ||
          comment.programName.toLowerCase().includes(lowerSearch) ||
          comment.location.toLowerCase().includes(lowerSearch) ||
          comment.bahagian.toLowerCase().includes(lowerSearch)
        );
      }

      return true;
    }).sort((a, b) => b.text.length - a.text.length); // Sort by length DESC (longest first)
  }, [data, activeFilter, searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-lime-400 rounded-lg text-dark">
              <MessageSquare size={20} />
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Hab Maklum Balas</span>
          </div>
          <h2 className="text-3xl font-black text-dark tracking-tight">Komen & Cadangan Jujur</h2>
          <p className="text-gray-500 text-sm mt-1 max-w-xl">
            Mempaparkan maklum balas peserta yang lebih mendalam untuk analisis kualitatif.
          </p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200">
           <button 
             onClick={() => setActiveFilter('honest')}
             className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeFilter === 'honest' ? 'bg-white text-dark shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
           >
             REAL & HONEST
           </button>
           <button 
             onClick={() => setActiveFilter('all')}
             className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeFilter === 'all' ? 'bg-white text-dark shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
           >
             SEMUA MAKLUM BALAS
           </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-transform group-focus-within:scale-110">
          <Search size={20} className="text-gray-400 group-focus-within:text-lime-600" />
        </div>
        <input 
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari dalam komen, program, atau lokasi..."
          className="w-full pl-14 pr-6 py-5 bg-white border border-gray-200 rounded-[2rem] text-sm font-semibold text-dark placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-lime-400/10 focus:border-lime-400 transition-all shadow-sm"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-4 flex items-center px-4"
          >
            <X size={18} className="text-gray-400 hover:text-dark" />
          </button>
        )}
      </div>

      {/* Stats and Info */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {[1,2,3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500">
                <User size={12} />
              </div>
            ))}
          </div>
          <span className="text-xs font-bold text-gray-500">
            Ditemui <span className="text-dark font-black">{filteredComments.length}</span> maklum balas yang menepati kriteria.
          </span>
        </div>
        
        {activeFilter === 'honest' && (
          <div className="flex items-center gap-2 bg-lime-50 text-lime-700 px-4 py-1.5 rounded-full border border-lime-100 text-[10px] font-black uppercase tracking-wider shadow-sm">
            <Sparkles size={12} fill="currentColor" />
            Penapisan Pintar Aktif
          </div>
        )}
      </div>

      {/* Comments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredComments.map((comment, idx) => (
            <motion.div
              layout
              key={`${comment.programName}-${idx}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4, delay: Math.min(idx * 0.05, 1) }}
              onClick={() => onProgramSelect(comment.original.programName)}
              className="group bg-white p-7 rounded-[2rem] border border-gray-100 hover:border-lime-300 hover:shadow-2xl hover:shadow-lime-900/10 transition-all cursor-pointer relative flex flex-col items-start overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-lime-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
              
              <div className="flex items-center justify-between w-full mb-6 relative z-10">
                <div className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase ${comment.source === 'KOMEN' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                  {comment.source}
                </div>
                <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1.5 uppercase tracking-tighter">
                  <Calendar size={12} />
                  {comment.date}
                </div>
              </div>

              <div className="relative mb-6 flex-1 z-10">
                <Quote size={24} className="text-lime-200 absolute -top-2 -left-3 -z-10" />
                <p className="text-[15px] font-bold text-dark leading-relaxed tracking-tight line-clamp-6 italic">
                  "{comment.text}"
                </p>
              </div>

              <div className="w-full pt-6 border-t border-gray-50 mt-auto relative z-10">
                <h4 className="text-[11px] font-black text-dark uppercase mb-2 line-clamp-1 group-hover:text-lime-600 transition-colors">
                  {comment.programName}
                </h4>
                
                <div className="flex flex-wrap gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-gray-300" />
                    {comment.location}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building2 size={12} className="text-gray-300" />
                    {comment.bahagian}
                  </div>
                </div>
              </div>

              <div className="absolute bottom-6 right-6 p-2 rounded-full bg-gray-50 text-gray-300 group-hover:bg-dark group-hover:text-lime-400 transition-all opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0">
                <ArrowRight size={16} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredComments.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center text-center bg-white rounded-[3rem] border border-dashed border-gray-200">
           <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6 underline-offset-8">
              <MessageCircle size={32} />
           </div>
           <h3 className="text-xl font-black text-dark">Tiada maklum balas ditemui</h3>
           <p className="text-gray-500 text-sm mt-2">Cuba tukar kriteria carian atau penapisan anda.</p>
           <button 
             onClick={() => {setSearchTerm(''); setActiveFilter('all');}}
             className="mt-6 text-lime-600 font-black text-xs uppercase tracking-widest hover:underline"
           >
             Set Semula Semua
           </button>
        </div>
      )}
    </div>
  );
};

export default CommentsPage;
