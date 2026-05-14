const fs = require('fs');
const path = require('path');

const dictionaries = [
  { file: 'src/i18n/messages/en.json', locale: 'en' },
  { file: 'src/i18n/messages/es.json', locale: 'es' },
  { file: 'src/i18n/messages/pt.json', locale: 'pt' }
];

const badgesEs = {
  title: "Logros",
  viewAll: "Ver todos los logros",
  noBadgesOwn: "Aún no has ganado ningún logro",
  noBadgesOther: "Sin logros ganados",
  viewAllShort: "Ver todos",
  earned: "ganados",
  unearned: "por ganar",
  allBadges: "Todos los logros",
  earnedCount: "Ganados ({count})",
  emptyMessageOwn: "Aún no has ganado ningún logro. ¡Comienza a coleccionar!",
  emptyMessageOther: "Este usuario aún no ha ganado logros.",
  earnedOn: "Ganada el {date}",
  categories: {
    collector: { name: "Coleccionista", description: "Copia colecciones para tu biblioteca" },
    creator: { name: "Creador", description: "Crea colecciones para la comunidad" },
    reviewer: { name: "Opinador", description: "Califica y comenta colecciones" },
    completionist: { name: "Completista", description: "Completa colecciones al 100%" },
    trader: { name: "Trader", description: "Intercambia cromos exitosamente" },
    top_rated: { name: "Top Valorado", description: "Mantén una excelente reputación" }
  },
  tiers: {
    bronze: "CANTERA",
    silver: "TITULAR",
    gold: "ESTRELLA",
    special: "LEYENDA"
  }
};

const badgesEn = {
  title: "Badges",
  viewAll: "View all badges",
  noBadgesOwn: "You haven't earned any badges yet",
  noBadgesOther: "No badges earned",
  viewAllShort: "View all",
  earned: "earned",
  unearned: "unearned",
  allBadges: "All badges",
  earnedCount: "Earned ({count})",
  emptyMessageOwn: "You haven't earned any badges yet. Start collecting!",
  emptyMessageOther: "This user hasn't earned any badges yet.",
  earnedOn: "Earned on {date}",
  categories: {
    collector: { name: "Collector", description: "Copy collections to your library" },
    creator: { name: "Creator", description: "Create collections for the community" },
    reviewer: { name: "Reviewer", description: "Rate and review collections" },
    completionist: { name: "Completionist", description: "Complete collections to 100%" },
    trader: { name: "Trader", description: "Trade stickers successfully" },
    top_rated: { name: "Top Rated", description: "Maintain an excellent reputation" }
  },
  tiers: {
    bronze: "ACADEMY",
    silver: "STARTER",
    gold: "STAR",
    special: "LEGEND"
  }
};

const badgesPt = {
  title: "Conquistas",
  viewAll: "Ver todas as conquistas",
  noBadgesOwn: "Ainda não ganhou nenhuma conquista",
  noBadgesOther: "Sem conquistas ganhas",
  viewAllShort: "Ver todas",
  earned: "ganhas",
  unearned: "por ganhar",
  allBadges: "Todas as conquistas",
  earnedCount: "Ganhas ({count})",
  emptyMessageOwn: "Ainda não ganhou nenhuma conquista. Comece a colecionar!",
  emptyMessageOther: "Este utilizador ainda não ganhou conquistas.",
  earnedOn: "Ganha em {date}",
  categories: {
    collector: { name: "Colecionador", description: "Copie coleções para a sua biblioteca" },
    creator: { name: "Criador", description: "Crie coleções para a comunidade" },
    reviewer: { name: "Avaliador", description: "Avalie e comente coleções" },
    completionist: { name: "Completista", description: "Complete coleções a 100%" },
    trader: { name: "Negociador", description: "Troque cromos com sucesso" },
    top_rated: { name: "Bem Avaliado", description: "Mantenha uma excelente reputação" }
  },
  tiers: {
    bronze: "CANTERA",
    silver: "TITULAR",
    gold: "ESTRELA",
    special: "LENDA"
  }
};

dictionaries.forEach(({ file, locale }) => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (locale === 'es') data.badges = badgesEs;
    if (locale === 'en') data.badges = badgesEn;
    if (locale === 'pt') data.badges = badgesPt;
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    console.log(`Updated ${file}`);
  }
});
