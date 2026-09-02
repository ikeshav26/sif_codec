# Secure Image Codec

## SIF — Secure Image Format

A security-focused image format and authorization protocol where **possession of an image does not grant permission to view or use it**.

SIF makes image ownership, cryptographic protection, and granular access control native properties of the image ecosystem.

Instead of treating an image as:

```text
image → anyone who possesses file can view it
```

SIF enforces:

```text
image
  ↓
owner identity
  ↓
envelope encryption (DEK + KEK)
  ↓
tamper-proof SIF container
  ↓
authorization request
  ↓
owner approval (time-bound / policy-driven)
  ↓
ephemeral in-memory decryption & viewing
```

The first version of this project will be a working prototype consisting of:

* A custom `.sif` binary container format
* A high-performance Rust-based SIF encoder/decoder engine
* Authenticated Envelope Encryption (AES-256-GCM / ChaCha20-Poly1305 + AES-KeyWrap)
* Digital signatures (Ed25519) and cryptographic integrity verification
* User authentication using OAuth 2.0 / OpenID Connect
* A secure backend API with ephemeral authorization grant tokens
* Protected SIF object storage
* A mobile application (Expo / React Native) for image owners to manage and approve/deny requests
* Push notifications for real-time access requests
* A Next.js chat application and embedded secure web viewer for testing SIF
* Granular access control (single-use, time-bound, revocable)

---

# 1. Project Vision

Traditional image formats such as:

```text
.jpg
.jpeg
.png
.webp
```

primarily describe how image pixels and metadata are compressed and encoded.

They do not inherently provide an application-level mechanism for:

* Cryptographically binding the owner's identity
* Encrypting the image payload at rest and in transit
* Requesting permission to view
* Approving usage with time-limited or single-use policies
* Instant, centralized revocation of access
* Verifying container integrity against unauthorized tampering

SIF experiments with combining **binary container encoding, authenticated cryptography, identity, and dynamic authorization** into one ecosystem.

The long-term vision is:

```text
                 SIF Ecosystem

                      Image
                        │
                        ▼
                ┌───────────────┐
                │   SIF Format  │
                └───────┬───────┘
                        │
              ┌─────────┼─────────┐
              │         │         │
              ▼         ▼         ▼
          Encryption Ownership Authorization
              │         │         │
              └─────────┼─────────┘
                        │
                        ▼
            Controlled Ephemeral Use
```

The initial prototype operates inside our own applications.

Future versions can investigate zero-knowledge client-side decryption (via WebAssembly / native secure enclaves) and cross-platform protocol interoperability.

---

# 2. Important Scope of the Prototype

The first version is **not** intended to magically prevent all external platforms from receiving `.sif` files.

For example:

```text
Alice → uploads SIF
Alice → sends SIF through WhatsApp or Email
```

External platforms may:

* Reject the `.sif` extension
* Treat it as an opaque binary document
* Allow it to be transferred without rendering it

This is expected and intended.

The SIF ecosystem guarantees that **even if the `.sif` file is leaked, shared on public torrents, or sent through unencrypted channels, nobody can decrypt or view the image without a valid authorization grant from the owner**.

The prototype provides its own verified environment:

```text
SIF Mobile App (Owner Control Center)
       +
SIF Backend API & KMS (Auth & Policy Engine)
       +
Rust SIF Core (Encoding, Cryptography & Validation)
       +
SIF Web Viewer & Chat Application (Consumer Interface)
```

---

# 3. Core Principle

The foundational security axiom of SIF is:

> **Possessing the protected container file does not grant access to the underlying image.**

Therefore:

```text
Possession of SIF file
         ≠
Permission to view image
```

A user must obtain a cryptographically verifiable authorization grant from the owner before the system permits decryption and rendering.

---

# 4. Prototype Architecture

The prototype consists of two user-facing applications, a backend coordination service, and a high-performance Rust SIF core.

