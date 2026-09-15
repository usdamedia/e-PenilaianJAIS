import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';

export interface CertificateParticipantData {
  nama: string;
  ic?: string;
  namaProgram: string;
  tarikhProgram?: string;
  tempatProgram?: string;
  noSijil?: string;
  tarikhLulus?: string;
  jawatanPenandatangan?: string;
  namaPenandatangan?: string;
}

export interface PdfLibResult {
  pdfBytes: Uint8Array;
  pdfBlob: Blob;
  pdfBase64: string;
  pdfDataUrl: string;
}

// Default settings key in localStorage
export const MASTER_TEMPLATE_STORAGE_KEY = 'JAIS_CERT_MASTER_TEMPLATE_CONFIG';

export interface MasterTemplateConfig {
  templateUrl?: string; // Optional custom image URL (e.g. Google Drive direct link or hosted image)
  useCustomImage: boolean;
  penandatanganNama: string;
  penandatanganJawatan: string;
}

export const DEFAULT_TEMPLATE_CONFIG: MasterTemplateConfig = {
  templateUrl: '',
  useCustomImage: false,
  penandatanganNama: 'HAJI MUAL BIN HAJI SUAUD',
  penandatanganJawatan: 'PENGARAH JABATAN AGAMA ISLAM SARAWAK'
};

