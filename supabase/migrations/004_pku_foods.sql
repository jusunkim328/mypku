-- PKU 식품 데이터베이스 테이블
CREATE TABLE IF NOT EXISTS pku_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ko TEXT,
  brand TEXT,
  barcode TEXT,
  serving_size TEXT DEFAULT '100g',

  -- 영양 정보 (100g 기준)
  phenylalanine_mg INTEGER NOT NULL,
  protein_g DECIMAL(10, 2) NOT NULL,
  calories INTEGER,
  carbs_g DECIMAL(10, 2),
  fat_g DECIMAL(10, 2),

  -- 메타데이터
  category TEXT, -- 'fruit', 'vegetable', 'grain', 'meat', 'dairy', 'legume', 'processed'
  is_low_protein BOOLEAN DEFAULT false,
  source TEXT, -- 'howmuchphe', 'openfoodfacts', 'manual'

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_pku_foods_name ON pku_foods(name);
CREATE INDEX IF NOT EXISTS idx_pku_foods_barcode ON pku_foods(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pku_foods_category ON pku_foods(category);
CREATE INDEX IF NOT EXISTS idx_pku_foods_phe ON pku_foods(phenylalanine_mg);

-- 전문 검색 인덱스 (이름 검색용)
CREATE INDEX IF NOT EXISTS idx_pku_foods_name_trgm ON pku_foods USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pku_foods_name_ko_trgm ON pku_foods USING gin(name_ko gin_trgm_ops);

-- RLS (Row Level Security) 정책
ALTER TABLE pku_foods ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있음
CREATE POLICY "Anyone can read pku_foods"
  ON pku_foods
  FOR SELECT
  USING (true);

-- 인증된 사용자만 추가/수정 가능
CREATE POLICY "Authenticated users can insert pku_foods"
  ON pku_foods
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update pku_foods"
  ON pku_foods
  FOR UPDATE
  TO authenticated
  USING (true);

-- 업데이트 타임스탬프 트리거
CREATE OR REPLACE FUNCTION update_pku_foods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pku_foods_updated_at
  BEFORE UPDATE ON pku_foods
  FOR EACH ROW
  EXECUTE FUNCTION update_pku_foods_updated_at();

-- 샘플 데이터 (저단백 전문 식품)
INSERT INTO pku_foods (name, name_ko, brand, phenylalanine_mg, protein_g, calories, carbs_g, fat_g, category, is_low_protein, source) VALUES
  ('Low Protein Bread', '저단백 빵', 'Loprofin', 10, 0.2, 265, 55.0, 3.5, 'grain', true, 'manual'),
  ('Low Protein Pasta', '저단백 파스타', 'Loprofin', 12, 0.3, 355, 85.0, 0.5, 'grain', true, 'manual'),
  ('Low Protein Rice', '저단백 쌀', 'Nutricia', 15, 0.4, 360, 88.0, 0.8, 'grain', true, 'manual'),
  ('PKU Anamix Junior', 'PKU 아나믹스 주니어', 'Nutricia', 0, 0.0, 450, 50.0, 20.0, 'processed', true, 'manual'),
  ('Apple', '사과', null, 4, 0.3, 52, 14.0, 0.2, 'fruit', false, 'manual'),
  ('Banana', '바나나', null, 11, 1.1, 89, 23.0, 0.3, 'fruit', false, 'manual'),
  ('Orange', '오렌지', null, 11, 0.9, 47, 12.0, 0.1, 'fruit', false, 'manual'),
  ('Carrot', '당근', null, 18, 0.9, 41, 10.0, 0.2, 'vegetable', false, 'manual'),
  ('Cucumber', '오이', null, 17, 0.7, 15, 3.6, 0.1, 'vegetable', false, 'manual'),
  ('Tomato', '토마토', null, 13, 0.9, 18, 3.9, 0.2, 'vegetable', false, 'manual'),
  ('Lettuce', '상추', null, 24, 1.4, 15, 2.9, 0.2, 'vegetable', false, 'manual'),
  ('White Rice', '백미', null, 180, 2.7, 130, 28.0, 0.3, 'grain', false, 'manual'),
  ('Potato', '감자', null, 38, 2.0, 77, 17.0, 0.1, 'vegetable', false, 'manual');
