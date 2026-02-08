import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// Exponential Backoff 설정
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

/**
 * Exponential Backoff로 재시도
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isRetryable =
        lastError.message.includes("429") ||
        lastError.message.includes("Too Many Requests") ||
        lastError.message.includes("503") ||
        lastError.message.includes("Resource exhausted");

      if (!isRetryable || attempt === RETRY_CONFIG.maxRetries) {
        throw lastError;
      }

      const delay = Math.min(
        RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
        RETRY_CONFIG.maxDelayMs
      );

      console.log(
        `[DiagnosisOCR] ${operationName} failed (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}), ` +
          `retrying in ${Math.round(delay / 1000)}s...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * OCR 추출 결과 타입
 */
export interface DiagnosisOCRResult {
  phenylalanine_allowance_mg: number | null;
  blood_phe_target_min: number | null;
  blood_phe_target_max: number | null;
  blood_phe_unit: "umol/L" | "mg/dL" | null;
  exchange_unit_mg: number | null;
  evidence_snippets: string[];
  confidence: number;
}

// Structured Output 스키마
const diagnosisOcrSchema = {
  type: SchemaType.OBJECT,
  properties: {
    phenylalanine_allowance_mg: {
      type: SchemaType.NUMBER,
      description:
        "Daily phenylalanine allowance in mg. Extract from phrases like 'daily Phe intake', 'Phe tolerance', 'phenylalanine allowance'. Value 0 means not found.",
    },
    blood_phe_target_min: {
      type: SchemaType.NUMBER,
      description:
        "Minimum target blood Phe level. Extract from phrases like 'target range', 'blood Phe level'. Value 0 means not found.",
    },
    blood_phe_target_max: {
      type: SchemaType.NUMBER,
      description:
        "Maximum target blood Phe level. Extract from phrases like 'target range', 'blood Phe level'. Value 0 means not found.",
    },
    blood_phe_unit: {
      type: SchemaType.STRING,
      enum: ["umol/L", "mg/dL", "unknown"],
      description:
        "Unit of blood Phe levels. Common units: umol/L (µmol/L, micromol/L) or mg/dL.",
    },
    exchange_unit_mg: {
      type: SchemaType.NUMBER,
      description:
        "Phe amount per exchange unit in mg. Common values: 50mg (standard) or 15mg (detailed). Value 0 means not found.",
    },
    evidence_snippets: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description:
        "Exact text snippets from the document that support the extracted values. Quote the relevant portions.",
    },
    confidence: {
      type: SchemaType.NUMBER,
      description:
        "Overall confidence in the extraction (0.0 to 1.0). Consider document quality, clarity of values, and whether units are explicitly stated.",
    },
  },
  required: [
    "phenylalanine_allowance_mg",
    "blood_phe_target_min",
    "blood_phe_target_max",
    "blood_phe_unit",
    "exchange_unit_mg",
    "evidence_snippets",
    "confidence",
  ],
};

const DIAGNOSIS_OCR_PROMPT = `You are a medical document OCR specialist for PKU (Phenylketonuria) diagnosis and prescription documents.

## Task
Extract key PKU dietary management values from this medical document image.

## Values to Extract
1. **Daily Phenylalanine (Phe) Allowance** - in mg/day
   - Look for: "daily Phe intake", "Phe tolerance", "phenylalanine allowance", "permitted Phe", "Phe limit"
   - Typical range: 120-600 mg/day (infants: 200-300, children: 200-400, adults: 200-600)

2. **Blood Phe Target Range** - min and max values
   - Look for: "target blood Phe", "blood phenylalanine level", "therapeutic range", "target range"
   - Common ranges: 120-360 µmol/L or 2-6 mg/dL

3. **Blood Phe Unit** - the unit used for blood levels
   - µmol/L (also written as umol/L, micromol/L, μmol/L)
   - mg/dL

4. **Exchange Unit** - mg of Phe per exchange
   - Common values: 50mg (standard, most clinics) or 15mg (detailed, some European clinics)
   - Look for: "1 exchange = X mg", "exchange unit"

## Important Rules
- If a value is NOT found in the document, set it to 0
- If the unit is not clear, set blood_phe_unit to "unknown"
- Always provide evidence_snippets: quote the exact text from the document that contains the extracted values
- Be conservative with confidence: lower it if the document is blurry, partially visible, or values are ambiguous
- Do NOT guess values that are not visible in the document
- This may be in any language (English, Korean, Japanese, German, etc.) - extract values regardless of language`;

/**
 * Gemini Vision으로 진단서/처방전에서 PKU 관련 정보 추출
 */
export async function extractDiagnosisInfo(
  imageBase64: string
): Promise<DiagnosisOCRResult> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: diagnosisOcrSchema,
    },
  });

  // Base64에서 MIME 타입 추출
  const mimeMatch = imageBase64.match(/^data:(.+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const base64Data = imageBase64.replace(/^data:.+;base64,/, "");

  const result = await withRetry(
    () =>
      model.generateContent([
        DIAGNOSIS_OCR_PROMPT,
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
      ]),
    "extractDiagnosisInfo"
  );

  const text = result.response.text();
  const parsed = JSON.parse(text);

  // 0 값을 null로 변환 (Gemini 스키마에서 nullable을 지원하지 않으므로)
  return {
    phenylalanine_allowance_mg:
      parsed.phenylalanine_allowance_mg || null,
    blood_phe_target_min: parsed.blood_phe_target_min || null,
    blood_phe_target_max: parsed.blood_phe_target_max || null,
    blood_phe_unit:
      parsed.blood_phe_unit === "unknown" ? null : parsed.blood_phe_unit,
    exchange_unit_mg: parsed.exchange_unit_mg || null,
    evidence_snippets: parsed.evidence_snippets || [],
    confidence: parsed.confidence,
  };
}
