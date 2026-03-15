# Destiny Play

테니스 동호회 행사 진행용 웹앱입니다.
대진표/점수 입력/마니또 투표를 브라우저에서 함께 관리합니다.

## 빠른 시작

### 1) 서버 실행

```bash
cd server
npm install
npm run dev
```

기본 주소: http://localhost:4000

### 2) 클라이언트 실행

```bash
cd client
npm install
npm run dev
```

개발 주소: http://localhost:5173

## 운영 형태(4000 단일 서빙)

클라이언트 수정 사항을 4000에서 보려면 먼저 빌드가 필요합니다.

```bash
cd client
npm run build

cd ../server
npm run dev
```

## 환경변수

서버 환경변수 파일 위치:
- server/.env

주요 변수 예시:
- SESSION_SECRET
- CORS_ORIGINS
- TRUST_PROXY
- ADMIN_RESET_KEY
- ALLOWED_LOGIN_NAMES (쉼표로 구분한 허용 이름 목록)


주의:
- server/.env 변경 후에는 서버를 다시 시작해야 반영됩니다.

## 현재 동작 메모

- 로그인은 허용된 이름 목록만 가능합니다.
- 이름 입력 시 공백은 자동으로 제거됩니다.
- 점수 입력은 0~10 정수만 허용됩니다.
- 문자, 공백, 특수문자, 음수, 10 초과 값은 점수 입력에서 제외됩니다.

## 로그

- 저장 위치: server/log
- access 로그: 요청 IP, 로그인 사용자, 메서드, 경로, 상태코드, 응답시간
- audit 로그: 로그인/로그아웃, 점수 수정, 투표 제출/취소, 전체 초기화 같은 주요 액션
- 보관 기간: 최근 7일, 서버 시작 시 오래된 로그 자동 삭제
- 주의: 마니또 투표 대상 이름은 로그에 저장하지 않음

## 문서

상세 기능/보안/운영 계획 문서:
- [Destiny_play.md](Destiny_play.md)
