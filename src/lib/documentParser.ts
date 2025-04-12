/**
 * Document parser utility
 * Handles extraction of text content from various document formats
 * Changes:
 * - Updated PDF.js worker configuration to use local worker file instead of CDN
 * - Added password protection detection
 * - Improved error handling for PDF extraction
 */

import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';

// Set worker source to use local worker file from node_modules
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type.toLowerCase();
  
  // Handle different file types
  if (fileType === 'application/pdf') {
    return extractFromPDF(file);
  } else if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType === 'application/msword'
  ) {
    return extractFromWord(file);
  } else if (fileType === 'text/plain') {
    return extractFromTxt(file);
  } else {
    throw new Error('Unsupported file type. Please upload a PDF, DOC, DOCX, or TXT file.');
  }
}

async function extractFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    
    // Add error handler for password-protected PDFs
    loadingTask.onPassword = function (updatePassword: (password: string) => void, reason: number) {
      throw new Error('This PDF is password-protected. Please provide an unprotected PDF file.');
    };

    const pdf = await loadingTask.promise;
    let text = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ') + '\n';
    }

    return text.trim();
  } catch (error: any) {
    console.error('PDF extraction error:', error);
    
    // Provide specific error messages based on the error type
    if (error.message.includes('password')) {
      throw new Error('This PDF is password-protected. Please provide an unprotected PDF file.');
    } else if (error.name === 'InvalidPDFException') {
      throw new Error('The PDF file appears to be corrupted. Please verify the file and try again.');
    } else {
      throw new Error('Failed to extract text from PDF. Please ensure the file is not corrupted or password-protected.');
    }
  }
}

async function extractFromWord(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  } catch (error) {
    console.error('Word document extraction error:', error);
    throw new Error('Failed to extract text from Word document. The file might be corrupted.');
  }
}

async function extractFromTxt(file: File): Promise<string> {
  try {
    return await file.text();
  } catch (error) {
    console.error('Text file reading error:', error);
    throw new Error('Failed to read text file. The file might be corrupted.');
  }
}