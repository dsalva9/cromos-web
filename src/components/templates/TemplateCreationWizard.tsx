'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TemplateBasicInfoForm } from './TemplateBasicInfoForm';
import { TemplatePagesForm } from './TemplatePagesForm';
import { TemplateReviewForm } from './TemplateReviewForm';
import { ChevronLeft, ChevronRight, Check, CheckCircle } from 'lucide-react';
import {
  templateBasicInfoSchema,
  templatePageSchema,
  type TemplateBasicInfoData,
} from '@/lib/validations/template.schemas';

interface TemplateData {
  title: string;
  description: string;
  image_url: string;
  is_public: boolean;
  terms_accepted?: boolean;
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

export function TemplateCreationWizard({
  onSubmit,
  isSubmitting,
}: TemplateCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [attempted, setAttempted] = useState<{ basic: boolean; pages: boolean }>(
    { basic: false, pages: false }
  );
  const [templateData, setTemplateData] = useState<TemplateData>({
    title: '',
    description: '',
    image_url: '',
    is_public: false,
    terms_accepted: false,
    pages: [],
  });

    const steps = [
    { title: 'Información Básica', description: 'Título y descripción' },
    { title: 'Páginas y Cromos', description: 'Añade páginas y cromos' },
    { title: 'Revisión', description: 'Revisa y publica' },
  ];

  const updateTemplateData = (stepData: Partial<TemplateData>) => {
    setTemplateData(prev => ({ ...prev, ...stepData }));
  };

  const handleNext = () => {
    if (currentStep === 0) setAttempted(prev => ({ ...prev, basic: true }));
    if (currentStep === 1) setAttempted(prev => ({ ...prev, pages: true }));
    if (!canGoNext()) return;
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
    setAttempted({ basic: true, pages: true });
    await onSubmit(templateData);
  };

  const basicInfoErrors = useMemo(() => {
    const result = templateBasicInfoSchema.safeParse({
      title: templateData.title,
      description: templateData.description,
      image_url: templateData.image_url,
      is_public: templateData.is_public,
    });
    if (result.success) return {} as Partial<Record<keyof TemplateBasicInfoData, string>>;
    const errors: Partial<Record<keyof TemplateBasicInfoData, string>> = {};
    for (const issue of result.error.issues) {
      const path = issue.path?.[0] as keyof TemplateBasicInfoData | undefined;
      if (path) errors[path] = issue.message;
    }
    return errors;
  }, [templateData.title, templateData.description, templateData.image_url, templateData.is_public]);

  const pagesStepValid = useMemo(() => {
    if (!templateData.pages || templateData.pages.length === 0) return false;
    return templateData.pages.every(page => templatePageSchema.safeParse(page).success);
  }, [templateData.pages]);

  const canGoNext = () => {
    switch (currentStep) {
      case 0:
        return Object.keys(basicInfoErrors).length === 0;
      case 1:
        return pagesStepValid;
      case 2:
        // If template is public, terms must be accepted
        if (templateData.is_public) {
          return templateData.terms_accepted === true;
        }
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                {/* Step Circle */}
                <div
                  className={`flex items-center justify-center rounded-full transition-all duration-300 ${
                    index < currentStep
                      ? 'w-12 h-12 bg-green-400'
                      : index === currentStep
                      ? 'w-14 h-14 bg-yellow-400 animate-pulse shadow-lg shadow-yellow-400/50'
                      : 'w-10 h-10 bg-slate-600'
                  }`}
                >
                  {index < currentStep ? (
                    <CheckCircle className="h-6 w-6 text-white" />
                  ) : (
                    <span
                      className={`font-bold ${
                        index === currentStep ? 'text-lg text-black' : 'text-sm text-white'
                      }`}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Step Label - Hidden on mobile, visible on desktop */}
                <div className="mt-2 text-center hidden md:block">
                  <p
                    className={`text-sm font-medium ${
                      index < currentStep
                        ? 'text-green-400'
                        : index === currentStep
                        ? 'text-yellow-400'
                        : 'text-slate-600'
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{step.description}</p>
                </div>
              </div>

              {/* Connecting Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-1 mx-2 -mt-8 md:mt-0 relative">
                  <div className="absolute inset-0 bg-slate-600 rounded" />
                  {index < currentStep && (
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-yellow-400 rounded transition-all duration-500" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mobile step labels */}
        <div className="md:hidden text-center mt-4">
          <p className="text-base font-semibold text-yellow-400">
            {steps[currentStep].title}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {steps[currentStep].description}
          </p>
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
          {/* Validation summary */}
          {currentStep === 0 && attempted.basic && Object.keys(basicInfoErrors).length > 0 && (
            <div className="mb-4 rounded border border-red-500 bg-red-900/30 p-3 text-sm text-red-200" role="alert">
              <p className="font-semibold mb-1">Por favor corrige los siguientes errores:</p>
              <ul className="list-disc pl-5">
                {Object.entries(basicInfoErrors).map(([field, msg]) => (
                  <li key={field}>{msg}</li>
                ))}
              </ul>
            </div>
          )}
          {currentStep === 1 && attempted.pages && !pagesStepValid && (
            <div className="mb-4 rounded border border-red-500 bg-red-900/30 p-3 text-sm text-red-200" role="alert">
              <p className="font-semibold">Revisa las páginas:</p>
              <p>• Cada página necesita título válido y al menos un cromo con etiqueta.</p>
              <p>• Un máximo de 50 cromos por página.</p>
            </div>
          )}
          {currentStep === 2 && templateData.is_public && !templateData.terms_accepted && (
            <div className="mb-4 rounded border border-red-500 bg-red-900/30 p-3 text-sm text-red-200" role="alert">
              <p className="font-semibold">Debes aceptar los términos de uso para publicar una plantilla pública.</p>
            </div>
          )}
          {currentStep === 0 && (
            <TemplateBasicInfoForm
              data={templateData}
              onChange={updateTemplateData}
              errors={attempted.basic ? basicInfoErrors : undefined}
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
