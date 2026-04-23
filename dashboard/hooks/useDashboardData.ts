
import { useState, useEffect, useMemo, useCallback } from 'react';
import { DashboardData } from '../types';
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
    if (!str) return null;

    // Buang bahagian masa untuk format seperti "23/04/2026, 11:21:16"
    str = str.replace(/,\s*\d{1,2}:\d{2}(?::\d{2})?\s*(AM|PM)?$/i, '').trim();

    // Sokong format ISO seperti 2026-04-02
    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const dateObj = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
      return dateObj.toISOString();
    }
    
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
          const getVal = (item: Record<string, any>, keys: string[]) => {
             const itemKeys = Object.keys(item);
             for (const k of keys) {
                if (item[k] !== undefined && item[k] !== null && String(item[k]).trim() !== '') return item[k];
                const found = itemKeys.find(ik => ik.trim().toUpperCase() === k.toUpperCase());
                if (found !== undefined && item[found] !== undefined && item[found] !== null && String(item[found]).trim() !== '') {
                  return item[found];
                }
             }
             return '';
          };

          const toUpperTrim = (val: any, fallback = '') => {
            const normalized = String(val ?? '').trim();
            return normalized ? normalized.toUpperCase() : fallback;
          };

          const getQuarterFromDate = (isoDate: string) => {
            const parsed = new Date(isoDate);
            if (isNaN(parsed.getTime())) return '';
            return `Q${Math.floor(parsed.getUTCMonth() / 3) + 1}`;
          };
          
          const mappedData: DashboardData[] = result.data
            .filter((item: any) => {
               const rawTimestamp = getVal(item, ['Timestamp Dibetulkan', 'Timestamp Ori', 'Timestamp', 'ts_ori']);
               const tsStr = rawTimestamp ? String(rawTimestamp).trim() : '';
               const rawProgramName = getVal(item, ['NAMA PROGRAM', 'NAMA PROGRAM ORI', 'nama_program_ori']);
               const programName = rawProgramName ? String(rawProgramName).toUpperCase().trim() : '';

               // Elak baris tajuk atau row kosong total
               if (tsStr === 'TIMESTAMP DIBETULKAN' || tsStr === 'Timestamp Dibetulkan') {
                   return false; 
               }

               if (programName === 'NAMA PROGRAM') return false;

               return Boolean(tsStr || programName);
            })
            .map((item: any, index: number) => {
                const rawTimestamp = getVal(item, ['Timestamp Dibetulkan', 'Timestamp Ori', 'Timestamp', 'ts_ori']);
                const parsedTimestamp = parseMalaysianDate(rawTimestamp);

                const rawProgramDate = getVal(item, [
                  'TARIKH MULA PROGRAM',
                  'TARIKH MULA PROGRAM ORI',
                  'Tarikh Mula',
                  'tarikh_mula_ori'
                ]);
                const parsedProgramDate = parseMalaysianDate(rawProgramDate);
                const finalProgramDate = parsedProgramDate || parsedTimestamp || '1970-01-01T00:00:00.000Z';
                const filterTahun = String(getVal(item, ['FILTER TAHUN']) || '').trim() || String(new Date(finalProgramDate).getUTCFullYear());
                const quarterRaw = String(getVal(item, ['QUARTER']) || '').trim();
                const quarter = quarterRaw === '1'
                  ? 'Q1'
                  : quarterRaw === '2'
                    ? 'Q2'
                    : quarterRaw === '3'
                      ? 'Q3'
                      : quarterRaw === '4'
                        ? 'Q4'
                        : quarterRaw || getQuarterFromDate(finalProgramDate);

                return {
                    id: String(item['ID'] || item['row_index'] || `RSP-${1000 + index}`),
                    timestamp: parsedTimestamp || finalProgramDate,
                    programDate: finalProgramDate,

                    filterTahun,

                    programName: getVal(item, ['NAMA PROGRAM', 'NAMA PROGRAM ORI', 'nama_program_ori'])
                        ? toUpperTrim(getVal(item, ['NAMA PROGRAM', 'NAMA PROGRAM ORI', 'nama_program_ori']))
                        : 'PROGRAM TIDAK DINYATAKAN',
                    
                    tempat: toUpperTrim(
                      getVal(item, ['TEMPAT PROGRAM DILAKSANA', 'TEMPAT PROGRAM DILAKSANA ORI', 'TEMPAT', 'tempat_ori']),
                      '-'
                    ),
                    
                    bahagian: toUpperTrim(
                      getVal(item, ['BAHAGIAN PROGRAM DILAKSANA', 'BAHAGIAN PROGRAM DILAKSANA ORI', 'BAHAGIAN', 'bahagian_ori']),
                      'UMUM'
                    ),
                    
                    penganjur: toUpperTrim(
                      getVal(item, [
                        'BAHAGIAN/ PEJABAT AGAMA YANG MENGANJUR UTAMA PROGRAM',
                        'BAHAGIAN/ PEJABAT AGAMA YANG MENGANJUR UTAMA PROGRAM ORI',
                        'PENGANJUR',
                        'penganjur_utama_ori'
                      ]),
                      '-'
                    ),

                    jantina: toUpperTrim(getVal(item, ['JANTINA', 'Jantina']), '-'),
                    
                    umur: toUpperTrim(getVal(item, ['UMUR', 'Umur']), '-'),
                    
                    quarter,
                    
                    tarafPendidikan: toUpperTrim(
                      getVal(item, ['TARAF PENDIDIKAN TERTINGGI', 'PENDIDIKAN', 'Taraf Pendidikan', 'pendidikan']),
                      '-'
                    ),
                    
                    // Ratings
                    skorLogistik: parseRating(item['Tarikh, Masa dan Tempat']), 
                    skorPengisian: parseRating(item['Pengisian Program']),
                    skorFasilitator: parseRating(item['Pembentang/ Fasilitator (jika ada)']),
                    skorUrusetia: parseRating(item['Keurusetiaan Program']),
                    skorJamuan: parseRating(item['Jamuan (jika ada)']),
                    skorKeseluruhan: parseRating(item['Penilaian Keseluruhan Program']),
                    skorFormula: parseRating(item['Penilaian Keseluruhan Program Formula']),
                    rawSkorFormula: String(item['Penilaian Keseluruhan Program Formula'] || '').trim().toUpperCase(),

                    komen: String(getVal(item, ['KOMEN PROGRAM', 'KOMEN', 'KOMEN_PROGRAM', 'komen program']) || '').trim(),
                    cadangan: String(getVal(item, ['CADANGAN PROGRAM', 'CADANGAN', 'CADANGAN_PROGRAM', 'cadangan program']) || '').trim()
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
