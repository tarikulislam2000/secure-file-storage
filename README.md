# 🔒 Secure File Storage Service

[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![AWS S3](https://img.shields.io/badge/AWS_S3-FF9900?style=for-the-badge&logo=amazons3&logoColor=white)](https://aws.amazon.com/s3/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)

A production-quality full-stack file management platform designed for high performance and strict security. Built with Next.js, TypeScript, AWS S3, Supabase (PostgreSQL), and Prisma ORM for the Persist Ventures Full Stack Engineer assessment.

🌐 **Live Demo:** [https://secure-file-storage-tarikul.vercel.app](https://secure-file-storage-tarikul.vercel.app)  
🏛 **System Architecture Document:** See [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md) for complete technical architecture, security decisions, and scaling considerations.

---

## 🛠 Tech Stack

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, Lucide Icons
- **Backend:** Next.js Route Handlers (Node.js runtime), Prisma ORM
- **Database:** Supabase (PostgreSQL with Connection Pooling)
- **Cloud Storage:** AWS S3 (Direct browser-to-S3 presigned URL uploads)
- **Authentication:** JWT (stored in HTTP-only cookies) & Bcrypt password hashing
- **Package Manager:** `pnpm`
- **Code Quality:** ESLint, Commitlint, Husky (Enforced Conventional Commits)

---

## ✨ Core Features

- 🔐 **Authentication & Authorization:** Secure user registration, password hashing (bcrypt), and stateless JWT session management.
- 📦 **100 MB+ Direct S3 Uploads:** Utilizes AWS S3 Presigned PUT URLs to stream files directly from the browser to S3, bypassing server memory bottlenecks and request payload limits.
- 📊 **Real-time Progress Tracking:** Axios-driven upload progress reporting for large file transfers.
- 🔒 **Granular Access Control:**
  - **Private Files:** Only accessible to the verified file owner via short-lived AWS S3 Presigned GET URLs generated after backend authorization checks.
  - **Public Files:** Accessible via shareable tokens that generate temporary signed download links without making the S3 bucket publicly readable.
- 📁 **Personal Dashboard:** Search, filter, toggle file visibility (Public/Private), track usage, and manage uploads.

---

## 🚀 Architectural Design Summary

[Browser Client] ───(1. Request Upload URL)───► [Next.js Route Handler]
│ │
│ (3. Direct Binary Upload) │ (2. Presigned PUT URL)
▼ ▼
[AWS S3 Bucket] ◄───(4. Confirm Upload Metadata)─── [Supabase PostgreSQL]

To support **100 MB+ uploads** efficiently without overloading server memory:

1. Client requests a upload URL from `POST /api/files/upload-url` with file metadata.
2. Backend verifies JWT authentication, enforces size limits (<= 100 MB), and generates an AWS S3 Presigned PUT URL.
3. Client streams raw binary data directly to S3 via standard HTTP `PUT`.
4. Upon S3 upload completion, client calls `POST /api/files/confirm` to commit file metadata into PostgreSQL via Prisma.

> For an in-depth breakdown of deployment topology, OWASP file upload security implementations, database schema, and trade-offs at scale, read the full [System Design Document](./SYSTEM_DESIGN.md).

---

## ⚙️ Local Development Setup

### Prerequisites

- Node.js >= 18.x
- `pnpm` installed (`npm i -g pnpm`)
- PostgreSQL Database instance (Supabase)
- AWS Account with S3 Bucket & IAM programmatic keys

### 1. Clone & Install Dependencies

```bash
git clone [https://github.com/tarikulislam2000/secure-file-storage.git](https://github.com/tarikulislam2000/secure-file-storage.git)
cd secure-file-storage
pnpm install
```

2. Environment Setup
   Create a .env file in the root directory:

# Server Config

PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Authentication

JWT_SECRET=your_super_secret_jwt_key_here

# Supabase Databases

DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true](https://aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true)"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# AWS S3 Configuration

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET_NAME=your_s3_bucket_name

3.  Database Migration
    Bash
    pnpm exec prisma db push 4. Run Development Server
    Bash
    pnpm dev
    Open http://localhost:3000 in your browser.

          📜 Conventional Commit Rules

    This repository strictly enforces Conventional Commits via Husky and Commitlint.

Format: <type>(<scope>): <short description>

Allowed Types: feat, fix, docs, style, refactor, perf, test, chore, build, ci

📄 License
This project is open source and available under the MIT License.
