## 테니스 동호회 행사 앱 개발/운영 계획서 (업데이트)

최종 업데이트: 2026-03-15

### 1. 프로젝트 개요
- 프로젝트 목적: 테니스 행사 진행(대진표, 점수, 마니또 투표)을 웹으로 실시간 공유
- 대상 사용자: 행사 참가자 12명 중심, 최대 동시 접속 35명 가정
- 운영 방식: 로컬 PC 서버 기반 운영, 필요 시 공인 IP/포트포워딩으로 외부 접속

### 2. 현재 구현 상태 (현행 코드 기준)
- 완료: 허용 이름 목록 기반 로그인/세션 유지
- 완료: 이름 입력 시 공백 자동 제거 및 허용되지 않은 이름 차단
- 완료: 이미지형 시간표 기반 경기 대진표(R1~R6, 1코트/2코트)
- 완료: 경기 점수 입력 및 저장
- 완료: 점수 입력값 0~10 정수 제한
- 완료: 팀 명단 + 팀 점수 합산 표시
- 완료: 마니또 투표(자기 자신 제외, 1인 1표 upsert)
- 완료: 마니또 선택안함(투표 취소) 지원
- 완료: 마니또 득표 집계 표시
- 완료: 마니또 집계 5초 주기 자동 새로고침
- 완료: 임창용 로그인 시에만 투표 초기화 버튼 노출 및 전체 투표 초기화 가능
- 완료: 로그인 화면 커버 이미지 중심의 포토그래피 스타일 UI
- 완료: 로그인/초기화 실패 메시지 토스트 표시
- 완료: 모바일 세로/가로 반응형 간격 조정
- 완료: 요청/감사 로그 파일 저장 및 7일 보관

### 3. 실제 기능 명세 (수정 반영)

#### 3.1 로그인
- 이름 입력만으로 로그인 (`POST /api/login`)
- `ALLOWED_LOGIN_NAMES`에 등록된 이름만 로그인 허용
- 이름 입력 시 공백은 자동 제거 후 비교
- 세션 기반 사용자 유지 (`GET /api/me`)
- 재입장(이름 변경) 버튼으로 로그아웃 후 재로그인

#### 3.2 대시보드
- 시간표 고정 행 + 경기 행 혼합 테이블
- 경기별 청팀/홍팀 선수 2인 조합과 점수 입력
- 점수 입력 제한: 0~10 정수만 허용
- 점수 입력 후 서버 저장 (`PUT /api/matches/:id/score`)
- 팀별 총점 배지 표시

#### 3.3 마니또 투표
- 라디오 선택으로 투표 반영 (`POST /api/votes`)
- `선택안함`으로 내 투표 취소 (`DELETE /api/votes/me`)
- 내 투표 조회 (`GET /api/votes/me`)
- 득표 현황 조회 (`GET /api/votes/summary`)
- 5초마다 자동 갱신
- 관리자성 기능: 임창용 로그인 시 `초기화` 버튼 노출, 전체 투표 초기화 (`POST /api/votes/reset`)

#### 3.4 사용자 피드백
- 로그인 실패/검증 실패는 토스트 메시지로 안내
- 투표 초기화 성공/실패도 토스트 메시지로 안내

### 4. 기술 스택 및 구조
- Frontend: React + Vite + TypeScript + Tailwind
- Backend: Express + TypeScript
- DB: SQLite + Prisma
- 세션: express-session
- 배포 형태: Express가 API + 정적 파일(client/dist) 동시 서빙

### 5. API 최신 목록
- 인증/세션
  - `POST /api/login`
  - `POST /api/logout`
  - `GET /api/me`
- 경기
  - `GET /api/matches`
  - `PUT /api/matches/:id/score`
- 합산
  - `GET /api/summary`
- 마니또 투표
  - `POST /api/votes`
  - `DELETE /api/votes/me`
  - `GET /api/votes/me`
  - `GET /api/votes/summary`
  - `POST /api/votes/reset` (임창용 계정만 허용)

### 6. 실행 방법

#### 6.1 개발 즉시 확인
- 서버: `server` 폴더에서 `npm run dev`
- 클라이언트: `client` 폴더에서 `npm run dev`
- 즉시 반영 확인: `http://localhost:5173`

#### 6.2 4000 포트 단일 서빙(운영 형태)
- 클라이언트 빌드: `client` 폴더에서 `npm run build`
- 서버 실행: `server` 폴더에서 `npm run dev` 또는 `npm run start`
- 접속: `http://localhost:4000`

주의: 4000 화면은 `client/dist` 기준이므로, 프론트 수정 후에는 빌드를 다시 해야 반영됨.
주의: `server/.env` 수정 후에는 서버를 재시작해야 반영됨.

### 7. 데이터 운영
- DB 파일: `server/prisma/dev.db`
- 시드 데이터: `server/prisma/seed.ts`
- Prisma generated 산출물(`server/generated/prisma`)은 `.gitignore` 처리되어 머지/커밋 대상 아님

### 8. 로그 운영
- 저장 위치: `server/log`
- access 로그: 요청 IP, 로그인 사용자, 메서드, 경로, 상태코드, 응답시간
- audit 로그: 로그인/로그아웃, 점수 수정, 투표 제출/취소, 전체 초기화 같은 주요 액션
- 마니또 투표 대상 이름은 로그에 남기지 않음
- 보관 기간: 최근 7일, 서버 시작 시 오래된 로그 자동 삭제

### 9. 보안 적용 현황 (2026-03-14 반영)

#### 9.1 적용 완료 항목
- CORS 허용 목록 제한 적용 (`CORS_ORIGINS` 기반)
- 보안 헤더 적용 (`helmet`)
- 요청 제한 적용 (`express-rate-limit`)
  - `/api` 전체 limiter
  - `/api/login` 별도 limiter
- 세션 보안 강화
  - `SESSION_SECRET` 환경변수 우선 사용
  - `saveUninitialized: false`
  - 세션 쿠키: `httpOnly`, `sameSite: lax`, `secure: production`, `maxAge: 12h`
  - 세션 쿠키 이름: `destiny.sid`
- 프록시 환경 대응 (`TRUST_PROXY=1`일 때 trust proxy 설정)
- 관리자 투표 초기화 보호 보강
  - `임창용` 세션 확인 유지
  - `ADMIN_RESET_KEY` 설정 시 `x-admin-reset-key` 헤더 검증 추가

#### 9.2 의존성 반영
- 서버 의존성 추가: `helmet`, `express-rate-limit`

#### 9.3 운영 시 필수 환경변수 (권장)
- `SESSION_SECRET`
- `CORS_ORIGINS`
- `TRUST_PROXY`
- `ADMIN_RESET_KEY`
- `ALLOWED_LOGIN_NAMES`

예시:
- `SESSION_SECRET=very-strong-random-secret`
- `CORS_ORIGINS=http://localhost:5173,http://localhost:4000
- `TRUST_PROXY=1`
- `ADMIN_RESET_KEY=change-this-admin-key`


### 10. 검증 및 문서 정리 결과
- 문서 정리: 루트 `README.md`는 진입 문서, `Destiny_play.md`는 상세 기준 문서로 유지
- 타입 체크 통과
  - `server`: `npm run check`
  - `client`: `npm run check`

### 11. 남은 개선 과제
- 관리자 인증 체계 개선(이름 비교 제거)
- HTTPS 앞단 구성 및 운영 도메인 기준 CORS 고정
- 행사 종료 후 결과 공개/잠금 모드 추가
- 운영용 백업 자동화 스크립트 정리
