'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Bell, Search, Store, Library, MessageCircle, Heart, Menu, ArrowLeft, Star, MapPin, Send, User } from 'lucide-react';

// Screen types for the flow
type Screen = 'marketplace' | 'detail' | 'profile' | 'chat';

// Timeline: 0-3s: scroll, 3s: tap, 3-4s: detail, 4-5s: tap profile, 5-6s: profile view, 6-7s: tap chat, 7-10s: chat, 10s: reset
const TOTAL_DURATION = 12000; // 12 seconds total loop

const mockCards = [
    { id: 1, title: 'Messi #10', collection: 'Liga 2024', color: 'from-yellow-100 to-yellow-200' },
    { id: 2, title: 'Mbappé #7', collection: 'Champions', color: 'from-blue-100 to-blue-200' },
    { id: 3, title: 'Haaland #9', collection: 'Premier', color: 'from-purple-100 to-purple-200' },
    { id: 4, title: 'Vinicius #20', collection: 'Liga 2024', color: 'from-green-100 to-green-200' },
    { id: 5, title: 'Bellingham #5', collection: 'Champions', color: 'from-pink-100 to-pink-200' },
    { id: 6, title: 'Pedri #8', collection: 'Liga 2024', color: 'from-orange-100 to-orange-200' },
];

