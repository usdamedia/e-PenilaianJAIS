/**
 * ==============================================================================
 * SISTEM E-PENILAIAN PROGRAM JAIS - GOOGLE APPS SCRIPT WRAPPER
 * ==============================================================================
 * PERHATIAN UNTUK PENTADBIR GOOGLE APPS SCRIPT:
 * Fail ini ialah modul TypeScript (.ts) untuk aplikasi React.
 * JANGAN salin baris 'export const ...' ini ke dalam Google Apps Script (Code.gs)!
 * Jika disalin, Apps Script akan mengeluarkan ralat:
 * "Syntax error: SyntaxError: Unexpected token 'export'"
 *
 * UNTUK MENDAPATKAN KOD CODE.GS YANG SAH:
 * 1. Buka fail 'Code.gs' di direktori utama projek ini, ATAU
 * 2. Dalam dashboard Admin > Pengesahan Sijil & Emel > Klik "Skrip Google Apps Script",
 *    dan tekan butang "Salin Kod Penuh" / "Muat Turun Code.gs".
 * ==============================================================================
 */

export const CERTIFICATE_DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/1Pkljy_Dg6YvPhKKGWsG9uvIp5qQjCIlY?usp=sharing";
export const CERTIFICATE_DRIVE_FOLDER_ID = "1Pkljy_Dg6YvPhKKGWsG9uvIp5qQjCIlY";

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ==============================================================================
 * SISTEM E-PENILAIAN PROGRAM JAIS - GOOGLE APPS SCRIPT (Code.gs)
 * MODUL PENJANAAN E-SIJIL & PENGHANTARAN EMEL AUTOMATIK
 * ==============================================================================
 * 
 * ALIRAN PENJANAAN SIJIL ("LULUS & EMEL"):
 * 1. React menghantar permintaan pengesahan ke Google Apps Script.
 * 2. Skrip membuat pengesahan data: Nama, IC, Emel sah, Program, Tarikh, Tempat.
 * 3. Menjana Nombor Sijil Unik: Format "JAIS/YYYY/MM/00001".
 * 4. Membuat salinan sementara Google Slides daripada Template Sijil.
 * 5. Menggantikan pemegang tempat (placeholders):
 *    - {{NAMA}}
 *    - {{IC}}
 *    - {{NAMA_PROGRAM}}
 *    - {{TARIKH}}
 *    - {{TEMPAT}}
 *    - {{NO_SIJIL}}
 * 6. Mengeksport dokumen Google Slides sebagai fail PDF.
 * 7. Menyimpan fail PDF ke folder Google Drive sijil yang dikonfigurasi.
 * 8. Menyimpan ID fail PDF dan URL ke dalam Google Sheets.
 * 9. Menghantar fail PDF sebagai lampiran emel (attachment) melalui Gmail / MailApp.
 * 10. Selepas penghantaran emel berjaya:
 *     - Set Status = TELAH DIHANTAR
 *     - Set Email Status = SENT
 *     - Set Emailed At = Timestamp
 * 11. Memadam salinan sementara Google Slides.
 * 
 * PENGENDALIAN RALAT:
 * - Jika penjanaan sijil gagal:
 *   * Status TIDAK ditanda TELAH DIHANTAR.
 *   * Email Status = GENERATION_FAILED.
 *   * Simpan mesej ralat & pulangkan ralat berstruktur ke React.
 * - Jika penjanaan PDF berjaya tetapi emel gagal:
 *   * Simpan fail PDF sedia ada.
 *   * Email Status = EMAIL_FAILED.
 *   * Simpan URL Sijil & ID Fail.
 *   * Membenarkan admin klik "Hantar Semula" tanpa menjana sijil baharu.
 * 
 * HANTAR SEMULA (RESEND EMAIL):
 * - Mengambil fail PDF sedia ada dari Google Drive menggunakan ID Fail.
 * - Menghantar semula fail PDF yang sama sebagai lampiran emel.
 * - Kemaskini Email Status = SENT dan Emailed At.
 * ==============================================================================
 */

// KONFIGURASI PENTADBIR
const SETTINGS = {
  SECRET_API_TOKEN: "JAIS_PenilaianProgram2026",
  
  // ID Folder Google Drive untuk menyimpan PDF sijil yang dijana
  CERTIFICATE_FOLDER_ID: "1Pkljy_Dg6YvPhKKGWsG9uvIp5qQjCIlY",
  
  // ID Fail Google Slides Template Sijil (Template Rasmi)
  TEMPLATE_SLIDES_ID: "1js7kg-0urjtcoTUKLge_wIHZhyGa3G1wut4lvQ6EVm0",
  
  SENDER_NAME: "Jabatan Agama Islam Sarawak (e-Penilaian)",
  SHEET_NAME: "DataProgramCleaned"
};

/**
 * Handle HTTP GET Requests (Membaca data untuk Dashboard)
 */
