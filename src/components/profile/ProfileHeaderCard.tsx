'use client';

import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModernCard } from '@/components/ui/modern-card';
import {
  User,
  Calendar,
  Users,
  Edit3,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { Profile } from '@/types/collections';

interface ProfileHeaderCardProps {
  profile: Profile | null;
  userEmail?: string;
  nickname: string;
  editingNickname: boolean;
  ownedCollectionsCount: number;
  onEditStart: () => void;
  onSaveNickname: () => void;
  onCancelEdit: () => void;
  onChangeNickname: (value: string) => void;
}

export function ProfileHeaderCard({
  profile,
  userEmail,
  nickname,
  editingNickname,
  ownedCollectionsCount,
  onEditStart,
  onSaveNickname,
  onCancelEdit,
  onChangeNickname,
}: ProfileHeaderCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingNickname && window.matchMedia('(min-width: 768px)').matches) {
      inputRef.current?.focus();
    }
  }, [editingNickname]);

  return (
    <ModernCard className="bg-white/70 backdrop-blur-sm overflow-hidden hover:shadow-2xl transition-all duration-300 ring-1 ring-black/5">
      {/* Gradient Header with subtle overlay */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 relative">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative p-8">
          <div className="flex items-center space-x-8">
            {/* Avatar */}
            <div className="relative">
              <div className="w-28 h-28 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl border-4 border-white/30">
                <User className="w-14 h-14 text-white/90 drop-shadow-md" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-400 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white/30">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-white/90">
              {editingNickname ? (
                <div className="space-y-4">
                  <div className="flex space-x-3">
                    <Input
                      value={nickname}
                      onChange={e => onChangeNickname(e.target.value)}
                      placeholder="Tu nombre de usuario"
                      className="bg-white/90 border-0 text-gray-800 flex-1 text-xl font-bold focus-visible:ring-2 focus-visible:ring-white/50"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          onSaveNickname();
                        }
                        if (e.key === 'Escape') {
                          onCancelEdit();
                        }
                      }}
                      ref={inputRef}
                    />
                  </div>
                  <div className="flex space-x-3">
                    <Button
                      size="sm"
                      onClick={onSaveNickname}
                      className="bg-green-500 hover:bg-green-600 text-white ring-0"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onCancelEdit}
                      className="bg-white/90 text-gray-800 border-0 hover:bg-white ring-0"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center space-x-4 mb-3">
                    <h2 className="text-4xl font-bold text-white/90 drop-shadow-md">
                      {profile?.nickname || 'Sin nombre'}
                    </h2>
                    <Button
                      size="sm"
                      onClick={onEditStart}
                      className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white p-3 ring-0 focus-visible:ring-2 focus-visible:ring-white/50"
                    >
                      <Edit3 className="w-5 h-5" />
                    </Button>
                  </div>
                  <p className="text-white/80 mb-4 text-lg">{userEmail}</p>
                  <div className="flex items-center space-x-8 text-sm text-white/80">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5" />
                      <span>
                        Desde{' '}
                        {new Date(
                          profile?.created_at || ''
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5" />
                      <span>
                        {ownedCollectionsCount} colección
                        {ownedCollectionsCount !== 1 ? 'es' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModernCard>
  );
}

