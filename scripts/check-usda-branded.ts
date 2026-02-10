/**
 * USDA Branded 데이터에 페닐알라닌 정보가 있는지 확인
 */

const USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1";
const USDA_API_KEY = process.env.USDA_FDC_API_KEY!;

const PHENYLALANINE_ID = 1217;

async function checkBrandedPhenylalanine() {
  console.log("🔍 USDA Branded 데이터 페닐알라닌 확인\n");

  // Branded 샘플 100개 가져오기
  const response = await fetch(`${USDA_API_BASE}/foods/search?api_key=${USDA_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "",
      dataType: ["Branded"],
      pageSize: 100,
      pageNumber: 1,
    }),
  });

  const data = await response.json();
  const foods = data.foods || [];

  console.log(`샘플 수: ${foods.length}개\n`);

  let withPhe = 0;
  let withoutPhe = 0;
  const examples: string[] = [];

  for (const food of foods) {
    const pheNutrient = food.foodNutrients?.find(
      (n: any) => n.nutrientId === PHENYLALANINE_ID
    );

    if (pheNutrient && pheNutrient.value > 0) {
      withPhe++;
      if (examples.length < 5) {
        examples.push(`  ✓ ${food.description}: ${pheNutrient.value}mg`);
      }
    } else {
      withoutPhe++;
    }
  }

  console.log(`📊 결과:`);
  console.log(`   페닐알라닌 있음: ${withPhe}개 (${Math.round(withPhe/foods.length*100)}%)`);
  console.log(`   페닐알라닌 없음: ${withoutPhe}개 (${Math.round(withoutPhe/foods.length*100)}%)`);

  if (examples.length > 0) {
    console.log(`\n📋 페닐알라닌 있는 예시:`);
    examples.forEach((e) => console.log(e));
  }

  // Foundation/SR Legacy와 비교
  console.log("\n--- 비교: Foundation 데이터 ---");

  const foundationRes = await fetch(`${USDA_API_BASE}/foods/search?api_key=${USDA_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "",
      dataType: ["Foundation"],
      pageSize: 50,
      pageNumber: 1,
    }),
  });

  const foundationData = await foundationRes.json();
  const foundationFoods = foundationData.foods || [];

  let foundationWithPhe = 0;
  for (const food of foundationFoods) {
    const pheNutrient = food.foodNutrients?.find(
      (n: any) => n.nutrientId === PHENYLALANINE_ID
    );
    if (pheNutrient && pheNutrient.value > 0) {
      foundationWithPhe++;
    }
  }

  console.log(`   Foundation 페닐알라닌 있음: ${foundationWithPhe}/${foundationFoods.length}개 (${Math.round(foundationWithPhe/foundationFoods.length*100)}%)`);
}

checkBrandedPhenylalanine().catch(console.error);
