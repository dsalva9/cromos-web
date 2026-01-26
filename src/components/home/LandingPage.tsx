'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MarketplaceShowcase from './MarketplaceShowcase';
import { ArrowRight, Check, Search, Trophy, Play, Star, Bell, Store, Library, MessageCircle, Heart, Menu } from 'lucide-react';

export default function LandingPage() {
    const scrollToMarketplace = () => {
        const element = document.getElementById('marketplace');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
            {/* Hero Section */}
            <section className="relative overflow-hidden pt-5 pb-2 lg:pt-12 lg:pb-4">
                {/* Background Decorative Shapes */}
                <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[800px] h-[800px] bg-[#FFC000]/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[600px] h-[600px] bg-[#FFC000]/10 rounded-full blur-3xl pointer-events-none" />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16 max-w-6xl mx-auto">

                        {/* Hero Content (Centered) */}
                        <div className="flex-1 max-w-2xl text-center space-y-6 lg:space-y-8 flex flex-col items-center">
                            <Badge className="bg-[#FFC000] text-black border-2 border-black px-4 py-1 text-sm font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wide w-fit">
                                La Plataforma #1 de intercambio de Cromos
                            </Badge>

                            <div className="relative w-64 h-64 lg:w-80 lg:h-80 mb-0 -mt-6 lg:-mt-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                                <Image
                                    src="/assets/logo.svg"
                                    alt="Logo"
                                    fill
                                    priority
                                    className="object-contain drop-shadow-xl"
                                />
                            </div>


                            <h1 className="-mt-6 lg:-mt-8 text-5xl lg:text-7xl font-black uppercase tracking-tight text-gray-900 dark:text-white leading-[0.9]">
                                Tu colección <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFC000] to-yellow-500 drop-shadow-sm">
                                    a otro nivel
                                </span>
                            </h1>

                            <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                                Gestiona tus álbumes, encuentra esos cromos difíciles y completa tu colección con la comunidad más activa en tu plataforma <span className="text-black dark:text-white font-black bg-[#FFC000]/20 dark:bg-[#FFC000]/10 px-1 rounded transform -rotate-1 inline-block border-b-2 border-[#FFC000]">totalmente gratuita</span>
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 pt-2 w-full sm:w-auto">
                                <Button
                                    asChild
                                    size="lg"
                                    className="bg-[#FFC000] hover:bg-yellow-400 text-black font-black text-lg h-14 px-8 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-none rounded-xl"
                                >
                                    <Link href="/signup">
                                        Empezar a Intercambiar
                                    </Link>
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={scrollToMarketplace}
                                    className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm text-black dark:text-white font-bold text-lg h-14 px-8 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-none rounded-xl cursor-pointer"
                                >
                                    Explorar Mercado
                                </Button>
                            </div>

                            <Link
                                href="/login"
                                className="text-gray-600 dark:text-gray-400 font-bold hover:text-[#FFC000] transition-colors flex items-center justify-center gap-2 text-sm pt-2"
                            >
                                ¿Ya tienes cuenta? <span className="text-black dark:text-white border-b-2 border-[#FFC000]">Inicia Sesión</span>
                            </Link>

                        </div>

                        {/* Right Phone Mockup - HIDDEN ON MOBILE */}
                        <div className="hidden lg:flex flex-1 justify-center relative w-full max-w-[300px] perspective-[2000px] mt-[-20px]">

                            {/* Phone Container - 3D Effect */}
                            <div className="relative border-gray-900 bg-gray-900 border-[12px] rounded-[2.5rem] h-[600px] w-[300px] shadow-[30px_35px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden ring-4 ring-black/10 transform rotate-y-[-12deg] rotate-x-[0deg] hover:rotate-0 transition-all duration-700 ease-out z-10 mx-auto group/phone">
                                {/* Dynamic Island / Notch */}
                                <div className="h-[28px] bg-gray-900 w-full absolute top-0 left-0 z-20 rounded-t-[1.5rem] flex justify-center">
                                    <div className="h-[18px] w-[80px] bg-black rounded-b-xl" />
                                </div>

                                <div className="flex-1 bg-gray-50 dark:bg-gray-900 pt-8 pb-4 overflow-hidden flex flex-col relative select-none">
                                    {/* App Header */}
                                    <div className="px-3 mb-4 flex justify-between items-center bg-white dark:bg-gray-900 py-2 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="relative w-6 h-6">
                                                <Image
                                                    src="/assets/logo.svg"
                                                    alt="Logo"
                                                    fill
                                                    className="object-contain"
                                                />
                                            </div>
                                            <div className="font-black text-[10px] tracking-tighter leading-none">CAMBIOCROMOS</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white z-10">2</div>
                                                <Bell className="w-5 h-5 text-gray-700" strokeWidth={2.5} />
                                            </div>
                                            <div className="w-8 h-8 rounded-full border border-black overflow-hidden relative bg-[#D97757]">
                                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4" alt="User" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Scrollable Content */}
                                    <div className="flex-1 overflow-y-auto px-3 space-y-4 no-scrollbar">

                                        {/* Search & Filters */}
                                        <div className="space-y-2">
                                            <div className="bg-white border rounded-lg p-2 flex items-center gap-2 text-gray-400 text-xs shadow-sm">
                                                <Search className="w-3 h-3" />
                                                <span>Buscar por título...</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="flex-1 bg-white border rounded-lg py-1.5 flex justify-center items-center gap-1 text-[10px] font-bold shadow-sm">
                                                    <span>FILTROS</span>
                                                </div>
                                                <div className="flex-1 bg-white border rounded-lg py-1.5 flex justify-center items-center gap-1 text-[10px] font-bold shadow-sm">
                                                    <span>RECIENTE</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Product Grid */}
                                        <div className="grid grid-cols-2 gap-2 pb-20">

                                            {/* Card 1: Football Player Caricature (SVG) */}
                                            <div className="bg-white rounded-xl border p-2 flex flex-col gap-2 shadow-sm">
                                                <div className="aspect-[3/4] bg-green-50 rounded-lg relative overflow-hidden flex items-end justify-center border border-green-100">
                                                    {/* Custom SVG Football Player */}
                                                    <svg viewBox="0 0 100 100" className="w-full h-full p-2">
                                                        <circle cx="50" cy="35" r="12" fill="#FFC000" stroke="black" strokeWidth="2" /> {/* Head */}
                                                        <path d="M50 47 L50 75" stroke="black" strokeWidth="3" strokeLinecap="round" /> {/* Body */}
                                                        <path d="M50 75 L35 90" stroke="black" strokeWidth="3" strokeLinecap="round" /> {/* Leg L */}
                                                        <path d="M50 75 L65 85" stroke="black" strokeWidth="3" strokeLinecap="round" /> {/* Leg R */}
                                                        <path d="M50 55 L30 45" stroke="black" strokeWidth="3" strokeLinecap="round" /> {/* Arm L */}
                                                        <path d="M50 55 L70 45" stroke="black" strokeWidth="3" strokeLinecap="round" /> {/* Arm R */}
                                                        <circle cx="72" cy="88" r="8" fill="white" stroke="black" strokeWidth="2" /> {/* Ball */}
                                                    </svg>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="font-bold text-xs truncate">Liga 2024</div>
                                                    <div className="text-[9px] text-gray-500 truncate">Cromo Especial</div>
                                                    <Button size="sm" className="w-full bg-[#FFC000] hover:bg-yellow-400 text-black text-[9px] font-bold h-6 rounded-md p-0 shadow-sm border border-yellow-500">
                                                        VER DETALLES
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Card 2: Album/Pack */}
                                            <div className="bg-white rounded-xl border p-2 flex flex-col gap-2 shadow-sm">
                                                <div className="aspect-[3/4] bg-yellow-50 rounded-lg relative overflow-hidden flex items-center justify-center p-4">
                                                    {/* Badge */}
                                                    <div className="absolute top-1 left-1 bg-black text-[#FFC000] rounded px-1 text-[8px] font-black z-10 shadow-sm border border-yellow-500/50">
                                                        PACK
                                                    </div>
                                                    {/* Album Mockup */}
                                                    <div className="w-16 h-20 bg-white border border-gray-300 shadow-xl rounded-r-md rounded-l-sm relative flex items-center justify-center overflow-hidden transform rotate-[-5deg]">
                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-200"></div>
                                                        <div className="w-8 h-8 rounded-full bg-blue-500 opacity-20"></div>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="font-bold text-xs truncate">Liga 2024</div>
                                                    <div className="text-[9px] text-gray-500 truncate">Sobre Premium</div>
                                                    <Button size="sm" className="w-full bg-[#FFC000] hover:bg-yellow-400 text-black text-[9px] font-bold h-6 rounded-md p-0 shadow-sm border border-yellow-500">
                                                        VER DETALLES
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Card 3: Another Player (Bottom) */}
                                            <div className="bg-white rounded-xl border p-2 flex flex-col gap-2 shadow-sm">
                                                <div className="aspect-[3/4] bg-blue-50 rounded-lg relative overflow-hidden flex items-end justify-center border border-blue-100">
                                                    <svg viewBox="0 0 100 100" className="w-full h-full p-2">
                                                        <circle cx="50" cy="35" r="12" fill="#3B82F6" stroke="black" strokeWidth="2" />
                                                        <path d="M50 47 L50 75" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                                        <path d="M50 75 L30 95" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                                        <path d="M50 75 L70 95" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                                        <path d="M50 55 L25 50" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                                        <path d="M50 55 L75 50" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                                    </svg>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="font-bold text-xs truncate">Liga 2024</div>
                                                    <div className="text-[9px] text-gray-500 truncate">Cromo Especial</div>
                                                    <Button size="sm" className="w-full bg-[#FFC000] hover:bg-yellow-400 text-black text-[9px] font-bold h-6 rounded-md p-0 shadow-sm border border-yellow-500">
                                                        VER DETALLES
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Card 4: Another Player (Bottom) */}
                                            <div className="bg-white rounded-xl border p-2 flex flex-col gap-2 shadow-sm">
                                                <div className="aspect-[3/4] bg-purple-50 rounded-lg relative overflow-hidden flex items-end justify-center border border-purple-100">
                                                    <svg viewBox="0 0 100 100" className="w-full h-full p-2">
                                                        {/* Goalkeeper Saving! */}
                                                        <circle cx="65" cy="45" r="10" fill="#A855F7" stroke="black" strokeWidth="2" />
                                                        <path d="M65 55 L45 75" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                                        <path d="M45 75 L30 85" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                                        <path d="M45 75 L35 90" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                                        <path d="M60 60 L35 40" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                                        <path d="M60 60 L40 30" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                                        <circle cx="20" cy="25" r="8" fill="white" stroke="black" strokeWidth="2" />
                                                    </svg>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="font-bold text-xs truncate">Liga 2024</div>
                                                    <div className="text-[9px] text-gray-500 truncate">Cromo Especial</div>
                                                    <Button size="sm" className="w-full bg-[#FFC000] hover:bg-yellow-400 text-black text-[9px] font-bold h-6 rounded-md p-0 shadow-sm border border-yellow-500">
                                                        VER DETALLES
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* FAB */}
                                    <div className="absolute bottom-16 right-4 w-10 h-10 bg-[#FFC000] rounded-full flex items-center justify-center shadow-lg border border-yellow-500 z-10">
                                        <span className="text-xl font-bold">+</span>
                                    </div>

                                    {/* Bottom Nav */}
                                    <div className="absolute bottom-0 left-0 right-0 h-14 bg-white border-t flex justify-between items-center px-6 pb-2 pt-2">
                                        <div className="flex flex-col items-center gap-1 cursor-pointer">
                                            <Store className="w-5 h-5 text-gray-900" strokeWidth={2.5} />
                                        </div>
                                        <div className="flex flex-col items-center gap-1 cursor-pointer">
                                            <Library className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <div className="flex flex-col items-center gap-1 cursor-pointer">
                                            <MessageCircle className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <div className="flex flex-col items-center gap-1 cursor-pointer">
                                            <Heart className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <div className="flex flex-col items-center gap-1 cursor-pointer">
                                            <Menu className="w-5 h-5 text-gray-400" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section - Condensed on Mobile */}
            <section className="py-4 lg:py-6 relative">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 max-w-6xl mx-auto">

                        {/* Feature 1 */}
                        <div className="group p-4 lg:p-6 rounded-2xl lg:rounded-3xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-transparent hover:border-[#FFC000] transition-all duration-300 flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-0">
                            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-[#FFC000] flex items-center justify-center shadow-lg shrink-0">
                                <Check className="w-6 h-6 lg:w-8 lg:h-8 text-black" strokeWidth={3} />
                            </div>
                            <div className="md:mt-4">
                                <h3 className="text-lg lg:text-xl font-black uppercase mb-1 lg:mb-2 text-gray-900 dark:text-white">Gestiona Albumes</h3>
                                <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 md:line-clamp-none">
                                    Olvídate del papel. Marca los cromos que te faltan y repes directamente en la app.
                                </p>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="group p-4 lg:p-6 rounded-2xl lg:rounded-3xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-transparent hover:border-[#FFC000] transition-all duration-300 flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-0">
                            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-black dark:bg-white flex items-center justify-center shadow-lg shrink-0">
                                <Search className="w-6 h-6 lg:w-7 lg:h-7 text-white dark:text-black" strokeWidth={3} />
                            </div>
                            <div className="md:mt-4">
                                <h3 className="text-lg lg:text-xl font-black uppercase mb-1 lg:mb-2 text-gray-900 dark:text-white">Busca Repes</h3>
                                <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 md:line-clamp-none">
                                    Encuentra al instante quién tiene los cromos que te faltan.
                                </p>
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="group p-4 lg:p-6 rounded-2xl lg:rounded-3xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-transparent hover:border-[#FFC000] transition-all duration-300 flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-0">
                            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shrink-0">
                                <Trophy className="w-6 h-6 lg:w-7 lg:h-7 text-white" strokeWidth={3} />
                            </div>
                            <div className="md:mt-4">
                                <h3 className="text-lg lg:text-xl font-black uppercase mb-1 lg:mb-2 text-gray-900 dark:text-white">Gana Insignias</h3>
                                <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 md:line-clamp-none">
                                    Completa intercambios y destaca como un "Top Trader".
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* Marketplace Preview */}
            <div id="marketplace">
                <MarketplaceShowcase />
            </div>

            {/* Final CTA */}
            <section className="py-24 bg-[#FFC000] relative overflow-hidden">
                {/* Pattern Overlay */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <div className="container mx-auto px-4 text-center relative z-10">
                    <h2 className="text-4xl md:text-6xl font-black uppercase mb-8 text-black tracking-tight">
                        ¿Listo para completar tu álbum?
                    </h2>
                    <p className="text-xl md:text-2xl text-black/80 font-bold max-w-2xl mx-auto mb-10">
                        Únete a miles de coleccionistas que ya están intercambiando sus cromos hoy mismo.
                    </p>
                    <Button
                        asChild
                        size="lg"
                        className="bg-black hover:bg-gray-800 text-white font-black text-xl h-16 px-12 border-2 border-transparent shadow-2xl transition-all hover:scale-105 rounded-full"
                    >
                        <Link href="/signup">
                            Crear Cuenta Gratis <ArrowRight className="ml-2 w-6 h-6" />
                        </Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}
