import { PriceFormData } from '../types';

// Gemini AI Configuration - Using Admin-specific API key for data extraction
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_ADMIN_API_KEY || '';
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
        error: 'Gemini Admin API key not configured. Please add EXPO_PUBLIC_GEMINI_ADMIN_API_KEY to your .env file.',
      };
    }

    const prompt = `
You are an ULTRA-INTELLIGENT AI assistant specialized in extracting cocoon market data from ANY format.

🎯 YOUR SUPERPOWERS:
✅ Read Kannada, English, or mixed languages
✅ Handle ANY spelling mistakes, typos, or variations
✅ Extract data from messy, unstructured, or incomplete text
✅ Auto-correct and normalize all market names
✅ Work with different date formats, number formats, and text layouts
✅ Handle partial data, missing fields, and ambiguous information

📝 TEXT TO ANALYZE:
"""
${inputText}
"""

Extract the following information and return ONLY a valid JSON object (no markdown, no code blocks):

{
  "market": "market name (MUST be one of: Kanakapura, Kollegala, Ramanagara, Siddalagatta, Kolar)",
  "date": "date in format DD-MM-YYYY",
  "mixedBreed": {
    "lots": number,
    "totalWeight": number,
    "maxPrice": number,
    "minPrice": number,
    "avgPrice": number
  },
  "bivoltine": {
    "lots": number,
    "totalWeight": number,
    "maxPrice": number,
    "minPrice": number,
    "avgPrice": number
  },
  "cbGold": {
    "lots": number,
    "quantity": number,
    "maxPrice": number,
    "minPrice": number,
    "avgPrice": number
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 INTELLIGENCE RULES - READ CAREFULLY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. MARKET NAME CORRECTION (CRITICAL!):
   You MUST recognize ANY spelling variation, typo, or mistake and auto-correct to standard spelling.

   ✅ STANDARD SPELLINGS (Use EXACTLY these, no other variations):

   📍 **Kanakapura**
      Accept: kanakapura, Kanakpura, Kankapura, kanakpur, ಕನಕಪುರ, KANAKAPURA, kanakpura, Kanakpur, etc.

   📍 **Kollegala**
      Accept: kollegal, Kollegal, kolegala, kolligala, kolegal, Kolegal, ಕೊಳ್ಳೇಗಾಲ, ಕೊಲ್ಲೇಗಾಲ, KOLLEGAL, KOLLEGALA, etc.

   📍 **Ramanagara**
      Accept: ramanagar, Ramanagar, ramangara, ramangar, Ramangara, ರಾಮನಗರ, RAMANAGARA, etc.

   📍 **Siddalagatta** (note: double 'd')
      Accept: Shidlaghatta, Sidlaghatta, Shiddalagatta, shidlaghatta, sidlaghatta, siddlaghatta,
              Shiddlaghatta, SHIDLAGHATTA, SIDLAGHATTA, ಶಿಡ್ಲಘಟ್ಟ, ಸಿದ್ದಲಾಘಟ್ಟ,
              GCM Shidlaghatta, Govt Shidlaghatta, sidalagatta, shidalagatta, etc.

   📍 **Kolar**
      Accept: kolar, kollar, Kollar, ಕೋಲಾರ, KOLAR, etc.

2. SMART PREFIXES REMOVAL:
   Automatically remove these prefixes before matching:
   - GCM, GOVT, Government, Sarkar, ಸರ್ಕಾರಿ, Sarkari, etc.
   - Example: "GCM Shidlaghatta" → extract "Shidlaghatta" → correct to **Siddalagatta**

3. KANNADA TRANSLATION INTELLIGENCE:
   Understand these Kannada terms and variations:

   🔹 Market (any variation):
      - ಮಾರುಕಟ್ಟೆ, ಮಾರುಕಟ್ಟೇ, market, marukatte, etc.

   🔹 Mixed Breed / CB:
      - ಮಿಶ್ರ, ಮಿಶ್ರ ತಂಡಗಳು, mixed, CB, Cross Breed, cross breed, etc.

   🔹 Bivoltine / BV:
      - ದ್ವಿತಳಿ, ದ್ವಿತಳಿ ತಂಡಗಳು, bivoltine, BV, etc.

   🔹 Lots/Batches:
      - ತಂಡಗಳು, ತಂಡ, lots, LOTS, batches, lot number, etc.

   🔹 Weight:
      - ಒಟ್ಟು ತೂಕ, ತೂಕ, weight, QTY, quantity, kg, etc.

   🔹 Prices:
      - ಹೆಚ್ಚು ದರ = max price (MAX, maximum, highest, etc.)
      - ಕಡಿಮೆ ದರ = min price (MIN, minimum, lowest, etc.)
      - ಸರಾಸರಿ ದರ = avg price (AVG, average, mean, etc.)

   🔹 Date:
      - ದಿನಾಂಕ, date, dated, on, etc.

4. NUMBER EXTRACTION INTELLIGENCE:
   - Extract numbers from mixed text (e.g., "262 lots" → 262)
   - Handle Indian number formats (e.g., "13,401" or "13401")
   - Understand decimal formats (e.g., "11418.040" → 11418.040)

5. FUZZY MATCHING:
   If you see a market name that's CLOSE to any standard name, correct it!
   - Think: "Does this look like Kanakapura, Kollegala, Ramanagara, Siddalagatta, or Kolar?"
   - Even with 2-3 letter differences, pick the closest match

6. EXAMPLES OF CORRECTIONS YOU MUST DO:
   ✅ "GCM Shidlaghatta" → market: "Siddalagatta"
   ✅ "kollegal market" → market: "Kollegala"
   ✅ "RAMANAGAR" → market: "Ramanagara"
   ✅ "kanakpur" → market: "Kanakapura"
   ✅ "shiddlaghatta" → market: "Siddalagatta"
   ✅ "ಕನಕಪುರ ಮಾರುಕಟ್ಟೆ" → market: "Kanakapura"
   ✅ "Govt Kollegal" → market: "Kollegala"

7. DATE FORMAT INTELLIGENCE:
   Handle ALL date formats and convert to DD-MM-YYYY:
   - "02/11/2025" → "02-11-2025"
   - "2-11-25" → "02-11-2025"
   - "02.11.2025" → "02-11-2025"
   - "November 2, 2025" → "02-11-2025"
   - "2nd Nov 2025" → "02-11-2025"
   - "02-11-25" → "02-11-2025" (assume 20XX for 2-digit years)
   - Kannada dates: "ದಿನಾಂಕ: 02-11-2025" → "02-11-2025"

8. NUMBER FORMAT INTELLIGENCE:
   Handle ALL number formats:
   - Indian format: "13,401" → 13401
   - Decimal: "11418.040" → 11418.04
   - With units: "715 kg" → 715
   - Mixed: "Qty: 13401kg" → 13401
   - Spelled out: "two sixty two" → 262
   - With commas/spaces: "13 401" or "13,401" → 13401

9. BREED/TYPE RECOGNITION (ULTRA FLEXIBLE):

   🔹 CB / Mixed / Cross Breed - Recognize ALL of these:
      ✅ CB, C.B., cb, Cross Breed, Cross-Breed, Mixed, Mishrita, ಮಿಶ್ರ, ಮಿಶ್ರ ತಳಿ
      ✅ CB GOLD, CB Gold, CBGold, Gold, ಚಿನ್ನ
      ✅ Even if just says "lots: 262" without explicitly saying CB, infer from context

   🔹 BV / Bivoltine - Recognize ALL of these:
      ✅ BV, B.V., bv, Bivoltine, Bi-voltine, Dvitali, ದ್ವಿತಳಿ, ದ್ವಿತಳಿ ತಳಿ

   🔹 Context clues:
      - If text mentions "Mixed" or "CB" first, then "BV" → two separate categories
      - If only one set of prices → likely CB/Mixed (default)
      - Look for headers, sections, or separators

10. MISSING DATA HANDLING:
    - If date is missing → use today's date or extract from context
    - If lots number missing → set to 0 or estimate from weight
    - If min/max missing but avg present → use avg for all three
    - If only one price given → use it for min, max, and avg
    - If breed type unclear → default to CB (mixedBreed)
    - NEVER fail extraction due to missing fields - make intelligent guesses!

11. MESSY TEXT HANDLING:
    - Extract data even if text has:
      ✅ Extra spaces, line breaks, special characters
      ✅ Mixed case: "qTy: 13401 Kg"
      ✅ Typos: "lotz: 262", "Qnty: 13401", "averge: 622"
      ✅ Missing colons: "lots 262" or "lots-262" or "lots=262"
      ✅ Reversed order (prices before market name)
      ✅ Multiple languages in same line
      ✅ Incomplete data (missing sections)

12. EDGE CASES TO HANDLE:
    ✅ Multiple markets mentioned → pick the most prominent one
    ✅ Conflicting dates → pick the most recent or most formatted one
    ✅ Negative numbers → convert to positive
    ✅ Zeros → accept as valid values
    ✅ Very large numbers → accept if reasonable (< 1 million)
    ✅ Abbreviations: "avg" "mn" "mx" "qty" "kg" "wt" etc.
    ✅ Ranges: "400-600" → min=400, max=600, avg=500

13. OUTPUT REQUIREMENTS:
    - Market name: MUST be EXACTLY one of: **Kanakapura, Kollegala, Ramanagara, Siddalagatta, Kolar**
    - Date: MUST be DD-MM-YYYY format (e.g., "02-11-2025")
    - Numbers: Plain numbers only (no commas, no units in JSON)
    - Breed categories: Only include if data found (omit if missing)
    - Return ONLY valid JSON, NO markdown (\`\`\`json), NO code blocks, NO explanations
    - Be AGGRESSIVE in extraction - always try to extract something useful!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 REMEMBER: You are BULLETPROOF! Handle EVERYTHING and ALWAYS succeed in extraction!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
  // IMPORTANT: This handles ALL spelling variations and typos
  const marketMap: { [key: string]: string } = {
    // Kanakapura - All variations
    'ಕನಕಪುರ': 'Kanakapura',
    'kanakapura': 'Kanakapura',
    'Kanakapura': 'Kanakapura',
    'KANAKAPURA': 'Kanakapura',
    'kanakpura': 'Kanakapura',
    'Kanakpura': 'Kanakapura',
    'kankapura': 'Kanakapura',
    'Kankapura': 'Kanakapura',
    'kanakpur': 'Kanakapura',
    'Kanakpur': 'Kanakapura',

    // Kollegala - All variations
    'ಕೊಳ್ಳೇಗಾಲ': 'Kollegala',
    'ಕೊಲ್ಲೇಗಾಲ': 'Kollegala',
    'kollegal': 'Kollegala',
    'Kollegal': 'Kollegala',
    'KOLLEGAL': 'Kollegala',
    'kollegala': 'Kollegala',
    'Kollegala': 'Kollegala',
    'KOLLEGALA': 'Kollegala',
    'kolegala': 'Kollegala',
    'Kolegala': 'Kollegala',
    'kolegal': 'Kollegala',
    'Kolegal': 'Kollegala',
    'kolligala': 'Kollegala',
    'Kolligala': 'Kollegala',

    // Ramanagara - All variations
    'ರಾಮನಗರ': 'Ramanagara',
    'ramanagara': 'Ramanagara',
    'Ramanagara': 'Ramanagara',
    'RAMANAGARA': 'Ramanagara',
    'ramanagar': 'Ramanagara',
    'Ramanagar': 'Ramanagara',
    'ramangara': 'Ramanagara',
    'Ramangara': 'Ramanagara',
    'ramangar': 'Ramanagara',
    'Ramangar': 'Ramanagara',

    // Siddalagatta - All variations (MOST IMPORTANT)
    // Kannada variations
    'ಶಿಡ್ಲಘಟ್ಟ': 'Siddalagatta',
    'ಸಿದ್ದಲಾಘಟ್ಟ': 'Siddalagatta',
    // With "Shid" prefix
    'shidlaghatta': 'Siddalagatta',
    'Shidlaghatta': 'Siddalagatta',
    'SHIDLAGHATTA': 'Siddalagatta',
    'shiddalagatta': 'Siddalagatta',
    'Shiddalagatta': 'Siddalagatta',
    'SHIDDALAGATTA': 'Siddalagatta',
    'shiddlaghatta': 'Siddalagatta',
    'Shiddlaghatta': 'Siddalagatta',
    // With "Sid" prefix
    'sidlaghatta': 'Siddalagatta',
    'Sidlaghatta': 'Siddalagatta',
    'SIDLAGHATTA': 'Siddalagatta',
    'siddalagatta': 'Siddalagatta',
    'Siddalagatta': 'Siddalagatta',
    'SIDDALAGATTA': 'Siddalagatta',
    'siddlaghatta': 'Siddalagatta',
    'Siddlaghatta': 'Siddalagatta',
    // With variations in "ghatta" part
    'siddalghatta': 'Siddalagatta',
    'Siddalghatta': 'Siddalagatta',
    'shiddalghatta': 'Siddalagatta',
    'Shiddalghatta': 'Siddalagatta',
    // Common typos
    'sidalagatta': 'Siddalagatta',
    'Sidalagatta': 'Siddalagatta',
    'shidalagatta': 'Siddalagatta',
    'Shidalagatta': 'Siddalagatta',

    // Kolar - All variations
    'ಕೋಲಾರ': 'Kolar',
    'kolar': 'Kolar',
    'Kolar': 'Kolar',
    'KOLAR': 'Kolar',
    'kollar': 'Kolar',
    'Kollar': 'Kolar',
  };

  // Clean the input: remove extra spaces, prefixes, and normalize
  let cleaned = marketName.trim();

  // Remove common prefixes (including variations)
  cleaned = cleaned.replace(/^(GCM|GOVT|Government|Sarkar|ಸರ್ಕಾರಿ|Sarkari|Gov|Cocoon|Market|ಮಾರುಕಟ್ಟೆ|ರೇಷ್ಮೆ|Silk)\s+/gi, '');

  // Remove suffixes
  cleaned = cleaned.replace(/\s+(Market|ಮಾರುಕಟ್ಟೆ|Cocoon|ರೇಷ್ಮೆ|Silk)$/gi, '');

  // Try exact match first
  if (marketMap[cleaned]) {
    return marketMap[cleaned];
  }

  // Try case-insensitive matching
  const lowerCleaned = cleaned.toLowerCase();
  for (const [key, value] of Object.entries(marketMap)) {
    if (key.toLowerCase() === lowerCleaned) {
      return value;
    }
  }

  // Advanced fuzzy matching using similarity
  const bestMatch = findBestMarketMatch(lowerCleaned);
  if (bestMatch) {
    return bestMatch;
  }

  // If no match found, return original trimmed value
  return cleaned;
}

/**
 * Advanced fuzzy matching for market names
 * Uses Levenshtein distance to find closest match
 */
function findBestMarketMatch(input: string): string | null {
  const standardMarkets = ['kanakapura', 'kollegala', 'ramanagara', 'siddalagatta', 'kolar'];
  const standardNames = ['Kanakapura', 'Kollegala', 'Ramanagara', 'Siddalagatta', 'Kolar'];

  let bestMatch = null;
  let bestScore = Infinity;
  const threshold = 3; // Maximum allowed character differences

  for (let i = 0; i < standardMarkets.length; i++) {
    const distance = levenshteinDistance(input, standardMarkets[i]);

    // Also check if input contains or is contained in standard name
    const containsMatch = input.includes(standardMarkets[i].substring(0, 4)) ||
                          standardMarkets[i].includes(input.substring(0, 4));

    if (distance < bestScore || (containsMatch && distance <= threshold + 2)) {
      bestScore = distance;
      bestMatch = standardNames[i];
    }
  }

  // Return match only if it's close enough
  return bestScore <= threshold ? bestMatch : null;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
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
