# BLS (Bundeslebensmittelschlüssel) 데이터

독일 연방 식품 영양소 데이터베이스 (German Federal Food Key)

## 다운로드 방법

### 공식 다운로드 링크

1. **OpenAgrar (권장)**
   - 독일어: https://www.openagrar.de/servlets/MCRZipServlet/openagrar_derivate_00069361
   - 영어: https://www.openagrar.de/servlets/MCRZipServlet/openagrar_derivate_00069362
   - 문서: https://www.openagrar.de/receive/openagrar_mods_00112643

2. **공식 웹사이트**
   - https://blsdb.de

## 파일 구조

다운로드 후 압축 해제하면 2개 파일:

| 파일명 | 용량 | 설명 |
|--------|------|------|
| `BLS_4_0_Components_DE_EN.xlsx` | 21KB | 영양소 필드 설명 (독일어/영어) |
| `BLS_4_0_Daten_2025_DE.xlsx` | 14MB | **식품 데이터** (7,140개) |

## 데이터 규모

| 항목 | 내용 |
|------|------|
| 버전 | BLS 4.0 |
| 식품 수 | 7,140개 |
| 영양소 수 | 138개 (418 컬럼) |
| 라이선스 | 무료 (Max Rubner Institut) |

## 주요 컬럼 (Excel 인덱스)

| 인덱스 | 코드 | 설명 | 단위 |
|--------|------|------|------|
| 0 | - | BLS Code | - |
| 1 | - | 독일어 식품명 | - |
| 2 | - | **영어 식품명** | - |
| 6 | ENERCC | 에너지 | kcal/100g |
| 12 | PROT625 | 단백질 | g/100g |
| 15 | FAT | 지방 | g/100g |
| 18 | CHO | 탄수화물 | g/100g |
| 393 | PHE | **페닐알라닌** | g/100g |

## 동기화 방법

```bash
# 1. ZIP 다운로드 후 압축 해제
# 2. BLS_4_0_Daten_2025_DE.xlsx를 data/bls/ 폴더에 복사

# Dry-run (테스트)
bun run scripts/sync-bls-data.ts --dry-run

# 또는 다운로드 폴더에서 직접 실행
bun run scripts/sync-bls-data.ts \
  --file=/Users/merak/Downloads/openagrar_derivate_00069361/BLS_4_0_Daten_2025_DE.xlsx \
  --dry-run

# 실제 동기화
bun run scripts/sync-bls-data.ts \
  --file=/Users/merak/Downloads/openagrar_derivate_00069361/BLS_4_0_Daten_2025_DE.xlsx

# 제한 (처음 100개만)
bun run scripts/sync-bls-data.ts --limit=100
```

## 주의사항

- 이 폴더의 Excel/CSV 파일은 `.gitignore`에 추가되어 있습니다
- 상업적 사용 시 라이선스 확인 필요
- PHE 단위가 **g/100g** → 스크립트에서 **mg**로 자동 변환

## PKU 가치

BLS는 **페닐알라닌 실측 데이터**를 제공합니다:

| 소스 | Phe 데이터 | is_phe_estimated |
|------|-----------|------------------|
| 한국 | 대부분 없음 | true (추정) |
| USDA | 대부분 없음 | true (추정) |
| **BLS** | **100% 있음** | **false (실측)** |
