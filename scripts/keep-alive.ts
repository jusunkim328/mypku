/**
 * Supabase Keep-Alive Script
 *
 * Supabase 프로젝트가 비활성화되지 않도록 간단한 쿼리를 실행합니다.
 *
 * Usage:
 *   bun run scripts/keep-alive.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  console.error('NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 확인해주세요.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function keepAlive() {
  console.log('🏓 Supabase Keep-Alive 시작...');
  console.log(`📡 연결 대상: ${supabaseUrl}`);

  try {
    // 간단한 health check 쿼리 실행
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ 쿼리 실행 실패:', error.message);
      process.exit(1);
    }

    console.log('✅ Supabase 활동 생성 성공!');
    console.log(`⏰ 실행 시간: ${new Date().toISOString()}`);

    // Auth health check
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (!authError) {
      console.log('✅ Auth 상태 확인 완료');
    }

    console.log('🎉 Keep-Alive 완료! 프로젝트가 활성 상태로 유지됩니다.');

  } catch (error) {
    console.error('❌ 예상치 못한 오류:', error);
    process.exit(1);
  }
}

keepAlive();
