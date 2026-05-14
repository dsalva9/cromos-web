const fs = require('fs');
const path = require('path');

function fixEncoding(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Portuguese replacements
  content = content.replace(/Notifica\uFFFD\uFFFDes/g, 'Notificações');
  content = content.replace(/Voc\uFFFD n\uFFFDo tem novas notifica\uFFFD\uFFFDes/g, 'Você não tem novas notificações');
  content = content.replace(/Ver todas as notifica\uFFFD\uFFFDes/g, 'Ver todas as notificações');
  
  // Let's also check for any other corrupted Portuguese characters:
  // "Configuraes" -> Configurações
  content = content.replace(/Configura\uFFFD\uFFFDes/g, 'Configurações');
  content = content.replace(/Usu\uFFFDrios Bloqueados/g, 'Usuários Bloqueados');
  content = content.replace(/Prefer\uFFFDncias de Notifica\uFFFD\uFFFDo/g, 'Preferências de Notificação');
  content = content.replace(/notifica\uFFFD\uFFFDes/g, 'notificações');
  content = content.replace(/Alerta-o quando recebe uma nova mensagem no chat/g, 'Alerta-o quando recebe uma nova mensagem no chat');
  content = content.replace(/Alerta-o quando o seu c\uFFFDdigo \uFFFD usado/g, 'Alerta-o quando o seu código é usado');
  content = content.replace(/Alerta-o sobre novos itens correspondentes \uFFFDs suas buscas/g, 'Alerta-o sobre novos itens correspondentes às suas buscas');
  content = content.replace(/Alerta-o quando o pre\uFFFDo de um cromo cai/g, 'Alerta-o quando o preço de um cromo cai');
  content = content.replace(/Alerta-o sobre cr\uFFFDeachites, etc./g, 'Alerta-o sobre créditos, etc.'); // if present
  content = content.replace(/Sess\uFFFD\uFFFDo/g, 'Sessão');
  content = content.replace(/Informa\uFFFD\uFFFDes/g, 'Informações');
  content = content.replace(/Voc\uFFFD n\uFFFDo tem usu\uFFFDrios/g, 'Você não tem usuários');
  content = content.replace(/Reativar todas as dicas ocultas e mensagens de integra\uFFFD\uFFFDo/g, 'Reativar todas as dicas ocultas e mensagens de integração');
  content = content.replace(/Sair de Todos os Dispositivos/g, 'Sair de Todos os Dispositivos'); // fine
  content = content.replace(/Sair de todas as sess\uFFFD\uFFFDes ativas/g, 'Sair de todas as sessões ativas');
  content = content.replace(/A\uFFFD\uFFFDo irrevers\uFFFDvel/g, 'Ação irreversível');
  content = content.replace(/Todos os dados do seu perfil/g, 'Todos os dados do seu perfil');
  content = content.replace(/Hist\uFFFDrico de transa\uFFFD\uFFFDes/g, 'Histórico de transações');
  content = content.replace(/An\uFFFDncios no marketplace/g, 'Anúncios no marketplace');
  content = content.replace(/Cole\uFFFD\uFFFDes/g, 'Coleções');
  content = content.replace(/Avalia\uFFFD\uFFFDes/g, 'Avaliações');
  content = content.replace(/Aten\uFFFD\uFFFDo/g, 'Atenção');
  content = content.replace(/exclus\uFFFD\uFFFDo/g, 'exclusão');
  content = content.replace(/ser\uFFFD/g, 'será');
  content = content.replace(/Tr\uFFFDfego/g, 'Tráfego');
  content = content.replace(/Pol\uFFFDtica/g, 'Política');
  content = content.replace(/essenciais/g, 'essenciais');
  content = content.replace(/Prefer\uFFFDncias/g, 'Preferências');
  content = content.replace(/Voc\uFFFD/g, 'Você');
  content = content.replace(/n\uFFFDo/g, 'não');

  // Let's rewrite the pwa/notifications/settings sections with clean JSON just to be perfectly sure.
  const data = JSON.parse(content);
  
  // Re-inject pwa block for pt
  if (filePath.includes('pt.json')) {
    data.pwa = {
      installPrompt: "📲 Para uma melhor experiência, instale o app CambioCromos!",
      googlePlay: "Google Play",
      installApp: "Instalar App",
      iosInstructions: "Toque no botão Compartilhar <icon/> e selecione \"Adicionar à Tela de Início\"",
      notifyPrompt: "Ative as notificações para não perder mensagens nem ofertas de troca.",
      activate: "Ativar",
      close: "Fechar aviso de notificações",
      onesignalMessage: "Inscreva-se nas nossas notificações para as últimas notícias e atualizações!",
      onesignalAccept: "Permitir",
      onesignalCancel: "Agora não"
    };
    data.notifications = {
      title: "Notificações",
      empty: "Você não tem novas notificações",
      viewAll: "Ver todas as notificações",
      loading: "Carregando..."
    };
    data.settings = {
      pageTitle: "Configurações",
      pageDescription: "Gerencie suas preferências de conta e configurações do sistema.",
      tabs: {
        notifications: "Notificações",
        blocked: "Bloqueados",
        system: "Sistema",
        legal: "Legal"
      },
      notifications: {
        title: "Preferências de Notificação",
        description: "Escolha como você deseja ser notificado sobre a atividade na plataforma.",
        types: {
          push: "Push",
          email: "E-mail",
          in_app: "App"
        },
        items: {
          chat_message: {
            title: "Mensagens de Chat",
            description: "Alerta-o quando recebe uma nova mensagem no chat."
          },
          referral_used: {
            title: "Código de Indicação",
            description: "Alerta-o quando o seu código é usado."
          },
          marketplace_match: {
            title: "Correspondência no Marketplace",
            description: "Alerta-o sobre novos itens correspondentes às suas buscas."
          },
          price_drop: {
            title: "Queda de Preço",
            description: "Alerta-o quando o preço de um cromo cai."
          },
          weekly_digest: {
            title: "Resumo Semanal",
            description: "Receba um resumo de sua atividade semanal."
          },
          achievement_earned: {
            title: "Conquistas",
            description: "Alerta-o quando você ganha uma nova conquista."
          }
        }
      },
      system: {
        reactivateTips: {
          title: "Reativar Dicas",
          description: "Reativar todas as dicas ocultas e mensagens de integração.",
          button: "Reativar Dicas",
          success: "Dicas reativadas com sucesso",
          error: "Erro ao reativar dicas"
        },
        signOutAll: {
          title: "Sair de Todos os Dispositivos",
          description: "Sair de todas as sessões ativas, exceto a atual.",
          buttonMobile: "Sair de Todos",
          loading: "Saindo...",
          success: "Saiu de todos os dispositivos com sucesso",
          error: "Erro ao sair de todos os dispositivos"
        },
        deleteAccount: {
          title: "Excluir Conta",
          description: "Ação irreversível. Isso excluirá permanentemente sua conta e todos os dados associados.",
          warning: "Atenção: A exclusão da conta será final e não poderá ser desfeita.",
          list: {
            data: "Todos os dados do seu perfil",
            history: "Histórico de transações",
            listings: "Anúncios no marketplace",
            collections: "Coleções",
            messages: "Mensagens",
            reviews: "Avaliações"
          }
        }
      },
      legal: {
        version: "Versão",
        terms: {
          title: "Termos de Uso",
          description: "Leia nossos termos de uso."
        },
        privacy: {
          title: "Política de Privacidade",
          description: "Leia nossa política de privacidade."
        },
        cookies: {
          title: "Política de Cookies",
          description: "Leia nossa política de cookies."
        }
      }
    };
    data.legal = data.legal || {};
    data.legal.cookiesBanner = {
      title: "Controle de Cookies",
      description: "Usamos cookies para analisar o tráfego e melhorar sua experiência. Ao aceitar, você nos ajuda a otimizar a plataforma. Consulte nossa <policy>Política de Cookies</policy> para mais detalhes.",
      acceptAll: "Aceitar todos",
      essentialOnly: "Apenas essenciais",
      customize: "Personalizar preferências"
    };
  }

  if (filePath.includes('es.json')) {
    data.pwa = {
      installPrompt: "📲 ¡Para una mejor experiencia, instala la app CambioCromos!",
      googlePlay: "Google Play",
      installApp: "Instalar App",
      iosInstructions: "Pulsa el botón Compartir <icon/> y selecciona \"Añadir a pantalla de inicio\"",
      notifyPrompt: "Activa las notificaciones para no perderte mensajes ni ofertas de intercambio.",
      activate: "Activar",
      close: "Cerrar aviso de notificaciones",
      onesignalMessage: "¡Suscríbete a nuestras notificaciones para recibir las últimas noticias y actualizaciones!",
      onesignalAccept: "Permitir",
      onesignalCancel: "Ahora no"
    };
    data.notifications = {
      title: "Notificaciones",
      empty: "No tienes notificaciones nuevas",
      viewAll: "Ver todas las notificaciones",
      loading: "Cargando..."
    };
    data.settings = {
      pageTitle: "Ajustes",
      pageDescription: "Gestiona las preferencias de tu cuenta y la configuración del sistema.",
      tabs: {
        notifications: "Notificaciones",
        blocked: "Bloqueados",
        system: "Sistema",
        legal: "Legal"
      },
      notifications: {
        title: "Preferencias de Notificación",
        description: "Elige cómo quieres que te notifiquemos sobre la actividad en la plataforma.",
        types: {
          push: "Push",
          email: "Email",
          in_app: "App"
        },
        items: {
          chat_message: {
            title: "Mensajes de Chat",
            description: "Te avisa cuando recibes un nuevo mensaje en el chat."
          },
          referral_used: {
            title: "Código de Referido",
            description: "Te avisa cuando se utiliza tu código de referido."
          },
          marketplace_match: {
            title: "Coincidencia en Marketplace",
            description: "Te avisa de nuevos artículos que coinciden con tus búsquedas."
          },
          price_drop: {
            title: "Bajada de Precio",
            description: "Te avisa cuando baja el precio de un cromo."
          },
          weekly_digest: {
            title: "Resumen Semanal",
            description: "Recibe un resumen de tu actividad semanal."
          },
          achievement_earned: {
            title: "Logros",
            description: "Te avisa cuando desbloqueas un nuevo logro."
          }
        }
      },
      system: {
        reactivateTips: {
          title: "Reactivar Consejos",
          description: "Vuelve a activar todos los consejos ocultos y mensajes de ayuda.",
          button: "Reactivar Consejos",
          success: "Consejos reactivados correctamente",
          error: "Error al reactivar consejos"
        },
        signOutAll: {
          title: "Cerrar Sesión en Todos los Dispositivos",
          description: "Cierra todas las sesiones activas excepto la actual.",
          buttonMobile: "Cerrar en Todos",
          loading: "Cerrando...",
          success: "Sesión cerrada en todos los dispositivos",
          error: "Error al cerrar sesión en todos los dispositivos"
        },
        deleteAccount: {
          title: "Eliminar Cuenta",
          description: "Acción irreversible. Esto eliminará permanentemente tu cuenta y todos los datos asociados.",
          warning: "Atención: La eliminación de la cuenta es definitiva y no se puede deshacer.",
          list: {
            data: "Todos los datos de tu perfil",
            history: "Historial de transacciones",
            listings: "Anuncios del marketplace",
            collections: "Colecciones",
            messages: "Mensajes",
            reviews: "Valoraciones"
          }
        }
      },
      legal: {
        version: "Versión",
        terms: {
          title: "Términos de Uso",
          description: "Lee nuestros términos de uso."
        },
        privacy: {
          title: "Política de Privacidad",
          description: "Lee nuestra política de privacidad."
        },
        cookies: {
          title: "Política de Cookies",
          description: "Lee nuestra política de cookies."
        }
      }
    };
    data.legal = data.legal || {};
    data.legal.cookiesBanner = {
      title: "Control de Cookies",
      description: "Utilizamos cookies para analizar el tráfico y mejorar tu experiencia. Al aceptar, nos ayudas a optimizar la plataforma. Consulta nuestra <policy>Política de Cookies</policy> para más detalles.",
      acceptAll: "Aceptar todas",
      essentialOnly: "Solo esenciales",
      customize: "Personalizar preferencias"
    };
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

['pt.json', 'es.json'].forEach(file => {
  const fullPath = path.join('src', 'i18n', 'messages', file);
  if (fs.existsSync(fullPath)) {
    fixEncoding(fullPath);
    console.log('Fixed encoding for ' + file);
  }
});
