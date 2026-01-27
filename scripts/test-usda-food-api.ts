/**
 * USDA FoodData Central API 테스트 스크립트
 *
 * 실행: bun run scripts/test-usda-food-api.ts
 */

import { fetchUSDAFoods } from "../lib/foodDataApis";

async function testUSDAFoodAPI() {
  console.log("🇺🇸 USDA FoodData Central API 테스트 시작...\n");

  try {
    // 테스트 1: Foundation Foods 검색
    console.log("📋 테스트 1: Foundation Foods (limit=10)");
    const result1 = await fetchUSDAFoods({ dataType: "Foundation", limit: 10 });
    console.log(`  - 총 식품 수: ${result1.totalCount}`);
    console.log(`  - 가져온 식품: ${result1.foods.length}개`);

    if (result1.foods.length > 0) {
      console.log("\n  첫 번째 식품 샘플:");
      const sample = result1.foods[0];
      console.log(`    - 이름: ${sample.name}`);
      console.log(`    - 페닐알라닌: ${sample.phenylalanine_mg}mg`);
      console.log(`    - 단백질: ${sample.protein_g}g`);
      console.log(`    - 칼로리: ${sample.calories}kcal`);
      console.log(`    - 카테고리: ${sample.category}`);
    }

    // 테스트 2: 특정 식품 검색 (apple)
    console.log("\n📋 테스트 2: 'apple' 검색");
    const result2 = await fetchUSDAFoods({ query: "apple", limit: 5 });
    console.log(`  - 검색 결과: ${result2.totalCount}건`);

    if (result2.foods.length > 0) {
      console.log("  검색된 식품:");
      result2.foods.forEach((food, i) => {
        console.log(`    ${i + 1}. ${food.name} - Phe: ${food.phenylalanine_mg}mg, Protein: ${food.protein_g}g`);
      });
    }

    // 테스트 3: 특정 식품 검색 (chicken)
    console.log("\n📋 테스트 3: 'chicken' 검색");
    const result3 = await fetchUSDAFoods({ query: "chicken", limit: 5 });
    console.log(`  - 검색 결과: ${result3.totalCount}건`);

    if (result3.foods.length > 0) {
      console.log("  검색된 식품:");
      result3.foods.forEach((food, i) => {
        console.log(`    ${i + 1}. ${food.name} - Phe: ${food.phenylalanine_mg}mg, Protein: ${food.protein_g}g`);
      });
    }

    // 테스트 4: SR Legacy 데이터
    console.log("\n📋 테스트 4: SR Legacy Foods (limit=10)");
    const result4 = await fetchUSDAFoods({ dataType: "SR Legacy", limit: 10 });
    console.log(`  - 총 식품 수: ${result4.totalCount}`);
    console.log(`  - 가져온 식품: ${result4.foods.length}개`);

    // 테스트 5: Phe 데이터 유무 확인
    console.log("\n📋 테스트 5: Phe 데이터 유무 확인 (Foundation 50개 샘플)");
    const result5 = await fetchUSDAFoods({ dataType: "Foundation", limit: 50 });
    const withPhe = result5.foods.filter(f => f.phenylalanine_mg > 0);
    const withoutPhe = result5.foods.filter(f => f.phenylalanine_mg === 0);
    console.log(`  - Phe 데이터 있음: ${withPhe.length}개`);
    console.log(`  - Phe 데이터 없음: ${withoutPhe.length}개`);
    console.log(`  - Phe 데이터 비율: ${Math.round(withPhe.length / result5.foods.length * 100)}%`);

    console.log("\n✅ 모든 테스트 완료!");

  } catch (error) {
    console.error("\n❌ API 테스트 실패:", error);
    process.exit(1);
  }
}

// 실행
testUSDAFoodAPI();
