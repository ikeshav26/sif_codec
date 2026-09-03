use aes_gcm::aead::{Aead, KeyInit, Payload};
use aes_gcm::{Aes256Gcm, Key as AesKey, Nonce as AesNonce};
use chacha20poly1305::{ChaCha20Poly1305, Key as ChaKey, Nonce as ChaNonce};

use crate::error::{Result, SifError};
use crate::format::{AUTH_TAG_SIZE, CipherSuite, NONCE_SIZE};

// Encrypts plaintext bytes using the specified CipherSuite (AES-256-GCM or ChaCha20-Poly1305).
pub fn encrypt_payload(
    cipher_suite: CipherSuite,
    key: &[u8; 32],
    nonce: &[u8; NONCE_SIZE],
    aad: &[u8],
    plaintext: &[u8],
) -> Result<(Vec<u8>, [u8; AUTH_TAG_SIZE])> {
    let payload = Payload {
        msg: plaintext,
        aad,
    };

    let ciphertext_with_tag = match cipher_suite {
        CipherSuite::Aes256Gcm => {
            let cipher = Aes256Gcm::new(AesKey::<Aes256Gcm>::from_slice(key));
            let nonce = AesNonce::from_slice(nonce);
            cipher
                .encrypt(nonce, payload)
                .map_err(|_| SifError::DecryptionFailed)?
        }
        CipherSuite::ChaCha20Poly1305 => {
            let cipher = ChaCha20Poly1305::new(ChaKey::from_slice(key));
            let nonce = ChaNonce::from_slice(nonce);
            cipher
                .encrypt(nonce, payload)
                .map_err(|_| SifError::DecryptionFailed)?
        }
    };

    let split_idx = ciphertext_with_tag.len() - AUTH_TAG_SIZE;
    let ciphertext = ciphertext_with_tag[..split_idx].to_vec();
    let auth_tag: [u8; AUTH_TAG_SIZE] = ciphertext_with_tag[split_idx..]
        .try_into()
        .expect("auth tag is exactly 16 bytes");

    Ok((ciphertext, auth_tag))
}

/// Authenticates and decrypts ciphertext bytes using DEK, Nonce, Header (AAD), and Auth Tag.
pub fn decrypt_payload(
    cipher_suite: CipherSuite,
    key: &[u8; 32],
    nonce: &[u8; NONCE_SIZE],
    aad: &[u8],
    ciphertext: &[u8],
    auth_tag: &[u8; AUTH_TAG_SIZE],
) -> Result<Vec<u8>> {
    let mut ciphertext_with_tag = Vec::with_capacity(ciphertext.len() + AUTH_TAG_SIZE);
    ciphertext_with_tag.extend_from_slice(ciphertext);
    ciphertext_with_tag.extend_from_slice(auth_tag);

    let payload = Payload {
        msg: &ciphertext_with_tag,
        aad,
    };

    let plaintext = match cipher_suite {
        CipherSuite::Aes256Gcm => {
            let cipher = Aes256Gcm::new(AesKey::<Aes256Gcm>::from_slice(key));
            let nonce = AesNonce::from_slice(nonce);
            cipher
                .decrypt(nonce, payload)
                .map_err(|_| SifError::DecryptionFailed)?
        }
        CipherSuite::ChaCha20Poly1305 => {
            let cipher = ChaCha20Poly1305::new(ChaKey::from_slice(key));
            let nonce = ChaNonce::from_slice(nonce);
            cipher
                .decrypt(nonce, payload)
                .map_err(|_| SifError::DecryptionFailed)?
        }
    };

    Ok(plaintext)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_aead_aes_gcm_roundtrip() {
        let key = [0x42u8; 32];
        let nonce = [0x11u8; 12];
        let aad = b"fake 140-byte sif header";
        let plaintext = b"Hello, SIF Secure Image!";

        let (ciphertext, tag) =
            encrypt_payload(CipherSuite::Aes256Gcm, &key, &nonce, aad, plaintext).unwrap();

        let decrypted =
            decrypt_payload(CipherSuite::Aes256Gcm, &key, &nonce, aad, &ciphertext, &tag).unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_aead_chacha20_roundtrip() {
        let key = [0x42u8; 32];
        let nonce = [0x11u8; 12];
        let aad = b"fake 140-byte sif header";
        let plaintext = b"Hello, SIF with ChaCha20!";

        let (ciphertext, tag) =
            encrypt_payload(CipherSuite::ChaCha20Poly1305, &key, &nonce, aad, plaintext).unwrap();

        let decrypted = decrypt_payload(
            CipherSuite::ChaCha20Poly1305,
            &key,
            &nonce,
            aad,
            &ciphertext,
            &tag,
        )
        .unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_aead_tampered_header_fails() {
        let key = [0x42u8; 32];
        let nonce = [0x11u8; 12];
        let aad_original = b"header with owner Alice";
        let aad_tampered = b"header with owner Bob__";
        let plaintext = b"Secret image data";

        let (ciphertext, tag) = encrypt_payload(
            CipherSuite::Aes256Gcm,
            &key,
            &nonce,
            aad_original,
            plaintext,
        )
        .unwrap();

        let result = decrypt_payload(
            CipherSuite::Aes256Gcm,
            &key,
            &nonce,
            aad_tampered,
            &ciphertext,
            &tag,
        );

        assert_eq!(result.unwrap_err(), SifError::DecryptionFailed);
    }
}
