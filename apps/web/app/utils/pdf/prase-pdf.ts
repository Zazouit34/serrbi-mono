"use client";

import pdfToText from "react-pdftotext";

export async function parsePDF(file: File): Promise<string> {
  try {
    const fullText = await pdfToText(file);
   
    return fullText.trim();
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error("Failed to parse PDF file");
  }
}