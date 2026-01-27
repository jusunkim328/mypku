/**
 * BLS (Bundeslebensmittelschlüssel) 독일 식품 데이터 동기화 스크립트
 *
 * BLS 4.0 데이터 (2024년 무료 공개)
 * - 식품 수: 7,140개
 * - 영양소 수: 138개 (418 컬럼 - 값/출처/참조)
 * - 페닐알라닌: 컬럼 393 (PHE) - g/100g → mg로 변환
 * - 출처: https://blsdb.de
 *
 * 실행:
 *   bun run scripts/sync-bls-data.ts --file=data/bls/BLS_4_0_Daten_2025_DE.xlsx
 *   bun run scripts/sync-bls-data.ts --file=data/bls/BLS_4_0_Daten_2025_DE.xlsx --dry-run
 *   bun run scripts/sync-bls-data.ts --file=data/bls/BLS_4_0_Daten_2025_DE.xlsx --limit=100
 */

import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// BLS 4.0 컬럼 인덱스 (고정값 - 파일 구조 분석 결과)
const BLS_COLUMNS = {
  BLS_CODE: 0,        // BLS Code
  NAME_DE: 1,         // Lebensmittelbezeichnung (독일어)
  NAME_EN: 2,         // Food name (영어)
  ENERCC: 6,          // 에너지 kcal/100g
  PROT625: 12,        // 단백질 g/100g
  FAT: 15,            // 지방 g/100g
  CHO: 18,            // 탄수화물 g/100g
  PHE: 393,           // 페닐알라닌 g/100g (주의: g 단위!)
};

// Exponential Backoff 설정
const BACKOFF_CONFIG = {
  initialDelay: 300,
  maxDelay: 30000,
  maxRetries: 5,
  multiplier: 2,
};

interface SyncOptions {
  file: string;
  dryRun: boolean;
  limit?: number;
}

interface BLSFood {
  blsCode: string;
  nameEn: string;
  nameDe: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  phenylalanine_mg: number;
}

function parseArgs(): SyncOptions {
  const args = process.argv.slice(2);
  const options: SyncOptions = {
    file: "data/bls/BLS_4_0_Daten_2025_DE.xlsx",
    dryRun: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--file=")) {
      options.file = arg.replace("--file=", "");
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg.startsWith("--limit=")) {
      options.limit = parseInt(arg.replace("--limit=", ""), 10);
    }
  }

  return options;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 숫자 파싱 (빈 값, 문자열 처리)
 */
function parseNumber(value: any): number {
  if (value === null || value === undefined || value === "" || value === "-") {
    return 0;
  }
  if (typeof value === "number") {
    return isNaN(value) ? 0 : value;
  }
  const num = parseFloat(String(value).replace(",", "."));
  return isNaN(num) ? 0 : num;
}

/**
 * Excel 파일 파싱
 */
function parseBLSExcel(filePath: string, limit?: number): BLSFood[] {
  const foods: BLSFood[] = [];
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`파일을 찾을 수 없습니다: ${absolutePath}`);
  }

  console.log("   Excel 파일 로딩 중...");
  const workbook = XLSX.readFile(absolutePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  console.log(`   시트: ${sheetName}`);
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  console.log(`   총 행 수: ${data.length}`);

  // 헤더 확인 (첫 행)
  const header = data[0];
  console.log(`   컬럼 수: ${header.length}`);

  // 컬럼 검증
  console.log("   컬럼 검증:");
  console.log(`     [${BLS_COLUMNS.BLS_CODE}] ${header[BLS_COLUMNS.BLS_CODE]}`);
  console.log(`     [${BLS_COLUMNS.NAME_EN}] ${header[BLS_COLUMNS.NAME_EN]}`);
  console.log(`     [${BLS_COLUMNS.ENERCC}] ${header[BLS_COLUMNS.ENERCC]}`);
  console.log(`     [${BLS_COLUMNS.PROT625}] ${header[BLS_COLUMNS.PROT625]}`);
  console.log(`     [${BLS_COLUMNS.PHE}] ${header[BLS_COLUMNS.PHE]}`);

  // 데이터 파싱 (2행부터)
  let skipped = 0;
  const maxRows = limit ? Math.min(limit + 1, data.length) : data.length;

  for (let i = 1; i < maxRows; i++) {
    const row = data[i];
    if (!row || row.length === 0) {
      skipped++;
      continue;
    }

    const blsCode = String(row[BLS_COLUMNS.BLS_CODE] || "").trim();
    const nameEn = String(row[BLS_COLUMNS.NAME_EN] || "").trim();
    const nameDe = String(row[BLS_COLUMNS.NAME_DE] || "").trim();

    // 유효성 검사
    if (!blsCode || (!nameEn && !nameDe)) {
      skipped++;
      continue;
    }

    const calories = parseNumber(row[BLS_COLUMNS.ENERCC]);
    const protein_g = parseNumber(row[BLS_COLUMNS.PROT625]);
    const fat_g = parseNumber(row[BLS_COLUMNS.FAT]);
    const carbs_g = parseNumber(row[BLS_COLUMNS.CHO]);
    // PHE는 g/100g 단위 → mg로 변환 (×1000)
    const phenylalanine_g = parseNumber(row[BLS_COLUMNS.PHE]);
    const phenylalanine_mg = Math.round(phenylalanine_g * 1000);

    foods.push({
      blsCode,
      nameEn: nameEn || nameDe, // 영어명이 없으면 독일어명 사용
      nameDe,
      calories,
      protein_g,
      fat_g,
      carbs_g,
      phenylalanine_mg,
    });
  }

  console.log(`   파싱 완료: ${foods.length}개 식품, ${skipped}개 스킵`);
  return foods;
}

