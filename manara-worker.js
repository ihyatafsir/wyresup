/**
 * مَنارة (Manara) Worker
 * Cloudflare Workers - Decentralized Peer Discovery Endpoint
 * 
 * Deploy: wrangler deploy
 * 
 * Routes:
 * - POST /mawid/:port - Register presence
 * - GET  /mawid/:port - Get peers at this maw'id
 */

// In-memory peer store (use KV for production)
const peers = new Map();

// Clean expired peers every request
function cleanExpired() {
    const now = Date.now();
    for (const [port, portPeers] of peers) {
        for (const [peerId, peer] of portPeers) {
            if (now - peer.timestamp > peer.ttl) {
                portPeers.delete(peerId);
            }
        }
        if (portPeers.size === 0) {
            peers.delete(port);
        }
    }
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;

        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Parse route: /mawid/:port
        const match = path.match(/^\/mawid\/(\d+)$/);
        if (!match) {
            return new Response(JSON.stringify({ error: 'Invalid route' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const port = match[1];
        cleanExpired();

        // POST - Register presence (حُضُور)
        if (request.method === 'POST') {
            try {
                const beacon = await request.json();

                if (!beacon.peerId || !beacon.publicKey) {
                    return new Response(JSON.stringify({ error: 'Missing peerId or publicKey' }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                // Store peer
                if (!peers.has(port)) {
                    peers.set(port, new Map());
                }

                peers.get(port).set(beacon.peerId, {
                    peerId: beacon.peerId,
                    publicKey: beacon.publicKey,
                    mawIdPort: parseInt(port),
                    timestamp: Date.now(),
                    ttl: beacon.ttl || 60000,
                    lastSeen: Date.now(),
                });

                console.log(`[MANARA] حُضُور: ${beacon.peerId.split('@')[0]} at مَوْعِد ${port}`);

                return new Response(JSON.stringify({ ok: true }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            } catch (e) {
                return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        }

        // GET - Get peers at this maw'id
        if (request.method === 'GET') {
            const portPeers = peers.get(port);
            const peerList = portPeers ? Array.from(portPeers.values()) : [];

            console.log(`[MANARA] لِقَاء query: ${peerList.length} peers at مَوْعِد ${port}`);

            return new Response(JSON.stringify(peerList), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    },
};
