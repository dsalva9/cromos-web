const fs = require('fs');

function patchFile(file, isChat) {
  let code = fs.readFileSync(file, 'utf8');

  if (!code.includes('useTranslations')) {
    code = code.replace(
      /import \{.*\} from 'react';/,
      match => match + "\nimport { useTranslations } from 'next-intl';"
    );
  }

  const namespace = isChat ? 'marketplace.chat' : 'marketplace.detail';
  const hookDecl = `  const t = useTranslations('${namespace}');`;

  if (!code.includes('const t = useTranslations(')) {
    if (isChat) {
      code = code.replace(
        /function ListingChatPageContent\(\) \{/,
        "function ListingChatPageContent() {\n" + hookDecl
      );
    } else {
      code = code.replace(
        /export default function ListingDetailPage\(\) \{/,
        "export default function ListingDetailPage() {\n" + hookDecl
      );
    }
  }

  if (!isChat) {
    code = code.replace(/Anuncio no encontrado/g, "{t('notFoundTitle')}");
    code = code.replace(/Este anuncio puede haber sido eliminado o ya no está disponible/g, "{t('notFoundDesc')}");
    code = code.replace(/Por favor contacta con/g, "{t('contactSupport')}");
    code = code.replace(/Volver al Marketplace/g, "{t('backToMarketplace')}");
    code = code.replace(/Pack de cromos/g, "{t('typeGroup')}");
    code = code.replace(/Cromo individual/g, "{t('typeSingle')}");
    code = code.replace(/🔄 Intercambio/g, "🔄 {t('exchange')}");
    code = code.replace(/💰 Venta/g, "💰 {t('sale')}");
    code = code.replace(/Autor Suspendido/g, "{t('authorSuspended')}");
    code = code.replace(/Autor Eliminado/g, "{t('authorDeleted')}");
    code = code.replace(/>\s*Eliminado\s*<\/Badge>/g, ">{t('deleted')}</Badge>");
    code = code.replace(/Colección:/g, "{t('collection')}:");
    code = code.replace(/visualizaciones/g, "{t('views')}");
    code = code.replace(/Detalles del Cromo/g, "{t('cardDetails')}");
    code = code.replace(/Página \/ Sección/g, "{t('pageNumber')}");
    code = code.replace(/Número \/ Código/g, "{t('stickerNumber')}");
    code = code.replace(/Variante de Slot/g, "{t('slotVariant')}");
    code = code.replace(/Numeración Global/g, "{t('globalNumber')}");
    code = code.replace(/Tipo de Anuncio/g, "{t('listingType')}");
    code = code.replace(/Acepta devoluciones/g, "{t('acceptsReturns')}");
    code = code.replace(/No acepta devoluciones/g, "{t('noReturns')}");
    code = code.replace(/>Envío</g, ">{t('shipping')}<");
    code = code.replace(/Entrega en mano/g, "{t('handDelivery')}");
    code = code.replace(/Envío nacional/g, "{t('domesticShipping')}");
    code = code.replace(/Envío internacional/g, "{t('internationalShipping')}");
    code = code.replace(/El comprador paga el envío/g, "{t('buyerPaysShipping')}");
    code = code.replace(/>Precio</g, ">{t('price')}<");
    code = code.replace(/Permite ofertas/g, "{t('makeOffer')}");
    code = code.replace(/>Descripción</g, ">{t('description')}<");
    code = code.replace(/>Vendedor</g, ">{t('seller')}<");
    code = code.replace(/Se unió en/g, "{t('joined')}");
    code = code.replace(/>anuncios</g, ">{t('listings')}<");
    code = code.replace(/>Valoración</g, ">{t('rating')}<");
    code = code.replace(/Sin valoraciones/g, "{t('noRatings')}");
    code = code.replace(/Contactar Vendedor/g, "{t('chatWithSeller')}");
    code = code.replace(/Eres el vendedor de este anuncio/g, "{t('youAreOwner')}");
    code = code.replace(/Ir al chat del anuncio/g, "{t('chatAsOwner')}");
    code = code.replace(/>chats</g, ">{t('chats')}<");
    code = code.replace(/Aún no hay chats/g, "{t('noChats')}");
    code = code.replace(/Denunciar anuncio/g, "{t('reportListing')}");

    // Function getStatusLabel
    code = code.replace(
      /const getStatusLabel = \(status: string\) => \{[\s\S]*?return status;\n\s*\};/,
      `const getStatusLabel = (status: string) => {
        switch (status) {
          case 'active': return t('status.active');
          case 'reserved': return t('status.reserved');
          case 'completed': return t('status.completed');
          case 'sold': return t('status.sold');
          case 'removed': return t('status.removed');
          default: return status;
        }
      };`
    );
  } else {
    // Chat page specific replacements
    code = code.replace(/Volver a mis chats/g, "{t('backToChats')}");
    code = code.replace(/'Usuario'/g, "t('seller')");
    code = code.replace(/Vendedor:/g, "{t('seller')}:");
    code = code.replace(/>Activo</g, ">{t('status.active')}<");
    code = code.replace(/>Reservado</g, ">{t('status.reserved')}<");
    code = code.replace(/>Completado</g, ">{t('status.completed')}<");
    code = code.replace(/Marcar Reservado/g, "{t('markReserved')}");
    code = code.replace(/'Marcando\.\.\.'/g, "t('reserving')");
    code = code.replace(/'Reservar'/g, "t('markReserved')");
    code = code.replace(/'Completando\.\.\.'/g, "t('completing')");
    code = code.replace(/'Completar'/g, "t('markCompleted')");
    code = code.replace(/'Liberando\.\.\.'/g, "t('releasing')");
    code = code.replace(/'Liberar'/g, "t('releaseReserve')");
    code = code.replace(/'Confirmando\.\.\.'/g, "t('confirming')");
    code = code.replace(/'Confirmar Recepción'/g, "t('confirmReceipt')");
    code = code.replace(/¿Seguro que quieres reservar este anuncio para \$\{selectedParticipantData\.nickname\}\?/g, "${t('reservePrompt', { name: selectedParticipantData.nickname })}");
    code = code.replace(/¿Seguro que quieres liberar la reserva con \$\{reservedBuyerNickname\}\? El anuncio volverá a estar disponible para todos\./g, "${t('unreservePrompt', { name: reservedBuyerNickname })}");
    code = code.replace(/¿Confirmas que has completado el intercambio con \$\{reservedBuyerNickname\}\? Esto enviará una notificación al comprador para que confirme\./g, "${t('completePrompt', { name: reservedBuyerNickname })}");
    code = code.replace(/Anuncio reservado para \$\{selectedParticipantData\.nickname\}/g, "${t('reservedSuccess', { name: selectedParticipantData.nickname })}");
    code = code.replace(/'Reserva liberada\. El anuncio está disponible nuevamente\.'/g, "t('unreservedSuccess')");
    code = code.replace(/Intercambio marcado como completado\. Esperando confirmación de \$\{reservedBuyerNickname\}\./g, "${t('completedSuccess', { name: reservedBuyerNickname })}");
    code = code.replace(/'Transacción confirmada\. ¡Ahora puedes valorar al vendedor!'/g, "t('confirmedSuccess')");
    code = code.replace(/'Error al reservar el anuncio'/g, "t('errorReserving')");
    code = code.replace(/'Error al liberar la reserva'/g, "t('errorUnreserving')");
    code = code.replace(/'Error al completar el intercambio'/g, "t('errorCompleting')");
    code = code.replace(/'Error al confirmar la transacción'/g, "t('errorConfirming')");
    code = code.replace(/'Debes aceptar los términos y condiciones antes de enviar un mensaje'/g, "t('tosError')");
    code = code.replace(/>Mensaje del sistema</g, ">{t('systemMessage')}<");
    code = code.replace(/placeholder="Escribe un mensaje\.\.\."/g, "placeholder={t('writeMessage')}");
    code = code.replace(/>Enviar</g, ">{t('send')}<");
    code = code.replace(/>Enviando\.\.\.</g, ">{t('sending')}<");
    code = code.replace(/Valorar transacción/g, "{t('ratingTitle')}");
    code = code.replace(/Valoración enviada/g, "{t('ratingSubmitted')}");
    code = code.replace(/Aceptar términos/g, "{t('acceptTerms')}");
    code = code.replace(/Condiciones del Chat/g, "{t('termsTitle')}");
    code = code.replace(/Por tu seguridad y la de toda la comunidad, recuerda:/g, "{t('termsDescription')}");
    code = code.replace(/Mantén el respeto y la educación en todo momento\./g, "{t('termsRule1')}");
    code = code.replace(/No compartas información personal sensible\./g, "{t('termsRule2')}");
    code = code.replace(/Acuerda los detalles del envío o punto de encuentro claramente\./g, "{t('termsRule3')}");
    code = code.replace(/El spam o comportamiento abusivo resultará en la suspensión de la cuenta\./g, "{t('termsRule4')}");
    code = code.replace(/Acepto las condiciones/g, "{t('iAccept')}");
    code = code.replace(/Mi valoración/g, "{t('myRating')}");
    code = code.replace(/Valoración recibida/g, "{t('counterpartyRating')}");
    code = code.replace(/Transacción completada/g, "{t('transactionCompleted')}");
    code = code.replace(/Eres el vendedor/g, "{t('youAreSeller')}");
  }

  fs.writeFileSync(file, code);
}

patchFile('src/app/[locale]/marketplace/[id]/page.tsx', false);
patchFile('src/app/[locale]/marketplace/[id]/chat/page.tsx', true);
console.log('Patched pages!');
