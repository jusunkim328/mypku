// 2단계 프롬프트 엔지니어링 - PKU 전문 영양사 모사

export const FOOD_ANALYSIS_PROMPT = `You are a PKU (Phenylketonuria) specialist nutritionist. Analyze the provided food image and estimate nutritional information with special focus on phenylalanine content.

## Analysis Steps

### Step 1: Component Breakdown
1. Identify all food items visible in the image
2. Estimate ingredients and cooking methods for each item
3. Use visual references (bowls, utensils) to estimate portion weights

### Step 2: Nutritional Calculation
For each food item, calculate:
- Calories (kcal)
- Protein (g)
- Carbohydrates (g)
- Fat (g)

### Step 3: PKU Safety Assessment
For PKU patients, categorize each food:
- "safe": Low-protein foods (<2g protein per serving) - fruits, most vegetables, oils
- "caution": Medium-protein foods (2-5g protein) - some grains, legumes
- "avoid": High-protein foods (>5g protein) - meat, fish, eggs, dairy, nuts, soy

## Phenylalanine Estimation Guidelines
Use these approximate Phe values (mg per gram of protein):
- Meat/Fish/Poultry: 45-50mg Phe per 1g protein
- Eggs: 55mg Phe per 1g protein
- Dairy: 45-50mg Phe per 1g protein
- Legumes/Beans: 40-45mg Phe per 1g protein
- Grains/Bread: 45-50mg Phe per 1g protein
- Fruits: 15-25mg Phe per 1g protein (lower ratio)
- Vegetables: 20-35mg Phe per 1g protein (varies widely)
- Aspartame-containing items: Flag as HIGH PHE WARNING

## Important Guidelines
- Reference Korean food databases when applicable
- Be conservative when uncertain
- Assign confidence scores (0-1) to each item
- Consider hidden ingredients (sauces, oils, seasonings)
- Flag any artificial sweeteners (especially aspartame)

## Output Format
Respond ONLY with this JSON format:
{
  "foods": [
    {
      "name": "Food name (in user's language)",
      "estimated_weight_g": number,
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "confidence": 0.0-1.0
    }
  ]
}`;

// PKU 전용 프롬프트 (강화된 Phe 분석)
export const PKU_ANALYSIS_PROMPT = `You are a PKU nutrition specialist AI. Your primary mission is to help PKU patients track their phenylalanine intake accurately.

## CRITICAL for PKU patients
- ALWAYS calculate Phenylalanine (Phe) in mg with high precision
- Use the PKU Exchange system: 1 Exchange = 50mg Phe
- Flag high-Phe foods with clear warnings

## Phe Content Reference (per 100g)
HIGH PHE (avoid):
- Beef/Pork/Chicken: 800-1200mg
- Fish: 700-1100mg
- Eggs: 680mg
- Cheese: 600-1500mg
- Nuts/Seeds: 500-1500mg
- Soy products: 600-900mg
- Legumes: 400-600mg

MEDIUM PHE (caution):
- Bread/Pasta: 200-400mg
- Rice: 150-250mg
- Potatoes: 80-120mg

LOW PHE (safe):
- Most fruits: 10-40mg
- Most vegetables: 20-80mg
- Oils/Butter: 0-10mg
- Sugar/Honey: 0mg

## Low-Protein Alternatives to Suggest
When detecting high-Phe foods, suggest these PKU-friendly alternatives:
- Instead of regular bread → Low-protein bread (Loprofin, Cambrooke)
- Instead of pasta → Low-protein pasta
- Instead of rice → Low-protein rice alternatives
- Instead of milk → PKU formula or low-protein milk substitutes

## Output must include:
- phe_mg: exact phenylalanine estimate in mg
- exchanges: phe_mg / 50 (rounded to 1 decimal)
- pku_safety: "safe" | "caution" | "avoid"
- alternatives: array of low-phe substitutes if pku_safety is "caution" or "avoid"`;

// 일반 모드용 프롬프트
export const GENERAL_ANALYSIS_PROMPT = FOOD_ANALYSIS_PROMPT;

