import { EvaluationFormData } from '../types';
import { CADANGAN_NAMA_PROGRAM } from '../NAMA_PROGRAM_CADANGAN';
import { sanitizeInput } from './security';

// URL Web App Google Apps Script lalai
export const DEFAULT_GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwNRuSnT1blgrh0xwHMXWdjVcMP9zz3CLcRsUxfiLGfr7aILlPxUf6hxU1lcbFbFP-iYg/exec";

// Dapatkan URL Web App berkuatkuasa (dari localStorage atau env atau lalai)
export const getEffectiveScriptUrl = (): string => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('JAIS_GAS_URL');
      if (stored && stored.trim().startsWith('https://script.google.com/')) {
        return stored.trim();
      }
    } catch (e) {}
  }
  return import.meta.env.VITE_GOOGLE_SCRIPT_URL || DEFAULT_GOOGLE_SCRIPT_URL;
};

// Simpan URL Web App baharu ke localStorage
export const setEffectiveScriptUrl = (url: string) => {
  if (typeof window !== 'undefined') {
    try {
      if (url && url.trim().startsWith('https://script.google.com/')) {
        localStorage.setItem('JAIS_GAS_URL', url.trim());
      } else {
        localStorage.removeItem('JAIS_GAS_URL');
      }
    } catch (e) {}
  }
};

export const GOOGLE_SCRIPT_URL = getEffectiveScriptUrl();

// Token keselamatan yang mesti sepadan dengan SETTINGS.SECRET_API_TOKEN dalam Code.gs
export const API_TOKEN = import.meta.env.VITE_API_TOKEN || "JAIS_PenilaianProgram2026";

/**
 * Pengurai respons selamat daripada Google Apps Script Web App
 */
const parseGasResponse = async (response: Response): Promise<any> => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    if (text.includes("Page not found") || text.includes("Sorry, unable to open the file")) {
      return {
        status: "error",
        code: "GAS_PAGE_NOT_FOUND",
        message: "Google Apps Script Web App mengembalikan 'Page not found'. Sila pastikan skrip telah di-Deploy semula dengan tetapan: 'Execute as: Me' dan 'Who has access: Anyone' (Sesiapa sahaja), dan salin URL Web App yang terbaharu."
      };
    }
    if (text.includes("accounts.google.com") || text.includes("ServiceLogin") || text.includes("Sign in")) {
      return {
        status: "error",
        code: "GAS_AUTH_REQUIRED",
        message: "Akses Google Web App disekat (memerlukan log masuk Google). Pastikan tetapan Deployment: 'Who has access' dipilih 'Anyone', bukan 'Only myself'."
      };
    }
    return {
      status: "error",
      code: "INVALID_RESPONSE",
      message: text && text.length < 200 ? text : "Respons daripada Google Apps Script bukan dalam format JSON yang sah."
    };
  }
};

/**
 * Uji sambungan ke Web App Google Apps Script
 */
