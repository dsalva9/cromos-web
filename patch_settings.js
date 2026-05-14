const fs = require('fs');
const path = require('path');

const locales = ['en', 'es', 'pt'];
const dictionaries = {};

// 1. Update Dictionaries
locales.forEach(locale => {
  const filePath = path.join(__dirname, `src/i18n/messages/${locale}.json`);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  if (!content.settings) content.settings = {};

  // Add keys for system tab
  content.settings.system = {
    "reactivateTips": {
        "title": locale === 'en' ? "Help Tips" : locale === 'pt' ? "Dicas de Ajuda" : "Consejos de ayuda",
        "description": locale === 'en' ? "Show contextual tips in different sections of the app to help you use all features." : locale === 'pt' ? "Mostra dicas contextuais em diferentes seções do aplicativo para ajudar você a usar todos os recursos." : "Muestra consejos contextuales en las distintas secciones de la app para ayudarte a usar todas las funciones.",
        "button": locale === 'en' ? "Reactivate tips" : locale === 'pt' ? "Reativar dicas" : "Reactivar consejos",
        "success": locale === 'en' ? "Tips reactivated successfully" : locale === 'pt' ? "Dicas reativadas com sucesso" : "Consejos reactivados correctamente",
        "error": locale === 'en' ? "Error reactivating tips" : locale === 'pt' ? "Erro ao reativar dicas" : "Error al reactivar los consejos"
    },
    "signOutAll": {
        "title": locale === 'en' ? "Sign out of all devices" : locale === 'pt' ? "Sair de todos os dispositivos" : "Cerrar sesión en todos los dispositivos",
        "description": locale === 'en' ? "Sign out of all devices where you have logged in, including this one. You will have to log in again." : locale === 'pt' ? "Saia de todos os dispositivos onde você fez login, incluindo este. Você terá que fazer login novamente." : "Cierra tu sesión en todos los dispositivos donde hayas iniciado sesión, incluyendo este. Tendrás que volver a iniciar sesión.",
        "button": locale === 'en' ? "Sign out of all devices" : locale === 'pt' ? "Sair de todos os dispositivos" : "Cerrar sesión en todos los dispositivos",
        "buttonMobile": locale === 'en' ? "Sign out of all" : locale === 'pt' ? "Sair de todos" : "Cerrar sesión en todos",
        "loading": locale === 'en' ? "Signing out..." : locale === 'pt' ? "Saindo..." : "Cerrando sesión...",
        "success": locale === 'en' ? "Signed out of all devices" : locale === 'pt' ? "Saiu de todos os dispositivos" : "Se ha cerrado sesión en todos los dispositivos",
        "error": locale === 'en' ? "Error signing out of all devices" : locale === 'pt' ? "Erro ao sair de todos os dispositivos" : "Error al cerrar sesión en todos los dispositivos"
    },
    "deleteAccount": {
        "title": locale === 'en' ? "Delete my account" : locale === 'pt' ? "Excluir minha conta" : "Eliminar mi cuenta",
        "description": locale === 'en' ? "This action will schedule your account for permanent deletion in 90 days. During this period you can cancel the deletion. You will lose:" : locale === 'pt' ? "Esta ação agendará sua conta para exclusão permanente em 90 dias. Durante este período, você pode cancelar a exclusão. Você perderá:" : "Esta acción programará tu cuenta para eliminación permanente en 90 días. Durante este período puedes cancelar la eliminación. Perderás:",
        "list": {
            "data": locale === 'en' ? "All your user data" : locale === 'pt' ? "Todos os seus dados de usuário" : "Todos tus datos de usuario",
            "history": locale === 'en' ? "Trade history" : locale === 'pt' ? "Histórico de trocas" : "Historial de intercambios",
            "listings": locale === 'en' ? "All your marketplace listings" : locale === 'pt' ? "Todos os seus anúncios no marketplace" : "Todos tus anuncios del marketplace",
            "collections": locale === 'en' ? "Your collections and templates" : locale === 'pt' ? "Suas coleções e modelos" : "Tus colecciones y plantillas",
            "messages": locale === 'en' ? "Messages and conversations" : locale === 'pt' ? "Mensagens e conversas" : "Mensajes y conversaciones",
            "reviews": locale === 'en' ? "Ratings and reviews" : locale === 'pt' ? "Avaliações e comentários" : "Valoraciones y comentarios"
        },
        "warning": locale === 'en' ? "This action is irreversible" : locale === 'pt' ? "Esta ação é irreversível" : "Esta acción es irreversible",
        "button": locale === 'en' ? "Delete my account" : locale === 'pt' ? "Excluir minha conta" : "Eliminar mi cuenta"
    }
  };

  // Add keys for legal tab
  content.settings.legal = {
      "terms": {
          "title": locale === 'en' ? "Terms of Service" : locale === 'pt' ? "Termos de Serviço" : "Términos de Servicio",
          "description": locale === 'en' ? "Community rules and terms of use" : locale === 'pt' ? "Regras da comunidade e termos de uso" : "Normas de la comunidad y condiciones de uso"
      },
      "privacy": {
          "title": locale === 'en' ? "Privacy Policy" : locale === 'pt' ? "Política de Privacidade" : "Política de Privacidad",
          "description": locale === 'en' ? "How we manage and protect your data" : locale === 'pt' ? "Como gerenciamos e protegemos seus dados" : "Cómo gestionamos y protegemos tus datos"
      },
      "cookies": {
          "title": locale === 'en' ? "Cookie Policy" : locale === 'pt' ? "Política de Cookies" : "Política de Cookies",
          "description": locale === 'en' ? "Use of cookies and similar technologies" : locale === 'pt' ? "Uso de cookies e tecnologias semelhantes" : "Uso de cookies y tecnologías similares"
      },
      "version": locale === 'en' ? "Version" : locale === 'pt' ? "Versão" : "Versión"
  };

  // Add keys for ignored users tab
  content.settings.ignored = {
      "empty": {
          "title": locale === 'en' ? "You have no blocked users" : locale === 'pt' ? "Você não tem usuários bloqueados" : "No tienes usuarios bloqueados",
          "description": locale === 'en' ? "When you block users, they will appear here so you can manage them." : locale === 'pt' ? "Quando você bloquear usuários, eles aparecerão aqui para que você possa gerenciá-los." : "Cuando bloquees a usuarios, aparecerán aquí para que puedas gestionarlos."
      },
      "retry": locale === 'en' ? "Retry" : locale === 'pt' ? "Tentar novamente" : "Reintentar",
      "unblock": {
          "button": locale === 'en' ? "Unblock" : locale === 'pt' ? "Desbloquear" : "Desbloquear",
          "loading": locale === 'en' ? "Removing..." : locale === 'pt' ? "Removendo..." : "Eliminando...",
          "success": locale === 'en' ? "{nickname} has been removed from your blocked list" : locale === 'pt' ? "{nickname} foi removido da sua lista de bloqueados" : "{nickname} ha sido eliminado de tu lista de bloqueados",
          "error": locale === 'en' ? "Error unblocking user" : locale === 'pt' ? "Erro ao desbloquear usuário" : "Error al desbloquear usuario"
      },
      "time": {
          "blocked": locale === 'en' ? "Blocked" : locale === 'pt' ? "Bloqueado" : "Bloqueado",
          "today": locale === 'en' ? "today" : locale === 'pt' ? "hoje" : "hoy",
          "yesterday": locale === 'en' ? "yesterday" : locale === 'pt' ? "ontem" : "ayer",
          "daysAgo": locale === 'en' ? "{count} days ago" : locale === 'pt' ? "há {count} dias" : "hace {count} días",
          "dayAgo": locale === 'en' ? "{count} day ago" : locale === 'pt' ? "há {count} dia" : "hace {count} día",
          "weeksAgo": locale === 'en' ? "{count} weeks ago" : locale === 'pt' ? "há {count} semanas" : "hace {count} semanas",
          "weekAgo": locale === 'en' ? "{count} week ago" : locale === 'pt' ? "há {count} semana" : "hace {count} semana",
          "monthsAgo": locale === 'en' ? "{count} months ago" : locale === 'pt' ? "há {count} meses" : "hace {count} meses",
          "monthAgo": locale === 'en' ? "{count} month ago" : locale === 'pt' ? "há {count} mês" : "hace {count} mes"
      }
  };

  // Add keys for notifications
  content.settings.notifications = {
      "matrix": {
          "restore": locale === 'en' ? "Restore defaults" : locale === 'pt' ? "Restaurar padrões" : "Restaurar valores por defecto",
          "cancel": locale === 'en' ? "Cancel" : locale === 'pt' ? "Cancelar" : "Cancelar",
          "save": locale === 'en' ? "Save changes" : locale === 'pt' ? "Salvar alterações" : "Guardar cambios",
          "saving": locale === 'en' ? "Saving..." : locale === 'pt' ? "Salvando..." : "Guardando...",
          "type": locale === 'en' ? "Notification Type" : locale === 'pt' ? "Tipo de Notificação" : "Tipo de Notificación",
          "uncheckAll": locale === 'en' ? "Uncheck all" : locale === 'pt' ? "Desmarcar todas" : "Desmarcar todas",
          "checkAll": locale === 'en' ? "Check all" : locale === 'pt' ? "Marcar todas" : "Marcar todas",
          "notAvailable": locale === 'en' ? "Not available" : locale === 'pt' ? "Não disponível" : "No disponible",
          "aria": {
              "disable": locale === 'en' ? "Disable" : locale === 'pt' ? "Desativar" : "Desactivar",
              "enable": locale === 'en' ? "Enable" : locale === 'pt' ? "Ativar" : "Activar",
              "for": locale === 'en' ? "for" : locale === 'pt' ? "para" : "para"
          }
      },
      "messages": {
          "errorLoad": locale === 'en' ? "Error loading preferences" : locale === 'pt' ? "Erro ao carregar preferências" : "Error al cargar las preferencias",
          "success": locale === 'en' ? "Preferences updated successfully" : locale === 'pt' ? "Preferências atualizadas com sucesso" : "Preferencias actualizadas correctamente",
          "errorSave": locale === 'en' ? "Error saving preferences" : locale === 'pt' ? "Erro ao salvar preferências" : "Error al guardar las preferencias"
      },
      "channels": {
          "in_app": locale === 'en' ? "In App" : locale === 'pt' ? "No App" : "En la App",
          "push": locale === 'en' ? "Push" : locale === 'pt' ? "Push" : "Push",
          "email": locale === 'en' ? "Email" : locale === 'pt' ? "Email" : "Email"
      },
      "categories": {
          "marketplace": {
              "label": locale === 'en' ? "Marketplace" : locale === 'pt' ? "Marketplace" : "Marketplace",
              "description": locale === 'en' ? "Notifications about listings and transactions" : locale === 'pt' ? "Notificações sobre anúncios e transações" : "Notificaciones sobre listados y transacciones"
          },
          "community": {
              "label": locale === 'en' ? "Community" : locale === 'pt' ? "Comunidade" : "Comunidad",
              "description": locale === 'en' ? "Ratings, achievements, and collections" : locale === 'pt' ? "Avaliações, conquistas e coleções" : "Valoraciones, logros y colecciones"
          },
          "system": {
              "label": locale === 'en' ? "System" : locale === 'pt' ? "Sistema" : "Sistema",
              "description": locale === 'en' ? "System messages and levels" : locale === 'pt' ? "Mensagens do sistema e níveis" : "Mensajes del sistema y niveles"
          }
      },
      "types": {
          "listing_chat": {
              "label": locale === 'en' ? "Chat messages" : locale === 'pt' ? "Mensagens de chat" : "Mensajes de chat",
              "description": locale === 'en' ? "New messages about your listings" : locale === 'pt' ? "Novas mensagens sobre seus anúncios" : "Nuevos mensajes sobre tus listados"
          },
          "listing_reserved": {
              "label": locale === 'en' ? "Item reserved" : locale === 'pt' ? "Item reservado" : "Artículo reservado",
              "description": locale === 'en' ? "When someone reserves your listing" : locale === 'pt' ? "Quando alguém reserva seu anúncio" : "Cuando alguien reserva tu listado"
          },
          "listing_completed": {
              "label": locale === 'en' ? "Transaction completed" : locale === 'pt' ? "Transação concluída" : "Transacción completada",
              "description": locale === 'en' ? "When a transaction is completed" : locale === 'pt' ? "Quando uma transação é concluída" : "Cuando una transacción se completa"
          },
          "chat_unread": {
              "label": locale === 'en' ? "Weekly unread messages digest" : locale === 'pt' ? "Resumo semanal de mensagens não lidas" : "Resumen semanal de mensagens sin leer",
              "description": locale === 'en' ? "Weekly reminder if you have unread messages" : locale === 'pt' ? "Lembrete semanal se você tiver mensagens não lidas" : "Recordatorio semanal si tienes mensajes sin leer"
          },
          "user_rated": {
              "label": locale === 'en' ? "You have been rated" : locale === 'pt' ? "Você foi avaliado" : "Te han valorado",
              "description": locale === 'en' ? "When another user rates you" : locale === 'pt' ? "Quando outro usuário avalia você" : "Cuando otro usuario te valora"
          },
          "badge_earned": {
              "label": locale === 'en' ? "Achievement earned" : locale === 'pt' ? "Conquista obtida" : "Logro ganado",
              "description": locale === 'en' ? "When you get a new achievement" : locale === 'pt' ? "Quando você ganha uma nova conquista" : "Cuando obtienes un nuevo logro"
          },
          "template_rated": {
              "label": locale === 'en' ? "Collection rating" : locale === 'pt' ? "Avaliação da coleção" : "Valoración de colección",
              "description": locale === 'en' ? "When someone rates your collection" : locale === 'pt' ? "Quando alguém avalia sua coleção" : "Cuando alguien valora tu colección"
          },
          "system_message": {
              "label": locale === 'en' ? "System message" : locale === 'pt' ? "Mensagem do sistema" : "Mensaje del sistema",
              "description": locale === 'en' ? "Important system messages" : locale === 'pt' ? "Mensagens importantes do sistema" : "Mensajes importantes del sistema"
          },
          "level_up": {
              "label": locale === 'en' ? "Level up" : locale === 'pt' ? "Subida de nível" : "Subida de nivel",
              "description": locale === 'en' ? "When you level up" : locale === 'pt' ? "Quando você sobe de nível" : "Cuando subes de nivel"
          }
      }
  };
  
  // Theme section keys
  content.settings.theme = {
      "title": locale === 'en' ? "Appearance" : locale === 'pt' ? "Aparência" : "Apariencia",
      "description": locale === 'en' ? "Customize how the app looks" : locale === 'pt' ? "Personalize a aparência do aplicativo" : "Personaliza cómo se ve la aplicación",
      "light": locale === 'en' ? "Light" : locale === 'pt' ? "Claro" : "Claro",
      "dark": locale === 'en' ? "Dark" : locale === 'pt' ? "Escuro" : "Escuro",
      "system": locale === 'en' ? "System" : locale === 'pt' ? "Sistema" : "Sistema"
  };

  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
});
console.log('Dictionaries updated');