```text
                         ┌─────────────────────────┐
                         │   Mobile App (Owner)    │
                         │      Expo / RN          │
                         │                         │
                         │ OAuth Login             │
                         │ Image Protection / Upload│
                         │ Manage Access Grants    │
                         │ Real-time Approve/Deny  │
                         └────────────┬────────────┘
                                      │
                                      │ HTTPS
                                      ▼
                         ┌─────────────────────────┐
                         │       API Backend       │
                         │  (Express / TypeScript) │
                         │                         │
                         │ Auth & User Management  │
                         │ Image & Grant Metadata  │
                         │ KMS / Key Wrapping      │
                         │ Ephemeral Viewing Tokens│
                         │ Push Notification Hub   │
                         └───────┬─────────┬───────┘
                                 │         │
                    ┌────────────┘         └─────────────┐
                    ▼                                    ▼
             ┌─────────────┐                      ┌─────────────┐
             │ PostgreSQL  │                      │ SIF Storage │
             │             │                      │ (Local/S3)  │
             │ Users       │                      │             │
             │ Images      │                      │ *.sif files │
             │ Grants      │                      │ (Encrypted) │
             │ Audit Logs  │                      └─────────────┘
             └─────────────┘                             │
                                 │                       │
                                 ▼                       ▼
                         ┌─────────────────────────────────┐
                         │          Rust SIF Core          │
                         │                                 │
                         │ Binary Packing / Unpacking      │
                         │ AEAD Encryption / Decryption    │
                         │ DEK Wrap / Unwrap               │
                         │ Ed25519 Sign / Verify           │
                         │ Tamper & Nonce Validation       │
                         └─────────────────────────────────┘
                                         ▲
                                         │ Ephemeral Decryption Stream
                                         │ (Only upon verified Grant)
                         ┌───────────────┴─────────┐
                         │   Next.js Chat & Viewer │
                         │                         │
                         │ User Messaging          │
                         │ SIF File Sharing        │
                         │ Access Request Trigger  │
                         │ Ephemeral Image Canvas  │
                         └─────────────────────────┘
```

---

# 5. Technology Stack

## Core SIF Engine: Rust
Rust is responsible for all performance- and security-critical tasks:
* Binary format serialization and deserialization
* Memory-safe parsing with strict boundary checking
* Authenticated Encryption with Associated Data (AEAD)
* Digital signature generation and verification
* Cryptographic hashing and key derivation
* Zero-copy parsing and in-memory streaming

The project assumes **zero previous Rust experience**, learning language fundamentals progressively while building the format.

## API Backend: Node.js / Express / TypeScript
* OAuth 2.0 / OpenID Connect integration
* Permission rules, access grant generation, and expiration tracking
* Key management integration (Master Key / KEK wrapping)
* Real-time notifications (SSE / WebSockets / WebPush / APNs)
* Secure proxying to the Rust SIF engine

## Storage: Object Storage + PostgreSQL
* **PostgreSQL**: Stores relational metadata (users, image records, grant policies, audit trails).
* **Object Storage**: Stores opaque, encrypted `.sif` files (local directory for dev, S3/MinIO/R2 for prod).

## Mobile App: Expo / React Native (TypeScript)
* Owner control dashboard
* Native push notification handlers with action buttons (Approve / Deny)
* Upload & protect images directly from camera roll

## Consumer Client: Next.js (TypeScript)
* Multi-user chat simulator for sending `.sif` files
* Embedded secure viewer (`/view/[id]`) with ephemeral canvas rendering and anti-caching headers

---

# 6. Backend & Key Management

The backend coordinates authentication, policy enforcement, and key wrapping.

### Key Management Hierarchy
To prevent master keys from being stored inside `.sif` files or client applications:

```text
┌────────────────────────────────────────────────────────┐
│ Master Key Encryption Key (KEK)                        │
│ Stored in secure backend environment / Keyring / KMS   │
└──────────────────────────┬─────────────────────────────┘
                           │ Wraps / Unwraps
                           ▼
┌────────────────────────────────────────────────────────┐
│ Data Encryption Key (DEK)                              │
│ 256-bit cryptographically random key generated per-file│
│ Stored inside SIF container in encrypted (wrapped) form│
└──────────────────────────┬─────────────────────────────┘
                           │ Encrypts / Decrypts
                           ▼
┌────────────────────────────────────────────────────────┐
│ Original Image Payload (JPEG / PNG / WebP)             │
└────────────────────────────────────────────────────────┘
```

Responsibilities:
* Never store plain OAuth passwords.
* Never store unwrapped DEKs in the database.
* Enforce authorization before touching cryptographic keys.
* Issue short-lived, signed viewing tokens (TTL: 60 seconds) once an owner approves access.

---

# 7. Database Architecture

PostgreSQL stores metadata, authorization rules, and audit logs.

### Schema Tables

