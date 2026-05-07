
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

type DemographicItem = { name: string; value: number };

const ANALYSIS_TEMPLATES = {
  age: {
    young: "Kumpulan peserta didominasi oleh golongan muda. Untuk memantapkan program akan datang, disarankan untuk memperbanyakkan elemen interaktif, gamifikasi, penggunaan platform digital seperti kuiz online, dan aktiviti fizikal yang bertenaga.",
    career: "Majoriti peserta berada di pertengahan kerjaya. Program akan datang boleh ditambah baik dengan memfokuskan kepada aplikasi praktikal, perkongsian kes industri sebenar, dan sesi networking atau rangkaian profesional.",
    senior: "Peserta program ini didominasi oleh golongan senior dan berpengalaman. Pendekatan yang sesuai untuk masa hadapan adalah perbincangan dua hala, sesi perkongsian pengalaman yang mendalam, dan penyediaan bahan bacaan bercetak yang mesra pengguna dengan saiz font lebih besar.",
  },
  education: {
    practical: "Latar belakang pendidikan peserta mencadangkan agar penyampaian modul dikurangkan penggunaan jargon teknikal. Adalah disyorkan untuk melebihkan latihan amali, demonstrasi visual, dan penerangan menggunakan bahasa yang ringkas serta mudah difahami.",
    advanced: "Oleh kerana majoriti peserta mempunyai latar belakang pendidikan tinggi, tahap intelektual program boleh ditingkatkan. Masukkan elemen pemikiran kritikal, analisis strategik, dan kajian kes yang kompleks untuk mencabar dan menarik minat peserta.",
  },
  gender: {
    female: "Demografi menunjukkan penyertaan wanita yang tinggi. Perancangan logistik akan datang boleh mempertimbangkan fasiliti yang lebih mesra wanita dan keluarga, serta gaya komunikasi dan aktiviti kumpulan yang bersesuaian.",
    male: "Penyertaan lelaki adalah lebih dominan. Strategi pemasaran untuk program akan datang mungkin boleh diselaraskan untuk menarik lebih ramai penyertaan wanita bagi menyeimbangkan demografi, atau menyesuaikan aktiviti dengan kecenderungan majoriti peserta.",
  },
};

const getDominantDemographic = (items: DemographicItem[]) => {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (items.length === 0 || total === 0) return null;

  const dominant = items.reduce((highest, item) => (item.value > highest.value ? item : highest), items[0]);
  return {
    ...dominant,
    percentage: Math.round((dominant.value / total) * 100),
  };
};

const getAgeTemplate = (dominantName: string) => {
  const name = dominantName.toUpperCase();
  if (name.includes('20') || name.includes('21-30') || name.includes('30 TAHUN DAN KE BAWAH')) return ANALYSIS_TEMPLATES.age.young;
  if (name.includes('31-40')) return ANALYSIS_TEMPLATES.age.career;
  if (name.includes('41') || name.includes('51') || name.includes('SENIOR')) return ANALYSIS_TEMPLATES.age.senior;
  return null;
};

const getEducationTemplate = (dominantName: string) => {
  const name = dominantName.toUpperCase();
  if (name.includes('SPM') || name.includes('DIPLOMA') || name.includes('SRP') || name.includes('PMR') || name.includes('TIDAK BERSEKOLAH')) {
    return ANALYSIS_TEMPLATES.education.practical;
  }
  if (name.includes('IJAZAH') || name.includes('SARJANA') || name.includes('PHD') || name.includes('PH.D')) {
    return ANALYSIS_TEMPLATES.education.advanced;
  }
  return null;
};

const getGenderTemplate = (dominantName: string, percentage: number) => {
  if (percentage <= 60) return null;
  const name = dominantName.toUpperCase();
  if (name.includes('PEREMPUAN') || name.includes('WANITA')) return ANALYSIS_TEMPLATES.gender.female;
  if (name.includes('LELAKI')) return ANALYSIS_TEMPLATES.gender.male;
  return null;
};

