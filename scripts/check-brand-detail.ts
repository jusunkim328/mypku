/**
 * 특정 브랜드 검색 결과 상세 확인
 */

const USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1";
const USDA_API_KEY = process.env.USDA_FDC_API_KEY!;

async function checkBrand(brand: string) {
  const response = await fetch(`${USDA_API_BASE}/foods/search?api_key=${USDA_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: brand,
      dataType: ["Branded"],
      pageSize: 10,
    }),
  });

  const data = await response.json();

  console.log(`🔍 "${brand}" 검색 결과: ${data.totalHits?.toLocaleString()}개\n`);
  console.log("샘플 10개:");

  (data.foods || []).forEach((food: any, i: number) => {
    console.log(`  ${i + 1}. ${food.description}`);
    console.log(`     브랜드: ${food.brandOwner || food.brandName || 'N/A'}`);
  });
}

const brand = process.argv[2] || "Red Bull";
checkBrand(brand).catch(console.error);
