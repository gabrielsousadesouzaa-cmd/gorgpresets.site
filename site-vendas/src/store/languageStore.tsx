import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "PT" | "EN" | "ES" | "FR";

export const translations = {
  // Config
  welcome: { PT: "Bem-vindo à GORG PRESETS", EN: "Welcome to GORG PRESETS", ES: "Bienvenido a GORG PRESETS", FR: "Bienvenue chez GORG PRESETS" },
  modalDesc: { PT: "Selecione sua moeda e idioma de preferência para continuar.", EN: "Select your preferred currency and language to continue.", ES: "Seleccione su moneda e idioma preferidos para continuar.", FR: "Sélectionnez votre devise et langue préférées pour continuer." },
  confirmBtn: { PT: "Confirmar Acesso", EN: "Confirm Access", ES: "Confirmar Acceso", FR: "Confirmer l'Accès" },
  languageLabel: { PT: "IDIOMA", EN: "LANGUAGE", ES: "IDIOMA", FR: "LANGUE" },
  currencyLabel: { PT: "MOEDA", EN: "CURRENCY", ES: "MONEDA", FR: "DEVISE" },
  
  // Header
  catalog: { PT: "Catálogo", EN: "Catalog", ES: "Catálogo", FR: "Catalogue" },
  howItWorks: { PT: "Como Funciona", EN: "How it Works", ES: "Cómo Funciona", FR: "Comment ça Marche" },
  faq: { PT: "Dúvidas (FAQ)", EN: "FAQ", ES: "Preguntas (FAQ)", FR: "Questions (FAQ)" },
  login: { PT: "Entrar", EN: "Login", ES: "Entrar", FR: "Connexion" },
  currentCurrency: { PT: "Moeda:", EN: "Currency:", ES: "Moneda:", FR: "Devise:" },
  promoBar: { PT: "LEVE 3, PAGUE 2: ADICIONE 3 PRESETS E GANHE 1.", EN: "BUY 2, GET 1 FREE: ADD 3 PRESETS AND GET 1.", ES: "LLEVA 3, PAGA 2: AÑADE 3 PRESETS Y LLEVATE 1.", FR: "ACHETEZ-EN 2, OBTENEZ-EN 1 GRATUIT: AJOUTEZ 3 PRESETS ET OBTENEZ-EN 1." },
  navHome: { PT: "Início", EN: "Home", ES: "Inicio", FR: "Accueil" },
  navAllPresets: { PT: "TODOS OS PRESETS", EN: "ALL PRESETS", ES: "TODOS LOS PRESETS", FR: "TOUS LES PRESETS" },
  navContact: { PT: "Contacto", EN: "Contact", ES: "Contacto", FR: "Contact" },
  catDesktop: { PT: "Desktop", EN: "Desktop", ES: "Desktop", FR: "Bureau" },
  catMobile: { PT: "Mobile", EN: "Mobile", ES: "Mobile", FR: "Mobile" },
  catLandscape: { PT: "Paisagem", EN: "Landscape", ES: "Paisaje", FR: "Paysage" },
  catMinimalist: { PT: "Minimalista", EN: "Minimalist", ES: "Minimalista", FR: "Minimaliste" },
  catMoody: { PT: "Moody", EN: "Moody", ES: "Moody", FR: "Moody" },
  searchPlaceholder: { PT: "O que você está procurando?", EN: "What are you looking for?", ES: "¿Qué estás buscando?", FR: "Que cherchez-vous?" },
  searchEmpty: { PT: "Nenhum preset encontrado com esse nome.", EN: "No preset found with that name.", ES: "No se encontró ningún preset con ese nombre.", FR: "Aucun preset trouvé avec ce nom." },
  searchRealTime: { PT: "Digite para ver sugestões em tempo real", EN: "Type to see suggestions in real time", ES: "Escribe para ver sugerencias en tiempo real", FR: "Tapez pour voir les suggestions en temps réel" },
  memberArea: { PT: "Área de Membros", EN: "Members Area", ES: "Área de Miembros", FR: "Espace Membres" },
  memberAreaDesc: { PT: "Acesso Vitalício", EN: "Lifetime Access", ES: "Acceso Vitalicio", FR: "Accès à Vie" },
  // Hero
  heroTitle1: { PT: "Transforme com ", EN: "Transform with ", ES: "Transforma con ", FR: "Transformez avec " },
  heroTitle2: { PT: "estilo.", EN: "style.", ES: "estilo.", FR: "style." },
  heroSubtitle: { PT: "A paleta perfeita e profissional em apenas 1 clique.", EN: "The perfect and professional palette in just 1 click.", ES: "La paleta perfecta y profesional en solo 1 clic.", FR: "La palette parfaite et professionnelle en 1 seul clic." },
  
  // FAQ Page
  faqTag: { PT: "Dúvidas Resolvidas", EN: "Questions Resolved", ES: "Dudas Resueltas", FR: "Questions Résolues" },
  faqTitle1: { PT: "Tudo o que ", EN: "Everything ", ES: "Todo lo que ", FR: "Tout ce que " },
  faqTitle2: { PT: "Você Precisa", EN: "You Need", ES: "Necesitas", FR: "Vous Devez" },
  faqTitle3: { PT: "Saber.", EN: "To Know.", ES: "Saber.", FR: "Savoir." },
  faqSubtitle: { PT: "Preparamos um guia rápido para as dúvidas mais comuns. Se ainda precisar de algo, nosso suporte está a um clique.", EN: "We've prepared a quick guide for the most common questions. If you still need something, our support is one click away.", ES: "Hemos preparado una guía rápida para las dudas más comunes. Si aún necesitas algo, nuestro soporte está a un clic.", FR: "Nous avons préparé un guide rapide pour les questions courantes. Si vous avez besoin d'aide, notre support est à un clic." },
  faqQuestion1: { PT: "Como funciona a Área de Membros?", EN: "How does the Members Area work?", ES: "¿Cómo funciona el Área de Miembros?", FR: "Comment fonctionne l'Espace Membres?" },
  faqAnswer1: { PT: "Assim que sua compra for confirmada, você receberá um e-mail automático com seus dados de acesso exclusivos para a nossa Área de Membros. Lá, todos os presets que você adquiriu estarão com o acesso liberado imediatamente. Caso perca o seu e-mail de acesso, você pode entrar diretamente através de membros.gorgpresets.com. Lembre-se que todos os nossos presets acompanham vídeos práticos ensinando passo a passo como instalar, ajustar e editar suas fotos.", EN: "As soon as your purchase is confirmed, you will receive an automatic email with your exclusive access data to our Members Area. There, all the presets you bought will be available immediately. If you lose your access email, you can enter directly through membros.gorgpresets.com. Remember that all our presets come with practical videos teaching step by step how to install, adjust and edit your photos.", ES: "Tan pronto como se confirme su compra, recibirá un correo electrónico automático con sus datos de acceso exclusivos a nuestra Área de Miembros. Allí, todos los ajustes preestablecidos que compró estarán disponibles de inmediato. Si pierde su correo electrónico de acceso, puede ingresar directamente a través de membros.gorgpresets.com. Recuerde que todos nuestros ajustes preestablecidos vienen con videos prácticos que enseñan paso a paso cómo instalar, ajustar y editar sus fotos.", FR: "Dès que votre achat est confirmé, vous recevrez un e-mail automatique avec vos données d'accès exclusives à notre Espace Membres. Là, tous les presets achetés seront disponibles immédiatement. Si vous perdez votre e-mail d'accès, connectez-vous via membros.gorgpresets.com. Tous nos presets incluent des vidéos pratiques d'installation." },
  faqQuestion2: { PT: "O que são Lightroom Presets?", EN: "What are Lightroom Presets?", ES: "¿Qué son los Lightroom Presets?", FR: "Que sont les Presets Lightroom?" },
  faqAnswer2: { PT: "Presets são filtros profissionais criados para transformar suas fotos instantaneamente. Eles editam as cores, luzes e sombras para dar um visual cinematográfico com apenas um clique no seu celular ou computador.", EN: "Presets are professional filters created to transform your photos instantly. They edit colors, lights and shadows to give a cinematic look with just one click on your phone or computer.", ES: "Los presets son filtros profesionales creados para transformar tus fotos al instante. Editan colores, luces y sombras para dar un aspecto cinematográfico con solo un clic en tu teléfono o computadora.", FR: "Les presets sont des filtres professionnels créés pour transformer vos photos instantanément. Ils modifient les couleurs, lumières et ombres pour donner un look cinématographique en un clic sur votre téléphone ou ordinateur." },
  faqSupportTitle: { PT: "Suporte 24h", EN: "24h Support", ES: "Soporte 24h", FR: "Support 24h" },
  faqSupportDesc: { PT: "Não encontrou sua dúvida? Fale direto com um de nossos especialistas.", EN: "Didn't find your question? Talk directly to one of our specialists.", ES: "¿No encontraste tu duda? Habla directamente con uno de nuestros especialistas.", FR: "Vous n'avez pas trouvé votre réponse? Parlez directement à un spécialiste." },
  faqButtonSupport: { PT: "Chamar no Whatsapp", EN: "Call on Whatsapp", ES: "Llamar por Whatsapp", FR: "Appeler sur Whatsapp" },
  
  // Contact Page
  contactTag: { PT: "Suporte Premium GORG", EN: "GORG Premium Support", ES: "Soporte Premium GORG", FR: "Support Premium GORG" },
  contactTitle1: { PT: "Como podemos ", EN: "How can we ", ES: "¿Cómo podemos ", FR: "Comment pouvons-nous " },
  contactTitle2: { PT: "Ajudar?", EN: "Help?", ES: "Ayudar?", FR: "Aider?" },
  contactSubtitle: { PT: "Nossa equipe de especialistas está pronta para tirar suas dúvidas e ajudar você a elevar o nível das suas fotos.", EN: "Our team of experts is ready to answer your questions and help you raise the level of your photos.", ES: "Nuestro equipo de expertos está listo para responder sus preguntas y ayudarlo a elevar el nivel de sus fotos.", FR: "Notre équipe d'experts est prête à répondre à vos questions et vous aider à sublimer vos photos." },
  contactFormTitle: { PT: "Envie uma Mensagem", EN: "Send a Message", ES: "Enviar un Mensaje", FR: "Envoyer un Message" },
  contactFormSubtitle: { PT: "Responderemos em até 24 horas úteis. Prometemos que não vai demorar.", EN: "We will respond within 24 business hours. We promise it won't take long.", ES: "Responderemos en un plazo de 24 horas hábiles. Prometemos que no tardará mucho.", FR: "Nous répondrons sous 24 heures ouvrables. Promis, ce ne sera pas long." },
  contactFormName: { PT: "Como devemos te chamar?", EN: "What should we call you?", ES: "¿Cómo deberíamos llamarte?", FR: "Comment devons-nous vous appeler?" },
  contactFormEmail: { PT: "Seu melhor E-mail", EN: "Your best E-mail", ES: "Tu mejor E-mail", FR: "Votre meilleur E-mail" },
  contactFormSubject: { PT: "Qual o assunto principal?", EN: "What is the main subject?", ES: "¿Cuál es el asunto principal?", FR: "Quel est le sujet principal?" },
  contactFormMessage: { PT: "No que podemos ajudar?", EN: "How can we help?", ES: "¿En qué podemos ayudarte?", FR: "Comment pouvons-nous aider?" },
  contactFormButton: { PT: "Enviar Mensagem", EN: "Send Message", ES: "Enviar Mensaje", FR: "Envoyer le Message" },
  contactFormSending: { PT: "Enviando...", EN: "Sending...", ES: "Enviando...", FR: "Envoi..." },
  contactFormSuccess: { PT: "Enviado com Sucesso!", EN: "Sent Successfully!", ES: "¡Enviado con Éxito!", FR: "Envoyé avec Succès!" },
  contactBadge1: { PT: "Suporte Imediato", EN: "Immediate Support", ES: "Soporte Inmediato", FR: "Support Immédiat" },
  contactBadge2: { PT: "Atendimento Online", EN: "Online Support", ES: "Atención Online", FR: "Assistance en Ligne" },
  backToHome: { PT: "Voltar ao Início", EN: "Back to Home", ES: "Volver al Inicio", FR: "Retour à l'Accueil" },
  back: { PT: "Voltar", EN: "Back", ES: "Volver", FR: "Retour" },

  // Privacy Page
  privacyTag: { PT: "Privacidade e Segurança", EN: "Privacy and Security", ES: "Privacidad y Seguridad", FR: "Confidentialité et Sécurité" },
  privacyTitle1: { PT: "Política de ", EN: "Privacy ", ES: "Política de ", FR: "Politique de " },
  privacyTitle2: { PT: "Privacidade", EN: "Policy", ES: "Privacidad", FR: "Confidentialité" },
  privacySubtitle: { PT: "Privacidade total. Seus dados estão seguros conosco.", EN: "Full privacy. Your data is safe with us.", ES: "Privacidad total. Sus datos están seguros con nosotros.", FR: "Confidentialité totale. Vos données sont en sécurité." },
  privacyCard1Title: { PT: "Dados Criptografados", EN: "Encrypted Data", ES: "Datos Encriptados", FR: "Données Cryptées" },
  privacyCard1Desc: { PT: "Usamos tecnologia de ponta para garantir que suas informações sejam ilegíveis para terceiros.", EN: "We use state-of-the-art technology to ensure your information is unreadable to third parties.", ES: "Utilizamos tecnología de punta para garantizar que su información sea ilegible para terceros.", FR: "Nous utilisons une technologie de pointe pour que vos informations soient illisibles pour les tiers." },
  privacyCard2Title: { PT: "Zero Spam", EN: "Zero Spam", ES: "Cero Spam", FR: "Zéro Spam" },
  privacyCard2Desc: { PT: "Nunca venderemos ou compartilharemos seus dados com parceiros externos.", EN: "We will never sell or share your data with external partners.", ES: "Nunca venderemos ni compartiremos sus datos con socios externos.", FR: "Nous ne vendrons ni ne partagerons jamais vos données avec des partenaires." },
  privacyCard3Title: { PT: "Conformidade Total", EN: "Full Compliance", ES: "Cumplimiento Total", FR: "Conformité Totale" },
  privacyCard3Desc: { PT: "Operamos 100% de acordo com as leis europeias (GDPR) e brasileiras (LGPD).", EN: "We operate 100% in accordance with European (GDPR) and Brazilian (LGPD) laws.", ES: "Operamos 100% de acuerdo con las leyes europeas (GDPR) y brasileñas (LGPD).", FR: "Nous opérons 100% selon les lois européennes (RGPD) et brésiliennes (LGPD)." },
  privacySec1Title: { PT: "Coleta de Informações", EN: "Information Collection", ES: "Recopilación de Información", FR: "Collecte d'Informations" },
  privacySec1Desc: { PT: "Coletamos apenas as informações necessárias para processar seu pedido: Nome, Email e Dados de Pagamento. Todos os pagamentos e transações financeiras são processados de forma 100% segura e criptografada pelo GG Checkout, e nenhum dado sensível de cartão é armazenado em nossos servidores.", EN: "We only collect the information necessary to process your order: Name, Email and Payment Data. All payments and financial transactions are processed in a 100% secure and encrypted way by GG Checkout, and no sensitive card data is stored on our servers.", ES: "Solo recopilamos la información necesaria para procesar su pedido: Nombre, Correo electrónico y Datos de pago. Todos los pagos y transacciones financieras son procesados de forma 100% segura y encriptada por GG Checkout, y no se almacenan datos confidenciales de tarjetas en nuestros servidores.", FR: "Nous collectons uniquement les infos nécessaires: Nom, Email, Paiement. Les paiements sont cryptés par GG Checkout et nous ne stockons pas vos données de carte." },
  privacySec2Title: { PT: "O que fazemos com os dados", EN: "What we do with the data", ES: "Qué hacemos con los datos", FR: "Ce que nous faisons des données" },
  privacySec2Desc: { PT: "Seu email é utilizado exclusivamente para: Envio dos links de download, confirmação do pedido e envio de novidades do site (apenas se você autorizar no momento do checkout).", EN: "Your email is used exclusively for: Sending download links, order confirmation and sending site news (only if you authorize at the time of checkout).", ES: "Su correo electrónico se utiliza exclusivamente para: envío de enlaces de descarga, confirmación del pedido y envío de noticias del sitio (solo si lo autoriza al realizar el pago).", FR: "Votre email sert uniquement pour: Envoi des liens de téléchargement, confirmation de commande et actualités (si autorisé)." },

  // Footer / Support
  supportWhatsApp: { PT: "Whatsapp:", EN: "Whatsapp:", ES: "Whatsapp:", FR: "Whatsapp:" },
  supportEmail: { PT: "Email:", EN: "Email:", ES: "Correo electrónico:", FR: "Email:" },
  supportHours: { PT: "08:00h às 18:00h", EN: "08:00 AM to 06:00 PM", ES: "08:00h a 18:00h", FR: "08:00h à 18:00h" },
  supportDays: { PT: "Seg-Sex:", EN: "Mon-Fri:", ES: "Lun-Vie:", FR: "Lun-Ven:" },
  countryBR: { PT: "Real (BRL R$)", EN: "Real (BRL R$)", ES: "Real (BRL R$)", FR: "Real (BRL R$)" },
  countryUS: { PT: "Dólar (USD $)", EN: "Dollar (USD $)", ES: "Dólar (USD $)", FR: "Dollar (USD $)" },
  countryPT: { PT: "Euro (EUR €)", EN: "Euro (EUR €)", ES: "Euro (EUR €)", FR: "Euro (EUR €)" },

  // Testimonials
  testiTitle1: { PT: "Feedbacks", EN: "Feedbacks", ES: "Comentarios", FR: "Témoignages" },
  testiTitle2: { PT: "", EN: "", ES: "", FR: "" },
  
  // Editing Banner
  editingTitle: { PT: "Edição ", EN: "Uncomplicated ", ES: "Edición ", FR: "Édition " },
  editingTitle2: { PT: "descomplicada", EN: "editing", ES: "sin complicaciones", FR: "sans complications" },
  editingDesc: { PT: "Desenvolvido por profissionais para acelerar o seu fluxo de edição em segundos com 1 clique.", EN: "Developed by professionals to speed up your editing workflow in seconds with 1 click.", ES: "Desarrollado por profesionales para acelerar tu flujo de edición en segundos con 1 clic.", FR: "Développé par des pros pour accélérer votre flux de travail en quelques secondes en 1 clic." },
  ebDesc2: { PT: "Explore nossas coleções e descubra o potencial máximo de cada clique agora mesmo.", EN: "Explore our collections and discover the full potential of every click right now.", ES: "Explore nuestras colecciones y descubra el máximo potencial de cada clic ahora mismo.", FR: "Explorez nos collections et découvrez le plein potentiel de chaque clic dès maintenant." },

  // Product Descriptions
  desc_1: { PT: "Transforme sua foto num aesthetic monocromático profundo.", EN: "Transform your photo into a deep monochromatic aesthetic.", ES: "Transforma tu foto en una profunda estética monocromática.", FR: "Transformez votre photo en une esthétique monochrome profonde." },
  desc_2: { PT: "Tons quentes para suas fotos de praia.", EN: "Warm tones for your beach photos.", ES: "Tonos cálidos para tus fotos de playa.", FR: "Tons chauds pour vos photos de plage." },
  desc_3: { PT: "Minimalista, cores sóbrias e elegantes.", EN: "Minimalist, sober and elegant colors.", ES: "Minimalista, colores sobrios y elegantes.", FR: "Minimaliste, couleurs sobres et élégantes." },
  desc_4: { PT: "Cores coesas e pasteis para o seu feed.", EN: "Cohesive and pastel colors for your feed.", ES: "Colores cohesivos y pasteles para tu feed.", FR: "Couleurs cohésives et pastel pour votre feed." },
  desc_5: { PT: "Foco nos tons azulados para fotos no frio.", EN: "Focus on bluish tones for cold photos.", ES: "Enfoque en tonos azulados para fotos con frío.", FR: "Focus sur les tons bleutés pour les photos au froid." },
  desc_6: { PT: "Ressalta os verdes vibrantes em fotos de campo.", EN: "Highlights vibrant greens in field photos.", ES: "Resalta los verdes vibrantes en fotos de campo.", FR: "Met en valeur les verts vibrants sur les photos de terrain." },
  desc_7: { PT: "Vintage luxuoso para lifestyle europeu.", EN: "Luxurious vintage for European lifestyle.", ES: "Vintage lujoso para estilo de vida europeo.", FR: "Vintage luxueux pour un style de vie européen." },
  desc_8: { PT: "Pôr do sol e ares dourados nas suas fotos.", EN: "Sunsets and golden air in your photos.", ES: "Puestas de sol y aire dorado en tus fotos.", FR: "Couchers de soleil et air doré sur vos photos." },

  // Index Titles
  newArrivals: { PT: "Novidades Exclusivas", EN: "Exclusive Arrivals", ES: "Novedades Exclusivas", FR: "Nouveautés Exclusives" },
  bestSellers: { PT: "Best Sellers", EN: "Best Sellers", ES: "Los Más Vendidos", FR: "Meilleures Ventes" },
  bestSellersDesc: { PT: "Descubra os presets mais baixados e amados pela galera. Escolha as edições que são tendência e eleve o nível das suas fotos agora.", EN: "Discover the most downloaded and loved presets by our community. Choose the trending editions and elevate your photos now.", ES: "Descubre los presets más descargados y amados por la comunidad. Elige las ediciones que son tendencia y eleva el nivel de tus fotos ahora.", FR: "Découvrez les presets les plus téléchargés. Choisissez les éditions tendance et sublimez vos photos maintenant." },
  allPresets: { PT: "Todos os Presets", EN: "All Presets", ES: "Todos los Presets", FR: "Tous les Presets" },
  viewFullCatalog: { PT: "Ver Catálogo Completo", EN: "View Full Catalog", ES: "Ver Catálogo Completo", FR: "Voir le Catalogue Complet" },
  categories: { PT: "Categorias", EN: "Categories", ES: "Categorías", FR: "Catégories" },
  
  // Cart / Button
  addToCart: { PT: "ADD AO CARRINHO", EN: "ADD TO CART", ES: "ADD AL CARRITO", FR: "AJOUTER AU PANIER" },
  addedToCart: { PT: "PRODUTO ADICIONADO!", EN: "PRODUCT ADDED!", ES: "¡PRODUCTO AÑADIDO!", FR: "PRODUIT AJOUTÉ!" },
  alreadyInCart: { PT: "Este preset já está no seu carrinho", EN: "This preset is already in your cart", ES: "Este preset ya está en tu carrito", FR: "Ce preset est déjà dans votre panier" },
  cartTitle: { PT: "Seu Carrinho", EN: "Your Cart", ES: "Tu Carrito", FR: "Votre Panier" },
  emptyCart: { PT: "Seu carrinho está vazio.", EN: "Your cart is empty.", ES: "Tu carrito está vacío.", FR: "Votre panier est vide." },
  continueShopping: { PT: "Continuar Comprando", EN: "Continue Shopping", ES: "Seguir Comprando", FR: "Continuer les Achats" },
  subtotal: { PT: "Subtotal", EN: "Subtotal", ES: "Subtotal", FR: "Sous-total" },
  discountCoupon: { PT: "Desconto", EN: "Discount", ES: "Descuento", FR: "Réduction" },
  total: { PT: "Total", EN: "Total", ES: "Total", FR: "Total" },
  checkout: { PT: "Finalizar Compra", EN: "Checkout", ES: "Finalizar Compra", FR: "Finaliser l'Achat" },
  free: { PT: "GRÁTIS", EN: "FREE", ES: "GRATIS", FR: "GRATUIT" },
  viewDetails: { PT: "VER DETALHES", EN: "VIEW DETAILS", ES: "VER DETALLES", FR: "VOIR DÉTAILS" },

  // Announcements
  announcement: { PT: "OFERTA ESPECIAL: LEVE 3, PAGUE 2 EM TODO O SITE!", EN: "SPECIAL OFFER: BUY 2, GET 1 FREE SITEWIDE!", ES: "OFERTA ESPECIAL: ¡LLEVA 3, PAGA 2 EN TODO EL SITIO!", FR: "OFFRE SPÉCIALE: ACHETEZ-EN 2, OBTENEZ-EN 1 GRATUIT SUR TOUT LE SITE!" },

  // Categories Text
  cat1: { PT: "Negócios", EN: "Business", ES: "Negocios", FR: "Affaires" },
  cat2: { PT: "Lifestyle", EN: "Lifestyle", ES: "Lifestyle", FR: "Lifestyle" },
  cat3: { PT: "Essential", EN: "Essential", ES: "Essential", FR: "Essentiel" },
  cat4: { PT: "Travel", EN: "Travel", ES: "Travel", FR: "Voyage" },
  cat5: { PT: "Creative", EN: "Creative", ES: "Creative", FR: "Créatif" },
  catAll: { PT: "Todos os Presets", EN: "All Presets", ES: "Todos los Presets", FR: "Tous les Presets" },
  catNav: { PT: "Navegação", EN: "Navigation", ES: "Navegación", FR: "Navigation" },
  catFilter: { PT: "Filtrar por Coleção", EN: "Filter by Collection", ES: "Filtrar por Colección", FR: "Filtrer par Collection" },
  catShowing: { PT: "Exibindo", EN: "Showing", ES: "Mostrando", FR: "Affichage" },
  catItems: { PT: "itens encontrados", EN: "items found", ES: "ítems encontrados", FR: "articles trouvés" },
  catSort: { PT: "Ordenar por:", EN: "Sort by:", ES: "Ordenar por:", FR: "Trier par:" },
  catView: { PT: "Visualização:", EN: "View:", ES: "Visualización:", FR: "Vue:" },
  catEmpty: { PT: "Ops! Nenhum preset encontrado", EN: "Oops! No preset found", ES: "¡Ops! No se encontró el preset", FR: "Oups! Aucun preset trouvé" },
  catEmptyBtn: { PT: "Resetar Coleção", EN: "Reset Collection", ES: "Resetear Colección", FR: "Réinitialiser la Collection" },
  
  sortBestseller: { PT: "Mais Vendidos", EN: "Bestsellers", ES: "Más Vendidos", FR: "Meilleures Ventes" },
  sortPriceAsc: { PT: "Menor Preço", EN: "Price (Low-High)", ES: "Menor Precio", FR: "Prix (Croissant)" },
  sortPriceDesc: { PT: "Maior Preço", EN: "Price (High-Low)", ES: "Mayor Precio", FR: "Prix (Décroissant)" },
  sortAz: { PT: "Nome (A-Z)", EN: "Name (A-Z)", ES: "Nombre (A-Z)", FR: "Nom (A-Z)" },
  or: { PT: "ou", EN: "or", ES: "o", FR: "ou" },

  // Testimonials Texts (Fallback translation)
  test1Text: { PT: "Fiquei impressionada com a diferença! O feed ficou super organizado e lindo. Já testei em várias fotos e todas ficaram maravilhosas, parecem de revista.", EN: "I was impressed with the difference! The feed is super organized and beautiful. Really looks like a magazine.", ES: "¡Me impresionó la diferencia! El feed quedó súper organizado y hermoso. Parecen de revista.", FR: "J'ai été impressionnée par la différence! Le feed est magnifique. On dirait un magazine." },
  test2Text: { PT: "Achei bem fácil de usar. Não manjo nada de edição de foto, mas agora é só colocar o filtro e a foto já fica com outra qualidade. Parabéns a equipe pelo resultado final.", EN: "Very easy to use. I don't know much about editing, but this gave professional results with just one click.", ES: "Muy fácil de usar. No sé de edición, pero ahora solo pongo el filtro y la foto queda con otra calidad.", FR: "Très facile à utiliser. Je ne m'y connais pas en retouche, mais cela donne des résultats pro en un clic." },
  test3Text: { PT: "Finalmente consegui deixar meu feed organizado! Economizo horas que passava editando. Valeu cada centavo investido. Comprem sem medo.", EN: "Saved me hours of editing. Worth every penny. Buy without fear.", ES: "¡Ahorré horas que pasaba editando! Valió cada centavo invertido. Compren sin miedo.", FR: "J'ai économisé des heures de retouche. Ça vaut chaque centime. Achetez sans crainte." },
  test4Text: { PT: "Os presets salvaram minhas fotos da viagem! Um visual muito estético. Melhor compra que fiz pro meu Instagram. O suporte foi incrivel também.", EN: "They saved my travel photos! Very aesthetic. Best purchase for my Insta ever. Great support too.", ES: "¡Salvaron mis fotos de viaje! Un visual muy estético. La mejor compra para mi Instagram.", FR: "Ils ont sauvé mes photos de voyage! Très esthétique. Meilleur achat pour mon Insta." },

  // Features
  feat1Title: { PT: "Download Instantâneo", EN: "Instant Download", ES: "Descarga Instantánea", FR: "Téléchargement Instantané" },
  feat1Desc: { PT: "Receba o acesso no exato momento após o pagamento.", EN: "Access immediately after payment.", ES: "Recibe el acceso en el momento posterior al pago.", FR: "Accès immédiat après paiement." },
  feat2Title: { PT: "Compra Segura", EN: "Secure Switch", ES: "Compra Segura", FR: "Achat Sécurisé" },
  feat2Desc: { PT: "Ambiente de compra criptografado e confiável.", EN: "Encrypted and highly reliable shopping environment.", ES: "Entorno de compra encriptado y confiable.", FR: "Environnement d'achat crypté et hautement fiable." },
  feat3Title: { PT: "Satisfação Garantida", EN: "Satisfaction Guaranteed", ES: "Satisfacción Garantizada", FR: "Satisfaction Garantie" },
  feat3Desc: { PT: "Presets testados e aprovados para resultados incríveis.", EN: "Approved presets for an incredible outcome.", ES: "Presets probados y aprobados.", FR: "Presets approuvés pour un résultat incroyable." },
  feat4Title: { PT: "Suporte Imediato", EN: "Immediate Support", ES: "Soporte Inmediato", FR: "Support Immédiat" },
  feat4Desc: { PT: "Ajuda personalizada sempre que precisar.", EN: "Personalized help whenever you need it.", ES: "Ayuda personalizada siempre que lo necesites.", FR: "Aide personnalisée dès que vous en avez besoin." },
  feat5Title: { PT: "Mobile & Desktop", EN: "Mobile & Desktop", ES: "Mobile & Desktop", FR: "Mobile & Bureau" },
  feat5Desc: { PT: "Filtros compatíveis com todas as versões do Lightroom.", EN: "Compatible with all Lightroom versions.", ES: "Filtros compatibles con todas las versiones de Lightroom.", FR: "Compatible avec toutes les versions de Lightroom." },

  // Installation Guide
  guideTitle: { PT: "Extremamente Fácil de Usar", EN: "Extremely Easy to Use", ES: "Extremadamente Fácil de Usar", FR: "Extrêmement Facile à Utiliser" },
  guideSubtitle: { PT: "Esqueça computadores ou horas editando. Tudo é feito pelo celular em segundos.", EN: "Forget computers or hours editing. Everything is done on mobile in seconds.", ES: "Olvida los ordenadores o las horas de edición. Todo se hace en el móvil en segundos.", FR: "Oubliez les ordinateurs. Tout se fait sur mobile en quelques secondes." },
  step1Title: { PT: "1. App Gratuito", EN: "1. Free App", ES: "1. App Gratis", FR: "1. App Gratuite" },
  step1Desc: { PT: "Baixe o Adobe Lightroom Mobile. É 100% gratuito e seguro.", EN: "Download Adobe Lightroom Mobile. It's 100% free and safe.", ES: "Descarga Adobe Lightroom Mobile. Es 100% gratis y seguro.", FR: "Téléchargez Adobe Lightroom Mobile. C'est gratuit et sécurisé." },
  step2Title: { PT: "2. Importe o Preset", EN: "2. Import Preset", ES: "2. Importa el Preset", FR: "2. Importez le Preset" },
  step2Desc: { PT: "Você recebe o link no email e instala o preset na sua galeria com apenas 1 clique.", EN: "You get the link by email and install the preset to your gallery with just 1 click.", ES: "Recibes el enlace por email e instalas el preset en tu galería con solo 1 clic.", FR: "Recevez le lien par e-mail et installez en 1 clic." },
  step3Title: { PT: "3. Copie e Arrase!", EN: "3. Copy & Shine!", ES: "3. ¡Copia y Brilla!", FR: "3. Copiez et Brillez !" },
  step3Desc: { PT: "Abra sua foto crua, cole as nossas configurações mágicas e poste!", EN: "Open your raw photo, paste our magic settings and post!", ES: "Abre tu foto cruda, pega nuestra configuración mágica y ¡publica!", FR: "Ouvrez votre photo, collez les réglages et publiez !" },

  // Bundles
  bundleTitle: { PT: "Escolha o Seu Pacote", EN: "Choose Your Bundle", ES: "Elige tu Paquete", FR: "Choisissez Votre Pack" },
  bundleSubtitle: { PT: "Leve a coleção completa e economize em até 60% com os nossos combos", EN: "Get the full collection and save up to 60% with our combos", ES: "Llévate la colección completa y ahorra hasta un 60% con nuestros combos", FR: "Prenez la collection complète et économisez jusqu'à 60%." },
  bundleOption1: { PT: "Opção 1", EN: "Option 1", ES: "Opción 1", FR: "Option 1" },
  bundleOption2: { PT: "Opção 2", EN: "Option 2", ES: "Opción 2", FR: "Option 2" },
  bundleMaster: { PT: "MASTER VITALÍCIO", EN: "LIFETIME MASTER", ES: "MASTER VITALICIO", FR: "MASTER À VIE" },
  bundleFullColl: { PT: "A coleção completa", EN: "The full collection", ES: "La colección completa", FR: "La collection complète" },
  bundleChoose2: { PT: "Escolha 2 Presets Individuais", EN: "Choose 2 Individual Presets", ES: "Elige 2 Presets Individuales", FR: "Choisissez 2 Presets Individuels" },
  bundleChoose5: { PT: "Escolha até 5 Presets", EN: "Choose up to 5 Presets", ES: "Elige hasta 5 Presets", FR: "Choisissez jusqu'à 5 Presets" },
  bundleEasyInstall: { PT: "Instalação descompliada em 1 Clique", EN: "Easy 1-Click Installation", ES: "Instalación fácil en 1 clic", FR: "Installation facile en 1 clic" },
  bundleFutureUpdates: { PT: "Acesso à futuras atualizações", EN: "Access to future updates", ES: "Acceso a futuras actualizaciones", FR: "Accès aux futures mises à jour" },
  bundleExploreIndiv: { PT: "Explorar Presets Individuais", EN: "Explore Individual Presets", ES: "Explorar Presets Individuales", FR: "Explorer les Presets Individuels" },
  bundleAllUnlocked: { PT: "Todos os Presets da Loja Liberados", EN: "All Store Presets Unlocked", ES: "Todos los Presets de la Tienda Liberados", FR: "Tous les Presets Débloqués" },
  bundleTotalCompat: { PT: "Compatibilidade Total (Mobile e Desktop)", EN: "Full Compatibility (Mobile & Desktop)", ES: "Compatibilidad Total (Móvil y Escritorio)", FR: "Compatibilité Totale (Mobile & Bureau)" },
  bundleLifetimeGuar: { PT: "Acesso Vitalício Garantido", EN: "Guaranteed Lifetime Access", ES: "Acceso Vitalicio Garantizado", FR: "Accès à Vie Garanti" },
  bundleFutureFree: { PT: "Todas Atualizações Futuras Inclusas Grátis", EN: "All Future Updates Included Free", ES: "Todas las Actualizaciones Futuras Incluidas Gratis", FR: "Mises à Jour Futures Gratuites" },
  bundleGetFull: { PT: "Quero a Coleção Completa", EN: "I Want the Full Collection", ES: "Quiero la Colección Completa", FR: "Je Veux la Collection Complète" },
  bundleBuildPack: { PT: "Montar Meu Pack", EN: "Build My Pack", ES: "Montar Mi Pack", FR: "Créer Mon Pack" },

  // Footer
  footerAboutKey: { PT: "SOBRE GORG PRESETS", EN: "ABOUT GORG PRESETS", ES: "ACERCA DE GORG PRESETS", FR: "À PROPOS DE GORG PRESETS" },
  footerAboutPara: { PT: "Nossa missão é simplificar sua edição através de presets exclusivos e versáteis. Com poucos cliques, você garante consistência visual e cores incríveis, economizando tempo sem abrir mão da exclusividade.", EN: "Our mission is to simplify your editing through exclusive and versatile presets. With just a few clicks, you guarantee visual consistency and incredible colors, saving time without giving up exclusivity.", ES: "Nuestra misión es simplificar su edición a través de presets exclusivos y versátiles. Con solo unos pocos clics, garantiza una consistencia visual y colores increíbles, ahorrando tiempo sin renunciar a la exclusividad.", FR: "Notre mission est de simplifier votre édition grâce à des presets exclusifs. En quelques clics, garantissez la cohérence visuelle et économisez du temps." },
  footerInfoKey: { PT: "INFORMAÇÕES", EN: "INFORMATION", ES: "INFORMACIÓN", FR: "INFORMATION" },
  footerFaq: { PT: "Perguntas Frequentes", EN: "Frequently Asked Questions", ES: "Preguntas Frecuentes", FR: "Foire Aux Questions" },
  footerContact: { PT: "Contato", EN: "Contact", ES: "Contacto", FR: "Contact" },
  footerTerms: { PT: "Termos de uso", EN: "Terms of use", ES: "Términos de uso", FR: "Conditions d'utilisation" },
  footerShipping: { PT: "Política de Envio", EN: "Shipping Policy", ES: "Política de envío", FR: "Politique d'expédition" },
  footerRefund: { PT: "Política de Reembolso", EN: "Refund Policy", ES: "Política de reembolso", FR: "Politique de remboursement" },
  footerPrivacy: { PT: "Política de Privacidade", EN: "Privacy Policy", ES: "Política de privacidad", FR: "Politique de confidentialité" },
  footerSupportKey: { PT: "ATENDIMENTO ONLINE", EN: "ONLINE SUPPORT", ES: "ATENCIÓN EN LÍNEA", FR: "ASSISTANCE EN LIGNE" },
  footerWeAccept: { PT: "Nós aceitamos", EN: "We accept", ES: "Nosotros aceptamos", FR: "Nous acceptons" },

  // Product Detail (PD)
  pdSoldCount: { PT: "1540 VENDIDOS", EN: "1540 SOLD", ES: "1540 VENDIDOS", FR: "1540 VENDUS" },
  pdOriginalBadge: { PT: "PRESET ORIGINAL GORG", EN: "ORIGINAL GORG PRESET", ES: "PRESET ORIGINAL GORG", FR: "PRESET ORIGINAL GORG" },
  pdDiscountTag: { PT: "50% OFF", EN: "50% OFF", ES: "50% DTO", FR: "-50%" },
  pdInstallments: { PT: "Parcelado", EN: "Installments", ES: "Cuotas", FR: "En plusieurs fois" },
  pdPixPrice: { PT: "À vista (Pix)", EN: "One-time (Pix/Cards)", ES: "Pago único (Pix/Cards)", FR: "Paiement unique" },
  pdInstallmentText: { PT: "12x de", EN: "12x of", ES: "12x de", FR: "12x de" },
  pdBuyNow: { PT: "COMPRAR AGORA", EN: "BUY NOW", ES: "COMPRAR AHORA", FR: "ACHETER MAINTENANT" },
  pdSecurePayment: { PT: "PAGAMENTO 100% SEGURO", EN: "100% SECURE PAYMENT", ES: "PAGO 100% SEGURO", FR: "PAIEMENT 100% SÉCURISÉ" },
  pdDescTitle: { PT: "Descrição do Pack", EN: "Pack Description", ES: "Descripción del Pack", FR: "Description du Pack" },
  pdEstheticTitle: { PT: "ESTÉTICA DO PRESET", EN: "PRESET ESTHETICS", ES: "ESTÉTICA DEL PRESET", FR: "ESTHÉTIQUE DU PRESET" },
  pdIncludedTitle: { PT: "O QUE ESTÁ INCLUSO", EN: "WHAT'S INCLUDED", ES: "QUÉ ESTÁ INCLUIDO", FR: "CE QUI EST INCLUS" },
  pdIdealTitle: { PT: "IDEAL PARA", EN: "IDEAL FOR", ES: "IDEAL PARA", FR: "IDÉAL POUR" },
  pdSafetyTitle: { PT: "Pagamento e segurança", EN: "Payment and security", ES: "Pago y seguridad", FR: "Paiement et sécurité" },
  pdSafetyDesc: { PT: "Suas informações de pagamento são processadas com segurança. Nós não armazenamos dados do cartão de crédito nem temos acesso aos números do seu cartão.", EN: "Your payment information is processed securely. We do not store credit card details nor have access to your card numbers.", ES: "Su información de pago se procesa de forma segura. No almacenamos los datos de la tarjeta de crédito ni tenemos acceso aos números da sua tarjeta.", FR: "Vos informations sont traitées en toute sécurité. Nous ne stockons pas les détails de carte de crédit." },
  pdYouMayLike: { PT: "Você pode gostar", EN: "You may like", ES: "Te puede gustar", FR: "Vous pourriez aimer" },
  pdHomeBreadcrumb: { PT: "Página Inicial", EN: "Home", ES: "Inicio", FR: "Accueil" },
  pdProductsBreadcrumb: { PT: "Produtos", EN: "Products", ES: "Productos", FR: "Produits" },
  pdHintDesktop: { PT: "Passe o mouse ou role para aproximar", EN: "Hover or scroll to zoom", ES: "Pasa el mouse o desplaza para acercar", FR: "Survolez ou faites défiler pour zoomer" },
  pdHintMobile: { PT: "Use os botões ou as fotos abaixo", EN: "Use buttons or thumbnails below", ES: "Usa los botones o las fotos inferiores", FR: "Utilisez les boutons ou les miniatures ci-dessous" },
  pdInternationalTitle: { PT: "ENTREGA DIGITAL", EN: "DIGITAL DELIVERY", ES: "ENTREGA DIGITAL", FR: "LIVRAISON NUMÉRIQUE" },
  pdInternationalAccess: { PT: "Acesso Imediato via E-mail", EN: "Instant Access via Email", ES: "Acceso Inmediato por Email", FR: "Accès Instantané par E-mail" },
  pdInternationalCompatible: { PT: "Compatível com Mobile & Desktop", EN: "Mobile & Desktop Compatible", ES: "Compatible con Mobile & Desktop", FR: "Compatible Mobile & Bureau" },
  pdInternationalLifetime: { PT: "Download Vitalício", EN: "Lifetime Download", ES: "Descarga Vitalicia", FR: "Téléchargement à Vie" },
  pdBadgeWarranty: { PT: "7 dias de garantia", EN: "7-day guarantee", ES: "7 días de garantía", FR: "Garantie 7 jours" },
  pdBadgeSecure: { PT: "Pagamento 100% seguro", EN: "100% secure payment", ES: "Pago 100% seguro", FR: "Paiement 100% sécurisé" },
  pdBadgeInstant: { PT: "Envio imediato via e-mail", EN: "Instant email delivery", ES: "Envío inmediato por e-mail", FR: "Livraison instantanée par e-mail" },

  faqNote: { PT: "Os presets são produtos digitais de entrega imediata. Verifique seu e-mail (incluindo spam) após a confirmação do pagamento.", EN: "Presets are digital products with immediate delivery. Please check your email (including spam) after payment confirmation.", ES: "Los presets son productos digitales de entrega inmediata. Verifique su correo electrónico (incluido el spam) después de la confirmación del pago.", FR: "Les presets sont des produits numériques. Vérifiez votre e-mail (y compris les spams) après le paiement." },

  // Shipping Page
  shippingTitle1: { PT: "Política de ", EN: "Shipping ", ES: "Política de ", FR: "Politique de " },
  shippingTitle2: { PT: "Envio", EN: "Policy", ES: "Envío", FR: "Livraison" },
  shippingSubtitle: { PT: "Entregas digitais seguras e automáticas para qualquer lugar do mundo.", EN: "Secure and automatic digital deliveries anywhere in the world.", ES: "Entregas digitales seguras y automáticas a cualquier parte del mundo.", FR: "Livraisons numériques sécurisées partout dans le monde." },
  shippingCard1Title: { PT: "Envio Imediato", EN: "Immediate Shipping", ES: "Envío Inmediato", FR: "Expédition Immédiate" },
  shippingCard1Desc: { PT: "O download é liberado automaticamente após a aprovação do pagamento.", EN: "Download is automatically released after payment approval.", ES: "La descarga se libera automáticamente tras la aprobación del pago.", FR: "Le téléchargement est libéré après l'approbation du paiement." },
  shippingCard2Title: { PT: "Email Seguro", EN: "Secure Email", ES: "Correo Seguro", FR: "E-mail Sécurisé" },
  shippingCard2Desc: { PT: "Você receberá um email com os links e o guia de instalação em PDFs.", EN: "You will receive an email with the links and installation guide in PDFs.", ES: "Recibirás un correo con los enlaces y la guía de instalación en PDFs.", FR: "Vous recevrez un e-mail avec les liens et le guide en PDF." },
  shippingCard3Title: { PT: "Acesso Vitalício", EN: "Lifetime Access", ES: "Acceso Vitalicio", FR: "Accès à Vie" },
  shippingCard3Desc: { PT: "O produto é seu para sempre. Pode baixar quantas vezes precisar.", EN: "The product is yours forever. You can download it as many times as you need.", ES: "El producto es tuyo para siempre. Puedes descargarlo tantas veces como necesites.", FR: "Le produit est à vous pour toujours." },
  shippingSec1Title: { PT: "Prazos de Entrega", EN: "Delivery Times", ES: "Plazos de Entrega", FR: "Délais de Livraison" },
  shippingSec1Desc1: { PT: "Cartão de Crédito e Pix: Entrega instantânea (em até 5 minutos).", EN: "Credit Card and Pix: Instant delivery (within 5 minutes).", ES: "Tarjeta de Crédito y Pix: Entrega instantánea (en hasta 5 minutos).", FR: "Carte de Crédit: Livraison instantanée (moins de 5 minutes)." },
  shippingSec1Desc2: { PT: "Boleto Bancário: O link de download é enviado assim que o banco confirmar a compensação (de 24h a 48h úteis).", EN: "Bank Slip: The download link is sent as soon as the bank confirms compensation (from 24h to 48h business hours).", ES: "Boleto Bancario: El enlace de descarga se envía tan pronto como el banco confirme la compensación (de 24h a 48h hábiles).", FR: "Boleto: Le lien est envoyé dès que la banque confirme (24h-48h)." },
  shippingSec2Title: { PT: "Não Recebi o Email", EN: "Didn't Receive Email", ES: "No Recibí el Correo", FR: "Email non Reçu" },
  shippingSec2Desc: { PT: "Certifique-se de verificar sua caixa de SPAM ou de PROMOÇÕES. Se após 1 hora do pagamento você ainda não tiver recebido, entre em contato imediatamente com o nosso suporte através do WhatsApp ou e-mail.", EN: "Be sure to check your SPAM or PROMOTIONS folder. If after 1 hour of payment you still haven't received it, contact our support immediately via WhatsApp or email.", ES: "Asegúrese de revisar su carpeta de SPAM o de PROMOCIONES. Si después de 1 hora del pago aún no lo ha recibido, contáctenos inmediatamente a través de WhatsApp o correo electrónico.", FR: "Vérifiez vos SPAMS. Si après 1 heure vous n'avez rien, contactez le support." },

  // Terms Page
  termsTitle1: { PT: "Termos de ", EN: "Terms of ", ES: "Términos de ", FR: "Conditions d'" },
  termsTitle2: { PT: "Serviço", EN: "Service", ES: "Servicio", FR: "Utilisation" },
  termsUpdate: { PT: "Última atualização: 19 de Março de 2026", EN: "Last update: March 19, 2026", ES: "Última actualización: 19 de marzo de 2026", FR: "Dernière mise à jour: 19 Mars 2026" },
  termsSec1Title: { PT: "1. Aceitação dos Termos", EN: "1. Acceptance of Terms", ES: "1. Aceptación de los Términos", FR: "1. Acceptation des Conditions" },
  termsSec1Desc: { PT: "Ao acessar e usar este site, você concorda em cumprir e estar vinculado aos seguintes Termos de Serviço da Gorg Presets. Se você não concordar com qualquer parte desses termos, não use o nosso site ou produtos.", EN: "By accessing and using this site, you agree to comply with and be bound by the following Gorg Presets Terms of Service. If you do not agree with any part of these terms, do not use our site or products.", ES: "Al acceder y usar este sitio, usted acepta cumplir y estar vinculado a los siguientes Términos de Servicio de Gorg Presets. Si no está de acuerdo con alguna parte de estos términos, no use nuestro sitio o productos.", FR: "En accédant à ce site, vous acceptez nos Conditions. Si vous n'êtes pas d'accord, n'utilisez pas le site." },
  termsSec2Title: { PT: "2. Propriedade Intelectual", EN: "2. Intellectual Property", ES: "2. Propiedad Intelectual", FR: "2. Propriété Intellectuelle" },
  termsSec2Desc: { PT: "Todos os presets, vídeos, imagens e textos disponíveis neste site são propriedade exclusiva da Gorg Presets. A compra de um preset concede a você uma licença de uso pessoal e intransferível. É estritamente proibida a revenda, compartilhamento gratuito, sublicenciamento ou qualquer forma de distribuição comercial sem autorização expressa.", EN: "All presets, videos, images and texts available on this site are the exclusive property of Gorg Presets. The purchase of a preset grants you a personal and non-transferable license of use. Resale, free sharing, sublicensing or any form of commercial distribution without express authorization is strictly prohibited.", ES: "Todos los presets, videos, imágenes y textos disponibles en este sitio son propiedad exclusiva de Gorg Presets. La compra de un preset le otorga una licencia de uso personal e intransferible. Está estrictamente prohibida la reventa, el intercambio gratuito, el sublicenciamiento o cualquier forma de distribución comercial sin autorización expresa.", FR: "Tous les presets sont la propriété de Gorg Presets. Vous obtenez une licence personnelle non transférable. La revente est interdite." },
  termsSec3Title: { PT: "3. Uso do Produto", EN: "3. Product Use", ES: "3. Uso del Producto", FR: "3. Utilisation du Produit" },
  termsSec3Desc: { PT: "Nossos presets são projetados para funcionar no Adobe Lightroom (Mobile e Desktop). A aplicação dos presets resulta em edições automáticas, mas os resultados finais podem variar dependendo da iluminação, cores e qualidade da foto original. A compra não garante acesso ao software Adobe Lightroom em si.", EN: "Our presets are designed to work in Adobe Lightroom (Mobile and Desktop). Applying presets results in automatic edits, but final results may vary depending on lighting, colors, and original photo quality. Purchase does not guarantee access to the Adobe Lightroom software itself.", ES: "Nuestros presets están diseñados para funcionar en Adobe Lightroom (Móvil y Escritorio). La aplicación de los presets resulta en ediciones automáticas, pero los resultados finales pueden variar según la iluminación, los colores y la calidad de la foto original. La compra no garantiza el acceso al software Adobe Lightroom en sí.", FR: "Nos presets fonctionnent sur Adobe Lightroom. Les résultats varient selon l'éclairage de la photo. Logiciel Lightroom non inclus." },
  termsSec4Title: { PT: "4. Pagamentos e Reembolsos", EN: "4. Payments and Refunds", ES: "4. Pagos y Reembolsos", FR: "4. Paiements et Remboursements" },
  termsSec4Desc: { PT: "Os preços estão sujeitos a alterações sem aviso prévio. Devido à natureza digital dos nossos produtos (arquivos baixáveis instantaneamente), as solicitações de reembolso são tratadas de acordo com as leis locais de comércio eletrônico para produtos digitais. Consulte nossa Política de Reembolso para detalhes específicos.", EN: "Prices are subject to change without notice. Due to the digital nature of our products (instantly downloadable files), refund requests are handled according to local e-commerce laws for digital products. See our Refund Policy for specific details.", ES: "Los precios están sujetos a cambios sin previo aviso. Debido a la naturaleza digital de nuestros productos (archivos descargables al instante), las solicitudes de reembolso se manejan de acuerdo con las leyes locales de comercio electrónico para productos digitales. Consulte nuestra Política de Reembolso para obtener detalles específicos.", FR: "Les prix peuvent changer sans préavis. Les demandes de remboursement sont traitées selon les lois locales sur le e-commerce." },
  termsFooterNotice: { PT: "Gorg Presets reserva-se o direito de atualizar estes termos a qualquer momento. O uso contínuo do site após as alterações constitui aceitação dos novos termos.", EN: "Gorg Presets reserves the right to update these terms at any time. Continued use of the site after changes constitutes acceptance of the new terms.", ES: "Gorg Presets se reserva el derecho de actualizar estos términos en cualquier momento. El uso continuado del sitio después de los cambios constituye la aceptación de los nuevos términos.", FR: "Gorg Presets se réserve le droit de mettre à jour ces conditions. L'utilisation continue constitue une acceptation." },

  // Refund Page
  refundTitle1: { PT: "Política de ", EN: "Refund ", ES: "Política de ", FR: "Politique de " },
  refundTitle2: { PT: "Reembolso", EN: "Policy", ES: "Reembolso", FR: "Remboursement" },
  refundSubtitle: { PT: "Satisfação garantida ou seu investimento de volta.", EN: "Satisfaction guaranteed or your investment back.", ES: "Satisfacción garantizada o le devolvemos su inversión.", FR: "Satisfaction garantie ou remboursé." },
  refundCard1Title: { PT: "7 Dias Grátis", EN: "7 Days Free", ES: "7 Días Gratis", FR: "7 Jours Gratuits" },
  refundCard1Desc: { PT: "Garantia total de 7 dias após a confirmação da compra.", EN: "Full 7-day guarantee after purchase confirmation.", ES: "Garantía total de 7 días tras la confirmación de la compra.", FR: "Garantie complète de 7 jours après l'achat." },
  refundCard2Title: { PT: "Devolução 100%", EN: "100% Refund", ES: "Devolución 100%", FR: "Remboursement 100%" },
  refundCard2Desc: { PT: "Estornamos o valor integral sem questionários chatos.", EN: "We refund the full amount without boring questionnaires.", ES: "Reembolsamos el importe total sin cuestionarios aburridos.", FR: "Remboursement total sans questionnaires ennuyeux." },
  refundCard3Title: { PT: "Suporte VIP", EN: "VIP Support", ES: "Soporte VIP", FR: "Support VIP" },
  refundCard3Desc: { PT: "Nossa prioridade é que você esteja feliz com as edições.", EN: "Our priority is for you to be happy with your edits.", ES: "Nuestra prioridad es que estés feliz con tus ediciones.", FR: "Notre priorité est que vous soyez heureux avec vos retouches." },
  refundSec1Title: { PT: "Condições para Reembolso", EN: "Refund Conditions", ES: "Condiciones de Reembolso", FR: "Conditions de Remboursement" },
  refundSec1Desc: { PT: "Nossa Política de Reembolso visa uma relação transparente com o nosso cliente. Como nossos produtos são digitais (entregáveis via download imediato), oferecemos uma garantia incondicional de 7 dias para que você possa testar o produto.", EN: "Our Refund Policy aims for a transparent relationship with our client. Since our products are digital (instantly downloadable), we offer an unconditional 7-day guarantee so you can test the product.", ES: "Nuestra Política de Reembolso busca una relación transparente con nuestro cliente. Como nuestros productos son digitales (descargables al instante), ofrecemos una garantía incondicional de 7 días para que pueda probar el producto.", FR: "Nous offrons une garantie de 7 jours pour tester les produits numériques." },
  refundSec2Title: { PT: "Como Solicitar", EN: "How to Request", ES: "Cómo Solicitar", FR: "Comment Demander" },
  refundSec2Desc: { PT: "Basta enviar um e-mail para suporte@gorgpresets.com com o título 'Solicitação de Reembolso' acompanhado do seu número de pedido ou email de compra. O estorno será processado diretamente pelo processador de pagamento utilizado (Cartão, Pix ou Boleto).", EN: "Just send an email to suporte@gorgpresets.com with the subject 'Refund Request' along with your order number or purchase email. The reversal will be processed directly by the payment processor used (Card, Pix or Bank Slip).", ES: "Basta con enviar un correo a soporte@gorgpresets.com con el asunto 'Solicitud de Reembolso' junto con su número de pedido o correo de compra. El reembolso será procesado directamente por el procesador de pagos utilizado (Tarjeta, Pix o Boleto).", FR: "Envoyez un e-mail à suporte@gorgpresets.com avec le sujet 'Demande de Remboursement' et votre numéro de commande." },

  // Cart Drawer
  cartMyPresets: { PT: "Meus Presets", EN: "My Presets", ES: "Mis Presets", FR: "Mes Presets" },
  cartPack: { PT: "Pack Selecionado", EN: "Pack Selected", ES: "Pack Seleccionado", FR: "Pack Sélectionné" },
  cartPacks: { PT: "Packs Selecionados", EN: "Packs Selected", ES: "Packs Seleccionados", FR: "Packs Sélectionnés" },
  cartPromoTitle: { PT: "Promoção Leve 3, Pague 2", EN: "Buy 2, Get 1 Free Promo", ES: "Promoción Lleva 3, Paga 2", FR: "Promo Achetez-en 2, Obtenez-en 1" },
  cartPromoWin: { PT: "Você já ganhou {n} pack(s) grátis!", EN: "You've already won {n} free pack(s)!", ES: "¡Ya has ganado {n} pack(s) gratis!", FR: "Vous avez déjà gagné {n} pack(s) gratuit(s)!" },
  cartPromoMiss: { PT: "Falta apenas {n} para ganhar outro pack!", EN: "Only {n} left to get another free pack!", ES: "¡Falta solo {n} para ganar otro pack!", FR: "Il ne manque plus que {n} pour un pack gratuit!" },
  cartSummary: { PT: "Resumo do Pedido", EN: "Order Summary", ES: "Resumen del Pedido", FR: "Résumé de la Commande" },
  cartSavings: { PT: "Você economizou", EN: "You saved", ES: "Has ahorrado", FR: "Vous avez économisé" },
  cartUpsell: { PT: "Você pode gostar também", EN: "You may also like", ES: "Te puede gustar también", FR: "Vous aimerez aussi" },
  cartSecure: { PT: "Pagamento 100% processado de forma segura e imediata via PIX ou Cartão.", EN: "100% secure payment processed immediately via Card or PIX.", ES: "Pago 100% seguro procesado de forma inmediata vía Tarjeta o PIX.", FR: "Paiement 100% sécurisé via Carte ou PIX." },
  cartRedir: { PT: "Redirecionamento Protegido", EN: "Secure Redirection", ES: "Redirección Protegida", FR: "Redirection Sécurisée" },
  cartContinue: { PT: "CONTINUAR NAVEGANDO", EN: "CONTINUE SHOPPING", ES: "CONTINUAR NAVEGANDO", FR: "CONTINUER LES ACHATS" },
  cartExplore: { PT: "Começar a Explorar", EN: "Start Exploring", ES: "Empezar a Explorar", FR: "Commencer à Explorer" },
  cartTotalOrder: { PT: "Total do Pedido", EN: "Order Total", ES: "Total del Pedido", FR: "Total de la Commande" },
  promoActive: { PT: "Promoção Ativa!", EN: "Promotion Active!", ES: "¡Promoción Activa!", FR: "Promotion Active!" },
  promoCheapestFree: { PT: "O preset mais barato é GRÁTIS", EN: "The cheapest preset is FREE", ES: "El preset más barato es GRATIS", FR: "Le preset le moins cher est GRATUIT" },
  promoMissingOne: { PT: "Falta apenas 1 preset para ganhar 1 grátis", EN: "Only 1 preset left to get 1 free", ES: "Falta solo 1 preset para ganar 1 gratis", FR: "Il manque 1 preset pour en avoir 1 gratuit" },
  promoMissingMulti: { PT: "Faltam {n} presets para ganhar 1 grátis", EN: "{n} presets left to get 1 free", ES: "Faltan {n} presets para ganar 1 gratis", FR: "Il manque {n} presets pour 1 gratuit" },
  promoTier0: { PT: "Adicione 3 presets e ganhe 1 de presente!", EN: "Add 3 presets and get 1 for free!", ES: "¡Añade 3 presets y llévate 1 de regalo!", FR: "Ajoutez 3 presets et obtenez-en 1 en cadeau!" },
  promoTier1to2: { PT: "Falta pouco! Adicione mais {n} para levar 3 e pagar 2.", EN: "Almost there! Add {n} more to get 3 and pay for 2.", ES: "¡Falta poco! Añade {n} más para llevar 3 y pagar 2.", FR: "Presque! Ajoutez-en {n} pour acheter 3 et payer 2." },
  promoTier3: { PT: "🎉 PARABÉNS! Você liberou o 3x2. Adicione mais 3 e PAGUE APENAS METADE (Leve 6, Pague 3)!", EN: "🎉 CONGRATS! You unlocked 3x2. Add 3 more and PAY HALF PRICE (Buy 6, Pay 3)!", ES: "🎉 ¡FELICIDADES! Has desbloqueado el 3x2. ¡Añade 3 más y PAGA SOLO LA MITAD (Lleva 6, Paga 3)!", FR: "🎉 BRAVO! Vous avez débloqué 3x2. Ajoutez 3 de plus et PAYEZ LA MOITIÉ (Prenez 6, Payez 3)!" },
  promoTier4to5: { PT: "Faltam só {n} itens para você desbloquear o DESCONTO MÁXIMO (50%)!", EN: "Only {n} more items to unlock the MAXIMUM DISCOUNT (50%)!", ES: "¡Solo faltan {n} ítems para desbloquear el DESCUENTO MÁXIMO (50%)!", FR: "Plus que {n} articles pour débloquer le RABAIS MAX (50%)!" },
  promoTier6Plus: { PT: "🔥 NÍVEL MÁXIMO! Você está levando 6 presets pelo preço de 3. Aproveite!", EN: "🔥 MAXIMUM LEVEL! You are getting 6 presets for the price of 3. Enjoy!", ES: "🔥 ¡NIVEL MÁXIMO! Te llevas 6 presets por el precio de 3. ¡Aprovecha!", FR: "🔥 NIVEAU MAX! 6 presets pour le prix de 3. Profitez-en!" },
  
  // Checkout
  chkSummary: { PT: "Resumo do pedido", EN: "Order Summary", ES: "Resumen del pedido", FR: "Résumé de la commande" },
  chkPixDisc: { PT: "Desconto PIX", EN: "PIX Discount", ES: "Descuento PIX", FR: "Réduction PIX" },
  chkCouponLabel: { PT: "Código do cupom", EN: "Coupon Code", ES: "Código del cupón", FR: "Code promo" },
  chkCouponPlace: { PT: "Digite seu cupom", EN: "Enter your coupon", ES: "Introduce tu cupón", FR: "Entrez votre code" },
  chkApplyBtn: { PT: "Aplicar", EN: "Apply", ES: "Aplicar", FR: "Appliquer" },
  chkIdentification: { PT: "Identificação", EN: "Identification", ES: "Identificación", FR: "Identification" },
  chkFullName: { PT: "Nome completo", EN: "Full name", ES: "Nombre completo", FR: "Nom complet" },
  chkEmailLab: { PT: "E-mail", EN: "Email", ES: "Correo electrónico", FR: "E-mail" },
  chkPhoneLab: { PT: "Celular/WhatsApp", EN: "Phone/WhatsApp", ES: "Celular/WhatsApp", FR: "Téléphone/WhatsApp" },
  chkOfferTitle: { PT: "Oferta especial para você!", EN: "Special offer for you!", ES: "¡Oferta especial para ti!", FR: "Offre spéciale pour vous!" },
  chkOfferDesc: { PT: "Adicione este item exclusivo ao seu pedido", EN: "Add this exclusive item to your order", ES: "Añade este artículo exclusivo a tu pedido", FR: "Ajoutez cet article exclusif" },
  chkPaymentMethod: { PT: "Forma de pagamento", EN: "Payment method", ES: "Forma de pago", FR: "Méthode de paiement" },
  chkCard: { PT: "Cartão de Crédito", EN: "Credit Card", ES: "Tarjeta de Crédito", FR: "Carte de Crédit" },
  chkPixOnlySight: { PT: "Pagamento somente à vista", EN: "Payment only upfront", ES: "Pago solo al contado", FR: "Paiement comptant seulement" },
  chkPixRelease: { PT: "A liberação da compra ocorre após a confirmação do pagamento", EN: "Release occurs after payment confirmation", ES: "La liberación ocurre después de confirmar el pago", FR: "Libération après confirmation du paiement" },
  chkPixExpiration: { PT: "Ao gerar o código atente para a data de expiração", EN: "Pay attention to expiration date", ES: "Presta atención a la fecha de vencimiento", FR: "Faites attention à la date d'expiration" },
  chkTermTotal: { PT: "Total a prazo:", EN: "Total in installments:", ES: "Total a plazos:", FR: "Total en plusieurs fois:" },
  chkCardDetail: { PT: "Preencha os dados no próximo passo ou no checkout seguro.", EN: "Fill in details on the next step.", ES: "Completa los datos en el siguiente paso.", FR: "Remplissez les détails à l'étape suivante." },
  chkProcessing: { PT: "Processando...", EN: "Processing...", ES: "Procesando...", FR: "Traitement..." },
  chkContinueBtn: { PT: "CONTINUAR", EN: "CONTINUE", ES: "CONTINUAR", FR: "CONTINUER" },
  chkGenPixBtn: { PT: "$$ GERAR PIX", EN: "$$ MINT PIX", ES: "$$ GENERAR PIX", FR: "$$ GÉNÉRER PIX" },
  chkSafePage: { PT: "Você está em uma página de checkout segura, criada com a tecnologia ggCheckout. A responsabilidade pela oferta é do vendedor.", EN: "You are on a secure checkout page, created with ggCheckout. Responsability for offer relies on the seller.", ES: "Estás en una página de pago segura. La responsabilidad de la oferta recae en el vendedor.", FR: "Page de paiement sécurisée. La responsabilité de l'offre incombe au vendeur." },
  chkAllRights: { PT: "Todos os direitos reservados.", EN: "All rights reserved.", ES: "Todos los derechos reservados.", FR: "Tous droits réservés." }
};

export type TranslationKey = keyof typeof translations;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("gorg-language");
    return (saved as Language) || "PT";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("gorg-language", lang);
  };

  // Auto-detecção por IP
  useEffect(() => {
    const detectLocale = async () => {
      // Se o usuário já tiver uma preferência salva, não sobrescrevemos
      if (localStorage.getItem("gorg-language")) return;

      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        // Mapeamento de País -> Idioma
        if (['BR', 'PT'].includes(data.country_code)) {
          setLanguage("PT");
        } else if (data.country_code === 'ES' || data.country_code === 'MX' || data.country_code === 'AR' || data.country_code === 'CO') {
          setLanguage("ES");
        } else if (data.country_code === 'FR' || data.country_code === 'BE' || data.country_code === 'CH') {
          setLanguage("FR");
        } else {
          setLanguage("EN");
        }
      } catch (error) {
        console.error("Falha ao detectar idioma:", error);
      }
    };

    detectLocale();
  }, []);

  const t = (key: TranslationKey) => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