function doGet(e) {
  try {
    const token = e && e.parameter ? e.parameter.token : "";
    if (token !== SETTINGS.SECRET_API_TOKEN) {
      return responseJSON("error", "Akses tidak dibenarkan: Token keselamatan tidak sah.");
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SETTINGS.SHEET_NAME) || ss.getActiveSheet();

    // Pastikan header Lajur AI (Col 35) dan Lajur AJ (Col 36) wujud
    ensureCertificateColumnsExist(sheet);

    const data = sheet.getDataRange().getValues();

    if (data.length < 1) {
      return responseJSON("success", "Tiada data", []);
    }

    const headers = data[0].map(function(h) { return String(h).trim(); });
    const rows = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.every(function(cell) { return cell === "" || cell === null; })) continue;

      const rowObj = {
        row_index: i + 1,
        ID: "JAIS-" + (i + 1)
      };

      headers.forEach(function(h, colIndex) {
        let val = row[colIndex];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone() || "GMT+8", "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
        }
        if (h) {
          rowObj[h] = val;
        }
      });

      // =========================================================================
      // PEMETAAN KHAS: LAJUR AI (Col 35, index 34) & LAJUR AJ (Col 36, index 35)
      // =========================================================================
      const valColAI = row.length > 34 && row[34] !== undefined && row[34] !== null ? String(row[34]).trim() : "";
      const valColAJ = row.length > 35 && row[35] !== undefined && row[35] !== null ? String(row[35]).trim() : "";

      rowObj["COLUMN_AI"] = valColAI;
      rowObj["COLUMN_AJ"] = valColAJ;

      // Pemetaan Nama Peserta dari Lajur AI
      if (valColAI) {
        rowObj["NAMA_PESERTA_COL_AI"] = valColAI;
        if (!rowObj["NAMA PESERTA"] || String(rowObj["NAMA PESERTA"]).trim() === "") {
          rowObj["NAMA PESERTA"] = valColAI;
        }
        if (!rowObj["NAMA PENUH"] || String(rowObj["NAMA PENUH"]).trim() === "" || String(rowObj["NAMA PENUH"]).trim() === "-") {
          rowObj["NAMA PENUH"] = valColAI;
        }
      }

      // Pemetaan Emel Peserta dari Lajur AJ (Col 36, index 35)
      // Jika Lajur AJ kosong atau tiada '@', semak jika lajur sebelah (AK, index 36) mempunyai emel
      let effectiveEmail = valColAJ;
      if (!effectiveEmail || effectiveEmail.indexOf("@") === -1) {
        const valColAK = row.length > 36 && row[36] !== undefined && row[36] !== null ? String(row[36]).trim() : "";
        if (valColAK && valColAK.indexOf("@") !== -1) {
          effectiveEmail = valColAK;
        } else if (rowObj["EMEL PESERTA"] && String(rowObj["EMEL PESERTA"]).indexOf("@") !== -1) {
          effectiveEmail = String(rowObj["EMEL PESERTA"]).trim();
        }
      }

      if (effectiveEmail) {
        rowObj["EMEL_PESERTA_COL_AJ"] = effectiveEmail;
        rowObj["EMEL PESERTA"] = effectiveEmail;
        rowObj["EMAIL"] = effectiveEmail;
        rowObj["EMEL"] = effectiveEmail;
      }

      rows.push(rowObj);
    }

    return responseJSON("success", "Data berjaya dimuat", rows);
  } catch (err) {
    return responseJSON("error", err.toString());
  }
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  try {
    let requestData;
    try {
      requestData = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return responseJSON("error", "Format JSON tidak sah: " + parseErr.message);
    }

    const token = requestData.token;
    if (token !== SETTINGS.SECRET_API_TOKEN) {
      return responseJSON("error", "Akses tidak dibenarkan: Token keselamatan tidak sah.");
    }

    const action = requestData.action;

    // 1. Simpan Borang Penilaian Peserta Baharu
    if (action === "create") {
      return handleCreateSubmission(requestData.updates);
    }

    // 2. Kemaskini Emel Peserta Terus ke Lajur AJ (Col 36)
    if (action === "update_participant_email" || action === "update_email") {
      return handleUpdateParticipantEmail(requestData);
    }

    // 3. Luluskan Peserta Sahaja (Status = DILULUSKAN)
    if (action === "approve_participant" || action === "update_status") {
      return handleApproveParticipant(requestData);
    }

    // 4. Jana Sijil Peserta Yang Telah DILULUSKAN (Google Slides -> PDF -> Drive -> Email)
    if (action === "generate_certificate" || action === "generateCertificate" || action === "approve_and_generate_certificate") {
      return handleGenerateCertificate(requestData);
    }

    // 5. Simpan Sijil PDF-Lib (Dihasilkan melalui PDF-Lib) ke Drive & Emel ke Peserta
    if (action === "save_pdflib_certificate" || action === "savePdfLibCertificate") {
      return handleSavePdfLibCertificate(requestData);
    }

    // 6. Hantar Emel Sijil Sedia Ada (Tanpa jana semula PDF)
    if (action === "send_certificate_email" || action === "resend_certificate_email") {
      return handleResendCertificateEmail(requestData);
    }

    // 7. Uji Penghantaran Sijil ke Emel Admin (+ Uji Emel Anda)
    if (action === "test_certificate_email") {
      return handleTestCertificateEmail(requestData);
    }

    return responseJSON("error", "Tindakan 'action' tidak dikenali: " + action);
  } catch (err) {
    return responseJSON("error", err.toString());
  }
}

/**
 * Pastikan lajur-lajur penting wujud dalam Google Sheet, khususnya:
 * - Lajur AI (Column 35): NAMA PESERTA / NAMA PENUH
 * - Lajur AJ (Column 36): EMEL PESERTA
 */
function ensureCertificateColumnsExist(sheet) {
  // 1. Pastikan Lajur 35 (Column AI) mempunyai header
  const col35Header = String(sheet.getRange(1, 35).getValue() || "").trim();
  if (!col35Header) {
    sheet.getRange(1, 35).setValue("NAMA PESERTA");
  }

  // 2. Pastikan Lajur 36 (Column AJ) mempunyai header "EMEL PESERTA"
  const col36Header = String(sheet.getRange(1, 36).getValue() || "").trim();
  if (!col36Header || col36Header.toUpperCase() === "NO KAD PENGENALAN" || (!col36Header.toUpperCase().includes("EMEL") && !col36Header.toUpperCase().includes("EMAIL"))) {
    sheet.getRange(1, 36).setValue("EMEL PESERTA");
  }

  const lastCol = Math.max(sheet.getLastColumn(), 36);
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
    return String(h).trim().toUpperCase();
  });

  const requiredHeaders = [
    "STATUS KELULUSAN",
    "EMAIL STATUS",
    "NO SIJIL",
    "TARIKH KELULUSAN",
    "PAUTAN SIJIL",
    "CERT FILE ID",
    "LAST ERROR"
  ];

  requiredHeaders.forEach(function(h) {
    if (currentHeaders.indexOf(h) === -1) {
      const nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue(h);
      currentHeaders.push(h);
    }
  });
}

/**
 * Pengendali: Kemas kini Emel Peserta terus ke Lajur AJ (Col 36) Google Sheet
 */
function handleUpdateParticipantEmail(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SETTINGS.SHEET_NAME) || ss.getActiveSheet();
  ensureCertificateColumnsExist(sheet);

  const participantId = data.participantId || data.id || "";
  const sheetRow = findParticipantRow(sheet, participantId, data.emel_peserta, data.nama_peserta);
  if (sheetRow <= 1) {
    return responseJSON("error", "Peserta tidak dijumpai dalam pangkalan data.", { code: "NOT_FOUND" });
  }

  const newEmail = (data.emel_peserta || data.emel || data.email || "").trim().toLowerCase();
  if (!newEmail || newEmail.indexOf("@") === -1) {
    return responseJSON("error", "Format alamat emel tidak sah (" + newEmail + ").");
  }

  // Tulis terus ke Lajur AJ (Column 36)
  sheet.getRange(sheetRow, 36).setValue(newEmail);

  return responseJSON("success", "Emel berjaya dikemaskini ke Lajur AJ Google Sheet.", {
    id: participantId,
    email: newEmail,
    row: sheetRow
  });
}

/**
 * Format nombor sijil unik: JAIS-YYYY-00001
 * Tidak berubah jika peserta sudah mempunyai NO SIJIL
 */
function generateUniqueCertificateNumber(existingNoSijil) {
  if (existingNoSijil && String(existingNoSijil).trim().length > 4) {
    return String(existingNoSijil).trim();
  }
  const now = new Date();
  const year = Utilities.formatDate(now, "GMT+8", "yyyy");
  const propKey = "CERT_SEQ_" + year;

  const scriptProps = PropertiesService.getScriptProperties();
  let currentSeq = parseInt(scriptProps.getProperty(propKey) || "0", 10);
  currentSeq += 1;
  scriptProps.setProperty(propKey, currentSeq.toString());

  const paddedSeq = ("00000" + currentSeq).slice(-5);
  return "JAIS-" + year + "-" + paddedSeq;
}

/**
 * 2. Pengendali: Luluskan Peserta Sahaja (Status = DILULUSKAN)
 */
function handleApproveParticipant(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SETTINGS.SHEET_NAME) || ss.getActiveSheet();
  ensureCertificateColumnsExist(sheet);

  const participantId = data.participantId || data.id || "";
  const sheetRow = findParticipantRow(sheet, participantId, data.emel_peserta, data.nama_peserta);
  if (sheetRow <= 1) {
    return responseJSON("error", "Peserta tidak dijumpai dalam pangkalan data.", { code: "NOT_FOUND" });
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) {
    return String(h).trim().toUpperCase();
  });
  const colStatus = headers.indexOf('STATUS KELULUSAN') + 1;
  const colEmailStatus = headers.indexOf('EMAIL STATUS') + 1;
  const colTarikhLulus = headers.indexOf('TARIKH KELULUSAN') + 1;

  const currentTimestamp = Utilities.formatDate(new Date(), "GMT+8", "dd/MM/yyyy HH:mm:ss");

  if (colStatus > 0) sheet.getRange(sheetRow, colStatus).setValue("DILULUSKAN");
  if (colEmailStatus > 0) {
    const currentVal = sheet.getRange(sheetRow, colEmailStatus).getValue();
    if (!currentVal || currentVal === "PENDING") {
      sheet.getRange(sheetRow, colEmailStatus).setValue("NOT_GENERATED");
    }
  }
  if (colTarikhLulus > 0) sheet.getRange(sheetRow, colTarikhLulus).setValue(currentTimestamp);

  return responseJSON("success", "Peserta berjaya diluluskan. Butang Jana Sijil kini diaktifkan.", {
    id: participantId,
    status: "DILULUSKAN",
    date: currentTimestamp
  });
}

