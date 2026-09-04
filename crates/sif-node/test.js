const {
    generateKeypair,
    encodeSif,
    decodeSif,
    inspectSif,
} = require("./index.js");

async function run() {
    console.log("1. Generating Ed25519 Authority Keypair...");
    const keypair = generateKeypair();
    console.log("   Public Key:", keypair.publicKeyHex);

    // 32-byte Master Key (KEK)
    const kek = Buffer.alloc(32, 0x5a);

    // Raw mock image
    const originalImage = Buffer.from("SIF_PROTECTED_IMAGE_PAYLOAD_TEST_DATA");

    console.log("\n2. Encoding SIF container...");
    const sifBuffer = await encodeSif(
        originalImage,
        kek,
        keypair.privateKeyHex,
        {
            ownerIdHashHex: "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff",
            kekIdHex: "0102030405060708090a0b0c0d0e0f10",
            cipherSuite: 1, // AES-256-GCM
            flags: 0,
        }
    );
    console.log(`   Encoded SIF container size: ${sifBuffer.length} bytes`);

    console.log("\n3. Inspecting SIF header (without decryption)...");
    const header = inspectSif(sifBuffer);
    console.log("   Header metadata:", header);

    console.log("\n4. Decoding SIF container...");
    const result = await decodeSif(sifBuffer, kek, keypair.publicKeyHex);
    console.log(`   Decoded plaintext: "${result.plaintext.toString()}"`);

    if (result.plaintext.toString() === originalImage.toString()) {
        console.log("\n SUCCESS: Node.js <-> Rust SIF bridge is working flawlessly!");
    } else {
        console.error("\n FAILED: Decoded text does not match original!");
    }
}

run().catch(console.error);
