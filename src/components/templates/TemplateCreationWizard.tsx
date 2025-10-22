'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TemplateBasicInfoForm } from './TemplateBasicInfoForm';
import { TemplatePagesForm } from './TemplatePagesForm';
import { TemplateReviewForm } from './TemplateReviewForm';
import { ChevronLeft, ChevronRight, Check, CheckCircle } from 'lucide-react';

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

export function TemplateCreationWizard({
  onSubmit,
  isSubmitting,
}: TemplateCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [templateData, setTemplateData] = useState<TemplateData>({
    title: '',
    description: '',
    image_url: '',
    is_public: false,
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
        // Check if there's at least one valid page with at least one non-empty slot
        return (
          templateData.pages.length > 0 &&
          templateData.pages.some(
            page =>
              page.title.trim() !== '' &&
              page.slots.some(slot => slot.label && slot.label.trim() !== '')
          )
        );
      case 2:
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
                  <p className="text-xs text-slate-400 mt-1">
                    {step.description}
                  </p>
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