/**
 * 3. Pengendali: "JANA SIJIL" (Google Slides -> PDF -> Drive -> Gmail)
 * Mendapatkan data sebenar daripada Google Sheet sebagai Source of Truth
 */
function handleGenerateCertificate(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SETTINGS.SHEET_NAME) || ss.getActiveSheet();
  
  ensureCertificateColumnsExist(sheet);

  const participantId = data.participantId || data.id || "";
  
  // 1. CARI REKOD PESERTA DALAM GOOGLE SHEET SEBAGAI SOURCE OF TRUTH
  const sheetRow = findParticipantRow(sheet, participantId, data.emel_peserta, data.nama_peserta);
  if (sheetRow <= 1) {
    return responseJSON("error", "Peserta tidak dijumpai dalam pangkalan data.", {
      code: "PARTICIPANT_NOT_FOUND"
    });
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) {
    return String(h).trim().toUpperCase();
  });
  const rowData = sheet.getRange(sheetRow, 1, 1, sheet.getLastColumn()).getValues()[0];

  function getColVal(headerName) {
    const idx = headers.indexOf(headerName);
    return idx >= 0 ? rowData[idx] : "";
  }

  const colStatus = headers.indexOf('STATUS KELULUSAN') + 1;
  const colEmailStatus = headers.indexOf('EMAIL STATUS') + 1;
  const colNoSijil = headers.indexOf('NO SIJIL') + 1;
  const colTarikhLulus = headers.indexOf('TARIKH KELULUSAN') + 1;
  const colPautanSijil = headers.indexOf('PAUTAN SIJIL') + 1;
  const colCertFileId = headers.indexOf('CERT FILE ID') + 1;
  const colLastError = headers.indexOf('LAST ERROR') + 1;

  // Baca maklumat sebenar daripada Sheet (dengan fallback input frontend jika lajur kosong)
  const currentStatus = String(getColVal('STATUS KELULUSAN') || "").trim().toUpperCase();
  const currentEmailStatus = String(getColVal('EMAIL STATUS') || "").trim().toUpperCase();
  const existingNoSijil = String(getColVal('NO SIJIL') || "").trim();
  const existingCertUrl = String(getColVal('PAUTAN SIJIL') || "").trim();
  const existingCertFileId = String(getColVal('CERT FILE ID') || "").trim();

  // Nama Peserta: semak Lajur AI (Col 35, index 34) dahulu, kemudian header NAMA PENUH / NAMA PESERTA
  const valColAI = rowData.length > 34 && rowData[34] ? String(rowData[34]).trim() : "";
  const participantName = String(valColAI || getColVal('NAMA PENUH') || getColVal('NAMA PESERTA') || data.nama_peserta || "").trim();
  
  const participantIC = String(getColVal('NO KAD PENGENALAN') || data.no_kp || data.ic || "").trim();
  
  // Emel Peserta: semak Lajur AJ (Col 36, index 35) dahulu, kemudian header EMEL PESERTA / input frontend
  const valColAJ = rowData.length > 35 && rowData[35] ? String(rowData[35]).trim() : "";
  const rawEmail = String(valColAJ || getColVal('EMEL PESERTA') || getColVal('EMEL') || data.emel_peserta || "").trim();
  const participantEmail = rawEmail.toLowerCase();

  // Jika emel dibekalkan dari borang/frontend dan Lajur AJ masih kosong, simpan ke Lajur AJ (Col 36)
  if (participantEmail && (!valColAJ || valColAJ === "")) {
    try {
      sheet.getRange(sheetRow, 36).setValue(participantEmail);
    } catch (saveEmailErr) {}
  }

  const programName = String(getColVal('NAMA PROGRAM') || data.nama_program || "").trim();
  const programDate = String(getColVal('TARIKH MULA PROGRAM') || data.tarikh_program || "").trim();
  const programVenue = String(getColVal('TEMPAT PROGRAM DILAKSANA') || data.tempat_program || "").trim();

  // 2. VALIDATION 1: STATUS MESTI TELAH DILULUSKAN (APPROVED)
  if (data.action !== "approve_and_generate_certificate") {
    if (currentStatus !== "DILULUSKAN" && currentStatus !== "APPROVED" && currentStatus !== "TELAH DIHANTAR") {
      return responseJSON("error", "Peserta belum diluluskan. Sila klik 'Luluskan' terlebih dahulu sebelum menjana sijil.", {
        code: "NOT_APPROVED"
      });
    }
  }

  // 3. VALIDATION 2: NAMA, EMEL, PROGRAM WAJIB ADA & EMEL SAH
  if (!participantName) {
    return responseJSON("error", "Nama peserta tidak lengkap dalam rekod pangkalan data.", {
      code: "MISSING_NAME"
    });
  }

  if (!participantEmail) {
    return responseJSON("error", "Alamat emel peserta tidak dijumpai dalam pangkalan data.", {
      code: "MISSING_EMAIL"
    });
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(participantEmail)) {
    return responseJSON("error", "Alamat emel peserta tidak sah (" + participantEmail + ").", {
      code: "INVALID_EMAIL"
    });
  }

  if (!programName) {
    return responseJSON("error", "Nama program tidak lengkap dalam pangkalan data.", {
      code: "MISSING_PROGRAM"
    });
  }

  // 4. VALIDATION 3: PERLINDUNGAN DUPLICATE CERTIFICATE
  if ((currentEmailStatus === "SENT" || currentEmailStatus === "GENERATED" || currentStatus === "TELAH DIHANTAR") && (existingCertUrl || existingCertFileId)) {
    return responseJSON("already_exists", "Peserta ini sudah mempunyai sijil.", {
      code: "ALREADY_GENERATED",
      certificateNumber: existingNoSijil,
      certificateUrl: existingCertUrl,
      certFileId: existingCertFileId,
      participantEmail: participantEmail,
      participantName: participantName
    });
  }

  // 5. SET STATUS SEMENTARA = GENERATING
  if (colEmailStatus > 0) sheet.getRange(sheetRow, colEmailStatus).setValue("GENERATING");

  // 6. JANA NOMBOR SIJIL UNIK (Format: JAIS-YYYY-00001, guna sedia ada jika wujud)
  const certNumber = generateUniqueCertificateNumber(existingNoSijil);

  // 7. JANA DOKUMEN SIJIL (GOOGLE SLIDES -> PDF)
  let pdfBlob = null;
  let pdfFile = null;
  let pdfFileId = existingCertFileId;
  let pdfUrl = existingCertUrl;

  try {
    const targetFolder = getOrCreateCertificateFolder();
    pdfBlob = createCertificatePdfBlob({
      name: participantName,
      ic: participantIC || "TIADA",
      programName: programName,
      date: programDate,
      venue: programVenue,
      email: participantEmail,
      certNumber: certNumber,
      folder: targetFolder
    });

    // Simpan PDF ke Folder Google Drive
    try {
      pdfFile = targetFolder.createFile(pdfBlob);
      try {
        pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {}
      pdfFileId = pdfFile.getId();
      pdfUrl = pdfFile.getUrl();
    } catch (saveErr) {
      Logger.log("Simpanan ke folder sasaran gagal: " + saveErr.toString());
      pdfFile = DriveApp.getRootFolder().createFile(pdfBlob);
      pdfFileId = pdfFile.getId();
      pdfUrl = pdfFile.getUrl();
    }

  } catch (genErr) {
    const errMsg = "Penjanaan sijil gagal: " + genErr.toString();
    if (colEmailStatus > 0) sheet.getRange(sheetRow, colEmailStatus).setValue("GENERATION_FAILED");
    if (colLastError > 0) sheet.getRange(sheetRow, colLastError).setValue(errMsg);

    return responseJSON("error", errMsg, {
      code: "GENERATION_FAILED",
      error: genErr.toString()
    });
  }

  // Set status sementara GENERATED dan simpan pautan
  if (colEmailStatus > 0) sheet.getRange(sheetRow, colEmailStatus).setValue("GENERATED");
  if (colNoSijil > 0) sheet.getRange(sheetRow, colNoSijil).setValue(certNumber);
  if (colPautanSijil > 0) sheet.getRange(sheetRow, colPautanSijil).setValue(pdfUrl);
  if (colCertFileId > 0) sheet.getRange(sheetRow, colCertFileId).setValue(pdfFileId);

  // 8. HANTAR EMEL SEBAGAI LAMPIRAN (ATTACHMENT) MELALUI GMAIL
  const emailSubject = "Sijil Penyertaan Rasmi: " + programName + " [" + certNumber + "]";
  const emailHtml = generateCertificateEmailHtml({
    name: participantName,
    ic: participantIC || "-",
    programName: programName,
    programDate: programDate,
    programVenue: programVenue,
    certNumber: certNumber,
    pdfUrl: pdfUrl
  });

  const emailedAt = Utilities.formatDate(new Date(), "GMT+8", "dd/MM/yyyy HH:mm:ss");

  try {
    MailApp.sendEmail({
      to: participantEmail,
      subject: emailSubject,
      name: SETTINGS.SENDER_NAME,
      htmlBody: emailHtml,
      attachments: [pdfBlob]
    });
  } catch (mailErrPrimary) {
    try {
      GmailApp.sendEmail(participantEmail, emailSubject, "Sila rujuk lampiran untuk e-sijil penyertaan anda.", {
        name: SETTINGS.SENDER_NAME,
        htmlBody: emailHtml,
        attachments: [pdfBlob]
      });
    } catch (mailErrSecondary) {
      // PDF Berjaya dijana TETAPI emel gagal dihantar
      const mailErrMsg = "Sijil berjaya dijana di Google Drive tetapi emel gagal dihantar: " + mailErrSecondary.toString();
      if (colEmailStatus > 0) sheet.getRange(sheetRow, colEmailStatus).setValue("EMAIL_FAILED");
      if (colStatus > 0) sheet.getRange(sheetRow, colStatus).setValue("DILULUSKAN");
      if (colLastError > 0) sheet.getRange(sheetRow, colLastError).setValue(mailErrMsg);

      return responseJSON("partial_success", mailErrMsg, {
        code: "EMAIL_FAILED",
        certificateNumber: certNumber,
        certificateUrl: pdfUrl,
        certFileId: pdfFileId,
        participantEmail: participantEmail,
        participantName: participantName
      });
    }
  }

  // 9. KEMASKINI STATUS SELEPAS EMEL BERJAYA DIHANTAR
  if (colStatus > 0) sheet.getRange(sheetRow, colStatus).setValue("TELAH DIHANTAR");
  if (colEmailStatus > 0) sheet.getRange(sheetRow, colEmailStatus).setValue("SENT");
  if (colTarikhLulus > 0) sheet.getRange(sheetRow, colTarikhLulus).setValue(emailedAt);
  if (colLastError > 0) sheet.getRange(sheetRow, colLastError).setValue("");

  return responseJSON("success", "✓ Sijil berjaya dijana dan dihantar ke " + participantEmail, {
    code: "SENT",
    certificateNumber: certNumber,
    certificateUrl: pdfUrl,
    certFileId: pdfFileId,
    participantEmail: participantEmail,
    participantName: participantName,
    emailedAt: emailedAt,
    status: "TELAH DIHANTAR"
  });
}