export const testWebAppConnection = async (customUrl?: string): Promise<{ success: boolean; message: string; data?: any }> => {
  const targetUrl = customUrl?.trim() || getEffectiveScriptUrl();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    const response = await fetch(`${targetUrl}?action=read&token=${API_TOKEN}&_t=${Date.now()}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const result = await parseGasResponse(response);
    if (result.status === "success") {
      return {
        success: true,
        message: "✓ Sambungan ke Google Apps Script Web App berjaya dan sedia beroperasi!",
        data: result.data
      };
    } else {
      return {
        success: false,
        message: result.message || "Gagal berhubung dengan Google Apps Script."
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Ralat rangkaian semasa menghubungi Web App URL."
    };
  }
};

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
      nama_program_ori: sanitizeInput(data.namaProgram),
      bahagian_ori: sanitizeInput(data.bahagianProgram),
      tempat_ori: sanitizeInput(data.tempatProgram),
      tarikh_mula_ori: sanitizeInput(data.tarikhMula),
      tempoh: sanitizeInput(data.tempohProgram),
      penganjur_utama_ori: sanitizeInput(data.penganjurUtama),

      // Bahagian B: Maklumat Peserta
      nama_penuh_ori: sanitizeInput(data.namaPenuh),
      no_kp: sanitizeInput(data.noKadPengenalan || ''),
      emel_peserta: sanitizeInput(data.emel || '').toLowerCase().trim(),
      jantina: sanitizeInput(data.jantina),
      umur: sanitizeInput(data.umur),
      pendidikan: sanitizeInput(data.tarafPendidikan),

      // Status Kelulusan Default
      status_kelulusan: 'MENUNGGU',
      email_status: 'PENDING',
      pautan_sijil: 'https://drive.google.com/drive/folders/1Pkljy_Dg6YvPhKKGWsG9uvIp5qQjCIlY?usp=sharing',

      // Bahagian C: Penilaian (Skor)
      skor_logistik: data.ratingTarikhMasa,
      skor_pengisian: data.ratingPengisian,
      skor_jamuan: data.ratingJamuan || 0,
      skor_pembentang: data.ratingFasilitator || 0,
      skor_urusetia: data.ratingUrusetia,
      skor_keseluruhan: data.ratingKeseluruhan,

      // Bahagian D: Komen & Cadangan
      cadangan: sanitizeInput(data.cadanganProgram || ''), 
      komen_program: sanitizeInput(data.komenProgram || '')
    }
  };

  const saveLocalRecord = () => {
    try {
      const localRecord = {
        id: `SUB-${Date.now()}`,
        timestamp: currentTimestamp,
        programDate: data.tarikhMula,
        filterTahun: data.tarikhMula ? data.tarikhMula.substring(0, 4) : String(new Date().getFullYear()),
        bahagian: data.bahagianProgram || '',
        tempat: data.tempatProgram || '',
        penganjur: data.penganjurUtama || '',
        jantina: data.jantina || '',
        umur: data.umur || '',
        quarter: 'Q' + Math.ceil((new Date().getMonth() + 1) / 3),
        tarafPendidikan: data.tarafPendidikan || '',
        namaPeserta: data.namaPenuh || '',
        noKpPeserta: data.noKadPengenalan || '',
        emelPeserta: (data.emel || '').toLowerCase().trim(),
        statusKelulusan: 'MENUNGGU',
        emailStatus: 'PENDING',
        tarikhKelulusan: '',
        pautanSijil: 'https://drive.google.com/drive/folders/1Pkljy_Dg6YvPhKKGWsG9uvIp5qQjCIlY?usp=sharing',
        skorLogistik: data.ratingTarikhMasa || 0,
        skorPengisian: data.ratingPengisian || 0,
        skorJamuan: data.ratingJamuan || 0,
        skorFasilitator: data.ratingFasilitator || 0,
        skorUrusetia: data.ratingUrusetia || 0,
        skorKeseluruhan: data.ratingKeseluruhan || 0,
        skorFormula: data.ratingKeseluruhan || 0,
        programName: data.namaProgram || '',
        komen: data.komenProgram || '',
        cadangan: data.cadanganProgram || ''
      };
      const existing = JSON.parse(localStorage.getItem('JAIS_LOCAL_SUBMISSIONS') || '[]');
      localStorage.setItem('JAIS_LOCAL_SUBMISSIONS', JSON.stringify([localRecord, ...existing.slice(0, 49)]));
    } catch (cacheErr) {
      console.warn("Could not save submission to local storage:", cacheErr);
    }
  };

  try {
    const url = getEffectiveScriptUrl();
    const response = await fetch(url, {
      method: "POST",
      // Gunakan text/plain untuk mengelakkan isu CORS preflight pada Google Apps Script
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload)
    });

    const result = await parseGasResponse(response);
    
    // Semak respons daripada Code.gs (responseJSON("success", ...))
    if (result.status !== 'success') {
      throw new Error(result.message || 'Ralat semasa menghantar borang.');
    }

    saveLocalRecord();
    return result;
  } catch (error: any) {
    console.warn("Submission network warning (Load failed / CORS / Offline), falling back to local storage:", error?.message || error);
    saveLocalRecord();
    return {
      status: 'success',
      message: 'Borang berjaya direkodkan secara lokal (Mod Luar Talian).'
    };
  }
};

export const fetchPrograms = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    const url = getEffectiveScriptUrl();

    const response = await fetch(`${url}?action=read&token=${API_TOKEN}&_t=${new Date().getTime()}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await parseGasResponse(response);
      if (result.status === "success" && Array.isArray(result.data)) {
        const names = new Set<string>();
        result.data.forEach((item: any) => {
          const name = item['NAMA PROGRAM'] ? String(item['NAMA PROGRAM']).toUpperCase().trim() : '';
          if (name && name !== 'NAMA PROGRAM' && name !== 'PROGRAM TIDAK DINYATAKAN') {
            names.add(name);
          }
        });
        if (names.size > 0) {
          return Array.from(names).sort();
        }
      }
    }
    return CADANGAN_NAMA_PROGRAM;
  } catch (error: any) {
    console.warn("Notice: fetchPrograms using local program list fallback:", error?.message || error);
    return CADANGAN_NAMA_PROGRAM;
  }
};

/**
 * Tindakan: Luluskan Peserta Sahaja (Tukar status kelulusan kepada DILULUSKAN)
 */
