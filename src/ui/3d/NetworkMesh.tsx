/**
 * 3D Network Mesh Visualization
 * Displays connected peers as nodes in a 3D space
 */

import React, { useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { Peer } from '../../messaging/types';

const { width, height } = Dimensions.get('window');

interface NodeProps {
    position: [number, number, number];
    color: string;
    isMe?: boolean;
    pulseSpeed?: number;
}

function Node({ position, color, isMe, pulseSpeed = 1 }: NodeProps) {
    const meshRef = useRef<any>();
    const glowRef = useRef<any>();

    useFrame((state) => {
        if (meshRef.current) {
            // Gentle floating animation
            meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
        }
        if (glowRef.current) {
            // Pulse glow
            const scale = 1 + Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.2;
            glowRef.current.scale.set(scale, scale, scale);
        }
    });

    const size = isMe ? 0.4 : 0.25;

    return (
        <group position={position}>
            {/* Glow effect */}
            <mesh ref={glowRef}>
                <sphereGeometry args={[size * 2, 16, 16]} />
                <meshBasicMaterial color={color} transparent opacity={0.15} />
            </mesh>
            {/* Core node */}
            <mesh ref={meshRef}>
                <sphereGeometry args={[size, 32, 32]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.5}
                />
            </mesh>
        </group>
    );
}

interface ConnectionLineProps {
    start: [number, number, number];
    end: [number, number, number];
    active?: boolean;
}

function ConnectionLine({ start, end, active }: ConnectionLineProps) {
    const points = useMemo(() => {
        const midY = (start[1] + end[1]) / 2 + 0.5;
        return [
            start,
            [(start[0] + end[0]) / 2, midY, (start[2] + end[2]) / 2] as [number, number, number],
            end,
        ];
    }, [start, end]);

    return (
        <line>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={3}
                    array={new Float32Array(points.flat())}
                    itemSize={3}
                />
            </bufferGeometry>
            <lineBasicMaterial
                color={active ? '#00ff88' : '#333'}
                transparent
                opacity={active ? 0.8 : 0.3}
            />
        </line>
    );
}

interface NetworkMeshProps {
    peers: Peer[];
    myId: string;
}

export default function NetworkMesh({ peers, myId }: NetworkMeshProps) {
    // Generate node positions in a circle around center
    const nodePositions = useMemo(() => {
        const positions: { id: string; pos: [number, number, number]; connected: boolean }[] = [];

        // Me at center
        positions.push({ id: myId, pos: [0, 0, 0], connected: true });

        // Peers around
        const radius = 2;
        peers.forEach((peer, i) => {
            const angle = (i / Math.max(peers.length, 1)) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const connected = peer.lastSeen > Date.now() - 60000; // Active in last minute
            positions.push({ id: peer.id, pos: [x, 0, z], connected });
        });

        return positions;
    }, [peers, myId]);

    return (
        <View style={styles.container}>
            <Canvas
                camera={{ position: [0, 3, 5], fov: 50 }}
                style={styles.canvas}
            >
                {/* Lighting */}
                <ambientLight intensity={0.3} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00ff88" />

                {/* Background grid */}
                <gridHelper args={[10, 20, '#1a1a2e', '#0a0a15']} />

                {/* Connection lines */}
                {nodePositions.slice(1).map((node, i) => (
                    <ConnectionLine
                        key={`line-${i}`}
                        start={nodePositions[0].pos}
                        end={node.pos}
                        active={node.connected}
                    />
                ))}

                {/* Nodes */}
                {nodePositions.map((node, i) => (
                    <Node
                        key={node.id}
                        position={node.pos}
                        color={i === 0 ? '#00ff88' : node.connected ? '#4488ff' : '#666'}
                        isMe={i === 0}
                        pulseSpeed={i === 0 ? 2 : 1}
                    />
                ))}
            </Canvas>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: width,
        height: 300,
        backgroundColor: '#050510',
    },
    canvas: {
        flex: 1,
    },
});
