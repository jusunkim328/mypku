# Claude Code 개발자 가이드 (v2.0 ~ v2.1)

개발자가 알아야 할 Claude Code 핵심 기능 총정리

---

## 1. 키보드 단축키

### 필수 단축키

| 단축키 | 기능 |
|--------|------|
| `Ctrl+C` | 작업 취소 |
| `Ctrl+L` | 화면 클리어 (히스토리 유지) |
| `Ctrl+R` | 명령어 히스토리 검색 |
| `Shift+Tab` | 권한 모드 전환 (Normal → Auto-Accept → Plan) |
| `Esc` + `Esc` | 코드/대화 되감기 (Rewind) |
| `Ctrl+B` | 백그라운드 작업 전환 |
| `Option+T` / `Alt+T` | Extended Thinking 토글 |
| `Option+P` / `Alt+P` | 모델 전환 |
| `Ctrl+O` | Verbose 모드 (도구 사용 로그) |

### 멀티라인 입력

| 방법 | 단축키 |
|------|--------|
| 모든 터미널 | `\` + Enter |
| macOS | Option + Enter |
| iTerm2, WezTerm, Ghostty, Kitty | Shift + Enter |

### Vim 모드 (`/vim`)

- `Esc`: NORMAL 모드
- `i/a/o`: INSERT 모드
- `h/j/k/l`: 이동
- `dd/dw/yy`: 삭제/복사

---

## 2. 슬래시 명령어

### 자주 사용하는 명령어

```bash
/plan          # Plan 모드 진입 (읽기 전용 분석)
/rewind        # 코드 변경사항 되감기
/compact       # 대화 압축 (컨텍스트 절약)
/context       # 컨텍스트 사용량 확인
/cost          # 토큰 비용 확인
/usage         # 플랜 한도 확인
/stats         # 사용 통계 및 스트릭
```

### 설정 관련

```bash
/config        # 설정 UI
/permissions   # 권한 규칙 관리
/hooks         # Hook 설정
/mcp           # MCP 서버 관리
/memory        # CLAUDE.md 편집
/init          # 프로젝트 초기화 (CLAUDE.md 생성)
```

### 세션 관리

```bash
/resume        # 이전 세션 재개
/rename <name> # 세션 이름 변경
/clear         # 히스토리 삭제
/export        # 대화 내보내기
/teleport      # claude.ai로 세션 이동
```

### 개발 도구

```bash
/review           # 코드 리뷰 요청
/security-review  # 보안 검토
/pr-comments      # GitHub PR 코멘트 보기
/doctor           # 설치 상태 확인
/vim              # Vim 모드
```

---

## 3. 권한 모드 (5가지)

| 모드 | 설명 | 전환 |
|------|------|------|
| **default** | 매번 권한 요청 | 기본값 |
| **plan** | 읽기 전용, 수정 불가 | Shift+Tab x2 |
| **acceptEdits** | 파일 수정 자동 승인 | Shift+Tab |
| **dontAsk** | allow 규칙 외 모두 거부 | 설정에서 |
| **bypassPermissions** | 모든 권한 자동 승인 | 위험, 신뢰 환경만 |

### 권한 규칙 설정

```json
// .claude/settings.json
{
  "permissions": {
    "allow": [
      "Bash(npm run:*)",
      "Bash(git *)",
      "Read(src/**)",
      "Edit(src/**/*.ts)"
    ],
    "deny": [
      "Bash(rm *)",
      "Read(.env)",
      "Read(secrets/**)"
    ],
    "defaultMode": "default"
  }
}
```

---

## 4. Hooks 시스템

### Hook 이벤트

| 이벤트 | 발생 시점 | 용도 |
|--------|----------|------|
| `PreToolUse` | 도구 실행 전 | 검증, 차단 |
| `PostToolUse` | 도구 실행 후 | 포맷팅, 로깅 |
| `SessionStart` | 세션 시작 | 환경 설정 |
| `SessionEnd` | 세션 종료 | 정리 작업 |
| `Stop` | 응답 완료 | 후처리 |
| `Notification` | 알림 시 | 커스텀 알림 |

### 자주 사용하는 Hook 예제

**TypeScript 자동 포맷팅:**
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{
        "type": "command",
        "command": "npx prettier --write \"$FILE_PATH\""
      }]
    }]
  }
}
```

**위험한 명령어 차단:**
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "command": "jq -r '.tool_input.command' | grep -E '(DROP|DELETE|rm -rf)' && exit 2 || exit 0"
      }]
    }]
  }
}
```

---

## 5. Skills 시스템

### Skill 생성

```bash
mkdir -p ~/.claude/skills/my-skill
```

**~/.claude/skills/my-skill/SKILL.md:**
```yaml
---
name: my-skill
description: 내 커스텀 스킬. "xxx 해줘" 요청 시 활용
allowed-tools: Read, Grep, Glob
user-invocable: true
---

# 스킬 지침

여기에 Claude에게 줄 지시사항 작성
```

### Skill 사용

```bash
/my-skill  # 직접 호출
# 또는 설명에 맞는 요청 시 자동 활성화
```

---

## 6. Custom Agents

### Agent 생성

**~/.claude/agents/code-reviewer.md:**
```yaml
---
name: code-reviewer
description: 코드 리뷰 전문가. 보안, 성능, 스타일 검토
tools: Read, Grep, Glob
disallowedTools: Write, Edit
model: sonnet
---