/**
 * 3. Pengendali: "HANTAR SEMULA" (RESEND EMAIL)
 * Syarat: Mengambil fail PDF sedia ada dari Google Drive, TIDAK menjana sijil baharu.
 */
function handleResendCertificateEmail(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SETTINGS.SHEET_NAME) || ss.getActiveSheet();
  
  const participantId = data.id || "";
  const certFileId = (data.cert_file_id || "").trim();
  const participantEmail = (data.emel_peserta || "").trim();
  const participantName = (data.nama_peserta || "Peserta").trim();
  const programName = (data.nama_program || "Program JAIS").trim();
  const certNumber = (data.no_sijil || "").trim();

  if (!participantEmail) {
    return responseJSON("error", "Alamat emel peserta tiada untuk penghantaran semula.");
  }

  let pdfBlob = null;
  let pdfFile = null;

  // 1. Dapatkan fail PDF sedia ada dari Google Drive
  if (certFileId) {
    try {
      pdfFile = DriveApp.getFileById(certFileId);
      pdfBlob = pdfFile.getAs('application/pdf');
    } catch (e) {
      Logger.log("Fail ID tidak sah, cuba cari ikut nama fail: " + e.toString());
    }
  }

  // Jika tiada File ID atau gagal, cari fail di folder mengikut nombor sijil atau nama
  if (!pdfBlob) {
    try {
      const folder = getOrCreateCertificateFolder();
      const files = folder.getFiles();
      while (files.hasNext()) {
        const f = files.next();
        if (certNumber && f.getName().indexOf(certNumber.replace(/\\\\//g, "_")) !== -1) {
          pdfFile = f;
          pdfBlob = f.getAs('application/pdf');
          break;
        }
      }
    } catch (searchErr) {
      Logger.log("Carian folder gagal: " + searchErr.toString());
    }
  }

  if (!pdfBlob) {
    return responseJSON("error", "Fail PDF sijil sedia ada tidak dijumpai di Google Drive. Sila klik 'Lulus & Emel' untuk menjana semula.");
  }

  // 2. Hantar Semula Emel Mengandungi Fail PDF Sedia Ada
  const emailSubject = "Pengesahan Semula: Sijil Penyertaan " + programName + (certNumber ? " [" + certNumber + "]" : "");
  const emailHtml = generateCertificateEmailHtml({
    name: participantName,
    ic: data.ic || "-",
    programName: programName,
    programDate: data.tarikh_program || "-",
    programVenue: data.tempat_program || "-",
    certNumber: certNumber || "JAIS-CERT",
    pdfUrl: pdfFile ? pdfFile.getUrl() : ""
  });

  try {
    MailApp.sendEmail({
      to: participantEmail,
      subject: emailSubject,
      name: SETTINGS.SENDER_NAME,
      htmlBody: emailHtml,
      attachments: [pdfBlob]
    });
  } catch (resendErr) {
    return responseJSON("error", "Gagal menghantar semula emel: " + resendErr.toString());
  }

  // Kemaskini Sheet
  const sheetRow = findParticipantRow(sheet, participantId, participantEmail, participantName);
  const emailedAt = Utilities.formatDate(new Date(), "GMT+8", "dd/MM/yyyy HH:mm:ss");

  if (sheetRow > 1) {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) {
      return String(h).trim().toUpperCase();
    });
    const colStatus = headers.indexOf('STATUS KELULUSAN') + 1;
    const colEmailStatus = headers.indexOf('EMAIL STATUS') + 1;
    const colTarikhLulus = headers.indexOf('TARIKH KELULUSAN') + 1;
    const colLastError = headers.indexOf('LAST ERROR') + 1;

    if (colStatus > 0) sheet.getRange(sheetRow, colStatus).setValue("TELAH DIHANTAR");
    if (colEmailStatus > 0) sheet.getRange(sheetRow, colEmailStatus).setValue("SENT");
    if (colTarikhLulus > 0) sheet.getRange(sheetRow, colTarikhLulus).setValue(emailedAt);
    if (colLastError > 0) sheet.getRange(sheetRow, colLastError).setValue("");
  }

  return responseJSON("success", "✓ Emel sijil sedia ada berjaya dihantar semula ke " + participantEmail, {
    code: "SENT",
    emailedAt: emailedAt,
    participantEmail: participantEmail
  });
}

