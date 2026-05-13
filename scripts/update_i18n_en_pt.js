const fs = require('fs');

// EN keys
const enData = JSON.parse(fs.readFileSync('src/i18n/messages/en.json', 'utf8'));

enData.templates = {
  filters: {
    searchPlaceholder: 'Search collections...',
    sortLabel: 'Sort by',
    sortRecent: 'Most recent',
    sortRating: 'Best rated',
    sortPopular: 'Most popular'
  },
  dynamicFields: {
    enterField: 'Enter {field}',
    selectField: 'Select {field}',
    yes: 'Yes',
    no: 'No'
  },
  card: {
    viewCollection: 'View collection: {title}',
    coverAlt: 'Cover of collection {title}'
  }
};

enData.admin = {
  audit: {
    title: 'Audit log', entityLabel: 'Entity', entityAll: 'All',
    entityCollection: 'Collection', entityPage: 'Page', entitySticker: 'Sticker', entityImage: 'Image',
    actionLabel: 'Action', actionAll: 'All', actionCreate: 'Create', actionUpdate: 'Update',
    actionDelete: 'Delete', actionRemoveImage: 'Remove image', actionBulkUpsert: 'Bulk upload',
    sizeLabel: 'Size', prev: 'Previous', next: 'Next',
    colDate: 'Date', colAdmin: 'Admin', colEntity: 'Entity', colAction: 'Action',
    colBefore: 'Before', colAfter: 'After',
    loading: 'Loading...', noResults: 'No results', errorLoad: 'Error loading audit log'
  },
  collections: {
    title: 'Collections', newCollection: 'New Collection',
    colName: 'Name', colCompetition: 'Competition', colYear: 'Year',
    colActive: 'Status', colActions: 'Actions', statusPublished: 'Published', statusDraft: 'Draft',
    loading: 'Loading...', noCollections: 'No collections', edit: 'Edit', delete: 'Delete',
    editTitle: 'Edit Collection', newTitle: 'New Collection', save: 'Save', cancel: 'Cancel',
    fieldName: 'Name', fieldCompetition: 'Competition', fieldYear: 'Year',
    fieldImageUrl: 'Image URL', fieldDescription: 'Description', fieldPublished: 'Published',
    deleteCollectionTitle: 'Delete Collection',
    deleteWarning: 'All stickers and image files will be removed under',
    filesFound: 'Files found', fileSample: 'File sample',
    andMore: '... and {count} more', deleting: 'Deleting...', confirmDelete: 'Yes, delete',
    successSave: 'Collection saved', successDelete: 'Collection deleted ({count} files removed)',
    errorLoad: 'Error loading collections', errorRequiredFields: 'Fill in name, competition and year',
    errorSave: 'Could not save', errorDelete: 'Could not delete'
  },
  stickers: {
    title: 'Stickers', collection: 'Collection', search: 'Search',
    searchPlaceholder: 'Code or name...', pageSize: 'Page size',
    newSticker: 'New Sticker', prev: 'Previous', next: 'Next', page: 'Page {page}',
    noTeamsWarning: 'This collection has no teams configured.',
    noTeamsHint: 'Go to the Teams tab to create teams before assigning them to stickers.',
    colCode: 'Code', colPlayer: 'Player', colRarity: 'Rarity', colRating: 'Rating', colActions: 'Actions',
    loading: 'Loading...', noStickers: 'No stickers', edit: 'Edit', delete: 'Delete',
    rarityCommon: 'Common', rarityRare: 'Rare', rarityEpic: 'Epic', rarityLegendary: 'Legendary',
    editStickerTitle: 'Edit Sticker', newStickerTitle: 'New Sticker',
    teamOptional: 'Team (optional)', noTeam: 'No team', code: 'Code', player: 'Player',
    ratingOptional: 'Rating (optional)', numberOptional: 'Number (optional)',
    imageFull: 'Full Image (300px)', imageThumb: 'Thumb (100px)',
    removeImage: 'Remove image', save: 'Save', cancel: 'Cancel',
    removeImageTitle: 'Remove image', removeImageConfirm: 'Remove the {type} image from this sticker?',
    deleteStickerTitle: 'Delete Sticker', deleteStickerConfirm: 'Delete sticker {code} \u2014 {name}?',
    successSave: 'Sticker saved', successImageUpload: '{type} image uploaded successfully',
    successImageRemove: 'Image removed', successDelete: 'Sticker deleted',
    errorLoad: 'Error loading stickers', errorRequired: 'Fill in collection, code and player',
    errorSave: 'Could not save', errorInvalidFile: 'Invalid image file',
    errorImageUpload: 'Error uploading image', errorImageRemove: 'Error removing image',
    errorDelete: 'Could not delete'
  },
  pages: {
    title: 'Pages', collection: 'Collection', newPage: 'New Page',
    noTeamsWarning: 'This collection has no teams configured.',
    noTeamsHint: 'Go to the Teams tab first.',
    colOrder: 'Order', colTitle: 'Title', colType: 'Type', colTeam: 'Team', colActions: 'Actions',
    loading: 'Loading...', noPages: 'No pages in {collection}',
    kindTeam: 'Team', kindSpecial: 'Special', edit: 'Edit', delete: 'Delete',
    editPageTitle: 'Edit Page', newPageTitle: 'New Page',
    fieldType: 'Type', teamRequired: 'Team', selectTeam: 'Select team',
    save: 'Save', cancel: 'Cancel',
    deletePageTitle: 'Delete Page', deletePageConfirm: 'Delete page "{title}" (ID {id})?',
    successSave: 'Page saved', successDelete: 'Page deleted',
    errorLoadCollections: 'Error loading collections', errorLoadPages: 'Error loading pages',
    errorRequired: 'Fill in title and type', errorTeamRequired: 'Select a team',
    errorNoTeams: 'This collection has no teams. Create teams first.',
    errorSave: 'Could not save', errorDelete: 'Could not delete'
  },
  teams: {
    title: 'Teams', collection: 'Collection', newTeam: 'New Team',
    colName: 'Name', colFlagUrl: 'Flag URL', colPrimaryColor: 'Primary Color',
    colSecondaryColor: 'Secondary Color', colActions: 'Actions',
    loading: 'Loading...', noTeams: 'No teams in {collection}', view: 'View',
    edit: 'Edit', delete: 'Delete',
    editTeamTitle: 'Edit Team', newTeamTitle: 'New Team',
    fieldTeamName: 'Team Name', placeholderTeamName: 'E.g.: Argentina',
    fieldFlagUrl: 'Flag URL (optional)', fieldPrimaryColor: 'Primary Color (optional)',
    fieldSecondaryColor: 'Secondary Color (optional)', save: 'Save', cancel: 'Cancel',
    deleteTeamTitle: 'Delete Team', deleteTeamConfirm: 'Delete team {name} (ID {id})?',
    deleteTeamWarning: 'This action may affect pages and stickers associated with this team.',
    confirmDelete: 'Yes, delete', successSave: 'Team saved', successDelete: 'Team deleted',
    errorLoadCollections: 'Error loading collections', errorLoadTeams: 'Error loading teams',
    errorRequired: 'Fill in collection and team name',
    errorSave: 'Could not save', errorDelete: 'Could not delete'
  },
  users: {
    title: 'Users', search: 'Search', searchPlaceholder: 'Email or name...',
    filter: 'Filter', pageSize: 'Page size',
    filterAll: 'All', filterActive: 'Active', filterSuspended: 'Suspended', filterAdmin: 'Administrators',
    prev: 'Previous', next: 'Next', page: 'Page {page}',
    colStatus: 'Status', colStickers: 'Stickers', colTrades: 'Trades',
    colCreated: 'Created', colLastAccess: 'Last access', colActions: 'Actions',
    loading: 'Loading...', noResults: 'No results',
    statusActive: 'Active', statusSuspended: 'SUSPENDED',
    makeAdmin: 'Make admin', removeAdmin: 'Remove admin', suspend: 'Suspend', reactivate: 'Reactivate',
    delete: 'Delete', sendEmail: 'Send email', cancel: 'Cancel', grant: 'Grant', revoke: 'Revoke',
    grantAdminTitle: 'Grant admin privileges',
    revokeAdminTitle: 'Revoke admin privileges',
    grantAdminMsg: 'Grant admin privileges to {nickname} ({email})?',
    revokeAdminMsg: 'Revoke admin privileges from {nickname} ({email})?',
    suspendTitle: 'Suspend user', unsuspendTitle: 'Lift suspension',
    suspendMsg: 'Suspend account of {nickname} ({email})? The user will not be able to log in.',
    unsuspendMsg: 'Lift suspension of {nickname} ({email})? The user will be able to log in again.',
    deleteTitle: 'Delete user',
    deleteMsg: 'Permanently delete account of {nickname} ({email})? This will remove all their stickers, trades and associated data. This action is irreversible.',
    successGrantAdmin: 'Admin privileges granted', successRevokeAdmin: 'Admin privileges revoked',
    successSuspend: 'User suspended', successUnsuspend: 'Suspension lifted',
    successDelete: 'User deleted', errorLoad: 'Error loading users', errorAction: 'Error performing action'
  },
  bulkUpload: {
    title: 'Bulk Upload', downloadTemplate: 'Download CSV template',
    collection: 'Collection', overwrite: 'Overwrite existing',
    csvLabel: 'CSV File', preview: 'Preview',
    csvHeaders: 'Columns: sticker_code, player_name, team_name, rarity, rating',
    imagesLabel: 'Images (optional)', imageConvention: 'Names: {code}_full.png and {code}_thumb.png',
    colCode: 'Code', colPlayer: 'Player', colRarity: 'Rarity', colRating: 'Rating',
    apply: 'Apply upload', processing: 'Processing...', retryFailed: 'Retry failed ({count})',
    errors: 'Errors', summary: 'Summary', successComplete: 'Upload complete',
    templateDownloaded: 'Template downloaded', retryRows: 'Retrying {count} failed rows',
    errorSelectCollection: 'Select a collection', errorNoData: 'No data to process',
    errorUnknown: 'Unknown error'
  },
  sendEmail: {
    title: 'Send corporate email', to: 'To',
    subject: 'Subject *', subjectPlaceholder: 'Enter email subject...',
    message: 'Message *', messagePlaceholder: 'Write your message...',
    footerNote: 'The email will be sent from info@cambiocromos.com with CambioCromos corporate styling.',
    send: 'Send email', sending: 'Sending...', cancel: 'Cancel',
    successSent: 'Email sent to {email}',
    errorEmpty: 'Please fill in subject and message',
    errorNoSession: 'No active session', errorSend: 'Error sending email'
  }
};

