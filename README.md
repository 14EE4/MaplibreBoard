# MaplibreBoard (Self-Hosted)

## 📝 프로젝트 요약
Next.js(Pages Router + API Routes) 기반의 인터랙티브 지도 게시판입니다. **MapLibre GL**을 사용하여 그리드 단위로 보드를 시각화하며, **Prisma ORM**을 통해 로컬 서버에 직접 설치된 **PostgreSQL**에 데이터를 저장합니다. 외부 클라우드 의존성을 제거하고 독립적인 서버 환경에서 구동되도록 최적화되었습니다.

추가로 마인크래프트 서버(Java & Bedrock 겸용) 상태 모니터링 기능을 제공하여 실시간으로 서버 접속 현황을 확인할 수 있습니다.

## 🌐 배포 및 접속 정보
- **배포 주소:** [https://pyeong.p-e.kr](https://pyeong.p-e.kr)
- **운영 환경:** Ubuntu (Linux) / Nginx (Reverse Proxy) / Node.js v24
- **데이터베이스:** 로컬 PostgreSQL (Self-managed)
- **프로세스 관리:** PM2 (무중단 운영)

---

## 🚀 빠른 시작 (Local Server Setup)

### 1. 로컬 PostgreSQL 설치 및 권한 설정
서버에 데이터베이스를 설치하고 프로젝트 전용 사용자와 권한을 설정합니다.

    # PostgreSQL 설치
    sudo apt update && sudo apt install postgresql

    # DB 및 사용자 생성 (sudo -u postgres psql 접속 후 실행)
    CREATE DATABASE maplibre_db;
    CREATE USER [DB_USER] WITH PASSWORD '[DB_PASSWORD]';
    GRANT ALL PRIVILEGES ON DATABASE maplibre_db TO [DB_USER];

    # 권한 설정 (PostgreSQL 15+ 대응)
    GRANT ALL ON SCHEMA public TO [DB_USER];
    ALTER SCHEMA public OWNER TO [DB_USER];

### 2. 환경 변수 설정 (.env)
> [!IMPORTANT]
> 이 브랜치(`server-deploy`)는 외부 DB를 사용하지 않고, **로컬 PostgreSQL DB**를 기본적으로 사용합니다.

프로젝트 루트 폴더에 `.env` 파일을 생성하고 로컬 DB 주소를 입력합니다. (Git 제외 대상)

    DATABASE_URL="postgresql://[DB_USER]:[DB_PASSWORD]@localhost:5432/maplibre_db"

### 3. 의존성 설치 및 DB 동기화
터미널에서 아래 명령어를 실행하여 테이블 구조를 생성합니다.

    # 패키지 설치
    npm install

    # Prisma Client 생성 및 로컬 DB 테이블 생성
    npx prisma generate
    npx prisma db push

### 4. 빌드 및 서버 실행 (PM2)
    # 프로젝트 빌드
    npm run build

    # PM2를 이용한 백그라운드 가동
    pm2 start npm --name "map-board" -- start

    # 서버 재부팅 시 자동 실행 저장
    pm2 save
    pm2 startup

---

## 🛠 핵심 기능

### 🗺️ 인터랙티브 지도 (MapLibre GL JS)
- **멀티 모드:** OSM(기본), Satellite(위성), Globe(지구본) 전환 지원
- **상태 유지:** 마지막 지도 뷰(좌표, 줌, 모드)를 localStorage에 저장하여 재접속 시 자동 복원
- **그리드 히트맵:** 게시물 수(`posts_count`)에 따라 그리드 색상을 실시간으로 시각화 (Blue ↔ Red)

### 🎯 그리드 보드 및 게시글
- **자동 생성:** 지도 클릭 시 해당 좌표에 보드가 없으면 DB에 즉시 생성 후 이동
- **보안 검증:** 게시글 수정/삭제 시 비밀번호 해싱(SHA-256) 기반 권한 확인
- **접근성:** 보드 ID 또는 그리드 좌표(X, Y) 쿼리 파라미터를 통한 유연한 페이지 접속
- **즉시 반영:** 새 글 작성 후 캐시를 비우고 즉시 목록을 다시 불러와 페이지를 새로고침할 때 지연 없이 최신 글이 표시됨

---

## 🏗 시스템 아키텍처

- **Reverse Proxy:** Nginx가 80(HTTP)을 443(HTTPS)으로 리다이렉트하고 3000번 포트로 전달
- **App Server:** Next.js (PM2로 프로세스 관리)
- **DB Server:** 동일 서버 내 로컬 PostgreSQL (Prisma ORM 연결)

---

## 📂 프로젝트 구조
    MaplibreBoardVervel/
    ├── prisma/            # DB 모델(schema.prisma)
    ├── migrations/        # SQL 초기화 스크립트 (neon_init.sql)
    ├── backup/            # 게시판 데이터 CSV 백업 (boards.csv, posts.csv)
    ├── pages/
    │   ├── api/           # 보드/게시글 CRUD API
    │   ├── index.js       # 랜딩 페이지
    │   ├── map.js         # 메인 지도 인터페이스
    │   ├── rasterMap2.js  # 래스터 지도 버전
    │   ├── board.js       # 게시판 및 CRUD 로직
    │   └── admin.js       # 관리자 페이지
    ├── lib/               # Prisma Client 인스턴스 (db.js)
    ├── public/            # 정적 파일 (Favicon, CSS 등)
    ├── styles/            # 전역 스타일시트 (globals.css)
    └── next.config.js     # Next.js 설정

---

## 🚨 확인된 이슈 및 향후 계획 (TODO)
- [ ] 0,0 좌표 보정: 특정 좌표 클릭 시 비정상 이동 문제 디버깅
- [ ] 검색 기능 강화: 지명 검색을 통한 위치 이동(flyTo) 기능 도입
- [ ] 백업 자동화: 정기적인 데이터베이스 백업 스크립트 개선
- [ ] 관리자 기능 확장: admin.js 페이지 기능 강화 및 권한 관리
- [ ] 인증 고도화: 관리자 비밀번호 방식을 서버사이드 JWT 인증으로 교체

---

## 📄 라이선스 및 참고
- Map Library: MapLibre GL JS
- Map Tiles: OpenStreetMap, Esri World Imagery