/**
 * 4. Pengendali: Uji Penghantaran Sijil (+ Uji Emel Anda)
 */
function handleTestCertificateEmail(data) {
  const adminEmail = (data.recipient_email || data.emel || "").trim();
  const testName = (data.nama || "PENTADBIR SISTEM JAIS").trim().toUpperCase();
  const testIC = (data.ic || "900101-13-1234").trim();
  const testProgram = (data.nama_program || "KURSUS PENGURUSAN DAN PENILAIAN PROGRAM JAIS").trim();
  const testDate = (data.tarikh || Utilities.formatDate(new Date(), "GMT+8", "dd MMMM yyyy")).trim();
  const testVenue = (data.tempat || "IBU PEJABAT JAIS, KUCHING").trim();

  if (!adminEmail) {
    return responseJSON("error", "Alamat emel pentadbir diperlukan untuk ujian.");
  }

  const certNumber = generateUniqueCertificateNumber();
  const targetFolder = getOrCreateCertificateFolder();

  let pdfBlob = null;
  try {
    pdfBlob = createCertificatePdfBlob({
      name: testName,
      ic: testIC,
      programName: testProgram,
      date: testDate,
      venue: testVenue,
      certNumber: certNumber,
      folder: targetFolder
    });
  } catch (genErr) {
    return responseJSON("error", "Penjanaan sijil ujian gagal: " + genErr.toString());
  }

  let pdfUrl = "";
  let pdfFileId = "";
  try {
    const pdfFile = targetFolder.createFile(pdfBlob);
    try {
      pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch(sErr) {}
    pdfUrl = pdfFile.getUrl();
    pdfFileId = pdfFile.getId();
  } catch (driveErr) {
    Logger.log("Simpanan fail ujian ke Drive gagal: " + driveErr.toString());
  }

  const emailSubject = "[UJIAN] Sijil Penyertaan Rasmi: " + testProgram + " [" + certNumber + "]";
  const emailHtml = generateCertificateEmailHtml({
    name: testName,
    ic: testIC,
    programName: testProgram,
    programDate: testDate,
    programVenue: testVenue,
    certNumber: certNumber,
    pdfUrl: pdfUrl
  });

  try {
    MailApp.sendEmail({
      to: adminEmail,
      subject: emailSubject,
      name: SETTINGS.SENDER_NAME,
      htmlBody: emailHtml,
      attachments: [pdfBlob]
    });
  } catch (mErr) {
    try {
      GmailApp.sendEmail(adminEmail, emailSubject, "Lampiran Sijil Ujian.", {
        name: SETTINGS.SENDER_NAME,
        htmlBody: emailHtml,
        attachments: [pdfBlob]
      });
    } catch (gErr) {
      return responseJSON("error", "Sijil berjaya dijana, tetapi emel gagal dihantar: " + gErr.toString());
    }
  }

  return responseJSON("success", "✓ Sijil ujian berjaya dijana dan dihantar ke " + adminEmail, {
    certificateNumber: certNumber,
    certificateUrl: pdfUrl,
    certFileId: pdfFileId,
    recipient: adminEmail
  });
}

/**
 * Pengendali: Simpan Sijil PDF-Lib (Base64) ke Drive & Emel ke Peserta
 */
function handleSavePdfLibCertificate(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SETTINGS.SHEET_NAME) || ss.getActiveSheet();
  ensureCertificateColumnsExist(sheet);

  const participantId = data.participantId || data.id || "";
  const sheetRow = findParticipantRow(sheet, participantId, data.emel_peserta, data.nama_peserta);
  if (sheetRow <= 1) {
    return responseJSON("error", "Peserta tidak dijumpai dalam pangkalan data.", { code: "NOT_FOUND" });
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) {
    return String(h).trim().toUpperCase();
  });

  const colStatus = headers.indexOf('STATUS KELULUSAN') + 1;
  const colEmailStatus = headers.indexOf('EMAIL STATUS') + 1;
  const colNoSijil = headers.indexOf('NO SIJIL') + 1;
  const colPautanSijil = headers.indexOf('PAUTAN SIJIL') + 1;
  const colCertFileId = headers.indexOf('CERT FILE ID') + 1;
  const colTarikhLulus = headers.indexOf('TARIKH KELULUSAN') + 1;
  const colLastError = headers.indexOf('LAST ERROR') + 1;

  // Semak No Sijil
  const existingNoSijil = colNoSijil > 0 ? sheet.getRange(sheetRow, colNoSijil).getValue() : "";
  const certNumber = data.no_sijil || generateUniqueCertificateNumber(existingNoSijil);

  const participantName = (data.nama_peserta || sheet.getRange(sheetRow, headers.indexOf('NAMA PENUH') + 1).getValue() || "Peserta").toString().trim();
  const participantEmail = (data.emel_peserta || sheet.getRange(sheetRow, headers.indexOf('EMEL') + 1).getValue() || "").toString().trim();
  const programName = (data.nama_program || sheet.getRange(sheetRow, headers.indexOf('NAMA PROGRAM') + 1).getValue() || "Program JAIS").toString().trim();
  const programDate = (data.tarikh_program || sheet.getRange(sheetRow, headers.indexOf('TARIKH MULA') + 1).getValue() || "").toString().trim();
  const programVenue = (data.tempat_program || sheet.getRange(sheetRow, headers.indexOf('TEMPAT PROGRAM') + 1).getValue() || "").toString().trim();

  // Dapatkan folder Google Drive
  let folder;
  try {
    folder = DriveApp.getFolderById(SETTINGS.CERTIFICATE_FOLDER_ID);
  } catch (e) {
    folder = DriveApp.getRootFolder();
  }

  let pdfBlob;
  const cleanCert = certNumber.replace(/[\\/\\\\:]/g, "_");
  const cleanName = participantName.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = "Sijil_" + cleanCert + "_" + cleanName + ".pdf";

  if (data.pdf_base64) {
    pdfBlob = Utilities.newBlob(Utilities.base64Decode(data.pdf_base64), 'application/pdf', fileName);
  } else {
    pdfBlob = createCertificatePdfBlob({
      name: participantName,
      ic: data.no_kp || "",
      programName: programName,
      date: programDate,
      venue: programVenue,
      email: participantEmail,
      certNumber: certNumber,
      folder: folder
    });
  }

  // Simpan PDF ke Drive
  const pdfFile = folder.createFile(pdfBlob);
  try {
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (shErr) {}

  const pdfUrl = "https://drive.google.com/file/d/" + pdfFile.getId() + "/view?usp=sharing";
  const pdfFileId = pdfFile.getId();
  const currentTimestamp = Utilities.formatDate(new Date(), "GMT+8", "dd/MM/yyyy HH:mm:ss");

  const shouldSendEmail = (data.send_email === true || data.sendEmail === true);
  let emailSent = false;
  let emailError = "";

  if (shouldSendEmail && participantEmail && participantEmail.indexOf("@") !== -1) {
    const emailSubject = "E-Sijil Penyertaan Rasmi JAIS - " + programName + " [" + certNumber + "]";
    const emailHtml = buildOfficialJaisEmailHtml({
      name: participantName,
      ic: data.no_kp || "",
      programName: programName,
      programDate: programDate,
      programVenue: programVenue,
      certNumber: certNumber,
      pdfUrl: pdfUrl
    });

    try {
      MailApp.sendEmail({
        to: participantEmail,
        subject: emailSubject,
        name: SETTINGS.SENDER_NAME,
        htmlBody: emailHtml,
        attachments: [pdfBlob]
      });
      emailSent = true;
    } catch (mErr) {
      try {
        GmailApp.sendEmail(participantEmail, emailSubject, "Lampiran E-Sijil Penyertaan Rasmi JAIS.", {
          name: SETTINGS.SENDER_NAME,
          htmlBody: emailHtml,
          attachments: [pdfBlob]
        });
        emailSent = true;
      } catch (gErr) {
        emailError = gErr.toString();
      }
    }
  }

  // Kemas kini Google Sheets
  const finalStatus = shouldSendEmail ? (emailSent ? "TELAH DIHANTAR" : "DILULUSKAN") : "DILULUSKAN";
  const finalEmailStatus = shouldSendEmail ? (emailSent ? "SENT" : "EMAIL_FAILED") : "NOT_SENT";

  if (colStatus > 0) sheet.getRange(sheetRow, colStatus).setValue(finalStatus);
  if (colEmailStatus > 0) sheet.getRange(sheetRow, colEmailStatus).setValue(finalEmailStatus);
  if (colNoSijil > 0) sheet.getRange(sheetRow, colNoSijil).setValue(certNumber);
  if (colPautanSijil > 0) sheet.getRange(sheetRow, colPautanSijil).setValue(pdfUrl);
  if (colCertFileId > 0) sheet.getRange(sheetRow, colCertFileId).setValue(pdfFileId);
  if (colTarikhLulus > 0) sheet.getRange(sheetRow, colTarikhLulus).setValue(currentTimestamp);
  if (colLastError > 0) sheet.getRange(sheetRow, colLastError).setValue(emailError);

  if (!shouldSendEmail) {
    return responseJSON("success", "✓ Sijil (PDF-Lib) berjaya dijana dan disimpan ke Google Drive. Emel BELUM dihantar mengikut arahan pentadbir.", {
      certificateNumber: certNumber,
      certificateUrl: pdfUrl,
      certFileId: pdfFileId,
      emailStatus: "NOT_SENT"
    });
  }

  if (emailSent) {
    return responseJSON("success", "✓ Sijil (PDF-Lib) berjaya disimpan ke Drive dan dihantar ke emel peserta.", {
      certificateNumber: certNumber,
      certificateUrl: pdfUrl,
      certFileId: pdfFileId,
      emailStatus: "SENT"
    });
  } else {
    return responseJSON("partial_success", "Sijil (PDF-Lib) disimpan di Drive, tetapi emel gagal: " + emailError, {
      certificateNumber: certNumber,
      certificateUrl: pdfUrl,
      certFileId: pdfFileId,
      code: "EMAIL_FAILED"
    });
  }
}

