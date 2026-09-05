/**
 * webrtc_channel.js
 *
 * WyreSup Sovereign P2P WebRTC Communication Channel (v2.0)
 * Grounded in the 5 Classical Arabic Epistemic Pillars:
 * 1. Al-Mufradāt (Pure Domain Teleology & Ontological Modeling)
 * 2. Asās al-Balāghah (Anti-Leakage & Rhetorical Eloquence)
 * 3. Lisān al-ʿArab (Exhaustive Lifecycle States & Zero-Loss Error Handling)
 * 4. Kitāb al-ʿAyn (Orthogonal Primitive Decomposition)
 * 5. Al-Kitāb Sībawayh (Syntactic Governance & Strict Contracts)
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.WyreWebRtcChannel = factory();
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  // Classical Lifecycle State Enumeration (Lisān al-ʿArab)
  const ChannelState = Object.freeze({
    INITIALIZING: "INITIALIZING",
    CONNECTING: "CONNECTING",
    CONNECTED: "CONNECTED",
    DEGRADED: "DEGRADED",
    CLOSED: "CLOSED",
    FAILED: "FAILED"
  });

  class WyreWebRtcChannel {
    constructor(configuration = {}) {
      this.rtcConfig = configuration.rtcConfig || {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ],
        sdpSemantics: "unified-plan",
        bundlePolicy: "max-bundle"
      };
      this.channelState = ChannelState.INITIALIZING;
      this.remoteMediaStream = null;
      this.peerConnection = null;
    }

    /**
     * Initializes and configures an RTCPeerConnection with unified track routing
     * and exhaustive lifecycle event management.
     */
    createPeerConnection(options = {}) {
      const {
        localStream,
        targetPeerId,
        onRemoteTrack,
        onIceCandidate,
        onConnectionChange,
        onError
      } = options;

      const pc = new RTCPeerConnection(this.rtcConfig);
      this.peerConnection = pc;
      this.channelState = ChannelState.CONNECTING;
      this.remoteMediaStream = new MediaStream();

      // 1. Ingest Local Media Tracks (Kitāb al-ʿAyn primitive binding)
      if (localStream && typeof localStream.getTracks === "function") {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      // 2. Direct Bilateral Remote Track Accumulation
      pc.ontrack = (event) => {
        let stream = (event.streams && event.streams[0]) ? event.streams[0] : null;
        if (!stream) {
          if (!this.remoteMediaStream) {
            this.remoteMediaStream = new MediaStream();
          }
          this.remoteMediaStream.addTrack(event.track);
          stream = this.remoteMediaStream;
        }

        if (typeof onRemoteTrack === "function") {
          onRemoteTrack(stream, event.track);
        }
      };

      // 3. Bilateral ICE Candidate Signaling
      pc.onicecandidate = (event) => {
        if (event.candidate && typeof onIceCandidate === "function") {
          onIceCandidate(event.candidate, targetPeerId);
        }
      };

      // 4. Exhaustive Connection State Machine (Lisān al-ʿArab)
      pc.onconnectionstatechange = () => {
        const cs = pc.connectionState;
        switch (cs) {
          case "connected":
            this.channelState = ChannelState.CONNECTED;
            break;
          case "connecting":
            this.channelState = ChannelState.CONNECTING;
            break;
          case "disconnected":
            this.channelState = ChannelState.DEGRADED;
            break;
          case "failed":
            this.channelState = ChannelState.FAILED;
            break;
          case "closed":
            this.channelState = ChannelState.CLOSED;
            break;
        }

        if (typeof onConnectionChange === "function") {
          onConnectionChange(this.channelState, cs);
        }
      };

      // 5. ICE Connection Failure Watchdog
      pc.oniceconnectionstatechange = () => {
        const iceState = pc.iceConnectionState;
        if (iceState === "failed" || iceState === "disconnected") {
          if (typeof onError === "function") {
            onError(new Error("ICE connection entered degraded state: " + iceState));
          }
        }
      };

      return pc;
    }

    /**
     * Synthesizes and applies local offer SDP.
     */
    async generateOffer(pc, sdpModifier = null) {
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });

        let finalSdp = offer.sdp;
        if (typeof sdpModifier === "function") {
          finalSdp = sdpModifier(finalSdp);
        }

        const sessionDesc = new RTCSessionDescription({ type: "offer", sdp: finalSdp });
        await pc.setLocalDescription(sessionDesc);
        return sessionDesc;
      } catch (offerError) {
        this.channelState = ChannelState.FAILED;
        console.error("[WyreWebRtcChannel] Failed to generate local offer:", offerError);
        throw offerError;
      }
    }

    /**
     * Ingests remote offer and synthesizes local answer SDP.
     */
    async generateAnswer(pc, remoteOfferSdp, sdpModifier = null) {
      try {
        const remoteDesc = new RTCSessionDescription(remoteOfferSdp);
        await pc.setRemoteDescription(remoteDesc);

        const answer = await pc.createAnswer();
        let finalSdp = answer.sdp;
        if (typeof sdpModifier === "function") {
          finalSdp = sdpModifier(finalSdp);
        }

        const sessionDesc = new RTCSessionDescription({ type: "answer", sdp: finalSdp });
        await pc.setLocalDescription(sessionDesc);
        return sessionDesc;
      } catch (answerError) {
        this.channelState = ChannelState.FAILED;
        console.error("[WyreWebRtcChannel] Failed to generate local answer:", answerError);
        throw answerError;
      }
    }

    /**
     * Applies remote answer SDP to the active peer connection.
     */
    async applyRemoteAnswer(pc, remoteAnswerSdp) {
      try {
        const remoteDesc = new RTCSessionDescription(remoteAnswerSdp);
        await pc.setRemoteDescription(remoteDesc);
      } catch (descError) {
        console.error("[WyreWebRtcChannel] Failed to apply remote answer:", descError);
        throw descError;
      }
    }

    /**
     * Safely queues or applies a remote ICE candidate.
     */
    async applyIceCandidate(pc, candidateInit) {
      try {
        if (!candidateInit) return;
        const candidate = new RTCIceCandidate(candidateInit);
        await pc.addIceCandidate(candidate);
      } catch (iceError) {
        console.warn("[WyreWebRtcChannel] Safe ICE candidate application warning:", iceError.message);
      }
    }

    /**
     * Gracefully tears down peer connection and active tracks.
     */
    terminateSession(pc = null) {
      const activePc = pc || this.peerConnection;
      this.channelState = ChannelState.CLOSED;

      if (activePc) {
        try {
          activePc.ontrack = null;
          activePc.onicecandidate = null;
          activePc.onconnectionstatechange = null;
          activePc.oniceconnectionstatechange = null;
          activePc.close();
        } catch (closeError) {
          console.warn("[WyreWebRtcChannel] Safe close notice:", closeError.message);
        }
      }

      if (this.remoteMediaStream && typeof this.remoteMediaStream.getTracks === "function") {
        this.remoteMediaStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (trackError) {
            console.warn("[WyreWebRtcChannel] Track stop notice:", trackError.message);
          }
        });
      }

      this.peerConnection = null;
      this.remoteMediaStream = null;
    }
  }

  WyreWebRtcChannel.State = ChannelState;
  return WyreWebRtcChannel;
});