export function getMasterTemplateConfig(): MasterTemplateConfig {
  try {
    const saved = localStorage.getItem(MASTER_TEMPLATE_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_TEMPLATE_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Could not read master template config:', e);
  }
  return DEFAULT_TEMPLATE_CONFIG;
}

export function saveMasterTemplateConfig(config: Partial<MasterTemplateConfig>): void {
  try {
    const current = getMasterTemplateConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(MASTER_TEMPLATE_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Could not save master template config:', e);
  }
}

/**
 * Lukis latar belakang master template beresolusi tinggi dengan corak reben mewah hitam & emas
 * Menyerupai reka bentuk master template JAIS
 */
async function drawMasterTemplateCanvas(
  logoDataUrl?: string
): Promise<string> {
  // Gunakan saiz A4 300 DPI: 2480 x 3508 piksel
  const width = 2480;
  const height = 3508;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context tidak disokong.');

  // 1. Latar Belakang Parhcment / Marble Putih Gading Mewah
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#FFFFFF');
  bgGrad.addColorStop(0.3, '#FAF9F5');
  bgGrad.addColorStop(0.7, '#F7F5EE');
  bgGrad.addColorStop(1, '#FFFFFF');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Tekstur halus marmar
  ctx.fillStyle = 'rgba(212, 175, 55, 0.015)';
  for (let i = 0; i < 60; i++) {
    const rx = Math.random() * width;
    const ry = Math.random() * height;
    const rw = Math.random() * 400 + 100;
    const rh = Math.random() * 200 + 50;
    ctx.fillRect(rx, ry, rw, rh);
  }

  // 2. CORAK REBEN MEWAH HITAM & EMAS DI SUDUT ATAS (TOP LEFT & TOP RIGHT)
  // --- TOP LEFT ---
  // Lengkungan hitam dalam
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(850, 0);
  ctx.bezierCurveTo(720, 180, 480, 360, 0, 480);
  ctx.closePath();
  ctx.fillStyle = '#111315';
  ctx.fill();

  // Reben emas utama di atas lengkungan hitam
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(950, 0);
  ctx.bezierCurveTo(800, 240, 520, 480, 0, 600);
  ctx.bezierCurveTo(380, 480, 660, 240, 780, 0);
  ctx.closePath();
  const goldGradTL = ctx.createLinearGradient(0, 0, 800, 500);
  goldGradTL.addColorStop(0, '#E6C673');
  goldGradTL.addColorStop(0.3, '#C89B3C');
  goldGradTL.addColorStop(0.5, '#F7E7A9');
  goldGradTL.addColorStop(0.7, '#A67926');
  goldGradTL.addColorStop(1, '#68480F');
  ctx.fillStyle = goldGradTL;
  ctx.fill();

  // Garisan halus emas tambahan
  ctx.beginPath();
  ctx.moveTo(0, 480);
  ctx.bezierCurveTo(460, 370, 700, 180, 860, 0);
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#D4AF37';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, 540);
  ctx.bezierCurveTo(420, 420, 640, 220, 800, 0);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#F3E5AB';
  ctx.stroke();
  ctx.restore();

  // --- TOP RIGHT ---
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(width, 0);
  ctx.lineTo(width - 850, 0);
  ctx.bezierCurveTo(width - 720, 180, width - 480, 360, width, 480);
  ctx.closePath();
  ctx.fillStyle = '#111315';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(width, 0);
  ctx.lineTo(width - 950, 0);
  ctx.bezierCurveTo(width - 800, 240, width - 520, 480, width, 600);
  ctx.bezierCurveTo(width - 380, 480, width - 660, 240, width - 780, 0);
  ctx.closePath();
  const goldGradTR = ctx.createLinearGradient(width, 0, width - 800, 500);
  goldGradTR.addColorStop(0, '#E6C673');
  goldGradTR.addColorStop(0.3, '#C89B3C');
  goldGradTR.addColorStop(0.5, '#F7E7A9');
  goldGradTR.addColorStop(0.7, '#A67926');
  goldGradTR.addColorStop(1, '#68480F');
  ctx.fillStyle = goldGradTR;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(width, 480);
  ctx.bezierCurveTo(width - 460, 370, width - 700, 180, width - 860, 0);
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#D4AF37';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width, 540);
  ctx.bezierCurveTo(width - 420, 420, width - 640, 220, width - 800, 0);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#F3E5AB';
  ctx.stroke();
  ctx.restore();

  // 3. CORAK REBEN MEWAH HITAM & EMAS DI SUDUT BAWAH (BOTTOM LEFT & BOTTOM RIGHT)
  // --- BOTTOM LEFT ---
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(850, height);
  ctx.bezierCurveTo(720, height - 180, 480, height - 360, 0, height - 480);
  ctx.closePath();
  ctx.fillStyle = '#111315';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(950, height);
  ctx.bezierCurveTo(800, height - 240, 520, height - 480, 0, height - 600);
  ctx.bezierCurveTo(380, height - 480, 660, height - 240, 780, height);
  ctx.closePath();
  const goldGradBL = ctx.createLinearGradient(0, height, 800, height - 500);
  goldGradBL.addColorStop(0, '#E6C673');
  goldGradBL.addColorStop(0.3, '#C89B3C');
  goldGradBL.addColorStop(0.5, '#F7E7A9');
  goldGradBL.addColorStop(0.7, '#A67926');
  goldGradBL.addColorStop(1, '#68480F');
  ctx.fillStyle = goldGradBL;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, height - 480);
  ctx.bezierCurveTo(460, height - 370, 700, height - 180, 860, height);
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#D4AF37';
  ctx.stroke();
  ctx.restore();

  // --- BOTTOM RIGHT ---
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(width, height);
  ctx.lineTo(width - 850, height);
  ctx.bezierCurveTo(width - 720, height - 180, width - 480, height - 360, width, height - 480);
  ctx.closePath();
  ctx.fillStyle = '#111315';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(width, height);
  ctx.lineTo(width - 950, height);
  ctx.bezierCurveTo(width - 800, height - 240, width - 520, height - 480, width, height - 600);
  ctx.bezierCurveTo(width - 380, height - 480, width - 660, height - 240, width - 780, height);
  ctx.closePath();
  const goldGradBR = ctx.createLinearGradient(width, height, width - 800, height - 500);
  goldGradBR.addColorStop(0, '#E6C673');
  goldGradBR.addColorStop(0.3, '#C89B3C');
  goldGradBR.addColorStop(0.5, '#F7E7A9');
  goldGradBR.addColorStop(0.7, '#A67926');
  goldGradBR.addColorStop(1, '#68480F');
  ctx.fillStyle = goldGradBR;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(width, height - 480);
  ctx.bezierCurveTo(width - 460, height - 370, width - 700, height - 180, width - 860, height);
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#D4AF37';
  ctx.stroke();
  ctx.restore();

  // 4. LUKIS LOGO JAIS JIKA DIBEKALKAN
  if (logoDataUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Jangan henti jika ralat imej
        img.src = logoDataUrl;
      });

      if (img.width > 0 && img.height > 0) {
        const logoTargetWidth = 360;
        const logoTargetHeight = (img.height / img.width) * logoTargetWidth;
        const logoX = (width - logoTargetWidth) / 2;
        const logoY = 160;
        ctx.drawImage(img, logoX, logoY, logoTargetWidth, logoTargetHeight);
      }
    } catch (e) {
      console.warn('Gagal melukis logo pada latar:', e);
    }
  }

  // 5. TAJUK SIJIL PENYERTAAN (DALAM TEKSTUR EMAS TERTIMBUL)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Sijil Penyertaan
  const titleY = 880;
  ctx.font = 'bold 110px "Times New Roman", Times, serif';
  
  // Bayang halus emas
  ctx.fillStyle = 'rgba(166, 121, 38, 0.25)';
  ctx.fillText('SIJIL PENYERTAAN', width / 2 + 2, titleY + 3);

  // Teks emas
  const titleGrad = ctx.createLinearGradient(width / 2 - 400, titleY, width / 2 + 400, titleY);
  titleGrad.addColorStop(0, '#9C7528');
  titleGrad.addColorStop(0.3, '#C89B3C');
  titleGrad.addColorStop(0.6, '#F1DF99');
  titleGrad.addColorStop(0.8, '#B8862E');
  titleGrad.addColorStop(1, '#875C17');
  ctx.fillStyle = titleGrad;
  ctx.fillText('SIJIL PENYERTAAN', width / 2, titleY);

  // Dengan ini diperakui bahawa
  ctx.font = '54px "Times New Roman", Times, serif';
  ctx.fillStyle = '#222222';
  ctx.fillText('Dengan ini diperakui bahawa', width / 2, 1040);

  ctx.restore();

  return canvas.toDataURL('image/png', 0.95);
}

