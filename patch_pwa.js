
const fs = require('fs');
const path = require('path');

const files = ['en', 'es', 'pt'].map(lang => path.join('src', 'i18n', 'messages', lang + '.json'));

files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  
  if (!data.settings) data.settings = {};
  if (!data.settings.tabs) data.settings.tabs = {};
  
  if (file.includes('en.json')) {
    data.settings.pageTitle = 'Settings';
    data.settings.pageDescription = 'Configure your preferences and manage your account';
    data.settings.tabs.notifications = 'Notifications';
    data.settings.tabs.blocked = 'Blocked';
    data.settings.tabs.system = 'System';
    data.settings.tabs.legal = 'Legal';
  } else if (file.includes('pt.json')) {
    data.settings.pageTitle = 'Configurações';
    data.settings.pageDescription = 'Configure suas preferências e gerencie sua conta';
    data.settings.tabs.notifications = 'Notificações';
    data.settings.tabs.blocked = 'Bloqueados';
    data.settings.tabs.system = 'Sistema';
    data.settings.tabs.legal = 'Legal';
  } else if (file.includes('es.json')) {
    data.settings.pageTitle = 'Ajustes';
    data.settings.pageDescription = 'Configura tus preferencias y gestiona tu cuenta';
    data.settings.tabs.notifications = 'Notificaciones';
    data.settings.tabs.blocked = 'Bloqueados';
    data.settings.tabs.system = 'Sistema';
    data.settings.tabs.legal = 'Legal';
  }

  if (!data.notifications) data.notifications = {};
  
  if (file.includes('en.json')) {
    data.notifications.title = 'Notifications';
    data.notifications.new_one = 'new';
    data.notifications.new_other = 'new';
    data.notifications.loading = 'Loading...';
    data.notifications.empty = 'You have no new notifications';
    data.notifications.viewAll = 'View all notifications';
    data.notifications.andMore = 'and {count} more...';
    
    if (!data.pwa) data.pwa = {};
    data.pwa.installPrompt = '?? For a better experience, install the CambioCromos app!';
    data.pwa.installApp = 'Install App';
    data.pwa.googlePlay = 'Google Play';
    data.pwa.iosInstructions = 'Tap the Share button <icon/> and select \u0022Add to Home Screen\u0022';
    
    data.pwa.notifyPrompt = 'Turn on notifications so you don\'t miss messages or trade offers.';
    data.pwa.activate = 'Turn on';
    data.pwa.close = 'Close';
    
    data.pwa.onesignalMessage = 'Subscribe to our notifications to get messages and trade offers. You can disable anytime.';
    data.pwa.onesignalAccept = 'Subscribe';
    data.pwa.onesignalCancel = 'Later';
    
  } else if (file.includes('pt.json')) {
    data.notifications.title = 'Notificações';
    data.notifications.new_one = 'nova';
    data.notifications.new_other = 'novas';
    data.notifications.loading = 'Carregando...';
    data.notifications.empty = 'Você não tem novas notificações';
    data.notifications.viewAll = 'Ver todas as notificações';
    data.notifications.andMore = 'e {count} mais...';
    
    if (!data.pwa) data.pwa = {};
    data.pwa.installPrompt = '?? Para uma melhor experiência, instale o app CambioCromos!';
    data.pwa.installApp = 'Instalar App';
    data.pwa.googlePlay = 'Google Play';
    data.pwa.iosInstructions = 'Toque no botão Compartilhar <icon/> e selecione \u0022Adicionar à Tela de Início\u0022';
    
    data.pwa.notifyPrompt = 'Ative as notificações para não perder mensagens ou ofertas de troca.';
    data.pwa.activate = 'Ativar';
    data.pwa.close = 'Fechar';
    
    data.pwa.onesignalMessage = 'Inscreva-se nas nossas notificações para receber mensagens e ofertas de troca. Você pode desativar a qualquer momento.';
    data.pwa.onesignalAccept = 'Inscrever-se';
    data.pwa.onesignalCancel = 'Depois';
    
  } else if (file.includes('es.json')) {
    data.notifications.title = 'Notificaciones';
    data.notifications.new_one = 'nueva';
    data.notifications.new_other = 'nuevas';
    data.notifications.loading = 'Cargando...';
    data.notifications.empty = 'No tienes notificaciones nuevas';
    data.notifications.viewAll = 'Ver todas las notificaciones';
    data.notifications.andMore = 'y {count} más...';
    
    if (!data.pwa) data.pwa = {};
    data.pwa.installPrompt = '?? ¡Para una mejor experiencia, instala la app CambioCromos!';
    data.pwa.installApp = 'Instalar App';
    data.pwa.googlePlay = 'Google Play';
    data.pwa.iosInstructions = 'Pulsa el botón Compartir <icon/> y selecciona \u0022Añadir a pantalla de inicio\u0022';
    
    data.pwa.notifyPrompt = 'Activa las notificaciones para no perderte mensajes ni ofertas de intercambio.';
    data.pwa.activate = 'Activar';
    data.pwa.close = 'Cerrar aviso de notificaciones';
    
    data.pwa.onesignalMessage = 'Suscríbete a nuestras notificaciones para no perderte mensajes ni ofertas de intercambio. Puedes desactivarlo en cualquier momento.';
    data.pwa.onesignalAccept = 'Suscribirme';
    data.pwa.onesignalCancel = 'Más tarde';
  }
  
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  console.log('Patched ' + file);
});

