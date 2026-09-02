use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum SifError {
    FileTooSmall {
        found: usize,
        expected_minimum: usize,
    },
    InvalidMagicBytes([u8; 4]),
    UnsupportedVersion(u8),
    UnsupportedCipher(u8),
    PayloadLengthMismatch {
        expected: usize,
        actual: usize,
    },
    InvalidSignature,
    DecryptionFailed,
    IoError(String),
}

impl fmt::Display for SifError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SifError::FileTooSmall {
                found,
                expected_minimum,
            } => write!(
                f,
                "File is too small (found {found} bytes, expected at least {expected_minimum} bytes)"
            ),
            SifError::InvalidMagicBytes(bytes) => write!(f, "Invalid SIF magic bytes: {bytes:?}"),
            SifError::UnsupportedVersion(v) => write!(f, "Unsupported SIF version: {v}"),
            SifError::UnsupportedCipher(c) => write!(f, "Unsupported cipher suite ID: {c}"),
            SifError::PayloadLengthMismatch { expected, actual } => write!(
                f,
                "Payload length mismatch: header says {expected} bytes, but found {actual} bytes"
            ),
            SifError::InvalidSignature => write!(
                f,
                "Ed25519 digital signature verification failed: container is tampered or untrusted"
            ),
            SifError::DecryptionFailed => write!(
                f,
                "AEAD authentication/decryption failed: ciphertext corrupted or invalid key"
            ),
            SifError::IoError(msg) => write!(f, "I/O Error: {msg}"),
        }
    }
}

impl std::error::Error for SifError {}
pub type Result<T> = std::result::Result<T, SifError>;
