export type SourcePage = { page: number; text: string; method: "text" | "ocr" | "paste" | "docx" | "txt"; confidence?: number };

export type Deadline = {
  id: string;
  originalText: string;
  normalizedDate: string | null;
  normalizedTime: string | null;
  timezone: string | null;
  isAllDay: boolean;
  certainty: "high" | "medium" | "low";
  meaning: string;
  requiredAction: string;
  consequenceIfMissed: string | null;
  sourceText: string;
  sourcePage: number | null;
  calendarSuggested: boolean;
  calendarTitle: string | null;
  calendarDescription: string | null;
};

export type AnalysisResult = {
  detectedLanguage: string;
  documentType: string;
  title: string;
  oneSentenceSummary: string;
  plainLanguageSummary: string;
  importantPoints: string[];
  actionsRequired: Array<{ action: string; details: string; deadlineId: string | null; sourceText: string; sourcePage: number | null }>;
  deadlines: Deadline[];
  importantDates: Array<{ originalText: string; normalizedDate: string | null; meaning: string; sourceText: string; sourcePage: number | null }>;
  importantAmounts: Array<{ amount: string; currency: string | null; meaning: string; sourceText: string; sourcePage: number | null }>;
  jargon: Array<{ term: string; simpleExplanation: string }>;
  warnings: string[];
  uncertaintyNotes: string[];
};

export type ExtractedDocument = {
  name: string;
  pages: SourcePage[];
  text: string;
  hasOcr: boolean;
  lowConfidenceOcr: boolean;
};
