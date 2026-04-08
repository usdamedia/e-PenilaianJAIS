
export interface DashboardData {
  id: string;          // New unique ID
  timestamp: string;   // New timestamp
  programDate: string; // Mapped from 'TARIKH MULA PROGRAM' for Date Logic
  filterTahun: string; // New: Mapped explicitly from 'FILTER TAHUN' column
  bahagian: string;    // Mapped from 'BAHAGIAN PROGRAM DILAKSANA'
  tempat: string;      // Mapped from 'TEMPAT PROGRAM DILAKSANA'
  penganjur: string;   // Col E
  jantina: string;     // Col G
  umur: string;        // Col I
  quarter: string;     // New: Mapped from 'QUARTER' column
  tarafPendidikan: string; // Col J (New)
  // Ratings Col K - W (Assuming K-O are scores, P-W might be detailed scores or comments)
  // Mapping based on common structure
  skorLogistik: number; // K
  skorPengisian: number; // L
  skorJamuan: number; // M
  skorFasilitator: number; // N
  skorUrusetia: number; // O
  skorKeseluruhan: number; // Mapped from 'Penilaian Keseluruhan Program'
  skorFormula: number;     // New: Mapped from 'Penilaian Keseluruhan Program Formula'
  rawSkorFormula?: string; // Original text for BSC Categories
  programName?: string; // Mapped from 'NAMA PROGRAM'
  komen?: string;
  cadangan?: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface ProgramSummary {
  id: string;
  programName: string;
  bahagian: string;
  tempat: string; // New explicit field
  penganjur: string;
  totalRespondents: number;
  averageScore: number;
  lastUpdated: string;
}
