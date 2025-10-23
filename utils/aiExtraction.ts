import { PriceFormData } from '../types';

// Gemini AI Configuration
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent';

export interface ExtractedMarketData {
  market: string;
  date: string;
  mixedBreed?: {
    lots: number;
    totalWeight: number;
    maxPrice: number;
    minPrice: number;
    avgPrice: number;
  };
  bivoltine?: {
    lots: number;
    totalWeight: number;
    maxPrice: number;
    minPrice: number;
    avgPrice: number;
  };
  cbGold?: {
    lots: number;
    quantity: number;
    maxPrice: number;
    minPrice: number;
    avgPrice: number;
  };
}

export interface AIExtractionResult {
  success: boolean;
  data?: ExtractedMarketData;
  priceEntries?: PriceFormData[];
  error?: string;
  rawResponse?: string;
}

/**
 * Extract market data from Kannada or English text using Gemini AI
 */
export async function extractMarketDataWithAI(
  inputText: string
): Promise<AIExtractionResult> {
  try {
    if (!API_KEY || API_KEY === 'your-gemini-api-key-here') {
      return {
        success: false,
        error: 'Gemini API key not configured. Please add EXPO_PUBLIC_GEMINI_API_KEY to your .env file.',
      };
    }

    const prompt = `
You are a data extraction assistant for cocoon market transactions. Extract structured data from the following text which may be in Kannada or English.

Text to analyze:
"""
${inputText}
"""

Extract the following information and return ONLY a valid JSON object (no markdown, no code blocks):

{
  "market": "market name (e.g., Kanakapura, Kollegala, Ramanagara)",
  "date": "date in format DD-MM-YYYY",
  "mixedBreed": {
    "lots": number (ತಂಡಗಳು/lots for ಮಿಶ್ರ/mixed/CB),
    "totalWeight": number (ಒಟ್ಟು ತೂಕ/total weight in kg),
    "maxPrice": number (ಹೆಚ್ಚು ದರ/max price),
    "minPrice": number (ಕಡಿಮೆ ದರ/min price),
    "avgPrice": number (ಸರಾಸರಿ ದರ/average price)
  },
  "bivoltine": {
    "lots": number (ತಂಡಗಳು/lots for ದ್ವಿತಳಿ/bivoltine/BV),
    "totalWeight": number (ಒಟ್ಟು ತೂಕ/total weight in kg),
    "maxPrice": number (ಹೆಚ್ಚು ದರ/max price),
    "minPrice": number (ಕಡಿಮೆ ದರ/min price),
    "avgPrice": number (ಸರಾಸರಿ ದರ/average price)
  },
  "cbGold": {
    "lots": number,
    "quantity": number (QTY in kg),
    "maxPrice": number (MAX),
    "minPrice": number (MIN),
    "avgPrice": number (AVG)
  }
}

Notes:
- **IMPORTANT: Market names must ALWAYS be in English - match EXACTLY these spellings**
- Translate Kannada market names to English (exact spelling required):
  * ಕನಕಪುರ → Kanakapura
  * ಕೊಳ್ಳೇಗಾಲ/ಕೊಲ್ಲೇಗಾಲ/kollegal → Kollegala
  * ರಾಮನಗರ → Ramanagara
  * ಶಿಡ್ಲಘಟ್ಟ/ಸಿದ್ದಲಾಘಟ್ಟ → Siddalagatta
  * ಕೋಲಾರ → Kolar
- Use EXACT capitalization as shown above (note: Siddalagatta has double 'd')
- ಮಿಶ್ರ = Mixed/CB (Cross Breed)
- ದ್ವಿತಳಿ = Bivoltine/BV
- CB GOLD is a separate category
- If a category is not present in the text, omit that object
- Return ONLY the JSON object, no explanations or markdown
`;

    // Call Gemini API directly using REST
    const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API Error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const text = data.candidates[0]?.content?.parts[0]?.text;

    // Clean up response - remove markdown code blocks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```\n?/g, '');
    }

    const extractedData: ExtractedMarketData = JSON.parse(cleanedText);

    // Convert to PriceFormData entries
    const priceEntries: PriceFormData[] = [];

    // Add Mixed/CB entry if present
    if (extractedData.mixedBreed) {
      priceEntries.push({
        breed: 'CB',
        market: extractedData.market,
        pricePerKg: extractedData.mixedBreed.avgPrice,
        minPrice: extractedData.mixedBreed.minPrice,
        maxPrice: extractedData.mixedBreed.maxPrice,
        avgPrice: extractedData.mixedBreed.avgPrice,
        quality: 'A', // Default quality, admin can change
        lotNumber: extractedData.mixedBreed.lots,
      });
    }

    // Add Bivoltine/BV entry if present
    if (extractedData.bivoltine) {
      priceEntries.push({
        breed: 'BV',
        market: extractedData.market,
        pricePerKg: extractedData.bivoltine.avgPrice,
        minPrice: extractedData.bivoltine.minPrice,
        maxPrice: extractedData.bivoltine.maxPrice,
        avgPrice: extractedData.bivoltine.avgPrice,
        quality: 'A', // Default quality, admin can change
        lotNumber: extractedData.bivoltine.lots,
      });
    }

    // Add CB Gold entry if present
    if (extractedData.cbGold) {
      priceEntries.push({
        breed: 'CB',
        market: extractedData.market,
        pricePerKg: extractedData.cbGold.avgPrice,
        minPrice: extractedData.cbGold.minPrice,
        maxPrice: extractedData.cbGold.maxPrice,
        avgPrice: extractedData.cbGold.avgPrice,
        quality: 'A', // Gold is typically high quality
        lotNumber: extractedData.cbGold.lots,
      });
    }

    return {
      success: true,
      data: extractedData,
      priceEntries,
      rawResponse: text,
    };
  } catch (error) {
    console.error('AI extraction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract data from text',
    };
  }
}

