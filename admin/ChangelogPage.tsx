import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, History, Search, Filter, Calendar, Tag, CheckCircle2, 
  Zap, Share2, Copy, Check, ChevronRight, ShieldCheck, Cpu, MessageSquare,
  FileText, Smartphone, ArrowUpRight, Clock
} from 'lucide-react';

interface ChangelogPageProps {
  onBack?: () => void;
}

interface ChangelogEntry {
  id: string;
  version: string;
  date: string;
  title: string;
  badgeText: string;
  isLatest?: boolean;
  category: 'Ciri Baharu' | 'Penambahbaikan' | 'Prestasi' | 'Sistem';
  summary: string;
  changes: {
    title: string;
    description: string;
    tag: 'WhatsApp' | 'Carian' | 'Prestasi' | 'UI/UX' | 'PDF' | 'ChatBot' | 'Teras';
    icon: string;
  }[];
}

const CHANGELOG_DATA: ChangelogEntry[] = [
  {
    id: 'v2.4.0',
    version: 'v2.4.0',
    date: '13 Ogos 2026',
    title: 'Kemaskini Aksi Pantas WhatsApp, Carian Pintar & Optimasi Kelajuan Webapp',
    badgeText: 'Terkini',
    isLatest: true,
    category: 'Ciri Baharu',
    summary: 'Peningkatan kecekapan urus setia melalui integrasi perkongsian WhatsApp pantas, pembaharuan enjin carian huruf separa/penuh, dan pengoptimuman kelajuan webapp secara menyeluruh.',
    changes: [
      {
        title: 'Butang Copy Paste Maklumat Program untuk Whatsapp (Program Detail)',
        description: 'Penambahan butang Aksi Pantas di bahagian Program Detail untuk salin teks rasmi dan terus buka pautan WhatsApp. Maklumat merangkumi Nama Program, Tarikh, Tempat, dan Bilangan Responden secara automatik.',
        tag: 'WhatsApp',
        icon: 'share'
      },
      {
        title: 'Peningkatan Enjin Carian Pintar (Partial & Token Match)',
        description: 'Fungsi carian kini menyokong taip huruf separa atau penuh. Sebagai contoh, menaip "Ku" akan secara automatik menampilkan "Kursus", "Kumpulan", "Kuliah" dan sebarang program yang berkaitan. Menyokong juga carian pelbagai kata kunci serentak.',
        tag: 'Carian',
        icon: 'search'
      },
      {
        title: 'Penambahbaikan Kelajuan & Prestasi Webapp',
        description: 'Pengoptimuman kod melalui memoization data, pembersihan re-render komponen, dan pengurangan saiz payload. Paparan dashboard, jadual program, dan senarai komen kini dibuka dengan lebih pantas dan responsif.',
        tag: 'Prestasi',
        icon: 'zap'
      }
    ]
  },
  {
    id: 'v2.3.0',
    version: 'v2.3.0',
    date: '12 Ogos 2026',
    title: 'Redesign Program Detail, Sticky Toolbar & Sistem Highlight Komen PDF',
    badgeText: 'Kemaskini UI',
    category: 'Penambahbaikan',
    summary: 'Reka bentuk semula papan pemuka Program Detail dengan toolbar melekat (sticky), kawalan skala paparan, header dipadatkan, dan kawalan eksport PDF/JPEG yang diperkasakan.',
    changes: [
      {
        title: 'Reka Bentuk Header & Toolbar Program Detail',
        description: 'Header program dipadatkan sebanyak 35% dengan tema gelap korporat. Navigasi sticky toolbar di bahagian atas memudahkan penukaran skala paparan (50%-150%), refresh data, dan eksport pantas.',
        tag: 'UI/UX',
        icon: 'layout'
      },
      {
        title: 'Pengurusan Highlight Komen & Cadangan PDF',
        description: 'Fungsi bintang (star) untuk memilih komen dan cadangan peserta yang ingin dimuatkan secara khusus dalam Laporan Eksekutif PDF, lengkap dengan penyimpanan sementara (localStorage).',
        tag: 'PDF',
        icon: 'pdf'
      }
    ]
  },
  {
    id: 'v2.2.0',
    version: 'v2.2.0',
    date: '10 Ogos 2026',
    title: 'Mod Chat Bot Interaktif & Poster Flex Media Sosial',
    badgeText: 'Ciri Baharu',
    category: 'Ciri Baharu',
    summary: 'Pengenalan mod penilaian berpandu chat bot interaktif serta penjanaan poster pencapaian flex untuk dikongsi ke platform media sosial.',
    changes: [
      {
        title: 'Borang Penilaian Mod Chat Bot',
        description: 'Pengguna boleh menjawab soalan penilaian secara langkah demi langkah seperti berbual dengan pembantu AI. Sangat mesra pengguna telefon bimbit.',
        tag: 'ChatBot',
        icon: 'bot'
      },
      {
        title: 'Poster Flex Taman Program (1:1 & 9:16)',
        description: 'Skrin kejayaan penilaian membolehkan peserta menjana poster pengesahan tamat program berkualiti tinggi untuk dikongsi ke Story atau Feed.',
        tag: 'UI/UX',
        icon: 'image'
      }
    ]
  },
  {
    id: 'v2.1.0',
    version: 'v2.1.0',
    date: '5 Ogos 2026',
    title: 'Penjana Laporan Eksekutif PDF Auto & Analisis BSC',
    badgeText: 'Laporan',
    category: 'Penambahbaikan',
    summary: 'Integrasi modul laporan Balanced Scorecard (BSC) dan eksport PDF bertaraf profesional dengan graf radar auto-dijana.',
    changes: [
      {
        title: 'Laporan Eksekutif PDF Auto-Generated',
        description: 'PDF lengkap susunan grafik radar, demografi peserta, purata skor 5 komponen, dan ringkasan dapatan maklum balas.',
        tag: 'PDF',
        icon: 'pdf'
      },
      {
        title: 'Papan Pemuka Balanced Scorecard (BSC)',
        description: 'Pemetaan skor penilaian mengikut standard pengurusan objektif strategik Jabatan Agama Islam Selangor (JAIS).',
        tag: 'Teras',
        icon: 'chart'
      }
    ]
  },
  {
    id: 'v2.0.0',
    version: 'v2.0.0',
    date: '1 Ogos 2026',
    title: 'Peluncuran Sistem e-Penilaian Program JAIS v2.0',
    badgeText: 'Versi Utama',
    category: 'Sistem',
    summary: 'Peluncuran rasmi aplikasi penilaian program serba moden berteraskan teknologi web terkini.',
    changes: [
      {
        title: 'Pangkalan Data & Dashboard Pentadbir',
        description: 'Integrasi borang digital berpusat, papan pemuka analitik realtime, dan pengurusan rekod cadangan peserta.',
        tag: 'Teras',
        icon: 'server'
      }
    ]
  }
];

