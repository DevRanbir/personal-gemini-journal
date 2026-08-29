# 🚀 Personal Gemini Journal — Authenticated & UID-Isolated AI Application

[![Cloud Run](https://img.shields.io/badge/Google_Cloud_Run-Deployed-4285F4?logo=googlecloud&logoColor=white)](https://personal-gemini-journal-344135619629.asia-south1.run.app)
[![Verification Label](https://img.shields.io/badge/Verification_Label-dev--tutorial=cloud--run--ai--challenge-34A853)](https://codelabs.developers.google.com/codelabs/cloud-run/cloud-run-ai-challenge)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> Production-ready, authenticated AI reflection application built for the **Google Cloud Gen AI Academy APAC 2026 Ideathon Challenge**.  
> **Live Prototype**: [https://personal-gemini-journal-344135619629.asia-south1.run.app](https://personal-gemini-journal-344135619629.asia-south1.run.app)  
> **Official Codelab Reference**: [Build a User-Authenticated AI Application with Custom Instructions on Google AI Studio & Cloud Run Codelab](https://codelabs.developers.google.com/codelabs/cloud-run/cloud-run-ai-challenge)

---

## 📋 Codelab Compliance Checklist

This project strictly implements every requirement outlined in the official Google Cloud Codelab:

| Codelab Milestone / Requirement | Implementation Detail | Status |
| :--- | :--- | :---: |
| **1. AI Studio Custom Instructions** | Enforced security system prompt covering threat modeling, UID isolation, least privilege, and sanitization. | ✅ Completed |
| **2. Firebase Authentication** | Federated Google Sign-In & Email/Password auth integrated via Firebase Client SDK. | ✅ Completed |
| **3. Multi-turn Gemini AI Interaction** | Conversational reflection engine using Gemini 2.5 API with conversation history context. | ✅ Completed |
| **4. User-Isolated Firestore Storage** | All records stored under `/users/{userId}/*` enforced by strict `request.auth.uid == userId` rules. | ✅ Completed |
| **5. Secret Manager Integration** | `GEMINI_API_KEY` fetched dynamically at runtime from GCP Secret Manager (zero hardcoded secrets). | ✅ Completed |
| **6. Production Cloud Run Hosting** | Deployed with dedicated service account `personal-gemini-journal-sa@ai-barista-track-1.iam.gserviceaccount.com`. | ✅ Completed |
| **7. Mandatory Verification Label** | Deployed with label `--update-labels dev-tutorial=cloud-run-ai-challenge`. | ✅ Completed |
| **8. Original Feature Enhancements** | Journal Insights analytics dashboard & AI-extracted Action Items checklist. | ✅ Completed |

---

## 📖 Project Overview

**Personal Gemini Journal** is a secure, private journaling and reflection assistant. Built with Next.js 15, Firebase Authentication, Cloud Firestore, and the Gemini 2.5 API, it allows users to log thoughts, have multi-turn interactive reflection sessions, automatically extract actionable tasks, and visualize personal journal analytics.

### Key Technologies
- **Frontend / Framework**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons, Recharts
- **Authentication**: Firebase Authentication (Google Sign-In & Email/Password)
- **Database**: Cloud Firestore (Document storage with user UID scoping)
- **AI Engine**: Google Gemini 2.5 API (Multi-turn chat, sentiment analysis, task extraction)
- **Secret Management**: Google Cloud Secret Manager (`GEMINI_API_KEY`)
- **Hosting & Infrastructure**: Google Cloud Run (Containerized via Docker with least-privilege IAM service account)

---

## 🏗️ Architecture & Security Model

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          Client Browser                                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │   Harmony UI (Next.js 15, Tailwind, Framer Motion, Recharts)     │  │
│  └─────────────────────────────────┬────────────────────────────────┘  │
└────────────────────────────────────┼───────────────────────────────────┘
                                     │ HTTPS
┌────────────────────────────────────▼───────────────────────────────────┐
│                        Google Cloud Run Service                        │
│            (Label: dev-tutorial=cloud-run-ai-challenge)                │
│  ┌────────────────────────┐              ┌──────────────────────────┐  │
│  │ Firebase Client/Admin  │              │  Gemini SDK Integration  │  │
│  └───────────┬────────────┘              └────────────┬─────────────┘  │
└──────────────┼────────────────────────────────────────┼────────────────┘
               │                                        │
┌──────────────▼─────────────┐             ┌────────────▼─────────────┐
│    Firebase Auth Service   │             │   Google AI Studio /     │
│    (Google & Email Auth)   │             │   Gemini API             │
└──────────────┬─────────────┘             └──────────────────────────┘
               │ UID context
┌──────────────▼─────────────┐             ┌──────────────────────────┐
│      Cloud Firestore       │             │   Cloud Secret Manager   │
│ /users/{uid}/journals/{id} │             │   (GEMINI_API_KEY)       │
│ Strict Security Rules      │             │   roles/secretmanager.   │
│                            │             │   secretAccessor         │
└────────────────────────────┘             └──────────────────────────┘
```

---

## 🎯 Implementation Roadmap & Execution Plan

### Phase 1: Security Constitution & AI Custom Instructions
Before writing code, security directives were built into the system prompt:
- **Threat Modeling**: Zero trust architecture with server-side validation.
- **Data Boundary**: Enforce UID-bound database paths (`/users/{userId}/*`).
- **Credential Hygiene**: Mandatory use of GCP Secret Manager for API keys.
- **Least Privilege**: Dedicated GCP service identity with minimal permissions.

### Phase 2: Core Application Infrastructure
1. **Firebase Authentication**: Integrated Client SDK for Google Sign-In and Email auth, binding user sessions to unique Firebase UIDs.
2. **UID-Isolated Firestore**:
   - Structured paths: `/users/{userId}/interactions/{interactionId}` and `/users/{userId}/action_items/{itemId}`.
   - Enforced by `firestore.rules` (rejects cross-user reads/writes at the database level).
3. **Secret Manager Integration**: Secret `GEMINI_API_KEY` created in GCP Secret Manager and bound to the Cloud Run service identity `personal-gemini-journal-sa`.
4. **Multi-Turn Gemini Engine**: Implemented `/api/chat/gemini` supporting continuous reflection sessions with system prompts.

### Phase 3: Original Feature Enhancements
1. **📊 Journal Insights Dashboard (`/insights`)**:
   - Gemini analyzes the user's journal entries and extracts emotional sentiment scores, recurring themes, and top topic counts.
   - Visualized using interactive Recharts donut and bar charts.
2. **✅ Automated Action Items Checklist (`/tasks`)**:
   - Gemini parses conversation turns to identify implicit and explicit to-do items.
   - Saves action items directly to the user's Firestore collection (`/users/{userId}/action_items`).

---

## 🛡️ Firestore Security Rules (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Lock down all user paths to matching authenticated UID
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/action_items/{itemId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🔒 Security Verification Matrix

| Test Scenario | Description | Expected Result | Status |
| :--- | :--- | :--- | :---: |
| **Unauthenticated Route Block** | Access `/journal` or `/insights` without Firebase Sign-In | Redirected to `/login` | ✅ Passed |
| **Cross-User Firestore Read** | User A queries `/users/UserB_UID/interactions` | Permission Denied by Security Rules | ✅ Passed |
| **Cross-User Firestore Write** | User A writes to `/users/UserB_UID/action_items` | Permission Denied by Security Rules | ✅ Passed |
| **Secret Key Protection** | Inspect browser network tabs and client JS bundles | `GEMINI_API_KEY` is 100% absent | ✅ Passed |
| **Challenge Verification Tag** | Inspect Cloud Run service metadata labels | `dev-tutorial=cloud-run-ai-challenge` present | ✅ Passed |

---

## 🚀 Cloud Run Deployment Reference

The application is deployed on Google Cloud Run using the following command:

```bash
# 1. Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com --project=ai-barista-track-1

# 2. Create Secret & Version
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic" --project=ai-barista-track-1
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=- --project=ai-barista-track-1

# 3. Create Dedicated Service Account & Grant IAM Access
gcloud iam service-accounts create personal-gemini-journal-sa --project=ai-barista-track-1
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:personal-gemini-journal-sa@ai-barista-track-1.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=ai-barista-track-1

# 4. Deploy Container to Cloud Run with Mandatory Challenge Verification Label
gcloud run deploy personal-gemini-journal \
  --source . \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --service-account personal-gemini-journal-sa@ai-barista-track-1.iam.gserviceaccount.com \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --update-labels dev-tutorial=cloud-run-ai-challenge \
  --project ai-barista-track-1
```

---

## 💻 Local Development Setup

```bash
# Clone repository
git clone https://github.com/DevRanbir/personal-gemini-journal.git
cd personal-gemini-journal

# Install dependencies
npm install

# Set up local environment variables
cp .env.example .env.local

# Run Next.js local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application locally.
