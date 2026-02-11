import { EvaluationFormData } from '../types';

// URL Web App Google Apps Script anda
export const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzW9-SB9ViE-Z7vYJLDDuywLzUv_BazsCLUiuDWt3AK8V8zphgC6ijbPoUY50qJv4L8Pg/exec";

// Token keselamatan yang mesti sepadan dengan SETTINGS.SECRET_API_TOKEN dalam Code.gs
const API_TOKEN = "JAIS_PenilaianProgram2026";

export const submitEvaluation = async (data: EvaluationFormData) => {
  // Format tarikh semasa untuk 'ts_ori'
  const currentTimestamp = new Date().toLocaleString('en-GB', { 
    day: '2-digit', month: '2-digit', year: 'numeric', 
    hour: '2-digit', minute: '2-digit', second: '2-digit' 
  });

  // Struktur payload yang dikehendaki oleh Code.gs:
  // { token, action, updates: { ...data } }
  const payload = {
    token: API_TOKEN,
    action: "create",
    updates: {
      // Metadata
      ts_ori: currentTimestamp,
      
      // Bahagian A: Maklumat Program
      nama_program_ori: data.namaProgram,
      bahagian_ori: data.bahagianProgram,
      tempat_ori: data.tempatProgram,
      tarikh_mula_ori: data.tarikhMula,
      tempoh: data.tempohProgram,
      penganjur_utama_ori: data.penganjurUtama,

      // Bahagian B: Maklumat Peserta
      jantina: data.jantina,
      umur: data.umur,
      pendidikan: data.tarafPendidikan,

      // Bahagian C: Penilaian (Skor)
      // Key mestilah sama dengan getHeaderMap() dalam Code.gs
      skor_logistik: data.ratingTarikhMasa,   // Map kepada 'Tarikh Masa dan Tempat'
      skor_pengisian: data.ratingPengisian,
      skor_jamuan: data.ratingJamuan || 0,
      skor_pembentang: data.ratingFasilitator || 0,
      skor_urusetia: data.ratingUrusetia,
      skor_keseluruhan: data.ratingKeseluruhan,

      // Bahagian D: Komen & Cadangan
      cadangan: data.cadanganProgram, 
      komen_program: data.komenProgram
    }
  };

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      // Gunakan text/plain untuk mengelakkan isu CORS preflight pada Google Apps Script
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    // Semak respons daripada Code.gs (responseJSON("success", ...))
    if (result.status !== 'success') {
      throw new Error(result.message || 'Ralat semasa menghantar borang.');
    }

    return result;
  } catch (error) {
    console.error("Submission Error:", error);
    throw error;
  }
};