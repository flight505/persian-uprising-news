
'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Node {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    type: 'bot' | 'content';
    radius: number;
}

interface Link {
    source: string;
    target: string;
}

export function NetworkGraph({ data }: { data: any }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [links, setLinks] = useState<Link[]>([]);

    useEffect(() => {
        if (!data || !data.coordinationGroups) return;

        // Transform data into nodes and links
        const newNodes: Node[] = [];
        const newLinks: Link[] = [];

        data.coordinationGroups.forEach((group: any) => {
            // Content Node (Center of the cluster)
            const contentId = `content-${group.id}`;
            newNodes.push({
                id: contentId,
                x: Math.random() * 400,
                y: Math.random() * 400,
                vx: 0,
                vy: 0,
                type: 'content',
                radius: 10
            });

            // Bot Nodes
            group.incidentIds.forEach((incidentId: string) => {
                const botId = `bot-${incidentId}`;
                // Avoid duplicates
                if (!newNodes.find(n => n.id === botId)) {
                    newNodes.push({
                        id: botId,
                        x: Math.random() * 400,
                        y: Math.random() * 400,
                        vx: 0,
                        vy: 0,
                        type: 'bot',
                        radius: 5
                    });
                }
                newLinks.push({ source: botId, target: contentId });
            });
        });

        setNodes(newNodes);
        setLinks(newLinks);

    }, [data]);

    // Simple Force Simulation Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const animate = () => {
            // Physics Constants
            const repulsion = 100;
            const springLength = 50;
            const springStrength = 0.05;
            const damping = 0.9;
            const centerStrength = 0.01;

            // Update positions
            nodes.forEach(node => {
                // Repulsion (Node vs Node)
                nodes.forEach(other => {
                    if (node === other) return;
                    const dx = node.x - other.x;
                    const dy = node.y - other.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    if (dist < 100) {
                        const force = repulsion / (dist * dist);
                        node.vx += (dx / dist) * force;
                        node.vy += (dy / dist) * force;
                    }
                });

                // Center Gravity
                const dx = 200 - node.x; // Center x
                const dy = 200 - node.y; // Center y
                node.vx += dx * centerStrength;
                node.vy += dy * centerStrength;
            });

            // Spring Force (Links)
            links.forEach(link => {
                const source = nodes.find(n => n.id === link.source);
                const target = nodes.find(n => n.id === link.target);
                if (!source || !target) return;

                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = (dist - springLength) * springStrength;

                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;

                source.vx += fx;
                source.vy += fy;
                target.vx -= fx;
                target.vy -= fy;
            });

            // Update Velocity & Position
            nodes.forEach(node => {
                node.vx *= damping;
                node.vy *= damping;
                node.x += node.vx;
                node.y += node.vy;
            });

            // Draw
            ctx.clearRect(0, 0, 400, 400);

            // Draw Links
            ctx.strokeStyle = '#cbd5e1'; // slate-300
            ctx.lineWidth = 1;
            links.forEach(link => {
                const source = nodes.find(n => n.id === link.source);
                const target = nodes.find(n => n.id === link.target);
                if (source && target) {
                    ctx.beginPath();
                    ctx.moveTo(source.x, source.y);
                    ctx.lineTo(target.x, target.y);
                    ctx.stroke();
                }
            });

            // Draw Nodes
            nodes.forEach(node => {
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
                if (node.type === 'content') {
                    ctx.fillStyle = '#dc2626'; // red-600
                } else {
                    ctx.fillStyle = '#2563eb'; // blue-600
                }
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.stroke();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        const timer = setTimeout(() => {
            animate();
        }, 100);

        return () => {
            clearTimeout(timer);
            cancelAnimationFrame(animationFrameId);
        };
    }, [nodes, links]);

    return (
        <div className="border border-gray-200 rounded-xl bg-white p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2">Bot Network Visualization (Active Clusters)</h3>
            <div className="flex justify-center bg-gray-50 rounded-lg">
                <canvas ref={canvasRef} width={400} height={400} className="w-full max-w-[400px]" />
            </div>
            <div className="flex justify-center gap-4 mt-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-600"></span>
                    <span>Content (Target)</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    <span>Bot Account</span>
                </div>
            </div>
        </div>
    );
}
