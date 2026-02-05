'use client';

import { motion } from 'framer-motion';

interface CardProps {
    delay: number;
    duration: number;
    orbitRadius: number;
    startAngle: number;
    color: string;
    size: number;
}

function OrbitingCard({ delay, duration, orbitRadius, startAngle, color, size }: CardProps) {
    return (
        <motion.div
            className="absolute"
            style={{
                width: size,
                height: size * 1.4,
                left: '50%',
                top: '50%',
                marginLeft: -size / 2,
                marginTop: -(size * 1.4) / 2,
            }}
            animate={{
                x: [
                    Math.cos((startAngle * Math.PI) / 180) * orbitRadius,
                    Math.cos(((startAngle + 90) * Math.PI) / 180) * orbitRadius,
                    Math.cos(((startAngle + 180) * Math.PI) / 180) * orbitRadius,
                    Math.cos(((startAngle + 270) * Math.PI) / 180) * orbitRadius,
                    Math.cos((startAngle * Math.PI) / 180) * orbitRadius,
                ],
                y: [
                    Math.sin((startAngle * Math.PI) / 180) * orbitRadius * 0.4,
                    Math.sin(((startAngle + 90) * Math.PI) / 180) * orbitRadius * 0.4,
                    Math.sin(((startAngle + 180) * Math.PI) / 180) * orbitRadius * 0.4,
                    Math.sin(((startAngle + 270) * Math.PI) / 180) * orbitRadius * 0.4,
                    Math.sin((startAngle * Math.PI) / 180) * orbitRadius * 0.4,
                ],
                rotateY: [0, 15, 0, -15, 0],
                scale: [
                    1,
                    startAngle < 180 ? 0.8 : 1.1,
                    1,
                    startAngle >= 180 ? 0.8 : 1.1,
                    1,
                ],
            }}
            transition={{
                duration,
                delay,
                repeat: Infinity,
                ease: 'linear',
            }}
        >
            <div
                className="w-full h-full rounded-lg shadow-xl border-2 border-black/20"
                style={{
                    background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
                    boxShadow: `4px 4px 0px 0px rgba(0,0,0,0.3)`,
                }}
            >
                {/* Card inner details */}
                <div className="w-full h-full p-2 flex flex-col">
                    <div className="flex-1 rounded bg-white/20" />
                    <div className="h-2 mt-2 rounded bg-white/30 w-3/4" />
                    <div className="h-2 mt-1 rounded bg-white/20 w-1/2" />
                </div>
            </div>
        </motion.div>
    );
}

export default function OrbitingCards() {
    const cards: CardProps[] = [
        { delay: 0, duration: 12, orbitRadius: 180, startAngle: 0, color: '#FFC000', size: 50 },
        { delay: 0, duration: 12, orbitRadius: 180, startAngle: 72, color: '#0d9488', size: 45 },
        { delay: 0, duration: 12, orbitRadius: 180, startAngle: 144, color: '#1e293b', size: 48 },
        { delay: 0, duration: 12, orbitRadius: 180, startAngle: 216, color: '#FFC000', size: 42 },
        { delay: 0, duration: 12, orbitRadius: 180, startAngle: 288, color: '#0d9488', size: 46 },
        // Outer orbit
        { delay: 0, duration: 18, orbitRadius: 260, startAngle: 30, color: '#1e293b', size: 40 },
        { delay: 0, duration: 18, orbitRadius: 260, startAngle: 150, color: '#FFC000', size: 38 },
        { delay: 0, duration: 18, orbitRadius: 260, startAngle: 270, color: '#0d9488', size: 42 },
    ];

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="relative w-full h-full" style={{ perspective: '1000px' }}>
                {cards.map((card, index) => (
                    <OrbitingCard key={index} {...card} />
                ))}
            </div>
        </div>
    );
}
