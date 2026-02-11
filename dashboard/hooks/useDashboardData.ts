
import { useState, useEffect, useMemo, useCallback } from 'react';
import { DashboardData, ProgramSummary } from '../types';
import { GOOGLE_SCRIPT_URL } from '../../services/api';

export const useDashboardData = () => {
  const [data, setData] = useState<DashboardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<Date>(new Date());

  // Helper untuk tukar teks/nilai ke nombor
  const parseRating = (val: any) => {
    if (typeof val === 'number') return val;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  // Helper untuk parse Tarikh Format Malaysia (dd/mm/yyyy) ke ISO String
  const parseMalaysianDate = (dateStr: any) => {
    if (!dateStr) return new Date().toISOString();
    
    // Jika ia sudah objek Date (kadang-kadang Google Script hantar format berbeza)
    if (dateStr instanceof Date) return dateStr.toISOString();

    const str = String(dateStr).trim();

    // Regex untuk check format dd/mm/yyyy atau d/m/yyyy
    // Support separator / atau -
    const parts = str.split(/[\/\-\.]/); 
    
    // Jika format dd/mm/yyyy (3 bahagian)
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // JS bulan bermula 0 (Jan = 0)
      const year = parseInt(parts[2], 10);
      
      // Validation asas
      if (year > 1900 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
         // Create UTC date to avoid timezone shifts affecting the day
         const dateObj = new Date(year, month, day, 12, 0, 0); 
         return dateObj.toISOString();
      }
    }
    
    // Fallback: Cuba baca standard date jika format lain
    const standardDate = new Date(str);
    if (!isNaN(standardDate.getTime())) {
        return standardDate.toISOString();
    }

    return new Date().toISOString(); // Last resort fallback
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Menggunakan token keselamatan yang ditetapkan
      // Tambah timestamp pada URL untuk elak caching browser
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=read&token=JAIS_PenilaianProgram2026&_t=${new Date().getTime()}`);
      const result = await response.json();
      
      if (result.status === "success" && Array.isArray(result.data)) {
          
          const mappedData: DashboardData[] = result.data
            // FILTER PENTING: Buang row yang merupakan Header atau Kosong
            .filter((item: any) => {
               const pName = item['NAMA PROGRAM'] ? String(item['NAMA PROGRAM']).toUpperCase().trim() : '';
               
               // LOGIC UTAMA: HANYA AMBIL 'Timestamp Dibetulkan' (Strict Mapping)
               const rawTimestamp = item['Timestamp Dibetulkan'];

               // 1. Jika nama program adalah "NAMA PROGRAM" (ini adalah header row) -> Buang
               if (pName === 'NAMA PROGRAM') return false;
               
               // 2. Jika nama program kosong -> Buang
               if (!pName) return false;

               // 3. Jika timestamp kosong atau header -> Buang
               if (!rawTimestamp || String(rawTimestamp).trim() === '' || rawTimestamp === 'Timestamp Dibetulkan') return false;

               return true;
            })
            .map((item: any, index: number) => {
                // Parse Tarikh dengan format Malaysia (dd/mm/yyyy)
                // KEUTAMAAN MUTLAK: 'Timestamp Dibetulkan'
                const rawTimestamp = item['Timestamp Dibetulkan'];
                
                // Untuk timestamp selalunya ada masa, kita ambil bahagian date sahaja dulu untuk parsing selamat
                const cleanTimestampStr = String(rawTimestamp).split(' ')[0]; 

                const rawProgramDate = item['TARIKH MULA PROGRAM'] || item['Tarikh Mula'] || '';
                
                return {
                    id: item['ID'] || `RSP-${1000 + index}`,
                    // Tukar ke ISO String untuk sorting & filtering yang betul
                    timestamp: parseMalaysianDate(cleanTimestampStr),
                    
                    // MAPPING BARU: TARIKH MULA PROGRAM (dd/mm/yyyy -> ISO)
                    programDate: parseMalaysianDate(rawProgramDate),

                    // 1. NAMA PROGRAM
                    programName: (item['NAMA PROGRAM'] || 'PROGRAM TIDAK DINYATAKAN').toUpperCase().trim(),
                    
                    // 2. TEMPAT PROGRAM DILAKSANA -> Mapped to tempat
                    tempat: (item['TEMPAT PROGRAM DILAKSANA'] || '-').toUpperCase().trim(),
                    
                    // 3. BAHAGIAN PROGRAM DILAKSANA -> Mapped to bahagian
                    bahagian: (item['BAHAGIAN PROGRAM DILAKSANA'] || 'UMUM').toUpperCase().trim(),
                    
                    // 4. PENGANJUR UTAMA -> Mapped to exact requested header
                    penganjur: (item['BAHAGIAN/ PEJABAT AGAMA YANG MENGANJUR UTAMA PROGRAM'] || item['PENGANJUR'] || '-').toUpperCase(),

                    // MAPPING JANTINA: Pastikan konsisten (String, Uppercase, Trim)
                    jantina: String(item['JANTINA'] || item['Jantina'] || '-').toUpperCase().trim(),
                    
                    umur: String(item['UMUR'] || item['Umur'] || '-').toUpperCase().trim(),
                    
                    // 5. TARAF PENDIDIKAN TERTINGGI -> Mapped explicitly
                    tarafPendidikan: (item['TARAF PENDIDIKAN TERTINGGI'] || item['PENDIDIKAN'] || item['Taraf Pendidikan'] || '-').toUpperCase().trim(),
                    
                    // --- LOCKED MAPPING START ---
                    // Mapping Skor DITETAPKAN (Strict Headers)
                    
                    // Tarikh Masa dan Tempat
                    skorLogistik: parseRating(item['Tarikh, Masa dan Tempat']), 
                    
                    // Pengisian Program
                    skorPengisian: parseRating(item['Pengisian Program']),
                    
                    // Pembentang/ Fasilitator (jika ada)
                    skorFasilitator: parseRating(item['Pembentang/ Fasilitator (jika ada)']),
                    
                    // Keurusetiaan Program
                    skorUrusetia: parseRating(item['Keurusetiaan Program']),
                    
                    // Jamuan (jika ada)
                    skorJamuan: parseRating(item['Jamuan (jika ada)']),
                    
                    // --- LOCKED MAPPING END ---
                    
                    // 6. Penilaian Keseluruhan Program -> Mapped to skorKeseluruhan
                    skorKeseluruhan: parseRating(item['Penilaian Keseluruhan Program']),

                    // Komen & Cadangan
                    komen: item['KOMEN PROGRAM'] || item['KOMEN'] || item['komen_program'] || '',
                    cadangan: item['CADANGAN PROGRAM'] || item['CADANGAN'] || item['cadangan'] || ''
                };
            });

          setData(mappedData);
          setLastFetchTime(new Date());
      }
    } catch (err) {
      console.error("Gagal tarik data cleaned:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Basic stats
  const stats = useMemo(() => {
    if (data.length === 0) return { 
        totalRespondents: 0, 
        avgKeseluruhan: "0.00",
        avgPengisian: "0.00",
        avgFasilitator: "0.00" 
    };

    const sum = (key: keyof DashboardData) => data.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);

    return {
      totalRespondents: data.length,
      avgKeseluruhan: (sum('skorKeseluruhan') / data.length).toFixed(2),
      avgPengisian: (sum('skorPengisian') / data.length).toFixed(2),
      avgFasilitator: (sum('skorFasilitator') / data.length).toFixed(2),
    };
  }, [data]);

  // Calculate charts data
  const charts = useMemo(() => {
    if (data.length === 0) {
      return {
        scores: [],
        jantina: [],
        umur: [],
        bahagian: []
      };
    }

    const countBy = (key: keyof DashboardData) => {
      const counts: Record<string, number> = {};
      data.forEach(item => {
        const val = String(item[key] || 'Tidak Dinyatakan').toUpperCase();
        if (val === '-' || val === '') return;
        counts[val] = (counts[val] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    };

    const sum = (key: keyof DashboardData) => data.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
    const avg = (key: keyof DashboardData) => parseFloat((sum(key) / data.length).toFixed(2));

    const scores = [
      { name: 'Keseluruhan', value: avg('skorKeseluruhan') },
      { name: 'Logistik', value: avg('skorLogistik') },
      { name: 'Pengisian', value: avg('skorPengisian') },
      { name: 'Fasilitator', value: avg('skorFasilitator') },
      { name: 'Urusetia', value: avg('skorUrusetia') },
    ];

    const jantina = countBy('jantina');
    const umur = countBy('umur');
    const bahagian = countBy('bahagian').slice(0, 10);

    return { scores, jantina, umur, bahagian };
  }, [data]);

  return { 
    rawData: data, 
    loading, 
    refreshData: fetchData, 
    lastFetchTime,
    stats,
    charts
  };
};
