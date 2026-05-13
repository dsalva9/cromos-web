const fs = require('fs');
const data = JSON.parse(fs.readFileSync('src/i18n/messages/es.json', 'utf8'));

data.templates = {
  filters: {
    searchPlaceholder: 'Buscar colecciones...',
    sortLabel: 'Ordenar por',
    sortRecent: 'M\u00e1s recientes',
    sortRating: 'Mejor valoradas',
    sortPopular: 'M\u00e1s populares'
  },
  dynamicFields: {
    enterField: 'Ingresar {field}',
    selectField: 'Seleccionar {field}',
    yes: 'S\u00ed',
    no: 'No'
  },
  card: {
    viewCollection: 'Ver colecci\u00f3n: {title}',
    coverAlt: 'Portada de la colecci\u00f3n {title}'
  }
};

data.admin = {
  audit: {
    title: 'Registro de auditor\u00eda', entityLabel: 'Entidad', entityAll: 'Todas',
    entityCollection: 'Colecci\u00f3n', entityPage: 'P\u00e1gina', entitySticker: 'Cromo', entityImage: 'Imagen',
    actionLabel: 'Acci\u00f3n', actionAll: 'Todas', actionCreate: 'Crear', actionUpdate: 'Actualizar',
    actionDelete: 'Eliminar', actionRemoveImage: 'Eliminar imagen', actionBulkUpsert: 'Carga masiva',
    sizeLabel: 'Tama\u00f1o', prev: 'Anterior', next: 'Siguiente',
    colDate: 'Fecha', colAdmin: 'Admin', colEntity: 'Entidad', colAction: 'Acci\u00f3n',
    colBefore: 'Antes', colAfter: 'Despu\u00e9s',
    loading: 'Cargando...', noResults: 'Sin resultados', errorLoad: 'Error al cargar el registro de auditor\u00eda'
  },
  collections: {
    title: 'Colecciones', newCollection: 'Nueva Colecci\u00f3n',
    colName: 'Nombre', colCompetition: 'Competici\u00f3n', colYear: 'A\u00f1o',
    colActive: 'Estado', colActions: 'Acciones', statusPublished: 'Publicado', statusDraft: 'Borrador',
    loading: 'Cargando...', noCollections: 'Sin colecciones', edit: 'Editar', delete: 'Eliminar',
    editTitle: 'Editar Colecci\u00f3n', newTitle: 'Nueva Colecci\u00f3n', save: 'Guardar', cancel: 'Cancelar',
    fieldName: 'Nombre', fieldCompetition: 'Competici\u00f3n', fieldYear: 'A\u00f1o',
    fieldImageUrl: 'URL Imagen', fieldDescription: 'Descripci\u00f3n', fieldPublished: 'Publicado',
    deleteCollectionTitle: 'Eliminar Colecci\u00f3n',
    deleteWarning: 'Se eliminar\u00e1n todos los cromos y archivos de im\u00e1genes bajo',
    filesFound: 'Archivos encontrados', fileSample: 'Muestra de archivos',
    andMore: '... y {count} m\u00e1s', deleting: 'Eliminando...', confirmDelete: 'S\u00ed, eliminar',
    successSave: 'Colecci\u00f3n guardada', successDelete: 'Colecci\u00f3n eliminada ({count} archivos borrados)',
    errorLoad: 'Error al cargar colecciones', errorRequiredFields: 'Completa nombre, competici\u00f3n y a\u00f1o',
    errorSave: 'No se pudo guardar', errorDelete: 'No se pudo eliminar'
  },
  stickers: {
    title: 'Cromos', collection: 'Colecci\u00f3n', search: 'Buscar',
    searchPlaceholder: 'C\u00f3digo o nombre...', pageSize: 'Tama\u00f1o p\u00e1g.',
    newSticker: 'Nuevo Cromo', prev: 'Anterior', next: 'Siguiente', page: 'P\u00e1gina {page}',
    noTeamsWarning: 'Esta colecci\u00f3n no tiene equipos configurados.',
    noTeamsHint: 'Ve a la pesta\u00f1a Equipos para crear equipos antes de asignarlos a los cromos.',
    colCode: 'C\u00f3digo', colPlayer: 'Jugador', colRarity: 'Rareza', colRating: 'Rating', colActions: 'Acciones',
    loading: 'Cargando...', noStickers: 'Sin cromos', edit: 'Editar', delete: 'Eliminar',
    rarityCommon: 'Com\u00fan', rarityRare: 'Raro', rarityEpic: '\u00c9pico', rarityLegendary: 'Legendario',
    editStickerTitle: 'Editar Cromo', newStickerTitle: 'Nuevo Cromo',
    teamOptional: 'Equipo (opcional)', noTeam: 'Sin equipo', code: 'C\u00f3digo', player: 'Jugador',
    ratingOptional: 'Rating (opcional)', numberOptional: 'N\u00famero (opcional)',
    imageFull: 'Imagen Full (300px)', imageThumb: 'Thumb (100px)',
    removeImage: 'Eliminar imagen', save: 'Guardar', cancel: 'Cancelar',
    removeImageTitle: 'Eliminar imagen',
    removeImageConfirm: '\u00bfEliminar la imagen {type} de este cromo?',
    deleteStickerTitle: 'Eliminar Cromo',
    deleteStickerConfirm: '\u00bfEliminar el cromo {code} \u2014 {name}?',
    successSave: 'Cromo guardado', successImageUpload: 'Imagen {type} subida correctamente',
    successImageRemove: 'Imagen eliminada', successDelete: 'Cromo eliminado',
    errorLoad: 'Error al cargar cromos', errorRequired: 'Completa colecci\u00f3n, c\u00f3digo y jugador',
    errorSave: 'No se pudo guardar', errorInvalidFile: 'Archivo de imagen no v\u00e1lido',
    errorImageUpload: 'Error al subir imagen', errorImageRemove: 'Error al eliminar imagen',
    errorDelete: 'No se pudo eliminar'
  },
  pages: {
    title: 'P\u00e1ginas', collection: 'Colecci\u00f3n', newPage: 'Nueva P\u00e1gina',
    noTeamsWarning: 'Esta colecci\u00f3n no tiene equipos configurados.',
    noTeamsHint: 'Ve a la pesta\u00f1a Equipos primero.',
    colOrder: 'Orden', colTitle: 'T\u00edtulo', colType: 'Tipo', colTeam: 'Equipo', colActions: 'Acciones',
    loading: 'Cargando...', noPages: 'Sin p\u00e1ginas en {collection}',
    kindTeam: 'Equipo', kindSpecial: 'Especial', edit: 'Editar', delete: 'Eliminar',
    editPageTitle: 'Editar P\u00e1gina', newPageTitle: 'Nueva P\u00e1gina',
    fieldType: 'Tipo', teamRequired: 'Equipo', selectTeam: 'Seleccionar equipo',
    save: 'Guardar', cancel: 'Cancelar',
    deletePageTitle: 'Eliminar P\u00e1gina',
    deletePageConfirm: '\u00bfEliminar la p\u00e1gina "{title}" (ID {id})?',
    successSave: 'P\u00e1gina guardada', successDelete: 'P\u00e1gina eliminada',
    errorLoadCollections: 'Error al cargar colecciones', errorLoadPages: 'Error al cargar p\u00e1ginas',
    errorRequired: 'Completa t\u00edtulo y tipo', errorTeamRequired: 'Selecciona un equipo',
    errorNoTeams: 'Esta colecci\u00f3n no tiene equipos. Crea equipos primero.',
    errorSave: 'No se pudo guardar', errorDelete: 'No se pudo eliminar'
  },
  teams: {
    title: 'Equipos', collection: 'Colecci\u00f3n', newTeam: 'Nuevo Equipo',
    colName: 'Nombre', colFlagUrl: 'Bandera URL', colPrimaryColor: 'Color Primario',
    colSecondaryColor: 'Color Secundario', colActions: 'Acciones',
    loading: 'Cargando...', noTeams: 'Sin equipos en {collection}', view: 'Ver',
    edit: 'Editar', delete: 'Eliminar',
    editTeamTitle: 'Editar Equipo', newTeamTitle: 'Nuevo Equipo',
    fieldTeamName: 'Nombre del Equipo', placeholderTeamName: 'Ej: Argentina',
    fieldFlagUrl: 'URL Bandera (opcional)', fieldPrimaryColor: 'Color Primario (opcional)',
    fieldSecondaryColor: 'Color Secundario (opcional)', save: 'Guardar', cancel: 'Cancelar',
    deleteTeamTitle: 'Eliminar Equipo',
    deleteTeamConfirm: '\u00bfEliminar el equipo {name} (ID {id})?',
    deleteTeamWarning: 'Esta acci\u00f3n puede afectar p\u00e1ginas y cromos asociados a este equipo.',
    confirmDelete: 'S\u00ed, eliminar', successSave: 'Equipo guardado', successDelete: 'Equipo eliminado',
    errorLoadCollections: 'Error al cargar colecciones', errorLoadTeams: 'Error al cargar equipos',
    errorRequired: 'Completa colecci\u00f3n y nombre del equipo',
    errorSave: 'No se pudo guardar', errorDelete: 'No se pudo eliminar'
  },
  users: {
    title: 'Usuarios', search: 'Buscar', searchPlaceholder: 'Email o nombre...',
    filter: 'Filtro', pageSize: 'P\u00e1g. tama\u00f1o',
    filterAll: 'Todos', filterActive: 'Activos', filterSuspended: 'Suspendidos', filterAdmin: 'Administradores',
    prev: 'Anterior', next: 'Siguiente', page: 'P\u00e1gina {page}',
    colStatus: 'Estado', colStickers: 'Cromos', colTrades: 'Intercambios',
    colCreated: 'Creado', colLastAccess: '\u00daltimo acceso', colActions: 'Acciones',
    loading: 'Cargando...', noResults: 'Sin resultados',
    statusActive: 'Activo', statusSuspended: 'SUSPENDIDO',
    makeAdmin: 'Hacer admin', removeAdmin: 'Quitar admin', suspend: 'Suspender', reactivate: 'Reactivar',
    delete: 'Eliminar', sendEmail: 'Enviar email', cancel: 'Cancelar', grant: 'Otorgar', revoke: 'Revocar',
    grantAdminTitle: 'Otorgar privilegios de administrador',
    revokeAdminTitle: 'Revocar privilegios de administrador',
    grantAdminMsg: '\u00bfOtorgar privilegios de administrador a {nickname} ({email})?',
    revokeAdminMsg: '\u00bfRevocar privilegios de administrador a {nickname} ({email})?',
    suspendTitle: 'Suspender usuario', unsuspendTitle: 'Levantar suspensi\u00f3n',
    suspendMsg: '\u00bfSuspender la cuenta de {nickname} ({email})? El usuario no podr\u00e1 iniciar sesi\u00f3n.',
    unsuspendMsg: '\u00bfLevantar la suspensi\u00f3n de {nickname} ({email})? El usuario podr\u00e1 iniciar sesi\u00f3n nuevamente.',
    deleteTitle: 'Eliminar usuario',
    deleteMsg: '\u00bfEliminar permanentemente la cuenta de {nickname} ({email})? Esta acci\u00f3n eliminar\u00e1 todos sus cromos, intercambios y datos asociados. Esta acci\u00f3n es irreversible.',
    successGrantAdmin: 'Privilegios de administrador otorgados', successRevokeAdmin: 'Privilegios de administrador revocados',
    successSuspend: 'Usuario suspendido', successUnsuspend: 'Suspensi\u00f3n levantada',
    successDelete: 'Usuario eliminado', errorLoad: 'Error al cargar usuarios', errorAction: 'Error al realizar la acci\u00f3n'
  },
  bulkUpload: {
    title: 'Carga Masiva', downloadTemplate: 'Descargar plantilla CSV',
    collection: 'Colecci\u00f3n', overwrite: 'Sobreescribir existentes',
    csvLabel: 'Archivo CSV', preview: 'Previsualizar',
    csvHeaders: 'Columnas: sticker_code, player_name, team_name, rarity, rating',
    imagesLabel: 'Im\u00e1genes (opcional)', imageConvention: 'Nombres: {code}_full.png y {code}_thumb.png',
    colCode: 'C\u00f3digo', colPlayer: 'Jugador', colRarity: 'Rareza', colRating: 'Rating',
    apply: 'Aplicar carga', processing: 'Procesando...', retryFailed: 'Reintentar fallidos ({count})',
    errors: 'Errores', summary: 'Resumen', successComplete: 'Carga completada',
    templateDownloaded: 'Plantilla descargada', retryRows: 'Reintentando {count} filas fallidas',
    errorSelectCollection: 'Selecciona una colecci\u00f3n', errorNoData: 'No hay datos para procesar',
    errorUnknown: 'Error desconocido'
  },
  sendEmail: {
    title: 'Enviar correo corporativo', to: 'Destinatario',
    subject: 'Asunto *', subjectPlaceholder: 'Escribe el asunto del correo...',
    message: 'Mensaje *', messagePlaceholder: 'Escribe el mensaje...',
    footerNote: 'El correo se enviar\u00e1 desde info@cambiocromos.com con el estilo corporativo de CambioCromos.',
    send: 'Enviar correo', sending: 'Enviando...', cancel: 'Cancelar',
    successSent: 'Correo enviado a {email}',
    errorEmpty: 'Por favor, completa el asunto y el mensaje',
    errorNoSession: 'No hay sesi\u00f3n activa', errorSend: 'Error al enviar el correo'
  }
};

fs.writeFileSync('src/i18n/messages/es.json', JSON.stringify(data, null, 2), 'utf8');
console.log('Done - es.json updated with', Object.keys(data.admin).length, 'admin namespaces');
