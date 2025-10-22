'use client';

import { useRouter } from 'next/navigation';
import { useCreateTemplate } from '@/hooks/templates/useCreateTemplate';
import { TemplateCreationWizard } from '@/components/templates/TemplateCreationWizard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';

interface TemplateData {
  title: string;
  description: string;
  image_url: string;
  is_public: boolean;
  pages: Array<{
    title: string;
    type: 'team' | 'special';
    slots: Array<{
      label: string;
      is_special: boolean;
    }>;
  }>;
}

export default function CreateTemplatePage() {
  const router = useRouter();
  const { createTemplate, loading } = useCreateTemplate();

  const handleCreateTemplate = async (templateData: TemplateData) => {
    try {
      await createTemplate(templateData);

      // Redirect to templates page
      router.push('/templates?created=true');
    } catch (error) {
      // Error is already handled in the hook
      console.error('Error in template creation page:', error);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#1F2937]">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/templates">
              <Button
                variant="outline"
                size="icon"
                className="text-white border-gray-600"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl lg:text-4xl font-bold uppercase text-white">
              Crear Plantilla
            </h1>
          </div>

          {/* Wizard */}
          <TemplateCreationWizard
            onSubmit={handleCreateTemplate}
            isSubmitting={loading}
          />
        </div>
      </div>
    </AuthGuard>
  );
}
