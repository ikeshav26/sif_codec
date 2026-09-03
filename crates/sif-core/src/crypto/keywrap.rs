use aes_kw::KekAes256;

use crate::error::{Result, SifError};
use crate::format::WRAPPED_DEK_SIZE;

const AES_KW_OUTPUT_SIZE: usize = 40;

//encrypts 32 byte data encryption key using 32 byte master key
pub fn wrap_dek(kek: &[u8; 32], dek: &[u8; 32]) -> Result<[u8; WRAPPED_DEK_SIZE]> {
    let kek_cipher = KekAes256::from(*kek);
    let mut out_40 = [0u8; AES_KW_OUTPUT_SIZE];

    kek_cipher
        .wrap(dek, &mut out_40)
        .map_err(|_| SifError::DecryptionFailed)?;

    let mut wrapped = [0u8; WRAPPED_DEK_SIZE];
    wrapped[0..AES_KW_OUTPUT_SIZE].copy_from_slice(&out_40);

    Ok(wrapped)
}

//decrypts 48 byte wrapped dek using 32 byte master key
pub fn unwrap_dek(kek: &[u8; 32], wrapped_dek: &[u8; WRAPPED_DEK_SIZE]) -> Result<[u8; 32]> {
    let kek_cipher = KekAes256::from(*kek);
    let mut dek = [0u8; 32];

    kek_cipher
        .unwrap(&wrapped_dek[0..AES_KW_OUTPUT_SIZE], &mut dek)
        .map_err(|_| SifError::DecryptionFailed)?;

    Ok(dek)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keywrap_roundtrip() {
        let master_kek = [0xAAu8; 32];
        let original_dek = [0x55u8; 32];

        let wrapped = wrap_dek(&master_kek, &original_dek).expect("Wrap should succeed");
        assert_eq!(wrapped.len(), WRAPPED_DEK_SIZE);
        assert_ne!(wrapped, [0u8; WRAPPED_DEK_SIZE]);

        let unwrapped = unwrap_dek(&master_kek, &wrapped).expect("Unwrap should succeed");
        assert_eq!(unwrapped, original_dek);
    }

    #[test]
    fn test_keywrap_wrong_kek_fails() {
        let master_kek = [0xAAu8; 32];
        let wrong_kek = [0xBBu8; 32];
        let original_dek = [0x55u8; 32];

        let wrapped = wrap_dek(&master_kek, &original_dek).unwrap();

        let result = unwrap_dek(&wrong_kek, &wrapped);
        assert!(result.is_err());
    }

    #[test]
    fn test_keywrap_tampered_wrapped_dek_fails() {
        let master_kek = [0xAAu8; 32];
        let original_dek = [0x55u8; 32];

        let mut wrapped = wrap_dek(&master_kek, &original_dek).unwrap();
        wrapped[0] ^= 0xFF;

        let result = unwrap_dek(&master_kek, &wrapped);
        assert!(result.is_err());
    }
}
