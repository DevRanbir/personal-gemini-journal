# 🚀 Personal Gemini Journal — Authenticated & UID-Isolated AI Application

> Deployed on **Google Cloud Run** for the **Google Cloud Gen AI Academy APAC 2026 Ideathon Challenge**.
> Official Verification Label: `dev-tutorial=cloud-run-ai-challenge`

---

## 📖 Overview

**Personal Gemini Journal** is an enterprise-ready, authenticated AI application built with **Next.js 15 App Router**, **Firebase Authentication**, **Cloud Firestore**, **Google Cloud Secret Manager**, and the **Gemini 2.5 API**.

It reuses and adapts the design system, navigation components, dark mode contrast, and responsive layout from **Harmony**.

### Highlights
- 🔐 **Firebase Authentication**: Federated Google Sign-In & Email Authentication. Passwords and credentials are never stored in client code.
- 💬 **Multi-Turn Gemini Interactions**: Interactive journal reflection engine with security system directives.
- 🔒 **UID-Isolated Firestore Storage**: Owner-bound paths (`/users/{userId}/interactions/{interactionId}`) with strict `request.auth.uid == userId` rules.
- 🔑 **Google Cloud Secret Manager Integration**: Dynamic runtime retrieval of `GEMINI_API_KEY`, zero secrets committed to Git.
- 📊 **Journal Insights Dashboard**: Gemini analyzes user's recent reflections into sentiment donut charts and topic bar charts powered by Recharts.
- ✅ **Automatic Action Items Extraction**: AI parses journal entries and populates a checkable task checklist in Firestore.
- 🏷️ **Automated Verification Label**: Service deployed on Cloud Run with `--set-labels=dev-tutorial=cloud-run-ai-challenge`.

---

## 🏗️ Architecture & Security Model

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          Client Browser                                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │   Harmony-based UI (Next.js 15, Tailwind, Framer Motion, Radix)  │  │
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

## 🛡️ Firestore Security Rules (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🔑 Secret Manager Setup & Cloud Run IAM Binding

To ensure no API keys are hardcoded:

```bash
# 1. Create the Secret Manager secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic" --project=ai-barista-track-1

# 2. Add secret version containing your Gemini API Key
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=- --project=ai-barista-track-1

# 3. Grant Secret Manager Accessor role to the Cloud Run service identity
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:personal-gemini-journal-sa@ai-barista-track-1.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=ai-barista-track-1
```

---

## 🚀 Cloud Run Deployment Command

```bash
# Deploy to Google Cloud Run with the mandatory challenge verification label
gcloud run deploy personal-gemini-journal \
  --source . \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --service-account personal-gemini-journal-sa@ai-barista-track-1.iam.gserviceaccount.com \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-labels dev-tutorial=cloud-run-ai-challenge \
  --project ai-barista-track-1
```

---

## 💻 Local Development Setup

```bash
# Clone the repository
git clone https://github.com/DevRanbir/personal-gemini-journal.git
cd personal-gemini-journal

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application in browser.

---

## 🔒 Security Verification Matrix

| Test Scenario | Description | Expected Result | Status |
| :--- | :--- | :--- | :---: |
| **Unauthenticated Route Block** | Access `/journal` without Firebase Sign-In | Redirected to `/login` | ✅ Passed |
| **Cross-User Firestore Read** | User A queries `/users/UserB_UID/interactions` | Permission Denied by Security Rules | ✅ Passed |
| **Cross-User Firestore Write** | User A writes to `/users/UserB_UID/action_items` | Permission Denied by Security Rules | ✅ Passed |
| **Secret Key Inspection** | Inspect browser network tabs and JS bundles | `GEMINI_API_KEY` is completely absent | ✅ Passed |
| **Challenge Verification Tag** | Inspect Cloud Run service metadata labels | `dev-tutorial=cloud-run-ai-challenge` present | ✅ Passed |
