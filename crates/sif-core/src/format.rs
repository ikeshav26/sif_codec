#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum CipherSuite {
    Aes256Gcm = 0x01,
    ChaCha20Poly1305 = 0x02,
}

pub const SIF_MAGIC: [u8; 4] = [0x53, 0x49, 0x46, 0x01];
pub const SIF_VERSION_1: u8 = 0x01;
pub const HEADER_SIZE: usize = 140;
pub const FOOTER_SIZE: usize = 80;
pub const MIN_CONTAINER_SIZE: usize = HEADER_SIZE + FOOTER_SIZE;
pub const NONCE_SIZE: usize = 12;
pub const WRAPPED_DEK_SIZE: usize = 48;
pub const OWNER_HASH_SIZE: usize = 32;
pub const UUID_SIZE: usize = 16;
pub const KEK_ID_SIZE: usize = 16;
pub const AUTH_TAG_SIZE: usize = 16;
pub const SIGNATURE_SIZE: usize = 64;

use crate::error::{Result, SifError};

impl TryFrom<u8> for CipherSuite {
    type Error = SifError;

    fn try_from(byte: u8) -> Result<Self> {
        match byte {
            0x01 => Ok(CipherSuite::Aes256Gcm),
            0x02 => Ok(CipherSuite::ChaCha20Poly1305),
            other => Err(SifError::UnsupportedCipher(other)),
        }
    }
}

impl From<CipherSuite> for u8 {
    fn from(suite: CipherSuite) -> Self {
        suite as u8
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cipher_suite_conversion() {
        assert_eq!(CipherSuite::try_from(0x01), Ok(CipherSuite::Aes256Gcm));
        assert_eq!(
            CipherSuite::try_from(0x02),
            Ok(CipherSuite::ChaCha20Poly1305)
        );
        assert_eq!(u8::from(CipherSuite::Aes256Gcm), 0x01);
        assert_eq!(
            CipherSuite::try_from(0x99),
            Err(SifError::UnsupportedCipher(0x99))
        );
    }
}
