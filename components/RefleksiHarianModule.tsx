import React, { useState, useRef } from 'react';
import { Sparkles, Download, Share2, Copy, Check, RefreshCw, Smartphone, Square } from 'lucide-react';
import LogoImage from './LogoImage';
import html2canvas from 'html2canvas';

interface RefleksiHarianModuleProps {
  onBack?: () => void;
}

export type ThemeKey = 'dark' | 'light' | 'natureForest' | 'natureOcean' | 'natureMountain';

interface ThemeConfig {
  key: ThemeKey;
  name: string;
  text: string;
  subText: string;
  cardBg: string;
  cardBorder: string;
  accent: string;
  backgroundImage?: string;
  overlay?: string;
}

const THEMES: Record<ThemeKey, ThemeConfig> = {
  dark: {
    key: 'dark',
    name: 'Gelap (Teks Cerah)',
    text: 'text-white',
    subText: 'text-gray-400',
    cardBg: 'bg-gradient-to-br from-gray-900 via-black to-gray-900',
    cardBorder: 'border-gray-800',
    accent: 'bg-white'
  },
  light: {
    key: 'light',
    name: 'Cerah (Teks Gelap)',
    text: 'text-gray-900',
    subText: 'text-gray-500',
    cardBg: 'bg-gradient-to-br from-white via-gray-50 to-gray-100',
    cardBorder: 'border-gray-200',
    accent: 'bg-black'
  },
  natureForest: {
    key: 'natureForest',
    name: 'Nature (Hutan)',
    text: 'text-white',
    subText: 'text-gray-200',
    cardBg: 'bg-emerald-900',
    cardBorder: 'border-white/20',
    accent: 'bg-emerald-400',
    backgroundImage: 'https://images.unsplash.com/photo-1448375240586-882707db888b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1080&q=80',
    overlay: 'bg-black/50'
  },
  natureOcean: {
    key: 'natureOcean',
    name: 'Nature (Laut)',
    text: 'text-white',
    subText: 'text-sky-100',
    cardBg: 'bg-blue-900',
    cardBorder: 'border-white/20',
    accent: 'bg-sky-400',
    backgroundImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1080&q=80',
    overlay: 'bg-blue-950/40'
  },
  natureMountain: {
    key: 'natureMountain',
    name: 'Nature (Gunung)',
    text: 'text-white',
    subText: 'text-gray-200',
    cardBg: 'bg-slate-900',
    cardBorder: 'border-white/20',
    accent: 'bg-white',
    backgroundImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1080&q=80',
    overlay: 'bg-black/50'
  }
};

interface QuoteItem {
  text: string;
  category: string;
}

const QUOTES_COLLECTION: QuoteItem[] = [
  { text: "Kerja yang baik dibina daripada perkara kecil yang dilakukan dengan konsisten.", category: "Konsistensi" },
  { text: "Tak perlu bergerak terlalu laju. Yang penting, jangan berhenti bergerak.", category: "Produktiviti" },
  { text: "Hari yang baik bermula dengan satu perkara yang kita pilih untuk selesaikan.", category: "Fokus" },
  { text: "Kerja berpasukan bukan tentang siapa paling menonjol, tetapi bagaimana kita bergerak bersama.", category: "Kerjasama" },
  { text: "Selesaikan yang penting dahulu. Selebihnya akan menjadi lebih mudah.", category: "Produktiviti" },
  { text: "Tidak semua usaha terus nampak hasilnya. Teruskan.", category: "Pertumbuhan" },
  { text: "Buat yang terbaik dengan apa yang ada di tangan hari ini.", category: "Kerja Harian" },
  { text: "Tak semua perkara perlu diselesaikan hari ini. Pilih yang penting, buat sebaiknya.", category: "Refleksi" },
  { text: "Fokus pada proses, hasil yang baik akan menyusul dengan sendirinya.", category: "Profesional" },
  { text: "Ketenangan fikiran adalah asas kepada keputusan yang bernas.", category: "Refleksi" },
  { text: "Belajar daripada kesilapan semalam untuk langkah yang lebih kemas hari ini.", category: "Pertumbuhan" },
  { text: "Komunikasi yang jelas menjimatkan masa dan mengelakkan salah faham.", category: "Kerjasama" },
  { text: "Disiplin diri adalah jambatan antara matlamat dan kejayaan.", category: "Konsistensi" },
  { text: "Mulakan tugasan yang paling sukar dahulu supaya tenaga mental lebih segar.", category: "Produktiviti" },
  { text: "Ruang kerja yang kemas membantu menjernihkan fikiran.", category: "Kerja Harian" },
  { text: "Kecemerlangan bukan satu kebetulan, ia adalah hasil usaha yang berterusan.", category: "Profesional" },
  { text: "Mendengar dengan teliti adalah separuh daripada penyelesaian masalah.", category: "Kerjasama" },
  { text: "Hargai masa rakan sekerja seperti anda menghargai masa sendiri.", category: "Profesional" },
  { text: "Setiap hari membawa peluang baharu untuk memperbaiki diri.", category: "Positif" },
  { text: "Kualiti kerja mencerminkan integriti dan keperibadian seseorang.", category: "Profesional" },
  { text: "Rehat yang cukup adalah sebahagian daripada produktiviti.", category: "Refleksi" },
  { text: "Jangan tertangguh pada perkara yang boleh diselesaikan sekarang.", category: "Produktiviti" },
  { text: "Sikap positif menular kepada persekitaran kerja yang lebih sihat.", category: "Positif" },
  { text: "Merancang dengan teliti menyelamatkan separuh daripada masa pelaksanaan.", category: "Fokus" },
  { text: "Sentiasa terbuka kepada pandangan baharu demi penambahbaikan berterusan.", category: "Pertumbuhan" },
  { text: "Kesabaran dalam menghadapi cabaran membina ketahanan mental.", category: "Refleksi" },
  { text: "Kejayaan sepasukan adalah kejayaan bersama.", category: "Kerjasama" },
  { text: "Sentiasa pastikan matlamat tugasan jelas sebelum mula bertindak.", category: "Fokus" },
  { text: "Ketekunan mengatasi kebolehan apabila kebolehan tidak tekun.", category: "Konsistensi" },
  { text: "Senyuman dan kata yang baik meringankan beban hari ini.", category: "Positif" },
  { text: "Inovasi bermula daripada keberanian mencuba cara yang lebih baik.", category: "Pertumbuhan" },
  { text: "Utamakan ketepatan di samping kecepatan.", category: "Profesional" }
];

