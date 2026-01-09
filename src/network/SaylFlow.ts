/**
 * سَيْل (SAYL) - Flow Control
 * 
 * Adaptive flow control for BARQ protocol
 * Named "Sayl" (سَيْل) - Arabic for torrent/flood
 * 
 * Key features:
 * - Congestion window like TCP but simpler
 * - Rate limiting based on RTT
 * - Bandwidth estimation
 */

export interface SaylState {
    peerId: string;
    congestionWindow: number;     // Max packets in flight
    bytesInFlight: number;        // Current unacked bytes
    packetsInFlight: number;      // Current unacked packets
    bandwidth: number;            // Estimated bytes/sec
    rttMin: number;               // Minimum observed RTT
    rttSmoothed: number;          // Smoothed RTT
    throttled: boolean;           // Currently throttled?
}

// Default values
const INITIAL_CWND = 10;        // Initial congestion window
const MIN_CWND = 2;             // Minimum window
const MAX_CWND = 100;           // Maximum window

// Per-connection flow state
const flows: Map<string, SaylState> = new Map();

/**
 * Initialize flow control for connection
 */
export function initFlow(peerId: string): void {
    flows.set(peerId, {
        peerId,
        congestionWindow: INITIAL_CWND,
        bytesInFlight: 0,
        packetsInFlight: 0,
        bandwidth: 0,
        rttMin: Infinity,
        rttSmoothed: 100,
        throttled: false,
    });
}

/**
 * Check if we can send more
 */
export function canSend(peerId: string): boolean {
    const flow = flows.get(peerId);
    if (!flow) return true;

    return flow.packetsInFlight < flow.congestionWindow;
}

/**
 * Register packet sent
 */
export function onSend(peerId: string, bytes: number): void {
    const flow = flows.get(peerId);
    if (!flow) return;

    flow.bytesInFlight += bytes;
    flow.packetsInFlight++;
}

/**
 * Register ACK received
 */
export function onAck(peerId: string, bytes: number, rtt: number): void {
    const flow = flows.get(peerId);
    if (!flow) return;

    flow.bytesInFlight = Math.max(0, flow.bytesInFlight - bytes);
    flow.packetsInFlight = Math.max(0, flow.packetsInFlight - 1);

    // Update RTT
    flow.rttMin = Math.min(flow.rttMin, rtt);
    flow.rttSmoothed = flow.rttSmoothed * 0.875 + rtt * 0.125;

    // Estimate bandwidth
    if (rtt > 0) {
        const instantBw = bytes / (rtt / 1000);
        flow.bandwidth = flow.bandwidth * 0.9 + instantBw * 0.1;
    }

    // Additive increase - grow window slowly
    if (!flow.throttled) {
        flow.congestionWindow = Math.min(
            MAX_CWND,
            flow.congestionWindow + 1 / flow.congestionWindow
        );
    }
}

/**
 * Handle packet loss (congestion signal)
 */
export function onLoss(peerId: string): void {
    const flow = flows.get(peerId);
    if (!flow) return;

    // Multiplicative decrease
    flow.congestionWindow = Math.max(
        MIN_CWND,
        Math.floor(flow.congestionWindow / 2)
    );

    flow.throttled = true;

    // Recovery timer
    setTimeout(() => {
        if (flow) flow.throttled = false;
    }, flow.rttSmoothed * 2);
}

/**
 * Get estimated throughput (bytes/sec)
 */
export function getThroughput(peerId: string): number {
    const flow = flows.get(peerId);
    if (!flow || flow.rttSmoothed === 0) return 0;

    return (flow.congestionWindow * 1200) / (flow.rttSmoothed / 1000);
}

/**
 * Get delay in ms for pacing
 */
export function getPacingDelay(peerId: string): number {
    const flow = flows.get(peerId);
    if (!flow || flow.bandwidth === 0) return 0;

    // Pace packets to avoid bursts
    return (1200 * 1000) / flow.bandwidth;
}

/**
 * Get flow stats
 */
export function getStats(peerId: string): Partial<SaylState> | null {
    return flows.get(peerId) || null;
}

/**
 * Clean up
 */
export function cleanup(peerId: string): void {
    flows.delete(peerId);
}