```text
users
  ├── id (UUID, PK)
  ├── email (VARCHAR, Unique)
  ├── full_name (VARCHAR)
  ├── oauth_provider (VARCHAR)
  ├── oauth_subject_id (VARCHAR)
  └── created_at (TIMESTAMP)

images
  ├── id (UUID, PK)
  ├── owner_id (UUID, FK -> users.id)
  ├── storage_key (VARCHAR)
  ├── content_hash (BYTEA / VARCHAR)
  ├── kek_id (VARCHAR)
  ├── original_mime_type (VARCHAR)
  ├── original_byte_size (BIGINT)
  └── created_at (TIMESTAMP)

usage_requests
  ├── id (UUID, PK)
  ├── image_id (UUID, FK -> images.id)
  ├── requester_id (UUID, FK -> users.id)
  ├── purpose (TEXT)
  ├── status (ENUM: PENDING, APPROVED, DENIED, EXPIRED, REVOKED)
  ├── requested_at (TIMESTAMP)
  ├── responded_at (TIMESTAMP)
  └── expires_at (TIMESTAMP)

grants
  ├── id (UUID, PK)
  ├── request_id (UUID, FK -> usage_requests.id)
  ├── image_id (UUID, FK -> images.id)
  ├── grantee_id (UUID, FK -> users.id)
  ├── grant_token_hash (VARCHAR)
  ├── max_views (INT DEFAULT 1)
  ├── view_count (INT DEFAULT 0)
  ├── valid_from (TIMESTAMP)
  ├── valid_until (TIMESTAMP)
  └── is_revoked (BOOLEAN DEFAULT FALSE)

audit_logs
  ├── id (UUID, PK)
  ├── event_type (ENUM: UPLOAD, REQUEST, APPROVE, DENY, VIEW, REVOKE)
  ├── user_id (UUID, FK -> users.id)
  ├── image_id (UUID, FK -> images.id)
  ├── ip_address (VARCHAR)
  └── timestamp (TIMESTAMP)
```

---

# 8. SIF File Format (Binary Specification)

The `.sif` format is a deterministic, versioned, tamper-proof binary container.

### Container Layout (V1)

```text
+-------------------------------------------------------------------------+
| SIF HEADER (140 Bytes)                                                  |
+-------------------+----------------+------------------------------------+
| Field             | Size           | Description                        |
+-------------------+----------------+------------------------------------+
| Magic Bytes       | 4 Bytes        | ASCII "SIF\x01" (0x53 0x49 0x46 0x01)|
| Format Version    | 1 Byte         | Unsigned uint8 (0x01)              |
| Cipher Suite ID   | 1 Byte         | 0x01: AES-256-GCM, 0x02: ChaCha20  |
| Header Flags      | 2 Bytes        | Bitflags (compression, payload type|
| Image UUID        | 16 Bytes       | 128-bit UUID of image              |
| Owner ID Hash     | 32 Bytes       | SHA-256 hash of Owner Identity     |
| KEK Key ID        | 16 Bytes       | Identifier of Master Key used      |
| AEAD Nonce / IV   | 12 Bytes       | Cryptographically random 96-bit IV |
| Wrapped DEK       | 48 Bytes       | AES-KW wrapped 256-bit DEK         |
| Payload Length    | 8 Bytes        | Uint64 Little-Endian payload length|
+-------------------+----------------+------------------------------------+
| ENCRYPTED PAYLOAD (N Bytes)                                             |
+-------------------------------------------------------------------------+
| Authenticated Ciphertext of original image (JPEG/PNG/WebP)              |
+-------------------------------------------------------------------------+
| INTEGRITY FOOTER (80 Bytes)                                             |
+-------------------+----------------+------------------------------------+
| AEAD Auth Tag     | 16 Bytes       | 128-bit Poly1305 / GCM Tag         |
| Digital Signature | 64 Bytes       | Ed25519 Signature over all above   |
+-------------------+----------------+------------------------------------+
```

### Additional Authenticated Data (AAD)
To prevent attackers from altering the Header (e.g. swapping the Image ID or Owner ID), the entire 140-byte **SIF Header is passed as AAD** into the AEAD cipher. Any tampering with the header will cause AEAD authentication to fail immediately.

---

# 9. Cryptographic Primitives

No custom cryptography is invented. SIF relies on audited primitives from the Rust cryptography ecosystem (`ring` / `rust-crypto` / `aes-gcm` / `ed25519-dalek`):

1. **Payload Encryption (AEAD)**:
   * `AES-256-GCM` or `ChaCha20-Poly1305`
   * Provides confidentiality, authenticity, and integrity.
   * Every file is encrypted with a unique 256-bit DEK and a unique 96-bit random Nonce.
