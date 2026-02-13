'use client';

import { useEffect } from 'react';
import { useRouter } from '@/hooks/use-router';
import { useUser } from '@/components/providers/SupabaseProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationSettingsTab } from '@/components/settings/NotificationSettingsTab';
import { IgnoredUsersTab } from '@/components/settings/IgnoredUsersTab';
import { SystemSettingsTab } from '@/components/settings/SystemSettingsTab';
import { LegalSettingsTab } from '@/components/settings/LegalSettingsTab';
import {
  User,
  MapPin,
  Camera,
  Loader2,
  Trash2,
  ChevronRight,
  Shield,
  FileText,
  Cookie,
} from 'lucide-react';
import Link from '@/components/ui/link'; // Added Link import

export default function AjustesPage() {
  const router = useRouter();
  const { user, loading } = useUser();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">
              Ajustes
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Configura tus preferencias y gestiona tu cuenta
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="notificaciones" className="w-full">
            <TabsList className="w-full mb-6">
              <TabsTrigger value="notificaciones" className="flex-1">
                Notificaciones
              </TabsTrigger>
              <TabsTrigger value="ignorados" className="flex-1">
                Bloqueados
              </TabsTrigger>
              <TabsTrigger value="sistema" className="flex-1">
                Sistema
              </TabsTrigger>
              <TabsTrigger value="legal" className="flex-1">
                Legal
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notificaciones">
              <NotificationSettingsTab />
            </TabsContent>

            <TabsContent value="ignorados">
              <IgnoredUsersTab />
            </TabsContent>

            <TabsContent value="sistema">
              <SystemSettingsTab />
            </TabsContent>

            <TabsContent value="legal">
              <LegalSettingsTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
