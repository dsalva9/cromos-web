import { ModernCard } from '@/components/ui/modern-card';
import EmailForwardingSettings from '@/components/admin/EmailForwardingSettings';
import InboundEmailLogs from '@/components/admin/InboundEmailLogs';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">System Settings</h1>
        <p className="text-zinc-400">
          Configure system-wide settings and preferences for the admin console.
        </p>
      </div>

      {/* Email Forwarding Section */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Email Forwarding Configuration</h2>
        <ModernCard>
          <EmailForwardingSettings />
        </ModernCard>
      </div>

      {/* Inbound Email Logs Section */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Recent Inbound Emails</h2>
        <ModernCard>
          <InboundEmailLogs />
        </ModernCard>
      </div>
    </div>
  );
}
