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
import { useTranslations } from 'next-intl';

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


export default function UsersTab() {
  const supabase = useSupabaseClient();
  const t = useTranslations('admin.users');
  const filterOptions = [
    { value: '', label: t('filterAll') },
    { value: 'active', label: t('filterActive') },
    { value: 'suspended', label: t('filterSuspended') },
    { value: 'admin', label: t('filterAdmin') },
  ];
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
      p_search: search || undefined,
      p_filter: filter || undefined,
      p_limit: pageSize,
      p_offset: pageIndex * pageSize,
    });
    setLoading(false);
    if (error) {
      logger.error('admin_list_users error', error);
      toast(t('errorLoad'), 'error');
      return;
    }
    setUsers((data as unknown as User[]) || []);
  }, [supabase, search, filter, pageSize, pageIndex, t]);

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
          p_is_admin: value!,
        });
        if (error) throw error;
        toast(value ? t('successGrantAdmin') : t('successRevokeAdmin'), 'success');
      } else if (type === 'suspend') {
        const { error } = await supabase.rpc('admin_suspend_user', {
          p_user_id: user.user_id,
          p_is_suspended: value!,
        });
        if (error) throw error;
        toast(value ? t('successSuspend') : t('successUnsuspend'), 'success');
      } else if (type === 'delete') {
        const { error } = await supabase.rpc('admin_delete_user', {
          p_user_id: user.user_id,
        });
        if (error) throw error;
        toast(t('successDelete'), 'success');
      }

      setActionOpen(false);
      setActionDialog(null);
      await fetchUsers();
    } catch (e: unknown) {
      logger.error('User action error', e);
      const msg = e instanceof Error ? e.message : t('errorAction');
      toast(msg, 'error');
    }
  }

  function getDialogContent() {
    if (!actionDialog) return null;

    const { type, user, value } = actionDialog;

    if (type === 'admin') {
      return {
        title: value ? t('grantAdminTitle') : t('revokeAdminTitle'),
        message: value
          ? t('grantAdminMsg', { nickname: user.nickname, email: user.email })
          : t('revokeAdminMsg', { nickname: user.nickname, email: user.email }),
        confirmLabel: value ? t('grant') : t('revoke'),
        variant: value ? 'default' : 'destructive',
      };
    } else if (type === 'suspend') {
      return {
        title: value ? t('suspendTitle') : t('unsuspendTitle'),
        message: value
          ? t('suspendMsg', { nickname: user.nickname, email: user.email })
          : t('unsuspendMsg', { nickname: user.nickname, email: user.email }),
        confirmLabel: value ? t('suspend') : t('reactivate'),
        variant: value ? 'destructive' : 'default',
      };
    } else {
      return {
        title: t('deleteTitle'),
        message: t('deleteMsg', { nickname: user.nickname, email: user.email }),
        confirmLabel: t('delete'),
        variant: 'destructive',
      };
    }
  }

  const dialogContent = getDialogContent();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h2 className="text-2xl font-black text-white">{t('title')}</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-white">{t('search')}</label>
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPageIndex(0);
            }}
          />
          <label className="text-white">{t('filter')}</label>
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
          <label className="text-white">{t('pageSize')}</label>
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
        <Button onClick={() => setPageIndex(Math.max(0, pageIndex - 1))} disabled={pageIndex === 0}>{t('prev')}</Button>
        <Button onClick={() => setPageIndex(pageIndex + 1)} disabled={users.length < pageSize}>{t('next')}</Button>
        <span className="text-white text-sm self-center ml-2">{t('page', { page: pageIndex + 1 })}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm bg-[#2D3748] text-white border-4 border-black rounded-md">
          <thead>
            <tr className="bg-gray-700">
              <th className="px-3 py-2 text-left border-b border-black">Email</th>
              <th className="px-3 py-2 text-left border-b border-black">Nickname</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colStatus')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colStickers')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colTrades')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colCreated')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colLastAccess')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (<tr><td className="px-3 py-4" colSpan={8}>{t('loading')}</td></tr>)
              : users.length === 0 ? (<tr><td className="px-3 py-4" colSpan={8}>{t('noResults')}</td></tr>)
              : (
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
                        <span className="bg-gold text-black px-2 py-0.5 rounded text-xs font-bold">ADMIN</span>
                      )}
                      {u.is_suspended && (
                        <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs font-bold">{t('statusSuspended')}</span>
                      )}
                      {!u.is_admin && !u.is_suspended && (
                        <span className="text-gray-400 text-xs">{t('statusActive')}</span>
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
                        <Button size="sm" onClick={() => openAdminDialog(u, true)}>{t('makeAdmin')}</Button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => openAdminDialog(u, false)}>{t('removeAdmin')}</Button>
                      )}
                      {!u.is_suspended ? (
                        <Button size="sm" variant="destructive" onClick={() => openSuspendDialog(u, true)}>{t('suspend')}</Button>
                      ) : (
                        <Button size="sm" onClick={() => openSuspendDialog(u, false)}>{t('reactivate')}</Button>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(u)}>{t('delete')}</Button>
                      <Button size="sm" variant="secondary" onClick={() => setEmailUser(u)}>{t('sendEmail')}</Button>
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
                <Button variant={dialogContent.variant as 'default' | 'destructive' | 'secondary'} onClick={performAction}>
                  {dialogContent.confirmLabel}
                </Button>
                <Button variant="secondary" onClick={() => { setActionOpen(false); setActionDialog(null); }}>
                  {t('cancel')}
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