/**
 * Cipta PDF Sijil menggunakan Google Slides Template Rasmi JAIS
 * Menggantikan semua placeholder dan mengeksport ke PDF
 */
function createCertificatePdfBlob(params) {
  const templateId = SETTINGS.TEMPLATE_SLIDES_ID;
  const certNumber = params.certNumber;
  const participantName = params.name;

  // 1. Google Slides Template
  if (templateId && templateId.indexOf("TEMPLATE") === -1 && templateId.length > 15) {
    let slideCopyFile = null;
    try {
      const templateFile = DriveApp.getFileById(templateId);
      const cleanCert = certNumber.replace(/[\\/\\\\:]/g, "_");
      const cleanName = participantName.replace(/[^a-zA-Z0-9]/g, "_");
      const copyName = "Sijil_" + cleanCert + "_" + cleanName;
      
      try {
        slideCopyFile = templateFile.makeCopy(copyName, params.folder);
      } catch (fErr) {
        slideCopyFile = templateFile.makeCopy(copyName);
      }

      const slides = SlidesApp.openById(slideCopyFile.getId());

      // Gantikan semua format pemegang tempat (Placeholders)
      const placeholderMap = [
        // Format Nama
        { find: "{{NAMA_PESERTA}}", replace: participantName },
        { find: "{{nama_peserta}}", replace: participantName },
        { find: "{{NAMA}}", replace: participantName },
        { find: "{{nama}}", replace: participantName },

        // Format Program
        { find: "{{NAMA_PROGRAM}}", replace: params.programName },
        { find: "{{nama_program}}", replace: params.programName },
        { find: "{{PROGRAM}}", replace: params.programName },
        { find: "{{program}}", replace: params.programName },

        // Format Tarikh
        { find: "{{TARIKH_PROGRAM}}", replace: params.date || "" },
        { find: "{{tarikh_program}}", replace: params.date || "" },
        { find: "{{TARIKH}}", replace: params.date || "" },
        { find: "{{tarikh}}", replace: params.date || "" },

        // Format No Sijil
        { find: "{{NO_SIJIL}}", replace: certNumber },
        { find: "{{no_sijil}}", replace: certNumber },
        { find: "{{NO SIJIL}}", replace: certNumber },

        // Format Tempat
        { find: "{{TEMPAT}}", replace: params.venue || "" },
        { find: "{{tempat}}", replace: params.venue || "" },
        { find: "{{TEMPAT_PROGRAM}}", replace: params.venue || "" },
        { find: "{{tempat_program}}", replace: params.venue || "" },

        // Format Emel
        { find: "{{EMEL}}", replace: params.email || "" },
        { find: "{{emel}}", replace: params.email || "" },

        // Format Kad Pengenalan
        { find: "{{IC}}", replace: params.ic || "" },
        { find: "{{ic}}", replace: params.ic || "" },
        { find: "{{NO_KP}}", replace: params.ic || "" },
        { find: "{{no_kp}}", replace: params.ic || "" },

        // Format Tarikh Kelulusan
        { find: "{{TARIKH_KELULUSAN}}", replace: Utilities.formatDate(new Date(), "GMT+8", "dd/MM/yyyy") },
        { find: "{{tarikh_kelulusan}}", replace: Utilities.formatDate(new Date(), "GMT+8", "dd/MM/yyyy") }
      ];

      placeholderMap.forEach(function(item) {
        try {
          slides.replaceAllText(item.find, item.replace);
        } catch (repErr) {
          Logger.log("Ralat penggantian placeholder " + item.find + ": " + repErr.toString());
        }
      });

      slides.saveAndClose();
      Utilities.sleep(500);

      const pdfBlob = slideCopyFile.getAs('application/pdf');
      pdfBlob.setName(copyName + ".pdf");

      try {
        slideCopyFile.setTrashed(true);
      } catch (trashErr) {
        Logger.log("Padam salinan sementara gagal: " + trashErr.toString());
      }

      return pdfBlob;
    } catch (slideErr) {
      Logger.log("Template Slides ralat (" + slideErr.toString() + "). Menggunakan Penjana Sijil Rasmi JAIS sebagai sandaran.");
      if (slideCopyFile) {
        try { slideCopyFile.setTrashed(true); } catch (e) {}
      }
    }
  }

  // 2. SANDARAN: Penjana Sijil Rasmi JAIS Terbina (HTML-to-PDF)
  return generateJaisCertificatePdf(params);
}

