'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserLink } from '@/components/ui/user-link';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SendEmailModal } from './SendEmailModal';

type User = {
  user_id: string;
  email: string;
  nickname: string;
  is_admin: boolean;
  is_suspended: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  sticker_count: number;
  trade_count: number;
};

type ActionDialog = {
  type: 'admin' | 'suspend' | 'delete';
  user: User;
  value?: boolean;
};

const filterOptions = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'suspended', label: 'Suspendidos' },
  { value: 'admin', label: 'Administradores' },
];

export default function UsersTab() {
  const supabase = useSupabaseClient();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [pageIndex, setPageIndex] = useState(0);
  const [actionDialog, setActionDialog] = useState<ActionDialog | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [emailUser, setEmailUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_users', {
      p_search: search || null,
      p_filter: filter || null,
      p_limit: pageSize,
      p_offset: pageIndex * pageSize,
    });
    setLoading(false);
    if (error) {
      logger.error('admin_list_users error', error);
      toast('Error al cargar usuarios', 'error');
      return;
    }
    setUsers((data as unknown as User[]) || []);
  }, [supabase, search, filter, pageSize, pageIndex]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  function openAdminDialog(user: User, isAdmin: boolean) {
    setActionDialog({ type: 'admin', user, value: isAdmin });
    setActionOpen(true);
  }

  function openSuspendDialog(user: User, isSuspended: boolean) {
    setActionDialog({ type: 'suspend', user, value: isSuspended });
    setActionOpen(true);
  }

  function openDeleteDialog(user: User) {
    setActionDialog({ type: 'delete', user });
    setActionOpen(true);
  }

  async function performAction() {
    if (!actionDialog) return;

    const { type, user, value } = actionDialog;

    try {
      if (type === 'admin') {
        const { error } = await supabase.rpc('admin_update_user_role', {
          p_user_id: user.user_id,
          p_is_admin: value,
        });
        if (error) throw error;
        toast(
          value
            ? 'Privilegios de administrador otorgados'
            : 'Privilegios de administrador revocados',
          'success'
        );
      } else if (type === 'suspend') {
        const { error } = await supabase.rpc('admin_suspend_user', {
          p_user_id: user.user_id,
          p_is_suspended: value,
        });
        if (error) throw error;
        toast(value ? 'Usuario suspendido' : 'Suspensión levantada', 'success');
      } else if (type === 'delete') {
        const { error } = await supabase.rpc('admin_delete_user', {
          p_user_id: user.user_id,
        });
        if (error) throw error;
        toast('Usuario eliminado', 'success');
      }

      setActionOpen(false);
      setActionDialog(null);
      await fetchUsers();
    } catch (e: unknown) {
      logger.error('User action error', e);
      const msg =
        e instanceof Error ? e.message : 'Error al realizar la acción';
      toast(msg, 'error');
    }
  }

  function getDialogContent() {
    if (!actionDialog) return null;

    const { type, user, value } = actionDialog;

    if (type === 'admin') {
      return {
        title: value
          ? 'Otorgar privilegios de administrador'
          : 'Revocar privilegios de administrador',
        message: value
          ? `¿Otorgar privilegios de administrador a ${user.nickname} (${user.email})?`
          : `¿Revocar privilegios de administrador a ${user.nickname} (${user.email})?`,
        confirmLabel: value ? 'Otorgar' : 'Revocar',
        variant: value ? 'default' : 'destructive',
      };
    } else if (type === 'suspend') {
      return {
        title: value ? 'Suspender usuario' : 'Levantar suspensión',
        message: value
          ? `¿Suspender la cuenta de ${user.nickname} (${user.email})? El usuario no podrá iniciar sesión.`
          : `¿Levantar la suspensión de ${user.nickname} (${user.email})? El usuario podrá iniciar sesión nuevamente.`,
        confirmLabel: value ? 'Suspender' : 'Reactivar',
        variant: value ? 'destructive' : 'default',
      };
    } else {
      return {
        title: 'Eliminar usuario',
        message: `¿Eliminar permanentemente la cuenta de ${user.nickname} (${user.email})? Esta acción eliminará todos sus cromos, intercambios y datos asociados. Esta acción es irreversible.`,
        confirmLabel: 'Eliminar',
        variant: 'destructive',
      };
    }
  }

  const dialogContent = getDialogContent();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h2 className="text-2xl font-black text-white">Usuarios</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-white">Buscar</label>
          <Input
            placeholder="Email o nombre..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPageIndex(0);
            }}
          />
          <label className="text-white">Filtro</label>
          <select
            className="bg-[#2D3748] text-white border-2 border-black rounded-md px-2 py-1"
            value={filter}
            onChange={e => {
              setFilter(e.target.value);
              setPageIndex(0);
            }}
          >
            {filterOptions.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <label className="text-white">Pág. tamaño</label>
          <select
            className="bg-[#2D3748] text-white border-2 border-black rounded-md px-2 py-1"
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
              setPageIndex(0);
            }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
          disabled={pageIndex === 0}
        >
          Anterior
        </Button>
        <Button
          onClick={() => setPageIndex(pageIndex + 1)}
          disabled={users.length < pageSize}
        >
          Siguiente
        </Button>
        <span className="text-white text-sm self-center ml-2">
          Página {pageIndex + 1}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm bg-[#2D3748] text-white border-4 border-black rounded-md">
          <thead>
            <tr className="bg-gray-700">
              <th className="px-3 py-2 text-left border-b border-black">
                Email
              </th>
              <th className="px-3 py-2 text-left border-b border-black">
                Nickname
              </th>
              <th className="px-3 py-2 text-left border-b border-black">
                Estado
              </th>
              <th className="px-3 py-2 text-left border-b border-black">
                Cromos
              </th>
              <th className="px-3 py-2 text-left border-b border-black">
                Intercambios
              </th>
              <th className="px-3 py-2 text-left border-b border-black">
                Creado
              </th>
              <th className="px-3 py-2 text-left border-b border-black">
                Último acceso
              </th>
              <th className="px-3 py-2 text-left border-b border-black">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-4" colSpan={8}>
                  Cargando…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td className="px-3 py-4" colSpan={8}>
                  Sin resultados
                </td>
              </tr>
            ) : (
              users.map(u => (
                <tr
                  key={u.user_id}
                  className="odd:bg-[#2D3748] even:bg-[#253044]"
                >
                  <td className="px-3 py-2 border-b border-black">{u.email}</td>
                  <td className="px-3 py-2 border-b border-black">
                    <UserLink
                      userId={u.user_id}
                      nickname={u.nickname}
                      variant="default"
                    />
                  </td>
                  <td className="px-3 py-2 border-b border-black">
                    <div className="flex gap-1 flex-wrap">
                      {u.is_admin && (
                        <span className="bg-[#FFC000] text-black px-2 py-0.5 rounded text-xs font-bold">
                          ADMIN
                        </span>
                      )}
                      {u.is_suspended && (
                        <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs font-bold">
                          SUSPENDIDO
                        </span>
                      )}
                      {!u.is_admin && !u.is_suspended && (
                        <span className="text-gray-400 text-xs">Activo</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 border-b border-black">
                    {u.sticker_count}
                  </td>
                  <td className="px-3 py-2 border-b border-black">
                    {u.trade_count}
                  </td>
                  <td className="px-3 py-2 border-b border-black whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 border-b border-black whitespace-nowrap">
                    {u.last_sign_in_at
                      ? new Date(u.last_sign_in_at).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-3 py-2 border-b border-black">
                    <div className="flex gap-1 flex-wrap">
                      {!u.is_admin ? (
                        <Button
                          size="sm"
                          onClick={() => openAdminDialog(u, true)}
                        >
                          Hacer admin
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openAdminDialog(u, false)}
                        >
                          Quitar admin
                        </Button>
                      )}
                      {!u.is_suspended ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openSuspendDialog(u, true)}
                        >
                          Suspender
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => openSuspendDialog(u, false)}
                        >
                          Reactivar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openDeleteDialog(u)}
                      >
                        Eliminar
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEmailUser(u)}
                      >
                        Enviar email
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={!!actionDialog && actionOpen}
        onOpenChange={open => {
          setActionOpen(open);
          if (!open) setActionDialog(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          onEscapeKeyDown={e => e.preventDefault()}
          onInteractOutside={e => e.preventDefault()}
          className="bg-[#2D3748] border-4 border-black text-white"
        >
          {dialogContent && (
            <>
              <DialogHeader>
                <DialogTitle>{dialogContent.title}</DialogTitle>
              </DialogHeader>
              <p>{dialogContent.message}</p>
              <DialogFooter className="mt-4">
                <Button
                  variant={
                    dialogContent.variant as
                    | 'default'
                    | 'destructive'
                    | 'secondary'
                  }
                  onClick={performAction}
                >
                  {dialogContent.confirmLabel}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setActionOpen(false);
                    setActionDialog(null);
                  }}
                >
                  Cancelar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <SendEmailModal
        user={emailUser}
        open={!!emailUser}
        onClose={() => setEmailUser(null)}
      />
    </div>
  );
}
