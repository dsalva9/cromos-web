'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useReport } from '@/hooks/social/useReport';
import { toast } from 'sonner';

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  entityType: 'user' | 'listing' | 'template' | 'chat';
  entityId: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'scam', label: 'Scam or fraud' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'fake', label: 'Fake or counterfeit items' },
  { value: 'other', label: 'Other' },
];

export function ReportModal({ open, onClose, entityType, entityId }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const { submitReport, loading } = useReport();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason) {
      toast.error('Please select a reason');
      return;
    }

    if (description.length > 500) {
      toast.error('Description must be 500 characters or less');
      return;
    }

    try {
      await submitReport(entityType, entityId, reason, description);
      toast.success('Report submitted successfully. Our team will review it.');
      onClose();
      // Reset form
      setReason('');
      setDescription('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit report');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1F2937] border-2 border-black">
        <DialogHeader>
          <DialogTitle className="text-white">Report Content</DialogTitle>
          <DialogDescription className="text-gray-400">
            Help us maintain a safe community by reporting inappropriate content.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Reason */}
          <div className="space-y-3">
            <Label className="text-white">Why are you reporting this?</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {REPORT_REASONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label
                    htmlFor={option.value}
                    className="text-gray-300 cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">
              Additional details (optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide any additional information..."
              rows={4}
              maxLength={500}
              className="bg-[#374151] border-2 border-black text-white"
            />
            <p className="text-sm text-gray-400">
              {description.length} / 500 characters
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !reason}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