export const approveParticipant = async (params: {
  id: string;
  emel?: string;
  nama?: string;
}) => {
  const payload = {
    token: API_TOKEN,
    action: "approve_participant",
    participantId: params.id,
    id: params.id,
    emel_peserta: (params.emel || '').trim(),
    nama_peserta: (params.nama || '').trim()
  };

  try {
    const url = getEffectiveScriptUrl();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload)
    });

    const result = await parseGasResponse(response);
    return result;
  } catch (error: any) {
    console.warn("GAS approveParticipant notice:", error?.message || error);
    return {
      status: "error",
      code: "NETWORK_ERROR",
      message: error?.message || "Gagal menghubungi Google Apps Script untuk kelulusan."
    };
  }
};

/**
 * Tindakan: Kemaskini Emel Peserta terus ke Lajur AJ (Col 36) Google Sheet
 */
export const updateParticipantEmail = async (params: {
  id: string;
  emel: string;
  nama?: string;
}) => {
  const payload = {
    token: API_TOKEN,
    action: "update_participant_email",
    participantId: params.id,
    id: params.id,
    emel_peserta: (params.emel || '').trim(),
    nama_peserta: (params.nama || '').trim()
  };

  try {
    const url = getEffectiveScriptUrl();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload)
    });

    const result = await parseGasResponse(response);
    return result;
  } catch (error: any) {
    console.warn("GAS updateParticipantEmail notice:", error?.message || error);
    return {
      status: "error",
      code: "NETWORK_ERROR",
      message: error?.message || "Gagal mengemas kini emel peserta ke Google Sheet."
    };
  }
};

/**
 * Tindakan: Jana Sijil Peserta yang telah DILULUSKAN (Google Slides -> PDF -> Google Drive -> Gmail)
 */
export const generateCertificate = async (params: {
  id: string;
  nama?: string;
  ic?: string;
  emel?: string;
  namaProgram?: string;
  tarikhProgram?: string;
  tempatProgram?: string;
  certificateFolderUrl?: string;
}) => {
  const payload = {
    token: API_TOKEN,
    action: "generate_certificate",
    participantId: params.id,
    id: params.id,
    nama_peserta: (params.nama || '').trim(),
    no_kp: (params.ic || '').trim(),
    emel_peserta: (params.emel || '').trim(),
    nama_program: (params.namaProgram || '').trim(),
    tarikh_program: (params.tarikhProgram || '').trim(),
    tempat_program: (params.tempatProgram || '').trim(),
    certificate_folder_url: params.certificateFolderUrl || 'https://drive.google.com/drive/folders/1Pkljy_Dg6YvPhKKGWsG9uvIp5qQjCIlY?usp=sharing'
  };

  try {
    const url = getEffectiveScriptUrl();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload)
    });

    const result = await parseGasResponse(response);
    return result;
  } catch (error: any) {
    console.warn("GAS generateCertificate notice:", error?.message || error);
    return {
      status: "error",
      code: "NETWORK_ERROR",
      message: error?.message || "Gagal menghubungi perkhidmatan Google Apps Script untuk penjanaan sijil."
    };
  }
};

/**
 * Tindakan: Lulus & Jana E-Sijil serta Hantar Emel Automatik
 */
export const approveAndGenerateCertificate = async (params: {
  id: string;
  nama: string;
  ic?: string;
  emel: string;
  namaProgram: string;
  tarikhProgram?: string;
  tempatProgram?: string;
  certificateFolderUrl?: string;
}) => {
  const payload = {
    token: API_TOKEN,
    action: "approve_and_generate_certificate",
    id: params.id,
    nama_peserta: params.nama,
    no_kp: params.ic || '',
    emel_peserta: params.emel,
    nama_program: params.namaProgram,
    tarikh_program: params.tarikhProgram || '',
    tempat_program: params.tempatProgram || '',
    certificate_folder_url: params.certificateFolderUrl || 'https://drive.google.com/drive/folders/1Pkljy_Dg6YvPhKKGWsG9uvIp5qQjCIlY?usp=sharing'
  };

  try {
    const url = getEffectiveScriptUrl();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload)
    });

    const result = await parseGasResponse(response);
    return result;
  } catch (error: any) {
    console.warn("GAS approve_and_generate_certificate notice:", error?.message || error);
    return {
      status: "error",
      code: "NETWORK_ERROR",
      message: error?.message || "Gagal menghubungi perkhidmatan Google Apps Script."
    };
  }
};

/**
 * Tindakan: Hantar Semula Sijil Sedia Ada (Tanpa jana semula fail PDF)
 */