/**
 * Muat turun imej dari URL (seperti Google Drive link atau imej awan)
 */
async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  try {
    let directUrl = url.trim();
    // Tukar pautan Google Drive view kepada direct download link
    const driveMatch = directUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || directUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      directUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }

    const resp = await fetch(directUrl);
    if (!resp.ok) return null;
    const arrayBuffer = await resp.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (err) {
    console.warn('Gagal memuat turun imej template:', err);
    return null;
  }
}

/**
 * Ambil logo JAIS tempatan
 */
async function getJaisLogoDataUrl(): Promise<string | undefined> {
  try {
    // Cuba ambil dari /logo.png
    const resp = await fetch('/logo.png');
    if (resp.ok) {
      const blob = await resp.blob();
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }
  } catch (e) {
    console.warn('Logo fetch error:', e);
  }
  return undefined;
}

/**
 * Helper untuk memusatkan teks pada paksi X dalam pdf-lib
 */
function drawCenteredText(
  page: PDFPage,
  text: string,
  y: number,
  size: number,
  font: any,
  color: any,
  maxWidth = 500
): void {
  const textWidth = font.widthOfTextAtSize(text, size);
  if (textWidth > maxWidth && size > 11) {
    // Saizkan semula jika terlalu lebar
    const adjustedSize = Math.max(10, size * (maxWidth / textWidth));
    const newWidth = font.widthOfTextAtSize(text, adjustedSize);
    const x = (page.getWidth() - newWidth) / 2;
    page.drawText(text, { x, y, size: adjustedSize, font, color });
    return;
  }
  const x = (page.getWidth() - textWidth) / 2;
  page.drawText(text, { x, y, size, font, color });
}

/**
 * Helper untuk memecahkan teks berbilang baris dan memusatkannya
 */
function drawCenteredMultilineText(
  page: PDFPage,
  text: string,
  startY: number,
  size: number,
  lineHeight: number,
  font: any,
  color: any,
  maxWidth = 480
): number {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, size);
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  let currentY = startY;
  for (const line of lines) {
    const lineWidth = font.widthOfTextAtSize(line, size);
    const x = (page.getWidth() - lineWidth) / 2;
    page.drawText(line, { x, y: currentY, size, font, color });
    currentY -= lineHeight;
  }

  return currentY;
}

