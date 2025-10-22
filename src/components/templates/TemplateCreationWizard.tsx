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
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  index <= currentStep ? 'bg-[#FFC000]' : 'bg-gray-600'
                }`}
              >
                {index < currentStep ? (
                  <Check className="h-5 w-5 text-black" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-full h-1 mx-2 ${
                    index < currentStep ? 'bg-[#FFC000]' : 'bg-gray-600'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          {steps.map((step, index) => (
            <div
              key={index}
              className="text-center"
              style={{ width: `${100 / steps.length}%` }}
            >
              <p
                className={`text-xs mt-1 ${
                  index <= currentStep ? 'text-[#FFC000]' : 'text-gray-400'
                }`}
              >
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
