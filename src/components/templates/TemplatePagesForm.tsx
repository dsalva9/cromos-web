'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface TemplateSlotData {
  label: string;
  is_special: boolean;
}

interface TemplatePageData {
  title: string;
  type: 'team' | 'special';
  slots: TemplateSlotData[];
}

interface TemplatePagesFormProps {
  data: {
    pages: TemplatePageData[];
  };
  onChange: (data: { pages: TemplatePageData[] }) => void;
}

export function TemplatePagesForm({ data, onChange }: TemplatePagesFormProps) {
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageType, setNewPageType] = useState<'team' | 'special'>('team');

  const addPage = () => {
    if (!newPageTitle.trim()) return;

    const newPage: TemplatePageData = {
      title: newPageTitle,
      type: newPageType,
      slots: [{ label: '', is_special: false }],
    };

    onChange({
      pages: [...data.pages, newPage],
    });

    setNewPageTitle('');
    setNewPageType('team');
  };

  const updatePage = (index: number, page: TemplatePageData) => {
    const updatedPages = [...data.pages];
    updatedPages[index] = page;
    onChange({ pages: updatedPages });
  };

  const deletePage = (index: number) => {
    const updatedPages = data.pages.filter((_, i) => i !== index);
    onChange({ pages: updatedPages });
  };

  const addSlot = (pageIndex: number) => {
    const updatedPages = [...data.pages];
    updatedPages[pageIndex].slots.push({ label: '', is_special: false });
    onChange({ pages: updatedPages });
  };

  const updateSlot = (
    pageIndex: number,
    slotIndex: number,
    slot: TemplateSlotData
  ) => {
    const updatedPages = [...data.pages];
    updatedPages[pageIndex].slots[slotIndex] = slot;
    onChange({ pages: updatedPages });
  };

  const deleteSlot = (pageIndex: number, slotIndex: number) => {
    const updatedPages = [...data.pages];
    updatedPages[pageIndex].slots = updatedPages[pageIndex].slots.filter(
      (_, i) => i !== slotIndex
    );
    onChange({ pages: updatedPages });
  };

  return (
    <div className="space-y-6">
      {/* Add New Page */}
      <Card className="bg-[#1F2937] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Añadir Nueva Página</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-page-title">Título de la Página</Label>
              <Input
                id="new-page-title"
                value={newPageTitle}
                onChange={e => setNewPageTitle(e.target.value)}
                placeholder="Ej: Primera Equipación"
                className="bg-[#374151] border-gray-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Página</Label>
              <RadioGroup
                value={newPageType}
                onValueChange={value =>
                  setNewPageType(value as 'team' | 'special')
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="team" id="team" />
                  <Label htmlFor="team" className="text-white">
                    Equipo
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="special" id="special" />
                  <Label htmlFor="special" className="text-white">
                    Especial
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <Button
            onClick={addPage}
            disabled={!newPageTitle.trim()}
            className="bg-[#FFC000] text-black hover:bg-[#FFD700]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Añadir Página
          </Button>
        </CardContent>
      </Card>

      {/* Existing Pages */}
      {data.pages.map((page, pageIndex) => (
        <Card key={pageIndex} className="bg-[#1F2937] border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="h-5 w-5 text-gray-400" />
              <div>
                <CardTitle className="text-white">{page.title}</CardTitle>
                <p className="text-sm text-gray-400">
                  {page.slots.length} cromos • (
                  {page.type === 'team' ? 'Equipo' : 'Especial'})
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => deletePage(pageIndex)}
              className="text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Page Title and Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`page-title-${pageIndex}`}>
                  Título de la Página
                </Label>
                <Input
                  id={`page-title-${pageIndex}`}
                  value={page.title}
                  onChange={e =>
                    updatePage(pageIndex, { ...page, title: e.target.value })
                  }
                  className="bg-[#374151] border-gray-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Página</Label>
                <RadioGroup
                  value={page.type}
                  onValueChange={value =>
                    updatePage(pageIndex, {
                      ...page,
                      type: value as 'team' | 'special',
                    })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="team" id={`team-${pageIndex}`} />
                    <Label htmlFor={`team-${pageIndex}`} className="text-white">
                      Equipo
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="special"
                      id={`special-${pageIndex}`}
                    />
                    <Label
                      htmlFor={`special-${pageIndex}`}
                      className="text-white"
                    >
                      Especial
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Slots */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Cromos de la Página</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addSlot(pageIndex)}
                  className="text-white border-gray-600"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Añadir Cromo
                </Button>
              </div>
              <div className="space-y-2">
                {page.slots.map((slot, slotIndex) => (
                  <div key={slotIndex} className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                    <Input
                      value={slot.label}
                      onChange={e =>
                        updateSlot(pageIndex, slotIndex, {
                          ...slot,
                          label: e.target.value,
                        })
                      }
                      placeholder="Ej: Portero"
                      className="bg-[#374151] border-gray-600 text-white"
                    />
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`special-${pageIndex}-${slotIndex}`}
                        checked={slot.is_special}
                        onCheckedChange={checked =>
                          updateSlot(pageIndex, slotIndex, {
                            ...slot,
                            is_special: checked,
                          })
                        }
                      />
                      <Label
                        htmlFor={`special-${pageIndex}-${slotIndex}`}
                        className="text-white text-sm"
                      >
                        Especial
                      </Label>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteSlot(pageIndex, slotIndex)}
                      className="text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Empty State */}
      {data.pages.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">
            No hay páginas añadidas. Añade tu primera página para comenzar.
          </p>
        </div>
      )}
    </div>
  );
}