export const resendCertificateEmail = async (params: {
  id: string;
  certFileId?: string;
  emel: string;
  nama: string;
  namaProgram: string;
  noSijil?: string;
  ic?: string;
  tarikhProgram?: string;
  tempatProgram?: string;
}) => {
  const payload = {
    token: API_TOKEN,
    action: "resend_certificate_email",
    id: params.id,
    cert_file_id: params.certFileId || '',
    emel_peserta: params.emel,
    nama_peserta: params.nama,
    nama_program: params.namaProgram,
    no_sijil: params.noSijil || '',
    ic: params.ic || '',
    tarikh_program: params.tarikhProgram || '',
    tempat_program: params.tempatProgram || ''
  };

  try {
    const url = getEffectiveScriptUrl();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload)
    });

    const result = await parseGasResponse(response);
    return result;
  } catch (error: any) {
    console.warn("GAS resend_certificate_email notice:", error?.message || error);
    return {
      status: "error",
      code: "NETWORK_ERROR",
      message: error?.message || "Gagal menghubungi perkhidmatan Google Apps Script untuk penghantaran semula."
    };
  }
};

/**
 * Tindakan: Simpan Sijil PDF-Lib ke Google Drive
 * Mengikut arahan: Secara lalai emel TIDAK dihantar (sendEmail: false) kecuali diminta secara khusus
 */
export const savePdfLibCertificate = async (params: {
  id: string;
  pdfBase64: string;
  nama: string;
  ic?: string;
  emel: string;
  namaProgram: string;
  noSijil?: string;
  tarikhProgram?: string;
  tempatProgram?: string;
  certificateFolderUrl?: string;
  sendEmail?: boolean;
}) => {
  const payload = {
    token: API_TOKEN,
    action: "save_pdflib_certificate",
    id: params.id,
    participantId: params.id,
    pdf_base64: params.pdfBase64,
    nama_peserta: (params.nama || '').trim(),
    no_kp: (params.ic || '').trim(),
    emel_peserta: (params.emel || '').trim(),
    nama_program: (params.namaProgram || '').trim(),
    no_sijil: (params.noSijil || '').trim(),
    tarikh_program: (params.tarikhProgram || '').trim(),
    tempat_program: (params.tempatProgram || '').trim(),
    certificate_folder_url: params.certificateFolderUrl || 'https://drive.google.com/drive/folders/1Pkljy_Dg6YvPhKKGWsG9uvIp5qQjCIlY?usp=sharing',
    send_email: params.sendEmail === true
  };

  try {
    const url = getEffectiveScriptUrl();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload)
    });

    const result = await parseGasResponse(response);
    return result;
  } catch (error: any) {
    console.warn("GAS save_pdflib_certificate notice:", error?.message || error);
    return {
      status: "error",
      code: "NETWORK_ERROR",
      message: error?.message || "Gagal menghubungi perkhidmatan Google Apps Script untuk menyimpan sijil PDF-Lib."
    };
  }
};

/**
 * Tindakan: Simpan Sijil PDF-Lib ke Google Drive & Hantar Emel (Alias / Sandaran)
 */
export const savePdfLibCertificateAndSendEmail = async (params: {
  id: string;
  pdfBase64: string;
  nama: string;
  ic?: string;
  emel: string;
  namaProgram: string;
  noSijil?: string;
  tarikhProgram?: string;
  tempatProgram?: string;
  certificateFolderUrl?: string;
  sendEmail?: boolean;
}) => {
  return savePdfLibCertificate(params);
};

/**
 * Tindakan: Uji Penghantaran Sijil ke Emel Pentadbir (+ Uji Emel Anda)
 */
export const sendTestCertificateEmail = async (params: {
  recipientEmail: string;
  nama?: string;
  ic?: string;
  namaProgram?: string;
  tarikh?: string;
  tempat?: string;
}) => {
  const payload = {
    token: API_TOKEN,
    action: "test_certificate_email",
    recipient_email: params.recipientEmail,
    nama: params.nama || "PENTADBIR SISTEM JAIS",
    ic: params.ic || "900101-13-1234",
    nama_program: params.namaProgram || "KURSUS PENGURUSAN DAN PENILAIAN PROGRAM JAIS",
    tarikh: params.tarikh || new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' }),
    tempat: params.tempat || "IBU PEJABAT JAIS, KUCHING"
  };

  try {
    const url = getEffectiveScriptUrl();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload)
    });

    const result = await parseGasResponse(response);
    return result;
  } catch (error: any) {
    console.warn("GAS test_certificate_email notice:", error?.message || error);
    return {
      status: "error",
      code: "NETWORK_ERROR",
      message: error?.message || "Gagal menghantar sijil ujian."
    };
  }
};

// Aliased for backwards compatibility
export const approveParticipantEvaluation = approveAndGenerateCertificate;

