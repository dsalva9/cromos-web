'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical, Info } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ItemFieldDefinition } from '@/types/v1.6.0';
import { DynamicFieldsEditor } from './DynamicFieldsEditor';

interface TemplateSlotData {
  label: string;
  slot_number: number;
  slot_variant?: string;
  global_number?: number;
  is_special: boolean;
  data?: Record<string, any>;
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
  itemSchema?: ItemFieldDefinition[];
}

export function TemplatePagesForm({ data, onChange, itemSchema }: TemplatePagesFormProps) {
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageType, setNewPageType] = useState<'team' | 'special'>('team');

  // Helper to detect duplicate global numbers
  const getDuplicateGlobalNumbers = () => {
    const globalNumbers: Record<number, number> = {}; // number -> count

    data.pages.forEach(page => {
      page.slots.forEach(slot => {
        if (slot.global_number !== undefined) {
          globalNumbers[slot.global_number] = (globalNumbers[slot.global_number] || 0) + 1;
        }
      });
    });

    // Return set of duplicated numbers
    return new Set(
      Object.entries(globalNumbers)
        .filter(([, count]) => count > 1)
        .map(([num]) => parseInt(num))
    );
  };

  // Helper to detect duplicate (slot_number, slot_variant) within a page
  const getDuplicateSlotCombinations = (pageIndex: number) => {
    const page = data.pages[pageIndex];
    const combinations: Record<string, number> = {}; // "num-variant" -> count

    page.slots.forEach(slot => {
      const variant = slot.slot_variant || 'NULL';
      const key = `${slot.slot_number}-${variant}`;
      combinations[key] = (combinations[key] || 0) + 1;
    });

    // Return set of duplicated combinations
    return new Set(
      Object.entries(combinations)
        .filter(([, count]) => count > 1)
        .map(([key]) => key)
    );
  };

  const duplicateGlobalNumbers = getDuplicateGlobalNumbers();

  const addPage = () => {
    if (!newPageTitle.trim()) return;

    // Calculate next global number across all existing slots
    const allSlots = data.pages.flatMap(page => page.slots);
    const maxGlobalNumber = allSlots.reduce((max, slot) => {
      return slot.global_number && slot.global_number > max ? slot.global_number : max;
    }, 0);
    const nextGlobalNumber = maxGlobalNumber + 1;

    const newPage: TemplatePageData = {
      title: newPageTitle,
      type: newPageType,
      slots: [{
        label: '',
        slot_number: 1,
        global_number: nextGlobalNumber,
        is_special: false,
        data: {},
      }],
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
    const currentSlots = updatedPages[pageIndex].slots;

    // Auto-increment slot_number based on last slot in THIS page
    const nextSlotNumber = currentSlots.length > 0
      ? Math.max(...currentSlots.map(s => s.slot_number)) + 1
      : 1;

    // Auto-increment global_number based on ALL slots across ALL pages
    const allSlots = updatedPages.flatMap(page => page.slots);
    const maxGlobalNumber = allSlots.reduce((max, slot) => {
      return slot.global_number && slot.global_number > max ? slot.global_number : max;
    }, 0);
    const nextGlobalNumber = maxGlobalNumber + 1;

    updatedPages[pageIndex].slots.push({
      label: '',
      slot_number: nextSlotNumber,
      is_special: false,
      slot_variant: undefined,
      global_number: nextGlobalNumber,
      data: {},
    });
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
              <Label className="text-white">Título de la Página *</Label>
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
          <CardHeader className="flex flex-row items-center justify-between group">
            <div className="flex items-center gap-2">
              <GripVertical className="h-6 w-6 text-slate-400 hover:text-yellow-400 hover:cursor-grab active:cursor-grabbing transition-colors duration-200" />
              <div>
                <CardTitle className="text-white">{page.title}</CardTitle>
                <p className="text-sm text-gray-400">
                  {page.slots.length} cromos · (
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
                <Label htmlFor={`page-title-${pageIndex}`} className="text-white">
                  Título de la Página *
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
                    <RadioGroupItem value="special" id={`special-${pageIndex}`} />
                    <Label htmlFor={`special-${pageIndex}`} className="text-white">
                      Especial
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Slots */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Cromos de la Página</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="text-blue-400 hover:text-blue-300">
                        <Info className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="right" className="w-80 bg-gray-800 border-gray-700 text-white">
                      <div className="space-y-2 text-sm">
                        <p className="font-semibold">Numeración de cromos:</p>
                        <ul className="space-y-1 text-xs">
                          <li><strong>No. Global</strong> (opcional): Número único en toda la colección (ej: 1-773) para entrada rápida por checklist.</li>
                          <li><strong>No. Página</strong>: Posición del cromo en esta página (puede repetirse con diferentes variantes).</li>
                          <li><strong>Variante</strong> (opcional): Letra A, B, C... para cromos en la misma posición (ej: 5A, 5B).</li>
                        </ul>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
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

              {/* Column Headers - Desktop only */}
              {page.slots.length > 0 && (
                <div className="hidden lg:flex items-center gap-2 px-2 pb-2 border-b border-gray-700">
                  <div className="w-5" /> {/* Grip icon space */}
                  <div className="w-16 text-xs text-gray-400 text-center font-medium">
                    No. Global *
                  </div>
                  <div className="flex-1 text-xs text-gray-400 font-medium">
                    Nombre del Cromo *
                  </div>
                  <div className="w-20 text-xs text-gray-400 text-center font-medium">
                    No. Cromo *
                  </div>
                  <div className="w-16 text-xs text-gray-400 text-center font-medium">
                    Variante *
                  </div>
                  <div className="w-32 text-xs text-gray-400 font-medium">
                    {/* Special toggle space */}
                  </div>
                  <div className="w-10" /> {/* Delete button space */}
                </div>
              )}

              <div className="space-y-4">
                {page.slots.map((slot, slotIndex) => (
                  <div
                    key={slotIndex}
                    className="group hover:bg-slate-800/30 rounded p-3 transition-all duration-200 border border-gray-700 lg:border-0"
                  >
                    {/* Desktop Layout - Horizontal */}
                    <div className="hidden lg:flex items-center gap-2">
                      <GripVertical className="h-5 w-5 text-slate-400 group-hover:text-yellow-400 hover:cursor-grab active:cursor-grabbing transition-colors duration-200" />

                      {/* Global Number - For quick entry (1-773) */}
                      <div className="relative">
                        <Input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={slot.global_number || ''}
                          onChange={e =>
                            updateSlot(pageIndex, slotIndex, {
                              ...slot,
                              global_number: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            })
                          }
                          placeholder="#"
                          title="Número único en toda la colección (ej: 1-773)"
                          className={`bg-[#374151] border-gray-600 text-white w-16 text-center ${
                            slot.global_number && duplicateGlobalNumbers.has(slot.global_number)
                              ? 'border-red-500 border-2'
                              : ''
                          }`}
                        />
                        {slot.global_number && duplicateGlobalNumbers.has(slot.global_number) && (
                          <div className="absolute -bottom-5 left-0 text-xs text-red-400 whitespace-nowrap">
                            Duplicado
                          </div>
                        )}
                      </div>

                      {/* Label/Name */}
                      <Input
                        value={slot.label}
                        onChange={e =>
                          updateSlot(pageIndex, slotIndex, {
                            ...slot,
                            label: e.target.value,
                          })
                        }
                        placeholder="Ej: Portero"
                        className="bg-[#374151] border-gray-600 text-white flex-1"
                      />

                      {/* Slot Number on Page */}
                      <div className="relative">
                        <Input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={slot.slot_number}
                          onChange={e =>
                            updateSlot(pageIndex, slotIndex, {
                              ...slot,
                              slot_number: parseInt(e.target.value) || 1,
                            })
                          }
                          placeholder="Pos"
                          title="Número de posición en la página"
                          min={1}
                          className={`bg-[#374151] border-gray-600 text-white w-20 text-center ${
                            getDuplicateSlotCombinations(pageIndex).has(
                              `${slot.slot_number}-${slot.slot_variant || 'NULL'}`
                            )
                              ? 'border-red-500 border-2'
                              : ''
                          }`}
                        />
                      </div>

                      {/* Variant */}
                      <div className="relative">
                        <Input
                          value={slot.slot_variant || ''}
                          onChange={e =>
                            updateSlot(pageIndex, slotIndex, {
                              ...slot,
                              slot_variant: e.target.value.toUpperCase() || undefined,
                            })
                          }
                          placeholder="Var"
                          title="Variante (A, B, C...)"
                          maxLength={1}
                          className={`bg-[#374151] border-gray-600 text-white w-16 uppercase text-center ${
                            getDuplicateSlotCombinations(pageIndex).has(
                              `${slot.slot_number}-${slot.slot_variant || 'NULL'}`
                            )
                              ? 'border-red-500 border-2'
                              : ''
                          }`}
                        />
                        {getDuplicateSlotCombinations(pageIndex).has(
                          `${slot.slot_number}-${slot.slot_variant || 'NULL'}`
                        ) && (
                          <div className="absolute -bottom-5 left-0 text-xs text-red-400 whitespace-nowrap">
                            Duplicado
                          </div>
                        )}
                      </div>

                      {/* Special Toggle */}
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
                          className="text-white text-sm whitespace-nowrap"
                        >
                          Especial
                        </Label>
                      </div>

                      {/* Delete Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteSlot(pageIndex, slotIndex)}
                        className="text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Dynamic Fields - Desktop */}
                    {itemSchema && itemSchema.length > 0 && (
                      <div className="hidden lg:block mt-3">
                        <DynamicFieldsEditor
                          schema={itemSchema}
                          data={slot.data || {}}
                          onChange={(data) => updateSlot(pageIndex, slotIndex, { ...slot, data })}
                          idPrefix={`slot-${pageIndex}-${slotIndex}`}
                        />
                      </div>
                    )}

                    {/* Mobile Layout - Vertical Stack */}
                    <div className="lg:hidden space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-5 w-5 text-slate-400" />
                          <span className="text-sm font-semibold text-white">
                            Cromo #{slotIndex + 1}
                          </span>
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

                      <div className="space-y-2">
                        <div>
                          <Label className="text-white">No. Global *</Label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={slot.global_number || ''}
                            onChange={e =>
                              updateSlot(pageIndex, slotIndex, {
                                ...slot,
                                global_number: e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined,
                              })
                            }
                            placeholder="Número global (ej: 1-773)"
                            className={`bg-[#374151] border-gray-600 text-white ${
                              slot.global_number && duplicateGlobalNumbers.has(slot.global_number)
                                ? 'border-red-500 border-2'
                                : ''
                            }`}
                          />
                          {slot.global_number && duplicateGlobalNumbers.has(slot.global_number) && (
                            <p className="text-xs text-red-400 mt-1">Número duplicado</p>
                          )}
                        </div>

                        <div>
                          <Label className="text-white">Nombre del Cromo *</Label>
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
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-white">No. Cromo *</Label>
                            <Input
                              type="number"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={slot.slot_number}
                              onChange={e =>
                                updateSlot(pageIndex, slotIndex, {
                                  ...slot,
                                  slot_number: parseInt(e.target.value) || 1,
                                })
                              }
                              placeholder="Posición"
                              min={1}
                              className={`bg-[#374151] border-gray-600 text-white ${
                                getDuplicateSlotCombinations(pageIndex).has(
                                  `${slot.slot_number}-${slot.slot_variant || 'NULL'}`
                                )
                                  ? 'border-red-500 border-2'
                                  : ''
                              }`}
                            />
                          </div>

                          <div>
                            <Label className="text-white">Variante *</Label>
                            <Input
                              value={slot.slot_variant || ''}
                              onChange={e =>
                                updateSlot(pageIndex, slotIndex, {
                                  ...slot,
                                  slot_variant: e.target.value.toUpperCase() || undefined,
                                })
                              }
                              placeholder="A, B, C..."
                              maxLength={1}
                              className={`bg-[#374151] border-gray-600 text-white uppercase ${
                                getDuplicateSlotCombinations(pageIndex).has(
                                  `${slot.slot_number}-${slot.slot_variant || 'NULL'}`
                                )
                                  ? 'border-red-500 border-2'
                                  : ''
                              }`}
                            />
                          </div>
                        </div>
                        {getDuplicateSlotCombinations(pageIndex).has(
                          `${slot.slot_number}-${slot.slot_variant || 'NULL'}`
                        ) && (
                          <p className="text-xs text-red-400">Combinación de No. Página y Variante duplicada</p>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <Label className="text-xs text-gray-400">Cromo Especial</Label>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`special-mobile-${pageIndex}-${slotIndex}`}
                              checked={slot.is_special}
                              onCheckedChange={checked =>
                                updateSlot(pageIndex, slotIndex, {
                                  ...slot,
                                  is_special: checked,
                                })
                              }
                            />
                            <Label
                              htmlFor={`special-mobile-${pageIndex}-${slotIndex}`}
                              className="text-white text-sm"
                            >
                              {slot.is_special ? 'Sí' : 'No'}
                            </Label>
                          </div>
                        </div>

                        {/* Dynamic Fields - Mobile */}
                        {itemSchema && itemSchema.length > 0 && (
                          <DynamicFieldsEditor
                            schema={itemSchema}
                            data={slot.data || {}}
                            onChange={(data) => updateSlot(pageIndex, slotIndex, { ...slot, data })}
                            idPrefix={`slot-mobile-${pageIndex}-${slotIndex}`}
                          />
                        )}
                      </div>
                    </div>
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
