# Supabase Keep-Alive Guide

## 문제 상황
Supabase Free Tier는 7일 이상 활동이 없으면 프로젝트가 자동으로 일시정지(pause)됩니다.

## 해결 방법

### ✅ 자동화 (추천) - Vercel Cron

`vercel.json` 파일이 이미 설정되어 있습니다:
```json
{
  "crons": [
    {
      "path": "/api/keep-alive",
      "schedule": "0 0 * * *"  // 매일 자정(UTC) 실행
    }
  ]
}
```

**배포 후 자동 활성화:**
1. Vercel에 배포하면 자동으로 cron job이 등록됩니다
2. 매일 자정(UTC)에 `/api/keep-alive` endpoint가 호출됩니다
3. Supabase 프로젝트에 활동이 생성되어 일시정지를 방지합니다

**확인 방법:**
- Vercel Dashboard → Your Project → Cron Jobs 탭에서 확인
- Vercel 배포 후 약 1시간 이내에 cron이 등록됩니다

### 📍 수동 실행

#### Option 1: 배포된 앱에서 호출
```bash
curl https://your-app.vercel.app/api/keep-alive
```

#### Option 2: 로컬에서 호출
```bash
bun dev
# 다른 터미널에서:
curl http://localhost:3000/api/keep-alive
```

#### Option 3: 브라우저에서 직접 접속
```
https://your-app.vercel.app/api/keep-alive
```

### 📊 응답 예시
```json
{
  "success": true,
  "timestamp": "2026-01-25T12:00:00.000Z",
  "activities": {
    "database": true,
    "auth": true,
    "storage": true
  },
  "message": "✅ Supabase project activity generated successfully"
}
```

## 기타 옵션

### GitHub Actions (대안)

`.github/workflows/keep-alive.yml`:
```yaml
name: Supabase Keep-Alive

on:
  schedule:
    - cron: '0 0 * * *'  # 매일 자정 UTC
  workflow_dispatch:  # 수동 실행 가능

jobs:
  keep-alive:
    runs-on: ubuntu-latest
    steps:
      - name: Call Keep-Alive Endpoint
        run: |
          curl -f https://your-app.vercel.app/api/keep-alive || exit 1
```

### UptimeRobot (무료 모니터링 서비스)

1. [UptimeRobot](https://uptimerobot.com/) 가입
2. 새 모니터 추가:
   - Monitor Type: HTTP(s)
   - URL: `https://your-app.vercel.app/api/keep-alive`
   - Monitoring Interval: 5 minutes (무료)
3. 자동으로 주기적 호출됨

## 비용 고려사항

### Vercel Cron (추천)
- **Free Tier**: 매일 1회 실행 (충분함)
- **Pro Tier**: 무제한

### UptimeRobot
- **Free Tier**: 최대 50개 모니터, 5분 간격
- Supabase 활성 상태 유지에 충분

## 트러블슈팅

### Cron이 실행되지 않을 때
1. Vercel Dashboard → Cron Jobs에서 상태 확인
2. Vercel Logs에서 에러 확인
3. `vercel.json` 문법 오류 확인

### API 호출이 실패할 때
```bash
# 로그 확인
curl -v https://your-app.vercel.app/api/keep-alive
```

## 주의사항

1. **Vercel Cron은 배포 후 약 1시간 이내에 등록됩니다**
2. **Free Tier는 매일 1회만 실행됩니다** (일시정지 방지에 충분)
3. **환경 변수 필요**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 즉시 실행 (긴급)

만약 **지금 당장** 프로젝트를 활성화해야 한다면:

1. Vercel 배포가 되어있다면:
   ```bash
   curl https://your-app.vercel.app/api/keep-alive
   ```

2. Supabase Dashboard에서 직접:
   - [Supabase Dashboard](https://supabase.com/dashboard/project/uviydudvwhhhgvsussyx)
   - SQL Editor → 아무 쿼리나 실행 (예: `SELECT 1;`)

3. 또는 앱에 로그인만 해도 활동이 생성됩니다
