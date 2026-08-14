import { z } from "zod";

const nullableString = z.string().nullable();
const sourcePage = z.number().int().positive().nullable();

export const analysisSchema = z.object({
  detectedLanguage: z.string(),
  documentType: z.string(),
  title: z.string(),
  oneSentenceSummary: z.string(),
  plainLanguageSummary: z.string(),
  importantPoints: z.array(z.string()),
  actionsRequired: z.array(z.object({ action: z.string(), details: z.string(), deadlineId: nullableString, sourceText: z.string(), sourcePage })),
  deadlines: z.array(z.object({
    id: z.string(), originalText: z.string(), normalizedDate: nullableString, normalizedTime: nullableString,
    timezone: nullableString, isAllDay: z.boolean(), certainty: z.enum(["high", "medium", "low"]),
    meaning: z.string(), requiredAction: z.string(), consequenceIfMissed: nullableString,
    sourceText: z.string(), sourcePage, calendarSuggested: z.boolean(), calendarTitle: nullableString,
    calendarDescription: nullableString,
  })),
  importantDates: z.array(z.object({ originalText: z.string(), normalizedDate: nullableString, meaning: z.string(), sourceText: z.string(), sourcePage })),
  importantAmounts: z.array(z.object({ amount: z.string(), currency: nullableString, meaning: z.string(), sourceText: z.string(), sourcePage })),
  jargon: z.array(z.object({ term: z.string(), simpleExplanation: z.string() })),
  warnings: z.array(z.string()),
  uncertaintyNotes: z.array(z.string()),
});
