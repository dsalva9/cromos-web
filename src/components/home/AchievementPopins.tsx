'use client';

import { motion } from 'framer-motion';
import { Trophy, Star, Medal, Award, Zap } from 'lucide-react';

const badges = [
    { Icon: Trophy, color: '#FFC000', label: 'Top Trader', delay: 0.2 },
    { Icon: Star, color: '#0d9488', label: '100 Trades', delay: 0.4 },
    { Icon: Medal, color: '#8B5CF6', label: 'Coleccionista', delay: 0.6 },
    { Icon: Award, color: '#EF4444', label: 'Verificado', delay: 0.8 },
    { Icon: Zap, color: '#F59E0B', label: 'Activo', delay: 1.0 },
];

export default function AchievementPopins() {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                {badges.map((badge, index) => {
                    // Position badges in a semicircle below the logo
                    const angle = -30 + (index * 30); // -30 to 90 degrees
                    const radius = 140;
                    const x = Math.cos((angle * Math.PI) / 180) * radius;
                    const y = Math.sin((angle * Math.PI) / 180) * radius + 60;

                    return (
                        <motion.div
                            key={index}
                            className="absolute flex flex-col items-center"
                            style={{ left: x - 20, top: y - 20 }}
                            initial={{ scale: 0, opacity: 0, y: 20 }}
                            animate={{
                                scale: [0, 1.3, 1],
                                opacity: 1,
                                y: 0,
                            }}
                            transition={{
                                duration: 0.5,
                                delay: badge.delay,
                                ease: [0.34, 1.56, 0.64, 1],
                            }}
                        >
                            <motion.div
                                className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white/50"
                                style={{ backgroundColor: badge.color }}
                                animate={{
                                    boxShadow: [
                                        `0 0 0 0px ${badge.color}40`,
                                        `0 0 0 8px ${badge.color}00`,
                                    ]
                                }}
                                transition={{
                                    duration: 1,
                                    delay: badge.delay + 0.5,
                                    repeat: Infinity,
                                    repeatDelay: 2,
                                }}
                            >
                                <badge.Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                            </motion.div>
                            <motion.span
                                className="text-[8px] font-bold text-gray-700 dark:text-gray-300 mt-1 whitespace-nowrap bg-white/80 dark:bg-gray-800/80 px-1.5 py-0.5 rounded-full shadow-sm"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: badge.delay + 0.3 }}
                            >
                                {badge.label}
                            </motion.span>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
