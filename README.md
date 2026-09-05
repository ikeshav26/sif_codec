# SIF — Secure Image Format Codec

> **SIF (Secure Image Format)** is a zero-trust cryptographic image container and authorization protocol where **possession of an image file does not grant permission to view it**. Every `.sif` container binds the owner's identity to the ciphertext using AEAD envelope encryption (AES-256-GCM / ChaCha20-Poly1305 + AES KeyWrap) and a 140-byte tamper-proof signed binary header (Ed25519). Decryption is never static: it requires dynamic authorization from the verified creator, ensuring end-to-end provenance at rest, in transit, and across third-party applications.

---

## The SIF Ecosystem Flow

```text
  Raw Image (PNG / JPG / WebP)
              ↓
  [ SIF Studio ]  ← Authenticated via Google OAuth
              ↓
  Rust Core Engine encodes into .sif:
  • 140-byte Binary Header (UUID, Owner Hash, KEK ID)
  • AEAD Payload Encryption (AES-256-GCM)
  • Ed25519 Digital Signature
              ↓
  Encrypted .sif Binary Container
              ↓
  Shared via Next.js Chat App
              ↓
  Non-Creator Forwarding Detected
              ↓
  Interactive Authorization Email via Resend (security@ikeshav.in)
              ↓
  Owner clicks "Approve"
              ↓
  Live On-the-Fly Decryption & In-Chat Visual Rendering
```

---

## .SIF Binary Container Anatomy

A `.sif` file is a structured, zero-copy binary container divided into three contiguous sections: **Header**, **Payload**, and **Footer**.

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           SIF BINARY CONTAINER LAYOUT                             │
├────────────────────────┬───────────────────────────────────┬──────────────────────┤
│    HEADER (140 B)      │         PAYLOAD (N Bytes)         │     FOOTER (80 B)    │
│  Tamper-Proof Metadata │      Encrypted Image Data         │ Integrity & Provenance│
└────────────────────────┴───────────────────────────────────┴──────────────────────┘
```

### 1. Header Layout (140 Bytes Fixed)
Passed as Additional Authenticated Data (AAD) to prevent any header tampering.

```text
+-----------------------+---------+-------------------------------------------------+
| Field Name            | Size    | Description                                     |
+-----------------------+---------+-------------------------------------------------+
| Magic Bytes           | 4 B     | Protocol identifier: 'SIF\x01' (0x53494601)      |
| Version               | 1 B     | SIF format version (0x01)                       |
| Cipher Suite          | 1 B     | 0x01 = AES-256-GCM, 0x02 = ChaCha20-Poly1305    |
| Flags                 | 2 B     | Bitfield for security & compression policies    |
| Image UUID            | 16 B    | Unique 128-bit container asset identifier       |
| Owner Identity Hash   | 32 B    | SHA-256 hash of the creator's identity          |
| KEK ID                | 16 B    | Server Key Encryption Key identifier            |
| Nonce / IV            | 12 B    | Cryptographic initialization vector             |
| Wrapped DEK           | 48 B    | NIST AES Key Wrap of Data Encryption Key        |
| Payload Length        | 8 B     | u64 little-endian byte length of ciphertext     |
+-----------------------+---------+-------------------------------------------------+
| TOTAL HEADER SIZE     | 140 B   | Authenticated Additional Data (AAD)             |
+-----------------------+---------+-------------------------------------------------+
```

### 2. Payload (N Bytes Variable)
- **Encrypted Image Ciphertext**: The raw image bytes (PNG, JPEG, WebP) encrypted using the ephemeral 256-bit DEK under the chosen AEAD cipher suite, bound to the 140-byte header via AAD.

### 3. Footer Layout (80 Bytes Fixed)
- **AEAD Auth Tag (16 Bytes)**: Cryptographic MAC ensuring payload and header authenticity.
- **Ed25519 Digital Signature (64 Bytes)**: Asymmetric signature computed by the SIF Authority over `Header + Payload + Auth Tag` to guarantee zero-tamper provenance.

---

## Core Architecture

- **Rust Core Engine (`crates/sif-core`)**: High-performance zero-copy binary encoder, decoder, and cryptographic verification library.
- **Node-API Native Bindings (`crates/sif-node`)**: Native C/Rust addon bindings via `@napi-rs/cli` allowing Node.js/TypeScript to call the Rust codec directly at native speed.
- **Backend API (`backend/`)**: Express TypeScript service for SIF container registration, user authentication, and secure access gates.
- **SIF Studio (`app/`)**: React + Vite frontend for converting images into `.sif` files, viewing vault metrics, and inspecting cryptographic headers.
- **Decentralized Chat App (`chat-app/`)**: Next.js application demonstrating Zero-DB cryptographic verification, interactive owner email approvals, and in-chat decrypted image rendering with high-resolution lightbox previews.

---

## Building and Linking @sif/node to Node Modules

The project uses `@sif/node` (located in `crates/sif-node`), which compiles Rust code into a native `.node` binary using N-API (`@napi-rs/cli`).

### Step 1: Compile the Rust Native Addon
Run the build script from the project root:

```bash
pnpm --filter @sif/node build
```

Alternatively, from the crate directory:

```bash
cd crates/sif-node
pnpm build
```

This compiles the Rust engine into release mode and outputs the platform-specific native binary (e.g., `sif-node.linux-x64-gnu.node`) along with the TypeScript definition files (`index.d.ts` and `index.js`).

### Step 2: Link to Workspace Packages
In `backend/package.json` and `chat-app/package.json`, `@sif/node` is specified as a workspace dependency:

```json
{
  "dependencies": {
    "@sif/node": "workspace:*"
  }
}
```

Running `pnpm install` in the root automatically symlinks `crates/sif-node` into each package's `node_modules/@sif/node`, allowing direct imports in TypeScript:

```typescript
import { encodeSif, decodeSif, inspectSif } from "@sif/node";
```

---

## Quick Start

### 1. Install Dependencies & Build Native Rust Addon
```bash
pnpm install
pnpm --filter @sif/node build
```

### 2. Start All Services
```bash
pnpm dev
```

This starts all three services simultaneously:
- **Backend API**: `http://localhost:3000`
- **SIF Studio**: `http://localhost:5173`
- **Chat App**: `http://localhost:3001`

---

## Testing Guide

For comprehensive step-by-step test scenarios (including Google login, `.sif` encoding, forwarding, email approvals, and in-chat rendering), see the **[Verification & Test Manual](tests/README.md)**.