// Marketplace Screen Component
function MarketplaceScreen({ onTapCard, scrollY }: { onTapCard: () => void; scrollY: number }) {
    return (
        <div className="flex-1 overflow-hidden relative">
            <motion.div
                className="grid grid-cols-2 gap-2 px-3"
                animate={{ y: scrollY }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
                {mockCards.map((card, index) => (
                    <motion.div
                        key={card.id}
                        className="bg-white rounded-xl border p-2 flex flex-col gap-2 shadow-sm cursor-pointer"
                        whileTap={{ scale: 0.95 }}
                        onClick={index === 0 ? onTapCard : undefined}
                    >
                        <div className={`aspect-[3/4] bg-gradient-to-br ${card.color} rounded-lg relative overflow-hidden`}>
                            {index === 0 && (
                                <motion.div
                                    className="absolute inset-0 bg-[#FFC000]/30 rounded-lg"
                                    animate={{ opacity: [0, 0.5, 0] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                />
                            )}
                            <svg viewBox="0 0 100 100" className="w-full h-full p-2 opacity-60">
                                <circle cx="50" cy="35" r="12" fill="currentColor" className="text-gray-800" />
                                <path d="M50 47 L50 75" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-gray-800" />
                                <path d="M50 75 L35 90" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-gray-800" />
                                <path d="M50 75 L65 85" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-gray-800" />
                            </svg>
                        </div>
                        <div className="space-y-1">
                            <div className="font-bold text-[10px] truncate">{card.title}</div>
                            <div className="text-[8px] text-gray-500 truncate">{card.collection}</div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}

// Detail Screen Component
function DetailScreen({ onTapProfile }: { onTapProfile: () => void }) {
    return (
        <motion.div
            className="flex-1 overflow-hidden bg-white"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Sticker image */}
            <div className="aspect-square bg-gradient-to-br from-yellow-100 to-yellow-200 relative">
                <svg viewBox="0 0 100 100" className="w-full h-full p-8 opacity-70">
                    <circle cx="50" cy="35" r="15" fill="#FFC000" stroke="black" strokeWidth="2" />
                    <path d="M50 50 L50 80" stroke="black" strokeWidth="4" strokeLinecap="round" />
                    <path d="M50 80 L30 95" stroke="black" strokeWidth="4" strokeLinecap="round" />
                    <path d="M50 80 L70 95" stroke="black" strokeWidth="4" strokeLinecap="round" />
                </svg>
                <div className="absolute top-2 left-2 bg-[#FFC000] text-black text-[8px] font-black px-2 py-0.5 rounded">
                    ESPECIAL
                </div>
            </div>

            {/* Details */}
            <div className="p-3 space-y-2">
                <h3 className="font-black text-sm">Messi #10</h3>
                <p className="text-[10px] text-gray-500">Liga 2024 • Cromo Especial</p>

                {/* Seller info - tappable */}
                <motion.div
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer"
                    onClick={onTapProfile}
                    whileTap={{ scale: 0.98 }}
                    animate={{ backgroundColor: ['#f9fafb', '#FFC00020', '#f9fafb'] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    <div className="w-8 h-8 rounded-full bg-[#D97757] overflow-hidden">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
                    </div>
                    <div className="flex-1">
                        <div className="font-bold text-[10px]">Carlos_Collector</div>
                        <div className="flex items-center gap-1 text-[8px] text-gray-500">
                            <Star className="w-2 h-2 fill-yellow-400 text-yellow-400" />
                            <span>4.9</span>
                            <span>• 127 intercambios</span>
                        </div>
                    </div>
                    <ArrowLeft className="w-3 h-3 text-gray-400 rotate-180" />
                </motion.div>
            </div>
        </motion.div>
    );
}

// Profile Screen Component
function ProfileScreen({ onTapChat }: { onTapChat: () => void }) {
    return (
        <motion.div
            className="flex-1 overflow-hidden bg-gray-50"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Profile header */}
            <div className="bg-white p-4 text-center border-b">
                <div className="w-16 h-16 rounded-full bg-[#D97757] overflow-hidden mx-auto mb-2 border-2 border-[#FFC000]">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
                </div>
                <div className="font-black text-sm">Carlos_Collector</div>
                <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500">
                    <MapPin className="w-2.5 h-2.5" />
                    <span>Madrid, España</span>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                    <div className="text-center">
                        <div className="font-bold text-xs">127</div>
                        <div className="text-[8px] text-gray-500">Trades</div>
                    </div>
                    <div className="text-center">
                        <div className="font-bold text-xs flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                            4.9
                        </div>
                        <div className="text-[8px] text-gray-500">Rating</div>
                    </div>
                </div>
            </div>

            {/* Chat button */}
            <div className="p-3">
                <motion.button
                    className="w-full bg-[#FFC000] text-black font-bold text-[10px] py-2.5 rounded-lg flex items-center justify-center gap-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    onClick={onTapChat}
                    whileTap={{ scale: 0.98, y: 2, boxShadow: '0px 0px 0px 0px rgba(0,0,0,1)' }}
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                >
                    <MessageCircle className="w-3 h-3" />
                    Enviar Mensaje
                </motion.button>
            </div>

            {/* Some listings */}
            <div className="px-3">
                <div className="text-[10px] font-bold mb-2">Sus anuncios (24)</div>
                <div className="grid grid-cols-3 gap-1">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="aspect-square bg-white rounded border" />
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

// Chat Screen Component
function ChatScreen() {
    const [showMessages, setShowMessages] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setShowMessages(true), 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <motion.div
            className="flex-1 overflow-hidden bg-gray-50 flex flex-col"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Chat header */}
            <div className="bg-white p-2 border-b flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#D97757] overflow-hidden">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
                </div>
                <div>
                    <div className="font-bold text-[11px]">Carlos_Collector</div>
                    <div className="text-[9px] text-green-500">En línea</div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-3 space-y-2">
                <AnimatePresence>
                    {showMessages && (
                        <>
                            <motion.div
                                className="bg-white rounded-lg p-2 max-w-[80%] text-[11px] shadow-sm"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                ¡Hola! Vi que tienes el cromo de Messi. ¿Lo intercambias?
                            </motion.div>
                            <motion.div
                                className="bg-[#FFC000] rounded-lg p-2 max-w-[80%] text-[11px] shadow-sm ml-auto"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8 }}
                            >
                                ¡Claro! ¿Qué tienes para ofrecer?
                            </motion.div>
                            <motion.div
                                className="bg-white rounded-lg p-2 max-w-[80%] text-[11px] shadow-sm"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1.3 }}
                            >
                                Tengo Mbappé y Haaland duplicados 🔥
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Input */}
            <div className="p-2 bg-white border-t flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full px-3 py-1.5 text-[11px] text-gray-400">
                    Escribe un mensaje...
                </div>
                <div className="w-7 h-7 bg-[#FFC000] rounded-full flex items-center justify-center">
                    <Send className="w-3 h-3 text-black" />
                </div>
            </div>
        </motion.div>
    );
}

export default function AnimatedPhoneMockup({ className }: { className?: string }) {
    const [currentScreen, setCurrentScreen] = useState<Screen>('marketplace');
    const [scrollY, setScrollY] = useState(0);
    const [showTapIndicator, setShowTapIndicator] = useState(false);

    useEffect(() => {
        let timeoutIds: NodeJS.Timeout[] = [];

        const runAnimation = () => {
            // Reset
            setCurrentScreen('marketplace');
            setScrollY(0);
            setShowTapIndicator(false);

            // 0-2s: Scroll down
            timeoutIds.push(setTimeout(() => setScrollY(-40), 500));
            timeoutIds.push(setTimeout(() => setScrollY(-60), 1500));

            // 2s: Show tap indicator
            timeoutIds.push(setTimeout(() => setShowTapIndicator(true), 2000));

            // 3s: Navigate to detail
            timeoutIds.push(setTimeout(() => {
                setShowTapIndicator(false);
                setCurrentScreen('detail');
            }, 3000));

            // 5s: Navigate to profile
            timeoutIds.push(setTimeout(() => setCurrentScreen('profile'), 5500));

            // 7.5s: Navigate to chat
            timeoutIds.push(setTimeout(() => setCurrentScreen('chat'), 8000));

            // 12s: Loop
            timeoutIds.push(setTimeout(runAnimation, TOTAL_DURATION));
        };

        runAnimation();

        return () => timeoutIds.forEach(id => clearTimeout(id));
    }, []);

    return (
        <div className={className ?? "flex-1 justify-center relative w-full max-w-[300px] perspective-[2000px] mt-[-20px] hidden lg:flex"}>
            {/* Glow effect */}
            <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[620px] rounded-[3rem] opacity-50"
                style={{
                    background: 'radial-gradient(circle, rgba(255,192,0,0.3) 0%, rgba(255,192,0,0) 70%)',
                }}
                animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Phone */}
            <motion.div
                className="relative border-gray-900 dark:border-gray-800 bg-gray-900 dark:bg-gray-800 border-[12px] rounded-[2.5rem] h-[600px] w-[300px] shadow-[30px_35px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden ring-4 ring-black/10 z-10 mx-auto"
                initial={{ rotateY: -12 }}
                whileHover={{ rotateY: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
            >
                {/* Notch */}
                <div className="h-[28px] bg-gray-900 w-full absolute top-0 left-0 z-20 rounded-t-[1.5rem] flex justify-center">
                    <div className="h-[18px] w-[80px] bg-black rounded-b-xl" />
                </div>

                <div className="flex-1 bg-gray-50 pt-8 pb-0 overflow-hidden flex flex-col relative select-none">
                    {/* Header */}
                    <div className="px-3 mb-2 flex justify-between items-center bg-white py-2 shadow-sm">
                        {currentScreen !== 'marketplace' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mr-2"
                            >
                                <ArrowLeft className="w-4 h-4 text-gray-700" />
                            </motion.div>
                        )}
                        <div className="flex items-center gap-2">
                            <div className="relative w-5 h-5">
                                <Image src="/assets/LogoBlanco.png" alt="Logo" fill className="object-contain" />
                            </div>
                            <div className="font-black text-[9px] tracking-tighter">CAMBIOCROMOS</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-gray-700" strokeWidth={2.5} />
                            <div className="w-6 h-6 rounded-full bg-[#D97757] overflow-hidden">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Me" alt="User" />
                            </div>
                        </div>
                    </div>

                    {/* Search bar - only on marketplace */}
                    {currentScreen === 'marketplace' && (
                        <div className="px-3 mb-2">
                            <div className="bg-white border rounded-lg p-2 flex items-center gap-2 text-gray-400 text-[10px] shadow-sm">
                                <Search className="w-3 h-3" />
                                <span>Buscar cromos...</span>
                            </div>
                        </div>
                    )}

                    {/* Screen content */}
                    <AnimatePresence mode="wait">
                        {currentScreen === 'marketplace' && (
                            <MarketplaceScreen
                                key="marketplace"
                                scrollY={scrollY}
                                onTapCard={() => setCurrentScreen('detail')}
                            />
                        )}
                        {currentScreen === 'detail' && (
                            <DetailScreen key="detail" onTapProfile={() => setCurrentScreen('profile')} />
                        )}
                        {currentScreen === 'profile' && (
                            <ProfileScreen key="profile" onTapChat={() => setCurrentScreen('chat')} />
                        )}
                        {currentScreen === 'chat' && <ChatScreen key="chat" />}
                    </AnimatePresence>

                    {/* Tap indicator */}
                    <AnimatePresence>
                        {showTapIndicator && (
                            <motion.div
                                className="absolute top-32 left-[25%] z-30"
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                            >
                                <motion.div
                                    className="w-10 h-10 rounded-full bg-white/80 border-2 border-[#FFC000] flex items-center justify-center shadow-lg"
                                    animate={{ scale: [1, 0.9, 1] }}
                                    transition={{ duration: 0.5, repeat: Infinity }}
                                >
                                    <User className="w-4 h-4 text-[#FFC000]" />
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Bottom Nav - always visible */}
                    <div className="h-12 bg-white border-t flex justify-between items-center px-6">
                        <Store className={`w-5 h-5 ${currentScreen === 'marketplace' ? 'text-gray-900' : 'text-gray-400'}`} strokeWidth={2.5} />
                        <Library className="w-5 h-5 text-gray-400" />
                        <MessageCircle className={`w-5 h-5 ${currentScreen === 'chat' ? 'text-gray-900' : 'text-gray-400'}`} strokeWidth={currentScreen === 'chat' ? 2.5 : 2} />
                        <Heart className="w-5 h-5 text-gray-400" />
                        <Menu className="w-5 h-5 text-gray-400" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
