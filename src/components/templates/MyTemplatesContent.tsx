import Link from 'next/link';
import Image from 'next/image';
import {
    LayoutGrid,
    Plus,
    Check,
    X,
    User,
    Trophy,
    ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TemplateCopy } from '@/lib/templates/server-my-templates';

interface MyTemplatesContentProps {
    copies: TemplateCopy[];
}

export function MyTemplatesContent({ copies }: MyTemplatesContentProps) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            <div className="container mx-auto px-4 py-8 md:py-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-3 text-black dark:text-white">
                            Mis Álbumes
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl font-medium">
                            Gestiona tu progreso, completa tus álbumes y organiza tus cromos.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        <Link href="/templates" className="flex-1 md:flex-none">
                            <Button
                                variant="outline"
                                className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 h-12 px-6 shadow-sm"
                            >
                                <LayoutGrid className="mr-2 h-4 w-4" />
                                Explorar Plantillas
                            </Button>
                        </Link>
                        <Link href="/templates/create" className="flex-1 md:flex-none">
                            <Button className="w-full bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold border-none h-12 px-6 shadow-md hover:shadow-lg transition-all">
                                <Plus className="mr-2 h-4 w-4" />
                                Crear Plantilla
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Templates Grid */}
                {copies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 border-dashed shadow-sm">
                        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full mb-6">
                            <LayoutGrid className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No tienes colecciones activas</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-lg mb-8 text-center max-w-md">
                            Empieza explorando las plantillas disponibles o crea tu propia colección desde cero.
                        </p>
                        <Link href="/templates">
                            <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold h-12 px-8 text-lg shadow-md">
                                Explorar Colecciones
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {copies.map(copy => {
                            const percentage = copy.completion_percentage;
                            const isComplete = percentage === 100;

                            return (
                                <Link key={copy.copy_id} href={`/mis-plantillas/${copy.copy_id}`} className="block h-full">
                                    <div className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden hover:border-[#FFC000] transition-all duration-300 hover:shadow-xl hover:shadow-black/5 h-full flex flex-col">
                                        {/* Image */}
                                        {copy.image_url && (
                                            <div className="relative aspect-[16/9] bg-gray-100 dark:bg-gray-900 overflow-hidden">
                                                <Image
                                                    src={copy.image_url}
                                                    alt={copy.title}
                                                    fill
                                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                />
                                                {/* Overlay gradient for better text readability */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                            </div>
                                        )}

                                        {/* Top Gradient Bar */}
                                        <div className={`h-1.5 w-full ${isComplete ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-[#FFC000] to-[#FFD700]'}`} />

                                        <div className="p-6 flex flex-col flex-grow">
                                            {/* Header */}
                                            <div className="mb-6">
                                                <div className="flex justify-between items-start mb-2 gap-2">
                                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-black dark:group-hover:text-[#FFC000] transition-colors line-clamp-1 leading-tight">
                                                        {copy.title}
                                                    </h3>
                                                    {isComplete && (
                                                        <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-1.5 rounded-full shrink-0">
                                                            <Trophy className="w-4 h-4" />
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 font-medium">
                                                    <User className="w-3.5 h-3.5" />
                                                    <span className="truncate">
                                                        por{' '}
                                                        <span className="text-gray-700 dark:text-gray-300">
                                                            {copy.original_author_nickname}
                                                        </span>
                                                    </span>
                                                </p>
                                            </div>

                                            {/* Progress Section */}
                                            <div className="space-y-3 mb-6">
                                                <div className="flex justify-between text-sm font-bold">
                                                    <span className="text-gray-500 dark:text-gray-400">Progreso</span>
                                                    <span className={isComplete ? "text-green-600 dark:text-green-400" : "text-black dark:text-white"}>{percentage}%</span>
                                                </div>
                                                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ease-out relative ${isComplete ? 'bg-green-500' : 'bg-[#FFC000]'}`}
                                                        style={{ width: `${percentage}%` }}
                                                    >
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 text-right font-mono">
                                                    {copy.completed_slots} / {copy.total_slots} cromos
                                                </p>
                                            </div>

                                            {/* Stats Grid */}
                                            <div className="grid grid-cols-2 gap-3 mb-6">
                                                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 flex items-center justify-between border border-gray-100 dark:border-gray-700 group-hover:border-gray-200 dark:group-hover:border-gray-600 transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                                            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                        </div>
                                                        <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Tengo</span>
                                                    </div>
                                                    <span className="font-bold text-gray-900 dark:text-white text-lg">{copy.completed_slots}</span>
                                                </div>

                                                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 flex items-center justify-between border border-gray-100 dark:border-gray-700 group-hover:border-gray-200 dark:group-hover:border-gray-600 transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                                            <X className="w-4 h-4 text-red-500 dark:text-red-400" />
                                                        </div>
                                                        <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Faltan</span>
                                                    </div>
                                                    <span className="font-bold text-gray-900 dark:text-white text-lg">{copy.total_slots - copy.completed_slots}</span>
                                                </div>
                                            </div>

                                            {/* Action */}
                                            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                                                <div className="flex items-center justify-between text-sm font-black uppercase tracking-wide text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                                                    <span>Gestionar Colección</span>
                                                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
