import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ItemFieldDefinition } from '@/types/v1.6.0';

interface DynamicFieldsEditorProps {
  schema: ItemFieldDefinition[];
  data: Record<string, string | number | boolean>;
  onChange: (data: Record<string, string | number | boolean>) => void;
  idPrefix: string;
}

export function DynamicFieldsEditor({
  schema,
  data,
  onChange,
  idPrefix,
}: DynamicFieldsEditorProps) {
  const updateField = (fieldName: string, value: string | number | boolean) => {
    onChange({
      ...data,
      [fieldName]: value,
    });
  };

  if (!schema || schema.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {schema.map((field, index) => {
          const fieldId = `${idPrefix}-${field.name}-${index}`;
          const value = data?.[field.name];
          const isNumberField = field.type === 'number';
          const isCheckboxField = field.type === 'checkbox';

          return (
            <div
              key={fieldId}
              className={`space-y-1 ${
                isNumberField ? 'w-full md:w-[140px]' :
                isCheckboxField ? 'w-full md:w-[140px]' :
                'w-full md:flex-1 md:min-w-[200px]'
              }`}
            >
              <Label htmlFor={fieldId} className="text-gray-900 dark:text-white text-sm">
                {field.name}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </Label>

              {field.type === 'text' && (
                <Input
                  id={fieldId}
                  type="text"
                  value={typeof value === 'string' ? value : ''}
                  onChange={(e) => updateField(field.name, e.target.value)}
                  placeholder={`Ingresa ${field.name.toLowerCase()}`}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                  required={field.required}
                />
              )}

              {field.type === 'number' && (
                <Input
                  id={fieldId}
                  type="number"
                  inputMode="numeric"
                  value={typeof value === 'number' ? value : ''}
                  onChange={(e) => updateField(field.name, e.target.value ? parseFloat(e.target.value) : '')}
                  placeholder={`Ingresa ${field.name.toLowerCase()}`}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                  required={field.required}
                />
              )}

              {field.type === 'checkbox' && (
                <div className="flex items-center gap-2 h-10">
                  <input
                    id={fieldId}
                    type="checkbox"
                    checked={typeof value === 'boolean' ? value : false}
                    onChange={(e) => updateField(field.name, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                  <Label htmlFor={fieldId} className="text-gray-600 dark:text-gray-400 text-sm cursor-pointer">
                    {value ? 'Sí' : 'No'}
                  </Label>
                </div>
              )}

              {field.type === 'select' && field.options && (
                <select
                  id={fieldId}
                  value={typeof value === 'string' ? value : ''}
                  onChange={(e) => updateField(field.name, e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
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