2. **Key Wrapping**:
   * `NIST SP 800-38F AES Key Wrap (KW)` to wrap the DEK with the server KEK.
3. **Container Signature**:
   * `Ed25519` high-speed asymmetric signature.
   * Proves the container was constructed and sealed by the legitimate SIF authority.
4. **Content Integrity**:
   * `SHA-256` digest over original plaintext bytes stored in metadata for tamper detection.

---

# 10. SIF Encoding & Decoding Flows

### Secure Encoding Flow
```text
Original Image (e.g., photo.jpg)
       │
       ▼
1. Validate format & bounds
2. Generate Image UUID & SHA-256 Content Hash
3. Generate fresh 256-bit random DEK
4. Generate fresh 96-bit random AEAD Nonce
5. Encrypt DEK using Server KEK (Key Wrap) -> Wrapped DEK
6. Construct SIF Header (Magic, Version, Flags, UUID, Owner, KEK ID, Nonce, Wrapped DEK, Length)
7. Encrypt Image Bytes using DEK with Header as AAD -> Ciphertext + 16-byte Auth Tag
8. Sign (Header + Ciphertext + Auth Tag) with Ed25519 Private Key -> 64-byte Signature
9. Assemble into binary .sif container
       │
       ▼
Output: photo.sif
```

### Secure Decoding Flow (Strict Pipeline)
```text
Input: photo.sif + Ephemeral Viewing Grant
       │
       ▼
1. Verify minimum file length (≥ 222 bytes)
2. Read & Validate Magic Bytes ("SIF\x01") and Version (0x01)
3. Parse Header fields with strict boundary checks
4. Verify Ed25519 Digital Signature over (Header + Ciphertext + Auth Tag)
       │ [Fail -> REJECT IMMEDIATELY]
       ▼
5. Verify Ephemeral Viewing Grant (is valid, not expired, view_count < max_views)
       │ [Fail -> REJECT WITH 403 FORBIDDEN]
       ▼
6. Unwrap DEK using Server KEK
7. Authenticate & Decrypt Ciphertext using DEK, Nonce, Header (AAD), and Auth Tag
       │ [Fail -> REJECT: CORRUPTED / TAMPERED]
       ▼
8. Ephemeral in-memory stream to authorized canvas (Record audit log & increment view_count)
```

---

# 11. Rust SIF Core Module Architecture

```text
sif-core/
└── src/
    ├── lib.rs          # Crate entrypoint & public API
    ├── format.rs       # Binary layout definitions, magic bytes & constants
    ├── header.rs       # Zero-copy header parser and serializer
    ├── crypto/
    │   ├── mod.rs
    │   ├── aead.rs     # AES-GCM and ChaCha20-Poly1305 AEAD routines
    │   ├── keywrap.rs  # NIST AES-KW envelope wrapping
    │   └── signature.rs# Ed25519 keypair handling, signing & verification
    ├── encoder.rs      # High-level SIF container encoder
    ├── decoder.rs      # High-level SIF container validator & decoder
    ├── validation.rs   # Strict bounds, version, and invariant checking
    └── error.rs        # Comprehensive, typed error enum (thiserror)
```

---

# 12. Rust Learning Roadmap

For developers new to Rust, concepts should be learned in strict logical dependency order:

```text
1. Cargo & Project Setup (cargo new, cargo test)
       ↓
2. Primitive Types & Immutability vs Mutability
       ↓
3. Functions & Memory Layout (Stack vs Heap)
       ↓
4. Ownership, Moves, and Slices (&[u8])
       ↓
5. References & Borrowing Rules
       ↓
6. Structs, Enums & Pattern Matching
       ↓
7. Error Handling: Result<T, E>, Option<T>, and the ? Operator
       ↓
8. Traits & Generics (Read, Write, TryFrom)
       ↓
9. Vec<u8> and Binary Buffer Manipulation (byteorder / nom)
       ↓
10. Modules & Crate Organization
       ↓
11. Unit Testing & Property-Based Fuzzing
       ↓
12. Integration with Cryptographic Crates (ring, aes-gcm, ed25519-dalek)
```

---

# 13. End-to-End User Journey (Alice & Bob)

