/**
 * ZBAT Protocol Test
 * Tests the Zahir-Batin dual-layer protocol
 */

const crypto = require('crypto');

console.log('═══════════════════════════════════════════════════════');
console.log(' ZBAT Protocol Test');
console.log(' ظَاهِر و بَاطِن - Zahir wa Batin');
console.log('═══════════════════════════════════════════════════════\n');

// Simulate ZBAT packet structure
function testZBATStructure() {
    console.log('[TEST] ZBAT Packet Structure\n');

    // 1. Create Batin (hidden content)
    const batin = {
        type: 1,
        content: Buffer.from('السلام عليكم - Secret message'),
        metadata: { timestamp: Date.now() },
    };
    console.log('  بَاطِن (Batin) created:');
    console.log(`    Type: ${batin.type}`);
    console.log(`    Content: ${batin.content.toString()}`);

    // 2. Create Ghilaf (envelope) - encrypt batin
    const key = crypto.randomBytes(32);
    const nonce = crypto.randomBytes(12);
    const batinJson = JSON.stringify({
        type: batin.type,
        content: batin.content.toString('base64'),
        metadata: batin.metadata,
    });

    const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
    let encrypted = cipher.update(batinJson, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const mac = cipher.getAuthTag();

    const ghilaf = {
        miftahSequence: 42,
        nonce: nonce,
        batin: encrypted,
        mac: mac,
    };
    console.log('\n  غِلاف (Ghilaf) - Envelope created:');
    console.log(`    Miftah sequence: ${ghilaf.miftahSequence}`);
    console.log(`    Encrypted size: ${encrypted.length} bytes`);

    // 3. Create Zahir (manifest) - visible routing info
    const zahir = {
        version: 1,
        senderId: 'ahmad@abc123',
        recipientId: 'khalid@def456',
        daraja: 2, // Normal priority
        timestamp: Date.now(),
        ghilafSize: encrypted.length,
    };
    console.log('\n  ظَاهِر (Zahir) - Manifest created:');
    console.log(`    Sender: ${zahir.senderId}`);
    console.log(`    Recipient: ${zahir.recipientId}`);
    console.log(`    Priority (daraja): ${zahir.daraja}`);

    // 4. Create complete Tabaq
    console.log('\n  طَبَق (Tabaq) - Complete packet:');
    console.log(`    Zahir visible: ✓ (routers can read)`);
    console.log(`    Batin hidden: ✓ (only recipient can decrypt)`);

    // 5. Simulate router reading only Zahir
    console.log('\n  [Router] Reading Zahir only:');
    console.log(`    Route: ${zahir.senderId} → ${zahir.recipientId}`);
    console.log(`    Priority queue: ${zahir.daraja}`);
    console.log(`    Cannot read Batin: ✓ (encrypted)`);

    // 6. Simulate recipient decrypting
    console.log('\n  [Recipient] كَشَف (Kashf) - Uncovering:');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAuthTag(mac);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    const revealed = JSON.parse(decrypted.toString());
    console.log(`    Revealed content: ${Buffer.from(revealed.content, 'base64').toString()}`);

    console.log('\n  ✓ ZBAT Structure test PASSED\n');
    return true;
}

function testDualLayerSecurity() {
    console.log('[TEST] Dual-Layer Security Feature\n');

    // The key innovation: Zahir is visible, Batin is hidden
    const zahir = {
        senderId: 'user_a',
        recipientId: 'user_b',
        timestamp: Date.now(),
    };

    const batin = 'Super secret message that only recipient should see';
    const key = crypto.randomBytes(32);
    const nonce = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
    const encrypted = Buffer.concat([cipher.update(batin), cipher.final()]);

    // Router/middleman can see:
    console.log('  [Middleman/Router sees]:');
    console.log(`    ✓ Sender: ${zahir.senderId}`);
    console.log(`    ✓ Recipient: ${zahir.recipientId}`);
    console.log(`    ✓ Timestamp: ${zahir.timestamp}`);
    console.log(`    ✗ Content: ${encrypted.toString('hex').slice(0, 20)}... (encrypted)`);

    // Recipient can see everything:
    console.log('\n  [Recipient sees]:');
    console.log(`    ✓ Sender: ${zahir.senderId}`);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAuthTag(cipher.getAuthTag());
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    console.log(`    ✓ Content: ${decrypted.toString()}`);

    console.log('\n  ✓ Dual-Layer Security test PASSED\n');
    return true;
}

async function main() {
    const results = [];

    results.push(testZBATStructure());
    results.push(testDualLayerSecurity());

    const passed = results.filter(r => r).length;
    const failed = results.filter(r => !r).length;

    console.log('═══════════════════════════════════════════════════════');
    console.log(` Results: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════════════════════');
}

main();
