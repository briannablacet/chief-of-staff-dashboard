"use client"

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx"

/**
 * Converts plain-text résumé content into a .docx blob and triggers a download.
 * Heuristic: lines that are ALL CAPS or Title Case and short (≤ 40 chars) are
 * treated as section headings.
 */
export async function downloadResumeAsDocx(text: string, fileName: string): Promise<void> {
  const lines = text.split("\n")

  const paragraphs = lines.map((line) => {
    const trimmed = line.trim()

    if (!trimmed) {
      // Blank line — spacer paragraph
      return new Paragraph({ text: "" })
    }

    const isHeading =
      trimmed.length <= 40 &&
      (trimmed === trimmed.toUpperCase() ||
        /^[A-Z][a-z]/.test(trimmed) &&
          !trimmed.includes(",") &&
          !trimmed.includes(".") &&
          !/\d{4}/.test(trimmed) &&
          trimmed.split(" ").length <= 5)

    if (isHeading) {
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: trimmed,
            bold: true,
            size: 26, // 13pt
          }),
        ],
        spacing: { before: 200, after: 80 },
      })
    }

    // Bullet line
    if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
      return new Paragraph({
        bullet: { level: 0 },
        children: [
          new TextRun({
            text: trimmed.replace(/^[•\-*]\s*/, ""),
            size: 22, // 11pt
          }),
        ],
      })
    }

    // Normal body line
    return new Paragraph({
      children: [
        new TextRun({
          text: trimmed,
          size: 22,
        }),
      ],
      spacing: { after: 60 },
    })
  })

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
    },
    sections: [{ properties: {}, children: paragraphs }],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName.replace(/\.[^.]+$/, "") + ".docx"
  a.click()
  URL.revokeObjectURL(url)
}
