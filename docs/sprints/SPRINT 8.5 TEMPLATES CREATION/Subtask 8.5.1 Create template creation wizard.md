# Subtask 8.5.1: Create template creation wizard

## Overview

Create a multi-step wizard for users to create templates with pages and slots.

## Implementation Details

### File Structure

```
src/app/templates/create/page.tsx          # Main page component
src/components/templates/TemplateCreationWizard.tsx  # Wizard container
src/components/templates/TemplateBasicInfoForm.tsx    # Step 1: Basic info
src/components/templates/TemplatePagesForm.tsx        # Step 2: Pages and slots
src/components/templates/TemplateReviewForm.tsx       # Step 3: Review and publish
```

### Main Page Component

**File:** `src/app/templates/create/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
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
  pages: TemplatePageData[];
}

interface TemplatePageData {
  title: string;
  type: 'team' | 'special';
  slots: TemplateSlotData[];
}

interface TemplateSlotData {
  label: string;
  is_special: boolean;
}

export default function CreateTemplatePage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateTemplate = async (templateData: TemplateData) => {
    setIsSubmitting(true);
    try {
      // Step 1: Create template
      const { data: template, error: templateError } = await supabase.rpc('create_template', {
        p_title: templateData.title,
        p_description: templateData.description,
        p_image_url: templateData.image_url || null,
        p_is_public: templateData.is_public
      });

      if (templateError) throw templateError;

      const templateId = template;

      // Step 2: Add pages with slots
      for (const page of templateData.pages) {
        const { data: pageData, error: pageError } = await supabase.rpc('add_template_page', {
          p_template_id: templateId,
          p_title: page.title,
          p_type: page.type,
          p_slots: JSON.stringify(page.slots)
        });

        if (pageError) throw pageError;
      }

      // Step 3: Publish template
      const { error: publishError } = await supabase.rpc('publish_template', {
        p_template_id: templateId,
        p_is_public: templateData.is_public
      });

      if (publishError) throw publishError;

      // Redirect to templates page
      router.push('/templates?created=true');
    } catch (error) {
      console.error('Error creating template:', error);
      // Handle error (show toast, etc.)
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#1F2937]">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/templates">
              <Button variant="outline" size="icon" className="text-white border-gray-600">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-black uppercase text-white">
              Crear Plantilla
            </h1>
          </div>

          {/* Wizard */}
          <TemplateCreationWizard
            onSubmit={handleCreateTemplate}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </AuthGuard>
  );
}
```

### Wizard Container Component

**File:** `src/components/templates/TemplateCreationWizard.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TemplateBasicInfoForm } from './TemplateBasicInfoForm';
import { TemplatePagesForm } from './TemplatePagesForm';
import { TemplateReviewForm } from './TemplateReviewForm';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

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

interface TemplateCreationWizardProps {
  onSubmit: (data: TemplateData) => Promise<void>;
  isSubmitting: boolean;
}

export function TemplateCreationWizard({ onSubmit, isSubmitting }: TemplateCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [templateData, setTemplateData] = useState<TemplateData>({
    title: '',
    description: '',
    image_url: '',
    is_public: false,
    pages: []
  });

  const steps = [
    { title: 'Información Básica', description: 'Título y descripción' },
    { title: 'Páginas y Cromos', description: 'Añade páginas y cromos' },
    { title: 'Revisión', description: 'Revisa y publica' }
  ];

  const updateTemplateData = (stepData: Partial<TemplateData>) => {
    setTemplateData(prev => ({ ...prev, ...stepData }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    await onSubmit(templateData);
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 0:
        return templateData.title.trim() !== '';
      case 1:
        return templateData.pages.length > 0 &&
               templateData.pages.every(page =>
                 page.title.trim() !== '' &&
                 page.slots.length > 0
               );
      case 2:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                index <= currentStep ? 'bg-[#FFC000]' : 'bg-gray-600'
              }`}>
                {index < currentStep ? (
                  <Check className="h-5 w-5 text-black" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-full h-1 mx-2 ${
                  index < currentStep ? 'bg-[#FFC000]' : 'bg-gray-600'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          {steps.map((step, index) => (
            <div key={index} className="text-center" style={{ width: `${100/steps.length}%` }}>
              <p className={`text-xs mt-1 ${
                index <= currentStep ? 'text-[#FFC000]' : 'text-gray-400'
              }`}>
                {step.title}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="bg-[#374151] border-gray-700 text-white">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{steps[currentStep].title}</span>
            <span className="text-sm font-normal text-gray-400">
              {steps[currentStep].description}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === 0 && (
            <TemplateBasicInfoForm
              data={templateData}
              onChange={updateTemplateData}
            />
          )}
          {currentStep === 1 && (
            <TemplatePagesForm
              data={templateData}
              onChange={updateTemplateData}
            />
          )}
          {currentStep === 2 && (
            <TemplateReviewForm
              data={templateData}
              onChange={updateTemplateData}
            />
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="text-white border-gray-600"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canGoNext()}
                className="bg-[#FFC000] text-black hover:bg-[#FFD700]"
              >
                Siguiente
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !canGoNext()}
                className="bg-[#FFC000] text-black hover:bg-[#FFD700]"
              >
                {isSubmitting ? 'Creando...' : 'Crear Plantilla'}
                <Check className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Basic Info Form Component

**File:** `src/components/templates/TemplateBasicInfoForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

interface TemplateBasicInfoFormProps {
  data: {
    title: string;
    description: string;
    image_url: string;
    is_public: boolean;
  };
  onChange: (data: any) => void;
}

export function TemplateBasicInfoForm({ data, onChange }: TemplateBasicInfoFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(
    data.image_url || null
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real implementation, you would upload to a storage service
      // For now, we'll use a local preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        onChange({ image_url: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    onChange({ image_url: '' });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Título de la Plantilla *</Label>
        <Input
          id="title"
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Ej: Álbum Cromos Euro 2024"
          className="bg-[#1F2937] border-gray-600 text-white"
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Describe tu plantilla..."
          rows={4}
          className="bg-[#1F2937] border-gray-600 text-white resize-none"
        />
      </div>

      {/* Image */}
      <div className="space-y-2">
        <Label>Imagen de la Plantilla</Label>
        {imagePreview ? (
          <div className="relative">
            <img
              src={imagePreview}
              alt="Template preview"
              className="w-full h-48 object-cover rounded-md"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 bg-red-500 border-red-500 text-white hover:bg-red-600"
            >
              Eliminar
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-600 rounded-md p-6">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-2">
                <label htmlFor="image-upload" className="cursor-pointer">
                  <span className="text-[#FFC000] hover:text-[#FFD700]">
                    Sube una imagen
                  </span>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="sr-only"
                  />
                </label>
                <p className="text-xs text-gray-400 mt-1">
                  PNG, JPG, GIF hasta 10MB
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Public/Private */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="is-public">Hacer pública</Label>
          <p className="text-sm text-gray-400">
            Otros usuarios podrán ver y copiar esta plantilla
          </p>
        </div>
        <Switch
          id="is-public"
          checked={data.is_public}
          onCheckedChange={(checked) => onChange({ is_public: checked })}
        />
      </div>
    </div>
  );
}
```

## Implementation Notes

1. The wizard uses a step-based approach with clear progress indication
2. Form validation is implemented at each step
3. The basic info form includes image upload with preview
4. All text is in Spanish as required
5. The design follows the existing dark theme with yellow accents

## Next Steps

After implementing this subtask:

1. Implement Subtask 8.5.2: Create page and slot editor components
2. Implement Subtask 8.5.3: Create template creation hooks
3. Update navigation and documentation