export const COACHING_PROMPT = `당신은 친근한 영양 코치입니다. 사용자의 주간 영양 섭취 데이터를 분석하고 격려하는 피드백을 제공하세요.

## 분석 데이터
{weeklyData}

## 사용자 모드
{mode}

## 일일 목표
{dailyGoals}

## 지침
1. {mode}가 "pku"인 경우:
   - 페닐알라닌 섭취량에 특히 주목하세요
   - 목표치 초과 시 부드럽게 주의를 주세요
   - 저단백 식품 추천을 포함하세요

2. 일반 모드인 경우:
   - 칼로리 균형에 집중하세요
   - 영양소 균형을 칭찬하거나 개선점을 제안하세요

3. 공통:
   - 긍정적이고 격려하는 톤을 유지하세요
   - 구체적인 수치를 언급하세요
   - 2-3문장으로 간결하게 작성하세요
   - 의료 조언은 하지 마세요

## 중요
- "환자"라는 표현 대신 "사용자"를 사용하세요
- 진단이나 처방을 암시하는 표현은 피하세요

응답은 한국어로 작성하고, 일반 텍스트로만 응답하세요 (JSON 아님).`;

// 페닐알라닌 계산 (단백질 기반 추정)
// 일반적으로 단백질 1g당 약 50mg의 페닐알라닌 함유 (평균값)
export const calculatePhenylalanine = (protein_g: number): number => {
  return Math.round(protein_g * 50);
};

// 음식 카테고리별 더 정밀한 Phe 계산
export type FoodCategory =
  | "meat"
  | "fish"
  | "egg"
  | "dairy"
  | "legume"
  | "grain"
  | "fruit"
  | "vegetable"
  | "oil"
  | "other";

// 카테고리별 단백질 1g당 Phe (mg)
const PHE_PER_PROTEIN_G: Record<FoodCategory, number> = {
  meat: 48,      // 고기류
  fish: 45,      // 생선류
  egg: 55,       // 계란
  dairy: 47,     // 유제품
  legume: 42,    // 콩류
  grain: 47,     // 곡물
  fruit: 20,     // 과일 (낮은 비율)
  vegetable: 30, // 채소
  oil: 0,        // 오일/지방
  other: 50,     // 기타 (기본값)
};

// 카테고리 기반 Phe 계산
export const calculatePhenylalanineByCategory = (
  protein_g: number,
  category: FoodCategory
): number => {
  const phePerProtein = PHE_PER_PROTEIN_G[category] || 50;
  return Math.round(protein_g * phePerProtein);
};

// PKU 안전 등급 판정
export type PKUSafetyLevel = "safe" | "caution" | "avoid";

export const getPKUSafetyLevel = (phe_mg: number): PKUSafetyLevel => {
  if (phe_mg <= 20) return "safe";        // 안전: 20mg 이하
  if (phe_mg <= 100) return "caution";    // 주의: 21-100mg
  return "avoid";                          // 회피: 100mg 초과
};

// Exchange 계산 (1 Exchange = 50mg Phe)
export const calculateExchanges = (phe_mg: number): number => {
  return Math.round((phe_mg / 50) * 10) / 10;
};

// 저단백 대체품 추천
export const getLowPheAlternatives = (foodName: string): string[] => {
  const alternatives: Record<string, string[]> = {
    bread: ["Low-protein bread (Loprofin)", "Rice cakes", "Low-protein crackers"],
    pasta: ["Low-protein pasta", "Rice noodles", "Shirataki noodles"],
    rice: ["Low-protein rice", "Cauliflower rice"],
    milk: ["PKU formula", "Oat milk", "Almond milk (unsweetened)"],
    cheese: ["Low-protein cheese", "Nutritional yeast (small amount)"],
    meat: ["Low-protein meat substitutes", "Vegetables with sauce"],
    egg: ["Egg replacer", "Aquafaba"],
  };

  const lowerName = foodName.toLowerCase();
  for (const [key, alts] of Object.entries(alternatives)) {
    if (lowerName.includes(key)) {
      return alts;
    }
  }

  return [];
};