export const ChangelogPage: React.FC<ChangelogPageProps> = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Category list
  const categories = ['Semua', 'Ciri Baharu', 'Penambahbaikan', 'Prestasi', 'Sistem'];

  // Filtering
  const filteredChangelog = useMemo(() => {
    return CHANGELOG_DATA.filter(entry => {
      // Category match
      const matchCategory = selectedCategory === 'Semua' || entry.category === selectedCategory;

      // Search match (token-based partial search matching user requirement #2)
      if (!searchTerm.trim()) return matchCategory;

      const queryTokens = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const fullText = [
        entry.version,
        entry.date,
        entry.title,
        entry.summary,
        ...entry.changes.map(c => `${c.title} ${c.description} ${c.tag}`)
      ].join(' ').toLowerCase();

      const matchSearch = queryTokens.every(token => fullText.includes(token));
      return matchCategory && matchSearch;
    });
  }, [searchTerm, selectedCategory]);

  const handleCopyUpdate = (entry: ChangelogEntry) => {
    const text = `📌 *${entry.title}* (${entry.date} - ${entry.version})\n\n${entry.summary}\n\n*Butiran Penambahbaikan:*\n${entry.changes.map((c, i) => `${i + 1}. *${c.title}*: ${c.description}`).join('\n')}\n\n— Sistem e-Penilaian Program JAIS`;
    navigator.clipboard.writeText(text);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-[#1C1C1E] font-sans pb-16">
      
      {/* Apple Inset Grouped Top Banner */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-4">
        <div className="bg-[#1C1C1E] text-white p-6 sm:p-10 rounded-3xl border border-black/[0.08] shadow-ios-sheet relative overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-lime-400/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10">
            {/* Badge & Meta */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-400/20 text-lime-400 border border-lime-400/30 text-[11px] font-bold uppercase tracking-wider">
                <Sparkles size={12} className="text-lime-400" />
                Sistem e-Penilaian JAIS
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-gray-300 text-[11px] font-medium">
                <Clock size={12} className="text-gray-400" />
                Kemaskini Terkini: 13 Ogos 2026
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight mb-2">
              Sejarah Penambahbaikan Aplikasi
            </h1>
            <p className="text-gray-300 text-xs sm:text-sm font-medium max-w-2xl leading-relaxed">
              Semak log kemaskini rasmi, penambahbaikan ciri baharu, kelajuan sistem, dan fungsi terkini yang dibangunkan untuk memantapkan aplikasi e-Penilaian Program JAIS.
            </p>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">Versi Terkini</span>
                <span className="text-sm sm:text-base font-bold text-lime-400 font-mono">v2.4.0</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">Tarikh Rilis</span>
                <span className="text-sm sm:text-base font-semibold text-white">13 Ogos 2026</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">Status Sistem</span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Stabil & Pantas
                </span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">Jumlah Log</span>
                <span className="text-sm sm:text-base font-semibold text-white">{CHANGELOG_DATA.length} Versi</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 mt-6">

        {/* Apple Inset Filter & Search Bar */}
        <div className="bg-white rounded-2xl shadow-ios-card border border-black/[0.06] p-4 sm:p-4.5 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari log kemaskini..."
                className="w-full pl-10 pr-9 py-2 bg-[#F2F2F7] border border-black/[0.04] rounded-xl text-xs font-semibold text-[#1C1C1E] placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-lime-400/40 transition-all"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Apple Segmented Control Style Category Chips */}
            <div className="flex items-center gap-1 bg-[#F2F2F7] p-1 rounded-2xl overflow-x-auto w-full md:w-auto pb-1 md:pb-1 custom-scrollbar border border-black/[0.04]">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ios-press cursor-pointer ${
                    selectedCategory === cat 
                      ? 'bg-white text-[#1C1C1E] shadow-2xs' 
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Timeline List */}
        {filteredChangelog.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-black/[0.06] shadow-ios-card">
            <History size={40} className="mx-auto text-gray-300 mb-2" />
            <h3 className="text-sm font-bold text-gray-800">Tiada Kemaskini Dijumpai</h3>
            <p className="text-xs text-gray-500 mt-1">Sila cuba carian atau kata kunci lain.</p>
            <button 
              onClick={() => { setSearchTerm(''); setSelectedCategory('Semua'); }}
              className="mt-4 px-4 py-2 bg-[#1C1C1E] text-white rounded-xl text-xs font-semibold hover:bg-black transition-all cursor-pointer ios-press"
            >
              Reset Carian
            </button>
          </div>
        ) : (
          <div className="space-y-5 relative">

            {filteredChangelog.map((entry, idx) => (
              <motion.div 
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.04 }}
                className="relative z-10"
              >
                <div className={`bg-white rounded-2xl border transition-all shadow-ios-card overflow-hidden ${
                  entry.isLatest 
                    ? 'border-lime-400 ring-2 ring-lime-400/20' 
                    : 'border-black/[0.06]'
                }`}>
                  
                  {/* Entry Header Bar */}
                  <div className={`p-5 sm:p-6 border-b ${entry.isLatest ? 'bg-lime-50/50 border-lime-200/60' : 'bg-[#FAFAFC] border-black/[0.04]'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      
                      {/* Version & Date */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs sm:text-sm font-bold px-2.5 py-1 rounded-xl bg-[#1C1C1E] text-lime-400 shadow-2xs">
                          {entry.version}
                        </span>
                        
                        {entry.isLatest && (
                          <span className="px-2 py-0.5 rounded-lg bg-lime-400 text-[#1C1C1E] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <Sparkles size={10} /> {entry.badgeText}
                          </span>
                        )}

                        <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                          <Calendar size={12} className="text-gray-400" />
                          {entry.date}
                        </span>
                      </div>

                      {/* Share / Copy Release Note Button */}
                      <button
                        onClick={() => handleCopyUpdate(entry)}
                        className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-black/[0.08] hover:border-lime-400 text-gray-700 rounded-xl text-xs font-semibold transition-all shadow-2xs ios-press cursor-pointer"
                        title="Salin nota kemaskini ini"
                      >
                        {copiedId === entry.id ? (
                          <>
                            <Check size={13} className="text-emerald-600" />
                            <span className="text-emerald-700">Disalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} className="text-gray-500" />
                            <span>Salin Nota</span>
                          </>
                        )}
                      </button>

                    </div>

                    <h2 className="text-sm sm:text-base font-bold text-[#1C1C1E] mt-2.5 tracking-tight">
                      {entry.title}
                    </h2>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {entry.summary}
                    </p>
                  </div>

                  {/* Changes Items Grid */}
                  <div className="p-5 sm:p-6 space-y-3">
                    {entry.changes.map((change, cIdx) => (
                      <div 
                        key={cIdx} 
                        className="bg-[#F2F2F7]/70 rounded-2xl p-3.5 border border-black/[0.04] transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-white text-[#1C1C1E] border border-black/[0.06] shrink-0 shadow-2xs mt-0.5">
                            {change.tag === 'WhatsApp' && <Share2 size={15} className="text-emerald-600" />}
                            {change.tag === 'Carian' && <Search size={15} className="text-lime-600" />}
                            {change.tag === 'Prestasi' && <Zap size={15} className="text-amber-500" />}
                            {change.tag === 'UI/UX' && <Smartphone size={15} className="text-blue-600" />}
                            {change.tag === 'PDF' && <FileText size={15} className="text-rose-600" />}
                            {change.tag === 'ChatBot' && <MessageSquare size={15} className="text-purple-600" />}
                            {change.tag === 'Teras' && <Cpu size={15} className="text-gray-700" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="text-xs sm:text-sm font-semibold text-[#1C1C1E]">
                                {change.title}
                              </h3>
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/5 text-gray-600">
                                {change.tag}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              {change.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              </motion.div>
            ))}

          </div>
        )}

        {/* Footer info box */}
        <div className="mt-10 bg-white text-[#1C1C1E] rounded-2xl p-6 border border-black/[0.06] shadow-ios-card text-center relative overflow-hidden">
          <ShieldCheck size={32} className="mx-auto text-lime-600 mb-2" />
          <h3 className="text-sm sm:text-base font-bold text-[#1C1C1E]">Sistem e-Penilaian Program JAIS</h3>
          <p className="text-xs text-gray-500 max-w-lg mx-auto mt-1 leading-relaxed">
            Aplikasi ini sentiasa dikemaskini untuk memastikan kelajuan, keselamatan data, dan keselesaan pengguna semasa menguruskan laporan penilaian program.
          </p>
          <div className="mt-4 text-[10px] font-mono text-gray-400 uppercase tracking-wider">
            RUJUKAN RASMI: BPNP/UPS/B/NILAI/02
          </div>
        </div>

      </main>

    </div>
  );
};

export default ChangelogPage;
