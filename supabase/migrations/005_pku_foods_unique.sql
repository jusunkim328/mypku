-- PKU 식품 데이터베이스 개선
-- UNIQUE 인덱스 추가 및 pg_trgm 확장 활성화

-- pg_trgm 확장 활성화 (한글/영문 유사 검색용)
-- 이미 존재하면 무시됨
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- upsert용 UNIQUE 인덱스 추가 (name + source 조합)
-- 동일 소스에서 같은 이름의 식품은 중복 불가
CREATE UNIQUE INDEX IF NOT EXISTS idx_pku_foods_name_source
  ON pku_foods(name, source)
  WHERE source IS NOT NULL;

-- 바코드 UNIQUE 인덱스 (바코드가 있는 경우만)
-- 이미 기존 인덱스가 있다면 드롭 후 재생성
DROP INDEX IF EXISTS idx_pku_foods_barcode_unique;
CREATE UNIQUE INDEX idx_pku_foods_barcode_unique
  ON pku_foods(barcode)
  WHERE barcode IS NOT NULL AND barcode != '';

-- 검색 성능 향상을 위한 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_pku_foods_search
  ON pku_foods(source, category, phenylalanine_mg);

-- 저단백 식품 빠른 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_pku_foods_low_protein
  ON pku_foods(is_low_protein, phenylalanine_mg)
  WHERE is_low_protein = true;

-- 최근 업데이트된 식품 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_pku_foods_updated
  ON pku_foods(updated_at DESC);
