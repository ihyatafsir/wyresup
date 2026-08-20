/**
 * WyreSup Sayl (سَيْل) - High-Speed Adaptive Flow Control
 * Grounded in Ibn Manzur's Lisan al-Arab: "السَّيْلُ: المَاءُ الكَثِيرُ السَّائِلُ الجَارِي بِسُرْعَةٍ وَقُوَّةٍ لَا يَرُدُّهُ شَيْء"
 *
 * Implements microsecond congestion window sizing, RTT smoothing, and saturation rate-limiting for wire-speed P2P transport.
 */

class SaylFlow {
  constructor(options = {}) {
    this.initialCwnd = options.initialCwnd || 10;
    this.minCwnd = options.minCwnd || 2;
    this.maxCwnd = options.maxCwnd || 200;
    this.flows = new Map(); // peerId -> state
  }

  initPeerFlow(peerId) {
    this.flows.set(peerId, {
      peerId,
      congestionWindow: this.initialCwnd,
      bytesInFlight: 0,
      packetsInFlight: 0,
      rttMin: Infinity,
      rttSmoothed: 50,
      bandwidthEstimate: 1000000, // 1 MB/s default
      lastAckTime: Date.now()
    });
    return this.flows.get(peerId);
  }

  canTransmit(peerId) {
    const flow = this.flows.get(peerId) || this.initPeerFlow(peerId);
    return flow.packetsInFlight < flow.congestionWindow;
  }

  onPacketSent(peerId, byteSize) {
    const flow = this.flows.get(peerId) || this.initPeerFlow(peerId);
    flow.packetsInFlight++;
    flow.bytesInFlight += byteSize;
  }

  onPacketAck(peerId, byteSize, rttSampleMs) {
    const flow = this.flows.get(peerId) || this.initPeerFlow(peerId);
    flow.packetsInFlight = Math.max(0, flow.packetsInFlight - 1);
    flow.bytesInFlight = Math.max(0, flow.bytesInFlight - byteSize);
    flow.lastAckTime = Date.now();

    // RTT Smoothing (Exponential Moving Average)
    flow.rttSmoothed = 0.875 * flow.rttSmoothed + 0.125 * rttSampleMs;
    if (rttSampleMs < flow.rttMin) flow.rttMin = rttSampleMs;

    // Congestion Window Growth (Additive Increase)
    if (flow.congestionWindow < this.maxCwnd) {
      flow.congestionWindow += 1;
    }
  }

  onPacketLoss(peerId) {
    const flow = this.flows.get(peerId);
    if (flow) {
      // Multiplicative Decrease
      flow.congestionWindow = Math.max(this.minCwnd, Math.floor(flow.congestionWindow * 0.5));
    }
  }
}

module.exports = SaylFlow;
