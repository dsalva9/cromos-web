'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/providers/SupabaseProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationSettingsTab } from '@/components/settings/NotificationSettingsTab';
import { IgnoredUsersTab } from '@/components/settings/IgnoredUsersTab';
import { SystemSettingsTab } from '@/components/settings/SystemSettingsTab';

export default function AjustesPage() {
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  if (!user) {
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
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-black text-white mb-2">
              Ajustes
            </h1>
            <p className="text-gray-400">
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
                Ignorados
              </TabsTrigger>
              <TabsTrigger value="sistema" className="flex-1">
                Sistema
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
          </Tabs>
        </div>
      </div>
    </div>
  );
}
