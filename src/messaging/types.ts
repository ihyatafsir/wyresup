/**
 * WyreSup Message Types (رَسَائِل - Rasāʾil)
 */

export interface TextMessage {
    id: string;
    type: 'text';
    senderId: string;      // WyreSup ID (prefix@hash)
    recipientId: string;   // WyreSup ID
    content: string;
    timestamp: number;
    signature: string;     // Base64 encoded Ed25519 signature
}

export interface VoiceMessage {
    id: string;
    type: 'voice';
    senderId: string;
    recipientId: string;
    audioData: string;     // Base64 encoded Opus audio
    duration: number;      // Duration in seconds
    timestamp: number;
    signature: string;
}

export interface Post {
    id: string;
    type: 'post';
    authorId: string;      // WyreSup ID of author
    content: string;
    timestamp: number;
    signature: string;
    // Posts are stored on followers' devices only
    receivedFrom?: string; // Which peer forwarded this post
}

export interface Peer {
    id: string;            // WyreSup ID
    publicKey: string;     // Base64 encoded public key
    lastSeen: number;
    isFollowing: boolean;
    isFollower: boolean;
    endpoint?: string;     // Last known IP:port for WireGuard
}

export type Message = TextMessage | VoiceMessage;
