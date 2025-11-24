'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}

function FormField({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  inputMode,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          error && 'text-destructive'
        )}
      >
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          error && 'border-destructive focus-visible:ring-destructive'
        )}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface LoadingButtonProps {
  loading: boolean;
  loadingText: string;
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

function LoadingButton({
  loading,
  loadingText,
  children,
  type = 'button',
  variant = 'default',
  size = 'default',
  className,
  disabled = false,
  onClick,
}: LoadingButtonProps) {
  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      className={className}
      disabled={loading || disabled}
      onClick={onClick}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

interface ErrorAlertProps {
  error?: string;
  className?: string;
}

function ErrorAlert({ error, className }: ErrorAlertProps) {
  if (!error) return null;

  return (
    <div
      className={cn(
        'rounded-md border border-destructive/50 bg-destructive/10 p-3',
        className
      )}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-destructive"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-destructive font-medium">{error}</p>
        </div>
      </div>
    </div>
  );
}

interface SuccessAlertProps {
  message?: string;
  className?: string;
}

function SuccessAlert({ message, className }: SuccessAlertProps) {
  if (!message) return null;

  return (
    <div
      className={cn(
        'rounded-md border border-green-500/50 bg-green-50 p-3 dark:bg-green-950/50',
        className
      )}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-green-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L8.23 10.661a.75.75 0 00-1.06 1.06l1.5 1.5a.75.75 0 001.14-.094l3.75-5.25z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-green-700 dark:text-green-400 font-medium">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

interface FormContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

function FormContainer({
  title,
  description,
  children,
  className,
}: FormContainerProps) {
  return (
    <main className={cn('container mx-auto max-w-md p-4', className)}>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-2 text-muted-foreground">{description}</p>
          )}
        </div>
        {children}
      </div>
    </main>
  );
}

export { FormField, LoadingButton, ErrorAlert, SuccessAlert, FormContainer };

