use ed25519_dalek::ed25519::signature::SignerMut;
use ed25519_dalek::{Signature, SigningKey, Verifier, VerifyingKey};
use rand::rngs::OsRng;

use crate::error::{Result, SifError};
use crate::format::SIGNATURE_SIZE;

//generates a signing key
pub fn generate_signing_key() -> SigningKey {
    SigningKey::generate(&mut OsRng)
}

//signs data with the signing key
pub fn sign_data(signing_key: &mut SigningKey, data: &[u8]) -> [u8; SIGNATURE_SIZE] {
    let signature: Signature = signing_key.sign(data);
    signature.to_bytes()
}

//verifies the signature
pub fn verify_signature(
    verifying_key: &VerifyingKey,
    data: &[u8],
    signature_bytes: &[u8; SIGNATURE_SIZE],
) -> Result<()> {
    let signature = Signature::from_bytes(signature_bytes);

    verifying_key
        .verify(data, &signature)
        .map_err(|_| SifError::InvalidSignature)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_signature_roundtrip() {
        let mut signing_key = generate_signing_key();
        let verifying_key = signing_key.verifying_key();

        let data = b"Header bytes + Ciphertext bytes + 16B Auth Tag";

        let sig = sign_data(&mut signing_key, data);
        assert_eq!(sig.len(), SIGNATURE_SIZE);

        let result = verify_signature(&verifying_key, data, &sig);
        assert!(result.is_ok());
    }

    #[test]
    fn test_signature_tampered_data_fails() {
        let mut signing_key = generate_signing_key();
        let verifying_key = signing_key.verifying_key();

        let original_data = b"Original genuine container payload";
        let tampered_data = b"Tampered malicious container payload";

        let sig = sign_data(&mut signing_key, original_data);

        let result = verify_signature(&verifying_key, tampered_data, &sig);
        assert_eq!(result.unwrap_err(), SifError::InvalidSignature);
    }

    #[test]
    fn test_signature_wrong_key_fails() {
        let mut signing_key_alice = generate_signing_key();
        let signing_key_bob = generate_signing_key();
        let verifying_key_bob = signing_key_bob.verifying_key();

        let data = b"SIF Container Signed by Alice";
        let sig_alice = sign_data(&mut signing_key_alice, data);

        let result = verify_signature(&verifying_key_bob, data, &sig_alice);
        assert_eq!(result.unwrap_err(), SifError::InvalidSignature);
    }
}
