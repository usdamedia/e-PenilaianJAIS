
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

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
    gap: 45,
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
  demoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  demoLabel: {
    fontSize: 9,
    color: '#4B5563',
  },
  demoValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1A1A1A',
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
  }
});

interface ProgramReportPDFProps {
  programName: string;
  penganjur: string;
  location: string;
  date: string;
  totalRespondents: number;
  avgScore: number;
  radarData: { subject: string; A: number }[];
  demographics: {
    jantina: { name: string; value: number }[];
    umur: { name: string; value: number }[];
    pendidikan: { name: string; value: number }[];
  };
  groupedComments: { category: string; items: string[] }[];
  groupedSuggestions: { category: string; items: string[] }[];
  rawComments: string[];
  rawSuggestions: string[];
  totalComments: number;
  totalSuggestions: number;
  gridConfig: string; // '2x2' | '2x3' | '2x4'
}

const ProgramReportPDF: React.FC<ProgramReportPDFProps> = ({
  programName,
  penganjur,
  location,
  date,
  totalRespondents,
  avgScore,
  radarData,
  demographics,
  groupedComments,
  groupedSuggestions,
  rawComments,
  rawSuggestions,
  totalComments,
  totalSuggestions
}) => {
  // Table layout is more compact, so we can fit more items per page
  const itemsPerPage = 25;

  const chunkArray = (arr: string[], size: number) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  const commentChunks = chunkArray(rawComments, itemsPerPage);
  const suggestionChunks = chunkArray(rawSuggestions, itemsPerPage);

  const hasAIAnalysis = groupedComments.length > 0 || groupedSuggestions.length > 0;

  return (
    <Document>
      {/* Page 1: Overview */}
      <Page size="A4" style={styles.page}>
        <View style={styles.topBar} />
        
        <View style={styles.headerContainer}>
          <Text style={styles.headerLabel}>LAPORAN ANALISIS PROGRAM</Text>
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
            <Text style={styles.infoValue}>KUCHING</Text>
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
              {demographics.jantina.map((d, i) => (
                <View key={i} style={styles.demoRow}>
                  <Text style={styles.demoLabel}>{d.name}</Text>
                  <Text style={styles.demoValue}>{d.value}</Text>
                </View>
              ))}
            </View>
            <View style={styles.demoCol}>
              <Text style={styles.demoTitle}>UMUR</Text>
              {demographics.umur.map((d, i) => (
                <View key={i} style={styles.demoRow}>
                  <Text style={styles.demoLabel}>{d.name}</Text>
                  <Text style={styles.demoValue}>{d.value}</Text>
                </View>
              ))}
            </View>
            <View style={styles.demoCol}>
              <Text style={styles.demoTitle}>PENDIDIKAN</Text>
              {demographics.pendidikan.map((d, i) => (
                <View key={i} style={styles.demoRow}>
                  <Text style={styles.demoLabel}>{d.name}</Text>
                  <Text style={styles.demoValue}>{d.value}</Text>
                </View>
              ))}
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

      {/* Page 2: AI Grouped Feedback Summary (Conditional) */}
      {hasAIAnalysis && (
        <Page size="A4" style={styles.page}>
          <View style={styles.topBar} />
          <View wrap={false} style={{ paddingTop: 40 }}>
            <Text style={styles.page2Title}>RUMUSAN MAKLUM BALAS (AI)</Text>
            
            <View style={styles.feedbackGrid}>
              <View style={styles.feedbackCol}>
                <Text style={[styles.feedbackHeader, { color: '#84CC16' }]}>KOMEN ({totalComments})</Text>
                {groupedComments.length > 0 ? groupedComments.map((group, i) => (
                  <View key={i} style={styles.feedbackGroup}>
                    <Text style={styles.feedbackGroupTitle}>{group.category}</Text>
                    {group.items.slice(0, 5).map((item, j) => (
                      <Text key={j} style={styles.feedbackItem}>• "{item}"</Text>
                    ))}
                  </View>
                )) : <Text style={styles.feedbackItem}>Tiada maklum balas dikelompokkan.</Text>}
              </View>

              <View style={styles.feedbackCol}>
                <Text style={[styles.feedbackHeader, { color: '#B45309' }]}>CADANGAN ({totalSuggestions})</Text>
                {groupedSuggestions.length > 0 ? groupedSuggestions.map((group, i) => (
                  <View key={i} style={styles.feedbackGroup}>
                    <Text style={styles.feedbackGroupTitle}>{group.category}</Text>
                    {group.items.slice(0, 5).map((item, j) => (
                      <Text key={j} style={styles.feedbackItem}>• {item}</Text>
                    ))}
                  </View>
                )) : <Text style={styles.feedbackItem}>Tiada cadangan dikelompokkan.</Text>}
              </View>
            </View>
            <Text style={{ fontSize: 8, color: '#999999', paddingHorizontal: 50, marginTop: 25, fontStyle: 'italic' }}>
              * Sila rujuk lampiran grid untuk senarai penuh maklum balas peserta.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Dijana oleh Sistem e-Penilaian JAIS</Text>
            <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
              `Muka Surat ${pageNumber} / ${totalPages}`
            )} fixed />
          </View>
        </Page>
      )}

      {/* Subsequent Pages: Raw Comments Table */}
      {commentChunks.map((chunk, pageIdx) => (
        <Page key={`comment-page-${pageIdx}`} size="A4" style={styles.page}>
          <View style={styles.topBar} />
          <Text style={styles.gridPageTitle}>LAMPIRAN: KOMEN PESERTA ({pageIdx + 1}/{commentChunks.length})</Text>
          
          <View style={styles.tableContainer}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableHeaderTextSmall}>NO.</Text>
              <Text style={styles.tableHeaderTextLarge}>MAKLUM BALAS / KOMEN</Text>
            </View>
            {chunk.map((comment, itemIdx) => (
              <View key={itemIdx} style={[styles.tableDataRow, itemIdx === chunk.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.tableCellNo}>{pageIdx * itemsPerPage + itemIdx + 1}.</Text>
                <Text style={styles.tableCellText}>"{comment}"</Text>
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Dijana oleh Sistem e-Penilaian JAIS</Text>
            <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
              `Muka Surat ${pageNumber} / ${totalPages}`
            )} fixed />
          </View>
        </Page>
      ))}

      {/* Subsequent Pages: Raw Suggestions Table */}
      {suggestionChunks.map((chunk, pageIdx) => (
        <Page key={`suggestion-page-${pageIdx}`} size="A4" style={styles.page}>
          <View style={styles.topBar} />
          <Text style={styles.gridPageTitle}>LAMPIRAN: CADANGAN PESERTA ({pageIdx + 1}/{suggestionChunks.length})</Text>
          
          <View style={styles.tableContainer}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableHeaderTextSmall}>NO.</Text>
              <Text style={styles.tableHeaderTextLarge}>CADANGAN PENAMBAHBAIKAN</Text>
            </View>
            {chunk.map((suggestion, itemIdx) => (
              <View key={itemIdx} style={[styles.tableDataRow, itemIdx === chunk.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.tableCellNo}>{pageIdx * itemsPerPage + itemIdx + 1}.</Text>
                <Text style={styles.tableCellText}>{suggestion}</Text>
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Dijana oleh Sistem e-Penilaian JAIS</Text>
            <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
              `Muka Surat ${pageNumber} / ${totalPages}`
            )} fixed />
          </View>
        </Page>
      ))}
    </Document>
  );
};


export default ProgramReportPDF;
