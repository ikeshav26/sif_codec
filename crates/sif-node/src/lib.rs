#![deny(clippy::all)]

use ed25519_dalek::{SigningKey, VerifyingKey};
use napi::bindgen_prelude::*;
use napi_derive::napi;
use sif_core::container::SifContainer;
use sif_core::crypto::signature::generate_signing_key;
use sif_core::decoder::decode;
use sif_core::encoder::{EncodeOptions, encode};
use sif_core::format::CipherSuite;

/// Options passed from JavaScript/TypeScript for encoding
#[napi(object)]
pub struct JsEncodeOptions {
    pub owner_id_hash_hex: String,
    pub kek_id_hex: String,
    pub cipher_suite: Option<u8>,
    pub flags: Option<u16>,
    pub image_uuid_hex: Option<String>,
}

/// Metadata inspected from a SIF header
#[napi(object)]
pub struct JsSifHeader {
    pub version: u8,
    pub cipher_suite: u8,
    pub flags: u16,
    pub image_uuid_hex: String,
    pub owner_id_hash_hex: String,
    pub kek_id_hex: String,
    pub payload_length: i64,
}

/// Result returned from decoding
#[napi(object)]
pub struct JsDecodedResult {
    pub header: JsSifHeader,
    pub plaintext: Buffer,
}

/// Key pair generated for Ed25519 signing
#[napi(object)]
pub struct JsKeyPair {
    pub private_key_hex: String,
    pub public_key_hex: String,
}

/// Generate a new Ed25519 keypair in hex format
#[napi]
pub fn generate_keypair() -> JsKeyPair {
    let signing_key = generate_signing_key();
    let verifying_key = signing_key.verifying_key();
    JsKeyPair {
        private_key_hex: hex::encode(signing_key.to_bytes()),
        public_key_hex: hex::encode(verifying_key.to_bytes()),
    }
}

/// Inspects a SIF container header without requiring KEK or decryption
#[napi]
pub fn inspect_sif(sif_buffer: Buffer) -> Result<JsSifHeader> {
    let bytes = sif_buffer.as_ref();
    let container = SifContainer::from_bytes(bytes).map_err(|e| {
        Error::new(
            Status::InvalidArg,
            format!("Failed to parse SIF header: {e}"),
        )
    })?;

    let h = &container.header;
    Ok(JsSifHeader {
        version: h.version,
        cipher_suite: h.cipher_suite as u8,
        flags: h.flags,
        image_uuid_hex: hex::encode(h.image_uuid),
        owner_id_hash_hex: hex::encode(h.owner_id_hash),
        kek_id_hex: hex::encode(h.kek_id),
        payload_length: h.payload_length as i64,
    })
}

