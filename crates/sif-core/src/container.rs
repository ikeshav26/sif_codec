use crate::error::{Result, SifError};
use crate::footer::SifFooter;
use crate::format::{FOOTER_SIZE, HEADER_SIZE, MIN_CONTAINER_SIZE, SIGNATURE_SIZE};
use crate::header::SifHeader;

//container structure 140-bit(Header) --Payload(variable) -- 80-bit(Footer)
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SifContainer<'a> {
    pub header: SifHeader,
    pub encrypted_payload: &'a [u8],
    pub footer: SifFooter,
}

impl<'a> SifContainer<'a> {
    //function to parse the container from raw .sif format bytes
    pub fn from_bytes(bytes: &'a [u8]) -> Result<Self> {
        if bytes.len() < MIN_CONTAINER_SIZE {
            return Err(SifError::FileTooSmall {
                found: bytes.len(),
                expected_minimum: MIN_CONTAINER_SIZE,
            });
        }

        let header_bytes = &bytes[0..HEADER_SIZE];
        let header = SifHeader::from_bytes(header_bytes)?;

        let actual_payload_len = bytes.len() - HEADER_SIZE - FOOTER_SIZE;
        if header.payload_length as usize != actual_payload_len {
            return Err(SifError::PayloadLengthMismatch {
                expected: header.payload_length as usize,
                actual: actual_payload_len,
            });
        }

        let payload_end = bytes.len() - FOOTER_SIZE;
        let encrypted_payload = &bytes[HEADER_SIZE..payload_end];

        let footer_bytes = &bytes[payload_end..];
        let footer = SifFooter::from_bytes(footer_bytes)?;

        Ok(Self {
            header,
            encrypted_payload,
            footer,
        })
    }

    //function to get the signed data from the container , everything except the signature
    pub fn signed_data(bytes: &'a [u8]) -> Result<&'a [u8]> {
        if bytes.len() < MIN_CONTAINER_SIZE {
            return Err(SifError::FileTooSmall {
                found: bytes.len(),
                expected_minimum: MIN_CONTAINER_SIZE,
            });
        }
        let signable_len = bytes.len() - SIGNATURE_SIZE;
        Ok(&bytes[..signable_len])
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::format::{AUTH_TAG_SIZE, CipherSuite, SIF_VERSION_1};

    #[test]
    fn test_container_parse_valid() {
        let payload = b"encrypted image payload goes here!";

        let header = SifHeader {
            version: SIF_VERSION_1,
            cipher_suite: CipherSuite::Aes256Gcm,
            flags: 0,
            image_uuid: [1u8; 16],
            owner_id_hash: [2u8; 32],
            kek_id: [3u8; 16],
            nonce: [4u8; 12],
            wrapped_dek: [5u8; 48],
            payload_length: payload.len() as u64,
        };

        let footer = SifFooter {
            auth_tag: [0xAA; AUTH_TAG_SIZE],
            signature: [0xBB; SIGNATURE_SIZE],
        };

        let mut raw_container = Vec::new();
        raw_container.extend_from_slice(&header.to_bytes());
        raw_container.extend_from_slice(payload);
        raw_container.extend_from_slice(&footer.to_bytes());

        let container = SifContainer::from_bytes(&raw_container).expect("Parsing should succeed");
        assert_eq!(container.header, header);
        assert_eq!(container.encrypted_payload, payload);
        assert_eq!(container.footer, footer);
    }

    #[test]
    fn test_container_payload_length_mismatch() {
        let header = SifHeader {
            version: SIF_VERSION_1,
            cipher_suite: CipherSuite::Aes256Gcm,
            flags: 0,
            image_uuid: [1u8; 16],
            owner_id_hash: [2u8; 32],
            kek_id: [3u8; 16],
            nonce: [4u8; 12],
            wrapped_dek: [5u8; 48],
            payload_length: 500,
        };
        let footer = SifFooter {
            auth_tag: [0u8; AUTH_TAG_SIZE],
            signature: [0u8; SIGNATURE_SIZE],
        };

        let mut raw = Vec::new();
        raw.extend_from_slice(&header.to_bytes());
        raw.extend_from_slice(b"only 10 bytes");
        raw.extend_from_slice(&footer.to_bytes());

        let err = SifContainer::from_bytes(&raw).unwrap_err();
        assert_eq!(
            err,
            SifError::PayloadLengthMismatch {
                expected: 500,
                actual: 13,
            }
        );
    }
}
