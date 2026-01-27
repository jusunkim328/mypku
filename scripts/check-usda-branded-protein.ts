/**
 * USDA Branded 데이터에 단백질 정보가 있는지 확인
 */

const USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1";
const USDA_API_KEY = process.env.USDA_FDC_API_KEY!;

const PROTEIN_ID = 1003;

async function checkBrandedProtein() {
  console.log("🔍 USDA Branded 데이터 단백질 정보 확인\n");

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

  let withProtein = 0;
  const examples: { name: string; protein: number; estimatedPhe: number }[] = [];

  for (const food of foods) {
    const proteinNutrient = food.foodNutrients?.find(
      (n: any) => n.nutrientId === PROTEIN_ID
    );

    if (proteinNutrient && proteinNutrient.value > 0) {
      withProtein++;
      if (examples.length < 10) {
        examples.push({
          name: food.description.substring(0, 50),
          protein: proteinNutrient.value,
          estimatedPhe: Math.round(proteinNutrient.value * 50), // 추정 페닐알라닌
        });
      }
    }
  }

  console.log(`📊 결과:`);
  console.log(`   단백질 정보 있음: ${withProtein}/${foods.length}개 (${Math.round(withProtein/foods.length*100)}%)`);

  console.log(`\n📋 예시 (단백질 → 추정 페닐알라닌):`);
  console.log(`   ${"식품명".padEnd(50)} | 단백질(g) | 추정Phe(mg)`);
  console.log(`   ${"-".repeat(50)} | --------- | ----------`);
  examples.forEach((e) => {
    console.log(`   ${e.name.padEnd(50)} | ${e.protein.toFixed(1).padStart(9)} | ${String(e.estimatedPhe).padStart(10)}`);
  });

  console.log(`\n💡 추정 공식: 페닐알라닌(mg) ≈ 단백질(g) × 50`);
  console.log(`   (단백질의 약 4-5%가 페닐알라닌)`);
}

checkBrandedProtein().catch(console.error);
