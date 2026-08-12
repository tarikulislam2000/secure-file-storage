# 🔒 Secure File Storage Service

A production-quality full-stack file management platform built with **Next.js 14**, **TypeScript**, **Express/Node.js**, **AWS S3**, and **Supabase (PostgreSQL)**. Built for the Persist Ventures Full Stack Engineer assessment.

---

## 🛠 Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Lucide Icons
- **Backend:** Node.js, Express.js / Next.js API Routes, Prisma ORM
- **Database:** Supabase (PostgreSQL)
- **Cloud Storage:** AWS S3 (Direct presigned URL uploads)
- **Authentication:** JWT (JSON Web Tokens) & Bcrypt
- **Package Manager:** `pnpm`
- **Code Quality:** ESLint, Commitlint, Husky (Conventional Commits)

---

## ✨ Features

- 🔐 **Authentication & Authorization:** Secure user registration, password hashing (bcrypt), and JWT session management.
- 📦 **100 MB+ Direct S3 Uploads:** Utilizes AWS S3 Presigned PUT URLs to allow direct browser-to-S3 streaming, bypassing server payload limits and memory bottlenecks.
- 📊 **Real-time Progress Tracking:** Axios-driven upload progress indicators for large file transfers.
- 🔒 **Granular Access Control:**
  - **Private Files:** Only accessible to the owner via short-lived AWS S3 Presigned GET URLs generated after backend authorization check.
  - **Public Files:** Sharable links accessible across public endpoints.
- 📁 **Personal Dashboard:** Filter, search, toggle file visibility, and track storage usage.

---

## 🚀 Architectural Design & Security Decisions

### Direct S3 Upload Flow (Presigned URLs)

To handle 100 MB+ uploads without overloading Node.js backend memory or incurring server timeout limits:

1. Client sends file metadata (`filename`, `fileSize`, `mimeType`) to `POST /api/files/upload-url`.
2. Backend validates JWT authentication and checks file size restrictions ($\le 100\text{ MB}$).
3. Backend requests an S3 **Presigned PUT URL** using `@aws-sdk/s3-request-presigner` and returns it to client.
4. Client streams the binary payload directly to S3 via `PUT` request with upload progress reporting.
5. Client notifies backend upon success to commit file metadata into PostgreSQL via Prisma.

---

## ⚙️ Local Development Setup

### Prerequisites

- Node.js >= 18.x
- `pnpm` installed (`npm i -g pnpm`)
- PostgreSQL database (Supabase instance)
- AWS Account with S3 Bucket & IAM User keys

### 1. Clone & Install Dependencies

```bash
git clone [https://github.com/YOUR_USERNAME/secure-file-storage.git](https://github.com/YOUR_USERNAME/secure-file-storage.git)
cd secure-file-storage
pnpm install
```
