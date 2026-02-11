import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabase 서버 클라이언트 (API 라우트용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Open Food Facts API 응답 타입
interface OpenFoodFactsProduct {
  product_name?: string;
  product_name_en?: string;
  product_name_ko?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: {
    energy_kcal_100g?: number;
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    // PKU 관련 (대부분 없지만 시도)
    phenylalanine_100g?: number;
  };
  image_url?: string;
  categories_tags?: string[];
  // 국가 정보
  countries?: string;
  countries_tags?: string[];
  origins?: string;
  manufacturing_places?: string;
}

// 바코드 접두사 → 국가 매핑 (GS1 표준)
const BARCODE_PREFIX_COUNTRY: Record<string, { code: string; name: string }> = {
  "00": { code: "us", name: "United States" },
  "01": { code: "us", name: "United States" },
  "02": { code: "us", name: "United States" },
  "03": { code: "us", name: "United States" },
  "04": { code: "us", name: "United States" },
  "05": { code: "us", name: "United States" },
  "06": { code: "us", name: "United States" },
  "07": { code: "us", name: "United States" },
  "08": { code: "us", name: "United States" },
  "09": { code: "us", name: "United States" },
  "10": { code: "us", name: "United States" },
  "11": { code: "us", name: "United States" },
  "12": { code: "us", name: "United States" },
  "13": { code: "us", name: "United States" },
  "30": { code: "fr", name: "France" },
  "31": { code: "fr", name: "France" },
  "32": { code: "fr", name: "France" },
  "33": { code: "fr", name: "France" },
  "34": { code: "fr", name: "France" },
  "35": { code: "fr", name: "France" },
  "36": { code: "fr", name: "France" },
  "37": { code: "fr", name: "France" },
  "40": { code: "de", name: "Germany" },
  "41": { code: "de", name: "Germany" },
  "42": { code: "de", name: "Germany" },
  "43": { code: "de", name: "Germany" },
  "44": { code: "de", name: "Germany" },
  "45": { code: "jp", name: "Japan" },
  "46": { code: "ru", name: "Russia" },
  "460": { code: "ru", name: "Russia" },
  "461": { code: "ru", name: "Russia" },
  "462": { code: "ru", name: "Russia" },
  "463": { code: "ru", name: "Russia" },
  "464": { code: "ru", name: "Russia" },
  "465": { code: "ru", name: "Russia" },
  "466": { code: "ru", name: "Russia" },
  "467": { code: "ru", name: "Russia" },
  "468": { code: "ru", name: "Russia" },
  "469": { code: "ru", name: "Russia" },
  "47": { code: "tw", name: "Taiwan" },
  "49": { code: "jp", name: "Japan" },
  "50": { code: "gb", name: "United Kingdom" },
  "54": { code: "be", name: "Belgium" },
  "57": { code: "dk", name: "Denmark" },
  "64": { code: "fi", name: "Finland" },
  "70": { code: "no", name: "Norway" },
  "73": { code: "se", name: "Sweden" },
  "76": { code: "ch", name: "Switzerland" },
  "80": { code: "it", name: "Italy" },
  "81": { code: "it", name: "Italy" },
  "82": { code: "it", name: "Italy" },
  "83": { code: "it", name: "Italy" },
  "84": { code: "es", name: "Spain" },
  "87": { code: "nl", name: "Netherlands" },
  "880": { code: "kr", name: "South Korea" },
  "885": { code: "th", name: "Thailand" },
  "888": { code: "sg", name: "Singapore" },
  "890": { code: "in", name: "India" },
  "893": { code: "vn", name: "Vietnam" },
  "899": { code: "id", name: "Indonesia" },
  "90": { code: "at", name: "Austria" },
  "91": { code: "at", name: "Austria" },
  "93": { code: "au", name: "Australia" },
  "94": { code: "nz", name: "New Zealand" },
  "955": { code: "my", name: "Malaysia" },
  "958": { code: "mo", name: "Macau" },
  "690": { code: "cn", name: "China" },
  "691": { code: "cn", name: "China" },
  "692": { code: "cn", name: "China" },
  "693": { code: "cn", name: "China" },
  "694": { code: "cn", name: "China" },
  "695": { code: "cn", name: "China" },
  "696": { code: "cn", name: "China" },
  "697": { code: "cn", name: "China" },
  "698": { code: "cn", name: "China" },
  "699": { code: "cn", name: "China" },
};

// 바코드에서 원산지 국가 추출
function getOriginCountryFromBarcode(barcode: string): { code: string; name: string } | null {
  // 3자리 접두사 먼저 확인 (더 구체적)
  const prefix3 = barcode.substring(0, 3);
  if (BARCODE_PREFIX_COUNTRY[prefix3]) {
    return BARCODE_PREFIX_COUNTRY[prefix3];
  }

  // 2자리 접두사 확인
  const prefix2 = barcode.substring(0, 2);
  if (BARCODE_PREFIX_COUNTRY[prefix2]) {
    return BARCODE_PREFIX_COUNTRY[prefix2];
  }

  return null;
}

// Open Food Facts countries_tags에서 국가 코드 추출
function extractCountryFromTags(countriesTags?: string[]): { code: string; name: string } | null {
  if (!countriesTags || countriesTags.length === 0) return null;

  // "en:germany" → { code: "de", name: "Germany" }
  const countryMap: Record<string, { code: string; name: string }> = {
    "en:germany": { code: "de", name: "Germany" },
    "en:france": { code: "fr", name: "France" },
    "en:united-states": { code: "us", name: "United States" },
    "en:united-kingdom": { code: "gb", name: "United Kingdom" },
    "en:russia": { code: "ru", name: "Russia" },
    "en:japan": { code: "jp", name: "Japan" },
    "en:south-korea": { code: "kr", name: "South Korea" },
    "en:china": { code: "cn", name: "China" },
    "en:italy": { code: "it", name: "Italy" },
    "en:spain": { code: "es", name: "Spain" },
    "en:australia": { code: "au", name: "Australia" },
    "en:canada": { code: "ca", name: "Canada" },
    "en:netherlands": { code: "nl", name: "Netherlands" },
    "en:belgium": { code: "be", name: "Belgium" },
    "en:switzerland": { code: "ch", name: "Switzerland" },
    "en:sweden": { code: "se", name: "Sweden" },
    "en:norway": { code: "no", name: "Norway" },
    "en:denmark": { code: "dk", name: "Denmark" },
    "en:finland": { code: "fi", name: "Finland" },
    "en:poland": { code: "pl", name: "Poland" },
    "en:austria": { code: "at", name: "Austria" },
    "en:thailand": { code: "th", name: "Thailand" },
    "en:vietnam": { code: "vn", name: "Vietnam" },
    "en:indonesia": { code: "id", name: "Indonesia" },
    "en:malaysia": { code: "my", name: "Malaysia" },
    "en:singapore": { code: "sg", name: "Singapore" },
    "en:india": { code: "in", name: "India" },
    "en:taiwan": { code: "tw", name: "Taiwan" },
  };

  for (const tag of countriesTags) {
    if (countryMap[tag]) {
      return countryMap[tag];
    }
  }

  return null;
}

interface OpenFoodFactsResponse {
  status: number;
  status_verbose: string;
  product?: OpenFoodFactsProduct;
}

// 페닐알라닌 추정 (단백질 기반)
// 대부분의 단백질은 약 5% 페닐알라닌 함유
const estimatePhenylalanine = (protein_g: number): number => {
  // 1g 단백질 ≈ 50mg Phe (평균적)
  return Math.round(protein_g * 50);
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const barcode = searchParams.get("barcode");

  if (!barcode) {
    return NextResponse.json(
      { error: "Barcode parameter is required" },
      { status: 400 }
    );
  }

  // 바코드 형식 검증 (8-14자리 숫자)
  if (!/^\d{8,14}$/.test(barcode)) {
    return NextResponse.json(
      { error: "Invalid barcode format" },
      { status: 400 }
    );
  }

  // 1. PKU 식품 DB 우선 조회
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: pkuFood } = await supabase
      .from("pku_foods")
      .select("*")
      .eq("barcode", barcode)
      .single();

    if (pkuFood) {
      console.log(`✓ PKU DB hit: ${barcode}`);
      return NextResponse.json({
        found: true,
        barcode,
        source: "pku_foods",
        product: {
          name: pkuFood.name_ko || pkuFood.name,
          brand: pkuFood.brand || null,
          serving_size: pkuFood.serving_size || "100g",
          image_url: null,
          categories: pkuFood.category ? [pkuFood.category] : [],
          // 국가 정보 (ISO 코드)
          barcode_country: pkuFood.barcode_country || null,
          contributed_from: pkuFood.contributed_from || null,
          nutrition_per_100g: {
            calories: pkuFood.calories || 0,
            protein_g: pkuFood.protein_g || 0,
            carbs_g: pkuFood.carbs_g || 0,
            fat_g: pkuFood.fat_g || 0,
            phenylalanine_mg: pkuFood.phenylalanine_mg || 0,
            phenylalanine_estimated: false, // DB 데이터는 실측치
          },
        },
      });
    }
  } catch (dbError) {
    console.log("PKU DB lookup skipped:", dbError);
  }

  // 2. Open Food Facts API 폴백
  // 타임아웃 설정 (30초)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    // Open Food Facts API 호출
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      {
        headers: {
          "User-Agent": "MyPKU/1.0 (contact@mypku.app)",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    // 404는 "제품 없음"으로 처리 (에러가 아님)
    if (response.status === 404) {
      return NextResponse.json(
        {
          found: false,
          barcode,
          message: "Product not found in Open Food Facts database"
        },
        { status: 404 }
      );
    }

    if (!response.ok) {
      throw new Error(`Open Food Facts API error: ${response.status}`);
    }

    const data: OpenFoodFactsResponse = await response.json();

    if (data.status !== 1 || !data.product) {
      return NextResponse.json(
        {
          found: false,
          barcode,
          message: "Product not found in database"
        },
        { status: 404 }
      );
    }

    const product = data.product;
    const nutriments = product.nutriments || {};

    // 영양 정보 추출 (100g 기준)
    const calories = nutriments.energy_kcal_100g || nutriments["energy-kcal_100g"] || 0;
    const protein_g = nutriments.proteins_100g || 0;
    const carbs_g = nutriments.carbohydrates_100g || 0;
    const fat_g = nutriments.fat_100g || 0;

    // 페닐알라닌 (실제 데이터가 있으면 사용, 없으면 추정)
    const phenylalanine_mg = nutriments.phenylalanine_100g
      ? Math.round(nutriments.phenylalanine_100g * 1000) // g to mg
      : estimatePhenylalanine(protein_g);

    // 제품명 (다국어 우선순위)
    const productName =
      product.product_name_ko ||
      product.product_name_en ||
      product.product_name ||
      "Unknown Product";

    // 국가 정보 추출 (ISO 코드로 저장)
    const barcodeCountry = getOriginCountryFromBarcode(barcode);
    const contributedFrom = extractCountryFromTags(product.countries_tags);

    // 3. Open Food Facts 결과를 PKU DB에 백그라운드 저장 (응답 블로킹 없이 fire-and-forget)
    const supabaseForSave = createClient(supabaseUrl, supabaseAnonKey);
    supabaseForSave.from("pku_foods").upsert(
      {
        name: productName,
        name_ko: product.product_name_ko || null,
        brand: product.brands || null,
        barcode: barcode,
        serving_size: product.serving_size || "100g",
        phenylalanine_mg,
        protein_g: Math.round(protein_g * 10) / 10,
        calories: Math.round(calories),
        carbs_g: Math.round(carbs_g * 10) / 10,
        fat_g: Math.round(fat_g * 10) / 10,
        category: product.categories_tags?.[0] || null,
        is_low_protein: protein_g < 1,
        source: "openfoodfacts",
        // 국가 정보 (ISO 코드)
        barcode_country: barcodeCountry?.code || null,
        contributed_from: contributedFrom?.code || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      { onConflict: "name,source" }
    ).then(() => {
      console.log(`✓ Saved barcode ${barcode} to PKU DB (barcode_country: ${barcodeCountry?.code || "unknown"})`);
    }, (saveError: unknown) => {
      console.log("DB save failed:", saveError);
    });

    return NextResponse.json({
      found: true,
      barcode,
      source: "openfoodfacts",
      product: {
        name: productName,
        brand: product.brands || null,
        serving_size: product.serving_size || "100g",
        image_url: product.image_url || null,
        categories: product.categories_tags || [],
        // 국가 정보 (ISO 코드)
        barcode_country: barcodeCountry?.code || null,
        contributed_from: contributedFrom?.code || null,
        nutrition_per_100g: {
          calories: Math.round(calories),
          protein_g: Math.round(protein_g * 10) / 10,
          carbs_g: Math.round(carbs_g * 10) / 10,
          fat_g: Math.round(fat_g * 10) / 10,
          phenylalanine_mg,
          phenylalanine_estimated: !nutriments.phenylalanine_100g,
        },
      },
    });
  } catch (error) {
    clearTimeout(timeoutId);

    // 타임아웃 에러 처리
    if (error instanceof Error && error.name === 'AbortError') {
      console.error("Barcode lookup timeout");
      return NextResponse.json(
        { error: "Request timeout. Please try again." },
        { status: 504 }
      );
    }

    console.error("Barcode lookup error:", error);
    return NextResponse.json(
      { error: "Failed to lookup barcode" },
      { status: 500 }
    );
  }
}