/**
 * Penjana Sijil Rasmi JAIS (HTML ke PDF Beresolusi Tinggi & Sah)
 */
function generateJaisCertificatePdf(params) {
  const certNumber = params.certNumber || "JAIS/CERT/001";
  const participantName = (params.name || "PESERTA").trim();
  const icNumber = params.ic && params.ic !== "TIADA" && params.ic !== "-" ? params.ic.trim() : "";
  const programName = (params.programName || "PROGRAM JAIS").trim();
  const programDate = (params.date || "").trim();
  const programVenue = (params.venue || "").trim();
  const dateApproved = Utilities.formatDate(new Date(), "GMT+8", "dd MMMM yyyy");

  const certHtml = '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8">' +
    '<style>' +
    '@page { size: A4 landscape; margin: 0; }' +
    'body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #FFFFFF; color: #1A1A1A; }' +
    '.cert-outer { width: 1000px; margin: 0 auto; padding: 25px; box-sizing: border-box; }' +
    '.border-1 { border: 5px solid #1B4D3E; padding: 6px; background: #FFFFFF; }' +
    '.border-2 { border: 2px solid #D4AF37; padding: 28px 36px; text-align: center; background: #FCFCFA; position: relative; }' +
    '.dept-title { font-size: 16px; font-weight: bold; color: #1B4D3E; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 3px; }' +
    '.sub-dept { font-size: 11px; font-weight: bold; color: #666666; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 14px; }' +
    '.cert-heading { font-size: 32px; font-weight: bold; color: #0F281E; letter-spacing: 3px; text-transform: uppercase; margin: 8px 0; }' +
    '.gold-bar { width: 220px; height: 3px; background: #D4AF37; margin: 0 auto 10px auto; }' +
    '.cert-no { font-size: 11px; font-weight: bold; color: #777777; letter-spacing: 1px; margin-bottom: 18px; }' +
    '.cert-ack { font-size: 13px; font-style: italic; color: #444444; margin-bottom: 10px; }' +
    '.name-box { font-size: 25px; font-weight: bold; color: #1B4D3E; text-transform: uppercase; margin-bottom: 5px; }' +
    '.ic-box { font-size: 12px; font-weight: bold; color: #666666; margin-bottom: 14px; }' +
    '.completed-text { font-size: 13px; color: #444444; margin-bottom: 10px; }' +
    '.prog-title { font-size: 19px; font-weight: bold; color: #0F281E; text-transform: uppercase; margin-bottom: 10px; line-height: 1.4; max-width: 85%; margin-left: auto; margin-right: auto; }' +
    '.prog-details { font-size: 12px; font-weight: bold; color: #555555; margin-bottom: 24px; }' +
    '.footer-table { width: 100%; margin-top: 15px; border-collapse: collapse; }' +
    '</style></head>' +
    '<body>' +
    '<div class="cert-outer">' +
    '<div class="border-1">' +
    '<div class="border-2">' +
    '<div class="dept-title">JABATAN AGAMA ISLAM SARAWAK</div>' +
    '<div class="sub-dept">Sistem e-Penilaian & Pengurusan Program</div>' +
    '<div class="cert-heading">SIJIL PENYERTAAN</div>' +
    '<div class="gold-bar"></div>' +
    '<div class="cert-no">NO. SIJIL: ' + certNumber + '</div>' +
    '<div class="cert-ack">Dengan ini diperakui bahawa</div>' +
    '<div class="name-box">' + participantName + '</div>' +
    (icNumber ? '<div class="ic-box">NO. K/P: ' + icNumber + '</div>' : '') +
    '<div class="completed-text">telah menyertai dan melengkapkan dengan jayanya:</div>' +
    '<div class="prog-title">' + programName + '</div>' +
    '<div class="prog-details">' +
    (programDate ? 'Tarikh: ' + programDate : '') +
    (programVenue ? ' &nbsp;|&nbsp; Tempat: ' + programVenue : '') +
    '</div>' +
    '<table class="footer-table">' +
    '<tr>' +
    '<td style="text-align: left; width: 35%; font-size: 10px; color: #666; vertical-align: bottom;">' +
    'Tarikh Kelulusan: <strong style="color: #222;">' + dateApproved + '</strong><br>' +
    'Status: <strong style="color: #2E7D32;">TELAH DIHANTAR</strong>' +
    '</td>' +
    '<td style="text-align: center; width: 30%; vertical-align: bottom;">' +
    '<div style="border: 1px solid #1B4D3E; padding: 5px 12px; font-size: 9px; font-weight: bold; color: #1B4D3E; display: inline-block; border-radius: 4px;">' +
    'DOKUMEN RASMI DIJANA SECARA DIGITAL' +
    '</div>' +
    '</td>' +
    '<td style="text-align: right; width: 35%; vertical-align: bottom;">' +
    '<div style="display: inline-block; text-align: center;">' +
    '<div style="width: 170px; border-bottom: 1px solid #333; margin-bottom: 5px;"></div>' +
    '<div style="font-size: 9px; font-weight: bold; color: #111;">' +
    'PENGARAH<br>' +
    '<span style="font-weight: normal; color: #555;">JABATAN AGAMA ISLAM SARAWAK</span>' +
    '</div>' +
    '</div>' +
    '</td>' +
    '</tr>' +
    '</table>' +
    '</div></div></div>' +
    '</body></html>';

  const htmlBlob = Utilities.newBlob(certHtml, 'text/html', 'cert.html');
  const pdfBlob = htmlBlob.getAs('application/pdf');
  const cleanName = participantName.replace(/[^a-zA-Z0-9]/g, "_");
  const cleanCert = certNumber.replace(/[\\/\\\\:]/g, "_");
  pdfBlob.setName("Sijil_" + cleanCert + "_" + cleanName + ".pdf");
  return pdfBlob;
}

/**
 * Folder Google Drive Sijil (Pencarian & Penciptaan Automatik Selamat di Drive Pemilik)
 */
