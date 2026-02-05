'use client';

import { motion } from 'framer-motion';

const cards = [
    { id: 1, color: '#FFC000', rotation: -30, delay: 0 },
    { id: 2, color: '#0d9488', rotation: -15, delay: 0.1 },
    { id: 3, color: '#1e293b', rotation: 0, delay: 0.2 },
    { id: 4, color: '#FFC000', rotation: 15, delay: 0.3 },
    { id: 5, color: '#0d9488', rotation: 30, delay: 0.4 },
];

export default function CardRevealAnimation() {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                {cards.map((card) => (
                    <motion.div
                        key={card.id}
                        className="absolute w-12 h-16 rounded-lg shadow-lg border-2 border-black/20"
                        style={{
                            background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}cc 100%)`,
                            boxShadow: '3px 3px 0px 0px rgba(0,0,0,0.2)',
                            left: -24,
                            top: -32,
                        }}
                        initial={{
                            rotate: 0,
                            x: 0,
                            y: 0,
                            scale: 0,
                            opacity: 0
                        }}
                        animate={{
                            rotate: card.rotation,
                            x: card.rotation * 2.5,
                            y: Math.abs(card.rotation) * 0.8,
                            scale: 1,
                            opacity: 1
                        }}
                        transition={{
                            duration: 0.8,
                            delay: card.delay,
                            ease: [0.34, 1.56, 0.64, 1], // spring-like bounce
                        }}
                    >
                        {/* Card inner details */}
                        <div className="w-full h-full p-1.5 flex flex-col">
                            <div className="flex-1 rounded-sm bg-white/25" />
                            <div className="h-1 mt-1 rounded bg-white/30 w-3/4" />
                            <div className="h-1 mt-0.5 rounded bg-white/20 w-1/2" />
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
