pub mod error;
pub mod format;
pub mod header;

pub use error::{Result, SifError};
pub use format::*;
pub use header::SifHeader;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let err = SifError::InvalidMagicBytes([0x00, 0x00, 0x00, 0x00]);
        let msg = format!("{err}");
        assert!(msg.contains("Invalid SIF magic bytes"));
    }
}
