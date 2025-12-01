'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { ItemFieldDefinition } from '@/types/v1.6.0';

interface ItemSchemaBuilderProps {
  schema: ItemFieldDefinition[];
  onChange: (schema: ItemFieldDefinition[]) => void;
}

export function ItemSchemaBuilder({ schema, onChange }: ItemSchemaBuilderProps) {
  const [editingField, setEditingField] = useState<ItemFieldDefinition | null>(null);

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

  const removeField = (index: number) => {
    const updatedSchema = schema.filter((_, i) => i !== index);
    onChange(updatedSchema);
  };

  const updateEditingField = (updates: Partial<ItemFieldDefinition>) => {
    if (!editingField) return;
    setEditingField({ ...editingField, ...updates });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Campos del Cromo</h3>
          <p className="text-sm text-gray-400">
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
          <Card key={index} className="bg-[#2D3748] border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <GripVertical className="h-5 w-5 text-gray-500" />
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Nombre</p>
                    <p className="text-white font-medium">{field.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Tipo</p>
                    <p className="text-white capitalize">{field.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Requerido</p>
                    <p className="text-white">{field.required ? 'Sí' : 'No'}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeField(index)}
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
        <Card className="bg-[#2D3748] border-yellow-400 border-2">
          <CardContent className="p-4 space-y-4">
            <h4 className="text-white font-semibold">Nuevo Campo</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="field-name" className="text-white">
                  Nombre del Campo *
                </Label>
                <Input
                  id="field-name"
                  value={editingField.name}
                  onChange={(e) => updateEditingField({ name: e.target.value })}
                  placeholder="ej: Número, Rareza, Equipo..."
                  className="bg-[#1F2937] border-gray-600 text-white"
                />
              </div>

              <div>
                <Label htmlFor="field-type" className="text-white">
                  Tipo de Campo
                </Label>
                <select
                  id="field-type"
                  value={editingField.type}
                  onChange={(e) => updateEditingField({ type: e.target.value as ItemFieldDefinition['type'] })}
                  className="w-full h-10 px-3 rounded-md bg-[#1F2937] border border-gray-600 text-white"
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
                <Label htmlFor="field-options" className="text-white">
                  Opciones (separadas por coma)
                </Label>
                <Input
                  id="field-options"
                  value={editingField.options?.join(', ') || ''}
                  onChange={(e) => updateEditingField({ 
                    options: e.target.value.split(',').map(o => o.trim()).filter(Boolean) 
                  })}
                  placeholder="ej: Común, Raro, Épico, Legendario"
                  className="bg-[#1F2937] border-gray-600 text-white"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="field-required"
                checked={editingField.required}
                onChange={(e) => updateEditingField({ required: e.target.checked })}
                className="w-4 h-4 rounded border-gray-600 bg-[#1F2937]"
              />
              <Label htmlFor="field-required" className="text-white cursor-pointer">
                Campo obligatorio
              </Label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setEditingField(null)}
                className="text-white border-gray-600"
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
        <Card className="bg-[#2D3748] border-gray-600">
          <CardContent className="p-8 text-center">
            <p className="text-gray-400">
              No hay campos definidos. Añade campos para personalizar tu plantilla.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Ejemplo: Número de Cromo, Nombre del Jugador, Equipo, Rareza, etc.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
