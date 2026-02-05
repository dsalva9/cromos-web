'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MarketplaceShowcase from './MarketplaceShowcase';
import AnimatedPhoneMockup from './AnimatedPhoneMockup';
import { ArrowRight, Check, Search, Trophy } from 'lucide-react';

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
                        <AnimatedPhoneMockup />
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
