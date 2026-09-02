/**
 * WyreSup Deep Al-Kināyah (الكِنَايَة) Steganography & Entropy Test Suite
 * Tests:
 * 1. Mathematical Invertibility across byte arrays, JSON, & PCM audio
 * 2. Shannon Entropy Reduction (Confirming DPI Cloaking)
 * 3. Adversarial Diacritic, Tatweel, Punctuation, and Alef-Variant Resistance
 * 4. Waswas (وَسْوَس) Invisible Unicode Carrier Robustness
 * 5. High-Throughput Encoding/Decoding Benchmarks
 */

const crypto = require('crypto');
const assert = require('assert');
const ShabahStego = require('../src/mesh/ShabahStego.js');

function calculateShannonEntropy(data) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  if (buf.length === 0) return 0;

  const frequencies = new Map();
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    frequencies.set(byte, (frequencies.get(byte) || 0) + 1);
  }

  let entropy = 0;
  for (const count of frequencies.values()) {
    const p = count / buf.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function runKinayahDeepTestSuite() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(' 📜 AL-KINĀYAH (الكِنَايَة) DEEP LINGUISTIC STEGANOGRAPHY TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // 1. Invertibility with Varying Payload Types
  console.log('[Test 1] Testing Bit-Exact Invertibility across Payload Types...');

  // A: Structured E2EE Session Metadata
  const sessionPayload = {
    action: 'MIFTAH_KEY_EXCHANGE',
    caller: 'alice@11111111',
    callee: 'bob@22222222',
    cipher: 'ChaCha20-Poly1305',
    ephemeralKey: '0x9a8f7b1c3d5e2a40',
    timestamp: 1787523000
  };
  const stegoProse = ShabahStego.hideInLisanRoots(sessionPayload, 'قَالَ الإِمَامُ الرَّازِي فِي مَبَاحِثِ المَشْرِقِ:');
  const recoveredSession = ShabahStego.extractFromLisanRoots(stegoProse);
  assert.deepStrictEqual(recoveredSession, sessionPayload, 'Session payload must match exactly');
  console.log('  ✅ Structured E2EE metadata encoded and extracted with 100% fidelity.');

  // B: Raw Random High-Entropy Ciphertext (Simulating AES-256-GCM / ChaCha20 Output)
  for (const size of [16, 64, 256, 1024]) {
    const rawCiphertext = crypto.randomBytes(size).toString('base64');
    const stego = ShabahStego.hideInLisanRoots(rawCiphertext);
    const recovered = ShabahStego.extractFromLisanRoots(stego);
    assert.strictEqual(recovered, rawCiphertext, `Ciphertext of ${size} bytes must match exactly`);
  }
  console.log('  ✅ Raw high-entropy binary ciphertexts (16B, 64B, 256B, 1024B) recovered bit-exactly.');

  // C: Simulated NAFAQ 16kHz PCM Voice Waveform Chunks
  const pcmBuffer = Buffer.alloc(320); // 10ms PCM audio chunk
  for (let i = 0; i < pcmBuffer.length; i++) {
    pcmBuffer[i] = Math.floor(128 + 127 * Math.sin(i / 10)); // Synthetic sine tone
  }
  const pcmBase64 = pcmBuffer.toString('base64');
  const audioStego = ShabahStego.hideInLisanRoots(pcmBase64, 'فَصْلٌ فِي مَعَانِي الأَصْوَاتِ وَالنَّغَمِ:');
  const recoveredAudioBase64 = ShabahStego.extractFromLisanRoots(audioStego);
  assert.strictEqual(recoveredAudioBase64, pcmBase64, 'Audio PCM chunk must match exactly');
  const recoveredPcmBuffer = Buffer.from(recoveredAudioBase64, 'base64');
  assert.deepStrictEqual(recoveredPcmBuffer, pcmBuffer, 'Decoded PCM byte values must be identical');
  console.log('  ✅ Simulated NAFAQ PCM voice sample recovered with 0.00% distortion.');

  // 2. Shannon Entropy Analysis (DPI Resistance)
  console.log('\n[Test 2] Shannon Entropy Analysis (DPI Classifier Resistance)...');
  const cipherBytes = crypto.randomBytes(4096);
  const cipherEntropy = calculateShannonEntropy(cipherBytes);

  const kinayahText = ShabahStego.hideInLisanRoots(cipherBytes.toString('base64'), 'بَيَانُ الحِكْمَةِ المَأْثُورَةِ:');
  const kinayahEntropy = calculateShannonEntropy(kinayahText);

  console.log(`  - Raw Ciphertext Entropy:           ${cipherEntropy.toFixed(3)} bits/byte (High Entropy -> Flags DPI Filters)`);
  console.log(`  - Al-Kināyah Classical Prose Entropy: ${kinayahEntropy.toFixed(3)} bits/byte (Low Entropy -> Cloaked as Natural Language)`);
  assert(cipherEntropy > 7.8, 'Raw ciphertext entropy should be near theoretical maximum (8.0)');
  assert(kinayahEntropy < 4.5, 'Al-Kināyah entropy must be drastically lower to mimic natural Arabic text');
  console.log('  ✅ Shannon Entropy drastically reduced, defeating ISP/carrier statistical DPI firewalls.');

  // 3. Adversarial Noise & Diacritic Resistance
  console.log('\n[Test 3] Testing Adversarial Resistance (Tashkīl, Tatweel, Punctuation, Alef variants)...');
  const baseSecret = { secret: 'Bismillāh_Mesh_Secret_2026', key: '0xdeadbeefc0ffee' };
  const rawStego = ShabahStego.hideInLisanRoots(baseSecret, 'رِسَالَةُ الحِكْمَةِ:');

  // Adversarially perturb the stego text:
  // - Insert Arabic diacritics (fatha, damma, kasra, sukun, shaddah)
  // - Insert tatweel (ـ)
  // - Swap alef forms (ا <-> أ, إ, آ)
  // - Inject commas, brackets, quotes
  const diacritics = ['\u064E', '\u064F', '\u0650', '\u0652', '\u0651', '\u064B', '\u064C', '\u064D'];
  const parts = rawStego.split(' ');
  const noisyParts = parts.map((token, idx) => {
    if (idx < 2) return token; // Keep preamble
    let modified = token;
    // Add tatweel in middle
    if (modified.length > 2 && Math.random() > 0.4) {
      modified = modified[0] + 'ـ' + modified.substring(1);
    }
    // Add random diacritic
    if (Math.random() > 0.3) {
      const d = diacritics[Math.floor(Math.random() * diacritics.length)];
      modified += d;
    }
    // Swap alefs
    if (modified.startsWith('ا') && Math.random() > 0.5) {
      modified = 'أ' + modified.substring(1);
    }
    // Add surrounding punctuation
    if (Math.random() > 0.7) {
      modified = `«${modified}»،`;
    }
    return modified;
  });

  const noisyStego = noisyParts.join('   \n  '); // Non-standard whitespace and linebreaks
  const recoveredFromNoisy = ShabahStego.extractFromLisanRoots(noisyStego);
  assert.deepStrictEqual(recoveredFromNoisy, baseSecret, 'Payload must survive adversarial noise and diacritics');
  console.log('  ✅ 100% recovery under heavy diacritics (تشكيل), tatweel (تطويل), alef mutations, and punctuation noise!');

  // 4. Waswas (وَسْوَس) Invisible Unicode Carrier
  console.log('\n[Test 4] Testing Waswas (وَسْوَس) Zero-Width Unicode Steganography...');
  const coverSentence = 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ الرَّحْمَنِ الرَّحِيمِ مَالِكِ يَوْمِ الدِّينِ';
  const invisibleSecret = { node: 'edge_mesh_damascus_01', latency: 14.2 };
  const waswasText = ShabahStego.hideInText(coverSentence, invisibleSecret);

  // Visually identical:
  const strippedVisible = waswasText.replace(/[\u200B-\u200F]/g, '');
  assert.strictEqual(strippedVisible, coverSentence, 'Visible cover sentence must remain completely unchanged');

  // Recovered:
  const recoveredWaswas = ShabahStego.extractFromText(waswasText);
  assert.deepStrictEqual(recoveredWaswas, invisibleSecret, 'Invisible secret must be perfectly extracted');
  console.log('  ✅ Waswas invisible steganography verified with zero visual alteration to cover text.');

  // 5. Throughput & Latency Benchmark
  console.log('\n[Test 5] Benchmarking Al-Kināyah Encoding/Decoding Throughput...');
  const testPayload = { auth: 'mesh_v2_fast_token_987654321', route: 'eu-central-relay' };
  const iterations = 5000;

  const tStart = Date.now();
  for (let i = 0; i < iterations; i++) {
    const encoded = ShabahStego.hideInLisanRoots(testPayload);
    const decoded = ShabahStego.extractFromLisanRoots(encoded);
  }
  const totalMs = Date.now() - tStart;
  const opsPerSec = Math.round((iterations / totalMs) * 1000);

  console.log(`  - Executed ${iterations} round-trip encode/decode cycles in ${totalMs} ms`);
  console.log(`  - Performance: ${opsPerSec.toLocaleString()} round-trips / second`);
  assert(opsPerSec > 1000, 'Performance must exceed 1,000 round-trips/second for real-time voice stego');
  console.log('  ✅ High-speed throughput confirmed: Suitable for real-time packet-by-packet steganography.');

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log(' 🎉 ALL AL-KINĀYAH STEGANOGRAPHY TESTS PASSED (100% GREEN)');
  console.log('═══════════════════════════════════════════════════════════════════\n');
}

runKinayahDeepTestSuite();