당신은 선임 코드 리뷰어입니다.

검토 시:
1. 보안 취약점 확인
2. 성능 이슈 분석
3. 코드 스타일 검토
```

### 내장 Agent

| Agent | 용도 |
|-------|------|
| `Explore` | 코드베이스 탐색 (읽기 전용) |
| `Plan` | 계획 수립 |
| `general-purpose` | 범용 작업 |

---

## 7. MCP 서버 연동

### 서버 추가

```bash
# HTTP 서버
claude mcp add --transport http github https://api.githubcopilot.com/mcp/

# Stdio 서버
claude mcp add --transport stdio db -- npx -y @bytebase/dbhub

# 환경변수 포함
claude mcp add --transport stdio api --env API_KEY=xxx -- node server.js
```

### 서버 관리

```bash
claude mcp list      # 목록 보기
claude mcp remove x  # 제거
/mcp                 # UI에서 관리
```

### 프로젝트 공유 (.mcp.json)

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "db": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@bytebase/dbhub"],
      "env": {
        "DB_URL": "${DB_CONNECTION_STRING}"
      }
    }
  }
}
```

---

## 8. Plan Mode 활용

### 진입 방법

```bash
# CLI
claude --permission-mode plan

# 세션 중
Shift+Tab (2번)

# 명령어
/plan
```

### 사용 사례

1. **복잡한 리팩터링 전 분석**
2. **아키텍처 결정 전 탐색**
3. **새 기능 계획 수립**
4. **코드베이스 학습**

### 워크플로우

```
Plan Mode → 분석/계획 → 승인 → acceptEdits 모드 전환 → 구현
```

---

## 9. 설정 파일 구조

### 우선순위 (높음 → 낮음)

1. Managed Settings (시스템)
2. CLI 플래그
3. `.claude/settings.local.json` (개인, git 무시)
4. `.claude/settings.json` (팀 공유)
5. `~/.claude/settings.json` (전역)

### 주요 설정

```json
{
  "permissions": {
    "allow": ["Bash(npm:*)"],
    "deny": ["Read(.env)"],
    "defaultMode": "default"
  },
  "env": {
    "NODE_ENV": "development"
  },
  "model": "claude-sonnet-4-5-20250929",
  "language": "한국어",
  "alwaysThinkingEnabled": true,
  "hooks": { ... }
}
```

### CLAUDE.md (프로젝트 메모리)

```markdown
# 프로젝트 컨텍스트

## 기술 스택
- TypeScript, React, Node.js

## 컨벤션
- Conventional Commits 사용
- ESLint + Prettier

## 지침
- 한국어로 대화
- Exponential Backoff 사용
```

---

## 10. 실전 팁

### 컨텍스트 관리

```bash
/context   # 사용량 확인
/compact   # 수동 압축

# 자동 압축 임계값 (기본 95%)
export CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50
```

### 세션 재개

```bash
claude --continue        # 최근 세션
claude --resume <name>   # 특정 세션
```

### 디버깅

```bash
claude --debug   # 상세 로그
Ctrl+O           # Verbose 모드 토글
```

### Extended Thinking

```bash
Option+T / Alt+T  # 토글
export MAX_THINKING_TOKENS=10000  # 제한
```

---

## 11. 버전별 주요 변경사항

### v2.1.x (2026년 1월~)

- **Skills 시스템**: 핫 리로드, 포크 컨텍스트
- **Hooks in Skills/Agents**: frontmatter에서 직접 정의
- **다국어 지원**: 응답 언어 설정 가능
- **와일드카드 권한**: `Bash(*-h*)` 패턴
- **/teleport**: claude.ai로 세션 이동
- **MCP auto:N**: 도구 자동 활성화 임계값
- **메모리 최적화**: 대규모 대화에서 3배 개선

### v2.0.x (2024년 12월~)

- **VS Code 네이티브 확장**: 완전 재설계
- **Code Intelligence**: LSP 지원
- **Plan Mode**: `/plan` 명령어
- **Rewind**: `/rewind`로 되감기
- **/usage**: 플랜 한도 확인
- **터미널 확장**: Kitty, Alacritty, Zed, Warp

### v1.0.x (2024년 12월~)

- **Hooks 시스템**: 이벤트 기반 자동화
- **Custom Agents**: 작업별 에이전트
- **Claude Agent SDK**: 커스텀 에이전트 개발
- **Windows 지원**: 네이티브 설치

---

## 12. 자주 쓰는 워크플로우

### 새 기능 개발

```bash
claude --permission-mode plan
> 기능 X 구현 계획 세워줘
# 계획 확정 후
Shift+Tab  # acceptEdits로 전환
> 구현해줘
```

### 버그 수정

```bash
claude
> 이 에러 분석해줘: [에러 메시지]
> 원인 찾고 수정해줘
> 테스트 실행해줘
```

### 코드 리뷰

```bash
claude
> 최근 변경사항 리뷰해줘
> 보안 취약점 있는지 확인해줘
```

### PR 생성

```bash
claude
> 이 작업 PR 만들어줘
```

---

**문서 작성일**: 2026년 1월 17일
**Claude Code 버전**: 2.1.x
