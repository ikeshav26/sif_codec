use ed25519_dalek::SigningKey;
use rand::RngCore;
use rand::rngs::OsRng;

use crate::crypto::aead::encrypt_payload;
use crate::crypto::keywrap::wrap_dek;
use crate::crypto::signature::sign_data;
use crate::error::Result;
use crate::footer::SifFooter;
use crate::format::{AUTH_TAG_SIZE, CipherSuite, HEADER_SIZE, NONCE_SIZE, SIF_VERSION_1};
use crate::header::SifHeader;

#[derive(Debug, Clone)]
pub struct EncodeOptions {
    pub owner_id_hash: [u8; 32],
    pub kek_id: [u8; 16],
    pub cipher_suite: CipherSuite,
    pub flags: u16,
    pub image_uuid: Option<[u8; 16]>,
}

impl Default for EncodeOptions {
    fn default() -> Self {
        Self {
            owner_id_hash: [0u8; 32],
            kek_id: [0u8; 16],
            cipher_suite: CipherSuite::Aes256Gcm,
            flags: 0,
            image_uuid: None,
        }
    }
}

//convert raw image bytes into .sif file format
pub fn encode(
    plaintext: &[u8],
    kek: &[u8; 32],
    signing_key: &mut SigningKey,
    options: EncodeOptions,
) -> Result<Vec<u8>> {
    let mut rng = OsRng;

    //Generate random 32-byte DEK
    let mut dek = [0u8; 32];
    rng.fill_bytes(&mut dek);

    //Generate random 12-byte Nonce
    let mut nonce = [0u8; NONCE_SIZE];
    rng.fill_bytes(&mut nonce);

    //Generate or use provided UUID
    let image_uuid = match options.image_uuid {
        Some(uuid) => uuid,
        None => {
            let mut uuid = [0u8; 16];
            rng.fill_bytes(&mut uuid);
            uuid
        }
    };

    //Wrap DEK with Server KEK
    let wrapped_dek = wrap_dek(kek, &dek)?;

    //Construct Header
    let header = SifHeader {
        version: SIF_VERSION_1,
        cipher_suite: options.cipher_suite,
        flags: options.flags,
        image_uuid,
        owner_id_hash: options.owner_id_hash,
        kek_id: options.kek_id,
        nonce,
        wrapped_dek,
        payload_length: plaintext.len() as u64,
    };
    let header_bytes = header.to_bytes();

    //Encrypt Payload using Header as AAD
    let (ciphertext, auth_tag) =
        encrypt_payload(options.cipher_suite, &dek, &nonce, &header_bytes, plaintext)?;

    //Prepare data for Ed25519 signature (Header + Ciphertext + AuthTag)
    let mut signable_data = Vec::with_capacity(HEADER_SIZE + ciphertext.len() + AUTH_TAG_SIZE);
    signable_data.extend_from_slice(&header_bytes);
    signable_data.extend_from_slice(&ciphertext);
    signable_data.extend_from_slice(&auth_tag);

    //Sign with Ed25519
    let signature = sign_data(signing_key, &signable_data);

    //Construct Footer
    let footer = SifFooter {
        auth_tag,
        signature,
    };
    let footer_bytes = footer.to_bytes();

    //Assemble final container: Header + Ciphertext + Footer
    let mut container = Vec::with_capacity(HEADER_SIZE + ciphertext.len() + footer_bytes.len());
    container.extend_from_slice(&header_bytes);
    container.extend_from_slice(&ciphertext);
    container.extend_from_slice(&footer_bytes);

    Ok(container)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::container::SifContainer;
    use crate::crypto::signature::generate_signing_key;
    use crate::format::{FOOTER_SIZE, HEADER_SIZE};

    #[test]
    fn test_encode_creates_valid_container() {
        let mut signing_key = generate_signing_key();
        let kek = [0x77u8; 32];
        let plaintext = b"fake-jpg-pixel-data-here";

        let options = EncodeOptions {
            owner_id_hash: [0x11u8; 32],
            kek_id: [0x22u8; 16],
            cipher_suite: CipherSuite::Aes256Gcm,
            flags: 0,
            image_uuid: Some([0x33u8; 16]),
        };

        let sif_bytes = encode(plaintext, &kek, &mut signing_key, options.clone())
            .expect("Encoding should succeed");

        let expected_len = HEADER_SIZE + plaintext.len() + FOOTER_SIZE;
        assert_eq!(sif_bytes.len(), expected_len);

        let container =
            SifContainer::from_bytes(&sif_bytes).expect("Should parse as valid container");
        assert_eq!(container.header.owner_id_hash, options.owner_id_hash);
        assert_eq!(container.header.image_uuid, [0x33u8; 16]);
        assert_eq!(container.header.payload_length, plaintext.len() as u64);
    }

    #[test]
    fn test_encode_chacha20() {
        let mut signing_key = generate_signing_key();
        let kek = [0x88u8; 32];
        let plaintext = b"testing chacha20 encoding";

        let options = EncodeOptions {
            cipher_suite: CipherSuite::ChaCha20Poly1305,
            ..Default::default()
        };

        let sif_bytes = encode(plaintext, &kek, &mut signing_key, options)
            .expect("ChaCha20 encoding should succeed");

        let container = SifContainer::from_bytes(&sif_bytes).unwrap();
        assert_eq!(container.header.cipher_suite, CipherSuite::ChaCha20Poly1305);
    }
}
