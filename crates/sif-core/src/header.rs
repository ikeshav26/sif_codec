use crate::error::{Result, SifError};
use crate::format::{CipherSuite, HEADER_SIZE, SIF_MAGIC, SIF_VERSION_1};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SifHeader {
    pub version: u8,
    pub cipher_suite: CipherSuite,
    pub flags: u16,
    pub image_uuid: [u8; 16],
    pub owner_id_hash: [u8; 32],
    pub kek_id: [u8; 16],
    pub nonce: [u8; 12],
    pub wrapped_dek: [u8; 48],
    pub payload_length: u64,
}

impl SifHeader {
    //function to serialize the header into bytes
    pub fn to_bytes(&self) -> [u8; HEADER_SIZE] {
        let mut buf = [0u8; HEADER_SIZE];
        buf[0..4].copy_from_slice(&SIF_MAGIC);
        buf[4] = self.version;
        buf[5] = self.cipher_suite.into();
        buf[6..8].copy_from_slice(&self.flags.to_le_bytes());
        buf[8..24].copy_from_slice(&self.image_uuid);
        buf[24..56].copy_from_slice(&self.owner_id_hash);
        buf[56..72].copy_from_slice(&self.kek_id);
        buf[72..84].copy_from_slice(&self.nonce);
        buf[84..132].copy_from_slice(&self.wrapped_dek);
        buf[132..140].copy_from_slice(&self.payload_length.to_le_bytes());

        buf
    }

    //function to deserialize the bytes to header
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() < HEADER_SIZE {
            return Err(SifError::FileTooSmall {
                found: bytes.len(),
                expected_minimum: HEADER_SIZE,
            });
        }

        if bytes[0..4] != SIF_MAGIC {
            let magic: [u8; 4] = bytes[0..4].try_into().unwrap();
            return Err(SifError::InvalidMagicBytes(magic));
        }

        let version = bytes[4];
        if version != SIF_VERSION_1 {
            return Err(SifError::UnsupportedVersion(version));
        }

        let cipher_suite = CipherSuite::try_from(bytes[5])?;
        let flags = u16::from_le_bytes(bytes[6..8].try_into().unwrap());
        let image_uuid = bytes[8..24].try_into().unwrap();
        let owner_id_hash = bytes[24..56].try_into().unwrap();
        let kek_id = bytes[56..72].try_into().unwrap();
        let nonce = bytes[72..84].try_into().unwrap();
        let wrapped_dek = bytes[84..132].try_into().unwrap();
        let payload_length = u64::from_le_bytes(bytes[132..140].try_into().unwrap());

        Ok(Self {
            version,
            cipher_suite,
            flags,
            image_uuid,
            owner_id_hash,
            kek_id,
            nonce,
            wrapped_dek,
            payload_length,
        })
    }
}

impl TryFrom<&[u8]> for SifHeader {
    type Error = SifError;

    fn try_from(bytes: &[u8]) -> Result<Self> {
        Self::from_bytes(bytes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_header_round_trip() {
        let original = SifHeader {
            version: SIF_VERSION_1,
            cipher_suite: CipherSuite::Aes256Gcm,
            flags: 0x0001,
            image_uuid: [1u8; 16],
            owner_id_hash: [2u8; 32],
            kek_id: [3u8; 16],
            nonce: [4u8; 12],
            wrapped_dek: [5u8; 48],
            payload_length: 1024,
        };

        let bytes = original.to_bytes();
        assert_eq!(bytes.len(), HEADER_SIZE);

        let parsed = SifHeader::from_bytes(&bytes).expect("Failed to parse valid header");
        assert_eq!(original, parsed);
    }

    #[test]
    fn test_invalid_magic() {
        let mut bytes = [0u8; HEADER_SIZE];
        bytes[0..4].copy_from_slice(b"BAD!");
        bytes[4] = SIF_VERSION_1;
        bytes[5] = 0x01;

        let err = SifHeader::from_bytes(&bytes).unwrap_err();
        assert_eq!(err, SifError::InvalidMagicBytes(*b"BAD!"));
    }
}