// 2. Patch Components
function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (const [search, replace] of replacements) {
        content = content.replace(search, replace);
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    } else {
        console.log(`No changes made to ${filePath}`);
    }
}

// 2.1 SystemSettingsTab.tsx
replaceInFile(path.join(__dirname, 'src/components/settings/SystemSettingsTab.tsx'), [
    [ /import \{ ThemeSettingsSection \} from '\.\/ThemeSettingsSection';/, `import { ThemeSettingsSection } from './ThemeSettingsSection';\nimport { useTranslations } from 'next-intl';` ],
    [ /export function SystemSettingsTab\(\) \{/, `export function SystemSettingsTab() {\n  const t = useTranslations('settings');` ],
    [ /'Consejos reactivados correctamente'/g, `t('system.reactivateTips.success')` ],
    [ /'Error al reactivar los consejos'/g, `t('system.reactivateTips.error')` ],
    [ /'Se ha cerrado sesión en todos los dispositivos'/g, `t('system.signOutAll.success')` ],
    [ /'Error al cerrar sesión en todos los dispositivos'/g, `t('system.signOutAll.error')` ],
    [ /Consejos de ayuda/g, `{t('system.reactivateTips.title')}` ],
    [ /Muestra consejos contextuales en las distintas secciones de la app para ayudarte a usar todas las funciones\./g, `{t('system.reactivateTips.description')}` ],
    [ />\s*Reactivar consejos\s*<\/Button>/g, `>{t('system.reactivateTips.button')}</Button>` ],
    [ /Cerrar sesión en todos los dispositivos/g, `{t('system.signOutAll.title')}` ],
    [ /Cierra tu sesión en todos los dispositivos donde hayas iniciado\s*sesión, incluyendo este\. Tendrás que volver a iniciar sesión\./g, `{t('system.signOutAll.description')}` ],
    [ />\s*Cerrando sesión\.\.\.\s*<\//g, `>{t('system.signOutAll.loading')}</` ],
    [ />Cerrar sesión en todos</g, `>{t('system.signOutAll.buttonMobile')}<` ],
    [ />Cerrar sesión en todos los dispositivos</g, `>{t('system.signOutAll.button')}<` ],
    [ /Eliminar mi cuenta/g, `{t('system.deleteAccount.title')}` ],
    [ /Esta acción programará tu cuenta para eliminación permanente en 90 días\.\s*Durante este período puedes cancelar la eliminación\. Perderás:/g, `{t('system.deleteAccount.description')}` ],
    [ />Todos tus datos de usuario</g, `>{t('system.deleteAccount.list.data')}<` ],
    [ />Historial de intercambios</g, `>{t('system.deleteAccount.list.history')}<` ],
    [ />Todos tus anuncios del marketplace</g, `>{t('system.deleteAccount.list.listings')}<` ],
    [ />Tus colecciones y plantillas</g, `>{t('system.deleteAccount.list.collections')}<` ],
    [ />Mensajes y conversaciones</g, `>{t('system.deleteAccount.list.messages')}<` ],
    [ />Valoraciones y comentarios</g, `>{t('system.deleteAccount.list.reviews')}<` ],
    [ />\s*Esta acción es irreversible\s*<\/p>/g, `>{t('system.deleteAccount.warning')}</p>` ],
    [ />\s*Eliminar mi cuenta\s*<\/Button>/g, `>{t('system.deleteAccount.button')}</Button>` ]
]);

// 2.2 LegalSettingsTab.tsx
replaceInFile(path.join(__dirname, 'src/components/settings/LegalSettingsTab.tsx'), [
    [ /import \{ Shield, FileText, Cookie, ChevronRight, ExternalLink \} from 'lucide-react';/, `import { Shield, FileText, Cookie, ChevronRight, ExternalLink } from 'lucide-react';\nimport { useTranslations } from 'next-intl';` ],
    [ /export function LegalSettingsTab\(\) \{/, `export function LegalSettingsTab() {\n    const t = useTranslations('settings');` ],
    [ />Términos de Servicio</g, `>{t('legal.terms.title')}<` ],
    [ />\s*Normas de la comunidad y condiciones de uso\s*<\/p>/g, `>{t('legal.terms.description')}</p>` ],
    [ />Política de Privacidad</g, `>{t('legal.privacy.title')}<` ],
    [ />\s*Cómo gestionamos y protegemos tus datos\s*<\/p>/g, `>{t('legal.privacy.description')}</p>` ],
    [ />Política de Cookies</g, `>{t('legal.cookies.title')}<` ],
    [ />\s*Uso de cookies y tecnologías similares\s*<\/p>/g, `>{t('legal.cookies.description')}</p>` ],
    [ /Versión/g, `{t('legal.version')} ` ]
]);

// 2.3 IgnoredUsersTab.tsx
replaceInFile(path.join(__dirname, 'src/components/settings/IgnoredUsersTab.tsx'), [
    [ /import \{ ModernCard, ModernCardContent \} from '@\/components\/ui\/modern-card';/, `import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';\nimport { useTranslations } from 'next-intl';` ],
    [ /export function IgnoredUsersTab\(\) \{/, `export function IgnoredUsersTab() {\n  const t = useTranslations('settings');` ],
    [ /\`\$\{nickname\} ha sido eliminado de tu lista de bloqueados\`/g, `t('ignored.unblock.success', { nickname })` ],
    [ /'Error al desbloquear usuario'/g, `t('ignored.unblock.error')` ],
    [ /if \(diffDays === 0\) return 'hoy';\n    if \(diffDays === 1\) return 'ayer';\n    if \(diffDays < 7\)\n      return \`hace \$\{diffDays\} \$\{diffDays === 1 \? 'día' : 'días'\}\`;\n    if \(diffDays < 30\) \{\n      const weeks = Math\.floor\(diffDays \/ 7\);\n      return \`hace \$\{weeks\} \$\{weeks === 1 \? 'semana' : 'semanas'\}\`;\n    \}\n    const months = Math\.floor\(diffDays \/ 30\);\n    return \`hace \$\{months\} \$\{months === 1 \? 'mes' : 'meses'\}\`;/, `if (diffDays === 0) return t('ignored.time.today');
    if (diffDays === 1) return t('ignored.time.yesterday');
    if (diffDays < 7) return diffDays === 1 ? t('ignored.time.dayAgo', { count: diffDays }) : t('ignored.time.daysAgo', { count: diffDays });
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? t('ignored.time.weekAgo', { count: weeks }) : t('ignored.time.weeksAgo', { count: weeks });
    }
    const months = Math.floor(diffDays / 30);
    return months === 1 ? t('ignored.time.monthAgo', { count: months }) : t('ignored.time.monthsAgo', { count: months });` ],
    [ />\s*Reintentar\s*<\/Button>/g, `>{t('ignored.retry')}</Button>` ],
    [ />\s*No tienes usuarios bloqueados\s*<\/h2>/g, `>{t('ignored.empty.title')}</h2>` ],
    [ />\s*Cuando bloquees a usuarios, aparecerán aquí para que puedas\s*gestionarlos\.\s*<\/p>/g, `>{t('ignored.empty.description')}</p>` ],
    [ /Bloqueado \{formatDate\(ignoredUser\.created_at\)\}/g, `{t('ignored.time.blocked')} {formatDate(ignoredUser.created_at)}` ],
    [ />\s*Eliminando\.\.\.\s*<\//g, `>{t('ignored.unblock.loading')}</` ],
    [ /'Desbloquear'/g, `t('ignored.unblock.button')` ]
]);

// 2.4 NotificationSettingsTab.tsx
replaceInFile(path.join(__dirname, 'src/components/settings/NotificationSettingsTab.tsx'), [
    [ /import \{ AlertCircle, Loader2 \} from 'lucide-react';/, `import { AlertCircle, Loader2 } from 'lucide-react';\nimport { useTranslations } from 'next-intl';` ],
    [ /export function NotificationSettingsTab\(\) \{/, `export function NotificationSettingsTab() {\n  const t = useTranslations('settings');` ],
    [ /'Error al cargar las preferencias'/g, `t('notifications.messages.errorLoad')` ],
    [ /'Preferencias actualizadas correctamente'/g, `t('notifications.messages.success')` ],
    [ /'Error al guardar las preferencias'/g, `t('notifications.messages.errorSave')` ]
]);

// 2.5 NotificationPreferencesMatrix.tsx
replaceInFile(path.join(__dirname, 'src/components/settings/NotificationPreferencesMatrix.tsx'), [
    [ /import \{ toggleNotificationPreference \} from '@\/lib\/supabase\/notification-preferences';/, `import { toggleNotificationPreference } from '@/lib/supabase/notification-preferences';\nimport { useTranslations } from 'next-intl';` ],
    [ /export function NotificationPreferencesMatrix\(\{\n  preferences,\n  onSave,\n  saving,\n\}: NotificationPreferencesMatrixProps\) \{/, `export function NotificationPreferencesMatrix({\n  preferences,\n  onSave,\n  saving,\n}: NotificationPreferencesMatrixProps) {\n  const t = useTranslations('settings');` ],
    [ /const CHANNELS: \{ id: NotificationChannel; label: string; icon: typeof Bell; color: string \}\[\] = \[\n  \{ id: 'in_app', label: 'En la App', icon: Bell, color: 'blue' \},\n  \{ id: 'push', label: 'Push', icon: Smartphone, color: 'purple' \},\n  \{ id: 'email', label: 'Email', icon: Mail, color: 'orange' \},\n\];/, `const getChannels = (t: any): { id: NotificationChannel; label: string; icon: typeof Bell; color: string }[] => [\n  { id: 'in_app', label: t('notifications.channels.in_app'), icon: Bell, color: 'blue' },\n  { id: 'push', label: t('notifications.channels.push'), icon: Smartphone, color: 'purple' },\n  { id: 'email', label: t('notifications.channels.email'), icon: Mail, color: 'orange' },\n];` ],
    [ /\{CHANNELS\.map\(/g, `{getChannels(t).map(` ],
    [ /CHANNELS\.map\(/g, `getChannels(t).map(` ],
    [ />\s*Restaurar valores por defecto\s*<\/button>/g, `>{t('notifications.matrix.restore')}</button>` ],
    [ />\s*Cancelar\s*<\/button>/g, `>{t('notifications.matrix.cancel')}</button>` ],
    [ />\s*Guardando\.\.\.\s*<\//g, `>{t('notifications.matrix.saving')}</` ],
    [ />\s*Guardar cambios\s*<\/button>/g, `>{t('notifications.matrix.save')}</button>` ],
    [ />\s*Tipo de Notificación\s*<\/th>/g, `>{t('notifications.matrix.type')}</th>` ],
    [ />\s*Desmarcar todas\s*<\//g, `>{t('notifications.matrix.uncheckAll')}</` ],
    [ />\s*Marcar todas\s*<\//g, `>{t('notifications.matrix.checkAll')}</` ],
    [ /\{CATEGORY_INFO\[category\]\.label\}/g, `{t(\`notifications.categories.\${category}.label\`)}` ],
    [ /\{config\.label\}/g, `{t(\`notifications.types.\${config.kind}.label\`)}` ],
    [ /\{config\.description\}/g, `{t(\`notifications.types.\${config.kind}.description\`)}` ],
    [ /\`\$\{[\s\S]*?localPreferences\[channel\]\[config\.kind\] \? 'Desactivar' : 'Activar'[\s\S]*?\} \$\{config\.label\} para \$\{channel\}\`/g, `\`\${localPreferences[channel][config.kind] ? t('notifications.matrix.aria.disable') : t('notifications.matrix.aria.enable')} \${t(\`notifications.types.\${config.kind}.label\`)} \${t('notifications.matrix.aria.for')} \${channel}\`` ],
    [ />No disponible<\/span>/g, `>{t('notifications.matrix.notAvailable')}</span>` ]
]);

// 2.6 ThemeSettingsSection.tsx
replaceInFile(path.join(__dirname, 'src/components/settings/ThemeSettingsSection.tsx'), [
    [ /import \{ Monitor, Moon, Sun \} from 'lucide-react';/, `import { Monitor, Moon, Sun } from 'lucide-react';\nimport { useTranslations } from 'next-intl';` ],
    [ /export function ThemeSettingsSection\(\) \{/, `export function ThemeSettingsSection() {\n  const t = useTranslations('settings');` ],
    [ />\s*Apariencia\s*<\/h3>/g, `>{t('theme.title')}</h3>` ],
    [ />\s*Personaliza cómo se ve la aplicación\.\s*<\/p>/g, `>{t('theme.description')}</p>` ],
    [ />Claro<\/span>/g, `>{t('theme.light')}</span>` ],
    [ />Oscuro<\/span>/g, `>{t('theme.dark')}</span>` ],
    [ />Sistema<\/span>/g, `>{t('theme.system')}</span>` ]
]);

console.log('Done!');
