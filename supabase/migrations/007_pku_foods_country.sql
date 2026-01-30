-- pku_foods 테이블에 국가 정보 추가
-- 장기 목표: PKU 환자를 위한 글로벌 식품 데이터베이스

-- 국가 필드 추가 (ISO 3166-1 alpha-2 코드)
ALTER TABLE pku_foods ADD COLUMN IF NOT EXISTS barcode_country VARCHAR(2);
ALTER TABLE pku_foods ADD COLUMN IF NOT EXISTS contributed_from VARCHAR(2);

-- 인덱스 추가 (국가별 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_pku_foods_barcode_country ON pku_foods(barcode_country);
CREATE INDEX IF NOT EXISTS idx_pku_foods_contributed_from ON pku_foods(contributed_from);

-- 코멘트 추가
COMMENT ON COLUMN pku_foods.barcode_country IS '바코드 등록 국가 ISO 코드 (GS1 접두사 기준)';
COMMENT ON COLUMN pku_foods.contributed_from IS 'Open Food Facts 기여자 국가 ISO 코드';
