/**
 * brandOwner 필드로 정확한 브랜드 검색
 */

const USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1";
const USDA_API_KEY = process.env.USDA_FDC_API_KEY!;

async function checkBrandExact(brandOwner: string) {
  // brandOwner 필터 사용
  const response = await fetch(`${USDA_API_BASE}/foods/search?api_key=${USDA_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "",
      dataType: ["Branded"],
      pageSize: 10,
      brandOwner: brandOwner, // 정확한 브랜드 필터
    }),
  });

  const data = await response.json();

  console.log(`🔍 brandOwner="${brandOwner}" 검색 결과: ${data.totalHits?.toLocaleString()}개\n`);

  if (data.foods?.length > 0) {
    console.log("샘플:");
    (data.foods || []).slice(0, 5).forEach((food: any, i: number) => {
      console.log(`  ${i + 1}. ${food.description}`);
      console.log(`     브랜드: ${food.brandOwner || 'N/A'}`);
    });
  }
}

// 테스트할 브랜드들
const brands = [
  "Red Bull North America, Inc.",
  "The Coca-Cola Company",
  "PepsiCo, Inc.",
  "Kellogg Company",
  "General Mills, Inc.",
  "Kraft Heinz Company",
  "Nestle USA, Inc.",
  "McDonald's Corporation",
  "Starbucks Coffee Company",
];

async function main() {
  console.log("🏭 정확한 브랜드(brandOwner) 검색 테스트\n");

  for (const brand of brands) {
    await checkBrandExact(brand);
    console.log("");
    await new Promise((r) => setTimeout(r, 1000));
  }
}

main().catch(console.error);