const buildPrefilledAnalysis = (demographics: ProgramReportPDFProps['demographics']) => {
  const dominantAge = getDominantDemographic(demographics.umur);
  const dominantEducation = getDominantDemographic(demographics.pendidikan);
  const dominantGender = getDominantDemographic(demographics.jantina);

  return [
    dominantAge && {
      title: `Umur: ${dominantAge.name} (${dominantAge.percentage}%)`,
      text: getAgeTemplate(dominantAge.name),
    },
    dominantEducation && {
      title: `Pendidikan: ${dominantEducation.name} (${dominantEducation.percentage}%)`,
      text: getEducationTemplate(dominantEducation.name),
    },
    dominantGender && {
      title: `Jantina: ${dominantGender.name} (${dominantGender.percentage}%)`,
      text: getGenderTemplate(dominantGender.name, dominantGender.percentage),
    },
  ].filter((item): item is { title: string; text: string } => Boolean(item && item.text));
};

// Standard fonts are used by default (Helvetica, etc.)
const styles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingBottom: 90, // Increased space for footer
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    color: '#1A1A1A',
  },
  topBar: {
    height: 12,
    backgroundColor: '#D0F240',
    width: '100%',
  },
  content: {
    paddingHorizontal: 50, // Standardized horizontal padding
  },
  headerContainer: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 50,
    paddingHorizontal: 50,
    marginBottom: 40,
  },
  headerLabel: {
    fontSize: 9,
    color: '#999999',
    marginBottom: 8,
    fontWeight: 400,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    lineHeight: 1.2,
  },
  organizer: {
    fontSize: 11,
    color: '#D0F240',
    fontWeight: 'bold',
  },
  infoGrid: {
    flexDirection: 'row',
    marginBottom: 45,
    paddingHorizontal: 50,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 8,
    color: '#999999',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 11,
    color: '#1A1A1A',
    fontWeight: 'bold',
  },
  kpiSection: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    marginHorizontal: 50,
    marginBottom: 60,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 10,
  },
  kpiBox: {
    flex: 1,
    padding: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    height: '60%',
    alignSelf: 'center',
  },
  kpiLabel: {
    fontSize: 9,
    color: '#999999',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  kpiValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  kpiSub: {
    fontSize: 9,
    color: '#999999',
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 30,
    paddingHorizontal: 50,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  table: {
    marginHorizontal: 50,
    marginBottom: 60,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    padding: 8,
  },
  tableHeaderText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    padding: 10,
  },
  tableCell: {
    fontSize: 10,
    color: '#374151',
  },
  col1: { flex: 4 },
  col2: { flex: 1, textAlign: 'right' },
  
  demographicsSection: {
    paddingHorizontal: 50,
    flexDirection: 'row',
    gap: 28,
  },
  demoCol: {
    flex: 1,
  },
  demoTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#999999',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 5,
  },
  demoChartRow: {
    marginBottom: 9,
  },
  demoChartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  demoLabel: {
    fontSize: 7,
    color: '#4B5563',
    flex: 1,
    paddingRight: 5,
  },
  demoValue: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  demoBarTrack: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    overflow: 'hidden',
  },
  demoBarFill: {
    height: 6,
    backgroundColor: '#D0F240',
    borderRadius: 999,
  },
  demoPercent: {
    fontSize: 6,
    color: '#9CA3AF',
    marginTop: 2,
  },
  prefilledAnalysisBox: {
    marginHorizontal: 50,
    marginTop: 22,
    padding: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  prefilledAnalysisTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  prefilledAnalysisItem: {
    marginBottom: 7,
  },
  prefilledAnalysisLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#3F6212',
    marginBottom: 2,
  },
  prefilledAnalysisText: {
    fontSize: 7,
    color: '#4B5563',
    lineHeight: 1.35,
  },
  
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 8,
    color: '#999999',
  },

  // Page 2 Styles
  page2Title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 40,
    paddingHorizontal: 50,
  },
  feedbackGrid: {
    flexDirection: 'row',
    paddingHorizontal: 50,
    gap: 60,
  },
  feedbackCol: {
    flex: 1,
  },
  feedbackHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  feedbackGroup: {
    marginBottom: 15,
  },
  feedbackGroupTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4B5563',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  feedbackItem: {
    fontSize: 9,
    color: '#4B5563',
    marginBottom: 4,
    lineHeight: 1.4,
  },
  
  // Table Layout Styles (Compact)
  gridPageTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 30,
    paddingHorizontal: 50,
    paddingTop: 40,
  },
  tableContainer: {
    marginHorizontal: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tableDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  tableHeaderTextSmall: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#4B5563',
    width: 30,
  },
  tableHeaderTextLarge: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#4B5563',
    flex: 1,
  },
  tableCellNo: {
    fontSize: 9,
    color: '#6B7280',
    width: 30,
  },
  tableCellText: {
    fontSize: 9,
    color: '#374151',
    flex: 1,
    lineHeight: 1.4,
  },
  // AI Analysis Styles
  aiSection: {
    paddingHorizontal: 50,
    paddingTop: 30,
    paddingBottom: 40,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 20,
  },
  aiContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 25,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  aiHeading: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#84CC16',
    marginTop: 15,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  aiListItem: {
    fontSize: 9,
    color: '#4B5563',
    marginBottom: 5,
    marginLeft: 10,
    lineHeight: 1.4,
  },
  aiText: {
    fontSize: 9,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 1.5,
  }
});

