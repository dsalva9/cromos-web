'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Eye,
  Users,
  TrendingUp,
  Megaphone,
  Check,
  Play,
  ArrowRight,
  Mail,
  Building2,
  MessageSquare
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/toast';

export function AdvertiseClient() {
  const t = useTranslations('advertise');
  const locale = useLocale();
  const formatSectionRef = useRef<HTMLDivElement>(null);
  
  // Scroll to top on mount to prevent Next.js layout-shift scroll preservation bugs
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Form submission handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast(t('modal.errorRequired'), 'error');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/advertise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || t('modal.errorGeneric'));
      }

      toast(t('modal.success'), 'success');
      setName('');
      setCompany('');
      setEmail('');
      setMessage('');
      setIsOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('modal.errorGeneric');
      toast(msg, 'error');
    } finally {
      setSending(false);
    }
  }

  // Scroll to layout demo section
  function scrollToFormat() {
    formatSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      
      {/* 1. Hero Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white py-16 lg:py-24 border-b border-indigo-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-gold text-black uppercase tracking-wider">
                <Megaphone className="w-3.5 h-3.5" />
                {t('heroBadge')}
              </span>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight uppercase">
                {t('heroTitle')}
              </h1>
              <p className="text-lg sm:text-xl text-indigo-200/90 font-medium leading-relaxed max-w-2xl">
                {t('heroSubtitle')}
              </p>
              
              {/* Quick stats list under title */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 text-gold">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xl font-black">41.279</div>
                    <div className="text-xs text-indigo-300 font-bold uppercase">{t('stats.visits')}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 text-gold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xl font-black">23</div>
                    <div className="text-xs text-indigo-300 font-bold uppercase">{t('stats.activeUsers')}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 text-gold">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xl font-black">+2.000</div>
                    <div className="text-xs text-indigo-300 font-bold uppercase">{t('stats.registered')}</div>
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={() => setIsOpen(true)}
                  className="inline-flex items-center justify-center gap-2 bg-gold text-black font-black px-8 py-4 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-0.5 transition-all text-base select-none cursor-pointer"
                >
                  {t('cta.info')}
                  <ArrowRight className="w-5 h-5 stroke-[3]" />
                </button>
                <button
                  onClick={scrollToFormat}
                  className="inline-flex items-center justify-center gap-2 bg-white/5 backdrop-blur-sm hover:bg-white/10 text-white font-black px-8 py-4 rounded-xl border-2 border-white/20 hover:border-white/40 transition-all text-base select-none cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white text-white" />
                  {t('cta.howItWorks')}
                </button>
              </div>
            </div>

            {/* Right Hero Visual (Chart Mockup) */}
            <div className="lg:col-span-5 relative">
              <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full" />
              
              {/* Premium Dashboard Card Mockup */}
              <div className="relative bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl p-6 overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded">
                    {t('chart.month')}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest block">
                      {t('chart.visitsLabel')}
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-4xl font-black">41.279</span>
                      <span className="text-xs font-black text-green-500 bg-green-50 dark:bg-green-950/50 px-2 py-0.5 rounded flex items-center gap-0.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {t('stats.andRising')}
                      </span>
                    </div>
                  </div>

                  {/* SVG Line Graph with Area Gradient */}
                  <div className="h-44 w-full relative">
                    <svg className="w-full h-full" viewBox="0 0 400 150">
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#818CF8" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#818CF8" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Grid Lines */}
                      <line x1="0" y1="30" x2="400" y2="30" stroke="rgba(156, 163, 175, 0.1)" strokeDasharray="4 4" />
                      <line x1="0" y1="75" x2="400" y2="75" stroke="rgba(156, 163, 175, 0.1)" strokeDasharray="4 4" />
                      <line x1="0" y1="120" x2="400" y2="120" stroke="rgba(156, 163, 175, 0.1)" strokeDasharray="4 4" />
                      
                      {/* Gradient Area */}
                      <path
                        d="M0,150 L0,120 Q50,90 100,105 T200,60 T300,75 T400,20 L400,150 Z"
                        fill="url(#chartGradient)"
                      />
                      
                      {/* Smooth Bezier Line */}
                      <path
                        d="M0,120 Q50,90 100,105 T200,60 T300,75 T400,20"
                        fill="none"
                        stroke="#4F46E5"
                        strokeWidth="4.5"
                        strokeLinecap="round"
                      />
                      
                      {/* Dynamic Pulsating Point */}
                      <circle cx="400" cy="20" r="6" fill="#4F46E5" />
                      <circle cx="400" cy="20" r="12" fill="#4F46E5" className="animate-ping" style={{ transformOrigin: '400px 20px' }} />
                    </svg>
                    
                    {/* Time ticks */}
                    <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-2">
                      <span>{t('chart.month').toLowerCase()} 1</span>
                      <span>15</span>
                      <span>30</span>
                    </div>
                  </div>

                  <div className="h-px bg-gray-150 dark:bg-gray-700 my-4" />

                  {/* Active Users Section */}
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/80 p-3.5 rounded-xl border border-gray-150 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500"></span>
                      </div>
                      <div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-wider block leading-none">
                          {t('chart.activeUsersLabel')}
                        </span>
                        <span className="text-xl font-extrabold mt-1 inline-block">23</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1.5 font-medium">
                          {t('stats.last30m')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* 2. Audience and Media Section */}
      <section className="py-16 bg-white dark:bg-gray-800 transition-colors">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            
            {/* Left Column: Our Audience */}
            <div className="space-y-6">
              <span className="text-xs font-black tracking-widest text-indigo-600 dark:text-indigo-400 uppercase block">
                {t('audience.sectionBadge')}
              </span>
              <h2 className="text-3xl font-black uppercase text-gray-900 dark:text-white leading-tight">
                {t('audience.title')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                {t('audience.subtitle')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-150 dark:border-gray-850">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[4]" />
                    </div>
                    <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                      {t(`audience.bullet${i}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Media */}
            <div className="space-y-6">
              <span className="text-xs font-black tracking-widest text-indigo-600 dark:text-indigo-400 uppercase block">
                {t('media.sectionBadge')}
              </span>
              <h2 className="text-3xl font-black uppercase text-gray-900 dark:text-white leading-tight">
                {t('media.title')}
              </h2>
              
              {/* Stylized Media Logos */}
              <div className="grid grid-cols-5 gap-3 items-center pt-2">
                <a
                  href="https://okdiario.com/baleares/brillante-idea-tres-mallorquines-que-coleccionistas-intercambien-cromos-futbol-terminen-album-17009604"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-12 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center font-black text-gray-600 dark:text-gray-450 border border-gray-150 dark:border-gray-850 text-xs tracking-tighter hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                >
                  okdiario
                </a>
                <a
                  href="https://www.cope.es/emisoras/illes-balears/baleares/mallorca/noticias/tres-amigos-reinventan-intercambio-cromos-web-creada-mallorca-20260525_3370884.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-12 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center font-extrabold text-blue-600 dark:text-blue-400 border border-gray-150 dark:border-gray-850 text-xs italic tracking-wider hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                >
                  COPE
                </a>
                <a
                  href="https://www.ultimahora.es/noticias/sociedad/2026/06/03/2641593/tres-mallorquines-crean-aplicacion-referencia-para-cambiar-cromos.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-12 bg-red-600 text-white rounded-lg flex items-center justify-center font-serif font-black border border-red-750 text-[10px] tracking-tight leading-none text-center px-1 hover:bg-red-700 transition-colors"
                >
                  Última Hora
                </a>
                <div className="h-12 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center font-serif font-black text-gray-600 dark:text-gray-450 border border-gray-150 dark:border-gray-850 text-[9px] tracking-tighter leading-none text-center px-1 select-none">
                  Diario de Mallorca
                </div>
                <div className="h-12 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center font-black text-pink-500 border border-gray-150 dark:border-gray-850 text-[10px] tracking-tighter select-none">
                  iB3 RADIO
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed pt-2">
                {t('media.description')}
              </p>
              
              <div className="pt-2">
                <a
                  href="https://www.ultimahora.es/noticias/sociedad/2026/06/03/2641593/tres-mallorquines-crean-aplicacion-referencia-para-cambiar-cromos.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-black text-indigo-600 dark:text-indigo-400 hover:underline group"
                >
                  {t('media.link')}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. Advertising Format Showcase */}
      <section ref={formatSectionRef} className="py-16 bg-gray-55 dark:bg-gray-900/50 border-t border-b border-gray-200 dark:border-gray-800 transition-colors">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content: Description */}
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-black tracking-widest text-indigo-600 dark:text-indigo-400 uppercase block">
                {t('format.sectionBadge')}
              </span>
              <h2 className="text-3xl font-black uppercase text-gray-900 dark:text-white leading-tight">
                {t('format.title')}
              </h2>
              <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-xl border-l-4 border-indigo-500 my-4">
                <span className="font-black text-indigo-600 dark:text-indigo-400 text-lg uppercase block">
                  {t('format.subtitle')}
                </span>
                <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mt-1">
                  {t('format.description')}
                </p>
              </div>

              <div className="space-y-3.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span className="text-gray-750 dark:text-gray-300 font-semibold text-sm">
                      {t(`format.bullet${i}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Content: Interactive Screens Mockup */}
            <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
              
              {/* Browser/Desktop Preview Card */}
              <div className="md:col-span-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
                {/* Browser Top bar */}
                <div className="bg-gray-100 dark:bg-gray-900 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200 dark:border-gray-750">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 max-w-sm mx-auto bg-white dark:bg-gray-800 rounded-md py-0.5 px-3 text-[10px] text-gray-400 text-center border border-gray-150 dark:border-gray-700 select-none truncate">
                    cambiocromos.com/{locale}/marketplace
                  </div>
                </div>
                {/* Content preview */}
                <div className="p-4 space-y-4 h-60 bg-gray-50 dark:bg-gray-900/30 relative">
                  {/* Grid Wireframes */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="h-20 bg-gray-200 dark:bg-gray-850 rounded-lg animate-pulse" />
                    <div className="h-20 bg-gray-200 dark:bg-gray-850 rounded-lg animate-pulse" />
                    <div className="h-20 bg-gray-200 dark:bg-gray-850 rounded-lg animate-pulse" />
                  </div>
                  <div className="h-16 bg-gray-200 dark:bg-gray-850 rounded-lg w-2/3 animate-pulse" />
                  
                  {/* Interactive Floating Footer Banner mockup */}
                  <div className="absolute bottom-0 left-0 right-0 bg-slate-900 text-white p-3 border-t-2 border-indigo-500 shadow-inner flex items-center justify-between text-[10px] animate-bounce">
                    <div className="flex items-center gap-2">
                      <span className="bg-gold text-black font-black px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider">
                        ADS
                      </span>
                      <div>
                        <span className="font-extrabold block">{t('format.previewText')}</span>
                        <span className="text-gray-400 font-medium">{t('format.previewSubtext')}</span>
                      </div>
                    </div>
                    <span className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-3 py-1.5 rounded-md leading-none select-none text-[9px]">
                      {t('format.previewCta')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Smartphone Preview Card */}
              <div className="md:col-span-4 flex flex-col items-center">
                <div className="w-full max-w-[200px] bg-slate-900 rounded-[28px] p-2 border-4 border-slate-950 shadow-2xl relative">
                  {/* Speaker notch */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-14 h-3.5 bg-slate-950 rounded-full z-20 flex items-center justify-center">
                    <div className="w-6 h-1 bg-gray-800 rounded-full" />
                  </div>
                  {/* Screen Content */}
                  <div className="bg-white dark:bg-gray-800 rounded-[20px] overflow-hidden h-64 relative border border-slate-950/20">
                    <div className="p-3 space-y-3 pt-6 bg-gray-50 dark:bg-gray-900/30 h-full">
                      <div className="h-8 bg-gray-200 dark:bg-gray-850 rounded-md w-full animate-pulse" />
                      <div className="h-28 bg-gray-200 dark:bg-gray-850 rounded-md w-full animate-pulse" />
                      
                      {/* Mobile Floating Footer Banner mockup */}
                      <div className="absolute bottom-0 left-0 right-0 bg-slate-900 text-white p-2 border-t-2 border-indigo-500 flex flex-col gap-1.5 items-center text-[8px] text-center">
                        <div>
                          <span className="font-extrabold block">{t('format.previewText')}</span>
                          <span className="text-gray-400 block mt-0.5">{t('format.previewSubtext')}</span>
                        </div>
                        <span className="bg-indigo-600 text-white font-black px-2.5 py-1 rounded w-full text-[8px] leading-none text-center">
                          {t('format.previewCta')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Visual Arrow Label */}
                <div className="mt-4 text-center">
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 italic">
                    {t('format.alwaysVisible')}
                  </div>
                  {/* Styled Curved Arrow using custom SVG */}
                  <svg className="w-8 h-8 text-indigo-500 mx-auto mt-1 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5V19M12 5L7 10M12 5L17 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* 4. Bottom CTA banner */}
      <section className="py-16 bg-white dark:bg-gray-800 transition-colors">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-2xl p-8 md:p-12 shadow-xl border border-indigo-500 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-10 -top-10 w-44 h-44 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-6 relative z-10">
              <div className="p-4 rounded-full bg-white/10 border border-white/20 hidden sm:flex-shrink-0 sm:flex items-center justify-center">
                <Megaphone className="w-8 h-8 text-gold" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight">
                  {t('cta.bannerTitle')}
                </h3>
                <p className="text-indigo-100 font-medium text-sm sm:text-base max-w-xl">
                  {t('cta.bannerSubtitle')}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 font-black px-6 py-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all text-base border-2 border-black flex-shrink-0 cursor-pointer w-full md:w-auto"
            >
              {t('cta.info')}
              <ArrowRight className="w-5 h-5 stroke-[3]" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. Radix dialog modal form */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg bg-white dark:bg-gray-800 border-4 border-black text-gray-900 dark:text-white rounded-2xl shadow-2xl p-0 overflow-hidden">
          
          <DialogHeader className="bg-indigo-600 text-white p-6 pb-5 border-b-4 border-black">
            <DialogTitle className="text-2xl font-black uppercase text-white flex items-center gap-2.5">
              <MessageSquare className="w-6 h-6 stroke-[2.5]" />
              {t('modal.title')}
            </DialogTitle>
            <DialogDescription className="text-indigo-100 font-medium mt-2 leading-relaxed">
              {t('modal.description')}{' '}
              <a href="mailto:info@cambiocromos.com" className="font-bold underline text-gold hover:text-yellow-300">
                info@cambiocromos.com
              </a>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
            
            {/* Contact Name input */}
            <div>
              <label className="text-sm font-black text-gray-700 dark:text-gray-300 mb-1.5 block uppercase tracking-wider">
                {t('modal.labelName')} *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-450 dark:text-gray-500 pointer-events-none">
                  <Users className="w-4 h-4" />
                </span>
                <Input
                  required
                  type="text"
                  disabled={sending}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 bg-gray-50 dark:bg-gray-900 border-2 border-black focus-visible:ring-indigo-500 text-gray-900 dark:text-white font-semibold rounded-xl h-[46px]"
                />
              </div>
            </div>

            {/* Company Name input */}
            <div>
              <label className="text-sm font-black text-gray-700 dark:text-gray-300 mb-1.5 block uppercase tracking-wider">
                {t('modal.labelCompany')}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-450 dark:text-gray-500 pointer-events-none">
                  <Building2 className="w-4 h-4" />
                </span>
                <Input
                  type="text"
                  disabled={sending}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="pl-10 bg-gray-50 dark:bg-gray-900 border-2 border-black focus-visible:ring-indigo-500 text-gray-900 dark:text-white font-semibold rounded-xl h-[46px]"
                />
              </div>
            </div>

            {/* Email input */}
            <div>
              <label className="text-sm font-black text-gray-700 dark:text-gray-300 mb-1.5 block uppercase tracking-wider">
                {t('modal.labelEmail')} *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-450 dark:text-gray-500 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </span>
                <Input
                  required
                  type="email"
                  disabled={sending}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-gray-50 dark:bg-gray-900 border-2 border-black focus-visible:ring-indigo-500 text-gray-900 dark:text-white font-semibold rounded-xl h-[46px]"
                />
              </div>
            </div>

            {/* Message input */}
            <div>
              <label className="text-sm font-black text-gray-700 dark:text-gray-300 mb-1.5 block uppercase tracking-wider">
                {t('modal.labelMessage')} *
              </label>
              <Textarea
                required
                disabled={sending}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('modal.placeholderMessage')}
                rows={5}
                className="bg-gray-50 dark:bg-gray-900 border-2 border-black focus-visible:ring-indigo-500 text-gray-900 dark:text-white font-semibold rounded-xl p-3 resize-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-row justify-end gap-3 pt-3 border-t border-gray-150 dark:border-gray-750">
              <Button
                type="button"
                variant="secondary"
                disabled={sending}
                onClick={() => setIsOpen(false)}
                className="px-5 py-3 h-[46px] rounded-xl border-2 border-black font-extrabold text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {t('modal.sending') === 'Enviando...' ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={sending || !name.trim() || !email.trim() || !message.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-3 h-[46px] rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
              >
                {sending ? t('modal.sending') : t('modal.submit')}
              </Button>
            </div>

          </form>

        </DialogContent>
      </Dialog>

    </div>
  );
}
