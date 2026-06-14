# MaplibreBoard (Self-Hosted)

## 📝 프로젝트 요약
Next.js(Pages Router + API Routes) 기반의 인터랙티브 지도 게시판입니다. **MapLibre GL**을 사용하여 그리드 단위로 보드를 시각화하며, **Prisma ORM**을 통해 로컬 서버에 직접 설치된 **PostgreSQL**에 데이터를 저장합니다. 외부 클라우드 의존성을 제거하고 독립적인 서버 환경에서 구동되도록 최적화되었습니다.

## 🌐 배포 및 접속 정보
- **배포 주소:** [https://pyeong.p-e.kr](https://pyeong.p-e.kr)
- **운영 환경:** Ubuntu (Linux) / Nginx (Reverse Proxy) / Node.js v24
- **데이터베이스:** 로컬 PostgreSQL (Self-managed)
- **프로세스 관리:** PM2 (무중단 운영)

## 🌿 브랜치 전략 (Branch Strategy)
이 저장소는 안전한 개발 및 무중단 배포를 위해 다음과 같은 브랜치 구조를 사용합니다.
- `main`: 운영 서버에 직접 무중단 배포되는 최신 안정 버전(Production) 브랜치입니다.
- `dev`: 신규 기능 테스트 및 활발한 개발이 이루어지는 메인 개발(Development) 브랜치입니다. 기능 추가 시 `dev` 브랜치에서 분기한 뒤 검증을 거쳐 `dev`로 병합합니다.

---

## 🚀 빠른 시작 (Local Server Setup)

### 1. 로컬 PostgreSQL 설치 및 권한 설정
서버에 데이터베이스를 설치하고 프로젝트 전용 사용자와 권한을 설정합니다.

```bash
# PostgreSQL 설치
sudo apt update && sudo apt install postgresql

# DB 및 사용자 생성 (sudo -u postgres psql 접속 후 실행)
CREATE DATABASE maplibre_db;
CREATE USER [DB_USER] WITH PASSWORD '[DB_PASSWORD]';
GRANT ALL PRIVILEGES ON DATABASE maplibre_db TO [DB_USER];

# 권한 설정 (PostgreSQL 15+ 대응)
GRANT ALL ON SCHEMA public TO [DB_USER];
ALTER SCHEMA public OWNER TO [DB_USER];
```

### 2. 환경 변수 설정 (.env)
> [!IMPORTANT]
> 이 프로젝트는 외부 DB를 사용하지 않고, **로컬 PostgreSQL DB**를 기본적으로 사용합니다.

프로젝트 루트 폴더에 `.env` 파일을 생성하고 로컬 DB 주소와 관리자 비밀번호를 입력합니다. (Git 제외 대상)

```env
DATABASE_URL="postgresql://[DB_USER]:[DB_PASSWORD]@localhost:5432/maplibre_db"
ADMIN_PASSWORD="your_admin_password_here"
```

### 3. 의존성 설치 및 DB 동기화
터미널에서 아래 명령어를 실행하여 테이블 구조를 생성합니다.

```bash
# 패키지 설치
npm install

# Prisma Client 생성 및 로컬 DB 테이블 생성
npx prisma generate
npx prisma db push
```

### 4. WSL (Ubuntu) 기반 로컬 테스트 및 검증
데이터베이스(PostgreSQL)가 WSL 환경에 기동되어 있는 경우, 아래 가이드를 통해 기능을 테스트할 수 있습니다.

1. **WSL 접속 및 PostgreSQL 실행**
   Windows 터미널에서 WSL Ubuntu를 실행하고 아래 명령어로 데이터베이스 서비스를 켭니다.
   ```bash
   sudo service postgresql start
   ```

2. **WSL 내에서 프로젝트 경로 이동 및 패키지 설치**
   마운트된 프로젝트 디렉토리로 이동한 뒤, 의존성 패키지를 최종 설치 및 정리합니다.
   ```bash
   cd /home/pyeongju/workspace/MaplibreBoardVervel
   npm install
   ```

3. **DB 테이블 스키마 동기화**
   Prisma CLI를 통해 로컬 DB에 새로 추가된 컬럼(`image_url` 등)을 연동합니다.
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **로컬 개발 서버 실행 및 브라우저 테스트**
   ```bash
   npm run dev
   ```
   서버가 켜지면 브라우저를 통해 `http://localhost:3000/board?id=1` 혹은 격자 좌표로 접속하여 이미지 첨부, 글 작성 및 이미지 확대(Lightbox) 동작을 검증할 수 있습니다.

### 5. 빌드 및 배포 실행 (PM2)
```bash
# 프로젝트 빌드
npm run build

# PM2를 이용한 백그라운드 가동
pm2 start npm --name "map-board" -- start

# 서버 재부팅 시 자동 실행 저장
pm2 save
pm2 startup
```

### 6. 운영 서버 업데이트 및 무중단 배포 (SSH & PM2)
이미 가동 중인 원격 우분투 서버가 존재하고 SSH로만 접근이 가능한 상태에서 이미지 검열 갤러리 및 DB 업데이트 등을 안전하게 적용하는 방법입니다.

1. **로컬 작업 완료 후 원격 코드 갱신**
   로컬의 최신 커밋들을 깃허브 원격 저장소에 푸시하고, 서버로 SSH 접속하여 최신 소스를 동기화합니다.
   ```bash
   # [로컬 터미널] 코드 푸시
   git push origin main

   # [SSH 서버 터미널] 접속 및 소스 다운로드
   ssh user@your-server-ip
   cd /home/pyeongju/workspace/MaplibreBoardVervel  # 실제 서버 경로로 이동
   git fetch --all
   git pull origin main
   ```

2. **패키지 설치 및 DB 스키마 마이그레이션**
   새로 도입된 이미지 저장 스키마 필드(`image_url` 등)를 로컬 PostgreSQL 데이터베이스에 무중단으로 반영합니다.
   ```bash
   # 패키지 설치
   npm install

   # Prisma 스키마 동기화 (기존 DB 데이터 유지됨)
   npx prisma generate
   npx prisma db push
   ```

3. **물리 업로드 디렉토리 권한 설정**
   업로드된 이미지들이 저장될 폴더를 마련하고, 백그라운드 Node 프로세스가 파일 생성 및 쓰기를 수행할 수 있도록 권한을 보장합니다.
   ```bash
   mkdir -p uploads
   chmod 755 uploads
   ```

4. **빌드 및 서비스 무중단 재로드**
   ```bash
   # Next.js 프로덕션 빌드
   npm run build

   # PM2 무중단 재로드
   pm2 reload map-board

   # 서버 작동 실시간 모니터링
   pm2 logs map-board
   ```

---

## 🛠 핵심 기능

### 🗺️ 인터랙티브 지도 (MapLibre GL JS)
- **멀티 모드:** OSM(기본), Satellite(위성), Globe(지구본) 전환 지원
- **상태 유지:** 마지막 지도 뷰(좌표, 줌, 모드)를 localStorage에 저장하여 재접속 시 자동 복원
- **그리드 히트맵:** 게시물 수(`posts_count`)에 따라 그리드 색상을 실시간으로 시각화 (Blue ↔ Red)

### 🎯 그리드 보드 및 게시글
- **자동 생성:** 지도 클릭 시 해당 좌표에 보드가 없으면 DB에 즉시 생성 후 이동 (SQL INSERT 컬럼-값 누수 버그 수정 완료로 500 오류 없이 안정적으로 자동 생성됨)
- **보안 검증:** 게시글 수정/삭제 시 비밀번호 해싱(SHA-256) 기반 권한 확인
- **접근성:** 보드 ID 또는 그리드 좌표(X, Y) 쿼리 파라미터를 통한 유연한 페이지 접속
- **즉시 반영:** 새 글 작성 후 캐시를 비우고 즉시 목록을 다시 불러와 페이지를 새로고침할 때 지연 없이 최신 글이 표시됨 (날짜 표시 버그 수정 완료로 실제 작성 시간이 올바르게 표시됨)
- **이미지 업로드 및 Lightbox:** 게시물 작성 시 이미지를 첨부(Base64 업로드)하여 로컬 디렉토리에 저장하고, Lightbox를 통해 모달 형식의 확대 보기가 가능합니다.

### 📊 전체 글 피드 (All Feed) (NEW)
- **통합 타임라인:** 모든 격자 게시판에 흩어져 있는 게시글들을 최신 시간순으로 통합하여 한눈에 확인할 수 있는 모아보기 기능입니다.
- **인터랙티브 그리드:** 뷰 전용 피드 카드 그리드를 제공하며, 카드를 클릭하면 해당 게시물이 작성된 실제 격자 게시판(`/board?id=BOARD_ID`)으로 즉시 이동합니다.
- **라이트박스 연동:** 피드 카드 내의 이미지를 클릭하면 페이지 이동 없이 그 자리에서 이미지를 확대해서 감상할 수 있는 라이트박스 뷰어가 실행됩니다.

### 🛡️ 어드민 이미지 검열 및 관리
- **업로드 이미지 리스트:** 서버의 물리적 업로드 디렉토리(`uploads/`)와 PostgreSQL DB를 정밀 분석하여 어떤 이미지 파일이 어떤 게시물에 사용 중인지 직관적으로 보여줍니다.
- **고립 파일(Orphaned File) 감지:** DB 연동이 유실되어 저장 공간만 차지하는 이미지 파일을 식별해 줍니다.
- **3단계 검열 처리:** 
  1. *이미지 파일만 삭제*: 게시물 텍스트 내용은 유지하되, 첨부된 이미지만 삭제 및 DB 링크 제거.
  2. *전체 게시글 삭제*: 게시글 DB 레코드와 첨부된 물리 이미지 파일을 일괄 삭제(DB 글 개수 자동 감소 연동).
  3. *파일 완전 삭제*: 게시글과 연결되지 않은 고립(Orphaned) 이미지 파일을 서버에서 안전하게 소거.
- **보안 공격 Mitigation:** 이미지 파일 소거 요청 시 파일명의 디렉토리 경로 우회 패턴(Path Traversal) 검증 알고리즘을 도입하여 지정된 디렉토리 밖의 중요 서버 파일이 훼손되지 않도록 보호합니다.

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
    │   │   ├── admin/
    │   │   │   ├── images.js # 어드민 이미지 조회 및 검열 API (NEW)
    │   │   │   └── verify.js # 관리자 비밀번호 서버 사이드 검증 API (NEW)
    │   │   └── ...
    │   ├── index.js       # 랜딩 페이지 (전체 피드 버튼 추가)
    │   ├── map.js         # 메인 지도 인터페이스
    │   ├── rasterMap2.js  # 래스터 지도 버전
    │   ├── board.js       # 게시판 및 CRUD 로직 (날짜 필드 버그 수정)
    │   ├── all.js         # 전체 글 피드 페이지 (NEW)
    │   └── admin.js       # 관리자 페이지 (UI 갤러리 개편)
    ├── lib/               # Prisma Client 인스턴스 (db.js)
    ├── uploads/           # 업로드된 물리 이미지 파일 저장소 (NEW: public 폴더 외부로 이동)
    ├── public/            # 정적 파일 (Favicon, CSS 등)
    ├── styles/            # 전역 스타일시트 (globals.css)
    └── next.config.js     # Next.js 설정

---

## 🚨 확인된 이슈 및 향후 계획 (TODO)
- [x] 런타임 이미지 404 에러 해결 (캐시 우회 및 동적 서빙): [troubleshooting.md](file:///home/pyeongju/workspace/MaplibreBoardVervel/troubleshooting.md) 문서 참고
- [ ] 0,0 좌표 보정: 특정 좌표 클릭 시 비정상 이동 문제 디버깅
- [ ] 검색 기능 강화: 지명 검색을 통한 위치 이동(flyTo) 기능 도입
- [ ] 백업 자동화: 정기적인 데이터베이스 백업 스크립트 개선
- [x] 관리자 기능 확장: admin.js 이미지 검열 갤러리 뷰 도입 및 파일-DB 무결성 관리 구현
- [ ] 인증 고도화: 관리자 비밀번호 방식을 서버사이드 JWT 인증으로 교체


---

## 📄 라이선스 및 참고
- Map Library: MapLibre GL JS
- Map Tiles: OpenStreetMap, Esri World Imagery