```text
+------------------+         +-------------------+         +------------------+
| Alice (Mobile)   |         | SIF Backend & DB  |         | Bob (Chat/Viewer)|
+--------+---------+         +---------+---------+         +--------+---------+
         |                             |                            |
         | 1. Upload & Protect image   |                            |
         |---------------------------->| (Saves .sif to storage)    |
         |                             |                            |
         |                             | 2. Alice sends photo.sif   |
         |                             |    in test chat            |
         |                             |--------------------------->|
         |                             |                            |
         |                             | 3. Bob sees locked preview |
         |                             |    and clicks "Request"    |
         |                             |<---------------------------|
         |                             |                            |
         | 4. Push Notification:       |                            |
         |    "Bob requested access"   |                            |
         |<----------------------------|                            |
         |                             |                            |
         | 5. Alice selects:           |                            |
         |    [APPROVE: 5 min / 1 view]|                            |
         |---------------------------->| (Creates Grant Record)     |
         |                             |                            |
         |                             | 6. Real-time Grant Event   |
         |                             |    (SSE/WebSocket)         |
         |                             |--------------------------->|
         |                             |                            |
         |                             | 7. GET /images/:id/render  |
         |                             |    (Presents Grant Token)  |
         |                             |<---------------------------|
         |                             |                            |
         |                             | 8. Verify SIF Signature    |
         |                             |    Unwrap DEK & Decrypt    |
         |                             |    (Rust SIF Core)         |
         |                             |                            |
         |                             | 9. Ephemeral Stream        |
         |                             |--------------------------->|
         |                             | (Render on canvas)         |
```

---

# 14. Access Control Policies & Revocation

The permission engine supports fine-grained access policies:

* **Single-Use Viewing**: Grant expires immediately after 1 successful decryption.
* **Time-Bound Viewing**: Valid for a defined duration (e.g., 5 minutes, 1 hour, 24 hours).
* **Instant Revocation**: When the owner taps "Revoke", the grant record is marked revoked in PostgreSQL. Any subsequent attempt to decode the SIF file is rejected immediately, even if the `.sif` file is cached on Bob's computer.

---

# 15. Security & Threat Model

### Threats Mitigated by SIF
1. **Unauthorized File Possession**: Anyone intercepting `image.sif` cannot read pixels without an unwrapped DEK.
2. **Metadata & Header Tampering**: Altering Owner ID or Image ID breaks both the Ed25519 signature and the AEAD Authentication Tag (passed as AAD).
3. **Ciphertext Bit-Flipping**: Protected by Poly1305 / GCM 128-bit authentication tags.
4. **Replay & Stale Access**: Ephemeral grant tokens prevent reusing past viewing authorizations.
5. **Key Exposure**: Clients never hold master KEKs.

### Explicit Limitations (Out of Scope for V1)
* **Screen capture / Physical cameras**: Once an image is rendered on a physical screen, analog capture is possible. Future research includes dynamic visual watermarking and hardware DRM.
* **Plaintext Export**: If an authorized viewer takes a screenshot and saves as `.png`, SIF protection cannot govern the newly created external file.

---

# 16. Development Milestones

### Milestone 0 — Environment & Project Setup
* Install Rust toolchain (stable) and configure Cargo workspace.
* Set up Git pre-commit hooks and testing harnesses.

### Milestone 1 — Rust Fundamentals & Binary I/O
* Learn Ownership, Borrowing, Slices, Structs, and Enums.
* Build sample binary parsers for simple file formats.

### Milestone 2 — SIF V0: Container Packaging (Unencrypted)
* Implement binary packing/unpacking of SIF header and unencrypted payload.
* Unit tests for endianness, magic bytes, and boundary checks.

### Milestone 3 — SIF Authenticated Encryption (AEAD)
* Integrate `aes-gcm` or `chacha20poly1305` + AES Key Wrap.
* Test that corrupted payloads or modified headers fail decryption.

### Milestone 4 — Digital Signatures & Integrity
* Integrate `ed25519-dalek` for container signing and verification.
* Benchmark verification speed and test against tampered files.

### Milestone 5 — Rust SIF Core Service / FFI
* Expose Rust functions via a lightweight HTTP microservice or native Node-API bindings.

### Milestone 6 — Backend API & PostgreSQL Database
* Build Express/TypeScript server with PostgreSQL migrations.
* Implement OAuth 2.0 authentication and Master Key (KEK) management.

### Milestone 7 — Mobile App (Expo / React Native)
* Build Owner Dashboard: Image upload, permission list, and access logs.

### Milestone 8 — Push Notifications & Real-Time Sync
* Implement WebPush/FCM notifications for instant approval/denial triggers.

### Milestone 9 — Chat Application & Secure Web Viewer
* Build Next.js chat interface for transferring `.sif` files.
* Build `/view/[id]` route with ephemeral in-memory canvas rendering.

