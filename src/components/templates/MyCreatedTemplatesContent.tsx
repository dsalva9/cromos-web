'use client';

import Link from 'next/link';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen, ArrowLeft } from 'lucide-react';
import { CreatedTemplate } from '@/lib/templates/server-my-created-templates';

interface MyCreatedTemplatesContentProps {
    templates: CreatedTemplate[];
    userNickname: string;
}

export function MyCreatedTemplatesContent({ templates }: MyCreatedTemplatesContentProps) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <Link
                    href="/templates"
                    className="inline-flex items-center text-[#FFC000] hover:text-[#FFD700] mb-6 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver a Colecciones
                </Link>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl lg:text-4xl font-bold uppercase text-gray-900 dark:text-white mb-2">
                            Mis Colecciones Creadas
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Colecciones que has creado, públicas y privadas
                        </p>
                    </div>

                    <Link href="/templates/create">
                        <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-medium">
                            <Plus className="mr-2 h-4 w-4" />
                            Crear Colección
                        </Button>
                    </Link>
                </div>

                {/* Templates Grid */}
                {templates.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                        {templates.map((template, index) => (
                            <div
                                key={template.id}
                                className="animate-fade-in"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <TemplateCard
                                    template={template as any}
                                    showVisibility={true}
                                    showEditButton={true}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={FolderOpen}
                        title="No has creado ninguna colección"
                        description="Crea tu primera colección para compartirla con la comunidad o usarla de forma privada."
                        actionLabel="Crear mi primera colección"
                        actionHref="/templates/create"
                    />
                )}
            </div>
        </div>
    );
}
