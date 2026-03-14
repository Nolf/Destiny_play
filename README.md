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

## 문서

상세 기능/보안/운영 계획 문서:
- [Destiny_play.md](Destiny_play.md)
