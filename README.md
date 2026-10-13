# TRIAGE-X v2.4 — Clearer Priorities, Simpler Nurse Check-In

**Java 21 Spring Boot + React/TypeScript + PostgreSQL.** This release retains the existing dark/navy TRIAGE-X interface and four role dashboards, removes the optional OpenAI observation-summary feature, and makes **CRITICAL**, **URGENT**, and **NORMAL** priorities easier to notice and read.

> **Educational demonstration only.** Prototype triage rules are **not** a clinically validated assessment system. Staff must review and confirm every category. Do not use an unsecured demo for real patients, personal health records, or live clinical decisions.

## What changed in v2.4

- Removed the **Optional OpenAI GPT Review** panel, consent checkbox, **Run AI Triage explanation** button and related error messages from Nurse → Register Patient.
- Removed the unused OpenAI review backend endpoint and service, so the application **does not call OpenAI**. **No OpenAI API key is required.** The demo triage recommendation still comes from the existing, local Java rule-based screening logic, followed by nurse confirmation.
- Made the provisional priority a large **color-coded banner**, with clear label, caption, and tinted icon.
- Enhanced priority badges across queue lists, dashboards, and patient directory: **bright coral-red CRITICAL**, **golden-yellow URGENT**, **mint-green NORMAL**, dark label text, and visual row accents. Important information is not communicated by color alone.
- Refined intake card backgrounds, progress indicators and call-to-action styling, with reduced-motion support.
- Kept existing workflow and data storage; no new database schema migration.

## User roles

| Role | What they can do |
|---|---|
| **Nurse** | Only role allowed to register patients, enter symptoms, vitals and history, generate local provisional priority, confirm the priority, and view live queue/reassessment reminders. |
| **Doctor** | View nurse-entered records and confirmed priorities; start/finish consultations. Cannot register patients. |
| **Patient** | View total waiting count and approximate queue wait; no access to other patients' records. |
| **Admin** | Read-only operational monitoring and statistics. Cannot edit patient records or approve users. |

Self-signup is available for Nurse, Doctor, and Patient. The administrator is provisioned on first database initialization from `ADMIN_EMAIL` and `ADMIN_PASSWORD`, and is not available via public signup. There are **no preloaded patients**.

### Nurse registration flow

**Patient Info → Symptoms → Vitals → History → Review → Save intake & review priority → Nurse confirms category → Shared Nurse & Doctor priority queue.**

The local rules may label a demonstration record CRITICAL, URGENT, or NORMAL and show which recorded observations triggered a flag. These are not diagnoses. After confirmation, the list is ordered by category and arrival time. The separate reassessment route remains accessible from Re-Triage Watch for later review; it is not a main sidebar item.

## Windows setup

Prerequisites: Java JDK 21, Maven 3.9+, Node 20+, npm, and PostgreSQL 17 with pgvector (Docker Desktop recommended).

Extract the ZIP. The folder containing `backend/`, `frontend/`, `scripts/`, and `docker-compose.yml` is the project root.

In PowerShell from the project root:

```powershell
Copy-Item .env.example .env
notepad .env
```

Choose an `ADMIN_PASSWORD` with at least 12 characters. If the database is **new**, the project creates its admin account on first boot. If the admin already exists in the database, changing `.env` does not reset the stored password.

The database settings **must match your existing Docker container**:

```dotenv
DB_URL=jdbc:postgresql://localhost:55433/triagex
DB_HOST_PORT=55433
DB_USER=triagex
DB_PASSWORD=triagex_local
ADMIN_EMAIL=admin@triagex.local
ADMIN_PASSWORD=REPLACE_WITH_YOUR_PRIVATE_LONG_PASSWORD
SEED_DEMO_USERS=false
```

This example uses `55433` **only if your existing TRIAGE-X database is already exposed there**. If you have another port, change both `DB_HOST_PORT` and the port in `DB_URL` to match it. Keep the original database username/password. Do not send anyone your `.env` contents.

### If you already have TRIAGE-X v2.3.1 running

**Recommended:** Make a backup of your old project folder. Stop only the Java and React application processes. Copy the **v2.4 `frontend/` and `backend/` source directories** into your existing project folder (replace the old code). Keep your current `.env`, Docker container, and PostgreSQL **volume**. Since this release adds no schema migration, it can reuse the existing tables. **Do not run `docker compose down -v`.**

Alternatively, extract to a new folder and reuse the existing PostgreSQL container by configuring the new root `.env` with the **same `DB_URL` and credentials**. In that case **do not run `docker compose up -d` from the new project** while the old database container already occupies that port. You can verify with `docker ps`.

### If this is your first TRIAGE-X install

From the project root, with an available host database port:

```powershell
docker compose up -d
docker compose ps
```

Use a single healthy PostgreSQL container; do not accidentally create a second database on a conflicting port. On an existing project, no Docker restart is necessary just to update UI code.

### Start the web app

```powershell
cd frontend
npm install
cd ..
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

The frontend should open at **http://localhost:5173** and Spring Boot at **http://localhost:8080**. The startup script reads `.env`. If you see a 500 response, inspect Java backend logs. If port 5173 is already in use, stop the older React process instead of unintentionally opening a different Vite port.

### Validate on your laptop

```powershell
cd frontend
npm run build
cd ..\backend
mvn test
```

Check Nurse → Register Patient → Save → Confirm → Queue, Doctor's queue, and Patient's count and wait estimate. No optional API-review card should appear. Confirm **CRITICAL** and **URGENT** badges are bold and readable. Use non-identifying demonstration entries only.

**Note on testing:** The project source archive was inspected and parsed for JavaScript/TypeScript syntax. A full Java Maven build, full frontend dependency build, PostgreSQL integration test, and live UI walkthrough need to be done locally (they are not represented as completed here).

## API / LLM

This release intentionally **does not integrate an LLM or RAG**. No AI Assistant, Knowledge Base, AI configuration, OpenAI credentials, or OpenAI requests are used. If your old `.env` still contains `AI_API_KEY`, remove that unused line before sharing/archiving the project; it is not read by this release. Local prototype triage rules remain in `backend/src/main/java/com/triagex/triage/TriageRules.java`.
