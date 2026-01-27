/**
 * USDA Branded에서 어떤 브랜드들이 있는지 확인
 */

const USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1";
const USDA_API_KEY = process.env.USDA_FDC_API_KEY!;

// 유명 브랜드 목록
const POPULAR_BRANDS = [
  // 패스트푸드
  "McDonald's", "Burger King", "Wendy's", "Subway", "Taco Bell",
  "KFC", "Pizza Hut", "Domino's", "Chick-fil-A", "Starbucks",
  // 음료
  "Coca-Cola", "Pepsi", "Gatorade", "Red Bull", "Monster",
  // 시리얼/스낵
  "Kellogg's", "General Mills", "Quaker", "Cheerios", "Frito-Lay",
  "Lay's", "Doritos", "Cheetos", "Oreo", "Nabisco",
  // 유제품
  "Dannon", "Yoplait", "Chobani", "Kraft", "Philadelphia",
  // 기타 식품
  "Heinz", "Campbell's", "Nestle", "Hershey's", "Mars",
  "Tyson", "Oscar Mayer", "Hormel", "Del Monte", "Dole",
];

async function searchBrand(brand: string) {
  const response = await fetch(`${USDA_API_BASE}/foods/search?api_key=${USDA_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: brand,
      dataType: ["Branded"],
      pageSize: 1,
    }),
  });

  const data = await response.json();
  return {
    brand,
    count: data.totalHits || 0,
  };
}

async function main() {
  console.log("🔍 USDA Branded 유명 브랜드 검색\n");

  const results: { brand: string; count: number }[] = [];

  for (const brand of POPULAR_BRANDS) {
    const result = await searchBrand(brand);
    results.push(result);

    if (result.count > 0) {
      console.log(`  ✓ ${brand}: ${result.count.toLocaleString()}개`);
    } else {
      console.log(`  - ${brand}: 없음`);
    }

    // API 제한 대응
    await new Promise((r) => setTimeout(r, 500));
  }

  // 결과 정렬
  const sorted = results.filter(r => r.count > 0).sort((a, b) => b.count - a.count);

  console.log("\n📊 브랜드별 제품 수 (상위 20개):");
  sorted.slice(0, 20).forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.brand}: ${r.count.toLocaleString()}개`);
  });

  const totalPopular = sorted.reduce((sum, r) => sum + r.count, 0);
  console.log(`\n📈 유명 브랜드 총합: ${totalPopular.toLocaleString()}개`);
}

main().catch(console.error);
