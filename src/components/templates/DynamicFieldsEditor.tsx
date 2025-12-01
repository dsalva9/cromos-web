import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ItemFieldDefinition } from '@/types/v1.6.0';

interface DynamicFieldsEditorProps {
  schema: ItemFieldDefinition[];
  data: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
  idPrefix: string;
}

export function DynamicFieldsEditor({
  schema,
  data,
  onChange,
  idPrefix,
}: DynamicFieldsEditorProps) {
  const updateField = (fieldName: string, value: any) => {
    onChange({
      ...data,
      [fieldName]: value,
    });
  };

  if (!schema || schema.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 pt-3 border-t border-gray-600">
      <p className="text-xs font-semibold text-yellow-400 uppercase">Campos Personalizados</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {schema.map((field, index) => {
          const fieldId = `${idPrefix}-${field.name}-${index}`;
          const value = data?.[field.name];

          return (
            <div key={fieldId} className="space-y-1">
              <Label htmlFor={fieldId} className="text-white text-sm">
                {field.name}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </Label>

              {field.type === 'text' && (
                <Input
                  id={fieldId}
                  type="text"
                  value={value || ''}
                  onChange={(e) => updateField(field.name, e.target.value)}
                  placeholder={`Ingresa ${field.name.toLowerCase()}`}
                  className="bg-[#374151] border-gray-600 text-white"
                  required={field.required}
                />
              )}

              {field.type === 'number' && (
                <Input
                  id={fieldId}
                  type="number"
                  inputMode="numeric"
                  value={value || ''}
                  onChange={(e) => updateField(field.name, e.target.value ? parseFloat(e.target.value) : '')}
                  placeholder={`Ingresa ${field.name.toLowerCase()}`}
                  className="bg-[#374151] border-gray-600 text-white"
                  required={field.required}
                />
              )}

              {field.type === 'checkbox' && (
                <div className="flex items-center gap-2 h-10">
                  <input
                    id={fieldId}
                    type="checkbox"
                    checked={value || false}
                    onChange={(e) => updateField(field.name, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-[#374151]"
                  />
                  <Label htmlFor={fieldId} className="text-gray-300 text-sm cursor-pointer">
                    {value ? 'Sí' : 'No'}
                  </Label>
                </div>
              )}

              {field.type === 'select' && field.options && (
                <select
                  id={fieldId}
                  value={value || ''}
                  onChange={(e) => updateField(field.name, e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-[#374151] border border-gray-600 text-white"
                  required={field.required}
                >
                  <option value="">Selecciona {field.name.toLowerCase()}</option>
                  {field.options.map((option, optIndex) => (
                    <option key={optIndex} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
