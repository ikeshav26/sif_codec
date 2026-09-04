use ed25519_dalek::VerifyingKey;

use crate::container::SifContainer;
use crate::crypto::aead::decrypt_payload;
use crate::crypto::keywrap::unwrap_dek;
use crate::crypto::signature::verify_signature;
use crate::error::Result;
use crate::format::HEADER_SIZE;
use crate::header::SifHeader;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DecodedImage {
    pub header: SifHeader,
    pub plaintext: Vec<u8>,
}

//Decodes and verifies a .sif binary container
pub fn decode(
    sif_bytes: &[u8],
    kek: &[u8; 32],
    verifying_key: &VerifyingKey,
) -> Result<DecodedImage> {
    // Parse container structure
    let container = SifContainer::from_bytes(sif_bytes)?;

    // Verify Ed25519 signature over (Header + Ciphertext + Auth Tag)
    let signed_data = SifContainer::signed_data(sif_bytes)?;
    verify_signature(verifying_key, signed_data, &container.footer.signature)?;

    // Unwrap the DEK using Server KEK
    let dek = unwrap_dek(kek, &container.header.wrapped_dek)?;

    //Authenticate and decrypt the payload using Header as AAD
    let header_bytes = &sif_bytes[0..HEADER_SIZE];
    let plaintext = decrypt_payload(
        container.header.cipher_suite,
        &dek,
        &container.header.nonce,
        header_bytes,
        container.encrypted_payload,
        &container.footer.auth_tag,
    )?;

    Ok(DecodedImage {
        header: container.header,
        plaintext,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::signature::generate_signing_key;
    use crate::encoder::{EncodeOptions, encode};
    use crate::error::SifError;
    use crate::format::CipherSuite;

    #[test]
    fn test_encode_decode_roundtrip_aes_gcm() {
        let mut signing_key = generate_signing_key();
        let verifying_key = signing_key.verifying_key();
        let kek = [0x42u8; 32];
        let original_image = b"RAW_JPEG_PIXELS_OR_BINARY_DATA_TEST_123456789";

        let options = EncodeOptions {
            owner_id_hash: [0xAA; 32],
            kek_id: [0xBB; 16],
            cipher_suite: CipherSuite::Aes256Gcm,
            flags: 1,
            image_uuid: Some([0xCC; 16]),
        };

        let sif_bytes = encode(original_image, &kek, &mut signing_key, options.clone()).unwrap();

        let decoded = decode(&sif_bytes, &kek, &verifying_key).expect("Decode should succeed");

        assert_eq!(decoded.plaintext, original_image);
        assert_eq!(decoded.header.owner_id_hash, options.owner_id_hash);
        assert_eq!(decoded.header.kek_id, options.kek_id);
        assert_eq!(decoded.header.image_uuid, [0xCC; 16]);
        assert_eq!(decoded.header.flags, 1);
        assert_eq!(decoded.header.cipher_suite, CipherSuite::Aes256Gcm);
    }

    #[test]
    fn test_encode_decode_roundtrip_chacha20() {
        let mut signing_key = generate_signing_key();
        let verifying_key = signing_key.verifying_key();
        let kek = [0x42u8; 32];
        let original_image = b"CHACHA20_AUTHENTICATED_IMAGE_DATA";

        let options = EncodeOptions {
            cipher_suite: CipherSuite::ChaCha20Poly1305,
            ..Default::default()
        };

        let sif_bytes = encode(original_image, &kek, &mut signing_key, options).unwrap();
        let decoded = decode(&sif_bytes, &kek, &verifying_key).expect("Decode should succeed");

        assert_eq!(decoded.plaintext, original_image);
        assert_eq!(decoded.header.cipher_suite, CipherSuite::ChaCha20Poly1305);
    }

    #[test]
    fn test_decode_tampered_signature_fails() {
        let mut signing_key = generate_signing_key();
        let verifying_key = signing_key.verifying_key();
        let kek = [0x42u8; 32];
        let original_image = b"sensitive photo";

        let mut sif_bytes = encode(
            original_image,
            &kek,
            &mut signing_key,
            EncodeOptions::default(),
        )
        .unwrap();

        let last_idx = sif_bytes.len() - 1;
        sif_bytes[last_idx] ^= 0xFF;

        let result = decode(&sif_bytes, &kek, &verifying_key);
        assert_eq!(result.unwrap_err(), SifError::InvalidSignature);
    }

    #[test]
    fn test_decode_wrong_kek_fails() {
        let mut signing_key = generate_signing_key();
        let verifying_key = signing_key.verifying_key();
        let correct_kek = [0x42u8; 32];
        let wrong_kek = [0x99u8; 32];
        let original_image = b"secret photo";

        let sif_bytes = encode(
            original_image,
            &correct_kek,
            &mut signing_key,
            EncodeOptions::default(),
        )
        .unwrap();

        let result = decode(&sif_bytes, &wrong_kek, &verifying_key);
        assert_eq!(result.unwrap_err(), SifError::DecryptionFailed);
    }

    #[test]
    fn test_decode_tampered_payload_fails() {
        let mut signing_key = generate_signing_key();
        let verifying_key = signing_key.verifying_key();
        let kek = [0x42u8; 32];
        let original_image = b"important document image";

        let mut sif_bytes = encode(
            original_image,
            &kek,
            &mut signing_key,
            EncodeOptions::default(),
        )
        .unwrap();

        sif_bytes[HEADER_SIZE + 2] ^= 0x01;

        let result = decode(&sif_bytes, &kek, &verifying_key);
        assert_eq!(result.unwrap_err(), SifError::InvalidSignature);
    }
}
