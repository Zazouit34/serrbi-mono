"use client";

export async function parsePDF(file: File): Promise<string> {
  // Ensure we're in the browser environment
  if (typeof window === 'undefined') {
    throw new Error("PDF parsing is only available in the browser");
  }
  
  try {
    // Dynamic import to avoid SSR issues
    const { default: pdfToText } = await import("react-pdftotext");
    const fullText = await pdfToText(file); 
    
    return fullText.replace(/\s+/g, " ").trim();
   
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error("Failed to parse PDF file");
  }
}