/**
 * Exponential Backoff로 Supabase 호출
 */
async function upsertWithBackoff<T>(
  operation: () => Promise<{ data: T | null; error: Error | null }>,
  context: string
): Promise<{ data: T | null; error: Error | null }> {
  let delay = BACKOFF_CONFIG.initialDelay;

  for (let attempt = 1; attempt <= BACKOFF_CONFIG.maxRetries; attempt++) {
    const result = await operation();

    if (!result.error) {
      return result;
    }

    const isLastAttempt = attempt === BACKOFF_CONFIG.maxRetries;
    if (isLastAttempt) {
      console.error(`  ❌ [${context}] 최대 재시도 초과: ${result.error.message}`);
      return result;
    }

    const errorMsg = result.error.message || "";
    const isRateLimited =
      errorMsg.includes("429") ||
      errorMsg.includes("rate") ||
      errorMsg.includes("too many");

    if (isRateLimited) {
      delay = Math.min(delay * BACKOFF_CONFIG.multiplier * 2, BACKOFF_CONFIG.maxDelay);
    } else {
      delay = Math.min(delay * BACKOFF_CONFIG.multiplier, BACKOFF_CONFIG.maxDelay);
    }

    console.warn(`  ⚠️ [${context}] 재시도 ${attempt}/${BACKOFF_CONFIG.maxRetries} (${delay}ms 후)`);
    await sleep(delay);
  }

  throw new Error(`${context}: 예상치 못한 오류`);
}

/**
 * 배치 단위로 Supabase에 upsert
 */
async function batchUpsert(
  foods: BLSFood[],
  batchSize: number = 100,
  dryRun: boolean = false
): Promise<{ success: number; errors: number }> {
  let success = 0;
  let errors = 0;

  for (let i = 0; i < foods.length; i += batchSize) {
    const batch = foods.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(foods.length / batchSize);

    // DB 형식으로 변환
    const dbRecords = batch.map((food) => ({
      name: food.nameEn,           // 영어명을 기본으로
      name_de: food.nameDe,        // 독일어명
      name_ko: null,               // 한국어명 (향후 번역 시 추가)
      brand: null,
      barcode: null,
      serving_size: "100g",
      phenylalanine_mg: food.phenylalanine_mg,
      protein_g: food.protein_g,
      calories: Math.round(food.calories),
      carbs_g: food.carbs_g,
      fat_g: food.fat_g,
      category: null,
      is_low_protein: food.protein_g < 1,
      is_phe_estimated: false,     // BLS는 실측 데이터!
      source: "bls",
    }));

    if (dryRun) {
      console.log(`  [Dry Run] 배치 ${batchNum}/${totalBatches}: ${batch.length}개`);
      if (batchNum === 1) {
        console.log("  샘플:", JSON.stringify(dbRecords[0], null, 2));
      }
      success += batch.length;
      continue;
    }

    const result = await upsertWithBackoff(
      async () => {
        const res = await supabase
          .from("pku_foods")
          .upsert(dbRecords as any, { onConflict: "name,source" });
        return res;
      },
      `배치 ${batchNum}/${totalBatches}`
    );

    if (result.error) {
      console.error(`  ❌ 배치 ${batchNum} 오류: ${result.error.message}`);
      errors += batch.length;
    } else {
      success += batch.length;
      console.log(`  ✓ 배치 ${batchNum}/${totalBatches} 완료 (${batch.length}개)`);
    }

    // 배치 간 대기
    if (i + batchSize < foods.length) {
      await sleep(100);
    }
  }

  return { success, errors };
}

