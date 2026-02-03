'use client';

import { useState } from 'react';
import { X, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface AddForwardingAddressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (email: string) => Promise<void>;
}

export default function AddForwardingAddressDialog({
  isOpen,
  onClose,
  onAdd,
}: AddForwardingAddressDialogProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (!validateEmail(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd(email.trim());
      toast.success('Forwarding address added successfully');
      setEmail('');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add forwarding address');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setEmail('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 rounded-lg max-w-md w-full border border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Add Forwarding Address</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <p className="text-zinc-400 text-sm">
              Emails received at @cambiocromos.com addresses will be forwarded to this email address.
            </p>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="admin@example.com"
                  className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#FFC000] disabled:opacity-50"
                  autoFocus
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-zinc-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#FFC000] text-black font-semibold rounded-lg hover:bg-[#FFD54F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Address'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
