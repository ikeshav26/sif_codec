# SIF Codec - Frontend Application (Vite + React + Tailwind v4)

A modern, high-performance web client for the **Secure Image Format (SIF)** ecosystem. This frontend interfaces with the SIF backend and Rust codec engine to provide seamless image encoding, encrypted container storage, on-the-fly decryption, and deep container inspection.

---

## 🛠 Tech Stack & Architecture

- **Core**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **UI Components**: shadcn/ui design patterns & Lucide React icons
- **State Management**: Zustand (persisted auth state & image gallery store)
- **Networking**: Axios instance with cookie credentials (`withCredentials: true`) & response interceptors

---

## 🔐 Authentication Flow

1. **Default Route (`/login` / Root Guard)**:
   - Centered minimal glassmorphism card featuring a **"Continue with Google"** button.
   - Initiates OAuth flow targeting `http://localhost:5000/api/auth/google`.
2. **Auth Persistence & Route Guarding**:
   - Zustand `useAuthStore` manages `user`, `token`, and `isAuthenticated`.
   - On app mount, verify authentication status. If authenticated, users are automatically routed to the Home dashboard (`/`). Unauthenticated users are redirected to `/login`.

---

## 🖥 Dashboard Layout Architecture (30 / 70 Split)

The main dashboard is divided into a responsive two-column workspace:

```
+----------------------------------------------------------------------------------------------------+
|  Navbar: Logo, SIF Engine Status, User Profile & Logout                                            |
+----------------------------------------------------+-----------------------------------------------+
|                                                    |                                               |
|  [ 30% WIDTH ]                                     |  [ 70% WIDTH ]                                |
|  ENCODE & UPLOAD ZONE                              |  SECURED SIF VAULT & GALLERY                  |
|                                                    |                                               |
|  - Drag & Drop Image Dropzone                      |  - Grid / List view of encrypted images       |
|  - Supported formats: PNG, JPEG, WebP, etc.        |  - Encrypted badges & UUID identifiers        |
|  - Live encoding status & progress                 |  - Container metadata cards                   |
|  - Real-time compression & overhead stats          |  - Actions:                                   |
|    (Original size vs. SIF container size)          |    • Inspect SIF Header (Magic, KEK, Cipher)  |
|                                                    |    • Decrypt & Preview On-the-Fly             |
|                                                    |    • Download raw .sif container              |
|                                                    |                                               |
+----------------------------------------------------+-----------------------------------------------+
```

### 1. Left Panel (30%) - Encode & Upload Studio
- **Dropzone**: Drag & drop or browse image files of any standard format.
- **Encoding Trigger**: Submits multipart form data (`image`) to `POST /api/images/upload`.
- **Result Metrics**: Displays encoding status, payload overhead, generation timestamp, and unique SIF UUID.

### 2. Right Panel (70%) - Secured SIF Vault
- **Gallery Grid**: Fetches all user-owned secured assets via `GET /api/images`.
- **Card Features**:
  - Encrypted thumbnail placeholder with instant **"Decrypt Preview"** toggle.
  - File size metrics (Original vs Encrypted `.sif`).
- **Interactive Modals**:
  - **SIF Header Inspector**: Displays parsed binary container header data from `GET /api/images/:id` (Magic bytes `SIF1`, cipher suite, owner hash, KEK ID, chunk count).
  - **Secure Downloader**: Triggers direct browser download of `.sif` file via `GET /api/images/:id/download`.
  - **Live Decryption Stream**: Fetches decrypted plaintext image via `GET /api/images/:id/view`.

---

## 📡 Backend API Contract

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/google` | `GET` | Initiates Google OAuth2 redirect |
| `/api/auth/google/callback` | `GET` | OAuth callback returning JWT auth cookie/token |
| `/api/images/upload` | `POST` | Uploads original image, encodes to SIF, stores in DB & disk |
| `/api/images` | `GET` | Fetches all encrypted SIF records for current user |
| `/api/images/:id` | `GET` | Fetches image record and inspected SIF header metadata |
| `/api/images/:id/download` | `GET` | Downloads raw encrypted `.sif` container binary |
| `/api/images/:id/view` | `GET` | Decrypts container on-the-fly and streams inline image |

---

## 🗂 Project Structure

```
app/src/
├── api/
│   ├── client.ts             # Configured Axios instance with interceptors
│   ├── auth.api.ts           # Auth API service calls
│   └── image.api.ts          # SIF upload, fetch, inspect, download calls
├── components/
│   ├── ui/                   # shadcn/ui components (Button, Dialog, Card, etc.)
│   ├── layout/
│   │   ├── Navbar.tsx        # Top navigation header
│   │   └── AppLayout.tsx     # Dashboard wrapper
│   ├── upload/
│   │   ├── UploadZone.tsx    # 30% Left column drag-and-drop encoder
│   │   └── EncodingStats.tsx # Compression / overhead metrics
│   └── vault/
│       ├── ImageGrid.tsx     # 70% Right column encrypted image vault
│       ├── ImageCard.tsx     # Individual SIF asset item
│       ├── HeaderModal.tsx   # SIF container header inspector modal
│       └── DecryptModal.tsx  # On-the-fly plaintext viewer
├── store/
│   ├── useAuthStore.ts       # Global authentication state (Zustand)
│   └── useImageStore.ts      # Encrypted assets state & actions (Zustand)
├── types/
│   └── index.ts              # TypeScript interfaces (Image, SifHeader, User)
├── App.tsx                   # Route guards & page rendering
├── index.css                 # Tailwind v4 theme & custom utilities
└── main.tsx                  # React entrypoint
```

---

## 🚀 Development Setup

```bash
# Install dependencies
pnpm install

# Run Vite dev server
pnpm dev
```
