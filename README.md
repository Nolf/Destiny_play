## Destiny Tennis Event 앱

### 실행 방법

- **백엔드 서버**
  - 위치: `server`
  - 최초 1회
    - `cd server`
    - `npx prisma migrate dev`
    - `npx ts-node prisma/seed.ts` (예시 대진표 시드)
  - 개발 서버 실행
    - `npm run dev` (기본 포트: `4000`)

- **프론트엔드 클라이언트**
  - 위치: `client`
  - 명령어
    - `cd client`
    - `npm install` (처음 한 번)
    - `npm run dev` 후 브라우저에서 `http://localhost:5173` 접속

### 주요 기능

- 이름 기반 로그인 (최대 동시 접속 35명)
- 이미지 대진표 구조를 반영한 경기판 대시보드
- 점수 입력 및 참가자별 합산 결과 조회
- 오늘의 마니또 비밀 투표

### 테스트 및 리허설

- **정적 체크**
  - 백엔드: `cd server && npm run check` (TypeScript 타입 체크)
  - 프론트엔드: `cd client && npm run check`
- **수동 시나리오 테스트**
  - 1) 여러 브라우저/기기에서 동시에 접속해 이름으로 로그인
  - 2) 라운드별로 점수를 입력·수정하고 합산 결과가 변하는지 확인
  - 3) 서로 다른 계정으로 마니또 투표를 여러 번 실행해, 1인 1표 및 집계 결과를 확인

### 배포 및 운영 체크리스트

- 환경 변수
  - `server/.env` 의 `DATABASE_URL` (SQLite 파일 경로)을 백업 가능한 위치에 둡니다.
- 서버 재시작 절차
  - `cd server && npm run dev` (개발용) 또는 `npm run build && npm start` (운영 빌드)
- 백업
  - `server/dev.db` 파일을 행사 중·행사 후에 다른 드라이브나 클라우드에 복사해 백업합니다.

