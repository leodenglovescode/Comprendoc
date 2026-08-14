import type { ExtractedDocument, SourcePage } from "./types";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const PDF_WORKER_URL = "/vendor/pdf.worker-6.2.108.min.mjs";
const TESSERACT_BROWSER_URL = "/vendor/tesseract-7.0.0.min.js";
const TESSERACT_WORKER_URL = "/vendor/tesseract-worker-7.0.0.min.js";

interface OcrResult {
  data: { confidence: number; text: string };
}

interface OcrWorker {
  recognize(image: HTMLCanvasElement): Promise<OcrResult>;
  terminate(): Promise<unknown>;
}

interface TesseractBrowserApi {
  createWorker(
    languages: string,
    ocrEngineMode?: number,
    options?: { workerPath?: string },
  ): Promise<OcrWorker>;
}

let tesseractLoadPromise: Promise<TesseractBrowserApi> | undefined;

function getTesseractBrowserApi(): Promise<TesseractBrowserApi> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("OCR is only available in the browser."));
  }

  const browserWindow = window as Window & { Tesseract?: TesseractBrowserApi };
  if (browserWindow.Tesseract) return Promise.resolve(browserWindow.Tesseract);
  if (tesseractLoadPromise) return tesseractLoadPromise;

  tesseractLoadPromise = new Promise<TesseractBrowserApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TESSERACT_BROWSER_URL;
    script.async = true;
    script.onload = () => {
      if (browserWindow.Tesseract) resolve(browserWindow.Tesseract);
      else reject(new Error("The OCR engine loaded without exposing its browser API."));
    };
    script.onerror = () => reject(new Error("The OCR engine could not be loaded."));
    document.head.appendChild(script);
  }).catch((error) => {
    tesseractLoadPromise = undefined;
    throw error;
  });

  return tesseractLoadPromise;
}

export async function extractDocument(file: File, onProgress: (message: string, progress: number) => void): Promise<ExtractedDocument> {
  if (file.size > MAX_FILE_BYTES) throw new Error("This file is over 25 MB. Try a smaller document so it can be processed safely in your browser.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["pdf", "docx", "txt"].includes(extension)) throw new Error("Comprendoc supports PDF, DOCX, and TXT files.");
  onProgress("Reading document", 12);
  if (extension === "txt") {
    const text = await file.text(); if (!text.trim()) throw new Error("This text file appears to be empty.");
    return { name: file.name, text, pages: [{ page: 1, text, method: "txt" }], hasOcr: false, lowConfidenceOcr: false };
  }
  if (extension === "docx") {
    onProgress("Extracting text from DOCX", 38);
    const mammoth = await import("mammoth/mammoth.browser");
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    if (!result.value.trim()) throw new Error("No readable text was found in this DOCX file.");
    return { name: file.name, text: result.value, pages: [{ page: 1, text: result.value, method: "docx" }], hasOcr: false, lowConfidenceOcr: false };
  }
  return extractPdf(file, onProgress);
}

async function extractPdf(file: File, onProgress: (message: string, progress: number) => void): Promise<ExtractedDocument> {
  const pdfjs = await import("pdfjs-dist");
  // Static same-origin files bypass vinext's module graph. Letting the dev
  // server evaluate worker bundles causes browser-only globals such as
  // `window` to run in its server environment.
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
  let pdf;
  try { pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise; }
  catch { throw new Error("This PDF could not be opened. It may be corrupt, encrypted, or password-protected."); }
  const pages: SourcePage[] = []; let hasOcr = false; let lowConfidenceOcr = false;
  let ocrWorker: OcrWorker | undefined;
  try {
    for (let index = 1; index <= pdf.numPages; index++) {
      const page = await pdf.getPage(index); onProgress(`Extracting text • page ${index} of ${pdf.numPages}`, 15 + Math.round((index / pdf.numPages) * 45));
      const content = await page.getTextContent();
      const embedded = content.items.map((item) => ("str" in item ? item.str : "")).join(" ").replace(/\s+/g, " ").trim();
      if (embedded.length >= 40) { pages.push({ page: index, text: embedded, method: "text" }); continue; }
      hasOcr = true; onProgress(`OCR page ${index} of ${pdf.numPages}`, 42 + Math.round((index / pdf.numPages) * 40));
      try {
        const viewport = page.getViewport({ scale: 1.8 }); const canvas = document.createElement("canvas");
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
        if (!ocrWorker) {
          const { createWorker } = await getTesseractBrowserApi();
          ocrWorker = await createWorker("eng", 1, { workerPath: TESSERACT_WORKER_URL });
        }
        const result = await ocrWorker.recognize(canvas);
        const confidence = result.data.confidence; if (confidence < 70) lowConfidenceOcr = true;
        pages.push({ page: index, text: result.data.text.trim(), method: "ocr", confidence });
      } catch {
        if (ocrWorker) await ocrWorker.terminate().catch(() => undefined);
        ocrWorker = undefined;
        pages.push({ page: index, text: "[OCR could not read this page]", method: "ocr", confidence: 0 }); lowConfidenceOcr = true;
      }
    }
  } finally {
    if (ocrWorker) await ocrWorker.terminate().catch(() => undefined);
  }
  const text = pages.map((p) => `[Page ${p.page}]\n${p.text}`).join("\n\n");
  if (!text.replace(/\[Page \d+\]|\[OCR could not read this page\]/g, "").trim()) throw new Error("No readable text was found in this PDF.");
  return { name: file.name, pages, text, hasOcr, lowConfidenceOcr };
}
