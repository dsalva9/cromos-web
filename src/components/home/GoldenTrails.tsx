'use client';

import { motion } from 'framer-motion';

export default function GoldenTrails() {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Primary golden swirl */}
            <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
                <svg width="600" height="600" viewBox="0 0 600 600" className="opacity-30">
                    <defs>
                        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFC000" stopOpacity="0" />
                            <stop offset="30%" stopColor="#FFC000" stopOpacity="0.8" />
                            <stop offset="70%" stopColor="#FFD54F" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#FFC000" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="tealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#0d9488" stopOpacity="0" />
                            <stop offset="30%" stopColor="#14b8a6" stopOpacity="0.6" />
                            <stop offset="70%" stopColor="#2dd4bf" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {/* Golden spiral trail */}
                    <motion.ellipse
                        cx="300"
                        cy="300"
                        rx="250"
                        ry="120"
                        fill="none"
                        stroke="url(#goldGradient)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, rotate: 0 }}
                        animate={{ pathLength: 1, rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </svg>
            </motion.div>

            {/* Secondary teal swirl - counter rotation */}
            <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                animate={{ rotate: -360 }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            >
                <svg width="700" height="700" viewBox="0 0 700 700" className="opacity-25">
                    <ellipse
                        cx="350"
                        cy="350"
                        rx="300"
                        ry="140"
                        fill="none"
                        stroke="url(#tealGradient)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray="100 400"
                    />
                </svg>
            </motion.div>

            {/* Inner accent swirl */}
            <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            >
                <svg width="400" height="400" viewBox="0 0 400 400" className="opacity-40">
                    <ellipse
                        cx="200"
                        cy="200"
                        rx="150"
                        ry="70"
                        fill="none"
                        stroke="url(#goldGradient)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="50 150"
                    />
                </svg>
            </motion.div>

            {/* Floating particles/sparkles */}
            {[...Array(8)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-[#FFC000]"
                    style={{
                        left: `${20 + Math.random() * 60}%`,
                        top: `${20 + Math.random() * 60}%`,
                    }}
                    animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1.5, 0],
                        y: [0, -30, -60],
                    }}
                    transition={{
                        duration: 2 + Math.random() * 2,
                        delay: i * 0.5,
                        repeat: Infinity,
                        ease: 'easeOut',
                    }}
                />
            ))}
        </div>
    );
}
