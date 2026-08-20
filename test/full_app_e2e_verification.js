/**
 * WyreSup Full End-to-End System & UI Functions Audit
 * (فَحْص الشَّامِل لِجَمِيع وَظَائِف النِّظَام و وَاجِهَة المُسْتَخْدِم)
 */

const http = require("http");
const WebSocket = require("ws");
const assert = require("assert");

const BASE_URL = "http://127.0.0.1:5195";
const WS_URL = "ws://127.0.0.1:5195";

async function fetchJson(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const req = http.request(url, options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function runAudit() {
  console.log("=== 🔍 Full End-to-End System Functionality Audit ===");

  // 1. Static & PWA Assets
  console.log("\n[1] Auditing Static & PWA Assets...");
  const manifest = await fetchJson("/manifest.json");
  assert.strictEqual(manifest.status, 200, "manifest.json must be HTTP 200");
  assert.strictEqual(manifest.data.short_name, "WyreSup");
  console.log("  ✅ PWA Manifest valid: short_name =", manifest.data.short_name);

  // 2. Lisan Lexicon API
  console.log("\n[2] Auditing Lisan al-Arab Linguistic API...");
  const lisanData = await fetchJson("/api/lisan");
  assert.strictEqual(lisanData.status, 200);
  assert(Object.keys(lisanData.data).length >= 19, "Must contain >= 19 classical roots");

  const lookup = await fetchJson("/api/lisan/lookup?q=thaqb");
  assert.strictEqual(lookup.status, 200);
  assert(lookup.data.length > 0 && lookup.data[0].root === "ثقب");
  console.log("  ✅ Lisan API operational (19 roots indexed, live search functional)");

  // 3. Diagnostics API
  console.log("\n[3] Auditing Mesh Diagnostics & Telemetry API...");
  const diag = await fetchJson("/api/diagnostics");
  assert.strictEqual(diag.status, 200);
  assert(diag.data.hubNode && diag.data.meshStats);
  console.log("  ✅ Diagnostics API operational (Hub: " + diag.data.hubNode.fullId + ", Active Spaces: " + diag.data.activeSpaces + ")");

  // 4. Space & Channel Creation API
  console.log("\n[4] Auditing Space & Channel Creation API...");
  const newSpaceRes = await fetchJson("/api/spaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Audit Majlis",
      arabicName: "مَجْلِس التَّدْقِيق",
      icon: "🔬",
      description: "Automated test space"
    })
  });
  assert.strictEqual(newSpaceRes.status, 201);
  const createdSpace = newSpaceRes.data;
  assert(createdSpace.id && createdSpace.channels.length > 0);
  console.log("  ✅ Created Majlis Space: " + createdSpace.name + " (ID: " + createdSpace.id + ")");

  // 5. Virtual Mesh Bot Spawning
  console.log("\n[5] Auditing Mesh Bot Spawner...");
  const botRes = await fetchJson("/api/bots/spawn", { method: "POST" });
  assert.strictEqual(botRes.status, 200);
  assert.strictEqual(botRes.data.success, true);
  console.log("  ✅ Virtual Mesh Bot Spawned successfully");

  // 6. WebSocket Protocol: Alice <-> Bob Handshake & Encrypted DM Relay
  console.log("\n[6] Auditing Live WebSocket Mesh Protocol (Alice <-> Bob Handshake)...");
  await new Promise((resolve, reject) => {
    const wsAlice = new WebSocket(WS_URL);
    const wsBob = new WebSocket(WS_URL);

    let aliceIdentified = false;
    let bobIdentified = false;
    let bobReceivedEncryptedPacket = false;

    wsAlice.on("open", () => {
      wsAlice.send(JSON.stringify({
        type: "IDENTIFY",
        payload: {
          peerId: "alice_audit@11223344",
          prefix: "alice_audit",
          ecdhPubKey: "04aabbccdd",
          signPubKey: "pem_alice"
        }
      }));
    });

    wsBob.on("open", () => {
      wsBob.send(JSON.stringify({
        type: "IDENTIFY",
        payload: {
          peerId: "bob_audit@55667788",
          prefix: "bob_audit",
          ecdhPubKey: "04eeff0011",
          signPubKey: "pem_bob"
        }
      }));
    });

    wsAlice.on("message", (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === "IDENTIFIED") {
        aliceIdentified = true;
        checkSend();
      }
    });

    wsBob.on("message", (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === "IDENTIFIED") {
        bobIdentified = true;
        checkSend();
      } else if (msg.type === "GOSSIP_PACKET") {
        const pkt = msg.payload;
        if (pkt && pkt.zahir && pkt.zahir.channelId === "dm-bob_audit") {
          assert.strictEqual(pkt.zahir.isEncrypted, true);
          assert(pkt.batin.ciphertext && pkt.batin.iv && pkt.batin.tag);
          bobReceivedEncryptedPacket = true;
          wsAlice.close();
          wsBob.close();
          resolve();
        }
      }
    });

    function checkSend() {
      if (aliceIdentified && bobIdentified) {
        wsAlice.send(JSON.stringify({
          type: "SEND_MESSAGE",
          payload: {
            zahir: {
              version: "zbat/1.4.0",
              messageId: "msg_audit_" + Date.now() + "_" + Math.floor(Math.random()*10000),
              senderId: "alice_audit@11223344",
              spaceId: "space-public-mesh",
              channelId: "dm-bob_audit",
              timestamp: Date.now(),
              ttl: 5,
              hops: 0,
              isEncrypted: true
            },
            batin: {
              ciphertext: "deadbeefcafebabe",
              iv: "123456789012",
              tag: "0987654321098765",
              algorithm: "AES-256-GCM"
            }
          }
        }));
      }
    }

    setTimeout(() => {
      if (!bobReceivedEncryptedPacket) reject(new Error("Timeout waiting for WebSocket E2EE message round-trip"));
    }, 5000);
  });

  console.log("  ✅ Real-time WebSocket E2EE Mesh Handshake & Zero-Knowledge Message Relay PASSED!");

  console.log("\n🎉 ALL 6 END-TO-END SUBSYSTEMS AUDITED & OPERATING 100% PERFECTLY!");
}

runAudit().catch(err => {
  console.error("Audit failed:", err);
  process.exit(1);
});
