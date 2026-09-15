import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Mail, Award, CheckCircle2, Clock, XCircle, Search, Filter,
  Send, ExternalLink, Copy, Check, Eye, AlertCircle, RefreshCw,
  Code2, Sparkles, ChevronRight, FileCheck, ShieldCheck, Download,
  UserCheck, Plus, AlertTriangle, FileText, ArrowRight, ShieldAlert,
  HelpCircle, Settings, Globe, Link2, CheckCircle
} from 'lucide-react';
import { DashboardData } from '../dashboard/types';
import { 
  approveParticipant,
  updateParticipantEmail,
  generateCertificate,
  approveAndGenerateCertificate, 
  savePdfLibCertificate,
  savePdfLibCertificateAndSendEmail,
  resendCertificateEmail, 
  sendTestCertificateEmail,
  getEffectiveScriptUrl,
  setEffectiveScriptUrl,
  testWebAppConnection,
  DEFAULT_GOOGLE_SCRIPT_URL
} from '../services/api';
import { GOOGLE_APPS_SCRIPT_CODE, CERTIFICATE_DRIVE_FOLDER_URL } from '../services/googleAppsScriptCode';
import {
  generateCertificateWithPdfLib,
  downloadCertificatePdf,
  getMasterTemplateConfig,
  saveMasterTemplateConfig,
  MasterTemplateConfig,
  PdfLibResult
} from '../services/pdfLibCertificate';

interface ParticipantsPageProps {
  data: DashboardData[];
  onUpdateStatus: (
    id: string, 
    newStatus: 'TELAH DIHANTAR' | 'DILULUSKAN' | 'DITOLAK' | 'MENUNGGU', 
    options?: {
      dateStr?: string;
      emailStatus?: 'PENDING' | 'NOT_GENERATED' | 'GENERATING' | 'GENERATED' | 'NOT_SENT' | 'SENT' | 'GENERATION_FAILED' | 'EMAIL_FAILED' | 'FAILED';
      noSijil?: string;
      certFileId?: string;
      certPdfUrl?: string;
      lastError?: string;
      emelPeserta?: string;
    }
  ) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export const ParticipantsPage: React.FC<ParticipantsPageProps> = ({
  data,
  onUpdateStatus,
  onRefresh,
  isLoading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'SEMUA' | 'MENUNGGU' | 'TELAH DIHANTAR' | 'GAGAL' | 'DITOLAK'>('SEMUA');
  const [programFilter, setProgramFilter] = useState<string>('SEMUA');
  
  // Progress & action states
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [notification, setNotification] = useState<{ 
    type: 'success' | 'info' | 'error' | 'warning'; 
    message: string;
    details?: string;
    actionUrl?: string;
    actionLabel?: string;
  } | null>(null);

  // Bulk Approval & Generation State
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; success: number; failed: number }>({
    current: 0,
    total: 0,
    success: 0,
    failed: 0
  });

  // Bulk Send Email State (Separate action from generation)
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [isBulkEmailProcessing, setIsBulkEmailProcessing] = useState(false);
  const [bulkEmailProgress, setBulkEmailProgress] = useState<{ current: number; total: number; success: number; failed: number }>({
    current: 0,
    total: 0,
    success: 0,
    failed: 0
  });

  // Modals
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [previewParticipant, setPreviewParticipant] = useState<DashboardData | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);

  // PDF-Lib Certificate Preview Modal & Master Template Config
  const [pdfPreviewParticipant, setPdfPreviewParticipant] = useState<DashboardData | null>(null);
  const [pdfPreviewResult, setPdfPreviewResult] = useState<PdfLibResult | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [showMasterTemplateModal, setShowMasterTemplateModal] = useState(false);
  const [templateConfig, setTemplateConfig] = useState<MasterTemplateConfig>(getMasterTemplateConfig());
  const [templateConfigSaved, setTemplateConfigSaved] = useState(false);

  // Web App Configuration & Connection Test Modal
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [currentScriptUrl, setCurrentScriptUrl] = useState(getEffectiveScriptUrl());
  const [inputScriptUrl, setInputScriptUrl] = useState(getEffectiveScriptUrl());
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [urlTestStatus, setUrlTestStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Form for direct test email
  const [testName, setTestName] = useState('PENTADBIR SISTEM JAIS');
  const [testIc, setTestIc] = useState('900101-13-1234');
  const [testEmail, setTestEmail] = useState('');
  const [testProgram, setTestProgram] = useState('KURSUS PENGURUSAN DAN PENILAIAN PROGRAM JAIS');
  const [isSendingDirectTest, setIsSendingDirectTest] = useState(false);

  // Ekstrak semua data peserta sebenar dari Google Sheet (Lajur AI sebagai Nama)
  // Buang sebarang data mock/demo
  const allRealSheetParticipants = useMemo(() => {
    return data.filter(d => {
      if (d.id && String(d.id).startsWith('DEMO-')) return false;

      const nama = String(d.namaPeserta || '').trim();
      const hasValidName = Boolean(
        nama &&
        nama !== '-' &&
        nama.toUpperCase() !== 'NAMA' &&
        nama.toUpperCase() !== 'NAMA PESERTA' &&
        nama.toUpperCase() !== 'NAMA PENUH' &&
        nama.toUpperCase() !== 'TIADA' &&
        nama.toUpperCase() !== 'NIL' &&
        nama.toUpperCase() !== 'NAMA_PESERTA' &&
        nama.toUpperCase() !== 'NAMA PENUH ORI'
      );

      return hasValidName;
    });
  }, [data]);

  // Mod saringan: Default 'LENGKAP' (mana yang ada isi nama dan emel) mengikut arahan pengguna
  const [dataFilterMode, setDataFilterMode] = useState<'LENGKAP' | 'SEMUA' | 'BELUM_ADA_EMEL'>('LENGKAP');

  // Modal Kemas Kini Emel Peserta terus ke Lajur AJ (Col 36) Google Sheet
  const [emailModal, setEmailModal] = useState<{
    isOpen: boolean;
    participant: DashboardData | null;
    nextAction?: 'approve' | 'generate_and_email' | 'none';
  }>({
    isOpen: false,
    participant: null,
    nextAction: 'none'
  });
  const [modalEmailInput, setModalEmailInput] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailModalError, setEmailModalError] = useState('');

  // Senarai peserta aktif mengikut mod saringan (Default: LENGKAP)
  const participantsList = useMemo(() => {
    return allRealSheetParticipants.filter(d => {
      const emel = String(d.emelPeserta || '').trim();
      const hasValidEmail = Boolean(
        emel &&
        emel !== '-' &&
        emel.toLowerCase() !== 'tiada' &&
        emel.toLowerCase() !== 'nil' &&
        emel.toLowerCase() !== 'emel' &&
        emel.toLowerCase() !== 'email' &&
        emel.includes('@')
      );

      if (dataFilterMode === 'LENGKAP') {
        return hasValidEmail;
      }
      if (dataFilterMode === 'BELUM_ADA_EMEL') {
        return !hasValidEmail;
      }
      return true;
    });
  }, [allRealSheetParticipants, dataFilterMode]);

  // Simpan Emel Peserta terus ke Lajur AJ Google Sheet
  const handleSaveEmailToColAJ = async () => {
    if (!emailModal.participant) return;
    const email = modalEmailInput.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailRegex.test(email)) {
      setEmailModalError('Sila masukkan alamat emel yang sah (contoh: peserta@gmail.com).');
      return;
    }

