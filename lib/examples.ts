import type { AnalysisResult, ExtractedDocument } from "./types";

export const examples: Array<{ id: string; label: string; kicker: string; document: ExtractedDocument; analysis: AnalysisResult }> = [
  {
    id: "student", label: "Enrollment notice", kicker: "3 deadlines",
    document: { name: "Synthetic enrollment notice.txt", hasOcr: false, lowConfidenceOcr: false, pages: [{ page: 1, method: "txt", text: `NORTHSHORE UNIVERSITY\nINTERNATIONAL STUDENT ENROLLMENT NOTICE\nDate of notice: July 28, 2026\n\nTo maintain your enrollment eligibility, you must complete the following steps. Submit the online enrollment form no later than August 20, 2026. A non-refundable enrollment deposit of $250 must be paid at the time of submission.\n\nAll requested identity and visa documentation must be received by the International Student Office by August 28, 2026. Documents received after this date may delay your registration.\n\nYou are required to attend international student orientation on September 4, 2026 at 9:00 AM. The orientation will be held in Student Center Room 204.\n\nDo not send original passports by mail. Unless the office specifically requests an original, upload a clear copy through the secure portal.` }], text: "", },
    analysis: {
      detectedLanguage: "English", documentType: "University enrollment notice", title: "International student enrollment steps",
      oneSentenceSummary: "Northshore University is asking you to submit an enrollment form, pay a $250 deposit, provide documents, and attend orientation.",
      plainLanguageSummary: "You have three important dates. First, submit the online form and pay the deposit. Then send the requested identity and visa documents. Finally, attend orientation in person.",
      importantPoints: ["The enrollment deposit is non-refundable.", "Late documents may delay registration.", "Do not mail your original passport unless the office specifically asks for it."],
      actionsRequired: [
        { action: "Submit the online enrollment form", details: "Complete the form and pay the deposit.", deadlineId: "d1", sourceText: "Submit the online enrollment form no later than August 20, 2026.", sourcePage: 1 },
        { action: "Send identity and visa documents", details: "Make sure the International Student Office receives them.", deadlineId: "d2", sourceText: "All requested identity and visa documentation must be received by the International Student Office by August 28, 2026.", sourcePage: 1 },
        { action: "Attend international student orientation", details: "Go to Student Center Room 204 at 9:00 AM.", deadlineId: "d3", sourceText: "You are required to attend international student orientation on September 4, 2026 at 9:00 AM.", sourcePage: 1 },
      ],
      deadlines: [
        { id: "d1", originalText: "no later than August 20, 2026", normalizedDate: "2026-08-20", normalizedTime: null, timezone: null, isAllDay: true, certainty: "high", meaning: "Enrollment form due", requiredAction: "Submit the online enrollment form and pay the $250 deposit.", consequenceIfMissed: null, sourceText: "Submit the online enrollment form no later than August 20, 2026.", sourcePage: 1, calendarSuggested: true, calendarTitle: "Comprendoc: Submit enrollment form", calendarDescription: "Submit the online enrollment form and pay the $250 deposit." },
        { id: "d2", originalText: "by August 28, 2026", normalizedDate: "2026-08-28", normalizedTime: null, timezone: null, isAllDay: true, certainty: "high", meaning: "Documents must be received", requiredAction: "Send the requested identity and visa documents.", consequenceIfMissed: "Your registration may be delayed.", sourceText: "All requested identity and visa documentation must be received by the International Student Office by August 28, 2026.", sourcePage: 1, calendarSuggested: true, calendarTitle: "Comprendoc: Submit identity and visa documents", calendarDescription: "Make sure the International Student Office receives the requested documents." },
        { id: "d3", originalText: "September 4, 2026 at 9:00 AM", normalizedDate: "2026-09-04", normalizedTime: "09:00", timezone: null, isAllDay: false, certainty: "medium", meaning: "Required orientation", requiredAction: "Attend orientation in Student Center Room 204.", consequenceIfMissed: null, sourceText: "You are required to attend international student orientation on September 4, 2026 at 9:00 AM.", sourcePage: 1, calendarSuggested: true, calendarTitle: "Comprendoc: International student orientation", calendarDescription: "Attend orientation in Student Center Room 204. Timezone was not stated—verify the time locally." },
      ],
      importantDates: [{ originalText: "July 28, 2026", normalizedDate: "2026-07-28", meaning: "Date the notice was issued", sourceText: "Date of notice: July 28, 2026", sourcePage: 1 }],
      importantAmounts: [{ amount: "$250", currency: "USD", meaning: "Non-refundable enrollment deposit", sourceText: "A non-refundable enrollment deposit of $250 must be paid at the time of submission.", sourcePage: 1 }],
      jargon: [{ term: "Enrollment eligibility", simpleExplanation: "Meeting the university’s conditions to stay enrolled." }, { term: "Non-refundable", simpleExplanation: "You will not get this money back after paying it." }],
      warnings: ["Do not mail your original passport unless the office specifically asks for it."],
      uncertaintyNotes: ["The orientation notice does not state a timezone. Verify the time with the university."],
    },
  },
  {
    id: "apartment", label: "Apartment notice", kicker: "relative deadline",
    document: { name: "Synthetic apartment notice.txt", hasOcr: false, lowConfidenceOcr: false, pages: [{ page: 1, method: "txt", text: `RIVER PARK APARTMENTS\nNOTICE OF REQUIRED INFORMATION\n\nPlease return the attached income verification form within 10 business days of receiving this notice. We cannot calculate your exact due date because the date you received this letter is not known.\n\nYour current monthly rent is $1,480. This notice does not change your rent. Failure to provide the requested information may delay your annual eligibility review.` }], text: "" },
    analysis: {
      detectedLanguage: "English", documentType: "Housing information request", title: "Income verification request", oneSentenceSummary: "Your apartment manager needs an income verification form within 10 business days after you receive this notice.", plainLanguageSummary: "Fill out and return the attached form. The exact date depends on when you received this notice, so check that date before planning.",
      importantPoints: ["Your rent stays at $1,480 per month.", "The exact due date cannot be calculated without your received date."],
      actionsRequired: [{ action: "Return the income verification form", details: "Send it within 10 business days after receiving the notice.", deadlineId: "r1", sourceText: "Please return the attached income verification form within 10 business days of receiving this notice.", sourcePage: 1 }],
      deadlines: [{ id: "r1", originalText: "within 10 business days of receiving this notice", normalizedDate: null, normalizedTime: null, timezone: null, isAllDay: true, certainty: "high", meaning: "Income verification form due", requiredAction: "Return the attached income verification form.", consequenceIfMissed: "Your annual eligibility review may be delayed.", sourceText: "Please return the attached income verification form within 10 business days of receiving this notice.", sourcePage: 1, calendarSuggested: false, calendarTitle: null, calendarDescription: null }],
      importantDates: [], importantAmounts: [{ amount: "$1,480", currency: "USD", meaning: "Current monthly rent; this notice does not change it", sourceText: "Your current monthly rent is $1,480. This notice does not change your rent.", sourcePage: 1 }],
      jargon: [{ term: "Eligibility review", simpleExplanation: "A check that you still meet the program’s rules." }], warnings: [], uncertaintyNotes: ["Exact date cannot be calculated yet. It depends on when you received the notice and how business days are counted."],
    },
  },
];

for (const example of examples) example.document.text = example.document.pages.map((p) => p.text).join("\n\n");
