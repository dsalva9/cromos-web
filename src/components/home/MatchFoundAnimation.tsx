'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function MatchFoundAnimation() {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                {/* Left card sliding in */}
                <motion.div
                    className="absolute w-14 h-20 rounded-lg shadow-xl border-2 border-black/20"
                    style={{
                        background: 'linear-gradient(135deg, #FFC000 0%, #FFD54F 100%)',
                        boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.25)',
                        left: -60,
                        top: -40,
                    }}
                    initial={{ x: -100, rotate: -15, opacity: 0 }}
                    animate={{ x: 0, rotate: -8, opacity: 1 }}
                    transition={{
                        duration: 0.7,
                        delay: 0.3,
                        ease: [0.34, 1.56, 0.64, 1],
                    }}
                >
                    <div className="w-full h-full p-2 flex flex-col items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-white/40 mb-1" />
                        <div className="h-1 rounded bg-white/50 w-3/4" />
                    </div>
                </motion.div>

                {/* Right card sliding in */}
                <motion.div
                    className="absolute w-14 h-20 rounded-lg shadow-xl border-2 border-black/20"
                    style={{
                        background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
                        boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.25)',
                        right: -60,
                        top: -40,
                    }}
                    initial={{ x: 100, rotate: 15, opacity: 0 }}
                    animate={{ x: 0, rotate: 8, opacity: 1 }}
                    transition={{
                        duration: 0.7,
                        delay: 0.5,
                        ease: [0.34, 1.56, 0.64, 1],
                    }}
                >
                    <div className="w-full h-full p-2 flex flex-col items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-white/40 mb-1" />
                        <div className="h-1 rounded bg-white/50 w-3/4" />
                    </div>
                </motion.div>

                {/* Connection burst/sparkle in center */}
                <motion.div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0.8] }}
                    transition={{
                        duration: 0.5,
                        delay: 1,
                        ease: 'easeOut',
                    }}
                >
                    <Sparkles className="w-8 h-8 text-[#FFC000]" />
                </motion.div>

                {/* Particles exploding outward */}
                {[...Array(8)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-2 h-2 rounded-full bg-[#FFC000]"
                        style={{
                            left: 0,
                            top: 0,
                        }}
                        initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                        animate={{
                            scale: [0, 1, 0],
                            x: Math.cos((i * 45 * Math.PI) / 180) * 50,
                            y: Math.sin((i * 45 * Math.PI) / 180) * 50,
                            opacity: [0, 1, 0],
                        }}
                        transition={{
                            duration: 0.8,
                            delay: 1.1,
                            ease: 'easeOut',
                        }}
                    />
                ))}

                {/* "Match!" text pop */}
                <motion.div
                    className="absolute left-1/2 -translate-x-1/2 -bottom-16 whitespace-nowrap"
                    initial={{ scale: 0, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{
                        duration: 0.4,
                        delay: 1.3,
                        ease: [0.34, 1.56, 0.64, 1],
                    }}
                >
                    <span className="text-sm font-black text-[#FFC000] bg-black px-3 py-1 rounded-full border-2 border-[#FFC000] shadow-lg">
                        ¡MATCH!
                    </span>
                </motion.div>
            </div>
        </div>
    );
}
