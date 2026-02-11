export interface EvaluationFormData {
  // Section A
  namaProgram: string;
  bahagianProgram: string;
  tempatProgram: string;
  tarikhMula: string;
  tempohProgram: string;
  penganjurUtama: string;

  // Section B
  jantina: 'LELAKI' | 'PEREMPUAN' | '';
  umur: string;
  tarafPendidikan: string;

  // Section C
  ratingTarikhMasa: number;
  ratingPengisian: number;
  ratingJamuan: number;
  ratingFasilitator: number;
  ratingUrusetia: number;
  ratingKeseluruhan: number;

  // Section D
  komenProgram: string;
  cadanganProgram: string;
}

export type RatingField = 
  | 'ratingTarikhMasa' 
  | 'ratingPengisian' 
  | 'ratingJamuan' 
  | 'ratingFasilitator' 
  | 'ratingUrusetia' 
  | 'ratingKeseluruhan';