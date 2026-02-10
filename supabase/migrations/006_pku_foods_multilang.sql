-- name_de, name_ru 컬럼 추가
ALTER TABLE pku_foods ADD COLUMN IF NOT EXISTS name_de TEXT;
ALTER TABLE pku_foods ADD COLUMN IF NOT EXISTS name_ru TEXT;

-- BLS 데이터: name_ko → name_de 이동 (독일어 데이터가 잘못 저장됨)
UPDATE pku_foods
SET name_de = name_ko, name_ko = NULL
WHERE source = 'bls' AND name_ko IS NOT NULL;

-- 검색용 trigram 인덱스
CREATE INDEX IF NOT EXISTS idx_pku_foods_name_de_trgm
ON pku_foods USING gin(name_de gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pku_foods_name_ru_trgm
ON pku_foods USING gin(name_ru gin_trgm_ops);