export const RefleksiHarianModule: React.FC<RefleksiHarianModuleProps> = () => {
  const [currentThemeKey, setCurrentThemeKey] = useState<ThemeKey>('dark');
  const [posterRatio, setPosterRatio] = useState<'square' | 'story'>('square');
  const [quoteIndex, setQuoteIndex] = useState<number>(() => Math.floor(Math.random() * QUOTES_COLLECTION.length));
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const posterRef = useRef<HTMLDivElement>(null);
  const currentTheme = THEMES[currentThemeKey];
  const currentQuote = QUOTES_COLLECTION[quoteIndex];

  const handleRandomQuote = () => {
    let nextIndex = Math.floor(Math.random() * QUOTES_COLLECTION.length);
    while (nextIndex === quoteIndex && QUOTES_COLLECTION.length > 1) {
      nextIndex = Math.floor(Math.random() * QUOTES_COLLECTION.length);
    }
    setQuoteIndex(nextIndex);
  };

  const handleDownloadJPEG = async () => {
    if (!posterRef.current) return;
    try {
      const canvas = await html2canvas(posterRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.download = `Refleksi_Harian_JAIS_${posterRatio === 'square' ? '1x1' : '9x16'}.jpg`;
      link.click();
    } catch (e) {
      alert('Gagal memuat turun imej poster.');
    }
  };

  const handleCopyText = async () => {
    const textToCopy = `"${currentQuote.text}"\n\n— Refleksi Harian\nJabatan Agama Islam Sarawak`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      alert('Gagal menyalin teks.');
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`"${currentQuote.text}"\n\n— Refleksi Harian JAIS Sarawak`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleTelegramShare = () => {
    const text = encodeURIComponent(`"${currentQuote.text}"\n\n— Refleksi Harian JAIS Sarawak`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${text}`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Header Info */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">REFLEKSI HARIAN</h1>
        <p className="text-sm text-gray-600 max-w-md mx-auto">
          Kata-kata ringkas untuk hari yang lebih bermakna. Sesuai dikongsi bersama rakan sekerja.
        </p>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-black/[0.06] space-y-4">
        {/* Aspect Ratio & Quote Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Format Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-2xl">
            <button
              onClick={() => setPosterRatio('square')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                posterRatio === 'square' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Square size={14} />
              <span>Nisbah Petak (1:1)</span>
            </button>
            <button
              onClick={() => setPosterRatio('story')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                posterRatio === 'story' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Smartphone size={14} />
              <span>Nisbah Story (9:16)</span>
            </button>
          </div>

          {/* Random Quote Action */}
          <button
            onClick={handleRandomQuote}
            className="px-4 py-2.5 bg-black text-white hover:bg-gray-800 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <RefreshCw size={14} />
            <span>Tukar Quote</span>
          </button>
        </div>

        {/* Theme Selector */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tema Visual</span>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
              const t = THEMES[key];
              const isSelected = currentThemeKey === key;
              return (
                <button
                  key={key}
                  onClick={() => setCurrentThemeKey(key)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${t.accent}`}></span>
                  <span>{t.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Poster Canvas Preview Container */}
      <div className="flex justify-center bg-gray-100/80 p-6 sm:p-10 rounded-3xl border border-black/5 overflow-x-auto">
        <div className={`w-full transition-all duration-300 ${posterRatio === 'square' ? 'max-w-[460px]' : 'max-w-[320px]'}`}>
          
          {/* THE ACTUAL SHAREABLE CARD (1080x1080 or 1080x1920 proportions) */}
          <div
            ref={posterRef}
            className={`
              w-full ${currentTheme.cardBg} rounded-[2.5rem] p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden shadow-xl border ${currentTheme.cardBorder}
              ${posterRatio === 'square' ? 'aspect-square' : 'aspect-[9/16]'}
              transition-all duration-300 select-none
            `}
            style={currentTheme.backgroundImage ? {
              backgroundImage: `url('${currentTheme.backgroundImage}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            } : undefined}
          >
            {/* Background Overlay */}
            {currentTheme.backgroundImage && (
              <div className={`absolute inset-0 ${currentTheme.overlay || 'bg-black/40'} z-0`}></div>
            )}

            {/* Top Branding Header */}
            <div className="relative z-10 space-y-1">
              <span className={`text-[11px] font-semibold tracking-[0.2em] uppercase ${currentTheme.subText} block`}>
                JAIS SARAWAK
              </span>
              <h2 className={`text-sm sm:text-base font-bold tracking-[0.1em] uppercase ${currentTheme.text}`}>
                REFLEKSI HARIAN
              </h2>
            </div>

            {/* Central Quote Text */}
            <div className="relative z-10 my-auto py-6 space-y-4">
              <div className={`w-1.5 h-8 ${currentTheme.accent} rounded-full`}></div>
              <p className={`text-lg sm:text-2xl font-medium leading-[1.35] tracking-tight ${currentTheme.text} italic`}>
                "{currentQuote.text}"
              </p>
              <div className="pt-2">
                <span className={`text-xs font-bold tracking-wider uppercase ${currentTheme.subText}`}>
                  — Refleksi Hari Ini
                </span>
              </div>
            </div>

            {/* Bottom Branding Footer */}
            <div className="relative z-10 pt-6 border-t border-black/10 dark:border-white/10 mt-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center p-1 shadow-xs border border-black/10">
                  <LogoImage />
                </div>
                <div className="flex flex-col">
                  <span className={`text-[10px] font-bold tracking-wider uppercase ${currentTheme.text}`}>
                    PENILAIAN PROGRAM
                  </span>
                  <span className={`text-[9px] font-medium tracking-tight ${currentTheme.subText}`}>
                    JABATAN AGAMA ISLAM SARAWAK
                  </span>
                </div>
              </div>
              <Sparkles size={16} className={currentTheme.subText} />
            </div>
          </div>

        </div>
      </div>

      {/* Share & Export Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          onClick={handleDownloadJPEG}
          className="w-full sm:w-auto px-6 py-3.5 bg-black text-white hover:bg-gray-800 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all ios-press"
        >
          <Download size={16} />
          <span>Muat Turun JPG</span>
        </button>

        <button
          onClick={handleCopyText}
          className="w-full sm:w-auto px-6 py-3.5 bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all ios-press"
        >
          {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
          <span>{copied ? 'Berjaya disalin' : 'Salin Teks'}</span>
        </button>

        <button
          onClick={() => setShowShareMenu(!showShareMenu)}
          className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all ios-press"
        >
          <Share2 size={16} />
          <span>Kongsi</span>
        </button>
      </div>

      {/* Share Popup Menu */}
      {showShareMenu && (
        <div className="flex flex-wrap justify-center gap-2 pt-2 animate-fadeIn">
          <button
            onClick={handleWhatsAppShare}
            className="px-4 py-2.5 bg-[#25D366] text-white rounded-xl text-xs font-bold hover:bg-[#20bd5a] transition-all"
          >
            WhatsApp
          </button>
          <button
            onClick={handleTelegramShare}
            className="px-4 py-2.5 bg-[#0088cc] text-white rounded-xl text-xs font-bold hover:bg-[#0077b5] transition-all"
          >
            Telegram
          </button>
        </div>
      )}

      {/* Developer Credit outside the card */}
      <div className="text-center pt-4 text-xs font-medium text-gray-400">
        Developed by Faridzhuan Firdaus
      </div>
    </div>
  );
};