fs.writeFileSync('src/i18n/messages/en.json', JSON.stringify(enData, null, 2), 'utf8');
console.log('Done - en.json updated');

// PT keys
const ptData = JSON.parse(fs.readFileSync('src/i18n/messages/pt.json', 'utf8'));

ptData.templates = {
  filters: {
    searchPlaceholder: 'Buscar cole\u00e7\u00f5es...',
    sortLabel: 'Ordenar por',
    sortRecent: 'Mais recentes',
    sortRating: 'Melhor avaliados',
    sortPopular: 'Mais populares'
  },
  dynamicFields: {
    enterField: 'Inserir {field}',
    selectField: 'Selecionar {field}',
    yes: 'Sim',
    no: 'N\u00e3o'
  },
  card: {
    viewCollection: 'Ver cole\u00e7\u00e3o: {title}',
    coverAlt: 'Capa da cole\u00e7\u00e3o {title}'
  }
};

ptData.admin = {
  audit: {
    title: 'Registro de auditoria', entityLabel: 'Entidade', entityAll: 'Todas',
    entityCollection: 'Cole\u00e7\u00e3o', entityPage: 'P\u00e1gina', entitySticker: 'Figurinha', entityImage: 'Imagem',
    actionLabel: 'A\u00e7\u00e3o', actionAll: 'Todas', actionCreate: 'Criar', actionUpdate: 'Atualizar',
    actionDelete: 'Excluir', actionRemoveImage: 'Remover imagem', actionBulkUpsert: 'Upload em massa',
    sizeLabel: 'Tamanho', prev: 'Anterior', next: 'Pr\u00f3ximo',
    colDate: 'Data', colAdmin: 'Admin', colEntity: 'Entidade', colAction: 'A\u00e7\u00e3o',
    colBefore: 'Antes', colAfter: 'Depois',
    loading: 'Carregando...', noResults: 'Sem resultados', errorLoad: 'Erro ao carregar o registro de auditoria'
  },
  collections: {
    title: 'Cole\u00e7\u00f5es', newCollection: 'Nova Cole\u00e7\u00e3o',
    colName: 'Nome', colCompetition: 'Competi\u00e7\u00e3o', colYear: 'Ano',
    colActive: 'Status', colActions: 'A\u00e7\u00f5es', statusPublished: 'Publicado', statusDraft: 'Rascunho',
    loading: 'Carregando...', noCollections: 'Sem cole\u00e7\u00f5es', edit: 'Editar', delete: 'Excluir',
    editTitle: 'Editar Cole\u00e7\u00e3o', newTitle: 'Nova Cole\u00e7\u00e3o', save: 'Salvar', cancel: 'Cancelar',
    fieldName: 'Nome', fieldCompetition: 'Competi\u00e7\u00e3o', fieldYear: 'Ano',
    fieldImageUrl: 'URL da Imagem', fieldDescription: 'Descri\u00e7\u00e3o', fieldPublished: 'Publicado',
    deleteCollectionTitle: 'Excluir Cole\u00e7\u00e3o',
    deleteWarning: 'Todas as figurinhas e arquivos de imagem ser\u00e3o removidos em',
    filesFound: 'Arquivos encontrados', fileSample: 'Amostra de arquivos',
    andMore: '... e {count} mais', deleting: 'Excluindo...', confirmDelete: 'Sim, excluir',
    successSave: 'Cole\u00e7\u00e3o salva', successDelete: 'Cole\u00e7\u00e3o exclu\u00edda ({count} arquivos removidos)',
    errorLoad: 'Erro ao carregar cole\u00e7\u00f5es', errorRequiredFields: 'Preencha nome, competi\u00e7\u00e3o e ano',
    errorSave: 'N\u00e3o foi poss\u00edvel salvar', errorDelete: 'N\u00e3o foi poss\u00edvel excluir'
  },
  stickers: {
    title: 'Figurinhas', collection: 'Cole\u00e7\u00e3o', search: 'Buscar',
    searchPlaceholder: 'C\u00f3digo ou nome...', pageSize: 'Tamanho da p\u00e1g.',
    newSticker: 'Nova Figurinha', prev: 'Anterior', next: 'Pr\u00f3ximo', page: 'P\u00e1gina {page}',
    noTeamsWarning: 'Esta cole\u00e7\u00e3o n\u00e3o tem times configurados.',
    noTeamsHint: 'V\u00e1 para a aba Times para criar times antes de atribu\u00ed-los \u00e0s figurinhas.',
    colCode: 'C\u00f3digo', colPlayer: 'Jogador', colRarity: 'Raridade', colRating: 'Rating', colActions: 'A\u00e7\u00f5es',
    loading: 'Carregando...', noStickers: 'Sem figurinhas', edit: 'Editar', delete: 'Excluir',
    rarityCommon: 'Comum', rarityRare: 'Rara', rarityEpic: '\u00c9pica', rarityLegendary: 'Lend\u00e1ria',
    editStickerTitle: 'Editar Figurinha', newStickerTitle: 'Nova Figurinha',
    teamOptional: 'Time (opcional)', noTeam: 'Sem time', code: 'C\u00f3digo', player: 'Jogador',
    ratingOptional: 'Rating (opcional)', numberOptional: 'N\u00famero (opcional)',
    imageFull: 'Imagem Full (300px)', imageThumb: 'Miniatura (100px)',
    removeImage: 'Remover imagem', save: 'Salvar', cancel: 'Cancelar',
    removeImageTitle: 'Remover imagem', removeImageConfirm: 'Remover a imagem {type} desta figurinha?',
    deleteStickerTitle: 'Excluir Figurinha', deleteStickerConfirm: 'Excluir figurinha {code} \u2014 {name}?',
    successSave: 'Figurinha salva', successImageUpload: 'Imagem {type} enviada com sucesso',
    successImageRemove: 'Imagem removida', successDelete: 'Figurinha exclu\u00edda',
    errorLoad: 'Erro ao carregar figurinhas', errorRequired: 'Preencha cole\u00e7\u00e3o, c\u00f3digo e jogador',
    errorSave: 'N\u00e3o foi poss\u00edvel salvar', errorInvalidFile: 'Arquivo de imagem inv\u00e1lido',
    errorImageUpload: 'Erro ao enviar imagem', errorImageRemove: 'Erro ao remover imagem',
    errorDelete: 'N\u00e3o foi poss\u00edvel excluir'
  },
  pages: {
    title: 'P\u00e1ginas', collection: 'Cole\u00e7\u00e3o', newPage: 'Nova P\u00e1gina',
    noTeamsWarning: 'Esta cole\u00e7\u00e3o n\u00e3o tem times configurados.',
    noTeamsHint: 'V\u00e1 para a aba Times primeiro.',
    colOrder: 'Ordem', colTitle: 'T\u00edtulo', colType: 'Tipo', colTeam: 'Time', colActions: 'A\u00e7\u00f5es',
    loading: 'Carregando...', noPages: 'Sem p\u00e1ginas em {collection}',
    kindTeam: 'Time', kindSpecial: 'Especial', edit: 'Editar', delete: 'Excluir',
    editPageTitle: 'Editar P\u00e1gina', newPageTitle: 'Nova P\u00e1gina',
    fieldType: 'Tipo', teamRequired: 'Time', selectTeam: 'Selecionar time',
    save: 'Salvar', cancel: 'Cancelar',
    deletePageTitle: 'Excluir P\u00e1gina', deletePageConfirm: 'Excluir a p\u00e1gina "{title}" (ID {id})?',
    successSave: 'P\u00e1gina salva', successDelete: 'P\u00e1gina exclu\u00edda',
    errorLoadCollections: 'Erro ao carregar cole\u00e7\u00f5es', errorLoadPages: 'Erro ao carregar p\u00e1ginas',
    errorRequired: 'Preencha t\u00edtulo e tipo', errorTeamRequired: 'Selecione um time',
    errorNoTeams: 'Esta cole\u00e7\u00e3o n\u00e3o tem times. Crie times primeiro.',
    errorSave: 'N\u00e3o foi poss\u00edvel salvar', errorDelete: 'N\u00e3o foi poss\u00edvel excluir'
  },
  teams: {
    title: 'Times', collection: 'Cole\u00e7\u00e3o', newTeam: 'Novo Time',
    colName: 'Nome', colFlagUrl: 'URL da Bandeira', colPrimaryColor: 'Cor Prim\u00e1ria',
    colSecondaryColor: 'Cor Secund\u00e1ria', colActions: 'A\u00e7\u00f5es',
    loading: 'Carregando...', noTeams: 'Sem times em {collection}', view: 'Ver',
    edit: 'Editar', delete: 'Excluir',
    editTeamTitle: 'Editar Time', newTeamTitle: 'Novo Time',
    fieldTeamName: 'Nome do Time', placeholderTeamName: 'Ex: Brasil',
    fieldFlagUrl: 'URL da Bandeira (opcional)', fieldPrimaryColor: 'Cor Prim\u00e1ria (opcional)',
    fieldSecondaryColor: 'Cor Secund\u00e1ria (opcional)', save: 'Salvar', cancel: 'Cancelar',
    deleteTeamTitle: 'Excluir Time', deleteTeamConfirm: 'Excluir o time {name} (ID {id})?',
    deleteTeamWarning: 'Esta a\u00e7\u00e3o pode afetar p\u00e1ginas e figurinhas associadas a este time.',
    confirmDelete: 'Sim, excluir', successSave: 'Time salvo', successDelete: 'Time exclu\u00eddo',
    errorLoadCollections: 'Erro ao carregar cole\u00e7\u00f5es', errorLoadTeams: 'Erro ao carregar times',
    errorRequired: 'Preencha cole\u00e7\u00e3o e nome do time',
    errorSave: 'N\u00e3o foi poss\u00edvel salvar', errorDelete: 'N\u00e3o foi poss\u00edvel excluir'
  },
  users: {
    title: 'Usu\u00e1rios', search: 'Buscar', searchPlaceholder: 'Email ou nome...',
    filter: 'Filtro', pageSize: 'Tam. p\u00e1g.',
    filterAll: 'Todos', filterActive: 'Ativos', filterSuspended: 'Suspensos', filterAdmin: 'Administradores',
    prev: 'Anterior', next: 'Pr\u00f3ximo', page: 'P\u00e1gina {page}',
    colStatus: 'Status', colStickers: 'Figurinhas', colTrades: 'Trocas',
    colCreated: 'Criado', colLastAccess: '\u00daltimo acesso', colActions: 'A\u00e7\u00f5es',
    loading: 'Carregando...', noResults: 'Sem resultados',
    statusActive: 'Ativo', statusSuspended: 'SUSPENSO',
    makeAdmin: 'Tornar admin', removeAdmin: 'Remover admin', suspend: 'Suspender', reactivate: 'Reativar',
    delete: 'Excluir', sendEmail: 'Enviar email', cancel: 'Cancelar', grant: 'Conceder', revoke: 'Revogar',
    grantAdminTitle: 'Conceder privil\u00e9gios de administrador',
    revokeAdminTitle: 'Revogar privil\u00e9gios de administrador',
    grantAdminMsg: 'Conceder privil\u00e9gios de administrador a {nickname} ({email})?',
    revokeAdminMsg: 'Revogar privil\u00e9gios de administrador de {nickname} ({email})?',
    suspendTitle: 'Suspender usu\u00e1rio', unsuspendTitle: 'Suspender suspens\u00e3o',
    suspendMsg: 'Suspender a conta de {nickname} ({email})? O usu\u00e1rio n\u00e3o poder\u00e1 fazer login.',
    unsuspendMsg: 'Levantar a suspens\u00e3o de {nickname} ({email})? O usu\u00e1rio poder\u00e1 fazer login novamente.',
    deleteTitle: 'Excluir usu\u00e1rio',
    deleteMsg: 'Excluir permanentemente a conta de {nickname} ({email})? Isso remover\u00e1 todas as figurinhas, trocas e dados associados. Esta a\u00e7\u00e3o \u00e9 irrevers\u00edvel.',
    successGrantAdmin: 'Privil\u00e9gios de administrador concedidos', successRevokeAdmin: 'Privil\u00e9gios de administrador revogados',
    successSuspend: 'Usu\u00e1rio suspenso', successUnsuspend: 'Suspens\u00e3o levantada',
    successDelete: 'Usu\u00e1rio exclu\u00eddo', errorLoad: 'Erro ao carregar usu\u00e1rios', errorAction: 'Erro ao executar a\u00e7\u00e3o'
  },
  bulkUpload: {
    title: 'Upload em Massa', downloadTemplate: 'Baixar modelo CSV',
    collection: 'Cole\u00e7\u00e3o', overwrite: 'Sobrescrever existentes',
    csvLabel: 'Arquivo CSV', preview: 'Pr\u00e9-visualizar',
    csvHeaders: 'Colunas: sticker_code, player_name, team_name, rarity, rating',
    imagesLabel: 'Imagens (opcional)', imageConvention: 'Nomes: {code}_full.png e {code}_thumb.png',
    colCode: 'C\u00f3digo', colPlayer: 'Jogador', colRarity: 'Raridade', colRating: 'Rating',
    apply: 'Aplicar upload', processing: 'Processando...', retryFailed: 'Tentar novamente falhos ({count})',
    errors: 'Erros', summary: 'Resumo', successComplete: 'Upload conclu\u00eddo',
    templateDownloaded: 'Modelo baixado', retryRows: 'Tentando novamente {count} linhas falhas',
    errorSelectCollection: 'Selecione uma cole\u00e7\u00e3o', errorNoData: 'Nenhum dado para processar',
    errorUnknown: 'Erro desconhecido'
  },
  sendEmail: {
    title: 'Enviar email corporativo', to: 'Para',
    subject: 'Assunto *', subjectPlaceholder: 'Digite o assunto do email...',
    message: 'Mensagem *', messagePlaceholder: 'Escreva sua mensagem...',
    footerNote: 'O email ser\u00e1 enviado de info@cambiocromos.com com o estilo corporativo da CambioCromos.',
    send: 'Enviar email', sending: 'Enviando...', cancel: 'Cancelar',
    successSent: 'Email enviado para {email}',
    errorEmpty: 'Por favor, preencha o assunto e a mensagem',
    errorNoSession: 'Nenhuma sess\u00e3o ativa', errorSend: 'Erro ao enviar o email'
  }
};

fs.writeFileSync('src/i18n/messages/pt.json', JSON.stringify(ptData, null, 2), 'utf8');
console.log('Done - pt.json updated');