interface ProgramReportPDFProps {
  programName: string;
  penganjur: string;
  location: string;
  bahagian: string;
  date: string;
  totalRespondents: number;
  avgScore: number;
  radarData: { subject: string; A: number }[];
  demographics: {
    jantina: { name: string; value: number }[];
    umur: { name: string; value: number }[];
    pendidikan: { name: string; value: number }[];
  };
  rawComments: string[];
  rawSuggestions: string[];
  highlightedCommentIndexes?: number[];
  highlightedSuggestionIndexes?: number[];
  totalComments: number;
  totalSuggestions: number;
  aiAnalysis?: string | null;
  appendixScale?: number;
}

const ProgramReportPDF: React.FC<ProgramReportPDFProps> = ({
  programName,
  penganjur,
  location,
  bahagian,
  date,
  totalRespondents,
  avgScore,
  radarData,
  demographics,
  rawComments,
  rawSuggestions,
  highlightedCommentIndexes = [],
  highlightedSuggestionIndexes = [],
  totalComments,
  totalSuggestions,
  aiAnalysis,
  appendixScale = 1
}) => {
  // Table layout is more compact, so we can fit more items per page
  const itemsPerPage = Math.floor(20 / appendixScale);
  const baseFontSize = Math.max(6, 9 * appendixScale);
  const headerFontSize = Math.max(7, 10 * appendixScale);
  const smallFontSize = Math.max(5, 8 * appendixScale);

  const chunkArray = (arr: string[], size: number) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  const commentChunks = chunkArray(rawComments, itemsPerPage);
  const suggestionChunks = chunkArray(rawSuggestions, itemsPerPage);
  const highlightedComments = new Set(highlightedCommentIndexes);
  const highlightedSuggestions = new Set(highlightedSuggestionIndexes);
  const prefilledAnalysis = buildPrefilledAnalysis(demographics);

  const renderDemographicChart = (items: { name: string; value: number }[]) => {
    const total = items.reduce((sum, item) => sum + item.value, 0);

    if (items.length === 0 || total === 0) {
      return (
        <Text style={{ fontSize: 8, color: '#9CA3AF', fontStyle: 'italic' }}>
          Tiada data
        </Text>
      );
    }

    return items.map((item, index) => {
      const percentage = Math.round((item.value / total) * 100);

      return (
        <View key={`${item.name}-${index}`} style={styles.demoChartRow}>
          <View style={styles.demoChartHeader}>
            <Text style={styles.demoLabel}>{item.name}</Text>
            <Text style={styles.demoValue}>{item.value}</Text>
          </View>
          <View style={styles.demoBarTrack}>
            <View style={[styles.demoBarFill, { width: `${Math.max(percentage, 3)}%` }]} />
          </View>
          <Text style={styles.demoPercent}>{percentage}% daripada kategori ini</Text>
        </View>
      );
    });
  };

  return (
    <Document>
      {/* Page 1: Overview */}
      <Page size="A4" style={styles.page}>
        <View style={styles.topBar} />
        
        <View style={styles.headerContainer}>
          <Text style={styles.headerLabel}>LAPORAN PENILAIAN PROGRAM</Text>
          <Text style={styles.title}>{programName}</Text>
          <Text style={styles.organizer}>PENGANJUR: {penganjur}</Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>TARIKH PROGRAM</Text>
            <Text style={styles.infoValue}>{date}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>LOKASI / TEMPAT</Text>
            <Text style={styles.infoValue}>{location}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>BAHAGIAN</Text>
            <Text style={styles.infoValue}>{bahagian}</Text>
          </View>
        </View>

        <View wrap={false}>
          <View style={styles.kpiSection}>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>PURATA SKOR</Text>
              <Text style={styles.kpiValue}>{avgScore.toFixed(2)}</Text>
              <Text style={styles.kpiSub}>/ 5.00</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>RESPONDEN</Text>
              <Text style={styles.kpiValue}>{totalRespondents}</Text>
              <Text style={styles.kpiSub}>ORANG</Text>
            </View>
          </View>
        </View>

        <View wrap={false}>
          <Text style={styles.sectionTitle}>ANALISIS PRESTASI (RADAR DATA)</Text>
          
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <View style={styles.col1}><Text style={styles.tableHeaderText}>ASPEK PENILAIAN</Text></View>
              <View style={styles.col2}><Text style={styles.tableHeaderText}>SKOR</Text></View>
            </View>
            {radarData.map((row, i) => (
              <View key={i} style={styles.tableRow}>
                <View style={styles.col1}><Text style={styles.tableCell}>{row.subject}</Text></View>
                <View style={styles.col2}><Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{row.A.toFixed(2)}</Text></View>
              </View>
            ))}
          </View>
        </View>

        <View wrap={false}>
          <Text style={styles.sectionTitle}>PROFIL PESERTA</Text>
          <View style={styles.demographicsSection}>
            <View style={styles.demoCol}>
              <Text style={styles.demoTitle}>JANTINA</Text>
              {renderDemographicChart(demographics.jantina)}
            </View>
            <View style={styles.demoCol}>
              <Text style={styles.demoTitle}>UMUR</Text>
              {renderDemographicChart(demographics.umur)}
            </View>
            <View style={styles.demoCol}>
              <Text style={styles.demoTitle}>PENDIDIKAN</Text>
              {renderDemographicChart(demographics.pendidikan)}
            </View>
          </View>
          {prefilledAnalysis.length > 0 && (
            <View style={styles.prefilledAnalysisBox}>
              <Text style={styles.prefilledAnalysisTitle}>Analisis Demografi Pra-Isi</Text>
              {prefilledAnalysis.map((item, index) => (
                <View key={`${item.title}-${index}`} style={styles.prefilledAnalysisItem}>
                  <Text style={styles.prefilledAnalysisLabel}>{item.title}</Text>
                  <Text style={styles.prefilledAnalysisText}>{item.text}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Dijana oleh Sistem e-Penilaian JAIS</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
            `Muka Surat ${pageNumber} / ${totalPages}`
          )} fixed />
        </View>
      </Page>

      {/* Page 2: AI Analysis (Conditional) */}
      {aiAnalysis && (
        <Page size="A4" style={styles.page}>
          <View style={styles.topBar} />
          <View style={styles.aiSection}>
            <Text style={styles.aiTitle}>ANALISIS PINTAR PROGRAM (AI)</Text>
            <View style={styles.aiContainer}>
              {aiAnalysis.split('\n').map((line, idx) => {
                const trimmed = line.trim();
                if (!trimmed) return null;
                
                if (trimmed.startsWith('**') || trimmed.startsWith('#')) {
                  return (
                    <Text key={idx} style={styles.aiHeading}>
                      {trimmed.replace(/\*\*/g, '').replace(/#/g, '')}
                    </Text>
                  );
                }
                
                if (trimmed.startsWith('-')) {
                  return (
                    <Text key={idx} style={styles.aiListItem}>
                      • {trimmed.replace('-', '').trim()}
                    </Text>
                  );
                }
                
                return (
                  <Text key={idx} style={styles.aiText}>
                    {trimmed}
                  </Text>
                );
              })}
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Dijana oleh Sistem e-Penilaian JAIS</Text>
            <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
              `Muka Surat ${pageNumber} / ${totalPages}`
            )} fixed />
          </View>
        </Page>
      )}

      {/* Subsequent Pages: Raw Feedback (Side-by-Side) */}
      {Array.from({ length: Math.ceil(Math.max(rawComments.length, rawSuggestions.length) / itemsPerPage) }).map((_, pageIdx) => {
        const currentComments = rawComments.slice(pageIdx * itemsPerPage, (pageIdx + 1) * itemsPerPage);
        const currentSuggestions = rawSuggestions.slice(pageIdx * itemsPerPage, (pageIdx + 1) * itemsPerPage);
        
        return (
          <Page key={`feedback-page-${pageIdx}`} size="A4" style={styles.page}>
            <View style={styles.topBar} />
            <Text style={styles.gridPageTitle}>LAMPIRAN: MAKLUM BALAS PESERTA ({pageIdx + 1}/{Math.ceil(Math.max(rawComments.length, rawSuggestions.length) / itemsPerPage)})</Text>
            
            <View style={{ flexDirection: 'row', paddingHorizontal: 50, gap: 20 }}>
              {/* Left Column: Comments (Lime Theme) */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: '#ECFCCB', padding: 5, borderRadius: 4 }}>
                   <Text style={{ fontSize: headerFontSize, fontWeight: 'bold', color: '#3F6212' }}>SENARAI KOMEN</Text>
                </View>
                <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
                  <View style={{ flexDirection: 'row', backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingVertical: 8, paddingHorizontal: 8 }}>
                    <Text style={{ fontSize: smallFontSize, fontWeight: 'bold', color: '#4B5563', width: 25 }}>NO.</Text>
                    <Text style={{ fontSize: smallFontSize, fontWeight: 'bold', color: '#4B5563', flex: 1 }}>KOMEN</Text>
                  </View>
                  {currentComments.map((comment, idx) => {
                    const absoluteIndex = pageIdx * itemsPerPage + idx;
                    const isHighlighted = highlightedComments.has(absoluteIndex);

                    return (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        borderBottomWidth: 1,
                        borderBottomColor: isHighlighted ? '#FACC15' : '#F3F4F6',
                        backgroundColor: isHighlighted ? '#FEFCE8' : '#FFFFFF',
                        paddingVertical: 8,
                        paddingHorizontal: 8,
                        minHeight: 30 * appendixScale,
                      }}
                    >
                      <Text style={{ fontSize: baseFontSize, color: isHighlighted ? '#A16207' : '#6B7280', width: 25 }}>{absoluteIndex + 1}.</Text>
                      <Text style={{ fontSize: baseFontSize, color: isHighlighted ? '#713F12' : '#374151', flex: 1, lineHeight: 1.3 }}>
                        {isHighlighted ? '★ ' : ''}"{comment}"
                      </Text>
                    </View>
                    );
                  })}
                  {currentComments.length === 0 && (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Text style={{ fontSize: baseFontSize, color: '#9CA3AF', fontStyle: 'italic' }}>Tiada komen di halaman ini.</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Right Column: Suggestions (Orange Theme) */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: '#FFF7ED', padding: 5, borderRadius: 4 }}>
                   <Text style={{ fontSize: headerFontSize, fontWeight: 'bold', color: '#9A3412' }}>SENARAI CADANGAN</Text>
                </View>
                <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
                  <View style={{ flexDirection: 'row', backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingVertical: 8, paddingHorizontal: 8 }}>
                    <Text style={{ fontSize: smallFontSize, fontWeight: 'bold', color: '#4B5563', width: 25 }}>NO.</Text>
                    <Text style={{ fontSize: smallFontSize, fontWeight: 'bold', color: '#4B5563', flex: 1 }}>CADANGAN</Text>
                  </View>
                  {currentSuggestions.map((suggestion, idx) => {
                    const absoluteIndex = pageIdx * itemsPerPage + idx;
                    const isHighlighted = highlightedSuggestions.has(absoluteIndex);

                    return (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        borderBottomWidth: 1,
                        borderBottomColor: isHighlighted ? '#FACC15' : '#F3F4F6',
                        backgroundColor: isHighlighted ? '#FEFCE8' : '#FFFFFF',
                        paddingVertical: 8,
                        paddingHorizontal: 8,
                        minHeight: 30 * appendixScale,
                      }}
                    >
                      <Text style={{ fontSize: baseFontSize, color: isHighlighted ? '#A16207' : '#6B7280', width: 25 }}>{absoluteIndex + 1}.</Text>
                      <Text style={{ fontSize: baseFontSize, color: isHighlighted ? '#713F12' : '#374151', flex: 1, lineHeight: 1.3 }}>
                        {isHighlighted ? '★ ' : ''}{suggestion}
                      </Text>
                    </View>
                    );
                  })}
                  {currentSuggestions.length === 0 && (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Text style={{ fontSize: baseFontSize, color: '#9CA3AF', fontStyle: 'italic' }}>Tiada cadangan di halaman ini.</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Dijana oleh Sistem e-Penilaian JAIS</Text>
              <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
                `Muka Surat ${pageNumber} / ${totalPages}`
              )} fixed />
            </View>
          </Page>
        );
      })}
    </Document>
  );
};


export default ProgramReportPDF;