/**
 * Normalize market names to English
 */
function normalizeMarketName(marketName: string): string {
  // Market names matching translation files (en.json lines 95-99)
  const marketMap: { [key: string]: string } = {
    // Kanakapura
    'ಕನಕಪುರ': 'Kanakapura',
    'kanakapura': 'Kanakapura',
    'KANAKAPURA': 'Kanakapura',
    // Kollegala
    'ಕೊಳ್ಳೇಗಾಲ': 'Kollegala',
    'ಕೊಲ್ಲೇಗಾಲ': 'Kollegala',
    'kollegal': 'Kollegala',
    'kollegala': 'Kollegala',
    'KOLLEGAL': 'Kollegala',
    'KOLLEGALA': 'Kollegala',
    // Ramanagara
    'ರಾಮನಗರ': 'Ramanagara',
    'ramanagara': 'Ramanagara',
    'RAMANAGARA': 'Ramanagara',
    // Siddalagatta (note the spelling - matches translation key)
    'ಶಿಡ್ಲಘಟ್ಟ': 'Siddalagatta',
    'ಸಿದ್ದಲಾಘಟ್ಟ': 'Siddalagatta',
    'sidlaghatta': 'Siddalagatta',
    'siddalagatta': 'Siddalagatta',
    'SIDLAGHATTA': 'Siddalagatta',
    'SIDDALAGATTA': 'Siddalagatta',
    'Sidlaghatta': 'Siddalagatta',
    'Siddalagatta': 'Siddalagatta',
    // Kolar
    'ಕೋಲಾರ': 'Kolar',
    'kolar': 'Kolar',
    'KOLAR': 'Kolar',
  };

  const trimmed = marketName.trim();
  return marketMap[trimmed] || trimmed;
}

/**
 * Validate extracted data
 */
export function validateExtractedData(data: ExtractedMarketData): {
  valid: boolean;
  errors: string[]
} {
  const errors: string[] = [];

  // Normalize market name to English
  if (data.market) {
    data.market = normalizeMarketName(data.market);
  }

  if (!data.market || data.market.trim() === '') {
    errors.push('Market name is required');
  }

  if (!data.date || data.date.trim() === '') {
    errors.push('Date is required');
  }

  // Check if at least one breed data exists
  if (!data.mixedBreed && !data.bivoltine && !data.cbGold) {
    errors.push('At least one breed data (Mixed, Bivoltine, or CB Gold) is required');
  }

  // Validate mixed breed data if present
  if (data.mixedBreed) {
    if (data.mixedBreed.lots <= 0) errors.push('Mixed breed lots must be greater than 0');
    if (data.mixedBreed.minPrice <= 0) errors.push('Mixed breed min price must be greater than 0');
    if (data.mixedBreed.maxPrice <= 0) errors.push('Mixed breed max price must be greater than 0');
    if (data.mixedBreed.minPrice >= data.mixedBreed.maxPrice) {
      errors.push('Mixed breed max price must be greater than min price');
    }
  }

  // Validate bivoltine data if present
  if (data.bivoltine) {
    if (data.bivoltine.lots <= 0) errors.push('Bivoltine lots must be greater than 0');
    if (data.bivoltine.minPrice <= 0) errors.push('Bivoltine min price must be greater than 0');
    if (data.bivoltine.maxPrice <= 0) errors.push('Bivoltine max price must be greater than 0');
    if (data.bivoltine.minPrice >= data.bivoltine.maxPrice) {
      errors.push('Bivoltine max price must be greater than min price');
    }
  }

  // Validate CB Gold data if present
  if (data.cbGold) {
    if (data.cbGold.lots <= 0) errors.push('CB Gold lots must be greater than 0');
    if (data.cbGold.minPrice <= 0) errors.push('CB Gold min price must be greater than 0');
    if (data.cbGold.maxPrice <= 0) errors.push('CB Gold max price must be greater than 0');
    if (data.cbGold.minPrice >= data.cbGold.maxPrice) {
      errors.push('CB Gold max price must be greater than min price');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