    setIsSavingEmail(true);
    setEmailModalError('');
    try {
      const p = emailModal.participant;
      await updateParticipantEmail({
        id: p.id,
        emel: email,
        nama: p.namaPeserta
      });

      // Kemaskini state peserta dalam aplikasi
      onUpdateStatus(p.id, p.statusKelulusan || 'MENUNGGU', {
        emelPeserta: email
      });

      setNotification({
        type: 'success',
        message: `Emel (${email}) berjaya dikemas kini ke Lajur AJ Google Sheet untuk ${p.namaPeserta || 'peserta'}.`
      });

      const nextAction = emailModal.nextAction;
      const updatedParticipant = { ...p, emelPeserta: email };

      setEmailModal({ isOpen: false, participant: null, nextAction: 'none' });
      setModalEmailInput('');

      // Laksanakan tindakan seterusnya sekiranya dicetuskan oleh butang Lulus atau Jana Sijil
      if (nextAction === 'generate_and_email') {
        handleApproveAndSend(updatedParticipant);
      } else if (nextAction === 'approve') {
        handleApproveOnly(updatedParticipant);
      }
    } catch (err: any) {
      setEmailModalError(err?.message || 'Ralat semasa menyimpan emel ke Google Sheet.');
    } finally {
      setIsSavingEmail(false);
    }
  };

  // Unique program names for dropdown filter
  const programOptions = useMemo(() => {
    const set = new Set<string>();
    participantsList.forEach(p => {
      if (p.programName && p.programName !== 'PROGRAM TIDAK DINYATAKAN') {
        set.add(p.programName);
      }
    });
    return Array.from(set).sort();
  }, [participantsList]);

  // Filtered participants
  const filteredParticipants = useMemo(() => {
    return participantsList.filter(p => {
      const search = searchTerm.toLowerCase().trim();
      const matchSearch = !search || 
        (p.namaPeserta && p.namaPeserta.toLowerCase().includes(search)) ||
        (p.emelPeserta && p.emelPeserta.toLowerCase().includes(search)) ||
        (p.noKpPeserta && p.noKpPeserta.toLowerCase().includes(search)) ||
        (p.noSijil && p.noSijil.toLowerCase().includes(search)) ||
        (p.programName && p.programName.toLowerCase().includes(search));

      const currentStatus = p.statusKelulusan || 'MENUNGGU';
      const isApproved = currentStatus === 'DILULUSKAN' && p.emailStatus !== 'SENT';
      const isSent = currentStatus === 'TELAH DIHANTAR' || (currentStatus === 'DILULUSKAN' && p.emailStatus === 'SENT');
      const isFailed = p.emailStatus === 'EMAIL_FAILED' || p.emailStatus === 'GENERATION_FAILED';

      let matchStatus = true;
      if (statusFilter === 'SEMUA') matchStatus = true;
      else if (statusFilter === 'MENUNGGU') matchStatus = currentStatus === 'MENUNGGU';
      else if (statusFilter === 'DILULUSKAN') matchStatus = isApproved;
      else if (statusFilter === 'TELAH DIHANTAR') matchStatus = isSent;
      else if (statusFilter === 'GAGAL') matchStatus = isFailed;
      else if (statusFilter === 'DITOLAK') matchStatus = currentStatus === 'DITOLAK';
      else matchStatus = currentStatus === statusFilter;

      const matchProgram = programFilter === 'SEMUA' || p.programName === programFilter;

      return matchSearch && matchStatus && matchProgram;
    });
  }, [participantsList, searchTerm, statusFilter, programFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = participantsList.length;
    const pending = participantsList.filter(p => (p.statusKelulusan || 'MENUNGGU') === 'MENUNGGU').length;
    const sent = participantsList.filter(p => p.statusKelulusan === 'TELAH DIHANTAR' || (p.statusKelulusan === 'DILULUSKAN' && p.emailStatus === 'SENT')).length;
    
    // Peserta yang sijilnya telah dijana (ada noSijil/url/fail) tetapi emel belum dihantar
    const readyToSend = participantsList.filter(p => 
      p.statusKelulusan === 'DILULUSKAN' && 
      p.emailStatus !== 'SENT' && 
      Boolean(p.noSijil || p.certPdfUrl || p.certFileId || p.emailStatus === 'NOT_SENT' || p.emailStatus === 'GENERATED')
    ).length;

    // Peserta diluluskan yang belum menjana sijil
    const needGeneration = participantsList.filter(p => 
      p.statusKelulusan === 'DILULUSKAN' && 
      p.emailStatus !== 'SENT' && 
      !p.noSijil && !p.certPdfUrl && !p.certFileId && p.emailStatus !== 'NOT_SENT' && p.emailStatus !== 'GENERATED'
    ).length;

    const approved = participantsList.filter(p => p.statusKelulusan === 'DILULUSKAN' && p.emailStatus !== 'SENT').length;
    const failed = participantsList.filter(p => p.emailStatus === 'EMAIL_FAILED' || p.emailStatus === 'GENERATION_FAILED').length;
    const rejected = participantsList.filter(p => p.statusKelulusan === 'DITOLAK').length;
    const completionRate = total > 0 ? Math.round((sent / total) * 100) : 0;

    return { total, pending, approved, readyToSend, needGeneration, sent, failed, rejected, completionRate };
  }, [participantsList]);

  // 1. APPROVE PARTICIPANT ONLY (Status bertukar DILULUSKAN / APPROVED -> Mengaktifkan Butang [ JANA SIJIL ])
  const handleApproveOnly = async (participant: DashboardData) => {
    setProcessingId(participant.id);
    setProcessingStep('Meluluskan peserta...');

    const currentTimestamp = new Date().toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    try {
      const result = await approveParticipant({
        id: participant.id,
        emel: participant.emelPeserta,
        nama: participant.namaPeserta
      });

      onUpdateStatus(participant.id, 'DILULUSKAN', {
        dateStr: currentTimestamp,
        emailStatus: 'NOT_GENERATED'
      });

      setNotification({
        type: 'success',
        message: `${participant.namaPeserta || 'Peserta'} telah DILULUSKAN. Butang [ JANA SIJIL ] kini diaktifkan!`,
      });
    } catch (err: any) {
      console.warn("Approve notice:", err);
      // Tetap kemaskini status secara optimistik di UI
      onUpdateStatus(participant.id, 'DILULUSKAN', {
        dateStr: currentTimestamp,
        emailStatus: 'NOT_GENERATED'
      });
      setNotification({
        type: 'success',
        message: `${participant.namaPeserta || 'Peserta'} telah diluluskan. Sedia untuk jana sijil.`,
      });
    } finally {
      setProcessingId(null);
      setProcessingStep('');
    }
  };

  // 2. JANA SIJIL (STATUS = DILULUSKAN / APPROVED) MENGGUNAKAN PDF-LIB
  // PDF-Lib (Pelayar Tempatan) -> Jana PDF Resolusi Tinggi -> Simpan Drive SAHAJA (Emel TIDAK dihantar)
  const handleGenerateOnly = async (participant: DashboardData) => {
    setProcessingId(participant.id);
    setProcessingStep('1/2: Menjana E-Sijil Resolusi Tinggi dengan PDF-Lib...');
    
    // Status sementara GENERATING
    onUpdateStatus(participant.id, 'DILULUSKAN', {
      emailStatus: 'GENERATING'
    });

    try {
      // 1. Jana fail PDF serta-merta menggunakan enjin pdf-lib
      const pdfLibResult = await generateCertificateWithPdfLib({
        nama: participant.namaPeserta || 'Peserta Program',
        ic: participant.noKpPeserta || '',
        namaProgram: participant.programName || 'Program JAIS',
        tarikhProgram: participant.programDate,
        tempatProgram: participant.tempat,
        noSijil: participant.noSijil
      });

      setProcessingStep('2/2: Menyimpan sijil ke Google Drive (Emel tidak dihantar)...');

      // 2. Simpan ke Google Drive SAHAJA melalui Apps Script (sendEmail: false)
      const result = await savePdfLibCertificate({
        id: participant.id,
        pdfBase64: pdfLibResult.pdfBase64,
        nama: participant.namaPeserta || 'Peserta Program',
        ic: participant.noKpPeserta || '',
        emel: participant.emelPeserta,
        namaProgram: participant.programName || 'Program JAIS',
        tarikhProgram: participant.programDate,
        tempatProgram: participant.tempat,
        noSijil: participant.noSijil,
        certificateFolderUrl: CERTIFICATE_DRIVE_FOLDER_URL,
        sendEmail: false
      });

      const currentTimestamp = new Date().toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });

      if (result.status === 'success' || result.status === 'partial_success') {
        const certData = result.data || {};
        onUpdateStatus(participant.id, 'DILULUSKAN', {
          dateStr: currentTimestamp,
          emailStatus: 'NOT_SENT',
          noSijil: certData.certificateNumber || participant.noSijil || '',
          certFileId: certData.certFileId || '',
          certPdfUrl: certData.certificateUrl || participant.pautanSijil,
          lastError: ''
        });

        setNotification({
          type: 'success',
          message: `✓ E-Sijil ${certData.certificateNumber || ''} berjaya dijana & disimpan ke Google Drive! Emel BELUM dihantar mengikut arahan. Anda boleh klik "Hantar Emel" bila bersedia.`,
          actionUrl: certData.certificateUrl,
          actionLabel: 'Buka Fail PDF Sijil'
        });
      } else {
        // Sandaran andai Google Apps Script tidak dapat dihubungi:
        // Fail PDF tetap dihasilkan dengan sempurna oleh pdf-lib!
        // Muat turun PDF terus ke peranti pengguna supaya tiada kerja tergendala.
        downloadCertificatePdf(pdfLibResult.pdfBlob, `Sijil_${participant.namaPeserta || 'Peserta'}.pdf`);

        onUpdateStatus(participant.id, 'DILULUSKAN', {
          dateStr: currentTimestamp,
          emailStatus: 'NOT_SENT',
          lastError: result.message || 'Google Apps Script tidak aktif'
        });

        setNotification({
          type: 'info',
          message: `Sijil PDF-Lib berjaya dijana dan dimuat turun terus ke komputer/peranti anda! Emel tidak dihantar.`,
          details: 'Perkhidmatan Google Apps Script di luar talian.'
        });
      }
    } catch (err: any) {
      console.error("Generate error with pdf-lib:", err);
      onUpdateStatus(participant.id, 'DILULUSKAN', {
        emailStatus: 'GENERATION_FAILED',
        lastError: err?.message || 'Gagal menjana sijil PDF-Lib'
      });
      setNotification({
        type: 'error',
        message: `Ralat Penjanaan Sijil PDF-Lib: ${err?.message || 'Ralat tidak diketahui.'}`
      });
    } finally {
      setProcessingId(null);
      setProcessingStep('');
    }
  };

  // 2.5 HANTAR EMEL SIJIL (Tindakan berasingan daripada penjanaan sijil)
  const handleSendEmail = async (participant: DashboardData) => {
    if (!participant.emelPeserta || participant.emelPeserta === '-' || !participant.emelPeserta.includes('@')) {
      setEmailModal({
        isOpen: true,
        participant,
        nextAction: 'none'
      });
      setModalEmailInput(participant.emelPeserta && participant.emelPeserta.includes('@') ? participant.emelPeserta : '');
      setEmailModalError('');
      return;
    }

    setProcessingId(participant.id);
    setProcessingStep(`Menghantar emel e-sijil ke ${participant.emelPeserta}...`);

    try {
      const result = await resendCertificateEmail({
        id: participant.id,
        certFileId: participant.certFileId,
        emel: participant.emelPeserta,
        nama: participant.namaPeserta || 'Peserta Program',
        namaProgram: participant.programName || 'Program JAIS',
        noSijil: participant.noSijil,
        ic: participant.noKpPeserta,
        tarikhProgram: participant.programDate,
        tempatProgram: participant.tempat
      });

      const currentTimestamp = new Date().toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });

      if (result.status === 'success') {
        const certData = result.data || {};
        onUpdateStatus(participant.id, 'TELAH DIHANTAR', {
          dateStr: currentTimestamp,
          emailStatus: 'SENT',
          certPdfUrl: certData.certificateUrl || participant.certPdfUrl,
          lastError: ''
        });

        setNotification({
          type: 'success',
          message: `✓ E-Sijil (${participant.noSijil || 'Rasmi'}) berjaya dihantar ke ${participant.emelPeserta}!`,
          actionUrl: certData.certificateUrl || participant.certPdfUrl,
          actionLabel: 'Buka Fail Sijil'
        });
      } else {
        onUpdateStatus(participant.id, participant.statusKelulusan || 'DILULUSKAN', {
          emailStatus: 'EMAIL_FAILED',
          lastError: result.message || 'Gagal menghantar emel melalui Gmail'
        });

        setNotification({
          type: 'error',
          message: `Gagal menghantar emel: ${result.message || 'Sila cuba lagi.'}`
        });
      }
    } catch (err: any) {
      console.error("Send email error:", err);
      setNotification({
        type: 'error',
        message: `Ralat semasa menghantar emel: ${err?.message || err}`
      });
    } finally {
      setProcessingId(null);
      setProcessingStep('');
    }
  };

  // 3. APPROVE & GENERATE CERTIFICATE DENGAN PDF-LIB
  const handleApproveAndSend = async (participant: DashboardData) => {
    if (!participant.emelPeserta || participant.emelPeserta === '-' || !participant.emelPeserta.includes('@')) {
      setEmailModal({
        isOpen: true,
        participant,
        nextAction: 'generate_and_email'
      });
      setModalEmailInput(participant.emelPeserta && participant.emelPeserta.includes('@') ? participant.emelPeserta : '');
      setEmailModalError('');
      return;
    }

    setProcessingId(participant.id);
    setProcessingStep('1/2: Menjana e-sijil dengan PDF-Lib...');

    try {
      // 1. Jana Sijil PDF-Lib
      const pdfLibResult = await generateCertificateWithPdfLib({
        nama: participant.namaPeserta || 'Peserta Program',
        ic: participant.noKpPeserta || '',
        namaProgram: participant.programName || 'Program JAIS',
        tarikhProgram: participant.programDate,
        tempatProgram: participant.tempat,
        noSijil: participant.noSijil
      });

      setProcessingStep('2/2: Meluluskan & menghantar emel...');

      const result = await savePdfLibCertificateAndSendEmail({
        id: participant.id,
        pdfBase64: pdfLibResult.pdfBase64,
        nama: participant.namaPeserta || 'Peserta Program',
        ic: participant.noKpPeserta || '',
        emel: participant.emelPeserta,
        namaProgram: participant.programName || 'Program JAIS',
        tarikhProgram: participant.programDate,
        tempatProgram: participant.tempat,
        noSijil: participant.noSijil,
        certificateFolderUrl: CERTIFICATE_DRIVE_FOLDER_URL
      });

      const currentTimestamp = new Date().toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });

      if (result.status === 'success') {
        const certData = result.data || {};
        onUpdateStatus(participant.id, 'TELAH DIHANTAR', {
          dateStr: currentTimestamp,
          emailStatus: 'SENT',
          noSijil: certData.certificateNumber || '',
          certFileId: certData.certFileId || '',
          certPdfUrl: certData.certificateUrl || participant.pautanSijil
        });

        setNotification({
          type: 'success',
          message: `E-Sijil ${certData.certificateNumber || ''} berjaya dihantar ke ${participant.emelPeserta}!`,
          actionUrl: certData.certificateUrl,
          actionLabel: 'Buka Fail PDF Sijil'
        });
      } else if (result.status === 'partial_success' || result.data?.code === 'EMAIL_FAILED') {
        const certData = result.data || {};
        onUpdateStatus(participant.id, 'DILULUSKAN', {
          dateStr: currentTimestamp,
          emailStatus: 'EMAIL_FAILED',
          noSijil: certData.certificateNumber || '',
          certFileId: certData.certFileId || '',
          certPdfUrl: certData.certificateUrl || participant.pautanSijil,
          lastError: result.message || 'Gagal menghantar emel melalui Gmail'
        });

        setNotification({
          type: 'warning',
          message: `Sijil ${certData.certificateNumber || ''} berjaya dijana di Google Drive, tetapi emel gagal dihantar. Anda boleh menekan "Hantar Semula".`,
          details: result.message
        });
      } else {
        downloadCertificatePdf(pdfLibResult.pdfBlob, `Sijil_${participant.namaPeserta || 'Peserta'}.pdf`);

        onUpdateStatus(participant.id, 'DILULUSKAN', {
          dateStr: currentTimestamp,
          emailStatus: 'NOT_GENERATED',
          lastError: result.message || 'Penjanaan sijil selesai tempatan'
        });

        setNotification({
          type: 'info',
          message: `Sijil telah dimuat turun secara langsung ke peranti anda.`,
          details: 'Sambungan Google Apps Script tidak tersedia.'
        });
      }
    } catch (err: any) {
      console.error("Approve error with pdf-lib:", err);
      setNotification({
        type: 'error',
        message: `Ralat penjanaan PDF-Lib: ${err?.message || 'Sila semak sambungan anda.'}`
      });
    } finally {
      setProcessingId(null);
      setProcessingStep('');
    }
  };

  // 3.5 BUKA PRATONTON SIJIL PDF-LIB SECARA LANGSUNG
  const handleOpenPdfLibPreview = async (participant: DashboardData) => {
    setPdfPreviewParticipant(participant);
    setIsGeneratingPreview(true);
    setPdfPreviewResult(null);

    try {
      const result = await generateCertificateWithPdfLib({
        nama: participant.namaPeserta || 'PESERTA PROGRAM',
        ic: participant.noKpPeserta || '',
        namaProgram: participant.programName || 'PROGRAM JABATAN AGAMA ISLAM SARAWAK',
        tarikhProgram: participant.programDate,
        tempatProgram: participant.tempat,
        noSijil: participant.noSijil
      });

      setPdfPreviewResult(result);
    } catch (err: any) {
      console.error("Gagal menjana pratonton PDF-Lib:", err);
      setNotification({
        type: 'error',
        message: `Gagal menjana pratonton: ${err?.message || err}`
      });
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Muat turun terus PDF untuk mana-mana peserta
  const handleDownloadDirectPdf = async (participant: DashboardData) => {
    try {
      setProcessingId(participant.id);
      setProcessingStep('Menjana fail PDF untuk muat turun...');
      const result = await generateCertificateWithPdfLib({
        nama: participant.namaPeserta || 'Peserta Program',
        ic: participant.noKpPeserta || '',
        namaProgram: participant.programName || 'Program JAIS',
        tarikhProgram: participant.programDate,
        tempatProgram: participant.tempat,
        noSijil: participant.noSijil
      });
      const filename = `Sijil_${(participant.namaPeserta || 'Peserta').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      downloadCertificatePdf(result.pdfBlob, filename);
      setNotification({
        type: 'success',
        message: `Fail PDF ${filename} berjaya dimuat turun terus ke peranti anda!`
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Gagal memuat turun: ${err?.message || err}`
      });
    } finally {
      setProcessingId(null);
      setProcessingStep('');
    }
  };

  // Simpan tetapan Master Template
  const handleSaveMasterTemplate = () => {
    saveMasterTemplateConfig(templateConfig);
    setTemplateConfigSaved(true);
    setTimeout(() => setTemplateConfigSaved(false), 3000);
    setNotification({
      type: 'success',
      message: 'Tetapan Master Template Sijil berjaya disimpan!'
    });
  };

  // 4. RESEND CERTIFICATE EMAIL (No new PDF creation)
  const handleResend = async (participant: DashboardData) => {
    if (!participant.emelPeserta || participant.emelPeserta === '-') {
      setNotification({
        type: 'error',
        message: `Tiada emel berdaftar untuk ${participant.namaPeserta || 'peserta ini'}.`
      });
      return;
    }

    setProcessingId(participant.id);
    setProcessingStep('Menghantar semula emel sijil sedia ada...');

    try {
      const result = await resendCertificateEmail({
        id: participant.id,
        certFileId: participant.certFileId,
        emel: participant.emelPeserta,
        nama: participant.namaPeserta || 'Peserta Program',
        namaProgram: participant.programName || 'Program JAIS',
        noSijil: participant.noSijil,
        ic: participant.noKpPeserta,
        tarikhProgram: participant.programDate,
        tempatProgram: participant.tempat
      });

      const currentTimestamp = new Date().toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });

      if (result.status === 'success') {
        const certData = result.data || {};
        onUpdateStatus(participant.id, 'TELAH DIHANTAR', {
          dateStr: currentTimestamp,
          emailStatus: 'SENT',
          certPdfUrl: certData.certificateUrl || participant.certPdfUrl,
          lastError: ''
        });

        setNotification({
          type: 'success',
          message: `Emel sijil (${participant.noSijil || 'Rasmi'}) berjaya dihantar semula ke ${participant.emelPeserta}!`,
          actionUrl: certData.certificateUrl || participant.certPdfUrl,
          actionLabel: 'Buka Sijil'
        });
      } else {
        onUpdateStatus(participant.id, participant.statusKelulusan || 'DILULUSKAN', {
          emailStatus: 'EMAIL_FAILED',
          lastError: result.message || 'Gagal menghantar semula emel'
        });

        setNotification({
          type: 'error',
          message: `Gagal menghantar semula: ${result.message || 'Sila cuba sebentar lagi.'}`
        });
      }
    } catch (err: any) {
      console.error("Resend error:", err);
      setNotification({
        type: 'error',
        message: 'Ralat semasa menghantar semula emel.'
      });
    } finally {
      setProcessingId(null);
      setProcessingStep('');
    }
  };

  // 3. BULK GENERATE CERTIFICATES WITH PDF-LIB (Emel TIDAK dihantar, sijil disimpan ke Drive sahaja)
  const handleStartBulkApprove = async () => {
    const pendingItems = filteredParticipants.filter(p => (p.statusKelulusan || 'MENUNGGU') === 'MENUNGGU' || (p.statusKelulusan === 'DILULUSKAN' && p.emailStatus !== 'SENT' && !p.noSijil && !p.certPdfUrl && !p.certFileId));
    if (pendingItems.length === 0) return;

    setIsBulkProcessing(true);
    setBulkProgress({
      current: 0,
      total: pendingItems.length,
      success: 0,
      failed: 0
    });

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      setBulkProgress({
        current: i + 1,
        total: pendingItems.length,
        success: successCount,
        failed: failedCount
      });

      try {
        // 1. Jana fail PDF beresolusi tinggi dengan PDF-Lib
        const pdfLibResult = await generateCertificateWithPdfLib({
          nama: item.namaPeserta || 'Peserta',
          ic: item.noKpPeserta || '',
          namaProgram: item.programName || 'Program JAIS',
          tarikhProgram: item.programDate,
          tempatProgram: item.tempat,
          noSijil: item.noSijil
        });

        // 2. Simpan ke Drive SAHAJA (sendEmail: false)
        const res = await savePdfLibCertificate({
          id: item.id,
          pdfBase64: pdfLibResult.pdfBase64,
          nama: item.namaPeserta || 'Peserta',
          ic: item.noKpPeserta || '',
          emel: item.emelPeserta,
          namaProgram: item.programName || 'Program JAIS',
          tarikhProgram: item.programDate,
          tempatProgram: item.tempat,
          noSijil: item.noSijil,
          certificateFolderUrl: CERTIFICATE_DRIVE_FOLDER_URL,
          sendEmail: false
        });

        const currentTimestamp = new Date().toLocaleString('en-GB');

        if (res.status === 'success' || res.status === 'partial_success') {
          onUpdateStatus(item.id, 'DILULUSKAN', {
            dateStr: currentTimestamp,
            emailStatus: 'NOT_SENT',
            noSijil: res.data?.certificateNumber || '',
            certFileId: res.data?.certFileId || '',
            certPdfUrl: res.data?.certificateUrl || item.pautanSijil
          });
          successCount++;
        } else {
          onUpdateStatus(item.id, 'DILULUSKAN', {
            dateStr: currentTimestamp,
            emailStatus: 'NOT_SENT',
            lastError: res.message
          });
          successCount++;
        }
      } catch (e: any) {
        console.warn("Bulk generate error for", item.id, e);
        failedCount++;
      }
    }

    setBulkProgress({
      current: pendingItems.length,
      total: pendingItems.length,
      success: successCount,
      failed: failedCount
    });

    setIsBulkProcessing(false);
    setShowBulkConfirmModal(false);

    setNotification({
      type: 'success',
      message: `Proses penjanaan sijil pukal selesai! ${successCount} fail sijil dijana & disimpan ke Google Drive. Emel BELUM dihantar. Klik butang 'Hantar Emel Pukal' bila bersedia.`
    });
  };

  // 3.5 BULK SEND EMAILS (Hantar emel kepada semua peserta yang sijilnya telah sedia)
  const handleStartBulkSendEmail = async () => {
    const readyItems = filteredParticipants.filter(p => 
      p.statusKelulusan === 'DILULUSKAN' && 
      p.emailStatus !== 'SENT' && 
      Boolean(p.noSijil || p.certPdfUrl || p.certFileId || p.emailStatus === 'NOT_SENT' || p.emailStatus === 'GENERATED') &&
      Boolean(p.emelPeserta && p.emelPeserta !== '-')
    );

    if (readyItems.length === 0) return;

    setIsBulkEmailProcessing(true);
    setBulkEmailProgress({
      current: 0,
      total: readyItems.length,
      success: 0,
      failed: 0
    });

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < readyItems.length; i++) {
      const item = readyItems[i];
      setBulkEmailProgress({
        current: i + 1,
        total: readyItems.length,
        success: successCount,
        failed: failedCount
      });

      try {
        const res = await resendCertificateEmail({
          id: item.id,
          certFileId: item.certFileId,
          emel: item.emelPeserta,
          nama: item.namaPeserta || 'Peserta',
          namaProgram: item.programName || 'Program JAIS',
          noSijil: item.noSijil,
          ic: item.noKpPeserta,
          tarikhProgram: item.programDate,
          tempatProgram: item.tempat
        });

        const currentTimestamp = new Date().toLocaleString('en-GB');

        if (res.status === 'success') {
          onUpdateStatus(item.id, 'TELAH DIHANTAR', {
            dateStr: currentTimestamp,
            emailStatus: 'SENT',
            certPdfUrl: res.data?.certificateUrl || item.certPdfUrl,
            lastError: ''
          });
          successCount++;
        } else {
          onUpdateStatus(item.id, 'DILULUSKAN', {
            emailStatus: 'EMAIL_FAILED',
            lastError: res.message || 'Gagal menghantar emel'
          });
          failedCount++;
        }
      } catch (e: any) {
        console.warn("Bulk send email error for", item.id, e);
        failedCount++;
      }
    }

    setBulkEmailProgress({
      current: readyItems.length,
      total: readyItems.length,
      success: successCount,
      failed: failedCount
    });

    setIsBulkEmailProcessing(false);
    setShowBulkEmailModal(false);

    setNotification({
      type: 'success',
      message: `Penghantaran emel pukal selesai! ${successCount} emel e-sijil berjaya dihantar${failedCount > 0 ? `, ${failedCount} memerlukan semakan.` : '.'}`
    });
  };

  // 4. DIRECT TEST EMAIL DISPATCH
  const handleSendDirectTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim()) {
      alert('Sila masukkan alamat emel penerima.');
      return;
    }

    setIsSendingDirectTest(true);

    try {
      const result = await sendTestCertificateEmail({
        recipientEmail: testEmail.trim().toLowerCase(),
        nama: testName.trim().toUpperCase(),
        ic: testIc.trim(),
        namaProgram: testProgram.trim(),
        tarikh: new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' }),
        tempat: 'IBU PEJABAT JAIS, KUCHING'
      });

      if (result.status === 'success') {
        const certData = result.data || {};
        setNotification({
          type: 'success',
          message: `E-Sijil Ujian (${certData.certificateNumber || 'JAIS-TEST'}) telah berjaya dihantar ke ${testEmail}!`,
          actionUrl: certData.certificateUrl,
          actionLabel: 'Lihat Sijil Ujian PDF'
        });
        setShowTestModal(false);
      } else {
        setNotification({
          type: 'error',
          message: `Ujian gagal: ${result.message || 'Sila semak konfigurasi Apps Script.'}`,
          details: 'Pastikan kod Code.gs telah dikemaskini dan dideploy dengan versi terkini.'
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: 'Ralat penghantaran sijil ujian.'
      });
    } finally {
      setIsSendingDirectTest(false);
    }
  };

  // 5. ADD TEST PARTICIPANT TO TABLE
  const handleAddTestToTable = () => {
    if (!testName.trim() || !testEmail.trim()) return;

    const newTestItem: DashboardData = {
      id: `TEST-${Date.now()}`,
      timestamp: new Date().toISOString(),
      programDate: new Date().toISOString().split('T')[0],
      filterTahun: String(new Date().getFullYear()),
      bahagian: 'KUCHING',
      tempat: 'IBU PEJABAT JAIS',
      penganjur: 'JAIS BAHAGIAN',
      jantina: 'LELAKI',
      umur: '31 - 40 TAHUN',
      quarter: 'Q1',
      tarafPendidikan: 'IJAZAH',
      namaPeserta: testName.toUpperCase().trim(),
      noKpPeserta: testIc.trim() || '900101-13-1234',
      emelPeserta: testEmail.toLowerCase().trim(),
      statusKelulusan: 'MENUNGGU',
      emailStatus: 'PENDING',
      tarikhKelulusan: '',
      pautanSijil: CERTIFICATE_DRIVE_FOLDER_URL,
      skorLogistik: 5,
      skorPengisian: 5,
      skorJamuan: 5,
      skorFasilitator: 5,
      skorUrusetia: 5,
      skorKeseluruhan: 5,
      skorFormula: 5,
      programName: testProgram,
      komen: 'Ujian penghantaran e-sijil',
      cadangan: '-'
    };

    try {
      const existing = JSON.parse(localStorage.getItem('JAIS_LOCAL_SUBMISSIONS') || '[]');
      localStorage.setItem('JAIS_LOCAL_SUBMISSIONS', JSON.stringify([newTestItem, ...existing]));
    } catch (err) {
      console.warn("Could not write test item", err);
    }

    onRefresh();
    setShowTestModal(false);

    setNotification({
      type: 'info',
      message: `Peserta ujian "${newTestItem.namaPeserta}" telah dimasukkan ke dalam jadual. Anda kini boleh menguji butang "Lulus & Emel".`
    });
  };

  // Reject participant
  const handleReject = (participant: DashboardData) => {
    onUpdateStatus(participant.id, 'DITOLAK');
    setNotification({
      type: 'info',
      message: `Penyertaan ${participant.namaPeserta} telah ditandakan sebagai Ditolak.`
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // Copy Google Drive Certificate Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(CERTIFICATE_DRIVE_FOLDER_URL);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  // Copy Apps Script Code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2500);
  };

  // Download standalone Code.gs file directly
  const handleDownloadCodeGs = () => {
    const blob = new Blob([GOOGLE_APPS_SCRIPT_CODE], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Code.gs';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Test Web App Connection
  const handleTestWebAppUrl = async () => {
    if (!inputScriptUrl.trim()) {
      setUrlTestStatus({
        success: false,
        message: 'Sila masukkan URL Web App yang sah.'
      });
      return;
    }
    setIsTestingUrl(true);
    setUrlTestStatus(null);
    try {
      const res = await testWebAppConnection(inputScriptUrl.trim());
      setUrlTestStatus(res);
    } catch (err: any) {
      setUrlTestStatus({
        success: false,
        message: err?.message || 'Ralat sambungan rangkaian.'
      });
    } finally {
      setIsTestingUrl(false);
    }
  };

  // Save new Web App URL
  const handleSaveWebAppUrl = () => {
    const trimmed = inputScriptUrl.trim();
    if (!trimmed.startsWith('https://script.google.com/')) {
      alert('URL mestilah bermula dengan https://script.google.com/');
      return;
    }
    setEffectiveScriptUrl(trimmed);
    setCurrentScriptUrl(trimmed);
    setNotification({
      type: 'success',
      message: 'URL Web App berjaya disimpan dan sedia digunakan!'
    });
    setShowUrlModal(false);
    onRefresh();
  };

  // Reset to default Web App URL
  const handleResetWebAppUrl = () => {
    setEffectiveScriptUrl('');
    setInputScriptUrl(DEFAULT_GOOGLE_SCRIPT_URL);
    setCurrentScriptUrl(DEFAULT_GOOGLE_SCRIPT_URL);
    setUrlTestStatus(null);
    setNotification({
      type: 'info',
      message: 'URL Web App telah dikembalikan kepada URL lalai.'
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. TOAST NOTIFICATION (Apple HIG floating banner) */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl border shadow-ios flex items-center justify-between gap-3 ${
              notification.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                : notification.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-950'
                  : notification.type === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-blue-50 border-blue-200 text-blue-950'
            }`}
          >
            <div className="flex items-start gap-3">
              {notification.type === 'success' && <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={20} />}
              {notification.type === 'error' && <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={20} />}
              {notification.type === 'warning' && <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />}
              {notification.type === 'info' && <Sparkles className="text-blue-600 shrink-0 mt-0.5" size={20} />}
              
              <div className="space-y-0.5">
                <p className="text-xs sm:text-sm font-bold leading-snug">{notification.message}</p>
                {notification.details && (
                  <p className="text-[11px] opacity-80 font-medium">{notification.details}</p>
                )}
                {notification.actionUrl && (
                  <a 
                    href={notification.actionUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 underline hover:text-emerald-900 mt-1"
                  >
                    <span>{notification.actionLabel || 'Buka Pautan'}</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
            
            <button 
              onClick={() => setNotification(null)}
              className="p-1 rounded-full hover:bg-black/5 text-gray-500 hover:text-black transition-colors shrink-0"
            >
              <XCircle size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. TOP ACTIONS & DRIVE LINK BANNER */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-black/[0.06] shadow-ios-card flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-lime-400 text-black text-[10px] font-extrabold uppercase tracking-wider">
              Modul e-Sijil Automatik JAIS
            </span>
            <span className="text-xs font-semibold text-gray-500">
              Penjanaan PDF & Penghantaran Emel Serta-merta
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#1C1C1E] tracking-tight">
            Senarai Nama Peserta & Kelulusan Sijil
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 font-medium max-w-2xl leading-relaxed">
            Data dibaca secara langsung daripada Google Sheet (hanya peserta yang mengisi Nama dan Emel). e-Sijil rasmi PDF dijana dan disimpan ke Google Drive serta dihantar ke emel peserta.
          </p>
        </div>

        {/* Action Buttons Header */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Refresh Real Data Button */}
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white hover:bg-gray-50 text-[#1C1C1E] border border-black/10 font-bold text-xs transition-all shadow-2xs ios-press"
            title="Muat Semula Data Sebenar dari Google Sheet"
          >
            <RefreshCw size={15} className={`text-emerald-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Memuat turun...' : 'Muat Semula Sheet'}</span>
          </button>

          {/* Open Google Drive Certificate Folder */}
          <a 
            href={CERTIFICATE_DRIVE_FOLDER_URL} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-lime-400 hover:bg-lime-500 text-black font-bold text-xs transition-all shadow-xs ios-press"
            title="Buka Folder Template Sijil di Google Drive"
          >
            <ExternalLink size={15} />
            <span>Folder Sijil Drive</span>
          </a>

          {/* Copy Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1C1C1E] font-semibold text-xs transition-all ios-press"
            title="Salin Pautan Template Sijil"
          >
            {linkCopied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
            <span>{linkCopied ? 'Disalin!' : 'Salin Pautan'}</span>
          </button>

          {/* View Google Apps Script Code */}
          <button
            type="button"
            onClick={() => setShowCodeModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-[#1C1C1E] hover:bg-black text-white font-semibold text-xs transition-all shadow-xs ios-press"
            title="Lihat & Salin Kod Google Apps Script (Code.gs)"
          >
            <Code2 size={15} className="text-lime-400" />
            <span>Kod Apps Script</span>
          </button>

          {/* Master Template Sijil (PDF-Lib) Trigger */}
          <button
            type="button"
            onClick={() => setShowMasterTemplateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-500/30 font-bold text-xs transition-all shadow-xs ios-press"
            title="Konfigurasi Master Template Sijil & Enjin Penjanaan PDF-Lib"
          >
            <Sparkles size={15} className="text-amber-600" />
            <span>Master Template (PDF-Lib)</span>
          </button>

          {/* Web App URL & Status Connection Modal Trigger */}
          <button
            type="button"
            onClick={() => {
              setInputScriptUrl(getEffectiveScriptUrl());
              setUrlTestStatus(null);
              setShowUrlModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1C1C1E] font-semibold text-xs transition-all border border-black/5 ios-press"
            title="Semak status sambungan & konfigurasikan Web App URL"
          >
            <Globe size={15} className="text-blue-600" />
            <span>Status Web App</span>
          </button>

          {/* Direct Test Email Modal Trigger */}
          <button
            type="button"
            onClick={() => setShowTestModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-lime-600/30 bg-lime-50 hover:bg-lime-100 text-lime-900 font-bold text-xs transition-all ios-press"
            title="Uji Penghantaran Sijil ke Emel Anda"
          >
            <Plus size={15} className="text-lime-700" />
            <span>+ Uji Emel Anda</span>
          </button>
        </div>
      </div>

      {/* 3. STAT CARDS (APPLE HIG INSET STYLE) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Registered */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-black/[0.06] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Jumlah Peserta</span>
            <div className="p-2 bg-black/[0.04] rounded-xl text-[#1C1C1E]">
              <Users size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[#1C1C1E] tracking-tight">{stats.total}</p>
          <p className="text-[11px] text-gray-400 font-medium">Borang penilaian dihantar</p>
        </div>

        {/* Pending Approval */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-amber-500/20 shadow-2xs space-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Menunggu</span>
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-700">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">{stats.pending}</p>
          <p className="text-[11px] text-amber-700/70 font-medium">Perlu disahkan</p>
        </div>

        {/* Sijil Dijana - Sedia Hantar Emel */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-blue-500/30 shadow-2xs space-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Sedia Emel</span>
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-800">
              <Mail size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-blue-700 tracking-tight">{stats.readyToSend}</p>
          <p className="text-[11px] text-blue-800/70 font-medium">Sijil telah dijana</p>
        </div>

        {/* Certificates Sent */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-emerald-500/20 shadow-2xs space-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Telah Dihantar</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-700">
              <Award size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">{stats.sent}</p>
          <p className="text-[11px] text-emerald-700/70 font-medium">Kadar selesai: {stats.completionRate}%</p>
        </div>

        {/* Errors / Retries Needed */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-black/[0.06] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Perlu Semakan / Gagal</span>
            <div className={`p-2 rounded-xl ${stats.failed > 0 ? 'bg-rose-100 text-rose-700' : 'bg-black/[0.04] text-gray-600'}`}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <p className={`text-2xl sm:text-3xl font-black tracking-tight ${stats.failed > 0 ? 'text-rose-600' : 'text-[#1C1C1E]'}`}>
            {stats.failed}
          </p>
          <p className="text-[11px] text-gray-400 font-medium">
            {stats.failed > 0 ? 'Tersedia untuk jana/hantar semula' : 'Tiada ralat penghantaran'}
          </p>
        </div>
      </div>

      {/* 4. CONTROLS, SEARCH & BULK APPROVE */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-black/[0.06] shadow-ios-card space-y-4">
        {/* Saringan Sumber Google Sheet (Lajur AI & AJ) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-gray-50 border border-black/[0.04] rounded-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
              Sumber Data Google Sheet:
            </span>
            <div className="inline-flex bg-white p-1 rounded-xl border border-black/[0.08] shadow-2xs">
              <button
                type="button"
                onClick={() => setDataFilterMode('LENGKAP')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  dataFilterMode === 'LENGKAP'
                    ? 'bg-[#1C1C1E] text-lime-400 shadow-2xs'
                    : 'text-gray-600 hover:text-black'
                }`}
                title="Hanya paparkan rekod yang mempunyai Nama (Lajur AI) dan Emel (Lajur AJ) diisi"
              >
                <CheckCircle2 size={13} className={dataFilterMode === 'LENGKAP' ? 'text-lime-400' : 'text-gray-400'} />
                <span>Lengkap (Nama & Emel)</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  dataFilterMode === 'LENGKAP' ? 'bg-lime-400/20 text-lime-300' : 'bg-gray-100 text-gray-600'
                }`}>
                  {allRealSheetParticipants.filter(p => p.emelPeserta && p.emelPeserta.includes('@')).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDataFilterMode('SEMUA')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  dataFilterMode === 'SEMUA'
                    ? 'bg-[#1C1C1E] text-white shadow-2xs'
                    : 'text-gray-600 hover:text-black'
                }`}
                title="Paparkan semua baris Google Sheet yang mempunyai Nama Peserta pada Lajur AI"
              >
                <span>Semua Peserta (Lajur AI)</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  dataFilterMode === 'SEMUA' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {allRealSheetParticipants.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDataFilterMode('BELUM_ADA_EMEL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  dataFilterMode === 'BELUM_ADA_EMEL'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-amber-800 hover:text-amber-950'
                }`}
                title="Peserta yang mempunyai Nama pada Lajur AI tetapi Lajur AJ (Emel) belum diisi"
              >
                <AlertCircle size={13} />
                <span>Belum Isi Emel</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  dataFilterMode === 'BELUM_ADA_EMEL' ? 'bg-black/20 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {allRealSheetParticipants.filter(p => !p.emelPeserta || !p.emelPeserta.includes('@')).length}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
            <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 font-mono text-[10px] text-gray-700">
              Lajur AI: Nama Peserta
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 font-mono text-[10px] text-gray-700">
              Lajur AJ: Emel Peserta
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama, emel, no. kad pengenalan atau no. sijil..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#F2F2F7] border border-black/[0.04] rounded-2xl text-xs font-semibold text-[#1C1C1E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-400 transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Program Dropdown Filter */}
          <div className="relative shrink-0">
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="w-full md:w-auto px-3.5 py-2.5 bg-[#F2F2F7] border border-black/[0.04] rounded-2xl text-xs font-bold text-[#1C1C1E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-400 cursor-pointer"
            >
              <option value="SEMUA">Semua Program ({programOptions.length})</option>
              {programOptions.map(p => (
                <option key={p} value={p}>
                  {p.length > 40 ? p.substring(0, 40) + '...' : p}
                </option>
              ))}
            </select>
          </div>

          {/* Bulk Action Buttons (Decoupled: Jana Sijil vs Hantar Emel) */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            {stats.pending > 0 && (
              <button
                type="button"
                onClick={() => setShowBulkConfirmModal(true)}
                className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl bg-[#1C1C1E] hover:bg-black text-lime-400 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all ios-press border border-lime-400/30"
                title="Jana fail e-sijil PDF-Lib secara pukal dan simpan ke Drive (Emel tidak dihantar)"
              >
                <Award size={14} className="text-lime-400" />
                <span>Jana Sijil Pukal ({stats.pending})</span>
              </button>
            )}

            {stats.readyToSend > 0 && (
              <button
                type="button"
                onClick={() => setShowBulkEmailModal(true)}
                className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all ios-press"
                title="Hantar emel rasmi kepada semua peserta yang sijilnya telah selesai dijana"
              >
                <Send size={14} />
                <span>Hantar Emel Pukal ({stats.readyToSend})</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Tabs (Apple Segmented Control) */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-black/[0.04]">
          <div className="bg-[#F2F2F7] p-1 rounded-2xl flex items-center gap-1 overflow-x-auto max-w-full">
            {(['SEMUA', 'MENUNGGU', 'DILULUSKAN', 'TELAH DIHANTAR', 'GAGAL', 'DITOLAK'] as const).map(tab => {
              const isActive = statusFilter === tab;
              const count = tab === 'SEMUA' ? stats.total :
                            tab === 'MENUNGGU' ? stats.pending :
                            tab === 'DILULUSKAN' ? stats.approved :
                            tab === 'TELAH DIHANTAR' ? stats.sent :
                            tab === 'GAGAL' ? stats.failed : stats.rejected;

              const label = tab === 'SEMUA' ? 'Semua' :
                            tab === 'MENUNGGU' ? 'Menunggu' :
                            tab === 'DILULUSKAN' ? 'Diluluskan' :
                            tab === 'TELAH DIHANTAR' ? 'Telah Dihantar' :
                            tab === 'GAGAL' ? 'Gagal' : 'Ditolak';

              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ios-press flex items-center gap-1.5 whitespace-nowrap ${
                    isActive 
                      ? 'bg-white text-[#1C1C1E] shadow-2xs' 
                      : 'text-gray-500 hover:text-[#1C1C1E]'
                  }`}
                >
                  <span>{label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-[#1C1C1E] text-white' : 'bg-black/5 text-gray-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <span className="text-xs text-gray-400 font-medium">
            Memaparkan {filteredParticipants.length} daripada {participantsList.length} rekod
          </span>
        </div>
      </div>

      {/* 5. PARTICIPANTS LIST TABLE */}
      <div className="bg-white rounded-3xl border border-black/[0.06] shadow-ios-card overflow-hidden">
        {participantsList.length === 0 ? (
          <div className="p-12 sm:p-16 text-center space-y-4">
            <div className="w-16 h-16 bg-lime-50 text-lime-700 rounded-3xl flex items-center justify-center mx-auto border border-lime-200">
              <Users size={32} />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-lg font-black text-[#1C1C1E]">Tiada Rekod Peserta (Nama & Emel)</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Sistem membaca data sebenar secara langsung daripada Google Sheet. Hanya baris yang mempunyai maklumat <strong>Nama Penuh</strong> dan <strong>Emel Sah</strong> akan disenaraikan di sini untuk tujuan kelulusan dan pengeluaran e-sijil.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              <button 
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1C1C1E] hover:bg-black text-lime-400 text-xs font-bold transition-all shadow-xs ios-press disabled:opacity-50"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                <span>{isLoading ? 'Sedang Menyegerak...' : 'Muat Semula Google Sheet'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowTestModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-black/10 bg-gray-50 hover:bg-gray-100 text-[#1C1C1E] font-bold text-xs transition-all ios-press"
              >
                <Plus size={14} className="text-lime-700" />
                <span>Uji Emel Anda</span>
              </button>
            </div>
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 mx-auto">
              <Users size={28} />
            </div>
            <h3 className="text-base font-bold text-[#1C1C1E]">Tiada Peserta Dijumpai</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Tiada rekod peserta yang sepadan dengan kriteria carian atau penapis status yang dipilih.
            </p>
            {(searchTerm || statusFilter !== 'SEMUA' || programFilter !== 'SEMUA') && (
              <button 
                onClick={() => { setSearchTerm(''); setStatusFilter('SEMUA'); setProgramFilter('SEMUA'); }}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 transition-colors"
              >
                Kosongkan Penapis
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-black/[0.06] text-[11px] uppercase tracking-wider font-bold text-gray-500">
                  <th className="py-3.5 px-4 sm:px-6">Peserta & Emel</th>
                  <th className="py-3.5 px-4">Program & Tarikh</th>
                  <th className="py-3.5 px-4 text-center">Status Kelulusan & No. Sijil</th>
                  <th className="py-3.5 px-4 text-center">Skor</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] text-xs">
                {filteredParticipants.map((p) => {
                  const isPending = (p.statusKelulusan || 'MENUNGGU') === 'MENUNGGU';
                  const isApproved = p.statusKelulusan === 'DILULUSKAN' && p.emailStatus !== 'SENT';
                  const isGenerating = p.emailStatus === 'GENERATING' || (processingId === p.id && processingStep.includes('Menjana'));
                  const isSent = p.statusKelulusan === 'TELAH DIHANTAR' || (p.statusKelulusan === 'DILULUSKAN' && p.emailStatus === 'SENT');
                  const isEmailFailed = p.emailStatus === 'EMAIL_FAILED';
                  const isGenFailed = p.emailStatus === 'GENERATION_FAILED';
                  const isRejected = p.statusKelulusan === 'DITOLAK';
                  const isCurrentProcessing = processingId === p.id;
                  const hasGeneratedCert = Boolean(p.noSijil || p.certPdfUrl || p.certFileId || p.emailStatus === 'NOT_SENT' || p.emailStatus === 'GENERATED');

                  return (
                    <tr key={p.id} className="hover:bg-black/[0.015] transition-colors">
                      {/* Peserta Info */}
                      <td className="py-4 px-4 sm:px-6 align-middle">
                        <div className="space-y-1 max-w-xs sm:max-w-sm">
                          <p className="font-extrabold text-[#1C1C1E] text-sm tracking-tight line-clamp-1">
                            {p.namaPeserta || <span className="text-gray-400 italic">Nama tidak dinyatakan</span>}
                          </p>

                          {/* IC and Email */}
                          <div className="flex flex-col gap-0.5 text-gray-600 font-medium">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Mail size={12} className="text-gray-400 shrink-0" />
                              {p.emelPeserta && p.emelPeserta.includes('@') ? (
                                <span className="text-xs text-blue-700 font-medium hover:underline select-all truncate">
                                  {p.emelPeserta}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEmailModal({
                                      isOpen: true,
                                      participant: p,
                                      nextAction: 'none'
                                    });
                                    setModalEmailInput('');
                                    setEmailModalError('');
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-bold bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-lg transition-colors ios-press"
                                  title="Isi alamat emel ke Lajur AJ Google Sheet"
                                >
                                  <Plus size={11} />
                                  <span>+ Isi Emel (Lajur AJ)</span>
                                </button>
                              )}
                            </div>

                            {p.noKpPeserta && (
                              <div className="flex items-center gap-1 text-[11px] text-gray-500 font-mono">
                                <span>No. K/P: {p.noKpPeserta}</span>
                              </div>
                            )}
                          </div>

                          {(p.jantina || p.umur) && (
                            <div className="flex items-center gap-1.5 pt-0.5">
                              {p.jantina && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-bold uppercase">
                                  {p.jantina}
                                </span>
                              )}
                              {p.umur && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                                  {p.umur}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Program Info */}
                      <td className="py-4 px-4 align-middle max-w-xs">
                        <div className="space-y-1">
                          <p className="font-bold text-[#1C1C1E] line-clamp-2 leading-snug">
                            {p.programName || '-'}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                            {p.programDate && <span>📅 {p.programDate}</span>}
                            {p.bahagian && <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-semibold">{p.bahagian}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Status & Certificate Info */}
                      <td className="py-4 px-4 align-middle text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center gap-1">
                          {isPending && !isGenFailed && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px]">
                              <Clock size={12} className="animate-pulse" />
                              <span>Menunggu Kelulusan</span>
                            </span>
                          )}

                          {isApproved && (
                            hasGeneratedCert ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-bold text-[11px]" title="Sijil telah dijana & disimpan ke Google Drive. Emel belum dihantar.">
                                <Award size={12} className="text-blue-600" />
                                <span>Sijil Dijana (Sedia Emel)</span>
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold text-[11px] ${
                                isGenerating
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                                  : 'bg-lime-50 text-lime-800 border border-lime-300'
                              }`}>
                                {isGenerating ? (
                                  <>
                                    <RefreshCw size={12} className="animate-spin" />
                                    <span>Sedang Menjana...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 size={12} className="text-lime-600" />
                                    <span>Diluluskan</span>
                                  </>
                                )}
                              </span>
                            )
                          )}

                          {isSent && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                              <CheckCircle2 size={12} />
                              <span>Telah Dihantar</span>
                            </span>
                          )}

                          {isEmailFailed && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]" title={p.lastError || 'Emel gagal dihantar'}>
                              <AlertCircle size={12} />
                              <span>Emel Gagal</span>
                            </span>
                          )}

                          {isGenFailed && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]" title={p.lastError || 'Penjanaan sijil gagal'}>
                              <AlertTriangle size={12} />
                              <span>Jana Sijil Gagal</span>
                            </span>
                          )}

                          {isRejected && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-semibold text-[11px]">
                              <XCircle size={12} />
                              <span>Ditolak</span>
                            </span>
                          )}

                          {/* Certificate Number & Direct Link */}
                          {p.noSijil && (
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                {p.noSijil}
                              </span>
                              {(p.certPdfUrl || p.pautanSijil) && (
                                <a
                                  href={p.certPdfUrl || p.pautanSijil}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 p-0.5"
                                  title="Lihat Fail Sijil di Google Drive"
                                >
                                  <ExternalLink size={11} />
                                </a>
                              )}
                            </div>
                          )}

                          {p.tarikhKelulusan && (
                            <span className="text-[9px] text-gray-400 font-medium">
                              {p.tarikhKelulusan}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Score */}
                      <td className="py-4 px-4 align-middle text-center">
                        {p.skorKeseluruhan ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-lime-400/20 text-lime-900 font-extrabold text-xs">
                            <span>★</span>
                            <span>{p.skorKeseluruhan}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview Sijil Rasmi PDF-Lib Modal Trigger */}
                          <button
                            type="button"
                            onClick={() => handleOpenPdfLibPreview(p)}
                            className="p-2 rounded-xl text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition-colors ios-press"
                            title="Pratonton Sijil Rasmi (PDF-Lib)"
                          >
                            <Award size={15} />
                          </button>

                          {/* Preview Email Content Modal */}
                          <button
                            type="button"
                            onClick={() => setPreviewParticipant(p)}
                            className="p-2 rounded-xl text-gray-500 hover:text-black hover:bg-black/5 transition-colors ios-press"
                            title="Pratonton Kandungan Emel Sijil"
                          >
                            <Mail size={15} />
                          </button>

                          {/* 1. Status = MENUNGGU (PENDING): Admin APPROVE atau TOLAK */}
                          {isPending && (
                            <>
                              <button
                                type="button"
                                disabled={isCurrentProcessing}
                                onClick={() => handleApproveOnly(p)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-lime-400 hover:bg-lime-500 text-black font-extrabold text-xs shadow-2xs transition-all ios-press disabled:opacity-50"
                                title="Luluskan Peserta Ini (Status bertukar DILULUSKAN & aktifkan butang Jana Sijil)"
                              >
                                {isCurrentProcessing ? (
                                  <RefreshCw size={13} className="animate-spin" />
                                ) : (
                                  <UserCheck size={13} />
                                )}
                                <span>{isCurrentProcessing ? 'Memproses...' : 'Luluskan'}</span>
                              </button>

                              <button
                                type="button"
                                disabled={isCurrentProcessing}
                                onClick={() => handleReject(p)}
                                className="p-1.5 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ios-press"
                                title="Tolak Peserta"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}

                          {/* 2. HANYA SELEPAS STATUS = APPROVED / DILULUSKAN: Butang [ JANA SIJIL ] atau [ HANTAR EMEL ] */}
                          {isApproved && (
                            hasGeneratedCert ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={isCurrentProcessing}
                                  onClick={() => handleSendEmail(p)}
                                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-2xs transition-all ios-press disabled:opacity-60"
                                  title="Hantar e-sijil ke emel peserta sekarang"
                                >
                                  {isCurrentProcessing ? (
                                    <>
                                      <RefreshCw size={13} className="animate-spin" />
                                      <span>Menghantar...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Send size={13} />
                                      <span>HANTAR EMEL</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  disabled={isCurrentProcessing}
                                  onClick={() => handleDownloadDirectPdf(p)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition-colors ios-press"
                                  title="Muat Turun Salinan PDF Sijil (PDF-Lib)"
                                >
                                  <Download size={12} />
                                  <span>PDF</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isCurrentProcessing || isGenerating}
                                  onClick={() => handleGenerateOnly(p)}
                                  className="p-1.5 rounded-xl text-gray-400 hover:text-black hover:bg-black/5 transition-colors ios-press"
                                  title="Jana Semula Sijil (PDF-Lib)"
                                >
                                  <RefreshCw size={13} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={isCurrentProcessing || isGenerating}
                                  onClick={() => handleGenerateOnly(p)}
                                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1C1C1E] hover:bg-black text-lime-400 font-extrabold text-xs shadow-2xs transition-all ios-press disabled:opacity-60 disabled:cursor-not-allowed border border-lime-400/30"
                                  title="Jana Sijil Sahaja (PDF-Lib -> Simpan Google Drive). Emel TIDAK akan dihantar sehingga anda menekan Hantar Emel."
                                >
                                  {isCurrentProcessing || isGenerating ? (
                                    <>
                                      <RefreshCw size={13} className="animate-spin text-lime-400" />
                                      <span>Menjana Sijil...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Award size={13} className="text-lime-400" />
                                      <span>JANA SIJIL</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  disabled={isCurrentProcessing}
                                  onClick={() => handleDownloadDirectPdf(p)}
                                  className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors ios-press"
                                  title="Muat Turun Terus PDF Sijil (PDF-Lib)"
                                >
                                  <Download size={14} />
                                </button>
                              </div>
                            )
                          )}

                          {/* 3. If Sent or Email Failed: Allow Direct Download & Resend */}
                          {(isSent || isEmailFailed) && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isCurrentProcessing}
                                onClick={() => handleDownloadDirectPdf(p)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs transition-colors ios-press border border-amber-200/60"
                                title="Muat Turun Salinan PDF Sijil (PDF-Lib)"
                              >
                                <Download size={12} />
                                <span>PDF</span>
                              </button>

                              <button
                                type="button"
                                disabled={isCurrentProcessing}
                                onClick={() => handleResend(p)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1C1C1E] font-bold text-xs transition-colors ios-press disabled:opacity-50"
                                title="Hantar Semula Sijil Sedia Ada ke Emel Peserta"
                              >
                                {isCurrentProcessing ? (
                                  <RefreshCw size={12} className="animate-spin" />
                                ) : (
                                  <RefreshCw size={12} />
                                )}
                                <span>Hantar Semula</span>
                              </button>
                            </div>
                          )}

                          {/* 4. Generation Failed: Retry generation */}
                          {isGenFailed && (
                            <button
                              type="button"
                              disabled={isCurrentProcessing}
                              onClick={() => handleGenerateOnly(p)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs transition-colors ios-press disabled:opacity-50"
                              title="Cuba Jana Sijil Semula"
                            >
                              <RefreshCw size={12} className={isCurrentProcessing ? "animate-spin" : ""} />
                              <span>Cuba Jana Semula</span>
                            </button>
                          )}

                          {isRejected && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(p.id, 'MENUNGGU')}
                              className="px-2.5 py-1 rounded-lg text-gray-500 hover:text-black text-xs font-semibold hover:bg-gray-100 transition-colors"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. BULK APPROVAL & GENERATION CONFIRMATION MODAL (TIADA EMEL) */}
      <AnimatePresence>
        {showBulkConfirmModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-black/10"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl">
                  <Award size={24} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#1C1C1E]">
                    Jana Sijil Pukal (PDF-Lib)
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {stats.pending} peserta sedia dijana sijil
                  </p>
                </div>
              </div>

              {!isBulkProcessing ? (
                <>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Adakah anda ingin meluluskan dan menjana sijil PDF untuk kesemua <strong>{stats.pending}</strong> peserta yang berdaftar?
                  </p>

                  <div className="bg-[#F8F9FA] p-3.5 rounded-2xl border border-black/[0.04] space-y-2 text-xs text-gray-600">
                    <p className="font-bold text-[#1C1C1E]">Tindakan yang dijalankan:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Nombor sijil unik (JAIS/YYYY/MM/xxxxx) dijana secara automatik.</li>
                      <li>Sijil berkualiti tinggi dijana menggunakan <strong>PDF-Lib</strong> pada peranti anda.</li>
                      <li>Fail PDF disimpan dengan selamat ke folder Google Drive rasmi.</li>
                      <li className="font-bold text-amber-700">Emel TIDAK akan dihantar sehingga anda menekan 'Hantar Emel Pukal'.</li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowBulkConfirmModal(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleStartBulkApprove}
                      className="px-5 py-2.5 rounded-xl bg-[#1C1C1E] text-lime-400 hover:bg-black font-bold text-xs shadow-sm transition-all ios-press flex items-center gap-2"
                    >
                      <Award size={14} className="text-lime-400" />
                      <span>Sahkan & Jana Sijil Pukal</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4 py-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>Sedang menjana sijil...</span>
                    <span>{bulkProgress.current} / {bulkProgress.total}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-lime-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${(bulkProgress.current / Math.max(bulkProgress.total, 1)) * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span className="text-emerald-700 font-bold">Berjaya Dijana: {bulkProgress.success}</span>
                    <span className="text-rose-700 font-bold">Gagal: {bulkProgress.failed}</span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6B. BULK EMAIL DISPATCH MODAL */}
      <AnimatePresence>
        {showBulkEmailModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-black/10"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 text-blue-800 rounded-2xl">
                  <Send size={24} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#1C1C1E]">
                    Hantar Emel Sijil Pukal
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {stats.readyToSend} peserta bersedia untuk menerima emel
                  </p>
                </div>
              </div>

              {!isBulkEmailProcessing ? (
                <>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Adakah anda pasti ingin menghantar emel rasmi beserta lampiran e-sijil kepada <strong>{stats.readyToSend}</strong> peserta yang telah mempunyai fail sijil di Google Drive?
                  </p>

                  <div className="bg-[#F8F9FA] p-3.5 rounded-2xl border border-black/[0.04] space-y-2 text-xs text-gray-600">
                    <p className="font-bold text-[#1C1C1E]">Maklumat penghantaran:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Emel pengesahan rasmi dihantar terus ke peti masuk peserta.</li>
                      <li>Fail PDF sijil dilampirkan bersama pautan capaian Google Drive.</li>
                      <li>Status setiap peserta akan dikemaskini kepada 'TELAH DIHANTAR'.</li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowBulkEmailModal(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleStartBulkSendEmail}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs shadow-sm transition-all ios-press flex items-center gap-2"
                    >
                      <Send size={14} />
                      <span>Hantar Semua Emel ({stats.readyToSend})</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4 py-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>Sedang menghantar emel...</span>
                    <span>{bulkEmailProgress.current} / {bulkEmailProgress.total}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${(bulkEmailProgress.current / Math.max(bulkEmailProgress.total, 1)) * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span className="text-emerald-700 font-bold">Berjaya Dihantar: {bulkEmailProgress.success}</span>
                    <span className="text-rose-700 font-bold">Gagal: {bulkEmailProgress.failed}</span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. DIRECT TEST CERTIFICATE EMAIL MODAL */}
      <AnimatePresence>
        {showTestModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-black/10"
            >
              <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
                <div className="flex items-center gap-2">
                  <UserCheck className="text-lime-600" size={20} />
                  <h3 className="font-bold text-base text-[#1C1C1E]">Uji Penghantaran E-Sijil JAIS</h3>
                </div>
                <button
                  onClick={() => setShowTestModal(false)}
                  className="p-1 text-gray-400 hover:text-black rounded-full"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                Uji integrasi Google Apps Script, penjanaan fail PDF sijil di Google Drive, dan penghantaran lampiran emel Gmail secara langsung ke peti surat anda.
              </p>

              <form onSubmit={handleSendDirectTestEmail} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nama Penuh Penerima Ujian</label>
                  <input
                    type="text"
                    required
                    value={testName}
                    onChange={(e) => setTestName(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-black/[0.06] rounded-xl text-xs font-semibold text-[#1C1C1E] focus:bg-white focus:ring-2 focus:ring-lime-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">No. Kad Pengenalan</label>
                    <input
                      type="text"
                      value={testIc}
                      onChange={(e) => setTestIc(e.target.value)}
                      placeholder="900101-13-1234"
                      className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-black/[0.06] rounded-xl text-xs font-semibold text-[#1C1C1E] focus:bg-white focus:ring-2 focus:ring-lime-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Emel Penerima (Anda) *</label>
                    <input
                      type="email"
                      required
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value.toLowerCase())}
                      placeholder="namaanda@gmail.com"
                      className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-black/[0.06] rounded-xl text-xs font-semibold text-[#1C1C1E] focus:bg-white focus:ring-2 focus:ring-lime-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nama Program</label>
                  <input
                    type="text"
                    required
                    value={testProgram}
                    onChange={(e) => setTestProgram(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-black/[0.06] rounded-xl text-xs font-semibold text-[#1C1C1E] focus:bg-white focus:ring-2 focus:ring-lime-400"
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleAddTestToTable}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    Tambah Rekod ke Jadual Sahaja
                  </button>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowTestModal(false)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSendingDirectTest}
                      className="px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-500 text-black font-extrabold text-xs shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSendingDirectTest ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Menjana & Menghantar...</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Hantar Emel Sijil Ujian</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. GOOGLE APPS SCRIPT CODE MODAL */}
      <AnimatePresence>
        {showCodeModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-black/10 my-auto max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-black/[0.06]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Code2 className="text-lime-600" size={20} />
                    <h3 className="text-lg font-black text-[#1C1C1E] tracking-tight">
                      Kod Google Apps Script (Code.gs) Terkini
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500">
                    Gantikan kod di editor Google Apps Script anda untuk menyokong lajur <strong>EMEL PESERTA</strong>, penjanaan PDF e-sijil automatik, dan penghantaran lampiran emel.
                  </p>
                </div>
                <button
                  onClick={() => setShowCodeModal(false)}
                  className="p-1.5 rounded-full hover:bg-black/5 text-gray-400 hover:text-black transition-colors"
                >
                  <XCircle size={20} />
                </button>
              </div>

              {/* Steps Guide */}
              <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-black/[0.04] space-y-2 text-xs text-gray-700">
                <p className="font-bold text-[#1C1C1E]">📋 Panduan Mengemaskini Google Apps Script:</p>
                <ol className="list-decimal pl-4 space-y-1 leading-relaxed font-medium">
                  <li>Buka Spreadsheet Google borang penilaian anda, klik <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Salin kod di bawah dengan menekan butang <strong>"Salin Kod Penuh"</strong> atau klik <strong>"Muat Turun Code.gs"</strong>.</li>
                  <li>Padam semua kod lama di fail <code>Code.gs</code> dan tampal (paste) kod baharu ini.</li>
                  <li>Klik butang <strong>Deploy &gt; Manage deployments</strong>, pilih <strong>Edit</strong>, tukar versi ke <strong>New version</strong> dan klik <strong>Deploy</strong>.</li>
                </ol>
                <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                  <span className="font-bold">⚠️ Panduan Mengelak Ralat "Unexpected token 'export'":</span>
                  <p className="mt-0.5">
                    Google Apps Script tidak menyokong kata kunci <code>export</code>. Jangan salin fail TypeScript <code>googleAppsScriptCode.ts</code> secara langsung. Gunakan butang <strong>"Salin Kod Penuh"</strong> atau muat turun fail <strong>Code.gs</strong> di bawah — ia bebas sintaks <code>export</code> dan 100% sedia digunakan di Apps Script.
                  </p>
                </div>
              </div>

              {/* Code Display Frame */}
              <div className="relative flex-1 min-h-0 bg-[#0F0F0F] rounded-2xl p-4 overflow-hidden border border-black/10 flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-white/10 text-xs text-gray-400">
                  <span className="font-mono">Code.gs — Sistem e-Penilaian & E-Sijil JAIS</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadCodeGs}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all ios-press"
                      title="Muat turun fail Code.gs terus ke komputer anda"
                    >
                      <Download size={13} />
                      <span>Muat Turun Code.gs</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-lime-400 hover:bg-lime-500 text-black font-bold text-xs transition-all ios-press"
                    >
                      {codeCopied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{codeCopied ? 'Berjaya Disalin!' : 'Salin Kod Penuh'}</span>
                    </button>
                  </div>
                </div>
                <pre className="text-[11px] font-mono text-gray-200 overflow-y-auto custom-scrollbar flex-1 whitespace-pre leading-relaxed p-1">
                  {GOOGLE_APPS_SCRIPT_CODE}
                </pre>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-gray-400">
                  Folder Sijil Drive: <a href={CERTIFICATE_DRIVE_FOLDER_URL} target="_blank" rel="noreferrer" className="text-blue-600 underline">Google Drive JAIS</a>
                </span>
                <button
                  type="button"
                  onClick={() => setShowCodeModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#1C1C1E] text-white font-bold text-xs hover:bg-black transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8.5 WEB APP STATUS & CONFIGURATION MODAL */}
      <AnimatePresence>
        {showUrlModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-black/10 my-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-black/[0.06]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Globe className="text-blue-600" size={22} />
                    <h3 className="text-lg font-black text-[#1C1C1E] tracking-tight">
                      Status & Tetapan Web App Google Apps Script
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500">
                    Sistem berhubung dengan Google Sheet & penjanaan e-sijil melalui pautan Web App ini.
                  </p>
                </div>
                <button
                  onClick={() => setShowUrlModal(false)}
                  className="p-1.5 rounded-full hover:bg-black/5 text-gray-400 hover:text-black transition-colors"
                >
                  <XCircle size={20} />
                </button>
              </div>

              {/* URL Input Box */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                  <span>URL Web App Semasa (Google Apps Script):</span>
                  {currentScriptUrl !== DEFAULT_GOOGLE_SCRIPT_URL && (
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                      Kustom
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={inputScriptUrl}
                    onChange={(e) => setInputScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full text-xs font-mono p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-gray-900 pr-24"
                  />
                  <button
                    type="button"
                    onClick={handleTestWebAppUrl}
                    disabled={isTestingUrl}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                  >
                    {isTestingUrl ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Menguji...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={13} />
                        <span>Uji Pautan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Test Result Feedback */}
              {urlTestStatus && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                    urlTestStatus.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium'
                      : 'bg-rose-50 border-rose-200 text-rose-950 font-medium'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {urlTestStatus.success ? (
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-bold">{urlTestStatus.success ? 'Sambungan Berjaya!' : 'Sambungan Gagal / Disekat'}</p>
                      <p className="text-[11px] opacity-90">{urlTestStatus.message}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Troubleshooting & Guide Accordion */}
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-2 text-xs text-amber-950">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <ShieldAlert size={16} className="text-amber-700" />
                  <span>Penyelesaian Jika "Jana Sijil Gagal" atau "Page not found":</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Jika Google Apps Script memaparkan <em>Page not found</em> atau penjanaan gagal, ini bermakna Web App belum diberikan kebenaran akses awam atau kod belum dideploy dengan versi baharu. Sila pastikan:
                </p>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px] leading-relaxed font-medium">
                  <li>
                    Buka editor Apps Script anda (di Google Sheets: <strong>Extensions &gt; Apps Script</strong>).
                  </li>
                  <li>
                    Klik butang biru <strong>Deploy &gt; New deployment</strong> (Penyebaran baharu).
                  </li>
                  <li>
                    Pilih jenis: <strong>Web app</strong> (klik ikon gear di sebelah kiri).
                  </li>
                  <li>
                    Tetapkan <strong>Execute as:</strong> <span className="font-bold underline">Me (faridzhuanfirdaus@gmail.com)</span>.
                  </li>
                  <li>
                    <strong>PENTING:</strong> Tetapkan <strong>Who has access:</strong> <span className="font-bold underline text-rose-700">Anyone (Sesiapa sahaja)</span>. <em>(Jika dibiarkan "Only myself", perkhidmatan tidak dapat dipanggil dari luar dan menghasilkan 404!)</em>
                  </li>
                  <li>
                    Klik <strong>Deploy</strong>, lakukan <em>Authorize Access</em> jika diminta, kemudian salin URL Web App yang terhasil dan tampal di atas.
                  </li>
                </ol>
              </div>

              {/* Footer Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={handleResetWebAppUrl}
                  className="px-3.5 py-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 text-xs font-semibold transition-colors"
                >
                  Reset URL Lalai
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUrlModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-100 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveWebAppUrl}
                    className="px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-500 text-black font-extrabold text-xs shadow-xs transition-all"
                  >
                    Simpan & Gunakan URL Ini
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. PREVIEW EMAIL MODAL */}
      <AnimatePresence>
        {previewParticipant && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-black/10 my-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                <div className="flex items-center gap-2">
                  <Mail className="text-lime-600" size={18} />
                  <h3 className="font-bold text-sm text-[#1C1C1E]">Pratonton Emel Rasmi Peserta</h3>
                </div>
                <button
                  onClick={() => setPreviewParticipant(null)}
                  className="p-1 text-gray-400 hover:text-black rounded-full"
                >
                  <XCircle size={18} />
                </button>
              </div>

              {/* Email Mockup */}
              <div className="bg-[#F2F2F7] p-4 rounded-2xl border border-black/[0.04] space-y-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-black/[0.04] space-y-1">
                  <p className="text-gray-400 text-[10px] font-bold uppercase">Kepada:</p>
                  <p className="font-bold text-gray-900">{previewParticipant.emelPeserta || 'peserta@gmail.com'}</p>
                  <p className="text-gray-400 text-[10px] font-bold uppercase pt-1">Subjek:</p>
                  <p className="font-bold text-gray-900">
                    Sijil Penyertaan & Penghargaan: {previewParticipant.programName}
                  </p>
                </div>

                {/* Email Body Card */}
                <div className="bg-white rounded-xl p-5 border border-black/[0.04] space-y-4">
                  <div className="text-center pb-2 border-b border-gray-100">
                    <span className="bg-lime-400 text-black text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Jabatan Agama Islam Sarawak
                    </span>
                    <h4 className="font-black text-sm text-gray-900 mt-2">Sijil Penyertaan & Penghargaan</h4>
                    <p className="text-[10px] text-gray-400">Sistem e-Penilaian Program Rasmi JAIS</p>
                  </div>

                  <p className="text-gray-700 leading-relaxed">
                    Assalamualaikum w.b.t & Salam Sejahtera,<br />
                    Tahniah diucapkan kepada <strong>{previewParticipant.namaPeserta || 'Peserta'}</strong>
                    {previewParticipant.noKpPeserta ? ` (No. K/P: ${previewParticipant.noKpPeserta})` : ''} atas penyertaan dan maklum balas penilaian yang telah dilengkapkan.
                  </p>

                  <div className="bg-[#F8F9FA] p-3 rounded-lg border border-gray-100 space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Program</p>
                    <p className="font-bold text-gray-900">{previewParticipant.programName}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase pt-1">Tarikh & Tempat</p>
                    <p className="text-gray-800">{previewParticipant.programDate || 'Tidak dinyatakan'} — {previewParticipant.tempat || 'Sarawak'}</p>
                    {previewParticipant.noSijil && (
                      <p className="text-[11px] text-emerald-700 font-mono font-bold pt-1">
                        No. Sijil: {previewParticipant.noSijil}
                      </p>
                    )}
                  </div>

                  <p className="text-gray-600 text-[11px]">
                    📎 <strong>Lampiran:</strong> Sijil rasmi telah dijana dalam format PDF dan dilampirkan bersama emel ini. Anda juga boleh memuat turun salinan sandaran melalui pautan di bawah:
                  </p>

                  <div className="text-center pt-2">
                    <a
                      href={previewParticipant.certPdfUrl || previewParticipant.pautanSijil || CERTIFICATE_DRIVE_FOLDER_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block bg-[#1C1C1E] text-lime-400 px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:bg-black"
                    >
                      Buka Sijil PDF di Google Drive &rarr;
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewParticipant(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-800 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 10. LIVE PDF-LIB CERTIFICATE PREVIEW MODAL */}
      <AnimatePresence>
        {pdfPreviewParticipant && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-7 space-y-5 shadow-2xl border border-black/10 my-auto max-h-[95vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-black/[0.06]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Award className="text-amber-500" size={22} />
                    <h3 className="text-lg font-black text-[#1C1C1E] tracking-tight">
                      Pratonton E-Sijil Rasmi JAIS (Enjin PDF-Lib)
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] tracking-wider uppercase">
                      Master Template
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Sijil dijana serta-merta pada resolusi tinggi (A4 Landskap) dengan rekaan reben emas/hitam rasmi JAIS & tandatangan Pengarah.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setPdfPreviewParticipant(null);
                    setPdfPreviewResult(null);
                  }}
                  className="p-1.5 rounded-full hover:bg-black/5 text-gray-400 hover:text-black transition-colors"
                >
                  <XCircle size={20} />
                </button>
              </div>

              {/* Participant Meta Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-[#F8F9FA] p-3 rounded-2xl border border-black/[0.04]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Nama Peserta:</span>
                  <span className="font-extrabold text-[#1C1C1E] truncate block">{pdfPreviewParticipant.namaPeserta || 'PESERTA'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">No. K/P:</span>
                  <span className="font-mono font-bold text-gray-700 block">{pdfPreviewParticipant.noKpPeserta || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">No. Sijil:</span>
                  <span className="font-mono font-bold text-emerald-700 block">{pdfPreviewParticipant.noSijil || 'JAIS/2026/...'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Emel:</span>
                  <span className="text-gray-600 truncate block">{pdfPreviewParticipant.emelPeserta || '-'}</span>
                </div>
              </div>

              {/* PDF Preview Frame or Loading Skeleton */}
              <div className="relative flex-1 min-h-[420px] sm:min-h-[500px] bg-[#1C1C1E] rounded-2xl overflow-hidden border border-black/10 flex items-center justify-center">
                {isGeneratingPreview ? (
                  <div className="flex flex-col items-center justify-center gap-3 text-white p-6 text-center">
                    <RefreshCw size={32} className="animate-spin text-lime-400" />
                    <div>
                      <p className="font-bold text-sm">Menjana E-Sijil Resolusi Tinggi...</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Memproses Master Template JAIS, lambang rasmi, dan tipografi kaligrafi sijil.
                      </p>
                    </div>
                  </div>
                ) : pdfPreviewResult?.pdfDataUrl ? (
                  <iframe
                    src={pdfPreviewResult.pdfDataUrl}
                    title="Pratonton Sijil JAIS"
                    className="w-full h-full min-h-[420px] sm:min-h-[500px] border-0 rounded-2xl"
                  />
                ) : (
                  <div className="text-center text-gray-400 p-6 space-y-2">
                    <AlertTriangle size={28} className="mx-auto text-amber-400" />
                    <p className="text-xs">Gagal memaparkan pratonton PDF. Sila cuba lagi.</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/[0.06]">
                <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Enjin PDF-Lib Pelayar Tempatan &bull; Bebas ralat Google Slides quota</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPdfPreviewParticipant(null);
                      setPdfPreviewResult(null);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-100 transition-colors"
                  >
                    Tutup
                  </button>

                  {pdfPreviewResult && (
                    <button
                      type="button"
                      onClick={() => {
                        const filename = `Sijil_${(pdfPreviewParticipant.namaPeserta || 'Peserta').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
                        downloadCertificatePdf(pdfPreviewResult.pdfBlob, filename);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1C1C1E] font-bold text-xs transition-colors flex items-center gap-1.5"
                    >
                      <Download size={14} />
                      <span>Muat Turun PDF</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={processingId !== null || !pdfPreviewParticipant.emelPeserta || pdfPreviewParticipant.emelPeserta === '-'}
                    onClick={() => {
                      const p = pdfPreviewParticipant;
                      setPdfPreviewParticipant(null);
                      setPdfPreviewResult(null);
                      handleGenerateOnly(p);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-500 text-black font-extrabold text-xs shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send size={14} />
                    <span>Luluskan & Hantar Emel Peserta</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 11. MASTER TEMPLATE SIJIL CONFIGURATION MODAL */}
      <AnimatePresence>
        {showMasterTemplateModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-black/10 my-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-black/[0.06]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-amber-500" size={22} />
                    <h3 className="text-lg font-black text-[#1C1C1E] tracking-tight">
                      Konfigurasi Master Template Sijil (PDF-Lib)
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500">
                    Sistem kini menggunakan kaedah penyediaan sijil terus melalui <strong>pdf-lib</strong> yang menghasilkan dokumen PDF resolusi tinggi dengan pantas, stabil, dan tepat mengikut reka bentuk rasmi JAIS.
                  </p>
                </div>
                <button
                  onClick={() => setShowMasterTemplateModal(false)}
                  className="p-1.5 rounded-full hover:bg-black/5 text-gray-400 hover:text-black transition-colors"
                >
                  <XCircle size={20} />
                </button>
              </div>

              {/* Template Architecture Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/60 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                    <Award size={15} />
                    <span>Reka Bentuk Master Template JAIS</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-amber-950 text-[11px] leading-relaxed">
                    <li>Sudut Geometrik Reben Mewah Hitam & Emas</li>
                    <li>Lambang Rasmi Jabatan Agama Islam Sarawak</li>
                    <li>Sijil Penyertaan & Penghargaan Program</li>
                    <li>Susun atur A4 Landskap (842 x 595 pt)</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                    <CheckCircle size={15} />
                    <span>Kelebihan Enjin PDF-Lib</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-emerald-950 text-[11px] leading-relaxed">
                    <li>Penjanaan segera dalam pelayar web tanpa kuota terhad</li>
                    <li>Tiada kebergantungan kepada hak akses Google Slides</li>
                    <li>Salinan PDF terus disimpan ke Folder Google Drive JAIS</li>
                    <li>Lampiran emel dihantar automatik kepada peserta</li>
                  </ul>
                </div>
              </div>

              {/* Configuration Form */}
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Pautan Master Template (Google Drive / URL Gambar Latar)
                  </label>
                  <input
                    type="text"
                    value={templateConfig.templateUrl}
                    onChange={(e) => setTemplateConfig({ ...templateConfig, templateUrl: e.target.value })}
                    placeholder="https://drive.google.com/file/d/... atau https://..."
                    className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-black/[0.06] rounded-xl font-mono text-xs text-[#1C1C1E] focus:bg-white focus:ring-2 focus:ring-amber-400"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Secara lalai, sijil menggunakan enjin kanvas grafik vektor terbina yang menghasilkan reka bentuk reben hitam/emas JAIS secara automatik.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Nama Penandatangan</label>
                    <input
                      type="text"
                      value={templateConfig.signatoryName}
                      onChange={(e) => setTemplateConfig({ ...templateConfig, signatoryName: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-black/[0.06] rounded-xl font-semibold text-xs text-[#1C1C1E] focus:bg-white focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Jawatan Penandatangan</label>
                    <input
                      type="text"
                      value={templateConfig.signatoryTitle}
                      onChange={(e) => setTemplateConfig({ ...templateConfig, signatoryTitle: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-black/[0.06] rounded-xl font-semibold text-xs text-[#1C1C1E] focus:bg-white focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={async () => {
                    // Uji jana PDF-Lib dengan sampel data
                    try {
                      setProcessingStep('Menjana sampel sijil ujian PDF-Lib...');
                      const sampleResult = await generateCertificateWithPdfLib({
                        nama: 'HAZWAN BIN ISMAIL',
                        ic: '920315-13-5567',
                        namaProgram: 'KURSUS KEPIMPINAN & INTEGRITI PENGURUSAN MASJID JAIS',
                        tarikhProgram: '2026-03-15',
                        tempatProgram: 'DEWAN MAJLIS ISLAM SARAWAK, KUCHING',
                        noSijil: 'JAIS/2026/03/99001'
                      });
                      downloadCertificatePdf(sampleResult.pdfBlob, 'Sampel_Sijil_JAIS_PDFLib.pdf');
                      setNotification({
                        type: 'success',
                        message: 'Sampel Sijil PDF-Lib berjaya dimuat turun ke komputer anda!'
                      });
                    } catch (e: any) {
                      setNotification({
                        type: 'error',
                        message: `Gagal menjana sampel: ${e?.message || e}`
                      });
                    }
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Uji Muat Turun Sampel PDF-Lib</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMasterTemplateModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-100 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMasterTemplate}
                    className="px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-500 text-black font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5"
                  >
                    {templateConfigSaved ? <Check size={14} /> : <FileCheck size={14} />}
                    <span>{templateConfigSaved ? 'Tersimpan!' : 'Simpan Tetapan'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL KEMAS KINI EMEL PESERTA KE LAJUR AJ (COL 36) GOOGLE SHEET */}
        {emailModal.isOpen && emailModal.participant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-black/10 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-black/5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-lime-100 text-lime-800 rounded-2xl">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#1C1C1E] text-base leading-tight">
                      Kemas Kini Emel Peserta
                    </h3>
                    <p className="text-[11px] text-gray-500 font-medium">
                      Data disimpan terus ke Lajur AJ (Col 36) Google Sheet
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailModal({ isOpen: false, participant: null, nextAction: 'none' })}
                  className="p-1 rounded-full text-gray-400 hover:text-black hover:bg-black/5 transition-colors"
                >
                  <XCircle size={20} />
                </button>
              </div>

              {/* Info Peserta */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-black/5 space-y-1.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-gray-500 font-medium">Nama Peserta (Lajur AI):</span>
                  <span className="font-bold text-[#1C1C1E] text-right">
                    {emailModal.participant.namaPeserta || '-'}
                  </span>
                </div>
                {emailModal.participant.noKpPeserta && (
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-gray-500 font-medium">No. Kad Pengenalan:</span>
                    <span className="font-mono text-gray-700 text-right">
                      {emailModal.participant.noKpPeserta}
                    </span>
                  </div>
                )}
                {emailModal.participant.programName && (
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-gray-500 font-medium">Program:</span>
                    <span className="font-semibold text-gray-700 text-right line-clamp-1">
                      {emailModal.participant.programName}
                    </span>
                  </div>
                )}
              </div>

              {/* Input Emel */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                  <span>Alamat Emel Peserta (Lajur AJ):</span>
                  <span className="text-[10px] text-gray-400 font-medium">Format: nama@domain.com</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={modalEmailInput}
                    onChange={(e) => {
                      setModalEmailInput(e.target.value);
                      if (emailModalError) setEmailModalError('');
                    }}
                    placeholder="contoh: peserta@gmail.com"
                    autoFocus
                    className="w-full text-xs font-medium p-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-lime-400 focus:outline-hidden text-gray-900"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveEmailToColAJ();
                      }
                    }}
                  />
                </div>
                {emailModalError && (
                  <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                    <AlertCircle size={12} />
                    <span>{emailModalError}</span>
                  </p>
                )}
              </div>

              <div className="text-[11px] text-gray-500 bg-blue-50/70 p-2.5 rounded-xl border border-blue-100 flex items-start gap-2">
                <ShieldCheck size={14} className="text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Emel ini akan disimpan ke <strong>Lajur AJ (Lajur ke-36)</strong> Google Sheet dan header <code>EMEL PESERTA</code> akan diwujudkan secara automatik jika belum wujud.
                </span>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setEmailModal({ isOpen: false, participant: null, nextAction: 'none' })}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSavingEmail}
                  onClick={handleSaveEmailToColAJ}
                  className="px-5 py-2 rounded-xl bg-lime-400 hover:bg-lime-500 text-black font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingEmail ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Simpan ke Lajur AJ</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
