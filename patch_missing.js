const fs = require('fs');

function patch(file, lang) {
  const data = JSON.parse(fs.readFileSync(file));
  
  if (lang === 'es') {
    data.notifications = {
      ...data.notifications,
      new_one: 'nueva',
      new_other: 'nuevas',
      andMore: 'y {count} más...'
    };
    
    data.legal = data.legal || {};
    data.legal.cookiesBanner = {
      title: 'Control de Cookies',
      description: 'Utilizamos cookies para analizar el tráfico y mejorar tu experiencia. Al aceptar, nos ayudas a optimizar la plataforma. Consulta nuestra <policy>Política de Cookies</policy> para más detalles.',
      acceptAll: 'Aceptar todas',
      essentialOnly: 'Solo esenciales',
      customize: 'Personalizar preferencias'
    };
    
    data.pwa = {
      installPrompt: '✨ Para una mejor experiencia, ¡instala la app de CambioCromos!',
      installApp: 'Instalar App',
      googlePlay: 'Google Play',
      iosInstructions: 'Toca el botón de Compartir <icon/> y selecciona "Añadir a la pantalla de inicio"',
      notifyPrompt: "Activa las notificaciones para no perderte mensajes ni ofertas de cambio.",
      activate: 'Activar',
      close: 'Cerrar',
      onesignalMessage: 'Suscríbete a nuestras notificaciones para recibir mensajes y ofertas de cambio. Puedes desactivarlas en cualquier momento.',
      onesignalAccept: 'Suscribirse',
      onesignalCancel: 'Más tarde'
    };
  } else if (lang === 'pt') {
    data.notifications = {
      ...data.notifications,
      new_one: 'nova',
      new_other: 'novas',
      andMore: 'e mais {count}...'
    };
    
    data.legal = data.legal || {};
    data.legal.cookiesBanner = {
      title: 'Controle de Cookies',
      description: 'Usamos cookies para analisar o tráfego e melhorar sua experiência. Ao aceitar, você nos ajuda a otimizar a plataforma. Consulte nossa <policy>Política de Cookies</policy> para obter mais detalhes.',
      acceptAll: 'Aceitar todos',
      essentialOnly: 'Apenas essenciais',
      customize: 'Personalizar preferências'
    };
    
    data.pwa = {
      installPrompt: '✨ Para uma melhor experiência, instale o aplicativo CambioCromos!',
      installApp: 'Instalar App',
      googlePlay: 'Google Play',
      iosInstructions: 'Toque no botão Compartilhar <icon/> e selecione "Adicionar à Tela de Início"',
      notifyPrompt: "Ative as notificações para não perder mensagens ou ofertas de troca.",
      activate: 'Ativar',
      close: 'Fechar',
      onesignalMessage: 'Assine nossas notificações para receber mensagens e ofertas de troca. Você pode desativá-las a qualquer momento.',
      onesignalAccept: 'Assinar',
      onesignalCancel: 'Mais tarde'
    };
  }
  
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

patch('src/i18n/messages/es.json', 'es');
patch('src/i18n/messages/pt.json', 'pt');