### Milestone 10 — End-to-End Integration & Security Audit
* Execute full end-to-end user journeys (Alice upload -> Bob request -> Alice approve -> Bob view).
* Perform fuzzing and security validation on the Rust SIF parser.

---

# 17. Definition of Done (V1)

- [ ] User can authenticate via OAuth 2.0.
- [ ] User can protect and upload an image, converting it into a valid `.sif` binary container.
- [x] `.sif` binary header complies with the 140-byte specification.
- [ ] Image payload is encrypted using AEAD with a unique DEK and random Nonce.
- [ ] SIF container is signed using Ed25519; tampered files are rejected.
- [ ] Encrypted SIF files are stored separately from relational metadata.
- [ ] SIF files can be shared in the Next.js chat application.
- [ ] Non-authorized recipients cannot view the protected image.
- [ ] Recipients can submit access requests with an optional purpose.
- [ ] Owners receive real-time push notifications on the mobile app.
- [ ] Owners can approve (with time/view constraints) or deny requests.
- [ ] Approved recipients can view the image ephemerally; denied recipients are blocked.
- [ ] Owner can instantly revoke active permissions.
- [ ] Comprehensive unit and integration test suite passes across Rust Core and Backend.

---

# 18. Current Implementation Progress & Tracker

### Completed So Far (Rust Core Engine — `crates/sif-core`)
- [x] **Workspace & Crate Setup**: Initialized Cargo workspace with `crates/sif-core`.
- [x] **Error Subsystem (`src/error.rs`)**:
  - Defined `SifError` enum covering all protocol failure modes (`FileTooSmall`, `InvalidMagicBytes`, `UnsupportedVersion`, `UnsupportedCipher`, `PayloadLengthMismatch`, `InvalidSignature`, `DecryptionFailed`, `IoError`).
  - Implemented `std::fmt::Display` and `std::error::Error` along with `Result<T>` type alias.
- [x] **Format Specification & Constants (`src/format.rs`)**:
  - Declared constants: `SIF_MAGIC` (`SIF\x01`), `SIF_VERSION_1` (`0x01`), `HEADER_SIZE` (140 B), `FOOTER_SIZE` (80 B), `MIN_CONTAINER_SIZE` (220 B), and all field offsets.
  - Defined `CipherSuite` enum (`Aes256Gcm = 0x01`, `ChaCha20Poly1305 = 0x02`) with `TryFrom<u8>` and `From<CipherSuite> for u8`.
- [x] **SIF Header Parser & Serializer (`src/header.rs`)**:
  - Structured `SifHeader` model with 10 fields.
  - Implemented `to_bytes(&self) -> [u8; HEADER_SIZE]` (binary packing with little-endian integer encoding).
  - Implemented `from_bytes(bytes: &[u8]) -> Result<Self>` (strict bounds checking, magic verification, version check, cipher suite check, zero-copy byte extraction).
  - Implemented `TryFrom<&[u8]> for SifHeader`.
  - Added unit tests for round-trip serialization/deserialization and invalid magic rejection (all tests passing).

---

# 19. Next Steps (Planned for Next Session)

```text
┌────────────────────────────────────────────────────────────────────────┐
│ NEXT SESSION ROADMAP                                                   │
├────────────────────────────────────────────────────────────────────────┤
│ 1. SIF Footer Implementation (crates/sif-core/src/footer.rs)           │
│    - Define SifFooter (16 B AEAD Auth Tag + 64 B Ed25519 Signature)   │
│    - Implement to_bytes() and from_bytes() with boundary validation    │
│                                                                        │
│ 2. Container Slicing & Validation (crates/sif-core/src/container.rs)   │
│    - Parse complete .sif binary into (SifHeader, PayloadSlice, Footer) │
│    - Verify total length >= 220 bytes & payload length consistency     │
│                                                                        │
│ 3. Cryptography Integration (crates/sif-core/src/crypto/)             │
│    - Add crates: aes-gcm, chacha20poly1305, aes-kw, ed25519-dalek     │
│    - Implement AEAD Encrypt/Decrypt with Header as AAD                │
│    - Implement NIST SP 800-38F DEK Key Wrapping (KEK)                 │
│    - Implement Ed25519 digital signature seal & verification           │
│                                                                        │
│ 4. High-Level Pipeline (encoder.rs & decoder.rs)                       │
│    - Raw Image bytes -> sealed .sif binary container                  │
│    - Sealed .sif binary container + KEK -> decrypted image in RAM      │
└────────────────────────────────────────────────────────────────────────┘
```

