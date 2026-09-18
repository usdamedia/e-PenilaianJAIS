
import { useState, useEffect, useMemo, useCallback } from 'react';
import { DashboardData } from '../types';
import { GOOGLE_SCRIPT_URL } from '../../services/api';
import { FALLBACK_DASHBOARD_DATA } from '../data/fallbackData';

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

const normalizeHeader = (str: string) => str.replace(/[:*?_]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();

const getVal = (item: Record<string, any>, keys: string[]) => {
  if (!item || typeof item !== 'object') return '';
  const itemKeys = Object.keys(item);
  
  // 1. Exact / Direct key lookup
  for (const k of keys) {
     if (item[k] !== undefined && item[k] !== null && String(item[k]).trim() !== '') return item[k];
  }

  // 2. Normalized lookup (ignoring casing, punctuation, colons, underscores)
  for (const k of keys) {
     const kNorm = normalizeHeader(k);
     const found = itemKeys.find(ik => {
       const ikNorm = normalizeHeader(ik);
       return ikNorm === kNorm || ik.trim().toUpperCase() === k.toUpperCase();
     });
     if (found !== undefined && item[found] !== undefined && item[found] !== null && String(item[found]).trim() !== '') {
       return item[found];
     }
  }

  // 3. Fallback partial substring lookup for descriptive Google Forms headers
  for (const k of keys) {
     const kNorm = normalizeHeader(k);
     if (kNorm.length >= 4) {
       const found = itemKeys.find(ik => {
         const ikNorm = normalizeHeader(ik);
         return ikNorm.includes(kNorm);
       });
       if (found !== undefined && item[found] !== undefined && item[found] !== null && String(item[found]).trim() !== '') {
         return item[found];
       }
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

const mapRawSheetItem = (item: any, index: number): DashboardData => {
  const rawTimestamp = getVal(item, ['Timestamp Ori', 'Timestamp Dibetulkan', 'Timestamp', 'ts_ori']);
  const parsedTimestamp = parseMalaysianDate(rawTimestamp);

  const rawProgramDate = getVal(item, [
    'TARIKH MULA PROGRAM',
    'Tarikh Mula'
  ]);
  const parsedProgramDate = parseMalaysianDate(rawProgramDate);
  const finalProgramDate = parsedProgramDate || parsedTimestamp || '1970-01-01T00:00:00.000Z';
  const filterTahun = String(getVal(item, ['FILTER TAHUN']) || '').trim() || String(new Date(finalProgramDate).getUTCFullYear());
  const quarterRaw = String(getVal(item, ['QUARTER']) || '').trim();
  const filterBulanRaw = String(getVal(item, ['FILTER BULAN']) || '').trim().toUpperCase();
  
  let quarterFromBulan = '';
  if (filterBulanRaw) {
     if (['JANUARI', 'JANUARY', 'JAN', '1', '01', 'FEBRUARI', 'FEBRUARY', 'FEB', '2', '02', 'MAC', 'MARCH', 'MAR', '3', '03'].includes(filterBulanRaw)) quarterFromBulan = 'Q1';
     else if (['APRIL', 'APR', '4', '04', 'MEI', 'MAY', '5', '05', 'JUN', 'JUNE', '6', '06'].includes(filterBulanRaw)) quarterFromBulan = 'Q2';
     else if (['JULAI', 'JULY', 'JUL', '7', '07', 'OGOS', 'AUGUST', 'AUG', '8', '08', 'SEPTEMBER', 'SEP', '9', '09'].includes(filterBulanRaw)) quarterFromBulan = 'Q3';
     else if (['OKTOBER', 'OCTOBER', 'OKT', 'OCT', '10', 'NOVEMBER', 'NOV', '11', 'DISEMBER', 'DECEMBER', 'DIS', 'DEC', '12'].includes(filterBulanRaw)) quarterFromBulan = 'Q4';
  }

  const quarter = quarterFromBulan || (quarterRaw === '1'
    ? 'Q1'
    : quarterRaw === '2'
      ? 'Q2'
      : quarterRaw === '3'
        ? 'Q3'
        : quarterRaw === '4'
          ? 'Q4'
          : quarterRaw || getQuarterFromDate(finalProgramDate));

  return {
      id: String(item['ID'] || item['row_index'] || `RSP-${1000 + index}`),
      timestamp: parsedTimestamp || finalProgramDate,
      programDate: finalProgramDate,

      filterTahun,

      programName: getVal(item, ['NAMA PROGRAM'])
          ? toUpperTrim(getVal(item, ['NAMA PROGRAM']))
          : 'PROGRAM TIDAK DINYATAKAN',
      
      tempat: toUpperTrim(
        getVal(item, ['TEMPAT PROGRAM DILAKSANA', 'TEMPAT']),
        '-'
      ),
      
      bahagian: toUpperTrim(
        getVal(item, ['BAHAGIAN PROGRAM DILAKSANA', 'BAHAGIAN']),
        'UMUM'
      ),
      
      penganjur: toUpperTrim(
        getVal(item, [
          'BAHAGIAN/ PEJABAT AGAMA YANG MENGANJUR UTAMA PROGRAM',
          'PENGANJUR'
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

      // Maklumat Peserta & Status Sijil
      // Column AI (Col 35) = NAMA PESERTA
      namaPeserta: (() => {
        if (item['COLUMN_AI'] && String(item['COLUMN_AI']).trim() !== '' && String(item['COLUMN_AI']).trim() !== '-') {
          return toUpperTrim(item['COLUMN_AI']);
        }
        if (item['NAMA_PESERTA_COL_AI'] && String(item['NAMA_PESERTA_COL_AI']).trim() !== '') {
          return toUpperTrim(item['NAMA_PESERTA_COL_AI']);
        }

        const val = getVal(item, [
          'NAMA PENUH', 'NAMA PESERTA', 'NAMA', 'NAMA_PENUH', 'NAMA_PESERTA', 
          'Nama Penuh', 'Nama Peserta', 'Nama', 
          'namaPenuh', 'namaPeserta', 'Nama Lengkap', 'NAMA LENGKAP', 'Nama Responden',
          'NAMA RESPONDEN', 'Peserta', 'Full Name', 'FULL NAME', 'Name'
        ]);
        return val ? toUpperTrim(val) : '';
      })(),

      noKpPeserta: (() => {
        const kp = String(getVal(item, [
          'NO KAD PENGENALAN', 'NO_KAD_PENGENALAN', 'NO KP', 'NO_KP', 'IC', 'NO IC',
          'NO. KAD PENGENALAN', 'NO. KP', 'NO. IC', 'Kad Pengenalan', 'no_kp', 'noKadPengenalan', 'noKpPeserta'
        ]) || '').trim();
        return kp.includes('@') ? '' : kp;
      })(),

      // Column AJ (Col 36) = EMEL PESERTA
      emelPeserta: (() => {
        if (item['COLUMN_AJ'] && String(item['COLUMN_AJ']).trim() !== '') {
          return String(item['COLUMN_AJ']).trim().toLowerCase();
        }
        if (item['EMEL_PESERTA_COL_AJ'] && String(item['EMEL_PESERTA_COL_AJ']).trim() !== '') {
          return String(item['EMEL_PESERTA_COL_AJ']).trim().toLowerCase();
        }

        // Semak jika header asal col 36 pada sheet asal bernama NO KAD PENGENALAN tetapi diisi emel
        const rawCol36 = String(item['NO KAD PENGENALAN'] || '').trim();
        if (rawCol36.includes('@')) {
          return rawCol36.toLowerCase();
        }

        const val = getVal(item, [
          'EMEL PESERTA', 'EMEL', 'EMAIL', 'EMAIL PESERTA', 'E-MEL', 'E-MEL PESERTA',
          'EMAIL ADDRESS', 'ALAMAT EMEL', 'ALAMAT EMAIL', 'Alamat Emel', 'Alamat Email',
          'EMEL_PESERTA', 'EMAIL_PESERTA', 'emel_peserta', 'email_peserta', 'emelPeserta', 'emailPeserta',
          'Email', 'Emel', 'email', 'emel'
        ]);
        return val ? String(val).trim().toLowerCase() : '';
      })(),

      statusKelulusan: (() => {
        const st = String(getVal(item, [
          'STATUS KELULUSAN', 'STATUS_KELULUSAN', 'STATUS SIJIL', 'STATUS', 'status_kelulusan'
        ]) || '').trim().toUpperCase();
        if (st.includes('TELAH DIHANTAR') || st.includes('DIHANTAR') || st.includes('SENT')) return 'TELAH DIHANTAR';
        if (st.includes('LULUS') || st.includes('APPROV')) return 'DILULUSKAN';
        if (st.includes('TOLAK') || st.includes('REJECT')) return 'DITOLAK';
        return 'MENUNGGU';
      })(),

      emailStatus: (() => {
        const es = String(getVal(item, [
          'EMAIL STATUS', 'EMAIL_STATUS', 'email_status', 'Status Emel'
        ]) || '').trim().toUpperCase();
        if (es === 'SENT') return 'SENT';
        if (es === 'EMAIL_FAILED') return 'EMAIL_FAILED';
        if (es === 'GENERATION_FAILED') return 'GENERATION_FAILED';
        return 'PENDING';
      })(),

      noSijil: String(getVal(item, ['NO SIJIL', 'NO_SIJIL', 'NO. SIJIL', 'no_sijil']) || '').trim(),
      tarikhKelulusan: String(getVal(item, ['TARIKH KELULUSAN', 'TARIKH_KELULUSAN', 'tarikh_kelulusan', 'EMAILED AT', 'EMAILED_AT']) || '').trim(),
      pautanSijil: String(getVal(item, ['PAUTAN SIJIL', 'PAUTAN_SIJIL', 'pautan_sijil']) || 'https://drive.google.com/drive/folders/1Pkljy_Dg6YvPhKKGWsG9uvIp5qQjCIlY?usp=sharing').trim(),
      certFileId: String(getVal(item, ['CERT FILE ID', 'CERT_FILE_ID', 'cert_file_id', 'File ID']) || '').trim(),
      certPdfUrl: String(getVal(item, ['PAUTAN SIJIL', 'PAUTAN_SIJIL', 'pautan_sijil', 'PDF URL']) || '').trim(),
      lastError: String(getVal(item, ['LAST ERROR', 'LAST_ERROR', 'last_error', 'Ralat']) || '').trim(),
      
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
};

interface ApprovalOverride {
  status: 'MENUNGGU' | 'TELAH DIHANTAR' | 'DILULUSKAN' | 'DITOLAK';
  date?: string;
  emailStatus?: 'PENDING' | 'SENT' | 'GENERATION_FAILED' | 'EMAIL_FAILED';
  noSijil?: string;
  certFileId?: string;
  certPdfUrl?: string;
  lastError?: string;
  emelPeserta?: string;
}

const applyOverridesAndLocalSubmissions = (baseData: DashboardData[]): DashboardData[] => {
  let approvalOverrides: Record<string, ApprovalOverride> = {};
  try {
    approvalOverrides = JSON.parse(localStorage.getItem('JAIS_APPROVAL_OVERRIDES') || '{}');
  } catch (e) {
    console.warn("Could not read approval overrides", e);
  }

  let localSubmissions: DashboardData[] = [];
  try {
    localSubmissions = JSON.parse(localStorage.getItem('JAIS_LOCAL_SUBMISSIONS') || '[]');
  } catch (e) {
    console.warn("Could not read local submissions", e);
  }

  // Apply overrides to baseData
  const updatedBaseData = baseData.map(item => {
    const ov = approvalOverrides[item.id];
    if (ov) {
      return {
        ...item,
        statusKelulusan: ov.status,
        tarikhKelulusan: ov.date || item.tarikhKelulusan,
        emailStatus: ov.emailStatus || item.emailStatus,
        noSijil: ov.noSijil || item.noSijil,
        certFileId: ov.certFileId || item.certFileId,
        certPdfUrl: ov.certPdfUrl || item.certPdfUrl || item.pautanSijil,
        pautanSijil: ov.certPdfUrl || item.pautanSijil,
        lastError: ov.lastError !== undefined ? ov.lastError : item.lastError,
        emelPeserta: ov.emelPeserta || item.emelPeserta
      };
    }
    return item;
  });

  // Prepend local submissions if not already present
  const existingIds = new Set(updatedBaseData.map(d => d.id));
  const uniqueLocal = localSubmissions
    .filter(sub => !existingIds.has(sub.id))
    .map(sub => {
      const ov = approvalOverrides[sub.id];
      if (ov) {
        return {
          ...sub,
          statusKelulusan: ov.status,
          tarikhKelulusan: ov.date || sub.tarikhKelulusan,
          emailStatus: ov.emailStatus || sub.emailStatus,
          noSijil: ov.noSijil || sub.noSijil,
          certFileId: ov.certFileId || sub.certFileId,
          certPdfUrl: ov.certPdfUrl || sub.certPdfUrl || sub.pautanSijil,
          pautanSijil: ov.certPdfUrl || sub.pautanSijil,
          lastError: ov.lastError !== undefined ? ov.lastError : sub.lastError,
          emelPeserta: ov.emelPeserta || sub.emelPeserta
        };
      }
      return sub;
    });

  return [...uniqueLocal, ...updatedBaseData];
};

export const useDashboardData = () => {
  const [data, setData] = useState<DashboardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date>(new Date());

  const processRawDataList = useCallback((rawList: any[]): DashboardData[] => {
    const filtered = rawList.filter((item: any, index: number) => {
      const tsOri = String(getVal(item, ['Timestamp Ori', 'Timestamp Dibetulkan', 'Timestamp', 'ts_ori'])).trim();
      const nama = String(getVal(item, ['NAMA PENUH', 'NAMA PESERTA', 'NAMA', 'NAMA PENUH ORI'])).trim();
      const program = String(getVal(item, ['NAMA PROGRAM'])).trim();

      const tsUpper = tsOri.toUpperCase();
      if (tsUpper.includes('TIMESTAMP') || tsUpper.includes('TS_ORI') || tsUpper.includes('TIMESTAMPS')) {
        return false;
      }
      if (nama.toUpperCase() === 'NAMA PENUH' || nama.toUpperCase() === 'NAMA PESERTA' || program.toUpperCase() === 'NAMA PROGRAM') {
        return false;
      }

      // Valid if it has at least a timestamp, participant name, or program name
      return Boolean(tsOri || nama || program);
    });

    return filtered.map((item, index) => mapRawSheetItem(item, index));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let fetchSuccess = false;

    try {
      // Abort controller with 45s timeout for large sheets with thousands of rows
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await fetch(
        `${GOOGLE_SCRIPT_URL}?action=read&token=JAIS_PenilaianProgram2026&_t=${Date.now()}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        if (result.status === "success" && Array.isArray(result.data) && result.data.length > 0) {
          try {
            localStorage.setItem('JAIS_CACHED_SHEET_DATA', JSON.stringify(result.data));
          } catch (storageErr) {
            console.warn("Could not cache sheet data:", storageErr);
          }

          const mapped = processRawDataList(result.data);
          const finalData = applyOverridesAndLocalSubmissions(mapped);
          setData(finalData);
          setIsOffline(false);
          setLastFetchTime(new Date());
          fetchSuccess = true;
        }
      }
    } catch (err: any) {
      // Handle network errors, CORS restrictions or timeouts safely without tripping global error trackers
      console.warn("Makluman sambungan API Google Apps Script (menggunakan mod luar talian / sandaran):", err?.message || err);
    }

    if (!fetchSuccess) {
      setIsOffline(true);
      // Attempt 1: Load from cached sheet data in localStorage
      let cachedRaw: any[] | null = null;
      try {
        const cachedStr = localStorage.getItem('JAIS_CACHED_SHEET_DATA');
        if (cachedStr) {
          cachedRaw = JSON.parse(cachedStr);
        }
      } catch (parseErr) {
        console.warn("Could not parse cached sheet data:", parseErr);
      }

      if (cachedRaw && Array.isArray(cachedRaw) && cachedRaw.length > 0) {
        const mapped = processRawDataList(cachedRaw);
        const finalData = applyOverridesAndLocalSubmissions(mapped);
        setData(finalData);
      } else {
        // Attempt 2: Use authentic fallback dataset
        const finalData = applyOverridesAndLocalSubmissions(FALLBACK_DASHBOARD_DATA);
        setData(finalData);
      }
      setLastFetchTime(new Date());
    }

    setLoading(false);
  }, [processRawDataList]);

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

  const updateParticipantStatus = useCallback((
    id: string, 
    newStatus: 'TELAH DIHANTAR' | 'DILULUSKAN' | 'DITOLAK' | 'MENUNGGU', 
    options?: {
      dateStr?: string;
      emailStatus?: 'NOT_GENERATED' | 'PENDING' | 'GENERATING' | 'GENERATED' | 'SENT' | 'FAILED' | 'GENERATION_FAILED' | 'EMAIL_FAILED';
      noSijil?: string;
      certFileId?: string;
      certPdfUrl?: string;
      lastError?: string;
      emelPeserta?: string;
    }
  ) => {
    const formattedDate = options?.dateStr || new Date().toLocaleString('en-GB');

    try {
      const existingOverrides = JSON.parse(localStorage.getItem('JAIS_APPROVAL_OVERRIDES') || '{}');
      existingOverrides[id] = { 
        status: newStatus, 
        date: formattedDate,
        emailStatus: options?.emailStatus,
        noSijil: options?.noSijil,
        certFileId: options?.certFileId,
        certPdfUrl: options?.certPdfUrl,
        lastError: options?.lastError,
        emelPeserta: options?.emelPeserta || (existingOverrides[id] ? existingOverrides[id].emelPeserta : undefined)
      };
      localStorage.setItem('JAIS_APPROVAL_OVERRIDES', JSON.stringify(existingOverrides));
    } catch (e) {
      console.warn("Could not save approval override:", e);
    }

    setData(prevData => prevData.map(item => {
      if (item.id === id) {
        return {
          ...item,
          statusKelulusan: newStatus,
          tarikhKelulusan: formattedDate,
          ...(options?.emailStatus ? { emailStatus: options.emailStatus } : {}),
          ...(options?.noSijil ? { noSijil: options.noSijil } : {}),
          ...(options?.certFileId ? { certFileId: options.certFileId } : {}),
          ...(options?.certPdfUrl ? { certPdfUrl: options.certPdfUrl, pautanSijil: options.certPdfUrl } : {}),
          ...(options?.lastError !== undefined ? { lastError: options.lastError } : {}),
          ...(options?.emelPeserta ? { emelPeserta: options.emelPeserta } : {})
        };
      }
      return item;
    }));
  }, []);

  return { 
    rawData: data, 
    loading, 
    refreshData: fetchData, 
    lastFetchTime,
    stats,
    charts,
    updateParticipantStatus,
    isOffline
  };
};
