
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Standard fonts are used by default (Helvetica, etc.)
const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    color: '#1A1A1A',
  },
  topBar: {
    height: 15,
    backgroundColor: '#D0F240',
    width: '100%',
  },
  content: {
    padding: 40,
    paddingTop: 20,
  },
  headerContainer: {
    backgroundColor: '#1A1A1A',
    padding: 30,
    marginBottom: 25,
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
    marginBottom: 30,
    paddingHorizontal: 30,
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
    marginHorizontal: 30,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#F3F4F6',
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 20,
    paddingHorizontal: 30,
  },
  table: {
    marginHorizontal: 30,
    marginBottom: 40,
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
    paddingHorizontal: 30,
    flexDirection: 'row',
    gap: 30,
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
    bottom: 30,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 15,
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
    marginBottom: 25,
    paddingHorizontal: 30,
  },
  feedbackGrid: {
    flexDirection: 'row',
    paddingHorizontal: 30,
    gap: 40,
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
  totalComments: number;
  totalSuggestions: number;
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
  totalComments,
  totalSuggestions
}) => (
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
          <Text style={styles.infoValue}>KUCHING</Text> {/* Hardcoded or passed from props if available */}
        </View>
      </View>

      <View style={styles.kpiSection}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>PURATA SKOR</Text>
          <Text style={styles.kpiValue}>{avgScore.toFixed(2)}</Text>
          <Text style={styles.kpiSub}>/ 5.0</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>RESPONDEN</Text>
          <Text style={styles.kpiValue}>{totalRespondents}</Text>
          <Text style={styles.kpiSub}>ORANG</Text>
        </View>
      </View>

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

      <View style={styles.footer}>
        <Text style={styles.footerText}>Dijana oleh Sistem e-Penilaian JAIS</Text>
        <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
          `Muka Surat ${pageNumber} / ${totalPages}`
        )} fixed />
      </View>
    </Page>

    {/* Page 2: AI Grouped Feedback */}
    <Page size="A4" style={styles.page}>
      <View style={styles.topBar} />
      <View style={{ paddingTop: 40 }}>
        <Text style={styles.page2Title}>MAKLUM BALAS DIKELOMPOKKAN (AI)</Text>
        
        <View style={styles.feedbackGrid}>
          {/* Comments Column */}
          <View style={styles.feedbackCol}>
            <Text style={[styles.feedbackHeader, { color: '#84CC16' }]}>KOMEN ({totalComments})</Text>
            {groupedComments.length > 0 ? groupedComments.map((group, i) => (
              <View key={i} style={styles.feedbackGroup}>
                <Text style={styles.feedbackGroupTitle}>{group.category}</Text>
                {group.items.map((item, j) => (
                  <Text key={j} style={styles.feedbackItem}>• "{item}"</Text>
                ))}
              </View>
            )) : <Text style={styles.feedbackItem}>Tiada maklum balas dikelompokkan.</Text>}
          </View>

          {/* Suggestions Column */}
          <View style={styles.feedbackCol}>
            <Text style={[styles.feedbackHeader, { color: '#B45309' }]}>CADANGAN ({totalSuggestions})</Text>
            {groupedSuggestions.length > 0 ? groupedSuggestions.map((group, i) => (
              <View key={i} style={styles.feedbackGroup}>
                <Text style={styles.feedbackGroupTitle}>{group.category}</Text>
                {group.items.map((item, j) => (
                  <Text key={j} style={styles.feedbackItem}>• {item}</Text>
                ))}
              </View>
            )) : <Text style={styles.feedbackItem}>Tiada cadangan dikelompokkan.</Text>}
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
  </Document>
);

export default ProgramReportPDF;
