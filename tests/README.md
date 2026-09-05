# 🧪 SIF Codec - Verification & Test Manual

This document outlines the step-by-step testing procedures to validate all components of the SIF (Secure Image Format) ecosystem: **Rust Codec**, **Backend API**, **Resend Security Alerts**, **SIF Studio Web App**, and the **Decentralized Next.js Chat App (MongoDB)**.

---

## 🚀 Starting All Services Together

Run a single command in the project root:

```bash
pnpm dev
```

This launches all 3 servers simultaneously using **concurrently**:
- 🔵 **Backend API**: `http://localhost:3000`
- 🟢 **SIF Studio (Frontend)**: `http://localhost:5173`
- 🟣 **Next.js SIF Chat App**: `http://localhost:3001`

---

### Alternative: Run Services Individually
- **Backend**: `pnpm dev:backend`
- **Studio**: `pnpm dev:studio`
- **Chat App**: `pnpm dev:chat`

---

## 📋 Test Scenarios

---

### 🧪 Test 1: Image Encoding, Container Storage & On-the-Fly Decryption

**Objective**: Verify converting a standard image (PNG/JPG) into an encrypted `.sif` container and decrypting it on-the-fly.

1. Navigate to **`http://localhost:5173`**.
2. Sign in with your Google Account (**User A**).
3. In the **Left Panel (30% Studio)**:
   - Drag and drop any image (e.g., `sample.png`).
   - Click **"Encode & Save SIF Container"**.
4. **Expected Results**:
   - ✅ Encoding progress reaches 100%.
   - ✅ Container metrics card appears showing **Original Size**, **SIF Size**, and **Overhead Bytes** (+32B header/tag).
   - ✅ New card appears immediately in the **Right Panel (70% Vault)**.
5. In the **Vault Panel**:
   - Click **"Decrypt"** on the newly created card.
   - ✅ Modal opens and displays the on-the-fly decrypted original image streamed from `/api/images/:id/view`.

---

### 🧪 Test 2: Binary SIF Header Inspection

**Objective**: Verify that the SIF container header contains correct metadata and Ed25519 signature parameters.

1. In the **Vault Panel** (`http://localhost:5173`), locate any secured image card.
2. Click **"Inspect"**.
3. **Expected Results**:
   - ✅ **Magic Bytes**: Displays `SIF1` (0x53494631).
   - ✅ **Version**: `v1`.
   - ✅ **Cipher Suite**: `AES-256-GCM (0x01)`.
   - ✅ **Owner ID Hash**: 64-character SHA-256 hash of User A's ID.
   - ✅ **Container UUID**: 32-character hex UUID matching the database record.

---

### 🧪 Test 3: Ownership Conflict & Resend Security Email Alert

**Objective**: Verify that when another user attempts to upload User A's `.sif` file, the backend blocks it with `403 OWNERSHIP_CONFLICT` and dispatches a Resend security alert email to User A.

1. While logged in as **User A** on `http://localhost:5173`:
   - Click **".SIF"** button on an image card to download the raw `image_uuid.sif` file to your computer.
2. Click **"Sign out"** in the top navigation bar.
3. Sign in with a **different Google account** (**User B**).
4. In the **Upload Studio**:
   - Drag and drop the downloaded `image_uuid.sif` file (created by User A).
   - Click **"Verify SIF Ownership & Register"**.
5. **Expected Results**:
   - ❌ **HTTP 403 Forbidden** returned.
   - 🛡️ **UI Alert Card**: Displays **"Ownership Conflict Detected"** with User A's name and masked email (`u***@domain.com`).
   - 📧 **Resend Email**: User A receives a real-time security alert email with subject:
     > `🚨 Security Alert: SIF Container Ownership Violation Detected`
     > Detailing the container UUID, asset name, and timestamp.

---

### 🧪 Test 4: Decentralized Zero-DB SIF Verification (Next.js Chat App)

**Objective**: Verify that a completely separate third-party application (using MongoDB and zero access to the SIF PostgreSQL database) can mathematically verify container creator provenance using the public SIF Authority key.

1. Navigate to **`http://localhost:3001`**.

#### Test 4A: Original Author Verification
1. In the top bar, ensure identity is set to **"Alice (alice@sif.io)"**.
2. Type a message (e.g., *"Here is my verified design container"*).
3. Click the **Paperclip icon** and attach a `.sif` file encoded with Alice's identity hash.
4. Click **"Send"**.
5. **Expected Result**:
   - ✅ Message bubble displays a green badge: **`[🛡️ SIF Verified Creator]`**.

#### Test 4B: Forwarded / Unverified Asset Detection
1. Switch identity in the top bar to **"Bob (bob@sif.io)"**.
2. Type a message (e.g., *"Forwarding Alice's container"*).
3. Attach the exact same `.sif` file (which belongs to Alice).
4. Click **"Send"**.
5. **Expected Result**:
   - ⚠️ Message bubble displays an amber badge: **`[⚠️ Forwarded / Unverified SIF]`**.
   - Click **"Inspect Header"** in the chat bubble to view the container UUID and the embedded owner hash that mismatched Bob's identity.

---

### 🧪 Test 5: Raw SIF Container File Export

**Objective**: Verify downloading raw encrypted `.sif` binary containers.

1. In either the **SIF Studio** (`http://localhost:5173`) or **Chat App** (`http://localhost:3001`):
   - Click **"Download .sif"**.
2. Inspect the downloaded file in a hex editor or terminal:
   ```bash
   head -c 4 <downloaded_file>.sif
   ```
3. **Expected Result**:
   - First 4 bytes output: **`SIF1`**.
