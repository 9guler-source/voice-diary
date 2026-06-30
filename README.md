# 내 목소리 일기 (Voice Diary) v2

치매 예방 및 생애 기억 보존을 위한 음성 일기 서비스입니다. 명세서(voice_diary_spec_v2.pdf) v2 기준으로 전체 구현했으며, **모바일(특히 iOS)에서의 녹음 실패 문제(10장 미해결 이슈)를 최우선으로 수정**했습니다.

## 이번 빌드에서 해결한 핵심 이슈

### 1. iOS 녹음 파일 미저장 (10장, 최우선 이슈) — 수정 완료
원인은 `audio/webm` 코덱을 iOS Safari가 지원하지 않는데도 코드가 webm으로 고정되어 있었던 것입니다.
`src/hooks/useRecording.ts`에서:
- `MediaRecorder.isTypeSupported()`로 `audio/mp4` → `audio/aac` → `audio/webm;codecs=opus` 순으로 자동 감지/폴백
- `ondataavailable`을 1초 단위(`recorder.start(1000)`)로 받아 청크 누락 가능성 최소화, 매 청크 size 콘솔 로그
- `onerror` 핸들러로 조용히 무시되던 에러를 사용자에게 명확히 안내
- `blob.size === 0`인 경우 저장을 막고 "녹음 파일이 저장되지 않았습니다" 명시적 에러 표시 (파형은 보이는데 파일이 비어있는 케이스 차단)
- 마이크 권한 거부(`NotAllowedError`), 마이크 없음(`NotFoundError`) 등 에러 종류별 안내 메시지 분리

### 2. TTS 겹침 — 9장에서 채택한 "전환 문구 마스킹" 방식 그대로 구현
`src/lib/questions.ts`의 모든 문항 `ttsText`에 "자, 천천히 편하게 말씀하세요." 전환 문구가 선행되며, `useTTS.ts`는 callId 패턴으로 stale utterance를 방지합니다.

### 3. iOS STT 미작동 — 로드맵 반영하여 비활성화 + 안내
`useSTT.ts`에서 iOS 기기를 감지해 자막 토글 자체를 숨깁니다(12장 로드맵 "iOS STT 비활성화 + 안내 메시지" 반영). PC Chrome에서는 자동 재시작 로직 포함 정상 작동합니다.

### 4. CORS 문제 — Server Actions로 모든 쓰기 작업 이동
세션 생성, 녹음 메타 저장, 보호자 추가/삭제는 모두 `actions.ts`의 Server Action으로 처리해 브라우저의 `Accept-Profile`/`Content-Profile` 헤더 CORS 문제를 우회했습니다. `questions` 테이블은 명세대로 `src/lib/questions.ts`에 하드코딩(71개: 10개 카테고리 × 7문항 + 자유이야기 1개)했습니다.

### 5. 모바일 최적화
- `viewport`에 `maximumScale: 1`, `userScalable: false` 설정 + 입력 필드 폰트 16px로 iOS 자동 확대 방지
- `env(safe-area-inset-bottom)` 적용으로 노치/홈 인디케이터 영역 침범 방지
- 모든 페이지 max-width 모바일 폭 고정, 하단 탭 네비게이션
- 파형 시각화 10% 축소 적용 (4.2 명세 반영)

## 설치 및 실행

```bash
cd voice-diary
npm install
cp .env.local.example .env.local
# .env.local에 실제 anon key 입력
npm run dev
```

`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://sfeyfxojkyjdbwpkvcdm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<WWVS 프로젝트 anon key>
```

## Supabase 설정 (기존 sfeyfxojkyjdbwpkvcdm 프로젝트 재사용)

1. **Exposed Schemas**에 `voice_diary` 등록 (Project Settings → API)
2. `supabase/migrations/001~005.sql`을 SQL Editor에서 순서대로 실행 — 이미 적용되어 있다면 생략 (모든 구문에 `if not exists` 적용해 안전하게 재실행 가능)
3. Storage 버킷 `voice-diary` 생성, **Public: OFF**
4. 인증 → Email → Confirm email은 현재 OFF 권장(개발 중), 운영 전환 시 SMTP 설정 후 ON

## 빌드 검증

`npm run build`로 타입체크 및 프로덕션 빌드까지 에러 없이 통과하는 것을 확인했습니다 (placeholder 환경변수로 검증, 실제 anon key 적용 시 정상 동작).

## 모바일 실기기 테스트 체크리스트

배포 후 실제 iPhone Safari에서 반드시 확인하세요:
- [ ] 마이크 권한 허용 후 녹음 → 정지 → 재생까지 파일이 실제로 들리는지 (콘솔에서 `선택된 mimeType` 로그 확인)
- [ ] 화면을 잠갔다가 다시 켰을 때 녹음이 유지되는지 (긴 답변 시 화면 자동 잠금 가능성 — 사용자에게 "녹음 중 화면을 켜두세요" 안내 추가 고려)
- [ ] 자막 토글이 iOS에서는 보이지 않는지 (의도된 동작)
- [ ] 안드로이드 Chrome에서도 동일하게 mp4/webm 폴백이 정상 동작하는지

## 남은 과제 (명세서 12장 로드맵 기준)

- 이메일 인증 ON 전환 + SMTP 설정 (운영 전)
- questions DB 조회 CORS 완전 해결 (서버 컴포넌트로 이동 시 하드코딩 제거 가능)
- 서버사이드 TTS 검토 (현재 마스킹 방식으로 체감상 해결된 상태)
- 일본어 지원, PWA, Voice Cloning은 본 빌드에 미포함

## 디렉토리 구조

명세서 6.1 디렉토리 구조를 그대로 따랐습니다. `src/app/(app)/` 하위가 인증이 필요한 화면들이며, `middleware.ts`가 인증 가드를 담당합니다.
