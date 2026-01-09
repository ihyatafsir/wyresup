/**
 * خَامِس الجِيل الخَفِيف (Khamis al-Jil al-Khafif)
 * 5G Lite - The Lightweight Fifth Generation Protocol
 * 
 * ═══════════════════════════════════════════════════════════════════
 * 
 * From Lisan al-Arab (لسان العرب):
 * 
 * خَفِيف (Khafif) - Light, swift, nimble
 *   "والخَفِيفُ ضِدُّ الثَّقِيل" - The light is opposite of heavy
 *   We aim for lightness in overhead, swiftness in delivery
 * 
 * جِيل (Jil) - Generation, era
 *   "الجِيلُ: الصِّنْفُ مِنَ النَّاس" - A class/generation of people
 *   Fifth generation of communication technology
 * 
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Protocol Components:
 * 
 * 1. شَمْسَة (Shamsa) - Sun medallion, radial pattern
 *    From: "الشَّمْس: معروفة" - The sun, well-known
 *    Purpose: Overall protocol framework, like sun radiating to peers
 * 
 * 2. بَرْق (Barq) - Lightning
 *    From: "البَرْقُ: واحِدُ بُروقِ السَّحاب" - Lightning of clouds
 *    Purpose: Instant packet delivery, zero wait time
 * 
 * 3. نَبْض (Nabd) - Pulse, heartbeat
 *    From: "النَّبْضُ: تحرُّك العِرق" - Movement of the vein
 *    Purpose: Timing system, like a heartbeat keeping rhythm
 * 
 * 4. سَيْل (Sayl) - Torrent, flood
 *    From: "السَّيْلُ: الماء الكثير السائل" - Abundant flowing water
 *    Purpose: Flow control, managing the stream of data
 * 
 * 5. مِفْتَاح (Miftah) - Key
 *    From: "المِفْتاح: ما يُفتح به" - That which opens
 *    Purpose: Puncturable encryption keys that expire after use
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

import * as Barq from './BarqProtocol';
import * as Nabd from './NabdTiming';
import * as Sayl from './SaylFlow';
import { WyreSUpIdentity } from '../utils/Identity';

// Protocol version
export const FIVE_G_LITE_VERSION = '1.0.0';
export const PROTOCOL_NAME = 'خَامِس الجِيل الخَفِيف';
export const PROTOCOL_NAME_EN = '5G Lite';

// Slot timing (inspired by 5G NR)
// 5G NR uses 0.5ms slots, we use 10ms for software feasibility
export const SLOT_DURATION_MS = 10;
export const SLOTS_PER_FRAME = 10;
export const FRAME_DURATION_MS = SLOT_DURATION_MS * SLOTS_PER_FRAME;

/**
 * خَلِيَّة (Khaliyya) - Cell/Connection
 * From Lisan al-Arab: "الخَلِيَّة: بيت النحل" - The beehive
 * Each peer connection is like a cell in a hive
 */
export interface Khaliyya {
    peerId: string;
    publicKey: Uint8Array;
    established: number;
    lastSlot: number;
    rtt: number;
    throughput: number;
    healthy: boolean;
}

// Active cells
const cells: Map<string, Khaliyya> = new Map();

/**
 * Initialize 5G Lite protocol
 */
export async function initialize(identity: WyreSUpIdentity): Promise<void> {
    console.log(`[5G-LITE] ═══════════════════════════════════════`);
    console.log(`[5G-LITE] ${PROTOCOL_NAME}`);
    console.log(`[5G-LITE] ${PROTOCOL_NAME_EN} v${FIVE_G_LITE_VERSION}`);
    console.log(`[5G-LITE] Identity: ${identity.fullId}`);
    console.log(`[5G-LITE] Slot: ${SLOT_DURATION_MS}ms | Frame: ${FRAME_DURATION_MS}ms`);
    console.log(`[5G-LITE] ═══════════════════════════════════════`);

    // Start slot timer
    startSlotTimer();
}

/**
 * تَوْصِيل (Tawsil) - Connect to peer
 * From: "وَصَل الشَّيْء بالشَّيْء" - To join one thing to another
 */
