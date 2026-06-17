# 📋 FileClip

FileClip is a lightweight, secure, and modern online clipboard for files. It allows you to upload multiple files, receive a short 6-character sharing code, and share it with anyone. Files automatically expire and self-destruct after a customizable duration, keeping storage clean and secure.

Built with Next.js 16, Tailwind CSS 4, MongoDB, and AWS S3 (or MinIO), FileClip features high scalability, direct-to-storage uploads, and AI-powered document summarization.

---

## 📸 Screenshots

Here is a visual walk-through of FileClip in action (using Dark Mode):

### 1. Landing Page
![Landing Page](pics/Screenshot%202026-06-17%20at%2010.46.17%E2%80%AFAM.png)

### 2. Upload Interface (Drag & Drop + Expiry Selection)
![Upload Interface](pics/Screenshot%202026-06-17%20at%2010.47.45%E2%80%AFAM.png)

### 3. Share Code & QR Code Generation
![Upload Complete](pics/Screenshot%202026-06-17%20at%2010.48.21%E2%80%AFAM.png)

### 4. Retrieve Clip Page
![Retrieve Interface](pics/Screenshot%202026-06-17%20at%2010.48.42%E2%80%AFAM.png)

### 5. Clip Details & File Management
![Clip Details](pics/Screenshot%202026-06-17%20at%2010.48.51%E2%80%AFAM.png)

### 6. Document Summarization (Gemini 3.5 Flash)
![AI Summary Loading](pics/Screenshot%202026-06-17%20at%2010.48.58%E2%80%AFAM.png)
![AI Summary Loaded](pics/Screenshot%202026-06-17%20at%2010.49.55%E2%80%AFAM.png)

---

## ✨ Features

- **🚀 Direct-to-Storage Uploads:** Files upload directly from the browser to your storage bucket (S3 or MinIO) using secure, short-lived presigned PUT URLs. Your web server never buffers or processes raw upload bytes, keeping server load and bandwidth utilization low.

- **🔗 Short Share Codes:** Instead of long, complex URLs, shares are retrieved using simple, human-readable 6-character alphanumeric codes (e.g., `AB3K9Z`).

- **⏳ Auto-Expiry & Automatic Cleanup:** Set files to expire in 1 hour up to 7 days. Expired files are automatically cleaned up from storage and deleted from the database.

- **🤖 Gemini-Powered AI Summaries:** Instantly generate concise, factual summaries for text documents, PDFs, Microsoft Word/Excel sheets, and images using Google Gemini 3.5 Flash. Summaries are cached securely in the database to optimize API calls.

- **🔒 Secure Architecture:**
  - Cryptographically signed tokens (`confirmToken`) prevent staging key spoofing or path-traversal injection.
  - S3 staging bucket lifecycle policy deletes abandoned uploads automatically.
  - Direct download options force correct `Content-Disposition` parameters (inline vs attachment) directly at the storage level.

---

## 🛠️ Technology Stack

- **Framework:** [Next.js 16 (App Router)](https://nextjs.org/) & [React 19](https://react.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Database:** [MongoDB](https://www.mongodb.com/)
- **Object Storage:** [AWS S3](https://aws.amazon.com/s3/) or [MinIO](https://min.io/) (for local development)
- **AI Integration:** [Google Gemini API (@google/genai)](https://ai.google.dev/)
- **Key Libraries:** `jsonwebtoken` (secure confirmation tokens), `nanoid` (clip code generation)

---

## 🚀 Getting Started

### 📋 Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v20+ recommended)
- [Docker & Docker Compose](https://www.docker.com/)

---

### 💻 Step-by-Step Local Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/Pranay-Kamble/file-clip.git
cd file-clip
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Start Local Infrastructure
Use the provided `docker-compose.yml` to spin up local MongoDB and MinIO services:
```bash
docker compose up -d
```
*Note: MinIO's console will be available at [http://localhost:9001](http://localhost:9001) with username `admin` and password `password`.*

#### 4. Configure Environment Variables
Create a `.env.local` file in the root of the project:
```bash
cp .env.local.example .env.local
```

Configure the environment variables:
```env
# Database
MONGODB_URI=mongodb://<username>:<password>@localhost:27017

# Storage (S3 / MinIO)
MINIO_ENDPOINT=http://localhost:9000
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=admin
AWS_SECRET_ACCESS_KEY=password
S3_BUCKET=fileclip-bucket

# Security
JWT_SECRET=your_jwt_secret_key_here
PRESIGN_TTL=900

# AI (Optional, for document summarization)
GEMINI_API_KEY=your_gemini_api_key_here

# Cleanup Config
CRON_SECRET=your_cron_cleanup_secret_here
```

#### 5. Initialize the MinIO Bucket
Open the MinIO Console at [http://localhost:9001](http://localhost:9001), log in, and create a bucket named `fileclip-bucket` (or the name specified in `S3_BUCKET`).

#### 6. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🧹 Automated Cleanup

To automatically clean up expired files, set up a cron job or scheduled task that calls the cleanup endpoint:

```
GET /api/cron/cleanup
Authorization: Bearer <your_cron_cleanup_secret>
```

This endpoint:
1. Identifies clips that have expired.
2. Securely deletes corresponding files from S3/MinIO.
3. Clears expired database entries.

---

## 🔒 Security Summary

FileClip is engineered with several core security measures:
1. **Cryptographic Validation:** Upload validations require a JWT token issued by the backend (`confirmToken`) to confirm the files match the generated upload signatures.
2. **Bucket Isolation:** Separates temporary uploads (staging) from permanent files. A lifecycle policy on `uploads/staging/` in S3 deletes non-confirmed files after 24 hours, preventing orphaned files.
3. **Key Spoofing Prevention:** The backend checks the exact path prefix and uses `HeadObject` calls directly on storage before writing metadata records to MongoDB.
