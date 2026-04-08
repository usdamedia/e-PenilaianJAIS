
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 60,
    paddingHorizontal: 50,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#1A1C1E',
    padding: 30,
    borderRadius: 12,
    marginBottom: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#D0F240',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaGrid: {
    flexDirection: 'row',
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 20,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  metaValue: {
    fontSize: 11,
    color: '#1E293B',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 20,
    marginTop: 10,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 40,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 8,
    color: '#64748B',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  table: {
    width: '100%',
    marginBottom: 40,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 6,
    marginBottom: 5,
  },
  tableHeaderText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 10,
    color: '#334155',
  },
  colCat: { flex: 3 },
  colCount: { flex: 1, textAlign: 'center' },
  colPercent: { flex: 1, textAlign: 'right' },
  colorBox: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginRight: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#94A3B8',
  },
  noteContainer: {
    backgroundColor: '#F7FEE7',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ECFCCB',
    marginTop: 20,
  },
  noteText: {
    fontSize: 9,
    color: '#3F6212',
    lineHeight: 1.4,
  }
});

interface BSCReportPDFProps {
  reportDate: string;
  filters: {
    year: string;
    month: string;
    organizer: string;
  };
  totalRespondents: number;
  avgScore: number;
  chartData: {
    name: string;
    count: number;
    color: string;
  }[];
}

const BSCReportPDF: React.FC<BSCReportPDFProps> = ({ 
  reportDate, 
  filters, 
  totalRespondents, 
  avgScore,
  chartData 
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.subtitle}>LAPORAN BALANCED SCORECARD (BSC)</Text>
          <Text style={styles.title}>Penilaian Keseluruhan Program</Text>
          <Text style={{ color: '#94A3B8', fontSize: 8 }}>Dijana pada: {reportDate}</Text>
        </View>

        {/* Meta Info */}
        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>TAHUN</Text>
            <Text style={styles.metaValue}>{filters.year}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>BULAN</Text>
            <Text style={styles.metaValue}>{filters.month}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>PENGANJUR</Text>
            <Text style={styles.metaValue}>{filters.organizer}</Text>
          </View>
        </View>

        {/* KPI Row */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>JUMLAH RESPONDEN</Text>
            <Text style={styles.kpiValue}>{totalRespondents}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>PURATA INDEKS BSC</Text>
            <Text style={styles.kpiValue}>{avgScore.toFixed(2)}</Text>
          </View>
        </View>

        {/* Data Table */}
        <Text style={styles.sectionTitle}>TABURAN PENILAIAN STRATEGIK</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colCat}><Text style={styles.tableHeaderText}>KATEGORI PENILAIAN</Text></View>
            <View style={styles.colCount}><Text style={styles.tableHeaderText}>KEKERAPAN</Text></View>
            <View style={styles.colPercent}><Text style={styles.tableHeaderText}>PERATUSAN</Text></View>
          </View>
          
          {chartData.map((item, index) => {
            const percentage = totalRespondents > 0 ? ((item.count / totalRespondents) * 100).toFixed(1) : "0.0";
            return (
              <View key={index} style={styles.tableRow}>
                <View style={[styles.colCat, { flexDirection: 'row', alignItems: 'center' }]}>
                  <View style={[styles.colorBox, { backgroundColor: item.color }]} />
                  <Text style={styles.tableCell}>{item.name}</Text>
                </View>
                <View style={styles.colCount}><Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{item.count}</Text></View>
                <View style={styles.colPercent}><Text style={styles.tableCell}>{percentage}%</Text></View>
              </View>
            );
          })}
        </View>

        {/* Note */}
        <View style={styles.noteContainer}>
          <Text style={[styles.noteText, { fontWeight: 'bold', marginBottom: 5 }]}>Nota Analisis:</Text>
          <Text style={styles.noteText}>
            Laporan ini menggunakan formula pemberat khusus (Lajur AE) untuk menilai keberkesanan program secara holistik. 
            Data ini digunakan untuk pelaporan prestasi Balanced Scorecard (BSC) Jabatan Agama Islam Sarawak.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>e-Penilaian JAIS - Laporan BSC Strategik</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} daripada ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};

export default BSCReportPDF;