export async function tawsil(
    myPrivateKey: Uint8Array,
    peerId: string,
    peerPublicKey: Uint8Array
): Promise<Khaliyya> {
    console.log(`[5G-LITE] تَوْصِيل (Tawsil) → ${peerId}`);

    // Create Barq connection (0-RTT)
    await Barq.createConnection(myPrivateKey, peerId, peerPublicKey);

    // Initialize timing and flow
    Nabd.initTiming(peerId);
    Sayl.initFlow(peerId);

    const cell: Khaliyya = {
        peerId,
        publicKey: peerPublicKey,
        established: Date.now(),
        lastSlot: getCurrentSlot(),
        rtt: 0,
        throughput: 0,
        healthy: true,
    };

    cells.set(peerId, cell);
    console.log(`[5G-LITE] ✓ Cell established`);

    return cell;
}

/**
 * إِرْسَال (Irsal) - Send data
 * From: "أَرْسَل الكلام" - To send speech/message
 */
export async function irsal(
    peerId: string,
    data: string | Uint8Array
): Promise<boolean> {
    const cell = cells.get(peerId);
    if (!cell) {
        console.error(`[5G-LITE] No cell for ${peerId}`);
        return false;
    }

    // Check flow control
    if (!Sayl.canSend(peerId)) {
        console.warn(`[5G-LITE] Flow control: waiting...`);
        await waitForSlot();
    }

    // Create and send packet
    const packet = await Barq.createDataPacket(peerId, data);
    if (!packet) return false;

    // Register with flow control
    Sayl.onSend(peerId, packet.length);

    // TODO: Actually send over network
    console.log(`[5G-LITE] إِرْسَال (Irsal) → ${packet.length} bytes`);

    return true;
}

/**
 * اِسْتِقْبَال (Istiqbal) - Receive data
 * From: "استقبل الشيء" - To receive/face something
 */
export async function istiqbal(
    data: Uint8Array
): Promise<{ peerId: string; payload: string } | null> {
    const result = await Barq.processPacket(data);

    if (result) {
        const cell = cells.get(result.peerId);
        if (cell) {
            cell.lastSlot = getCurrentSlot();

            // Update timing
            const nacks = Nabd.onReceive(result.peerId, 0); // TODO: pass sequence
            if (nacks.length > 0) {
                console.log(`[5G-LITE] NACK for sequences: ${nacks.join(', ')}`);
                // TODO: Request retransmit
            }

            // Update flow
            Sayl.onAck(result.peerId, data.length, cell.rtt);

            cell.healthy = Nabd.isHealthy(result.peerId);
            cell.throughput = Sayl.getThroughput(result.peerId);
        }
    }

    return result;
}

/**
 * قَطْع (Qat') - Disconnect
 * From: "قَطَع الحَبْل" - To cut the rope
 */
export function qat(peerId: string): void {
    console.log(`[5G-LITE] قَطْع (Qat') → ${peerId}`);

    Barq.closeConnection(peerId);
    Nabd.cleanup(peerId);
    Sayl.cleanup(peerId);
    cells.delete(peerId);
}

// ═══════════════════════════════════════════════════════════════════
// Slot Timing System
// ═══════════════════════════════════════════════════════════════════

let slotCounter = 0;
let slotTimerId: NodeJS.Timeout | null = null;

function startSlotTimer(): void {
    if (slotTimerId) return;

    slotTimerId = setInterval(() => {
        slotCounter++;

        // Check all cells for pulse
        for (const [peerId, cell] of cells) {
            if (Nabd.shouldPulse(peerId)) {
                // Send keepalive
                // TODO: Implement pulse packet
            }

            cell.healthy = Nabd.isHealthy(peerId);
        }
    }, SLOT_DURATION_MS);
}

function getCurrentSlot(): number {
    return slotCounter;
}

function getCurrentFrame(): number {
    return Math.floor(slotCounter / SLOTS_PER_FRAME);
}

async function waitForSlot(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, SLOT_DURATION_MS));
}

// ═══════════════════════════════════════════════════════════════════
// Statistics & Monitoring
// ═══════════════════════════════════════════════════════════════════

/**
 * Get all active cells
 */
export function getAllCells(): Khaliyya[] {
    return Array.from(cells.values());
}

/**
 * Get protocol statistics
 */
export function getStats(): {
    version: string;
    cells: number;
    currentSlot: number;
    currentFrame: number;
} {
    return {
        version: FIVE_G_LITE_VERSION,
        cells: cells.size,
        currentSlot: getCurrentSlot(),
        currentFrame: getCurrentFrame(),
    };
}