/**
 * FUNGSI UTAMA: JANA SIJIL MENGGUNAKAN PDF-LIB
 * Menggunakan Master Template JAIS dengan penggantian pemegang tempat:
 * {{NAMA}}, {{IC}}, {{NAMA PROGRAM}}, {tarikh}, {tempat}
 */
export async function generateCertificateWithPdfLib(
  participant: CertificateParticipantData,
  customConfig?: Partial<MasterTemplateConfig>
): Promise<PdfLibResult> {
  const config = { ...getMasterTemplateConfig(), ...customConfig };

  // 1. Cipta Dokumen PDF-Lib
  const pdfDoc = await PDFDocument.create();

  // Dimensi standard A4 Portrait (595.28 x 841.89 mata)
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  // 2. Muat Fon Standard yang Pantas & Cantik
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Palet Warna Mewah JAIS
  const goldColor = rgb(0.55, 0.40, 0.14);       // Emas pekat berkualiti (#8C6624)
  const goldLightColor = rgb(0.68, 0.52, 0.20);  // Emas cerah (#AD8533)
  const darkColor = rgb(0.12, 0.13, 0.14);       // Arang gelap (#1F2124)
  const mutedColor = rgb(0.35, 0.35, 0.35);      // Kelabu (#595959)

  // 3. Muat Latar Belakang Master Template
  let backgroundEmbedded = false;

  // A. Semak jika pengguna menyediakan URL Master Template luaran
  if (config.useCustomImage && config.templateUrl && config.templateUrl.trim().length > 5) {
    try {
      const imgBytes = await fetchImageBytes(config.templateUrl);
      if (imgBytes) {
        // Cuba semak format sama ada PNG atau JPG
        let embeddedImg;
        try {
          embeddedImg = await pdfDoc.embedPng(imgBytes);
        } catch {
          embeddedImg = await pdfDoc.embedJpg(imgBytes);
        }
        page.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight
        });
        backgroundEmbedded = true;
      }
    } catch (e) {
      console.warn('Gagal memuatkan custom template URL, beralih ke penjana master template terbina:', e);
    }
  }

  // B. Jika tiada template luaran, jana Master Template Asal JAIS menggunakan Canvas
  if (!backgroundEmbedded) {
    const logoUrl = await getJaisLogoDataUrl();
    const bgDataUrl = await drawMasterTemplateCanvas(logoUrl);
    
    // Tukar Data URL kepada ArrayBuffer
    const response = await fetch(bgDataUrl);
    const bgBytes = await response.arrayBuffer();
    const bgImage = await pdfDoc.embedPng(bgBytes);

    page.drawImage(bgImage, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight
    });
  }

  // 4. LUKIS TEKS TEMPLATE DINAMIK (DENGAN KOORDINAT TEPAT MASTER TEMPLATE)
  // Perhatikan: Dalam pdf-lib, koordinat (0, 0) berada di sudut BAWAH-KIRI
  // Jadi Nilai Y bermula dari 841.89 (Atas) ke 0 (Bawah).

  const participantName = (participant.nama || 'PESERTA PROGRAM').toUpperCase().trim();
  const rawIc = (participant.ic || '').trim();
  const icDisplay = rawIc && rawIc !== '-' && rawIc !== 'TIADA' ? rawIc : '';
  const programName = (participant.namaProgram || 'PROGRAM JABATAN AGAMA ISLAM SARAWAK').toUpperCase().trim();
  const programDate = (participant.tarikhProgram || '').trim();
  const programVenue = (participant.tempatProgram || '').trim();
  const certNumber = participant.noSijil || `JAIS/CERT/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;

  // Posisi Y yang diselaraskan mengikut Master Template User Image:
  // Nilai Y: 841 (Atas) -> 580 (Sijil Penyertaan) -> 550 (Dengan ini diperakui bahawa)
  //          500 ({{NAMA}}) -> 472 ({{IC}}) -> 435 (Telah menyertai)
  //          395 ({{NAMA PROGRAM}}) -> 345 (Pada {tarikh}) -> 325 (Bertempat di {tempat})
  //          230 (HAJI MUAL BIN HAJI SUAUD) -> 215 (PENGARAH JAIS)

  // 1. {{NAMA}} - Bold Emas Mewah (Saiz 21 - 25pt, auto-scaled)
  drawCenteredText(
    page,
    participantName,
    500,
    participantName.length > 35 ? 18 : 22,
    timesRomanBold,
    goldColor,
    490
  );

  // 2. {{IC}} - Bold Emas Mewah (Saiz 14 - 15pt)
  if (icDisplay) {
    drawCenteredText(
      page,
      icDisplay,
      472,
      14,
      timesRomanBold,
      goldColor,
      400
    );
  }

  // 3. Telah menyertai
  drawCenteredText(
    page,
    'Telah menyertai',
    432,
    13,
    timesRoman,
    darkColor,
    400
  );

  // 4. {{NAMA PROGRAM}} - Bold Hitam / Arang Elegan (Saiz 15 - 18pt, berbilang baris jika panjang)
  const afterProgramY = drawCenteredMultilineText(
    page,
    programName,
    400,
    16,
    22,
    timesRomanBold,
    darkColor,
    470
  );

  // 5. Pada {tarikh}
  const dateY = Math.min(afterProgramY - 12, 345);
  if (programDate) {
    drawCenteredText(
      page,
      `Pada ${programDate}`,
      dateY,
      13,
      timesRoman,
      darkColor,
      450
    );
  }

  // 6. Bertempat di {tempat}
  const venueY = dateY - 20;
  if (programVenue) {
    drawCenteredText(
      page,
      `Bertempat di ${programVenue}`,
      venueY,
      13,
      timesRoman,
      darkColor,
      460
    );
  }

  // 7. PENANDATANGAN RASMI: HAJI MUAL BIN HAJI SUAUD & PENGARAH JAIS
  const signatoryName = config.penandatanganNama || 'HAJI MUAL BIN HAJI SUAUD';
  const signatoryTitle = config.penandatanganJawatan || 'PENGARAH JABATAN AGAMA ISLAM SARAWAK';
  const signatoryY = 225;

  // Garisan penandatangan
  const sigLineWidth = 280;
  const sigLineX = (pageWidth - sigLineWidth) / 2;
  page.drawLine({
    start: { x: sigLineX, y: signatoryY + 18 },
    end: { x: sigLineX + sigLineWidth, y: signatoryY + 18 },
    thickness: 1,
    color: darkColor
  });

  // Nama Pengarah
  drawCenteredText(
    page,
    signatoryName,
    signatoryY,
    12.5,
    timesRomanBold,
    darkColor,
    450
  );

  // Jawatan Pengarah
  drawCenteredText(
    page,
    signatoryTitle,
    signatoryY - 16,
    10.5,
    timesRoman,
    mutedColor,
    450
  );

  // 8. KOD KESELAMATAN & NOMBOR SIJIL (DI BAHAGIAN BAWAH KAKI HALAMAN)
  const certFooterText = `No. Sijil: ${certNumber}`;
  const footerWidth = helvetica.widthOfTextAtSize(certFooterText, 8.5);
  page.drawText(certFooterText, {
    x: (pageWidth - footerWidth) / 2,
    y: 80,
    size: 8.5,
    font: helvetica,
    color: mutedColor
  });

  // 5. Simpan & Hasilkan Output
  const pdfBytes = await pdfDoc.save();
  const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
  const pdfDataUrl = URL.createObjectURL(pdfBlob);

  // Jana Base64 untuk penghantaran ke Google Apps Script (simpan Drive & emel)
  let binary = '';
  const len = pdfBytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(pdfBytes[i]);
  }
  const pdfBase64 = btoa(binary);

  return {
    pdfBytes,
    pdfBlob,
    pdfBase64,
    pdfDataUrl
  };
}

/**
 * Muat turun fail PDF serta merta dalam pelayar
 */
export function downloadCertificatePdf(pdfBlob: Blob, filename = 'Sijil_Penyertaan_JAIS.pdf'): void {
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
