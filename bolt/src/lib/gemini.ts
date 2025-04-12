/**
 * Gemini API client configuration
 * Sets up the Gemini API client for tone analysis and content generation
 * Updated to:
 * - Use correct Gemini model name
 * - Add proper error handling
 * - Improve response parsing
 * - Add markdown code block stripping for JSON responses
 * - Add detailed error logging for parsing failures
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

if (!import.meta.env.VITE_GEMINI_API_KEY) {
  throw new Error('Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.');
}

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Use gemini-2.0-flash as specified
export const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.7,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  },
});

interface ToneAnalysisResult {
  [key: string]: {
    score: number;
    explanation: string;
  };
}

export async function analyzeTone(text: string): Promise<ToneAnalysisResult> {
  if (!text.trim()) {
    throw new Error('No text provided for analysis');
  }

  const prompt = `
    Analyze the following text and provide a detailed assessment of its tone across these dimensions:
    - Formality (0-100)
    - Clarity (0-100)
    - Warmth (0-100)
    - Professionalism (0-100)
    - Approachability (0-100)

    For each dimension, provide a score and a brief explanation.
    Return ONLY a JSON object with this structure, with no markdown formatting or additional text:
    {
      "Formality": { "score": number, "explanation": "string" },
      "Clarity": { "score": number, "explanation": "string" },
      "Warmth": { "score": number, "explanation": "string" },
      "Professionalism": { "score": number, "explanation": "string" },
      "Approachability": { "score": number, "explanation": "string" }
    }

    Text to analyze:
    ${text}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let analysisText = response.text();
    
    // Clean the response by removing markdown code blocks and any surrounding whitespace
    analysisText = analysisText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    try {
      const parsedResult = JSON.parse(analysisText);
      
      // Validate the response structure
      const requiredDimensions = ['Formality', 'Clarity', 'Warmth', 'Professionalism', 'Approachability'];
      const missingDimensions = requiredDimensions.filter(dim => !parsedResult[dim]);
      
      if (missingDimensions.length > 0) {
        throw new Error(`Invalid response format: Missing dimensions: ${missingDimensions.join(', ')}`);
      }
      
      return parsedResult;
    } catch (parseError) {
      console.error('Failed to parse Gemini response. Response content:', analysisText);
      console.error('Parse error:', parseError);
      throw new Error(`Failed to parse analysis results. The API response was not in the expected format. Raw response: ${analysisText.substring(0, 100)}...`);
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    if (error instanceof Error) {
      throw new Error(`Gemini API error: ${error.message}`);
    }
    throw new Error('An unexpected error occurred while analyzing the text.');
  }
}