/**
 * 메인 함수
 */
async function main() {
  const options = parseArgs();

  console.log("🇩🇪 BLS (Bundeslebensmittelschlüssel) 4.0 동기화");
  console.log("=".repeat(50));
  console.log(`   파일: ${options.file}`);
  console.log(`   Dry Run: ${options.dryRun}`);
  if (options.limit) {
    console.log(`   Limit: ${options.limit}개`);
  }
  console.log("");

  // 파일 존재 확인
  const absolutePath = path.resolve(options.file);
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${absolutePath}`);
    console.log("");
    console.log("📥 BLS 데이터 다운로드 방법:");
    console.log("   1. https://www.openagrar.de/servlets/MCRZipServlet/openagrar_derivate_00069361");
    console.log("   2. 압축 해제");
    console.log("   3. BLS_4_0_Daten_2025_DE.xlsx를 data/bls/ 폴더에 복사");
    console.log("   4. 스크립트 다시 실행");
    process.exit(1);
  }

  // Excel 파싱
  console.log("📖 Excel 파일 파싱 중...");
  const foods = parseBLSExcel(options.file, options.limit);

  if (foods.length === 0) {
    console.error("❌ 파싱된 식품이 없습니다.");
    process.exit(1);
  }

  // 통계
  const withPhe = foods.filter((f) => f.phenylalanine_mg > 0).length;
  const lowProtein = foods.filter((f) => f.protein_g < 1).length;
  const avgPhe = foods.reduce((sum, f) => sum + f.phenylalanine_mg, 0) / foods.length;

  console.log("");
  console.log("📊 파싱 통계:");
  console.log(`   총 식품 수: ${foods.length}개`);
  console.log(`   Phe 데이터 있음: ${withPhe}개 (${((withPhe / foods.length) * 100).toFixed(1)}%)`);
  console.log(`   저단백 식품: ${lowProtein}개`);
  console.log(`   평균 Phe: ${avgPhe.toFixed(1)}mg/100g`);
  console.log("");

  // 샘플 출력
  console.log("📝 샘플 데이터 (처음 5개):");
  foods.slice(0, 5).forEach((food, i) => {
    console.log(`   ${i + 1}. ${food.nameEn}`);
    console.log(`      Phe: ${food.phenylalanine_mg}mg | Protein: ${food.protein_g}g | Cal: ${food.calories}kcal`);
  });

  // 고단백 식품 샘플
  console.log("\n📝 고 Phe 식품 TOP 5:");
  const sortedByPhe = [...foods].sort((a, b) => b.phenylalanine_mg - a.phenylalanine_mg);
  sortedByPhe.slice(0, 5).forEach((food, i) => {
    console.log(`   ${i + 1}. ${food.nameEn} - ${food.phenylalanine_mg}mg`);
  });
  console.log("");

  // Supabase에 저장
  console.log("💾 Supabase에 저장 중...");
  const { success, errors } = await batchUpsert(foods, 100, options.dryRun);

  console.log("");
  console.log("=".repeat(50));
  console.log("✅ BLS 동기화 완료!");
  console.log(`   저장 성공: ${success}개`);
  console.log(`   저장 실패: ${errors}개`);

  // DB 통계 조회 (dry run이 아닐 때만)
  if (!options.dryRun) {
    console.log("");
    console.log("📊 DB 현황:");

    const { count: blsCount } = await supabase
      .from("pku_foods")
      .select("*", { count: "exact", head: true })
      .eq("source", "bls");

    const { count: totalCount } = await supabase
      .from("pku_foods")
      .select("*", { count: "exact", head: true });

    const { count: measuredCount } = await supabase
      .from("pku_foods")
      .select("*", { count: "exact", head: true })
      .eq("is_phe_estimated", false);

    console.log(`   BLS 식품: ${blsCount}개`);
    console.log(`   전체 식품: ${totalCount}개`);
    console.log(`   실측 Phe: ${measuredCount}개`);
  }
}

// 실행
main().catch((error) => {
  console.error("❌ 오류 발생:", error);
  process.exit(1);
});
