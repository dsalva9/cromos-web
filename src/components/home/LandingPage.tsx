'use client';

import Link from '@/components/ui/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MarketplaceShowcase from './MarketplaceShowcase';
import AnimatedPhoneMockup from './AnimatedPhoneMockup';
import PWAInstallButton from '@/components/pwa/PWAInstallButton';
import { ArrowRight, Check, Search, Trophy } from 'lucide-react';

export default function LandingPage() {


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
                                    src="/assets/LogoBlanco.png"
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
                                    asChild
                                    size="lg"
                                    variant="outline"
                                    className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm text-black dark:text-white font-bold text-lg h-14 px-8 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-none rounded-xl cursor-pointer"
                                >
                                    <Link href="/explorar">Explorar Mercado</Link>
                                </Button>
                            </div>

                            <Link
                                href="/login"
                                className="text-gray-600 dark:text-gray-400 font-bold hover:text-[#FFC000] transition-colors flex items-center justify-center gap-2 text-sm pt-2"
                            >
                                ¿Ya tienes cuenta? <span className="text-black dark:text-white border-b-2 border-[#FFC000]">Inicia Sesión</span>
                            </Link>

                            {/* Download Section — mobile only */}
                            <div className="flex flex-col items-center gap-3 pt-4 md:hidden">
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                    Disponible en:
                                </p>
                                <div className="flex flex-row items-center gap-4">
                                    <a
                                        href="https://play.google.com/store/apps/details?id=com.cambiocromos.app"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2.5 bg-black hover:bg-gray-800 text-white rounded-lg px-5 h-[48px] transition-colors"
                                    >
                                        {/* Google Play icon */}
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 0 1 0 1.38l-2.302 2.302L15.396 13l2.302-2.492zM5.864 3.458L16.8 9.791l-2.302 2.302-8.635-8.635z" fill="#34A853"/>
                                            <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92z" fill="#4285F4"/>
                                            <path d="M5.864 3.458L16.8 9.791l-2.302 2.302-8.635-8.635z" fill="#EA4335"/>
                                            <path d="M16.8 14.209l-2.302 2.302-8.635 8.635L16.8 14.209z" fill="#FBBC05"/>
                                            <path d="M5.864 20.542l8.635-8.635 2.302 2.302L5.864 20.542z" fill="#34A853"/>
                                        </svg>
                                        <span className="text-sm font-semibold">Google Play</span>
                                    </a>
                                    <PWAInstallButton />
                                </div>
                            </div>

                            {/* Phone Mockup - MOBILE ONLY */}
                            <AnimatedPhoneMockup className="flex justify-center relative w-full max-w-[260px] perspective-[2000px] mt-2 lg:hidden" flat />

                        </div>

                        {/* Right Phone Mockup - DESKTOP ONLY */}
                        <AnimatedPhoneMockup />
                    </div>
                </div>
            </section>

            {/* Features Section - Condensed on Mobile */}
            <section className="py-4 lg:py-6 relative bg-gradient-to-b from-transparent via-yellow-50/30 to-yellow-100/60 dark:via-yellow-900/5 dark:to-yellow-900/10">
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
                                <h3 className="text-lg lg:text-xl font-black uppercase mb-1 lg:mb-2 text-gray-900 dark:text-white">Gana Logros</h3>
                                <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 md:line-clamp-none">
                                    Completa intercambios y destaca como un "Top Trader".
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* Marketplace Preview */}
            <div id="marketplace" className="relative">
                {/* Subtle warm background tint for marketplace section */}
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-yellow-100/30 to-transparent dark:from-yellow-900/10 dark:to-transparent pointer-events-none" />
                <MarketplaceShowcase />
            </div>

            {/* SEO Context Paragraph */}
            <section className="py-12 lg:py-16 bg-gradient-to-b from-yellow-50/20 via-gray-100/60 to-transparent dark:from-gray-800/20 dark:via-gray-800/40 dark:to-transparent">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl mx-auto text-center space-y-4">
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
                            Tu destino para el intercambio de cromos
                        </h2>
                        <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 leading-relaxed">
                            Con la Copa del Mundo 2026 a la vuelta de la esquina, es el momento de completar tu colección. Sean colecciones de cromos de Panini, Adrenalyn XL o Topps, de LaLiga o del Mundial 2026... CambioCromos es el lugar perfecto para cambiar cromos de fútbol del Mundial y cualquier otra colección deportiva. Gestiona tus álbumes, encuentra los cromos que te faltan y conecta con coleccionistas de toda España — todo en una sola plataforma gratuita.
                        </p>
                    </div>
                </div>
            </section>

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
