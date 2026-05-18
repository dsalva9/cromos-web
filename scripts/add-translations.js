/* eslint-disable */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../src/i18n/messages');

const es = JSON.parse(fs.readFileSync(path.join(dir, 'es.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'));
const pt = JSON.parse(fs.readFileSync(path.join(dir, 'pt.json'), 'utf8'));

// ─── footer ───────────────────────────────────────────────────────────────────
es.footer.faq = 'FAQ';
es.footer.contact = 'Contacto';
es.footer.about = 'Sobre Nosotros';

en.footer.faq = 'FAQ';
en.footer.contact = 'Contact';
en.footer.about = 'About Us';

pt.footer.faq = 'FAQ';
pt.footer.contact = 'Contato';
pt.footer.about = 'Sobre Nós';

// ─── legal.faq ────────────────────────────────────────────────────────────────
es.legal.faq = {
  title: 'Preguntas Frecuentes',
  metaDescription: 'Respuestas a las preguntas más frecuentes sobre Cambiocromos.',
  q1: '¿Qué es Cambiocromos?',
  a1: 'Cambiocromos es una plataforma creada para ayudar a coleccionistas a intercambiar cromos de forma fácil, rápida y organizada.',
  q2: '¿La plataforma es gratuita?',
  a2: 'Sí. Actualmente Cambiocromos es totalmente gratuita.',
  q3: '¿Cómo funciona?',
  a3: 'En el marketplace encontrarás todos los cromos disponibles que ofrecen los usuarios de la comunidad, podrás contactar con ellos a través del chat y organizar el intercambio o la venta. Desde la sección de anuncios, tú podrás subir tus cromos repetidos para que otros usuarios contacten contigo.',
  q4: '¿Qué colecciones puedo encontrar?',
  a4: 'Podrás encontrar y copiar todas las colecciones que los usuarios creen en la plataforma de forma pública. Somos una comunidad muy activa y siempre encontrarás las últimas colecciones. También podrás crear tu propia colección o modificar las que hayas copiado.',
  q5: '¿Necesito quedar en persona para intercambiar?',
  a5: 'No necesariamente. Algunos usuarios prefieren quedar en persona y otros realizan intercambios por correo.',
  q6: '¿Cómo contacto con otros usuarios?',
  a6: 'Cuando encuentres un usuario compatible podrás ponerte en contacto con él para organizar el intercambio.',
  q7: '¿Puedo vender mis cromos?',
  a7: 'Sí. Puedes venderlos poniéndoles un valor al crear el anuncio. Aunque Cambiocromos no realiza arbitraje en las transacciones, ni actúa como soporte. Es responsabilidad del usuario tanto los acuerdos que realice como los datos que comparta. Para más información puedes revisar la <a href="/legal/privacy" class="text-gold hover:underline">Política de Privacidad</a> y los <a href="/legal/terms" class="text-gold hover:underline">Términos y Condiciones</a>.',
  q8: '¿Puedo reportar a un usuario?',
  a8: 'Sí. Si detectas comportamientos inapropiados o cualquier problema, puedes contactar con nosotros en: <a href="mailto:soporte@cambiocromos.com" class="text-gold hover:underline">soporte@cambiocromos.com</a>.',
  q9: '¿Quién está detrás de Cambiocromos?',
  a9: 'Somos Alberto, David y Marcos, tres amigos de Mallorca que decidimos crear una app para facilitar el intercambio de cromos entre coleccionistas.',
};

en.legal.faq = {
  title: 'Frequently Asked Questions',
  metaDescription: 'Answers to the most common questions about Cambiocromos.',
  q1: 'What is Cambiocromos?',
  a1: 'Cambiocromos is a platform created to help collectors trade stickers easily, quickly, and in an organized way.',
  q2: 'Is the platform free?',
  a2: 'Yes. Cambiocromos is currently completely free.',
  q3: 'How does it work?',
  a3: 'In the marketplace you will find all the stickers available from community members. You can contact them via chat to arrange a trade or sale. From the listings section, you can post your duplicate stickers so other users can reach out to you.',
  q4: 'What collections can I find?',
  a4: 'You can find and copy all collections that users create publicly on the platform. We are a very active community and you will always find the latest collections. You can also create your own collection or modify copied ones.',
  q5: 'Do I need to meet in person to trade?',
  a5: 'Not necessarily. Some users prefer to meet in person, while others trade by mail.',
  q6: 'How do I contact other users?',
  a6: 'When you find a compatible user, you can reach out to them to arrange the trade.',
  q7: 'Can I sell my stickers?',
  a7: 'Yes. You can sell them by setting a price when creating a listing. However, Cambiocromos does not mediate transactions and does not act as support. The user is responsible for any agreements made and data shared. For more information, please review our <a href="/legal/privacy" class="text-gold hover:underline">Privacy Policy</a> and <a href="/legal/terms" class="text-gold hover:underline">Terms and Conditions</a>.',
  q8: 'Can I report a user?',
  a8: 'Yes. If you detect inappropriate behavior or any problem, you can contact us at: <a href="mailto:soporte@cambiocromos.com" class="text-gold hover:underline">soporte@cambiocromos.com</a>.',
  q9: 'Who is behind Cambiocromos?',
  a9: 'We are Alberto, David and Marcos, three friends from Mallorca who decided to create an app to make sticker trading easier for collectors.',
};

pt.legal.faq = {
  title: 'Perguntas Frequentes',
  metaDescription: 'Respostas às perguntas mais frequentes sobre o Cambiocromos.',
  q1: 'O que é o Cambiocromos?',
  a1: 'O Cambiocromos é uma plataforma criada para ajudar colecionadores a trocar cromos de forma fácil, rápida e organizada.',
  q2: 'A plataforma é gratuita?',
  a2: 'Sim. O Cambiocromos é atualmente totalmente gratuito.',
  q3: 'Como funciona?',
  a3: 'No marketplace encontrará todos os cromos disponíveis que os utilizadores da comunidade oferecem. Pode contactá-los através do chat e organizar a troca ou venda. Na secção de anúncios, pode publicar os seus cromos duplicados para que outros utilizadores entrem em contacto consigo.',
  q4: 'Que coleções posso encontrar?',
  a4: 'Pode encontrar e copiar todas as coleções que os utilizadores criem publicamente na plataforma. Somos uma comunidade muito ativa e encontrará sempre as últimas coleções. Também pode criar a sua própria coleção ou modificar as que copiou.',
  q5: 'Preciso de me encontrar pessoalmente para trocar?',
  a5: 'Não necessariamente. Alguns utilizadores preferem encontrar-se pessoalmente, enquanto outros realizam trocas por correio.',
  q6: 'Como contacto outros utilizadores?',
  a6: 'Quando encontrar um utilizador compatível, pode entrar em contacto com ele para organizar a troca.',
  q7: 'Posso vender os meus cromos?',
  a7: 'Sim. Pode vendê-los definindo um valor ao criar o anúncio. No entanto, o Cambiocromos não realiza arbitragem nas transações, nem atua como suporte. É responsabilidade do utilizador os acordos que realize e os dados que partilhe. Para mais informações, consulte a nossa <a href="/legal/privacy" class="text-gold hover:underline">Política de Privacidade</a> e os <a href="/legal/terms" class="text-gold hover:underline">Termos e Condições</a>.',
  q8: 'Posso denunciar um utilizador?',
  a8: 'Sim. Se detetar comportamentos inapropriados ou qualquer problema, pode contactar-nos em: <a href="mailto:soporte@cambiocromos.com" class="text-gold hover:underline">soporte@cambiocromos.com</a>.',
  q9: 'Quem está por detrás do Cambiocromos?',
  a9: 'Somos Alberto, David e Marcos, três amigos de Maiorca que decidimos criar uma app para facilitar a troca de cromos entre colecionadores.',
};

// ─── legal.contact ────────────────────────────────────────────────────────────
es.legal.contact = {
  title: 'Contacto',
  metaDescription: 'Ponte en contacto con el equipo de Cambiocromos para dudas, problemas o sugerencias.',
  intro: '¿Tienes alguna duda, problema o sugerencia?',
  desc: 'En Cambiocromos intentamos mejorar la plataforma poco a poco y escuchar a la comunidad es una parte muy importante del proyecto.',
  reasonsTitle: 'Puedes escribirnos para:',
  reason1: 'Resolver problemas con tu cuenta',
  reason2: 'Dudas con el funcionamiento de la aplicación',
  reason3: 'Reportar errores o fallos',
  reason4: 'Informar sobre usuarios o comportamientos inapropiados',
  reason5: 'Proponer nuevas funcionalidades',
  reason6: 'Sugerir nuevas colecciones',
  reason7: 'Enviarnos cualquier idea para mejorar la plataforma',
  outro: 'Intentaremos responderte lo antes posible.',
  thanks: '¡Gracias por ayudarnos a seguir creciendo!',
};

en.legal.contact = {
  title: 'Contact',
  metaDescription: 'Get in touch with the Cambiocromos team for questions, issues, or suggestions.',
  intro: 'Do you have a question, problem, or suggestion?',
  desc: 'At Cambiocromos we work to improve the platform step by step, and listening to the community is a very important part of the project.',
  reasonsTitle: 'You can write to us to:',
  reason1: 'Resolve issues with your account',
  reason2: 'Ask questions about how the app works',
  reason3: 'Report bugs or errors',
  reason4: 'Report users or inappropriate behavior',
  reason5: 'Suggest new features',
  reason6: 'Suggest new collections',
  reason7: 'Share any idea to help improve the platform',
  outro: 'We will try to reply as soon as possible.',
  thanks: 'Thank you for helping us keep growing!',
};

pt.legal.contact = {
  title: 'Contacto',
  metaDescription: 'Entre em contacto com a equipa do Cambiocromos para dúvidas, problemas ou sugestões.',
  intro: 'Tem alguma dúvida, problema ou sugestão?',
  desc: 'No Cambiocromos tentamos melhorar a plataforma pouco a pouco e ouvir a comunidade é uma parte muito importante do projeto.',
  reasonsTitle: 'Pode escrever-nos para:',
  reason1: 'Resolver problemas com a sua conta',
  reason2: 'Dúvidas sobre o funcionamento da aplicação',
  reason3: 'Reportar erros ou falhas',
  reason4: 'Informar sobre utilizadores ou comportamentos inapropriados',
  reason5: 'Propor novas funcionalidades',
  reason6: 'Sugerir novas coleções',
  reason7: 'Enviar-nos qualquer ideia para melhorar a plataforma',
  outro: 'Tentaremos responder-lhe o mais brevemente possível.',
  thanks: 'Obrigado por nos ajudar a continuar a crescer!',
};

// ─── legal.about ──────────────────────────────────────────────────────────────
es.legal.about = {
  title: 'Sobre Nosotros',
  metaDescription: 'Conoce la historia detrás de Cambiocromos y al equipo que lo hace posible.',
  greeting: '¡Hola!',
  intro: 'Somos Alberto, David y Marcos, tres amigos de Mallorca unidos en este proyecto.',
  origin: 'La idea de Cambiocromos nació de una situación muy simple. A Marcos (y especialmente a sus hijos) les encanta hacer álbumes y completar colecciones. Pero como le ocurre a muchísima gente, acababa pasando horas buscando en foros, grupos y redes sociales los cromos que le faltaban, intentando encontrar a alguien con quien intercambiar.',
  spark: 'Un día comentó que debería existir una app para hacer esto mucho más fácil.',
  quote: 'Y ahí empezó todo.',
  start: 'David, profesional de la informática con muchos años de experiencia, y Alberto, al que le encanta crear y lanzar proyectos, lo tuvieron claro desde el primer momento: vamos a crear una app para intercambiar cromos.',
  team: 'Así nació Cambiocromos.',
  born: 'Lo que empezó como una idea entre amigos hoy se está convirtiendo poco a poco en una comunidad de coleccionistas que comparten la misma afición: completar álbumes, intercambiar cromos y disfrutar del hobby con otras personas.',
  community: '',
  mission: 'Nuestro objetivo es hacer que intercambiar cromos sea algo sencillo, rápido y accesible para cualquier coleccionista, además de seguir construyendo una comunidad cercana y activa alrededor de esta pasión.',
  cta: '¿Y esto no ha hecho más que empezar, te unes?',
  downloadTitle: 'Descarga la app',
};

en.legal.about = {
  title: 'About Us',
  metaDescription: 'Learn the story behind Cambiocromos and the team that makes it possible.',
  greeting: 'Hello!',
  intro: 'We are Alberto, David and Marcos, three friends from Mallorca united by this project.',
  origin: "The idea for Cambiocromos came from a very simple situation. Marcos (and especially his kids) love making albums and completing collections. But like so many people, he would end up spending hours searching forums, groups and social networks for the stickers he was missing, trying to find someone to trade with.",
  spark: 'One day he mentioned that there should be an app to make this much easier.',
  quote: "And that's where it all began.",
  start: "David, an IT professional with many years of experience, and Alberto, who loves creating and launching projects, knew immediately: let's build an app for trading stickers.",
  team: 'That is how Cambiocromos was born.',
  born: 'What started as an idea among friends is now slowly becoming a community of collectors who share the same passion: completing albums, trading stickers and enjoying the hobby with other people.',
  community: '',
  mission: 'Our goal is to make sticker trading something simple, fast and accessible for any collector, while continuing to build a close-knit and active community around this passion.',
  cta: 'This is just the beginning — want to join us?',
  downloadTitle: 'Download the app',
};

pt.legal.about = {
  title: 'Sobre Nós',
  metaDescription: 'Conheça a história por detrás do Cambiocromos e a equipa que o torna possível.',
  greeting: 'Olá!',
  intro: 'Somos Alberto, David e Marcos, três amigos de Maiorca unidos neste projeto.',
  origin: 'A ideia do Cambiocromos nasceu de uma situação muito simples. O Marcos (e especialmente os seus filhos) adoram fazer álbuns e completar coleções. Mas como acontece a muita gente, acabava por passar horas a pesquisar em fóruns, grupos e redes sociais os cromos que lhe faltavam, tentando encontrar alguém com quem trocar.',
  spark: 'Um dia comentou que devia existir uma app para tornar isso muito mais fácil.',
  quote: 'E foi aí que tudo começou.',
  start: 'O David, profissional de informática com muitos anos de experiência, e o Alberto, que adora criar e lançar projetos, tiveram a certeza desde o primeiro momento: vamos criar uma app para trocar cromos.',
  team: 'Assim nasceu o Cambiocromos.',
  born: 'O que começou como uma ideia entre amigos está hoje a tornar-se pouco a pouco numa comunidade de colecionadores que partilham a mesma paixão: completar álbuns, trocar cromos e desfrutar do hobby com outras pessoas.',
  community: '',
  mission: 'O nosso objetivo é tornar a troca de cromos algo simples, rápido e acessível para qualquer colecionador, além de continuar a construir uma comunidade próxima e ativa em torno desta paixão.',
  cta: 'E isto ainda mal começou — juntas-te a nós?',
  downloadTitle: 'Descarregar a app',
};

// ─── Write ────────────────────────────────────────────────────────────────────
fs.writeFileSync(path.join(dir, 'es.json'), JSON.stringify(es, null, 2), 'utf8');
fs.writeFileSync(path.join(dir, 'en.json'), JSON.stringify(en, null, 2), 'utf8');
fs.writeFileSync(path.join(dir, 'pt.json'), JSON.stringify(pt, null, 2), 'utf8');
console.log('All translations written successfully.');
