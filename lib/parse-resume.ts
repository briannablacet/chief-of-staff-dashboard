/**
 * Client-side resume text extraction.
 * Supports PDF (via pdfjs-dist) and DOCX (via mammoth).
 * Call from a browser context only — not from Server Components or API routes.
 */

export async function parseResumeFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase()

  if (ext === "pdf") {
    return extractPdf(file)
  }

  if (ext === "doc" || ext === "docx") {
    return extractDocx(file)
  }

  if (ext === "txt") {
    return file.text()
  }

  throw new Error(`Unsupported file type: .${ext}. Please upload a PDF, DOCX, or TXT file.`)
}

async function extractPdf(file: File): Promise<string> {
  // Lazy-load pdfjs so it doesn't bloat the initial bundle
  const pdfjsLib = await import("pdfjs-dist")

  // Point the worker at the bundled worker file shipped with pdfjs-dist
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
    pages.push(pageText)
  }

  return pages.join("\n\n")
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth")
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}