/// Encodes raw image bytes into a SIF container buffer (Runs asynchronously in worker pool)
#[napi]
pub async fn encode_sif(
    plaintext: Buffer,
    kek: Buffer,
    private_key_hex: String,
    options: JsEncodeOptions,
) -> Result<Buffer> {
    if kek.len() != 32 {
        return Err(Error::new(
            Status::InvalidArg,
            "KEK must be exactly 32 bytes".to_string(),
        ));
    }
    let kek_arr: [u8; 32] = kek.as_ref().try_into().unwrap();

    let priv_bytes = hex::decode(&private_key_hex).map_err(|e| {
        Error::new(
            Status::InvalidArg,
            format!("Invalid private key hex string: {e}"),
        )
    })?;
    if priv_bytes.len() != 32 {
        return Err(Error::new(
            Status::InvalidArg,
            "Private key must be 32 bytes (64 hex characters)".to_string(),
        ));
    }
    let priv_arr: [u8; 32] = priv_bytes.try_into().unwrap();
    let mut signing_key = SigningKey::from_bytes(&priv_arr);

    let owner_hash_vec = hex::decode(&options.owner_id_hash_hex).map_err(|e| {
        Error::new(
            Status::InvalidArg,
            format!("Invalid owner_id_hash_hex: {e}"),
        )
    })?;
    if owner_hash_vec.len() != 32 {
        return Err(Error::new(
            Status::InvalidArg,
            "owner_id_hash must be 32 bytes".to_string(),
        ));
    }
    let owner_id_hash: [u8; 32] = owner_hash_vec.try_into().unwrap();

    let kek_id_vec = hex::decode(&options.kek_id_hex)
        .map_err(|e| Error::new(Status::InvalidArg, format!("Invalid kek_id_hex: {e}")))?;
    if kek_id_vec.len() != 16 {
        return Err(Error::new(
            Status::InvalidArg,
            "kek_id must be 16 bytes".to_string(),
        ));
    }
    let kek_id: [u8; 16] = kek_id_vec.try_into().unwrap();

    let cipher_suite = match options.cipher_suite.unwrap_or(1) {
        1 => CipherSuite::Aes256Gcm,
        2 => CipherSuite::ChaCha20Poly1305,
        other => {
            return Err(Error::new(
                Status::InvalidArg,
                format!("Unsupported cipher suite: {other}"),
            ));
        }
    };

    let image_uuid = if let Some(uuid_hex) = options.image_uuid_hex {
        let vec = hex::decode(&uuid_hex)
            .map_err(|e| Error::new(Status::InvalidArg, format!("Invalid image_uuid_hex: {e}")))?;
        if vec.len() != 16 {
            return Err(Error::new(
                Status::InvalidArg,
                "image_uuid must be 16 bytes".to_string(),
            ));
        }
        let arr: [u8; 16] = vec.try_into().unwrap();
        Some(arr)
    } else {
        None
    };

    let encode_opts = EncodeOptions {
        owner_id_hash,
        kek_id,
        cipher_suite,
        flags: options.flags.unwrap_or(0),
        image_uuid,
    };

    let output_vec = encode(plaintext.as_ref(), &kek_arr, &mut signing_key, encode_opts)
        .map_err(|e| Error::new(Status::GenericFailure, format!("Encode failed: {e}")))?;

    Ok(Buffer::from(output_vec))
}

/// Decodes and verifies a SIF container buffer (Runs asynchronously in worker pool)
#[napi]
pub async fn decode_sif(
    sif_buffer: Buffer,
    kek: Buffer,
    public_key_hex: String,
) -> Result<JsDecodedResult> {
    if kek.len() != 32 {
        return Err(Error::new(
            Status::InvalidArg,
            "KEK must be exactly 32 bytes".to_string(),
        ));
    }
    let kek_arr: [u8; 32] = kek.as_ref().try_into().unwrap();

    let pub_bytes = hex::decode(&public_key_hex).map_err(|e| {
        Error::new(
            Status::InvalidArg,
            format!("Invalid public key hex string: {e}"),
        )
    })?;
    if pub_bytes.len() != 32 {
        return Err(Error::new(
            Status::InvalidArg,
            "Public key must be 32 bytes (64 hex characters)".to_string(),
        ));
    }
    let pub_arr: [u8; 32] = pub_bytes.try_into().unwrap();
    let verifying_key = VerifyingKey::from_bytes(&pub_arr).map_err(|e| {
        Error::new(
            Status::InvalidArg,
            format!("Invalid Ed25519 public key: {e}"),
        )
    })?;

    let decoded = decode(sif_buffer.as_ref(), &kek_arr, &verifying_key)
        .map_err(|e| Error::new(Status::GenericFailure, format!("Decode failed: {e}")))?;

    let h = &decoded.header;
    Ok(JsDecodedResult {
        header: JsSifHeader {
            version: h.version,
            cipher_suite: h.cipher_suite as u8,
            flags: h.flags,
            image_uuid_hex: hex::encode(h.image_uuid),
            owner_id_hash_hex: hex::encode(h.owner_id_hash),
            kek_id_hex: hex::encode(h.kek_id),
            payload_length: h.payload_length as i64,
        },
        plaintext: Buffer::from(decoded.plaintext),
    })
}
