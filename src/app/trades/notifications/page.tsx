'use client';

import { Suspense } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { NotificationsList } from '@/components/trades/NotificationsList';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

function NotificationsContent() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#1F2937] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-gray-300 hover:text-white hover:bg-gray-800 font-bold uppercase rounded-md border-2 border-transparent hover:border-black"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <div className="flex-1">
              <h1 className="text-4xl font-black uppercase text-white">
                Notificaciones
              </h1>
              <p className="text-gray-300 font-medium">
                Actualizaciones de tus intercambios
              </p>
            </div>
          </div>

          {/* Notifications List */}
          <NotificationsList />
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
            <div className="text-white font-bold uppercase text-xl">
              Cargando notificaciones...
            </div>
          </div>
        }
      >
        <NotificationsContent />
      </Suspense>
    </AuthGuard>
  );
}
