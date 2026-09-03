use crate::error::{Result, SifError};
use crate::format::{AUTH_TAG_SIZE, FOOTER_SIZE, SIGNATURE_SIZE};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SifFooter {
    pub auth_tag: [u8; AUTH_TAG_SIZE],
    pub signature: [u8; SIGNATURE_SIZE],
}

impl SifFooter {
    //function to serialize the footer to bytes
    pub fn to_bytes(&self) -> [u8; FOOTER_SIZE] {
        let mut buf = [0u8; FOOTER_SIZE];
        buf[0..AUTH_TAG_SIZE].copy_from_slice(&self.auth_tag);
        buf[AUTH_TAG_SIZE..FOOTER_SIZE].copy_from_slice(&self.signature);

        buf
    }

    //function to deserialize the footer from bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() < FOOTER_SIZE {
            return Err(SifError::FileTooSmall {
                found: bytes.len(),
                expected_minimum: FOOTER_SIZE,
            });
        }

        let auth_tag = bytes[0..AUTH_TAG_SIZE]
            .try_into()
            .expect("slice length matches AUTH_TAG_SIZE");

        let signature = bytes[AUTH_TAG_SIZE..FOOTER_SIZE]
            .try_into()
            .expect("slice length matches SIGNATURE_SIZE");

        Ok(Self {
            auth_tag,
            signature,
        })
    }
}

impl TryFrom<&[u8]> for SifFooter {
    type Error = SifError;

    fn try_from(bytes: &[u8]) -> Result<Self> {
        Self::from_bytes(bytes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_footer_round_trip() {
        let original = SifFooter {
            auth_tag: [0xAA; AUTH_TAG_SIZE],
            signature: [0xBB; SIGNATURE_SIZE],
        };

        let bytes = original.to_bytes();
        assert_eq!(bytes.len(), FOOTER_SIZE);

        let parsed = SifFooter::from_bytes(&bytes).expect("Failed to parse valid footer");
        assert_eq!(original, parsed);
    }

    #[test]
    fn test_footer_too_small() {
        let short_bytes = [0u8; 50];
        let err = SifFooter::from_bytes(&short_bytes).unwrap_err();
        assert_eq!(
            err,
            SifError::FileTooSmall {
                found: 50,
                expected_minimum: FOOTER_SIZE,
            }
        );
    }
}
