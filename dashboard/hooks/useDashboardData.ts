
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

  // Helper untuk parse Tarikh Format Malaysia (dd/mm/yyyy) ATAU Alphanumeric (22 February 2023)
  const parseMalaysianDate = (dateStr: any) => {
    if (!dateStr) return null; 
    
    // Jika ia sudah objek Date
    if (dateStr instanceof Date) return dateStr.toISOString();

    let str = String(dateStr).trim();
    
    // 1. Cuba Manual Parse untuk format numerik Malaysia (dd/mm/yyyy) dahulu
    const parts = str.split(/[\/\-\.]/); 
    if (parts.length === 3) {
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10);
      const p3 = parseInt(parts[2], 10);
      
      // Check logic day/month/year
      if (p3 > 1900 && p2 >= 1 && p2 <= 12 && p1 >= 1 && p1 <= 31) {
         const dateObj = new Date(Date.UTC(p3, p2 - 1, p1, 12, 0, 0)); 
         return dateObj.toISOString();
      }
    }

    // 2. Jika format teks (cth: "22 February 2023" atau "22 Februari 2023")
    const malayMonths: Record<string, string> = {
       'JANUARI': 'January', 'FEBRUARI': 'February', 'MAC': 'March', 
       'APRIL': 'April', 'MEI': 'May', 'JUN': 'June', 
       'JULAI': 'July', 'OGOS': 'August', 'SEPTEMBER': 'September', 
       'OKTOBER': 'October', 'NOVEMBER': 'November', 'DISEMBER': 'December'
    };
    
    const upperStr = str.toUpperCase();

    for (const [malay, eng] of Object.entries(malayMonths)) {
        if (upperStr.includes(malay)) {
            str = str.replace(new RegExp(malay, 'i'), eng);
            break; 
        }
    }

    // 3. Cuba baca standard date
    const standardDate = new Date(str);
    if (!isNaN(standardDate.getTime())) {
        const d = new Date(Date.UTC(standardDate.getFullYear(), standardDate.getMonth(), standardDate.getDate(), 12, 0, 0));
        return d.toISOString();
    }
    
    return null; 
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
            // FILTER PENTING: Logik dikemaskini untuk memadankan jumlah row Google Sheet
            .filter((item: any) => {
               // 1. Ambil Timestamp Dibetulkan
               const rawTimestamp = item['Timestamp Dibetulkan'];
               const tsStr = rawTimestamp ? String(rawTimestamp).trim() : '';

               // SYARAT WAJIB: Timestamp mesti wujud dan bukan header
               if (!tsStr || tsStr === '' || tsStr === 'Timestamp Dibetulkan') {
                   return false; 
               }

               // 2. Semak Header lain untuk elak baris tajuk termasuk (Double check)
               const pName = item['NAMA PROGRAM'] ? String(item['NAMA PROGRAM']).toUpperCase().trim() : '';
               if (pName === 'NAMA PROGRAM') return false;
               
               return true;
            })
            .map((item: any, index: number) => {
                const rawTimestamp = item['Timestamp Dibetulkan'];
                const cleanTimestampStr = String(rawTimestamp).split('T')[0]; 

                // MAPPING TARIKH: Cuba baca 'TARIKH MULA PROGRAM', jika tiada, baca 'Tarikh Mula'
                const rawProgramDate = item['TARIKH MULA PROGRAM'] || item['Tarikh Mula'];
                const parsedProgramDate = parseMalaysianDate(rawProgramDate);
                const finalProgramDate = parsedProgramDate || '1970-01-01T00:00:00.000Z';
                
                // Helper untuk cari key secara fleksibel (ignore case & spaces)
                const getVal = (keys: string[]) => {
                   const itemKeys = Object.keys(item);
                   for (const k of keys) {
                      // Exact match
                      if (item[k] !== undefined) return item[k];
                      // Case/Space insensitive match
                      const found = itemKeys.find(ik => ik.trim().toUpperCase() === k.toUpperCase());
                      if (found) return item[found];
                   }
                   return '';
                };

                return {
                    id: item['ID'] || `RSP-${1000 + index}`,
                    timestamp: parseMalaysianDate(cleanTimestampStr) || new Date().toISOString(),
                    programDate: finalProgramDate,

                    // MAPPING KHAS FILTER TAHUN
                    // Ia akan ambil dari column 'FILTER TAHUN'. Jika tiada, fallback kosong.
                    filterTahun: String(item['FILTER TAHUN'] || '').trim(),

                    // 1. NAMA PROGRAM
                    programName: (item['NAMA PROGRAM'] && String(item['NAMA PROGRAM']).trim() !== '') 
                        ? String(item['NAMA PROGRAM']).toUpperCase().trim() 
                        : 'PROGRAM TIDAK DINYATAKAN',
                    
                    // 2. TEMPAT PROGRAM DILAKSANA -> Mapped to tempat
                    tempat: (item['TEMPAT PROGRAM DILAKSANA'] || item['TEMPAT'] || '-').toUpperCase().trim(),
                    
                    // 3. BAHAGIAN PROGRAM DILAKSANA -> Mapped to bahagian
                    bahagian: (item['BAHAGIAN PROGRAM DILAKSANA'] || item['BAHAGIAN'] || 'UMUM').toUpperCase().trim(),
                    
                    // 4. PENGANJUR UTAMA
                    penganjur: (item['BAHAGIAN/ PEJABAT AGAMA YANG MENGANJUR UTAMA PROGRAM'] || item['PENGANJUR'] || '-').toUpperCase(),

                    // MAPPING JANTINA
                    jantina: String(item['JANTINA'] || item['Jantina'] || '-').toUpperCase().trim(),
                    
                    umur: String(item['UMUR'] || item['Umur'] || '-').toUpperCase().trim(),
                    
                    // MAPPING QUARTER
                    quarter: (() => {
                        const q = String(item['QUARTER'] || '').trim();
                        if (q === '1') return 'Q1';
                        if (q === '2') return 'Q2';
                        if (q === '3') return 'Q3';
                        if (q === '4') return 'Q4';
                        return q;
                    })(),
                    
                    tarafPendidikan: (item['TARAF PENDIDIKAN TERTINGGI'] || item['PENDIDIKAN'] || item['Taraf Pendidikan'] || '-').toUpperCase().trim(),
                    
                    // Ratings
                    skorLogistik: parseRating(item['Tarikh, Masa dan Tempat']), 
                    skorPengisian: parseRating(item['Pengisian Program']),
                    skorFasilitator: parseRating(item['Pembentang/ Fasilitator (jika ada)']),
                    skorUrusetia: parseRating(item['Keurusetiaan Program']),
                    skorJamuan: parseRating(item['Jamuan (jika ada)']),
                    skorKeseluruhan: parseRating(item['Penilaian Keseluruhan Program']),
                    skorFormula: parseRating(item['Penilaian Keseluruhan Program Formula']),
                    rawSkorFormula: String(item['Penilaian Keseluruhan Program Formula'] || '').trim().toUpperCase(),

                    // Komen & Cadangan (Paling Kritikal) - Menggunakan Helper getVal
                    komen: getVal(['KOMEN PROGRAM', 'KOMEN', 'KOMEN_PROGRAM', 'komen program']),
                    cadangan: getVal(['CADANGAN PROGRAM', 'CADANGAN', 'CADANGAN_PROGRAM', 'cadangan program'])
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
        totalPrograms: 0,
        avgKeseluruhan: "0.00",
        avgPengisian: "0.00",
        avgFasilitator: "0.00" 
    };

    const sum = (key: keyof DashboardData) => data.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
    
    const uniquePrograms = new Set(
        data
        .map(item => item.programName)
        .filter(name => name !== 'PROGRAM TIDAK DINYATAKAN')
    ).size;

    return {
      totalRespondents: data.length, 
      totalPrograms: uniquePrograms, 
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
      { name: 'Keurusetiaan', value: avg('skorUrusetia') },
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
