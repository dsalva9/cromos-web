'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Trash2, GripVertical, AlertTriangle } from 'lucide-react';
import { ItemFieldDefinition } from '@/types/v1.6.0';

interface ItemSchemaBuilderProps {
  schema: ItemFieldDefinition[];
  onChange: (schema: ItemFieldDefinition[]) => void;
  pages?: Array<{
    slots: Array<{
      data: Record<string, string | number | boolean>;
    }>;
  }>;
}

export function ItemSchemaBuilder({ schema, onChange, pages = [] }: ItemSchemaBuilderProps) {
  const [editingField, setEditingField] = useState<ItemFieldDefinition | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [deleteWarningOpen, setDeleteWarningOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<{ index: number; name: string } | null>(null);

  const addField = () => {
    const newField: ItemFieldDefinition = {
      name: '',
      type: 'text',
      required: false,
    };
    setEditingField(newField);
  };

  const saveField = () => {
    if (!editingField || !editingField.name.trim()) return;

    const updatedSchema = [...schema, editingField];
    onChange(updatedSchema);
    setEditingField(null);
  };

  const checkFieldHasData = (fieldName: string): boolean => {
    // Check if any slot in any page has non-empty data for this field
    return pages.some(page =>
      page.slots.some(slot => {
        const value = slot.data?.[fieldName];
        return value !== undefined && value !== null && value !== '';
      })
    );
  };

  const handleRemoveField = (index: number) => {
    const field = schema[index];
    const hasData = checkFieldHasData(field.name);

    if (hasData) {
      // Show warning dialog
      setFieldToDelete({ index, name: field.name });
      setDeleteWarningOpen(true);
    } else {
      // Delete directly
      removeField(index);
    }
  };

  const removeField = (index: number) => {
    const updatedSchema = schema.filter((_, i) => i !== index);
    onChange(updatedSchema);
  };

  const confirmRemoveField = () => {
    if (fieldToDelete !== null) {
      removeField(fieldToDelete.index);
      setDeleteWarningOpen(false);
      setFieldToDelete(null);
    }
  };

  const updateEditingField = (updates: Partial<ItemFieldDefinition>) => {
    if (!editingField) return;
    setEditingField({ ...editingField, ...updates });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSchema = [...schema];
    const draggedItem = newSchema[draggedIndex];
    newSchema.splice(draggedIndex, 1);
    newSchema.splice(index, 0, draggedItem);

    onChange(newSchema);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Campos del Cromo</h3>
          <p className="text-sm text-gray-600">
            Define qué información tendrá cada cromo de tu plantilla
          </p>
        </div>
        <Button
          onClick={addField}
          disabled={editingField !== null}
          className="bg-[#FFC000] text-black hover:bg-[#FFD700]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Añadir Campo
        </Button>
      </div>

      {/* Existing Fields */}
      <div className="space-y-2">
        {schema.map((field, index) => (
          <Card
            key={index}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`bg-gray-50 border-gray-200 transition-opacity ${
              draggedIndex === index ? 'opacity-50' : 'opacity-100'
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <GripVertical className="h-5 w-5 text-gray-400 cursor-grab active:cursor-grabbing hover:text-yellow-400 transition-colors" />
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Nombre</p>
                    <p className="text-gray-900 font-medium">{field.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tipo</p>
                    <p className="text-gray-900 capitalize">{field.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Requerido</p>
                    <p className="text-gray-900">{field.required ? 'Sí' : 'No'}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveField(index)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Field Form */}
      {editingField && (
        <Card className="bg-gray-50 border-yellow-400 border-2">
          <CardContent className="p-4 space-y-4">
            <h4 className="text-gray-900 font-semibold">Nuevo Campo</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="field-name" className="text-gray-900">
                  Nombre del Campo *
                </Label>
                <Input
                  id="field-name"
                  value={editingField.name}
                  onChange={(e) => updateEditingField({ name: e.target.value })}
                  placeholder="ej: Número, Rareza, Equipo..."
                  className="bg-white border-gray-200 text-gray-900"
                />
              </div>

              <div>
                <Label htmlFor="field-type" className="text-gray-900">
                  Tipo de Campo
                </Label>
                <select
                  id="field-type"
                  value={editingField.type}
                  onChange={(e) => updateEditingField({ type: e.target.value as ItemFieldDefinition['type'] })}
                  className="w-full h-10 px-3 rounded-md bg-white border border-gray-200 text-gray-900"
                >
                  <option value="text">Texto</option>
                  <option value="number">Número</option>
                  <option value="checkbox">Casilla</option>
                  <option value="select">Selección</option>
                </select>
              </div>
            </div>

            {editingField.type === 'select' && (
              <div>
                <Label htmlFor="field-options" className="text-gray-900">
                  Opciones (separadas por coma)
                </Label>
                <Input
                  id="field-options"
                  value={editingField.options?.join(', ') || ''}
                  onChange={(e) => updateEditingField({
                    options: e.target.value.split(',').map(o => o.trim()).filter(Boolean)
                  })}
                  placeholder="ej: Común, Raro, Épico, Legendario"
                  className="bg-white border-gray-200 text-gray-900"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="field-required"
                checked={editingField.required}
                onChange={(e) => updateEditingField({ required: e.target.checked })}
                className="w-4 h-4 rounded border-gray-200 bg-white"
              />
              <Label htmlFor="field-required" className="text-gray-900 cursor-pointer">
                Campo obligatorio
              </Label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setEditingField(null)}
                className="text-gray-900 border-gray-200"
              >
                Cancelar
              </Button>
              <Button
                onClick={saveField}
                disabled={!editingField.name.trim()}
                className="bg-[#FFC000] text-black hover:bg-[#FFD700]"
              >
                Guardar Campo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {schema.length === 0 && !editingField && (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">
              No hay campos definidos. Añade campos para personalizar tu plantilla.
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Ejemplo: Número de Cromo, Nombre del Jugador, Equipo, Rareza, etc.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Delete Warning Dialog */}
      <Dialog open={deleteWarningOpen} onOpenChange={setDeleteWarningOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-gray-900">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              ¿Eliminar campo con datos?
            </DialogTitle>
            <DialogDescription className="text-gray-600 pt-2">
              El campo <span className="font-bold text-gray-900">&quot;{fieldToDelete?.name}&quot;</span> tiene datos en &apos;Páginas y Cromos&apos;.
              Si eliminas este campo, <span className="font-bold text-red-400">se perderán todos los datos</span> relacionados.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4 my-4">
            <p className="text-red-200 text-sm">
              <strong>⚠️ Advertencia:</strong> Esta acción no se puede deshacer. Los datos de este campo se eliminarán permanentemente de todos los cromos.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteWarningOpen(false);
                setFieldToDelete(null);
              }}
              className="border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmRemoveField}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Eliminar de todas formas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
