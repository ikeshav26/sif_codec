# SIF Codec - Verification & Test Manual

This document outlines the step-by-step testing procedures to validate all components of the SIF (Secure Image Format) ecosystem: **Rust Core Engine**, **Backend API**, **Resend Security Authorization**, **SIF Studio Web App**, and the **Next.js SIF Chat App**.

---

## Quick End-to-End Workflow (How to Test)

1. **Start all servers**: Run `pnpm dev` in the project root.
2. **Login with Google**: Open **SIF Studio** at `http://localhost:5173` and sign in with your Google account to establish your creator identity.
3. **Encode Image to .sif**: Upload any image (PNG/JPG/WebP) in SIF Studio and click **"Encode & Save SIF Container"**. Download the resulting `.sif` container file from the Vault.
4. **Open Chat App**: Navigate to `http://localhost:3001`.
5. **Send .sif as Another User (Forwarder)**: Switch identity to **"Bob"** (or another user) and attach the `.sif` container file.
6. **Authorization Email Sent**: The Chat App locks the container in **"Waiting for Owner Approval"** status and automatically sends an authorization email to the original creator via Resend (`SIF Security <security@ikeshav.in>`).
7. **Approve via Email**: The original creator opens the email and clicks **Approve Transfer**.
8. **Real-Time Decrypted Image in Chat**: The chat app detects the approval live, decrypts the `.sif` container on the fly via Rust native bindings, and renders the visual image directly in the chat bubble with an interactive high-resolution Lightbox viewer!

---

## Starting All Services

Run a single command in the project root:

```bash
pnpm dev
```

This launches all 3 servers simultaneously using **concurrently**:
- **Backend API**: `http://localhost:3000`
- **SIF Studio (Frontend)**: `http://localhost:5173`
- **Next.js SIF Chat App**: `http://localhost:3001`

---

## Comprehensive Test Scenarios

---

### Test 1: Google Login, SIF Encoding & On-the-Fly Decryption

**Objective**: Verify converting a standard image (PNG/JPG) into an encrypted `.sif` container and decrypting it on-the-fly in SIF Studio.

1. Navigate to **`http://localhost:5173`**.
2. Click **"Sign in with Google"** and authenticate.
3. In the **Upload & Protect Studio** (Left Panel):
   - Drag and drop any image (e.g., `sample.png`).
   - Click **"Encode & Save SIF Container"**.
4. **Expected Results**:
   - Encoding completes with 100% progress.
   - Container metrics card appears showing **Original Size**, **SIF Size**, and **Overhead Bytes**.
   - A new card appears in the **Secured Vault** (Right Panel).
5. In the **Vault Panel**:
   - Click **"Decrypt"** on the image card.
   - Modal opens and displays the on-the-fly decrypted original image streamed from `/api/images/:id/view`.
   - Click **".SIF"** to download the container binary (`<uuid>.sif`) to your computer for subsequent tests.

---

### Test 2: Binary SIF Header Inspection

**Objective**: Verify that the SIF container header contains correct metadata, AEAD cipher suite, and Ed25519 signature parameters.

1. In the **Vault Panel** (`http://localhost:5173`), locate any secured image card.
2. Click **"Inspect"**.
3. **Expected Results**:
   - **Magic Bytes**: Displays `SIF1` (`0x53494631`).
   - **Version**: `v1`.
   - **Cipher Suite**: `AES-256-GCM (0x01)`.
   - **Owner ID Hash**: 64-character SHA-256 hash of your Google User ID.
   - **Container UUID**: 32-character hex UUID matching the database record.

---

### Test 3: Chat App Creator Direct Post (Instant SIF Verification & Decrypted Rendering)

**Objective**: Verify that when the original creator uploads their own `.sif` container to the Chat App, it is verified instantly and rendered as a visual image.

1. Navigate to **`http://localhost:3001`**.
2. Set identity to **"Alice (Creator)"** (or matching creator email).
3. Click the **Paperclip icon** and attach your `.sif` file.
4. Click **"Send"**.
5. **Expected Results**:
   - Message bubble displays green badge: **`[SIF Verified Creator]`**.
   - The **decrypted image** renders directly inside the chat bubble!
   - Clicking the image opens the **High-Resolution Lightbox Modal** with quick `.sif` download and cryptographic header inspection.

---

### Test 4: Chat App Forwarding & Interactive Email Authorization Flow

**Objective**: Verify the complete provenance security gate: non-creators are held in pending status, receive an authorization email with interactive Approve/Reject buttons, and live unlock renders the decrypted image upon approval.

1. On **`http://localhost:3001`**:
   - Switch identity in the top selector to **"Bob (Forwarder)"** (or enter a non-owner email).
2. Click the **Paperclip icon** and attach the `.sif` container created by User A.
3. Click **"Send"**.
4. **Expected Results**:
   - Message bubble is placed in **"Waiting for Owner Approval"** status.
   - Image stream remains locked (unauthorized viewers cannot decrypt the image).
   - **Resend Email Alert**: An authorization email is automatically dispatched from `SIF Security <security@ikeshav.in>` to the real owner's inbox.
5. **Approve via Email**:
   - The creator opens the email and clicks the blue **"Approve Transfer"** button (or visits the provided verification URL).
   - The verification page displays **"Transfer Authorized Successfully"**.
6. **Live Unlock in Chat**:
   - The Chat App detects the approval in real-time.
   - The message badge updates to **`[SIF Verified (Owner Approved)]`**.
   - The **decrypted image instantly unlocks and renders** in the chat bubble for all participants!

---

### Test 5: Raw SIF Binary Container Verification

**Objective**: Verify the binary format integrity of exported `.sif` files.

1. Download any `.sif` file from SIF Studio or Chat App.
2. Inspect the first 4 bytes using terminal:
   ```bash
   head -c 4 <downloaded_file>.sif
   ```
3. **Expected Result**:
   - Outputs: **`SIF1`** (verifying the `0x53494631` protocol magic bytes).
