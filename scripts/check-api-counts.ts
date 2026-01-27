/**
 * 외부 API의 총 데이터 수 확인
 */

const KOREA_API_BASE = "https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02";
const USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1";

async function checkKoreaTotal() {
  const apiKey = process.env.FOOD_SAFETY_KOREA_API_KEY;
  if (!apiKey) {
    console.log("한국 식약처: API 키 없음");
    return;
  }

  const params = new URLSearchParams({
    serviceKey: apiKey,
    type: "json",
    pageNo: "1",
    numOfRows: "1",
  });

  const response = await fetch(`${KOREA_API_BASE}?${params.toString()}`);
  const data = await response.json();

  console.log("🇰🇷 한국 식약처 총 데이터:", data.body?.totalCount?.toLocaleString(), "개");
}

async function checkUSDATotal() {
  const apiKey = process.env.USDA_FDC_API_KEY;
  if (!apiKey) {
    console.log("USDA: API 키 없음");
    return;
  }

  // Foundation Foods
  const foundationRes = await fetch(`${USDA_API_BASE}/foods/search?api_key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "",
      dataType: ["Foundation"],
      pageSize: 1,
    }),
  });
  const foundationData = await foundationRes.json();

  // SR Legacy
  const legacyRes = await fetch(`${USDA_API_BASE}/foods/search?api_key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "",
      dataType: ["SR Legacy"],
      pageSize: 1,
    }),
  });
  const legacyData = await legacyRes.json();

  // Branded (참고용)
  const brandedRes = await fetch(`${USDA_API_BASE}/foods/search?api_key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "",
      dataType: ["Branded"],
      pageSize: 1,
    }),
  });
  const brandedData = await brandedRes.json();

  console.log("🇺🇸 USDA 총 데이터:");
  console.log("   - Foundation Foods:", foundationData.totalHits?.toLocaleString(), "개");
  console.log("   - SR Legacy:", legacyData.totalHits?.toLocaleString(), "개");
  console.log("   - Branded (참고):", brandedData.totalHits?.toLocaleString(), "개");
  console.log("   - 합계 (Foundation + SR Legacy):", (foundationData.totalHits + legacyData.totalHits)?.toLocaleString(), "개");
}

async function main() {
  console.log("📊 외부 API 총 데이터 수 확인\n");

  await checkKoreaTotal();
  console.log();
  await checkUSDATotal();
}

main().catch(console.error);
