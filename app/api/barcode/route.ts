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

    if (!response.ok) {
      throw new Error(`Open Food Facts API error: ${response.status}`);
    }

    const data: OpenFoodFactsResponse = await response.json();

    if (data.status !== 1 || !data.product) {
      return NextResponse.json(
        {
          found: false,
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

    // 3. Open Food Facts 결과를 PKU DB에 영구 저장 (다음 조회 시 API 호출 없이 DB에서 반환)
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      await supabase.from("pku_foods").upsert(
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
        } as any,
        { onConflict: "name,source" }
      );
      console.log(`✓ Saved barcode ${barcode} to PKU DB for future lookups`);
    } catch (saveError) {
      console.log("DB save failed:", saveError);
    }

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
