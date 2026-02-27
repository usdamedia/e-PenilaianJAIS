import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { DashboardData } from '../../dashboard/types';

// Register fonts if needed, but standard ones are usually fine for a start.
// For Malay characters, standard fonts usually work.

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#374151',
  },
  header: {
    backgroundColor: '#1A1C1E',
    padding: 25,
    marginBottom: 25,
  },
  tag: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#D0F240',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  metaGrid: {
    flexDirection: 'row',
    marginTop: 20,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 7,
    color: '#9CA3AF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 9,
    color: 'white',
    fontWeight: 'bold',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1A1C1E',
    marginTop: 20,
    marginBottom: 15,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1C1E',
    borderBottomStyle: 'solid',
    paddingBottom: 5,
  },
  kpiGrid: {
    flexDirection: 'row',
    marginBottom: 25,
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 15,
  },
  kpiLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1C1E',
  },
  table: {
    width: 'auto',
    marginBottom: 25,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    minHeight: 30,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#1A1C1E',
    color: 'white',
    fontWeight: 'bold',
  },
  tableCell: {
    padding: 8,
    fontSize: 9,
  },
  tableCellLabel: {
    flex: 3,
  },
  tableCellValue: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  demographicGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 25,
  },
  demographicCol: {
    flex: 1,
  },
  subHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4B5563',
    marginBottom: 8,
    textDecoration: 'underline',
  },
  listItem: {
    fontSize: 9,
    marginBottom: 4,
  },
  feedbackCard: {
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 12,
    marginBottom: 10,
  },
  feedbackText: {
    fontSize: 10,
    color: '#4B5563',
    fontStyle: 'italic',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9CA3AF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  }
});

interface ProgramReportPDFProps {
  programName: string;
  displayPenganjur: string;
  id: string;
  selectedDate: string;
  displayedLocation: string;
  selectedBahagian: string;
  analysis: any;
  demographics: any;
  commentList: string[];
  suggestionList: string[];
  filteredData: DashboardData[];
}

export const ProgramReportPDF: React.FC<ProgramReportPDFProps> = ({
  programName,
  displayPenganjur,
  id,
  selectedDate,
  displayedLocation,
  selectedBahagian,
  analysis,
  demographics,
  commentList,
  suggestionList,
  filteredData,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.tag}>Laporan Penilaian Program</Text>
        <Text style={styles.headerTitle}>{programName}</Text>
        <Text style={styles.headerSubtitle}>{displayPenganjur}</Text>
        
        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Tarikh</Text>
            <Text style={styles.metaValue}>{selectedDate}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Lokasi</Text>
            <Text style={styles.metaValue}>{displayedLocation}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Bahagian</Text>
            <Text style={styles.metaValue}>{selectedBahagian}</Text>
          </View>
        </View>
      </View>

      {/* Executive Summary */}
      <Text style={styles.sectionHeader}>Ringkasan Eksekutif</Text>
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Jumlah Responden</Text>
          <Text style={styles.kpiValue}>{analysis?.totalRespondents || 0}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Purata Skor</Text>
          <Text style={[styles.kpiValue, { color: '#9AB820' }]}>
            {analysis?.avgTotal.toFixed(2)} / 5.00
          </Text>
        </View>
      </View>

      {/* Performance Analysis */}
      <Text style={styles.sectionHeader}>Analisis Prestasi</Text>
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={[styles.tableCell, styles.tableCellLabel]}>Kriteria Penilaian</Text>
          <Text style={[styles.tableCell, styles.tableCellValue]}>Skor Min</Text>
        </View>
        {analysis?.spiderData.map((item: any, index: number) => (
          <View key={index} style={[styles.tableRow, index % 2 === 1 && { backgroundColor: '#F9FAFB' }]}>
            <Text style={[styles.tableCell, styles.tableCellLabel]}>{item.subject}</Text>
            <Text style={[styles.tableCell, styles.tableCellValue]}>{item.A.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Demographics */}
      <Text style={styles.sectionHeader}>Profil Peserta</Text>
      <View style={styles.demographicGrid}>
        <View style={styles.demographicCol}>
          <Text style={styles.subHeader}>Jantina</Text>
          {demographics.jantina.map((d: any, i: number) => (
            <Text key={i} style={styles.listItem}>{d.name}: {d.value}</Text>
          ))}
        </View>
        <View style={styles.demographicCol}>
          <Text style={styles.subHeader}>Umur</Text>
          {demographics.umur.map((d: any, i: number) => (
            <Text key={i} style={styles.listItem}>{d.name}: {d.value}</Text>
          ))}
        </View>
        <View style={styles.demographicCol}>
          <Text style={styles.subHeader}>Pendidikan</Text>
          {demographics.pendidikan.map((d: any, i: number) => (
            <Text key={i} style={styles.listItem}>{d.name}: {d.value}</Text>
          ))}
        </View>
      </View>

      <Text style={styles.footer}>
        Laporan ini dijana secara automatik oleh Sistem e-Penilaian JAIS pada {new Date().toLocaleString('ms-MY')}
      </Text>
    </Page>

    {/* Feedback Page */}
    {(commentList.length > 0 || suggestionList.length > 0) && (
      <Page size="A4" style={styles.page}>
        {commentList.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Komen Peserta ({commentList.length})</Text>
            {commentList.map((c, i) => (
              <View key={i} style={styles.feedbackCard}>
                <Text style={styles.feedbackText}>"{c}"</Text>
              </View>
            ))}
          </>
        )}

        {suggestionList.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Cadangan Peserta ({suggestionList.length})</Text>
            {suggestionList.map((c, i) => (
              <View key={i} style={styles.feedbackCard}>
                <Text style={styles.feedbackText}>{c}</Text>
              </View>
            ))}
          </>
        )}
        <Text style={styles.footer}>
          Laporan ini dijana secara automatik oleh Sistem e-Penilaian JAIS pada {new Date().toLocaleString('ms-MY')}
        </Text>
      </Page>
    )}

    {/* Participant List Page */}
    {analysis?.totalRespondents > 0 && (
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionHeader}>Senarai Peserta ({analysis.totalRespondents})</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, { flex: 0.5 }]}>No.</Text>
            <Text style={[styles.tableCell, { flex: 3 }]}>Nama Penuh</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>Jantina</Text>
            <Text style={[styles.tableCell, { flex: 1.5 }]}>Umur</Text>
          </View>
          {filteredData.map((item, index) => (
            <View key={index} style={[styles.tableRow, index % 2 === 1 && { backgroundColor: '#F9FAFB' }]}>
              <Text style={[styles.tableCell, { flex: 0.5 }]}>{index + 1}</Text>
              <Text style={[styles.tableCell, { flex: 3, fontWeight: 'bold' }]}>{item.namaPenuh || '-'}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{item.jantina}</Text>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>{item.umur}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.footer}>
          Laporan ini dijana secara automatik oleh Sistem e-Penilaian JAIS pada {new Date().toLocaleString('ms-MY')}
        </Text>
      </Page>
    )}
  </Document>
);