function getOrCreateCertificateFolder() {
  // 1. Jika ID folder diberikan dan bukan ID template/default lama
  if (SETTINGS.CERTIFICATE_FOLDER_ID && 
      SETTINGS.CERTIFICATE_FOLDER_ID.indexOf("1Pkljy_") === -1 && 
      SETTINGS.CERTIFICATE_FOLDER_ID.indexOf("FOLDER_ID") === -1) {
    try {
      const folder = DriveApp.getFolderById(SETTINGS.CERTIFICATE_FOLDER_ID);
      return folder;
    } catch (e) {
      Logger.log("Folder ID khusus gagal dibuka: " + e.toString());
    }
  }

  // 2. Cari folder sedia ada bernama 'Sijil_Penilaian_JAIS' dalam Google Drive pemilik
  try {
    const folders = DriveApp.getFoldersByName("Sijil_Penilaian_JAIS");
    if (folders.hasNext()) {
      return folders.next();
    }
  } catch (e) {
    Logger.log("Carian folder gagal: " + e.toString());
  }

  // 3. Cipta folder baharu 'Sijil_Penilaian_JAIS' dalam Google Drive pemilik
  try {
    const newFolder = DriveApp.createFolder("Sijil_Penilaian_JAIS");
    try {
      newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (sErr) {}
    return newFolder;
  } catch (createErr) {
    Logger.log("Gagal mencipta folder, menggunakan Root Folder: " + createErr.toString());
    return DriveApp.getRootFolder();
  }
}

/**
 * Cari nombor baris peserta mengikut ID atau Emel & Nama
 */
function findParticipantRow(sheet, participantId, email, name) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return -1;

  const headers = data[0].map(function(h) { return String(h).trim().toUpperCase(); });
  const colEmel = headers.indexOf('EMEL PESERTA');
  const colNama = headers.indexOf('NAMA PENUH');

  // Cari ikut format ID "JAIS-RowNumber"
  if (participantId && String(participantId).startsWith("JAIS-")) {
    const rowNum = parseInt(String(participantId).replace("JAIS-", ""), 10);
    if (!isNaN(rowNum) && rowNum <= sheet.getLastRow() && rowNum > 1) {
      return rowNum;
    }
  }

  // Cari ikut emel dan nama
  const targetEmail = (email || "").toLowerCase().trim();
  const targetName = (name || "").toUpperCase().trim();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Semak Lajur AJ (Col 36, index 35) dan header EMEL PESERTA
    const rowEmailAJ = row.length > 35 && row[35] ? String(row[35]).toLowerCase().trim() : "";
    const rowEmailCol = colEmel >= 0 ? String(row[colEmel]).toLowerCase().trim() : "";
    
    // Semak Lajur AI (Col 35, index 34) dan header NAMA PENUH
    const rowNameAI = row.length > 34 && row[34] ? String(row[34]).toUpperCase().trim() : "";
    const rowNameCol = colNama >= 0 ? String(row[colNama]).toUpperCase().trim() : "";

    if (targetEmail && (rowEmailAJ === targetEmail || rowEmailCol === targetEmail)) return i + 1;
    if (targetName && (rowNameAI === targetName || rowNameCol === targetName)) return i + 1;
  }

  return -1;
}

/**
 * Susun atur HTML Emel Rasmi JAIS
 */
function generateCertificateEmailHtml(params) {
  return '<!DOCTYPE html>' +
    '<html>' +
    '<head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>Sijil Penyertaan JAIS</title>' +
    '</head>' +
    '<body style="margin:0;padding:0;background-color:#F2F2F7;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F2F2F7;padding:30px 15px;">' +
    '<tr><td align="center">' +
    '<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#FFFFFF;border-radius:24px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.06);border:1px solid #E5E5EA;">' +
    
    // Header
    '<tr><td style="background-color:#1C1C1E;padding:36px 30px;text-align:center;">' +
    '<div style="display:inline-block;padding:6px 14px;background-color:#D0F240;color:#1C1C1E;font-size:11px;font-weight:800;border-radius:20px;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Jabatan Agama Islam Sarawak</div>' +
    '<h1 style="color:#FFFFFF;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">SIJIL PENYERTAAN RASMI</h1>' +
    '<p style="color:#A1A1A6;margin:8px 0 0 0;font-size:13px;font-weight:500;">Sistem e-Penilaian & Pengurusan Program</p>' +
    '</td></tr>' +

    // Body
    '<tr><td style="padding:32px 30px;color:#1C1C1E;line-height:1.6;">' +
    '<p style="font-size:15px;margin:0 0 16px 0;font-weight:600;">Assalamualaikum w.b.t & Salam Sejahtera,</p>' +
    '<p style="font-size:14px;color:#3A3A3C;margin:0 0 20px 0;">Tahniah diucapkan kepada <strong>' + params.name + '</strong> atas penyertaan serta maklum balas penilaian yang telah dilengkapkan.</p>' +

    // Info Card
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8F9FA;border-radius:16px;border:1px solid #E5E5EA;margin-bottom:24px;">' +
    '<tr><td style="padding:20px;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="6">' +
    '<tr><td style="font-size:11px;font-weight:700;color:#8E8E93;text-transform:uppercase;width:120px;">No. Sijil</td><td style="font-size:13px;font-weight:800;color:#1C1C1E;font-family:monospace;">' + params.certNumber + '</td></tr>' +
    '<tr><td style="font-size:11px;font-weight:700;color:#8E8E93;text-transform:uppercase;">Peserta</td><td style="font-size:13px;font-weight:700;color:#1C1C1E;">' + params.name + '</td></tr>' +
    (params.ic && params.ic !== "-" && params.ic !== "TIADA" ? '<tr><td style="font-size:11px;font-weight:700;color:#8E8E93;text-transform:uppercase;">No. K/P</td><td style="font-size:13px;font-weight:600;color:#3A3A3C;">' + params.ic + '</td></tr>' : '') +
    '<tr><td style="font-size:11px;font-weight:700;color:#8E8E93;text-transform:uppercase;">Program</td><td style="font-size:13px;font-weight:700;color:#1C1C1E;">' + params.programName + '</td></tr>' +
    '<tr><td style="font-size:11px;font-weight:700;color:#8E8E93;text-transform:uppercase;">Tarikh</td><td style="font-size:13px;color:#3A3A3C;">' + params.programDate + '</td></tr>' +
    '<tr><td style="font-size:11px;font-weight:700;color:#8E8E93;text-transform:uppercase;">Tempat</td><td style="font-size:13px;color:#3A3A3C;">' + params.programVenue + '</td></tr>' +
    '<tr><td style="font-size:11px;font-weight:700;color:#8E8E93;text-transform:uppercase;">Status</td><td style="font-size:12px;font-weight:800;color:#2E7D32;">✓ TELAH DIHANTAR</td></tr>' +
    '</table>' +
    '</td></tr></table>' +

    // PDF Attachment Notice
    '<div style="background-color:#E8F5E9;border-radius:14px;padding:16px;border:1px solid #C8E6C9;margin-bottom:24px;text-align:center;">' +
    '<p style="margin:0;font-size:13px;color:#1B5E20;font-weight:700;">📎 Fail sijil digital (.pdf) telah disertakan sebagai lampiran pada emel ini.</p>' +
    '<p style="margin:6px 0 0 0;font-size:12px;color:#2E7D32;">Anda boleh memuat turun dan mencetak sijil ini untuk simpanan rasmi anda.</p>' +
    '</div>' +

    (params.pdfUrl ? '<div style="text-align:center;margin-bottom:24px;"><a href="' + params.pdfUrl + '" target="_blank" style="display:inline-block;padding:14px 28px;background-color:#1C1C1E;color:#D0F240;text-decoration:none;border-radius:14px;font-size:13px;font-weight:800;box-shadow:0 4px 12px rgba(0,0,0,0.15);">Buka Sijil di Google Drive &rarr;</a></div>' : '') +

    '<p style="font-size:12px;color:#8E8E93;margin:24px 0 0 0;border-top:1px solid #E5E5EA;padding-top:20px;text-align:center;">Emel ini dijana secara automatik oleh Sistem e-Penilaian Program JAIS. Sila jangan balas emel ini.</p>' +
    '</td></tr>' +
    '</table>' +
    '</td></tr></table>' +
    '</body></html>';
}

/**
 * Helper JSON Response
 */
function responseJSON(status, message, data) {
  const output = {
    status: status,
    message: message,
    data: data || null,
    timestamp: new Date().toISOString()
  };
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
