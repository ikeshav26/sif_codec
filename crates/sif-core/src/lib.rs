pub mod container;
pub mod crypto;
pub mod error;
pub mod footer;
pub mod format;
pub mod header;

pub use container::SifContainer;
pub use error::{Result, SifError};
pub use footer::SifFooter;
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
