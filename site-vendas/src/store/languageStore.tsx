import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "PT" | "EN" | "ES";

export const translations = {
  // Config
  welcome: { PT: "Bem-vindo à GORG PRESETS", EN: "Welcome to GORG PRESETS", ES: "Bienvenido a GORG PRESETS" },
  modalDesc: { PT: "Selecione sua moeda e idioma de preferência para continuar.", EN: "Select your preferred currency and language to continue.", ES: "Seleccione su moneda e idioma preferidos para continuar." },
  confirmBtn: { PT: "Confirmar Acesso", EN: "Confirm Access", ES: "Confirmar Acceso" },
  languageLabel: { PT: "IDIOMA", EN: "LANGUAGE", ES: "IDIOMA" },
  currencyLabel: { PT: "MOEDA", EN: "CURRENCY", ES: "MONEDA" },
  
  // Header
  catalog: { PT: "Catálogo", EN: "Catalog", ES: "Catálogo" },
  howItWorks: { PT: "Como Funciona", EN: "How it Works", ES: "Cómo Funciona" },
  faq: { PT: "Dúvidas (FAQ)", EN: "FAQ", ES: "Preguntas (FAQ)" },
  login: { PT: "Entrar", EN: "Login", ES: "Entrar" },
  currentCurrency: { PT: "Moeda:", EN: "Currency:", ES: "Moneda:" },
  promoBar: { PT: "LEVE 3, PAGUE 2: ADICIONE 3 PRESETS E GANHE 1.", EN: "BUY 2, GET 1 FREE: ADD 3 PRESETS AND GET 1.", ES: "LLEVA 3, PAGA 2: AÑADE 3 PRESETS Y LLEVATE 1." },
  navHome: { PT: "Início", EN: "Home", ES: "Inicio" },
  navAllPresets: { PT: "TODOS OS PRESETS", EN: "ALL PRESETS", ES: "TODOS LOS PRESETS" },
  navContact: { PT: "Contacto", EN: "Contact", ES: "Contacto" },
  catDesktop: { PT: "Desktop", EN: "Desktop", ES: "Desktop" },
  catMobile: { PT: "Mobile", EN: "Mobile", ES: "Mobile" },
  catLandscape: { PT: "Paisagem", EN: "Landscape", ES: "Paisaje" },
  catMinimalist: { PT: "Minimalista", EN: "Minimalist", ES: "Minimalista" },
  catMoody: { PT: "Moody", EN: "Moody", ES: "Moody" },
  searchPlaceholder: { PT: "O que você está procurando?", EN: "What are you looking for?", ES: "¿Qué estás buscando?" },
  searchEmpty: { PT: "Nenhum preset encontrado com esse nome.", EN: "No preset found with that name.", ES: "No se encontró ningún preset con ese nombre." },
  searchRealTime: { PT: "Digite para ver sugestões em tempo real", EN: "Type to see suggestions in real time", ES: "Escribe para ver sugerencias en tiempo real" },
  memberArea: { PT: "Área de Membros", EN: "Members Area", ES: "Área de Miembros" },
  memberAreaDesc: { PT: "Acesso Vitalício", EN: "Lifetime Access", ES: "Acceso Vitalicio" },
  // Hero
  heroTitle1: { PT: "Transforme com ", EN: "Transform with ", ES: "Transforma con " },
  heroTitle2: { PT: "estilo.", EN: "style.", ES: "estilo." },
  heroSubtitle: { PT: "A paleta perfeita e profissional em apenas 1 clique.", EN: "The perfect and professional palette in just 1 click.", ES: "La paleta perfecta y profesional en solo 1 clic." },
  
  // FAQ Page
  faqTag: { PT: "Dúvidas Resolvidas", EN: "Questions Resolved", ES: "Dudas Resueltas" },
  faqTitle1: { PT: "Tudo o que ", EN: "Everything ", ES: "Todo lo que " },
  faqTitle2: { PT: "Você Precisa", EN: "You Need", ES: "Necesitas" },
  faqTitle3: { PT: "Saber.", EN: "To Know.", ES: "Saber." },
  faqSubtitle: { PT: "Preparamos um guia rápido para as dúvidas mais comuns. Se ainda precisar de algo, nosso suporte está a um clique.", EN: "We've prepared a quick guide for the most common questions. If you still need something, our support is one click away.", ES: "Hemos preparado una guía rápida para las dudas más comunes. Si aún necesitas algo, nuestro soporte está a un clic." },
  faqQuestion1: { PT: "Como funciona a Área de Membros?", EN: "How does the Members Area work?", ES: "¿Cómo funciona el Área de Miembros?" },
  faqAnswer1: { PT: "Assim que sua compra for confirmada, você receberá um e-mail automático com seus dados de acesso exclusivos para a nossa Área de Membros. Lá, todos os presets que você adquiriu estarão com o acesso liberado imediatamente. Caso perca o seu e-mail de acesso, você pode entrar diretamente através de membros.gorgpresets.com. Lembre-se que todos os nossos presets acompanham vídeos práticos ensinando passo a passo como instalar, ajustar e editar suas fotos.", EN: "As soon as your purchase is confirmed, you will receive an automatic email with your exclusive access data to our Members Area. There, all the presets you bought will be available immediately. If you lose your access email, you can enter directly through membros.gorgpresets.com. Remember that all our presets come with practical videos teaching step by step how to install, adjust and edit your photos.", ES: "Tan pronto como se confirme su compra, recibirá un correo electrónico automático con sus datos de acceso exclusivos a nuestra Área de Miembros. Allí, todos los ajustes preestablecidos que compró estarán disponibles de inmediato. Si pierde su correo electrónico de acceso, puede ingresar directamente a través de membros.gorgpresets.com. Recuerde que todos nuestros ajustes preestablecidos vienen con videos prácticos que enseñan paso a paso cómo instalar, ajustar y editar sus fotos." },
  faqQuestion2: { PT: "O que são Lightroom Presets?", EN: "What are Lightroom Presets?", ES: "¿Qué son los Lightroom Presets?" },
  faqAnswer2: { PT: "Presets são filtros profissionais criados para transformar suas fotos instantaneamente. Eles editam as cores, luzes e sombras para dar um visual cinematográfico com apenas um clique no seu celular ou computador.", EN: "Presets are professional filters created to transform your photos instantly. They edit colors, lights and shadows to give a cinematic look with just one click on your phone or computer.", ES: "Los presets son filtros profesionales creados para transformar tus fotos al instante. Editan colores, luces y sombras para dar un aspecto cinematográfico con solo un clic en tu teléfono o computadora." },
  faqSupportTitle: { PT: "Suporte 24h", EN: "24h Support", ES: "Soporte 24h" },
  faqSupportDesc: { PT: "Não encontrou sua dúvida? Fale direto com um de nossos especialistas.", EN: "Didn't find your question? Talk directly to one of our specialists.", ES: "¿No encontraste tu duda? Habla directamente con uno de nuestros especialistas." },
  faqButtonSupport: { PT: "Chamar no Whatsapp", EN: "Call on Whatsapp", ES: "Llamar por Whatsapp" },
  
  // Contact Page
  contactTag: { PT: "Suporte Premium GORG", EN: "GORG Premium Support", ES: "Soporte Premium GORG" },
  contactTitle1: { PT: "Como podemos ", EN: "How can we ", ES: "¿Cómo podemos " },
  contactTitle2: { PT: "Ajudar?", EN: "Help?", ES: "Ayudar?" },
  contactSubtitle: { PT: "Nossa equipe de especialistas está pronta para tirar suas dúvidas e ajudar você a elevar o nível das suas fotos.", EN: "Our team of experts is ready to answer your questions and help you raise the level of your photos.", ES: "Nuestro equipo de expertos está listo para responder sus preguntas y ayudarlo a elevar el nivel de sus fotos." },
  contactFormTitle: { PT: "Envie uma Mensagem", EN: "Send a Message", ES: "Enviar un Mensaje" },
  contactFormSubtitle: { PT: "Responderemos em até 24 horas úteis. Prometemos que não vai demorar.", EN: "We will respond within 24 business hours. We promise it won't take long.", ES: "Responderemos en un plazo de 24 horas hábiles. Prometemos que no tardará mucho." },
  contactFormName: { PT: "Como devemos te chamar?", EN: "What should we call you?", ES: "¿Cómo deberíamos llamarte?" },
  contactFormEmail: { PT: "Seu melhor E-mail", EN: "Your best E-mail", ES: "Tu mejor E-mail" },
  contactFormSubject: { PT: "Qual o assunto principal?", EN: "What is the main subject?", ES: "¿Cuál es el asunto principal?" },
  contactFormMessage: { PT: "No que podemos ajudar?", EN: "How can we help?", ES: "¿En qué podemos ayudarte?" },
  contactFormButton: { PT: "Enviar Mensagem", EN: "Send Message", ES: "Enviar Mensaje" },
  contactFormSending: { PT: "Enviando...", EN: "Sending...", ES: "Enviando..." },
  contactFormSuccess: { PT: "Enviado com Sucesso!", EN: "Sent Successfully!", ES: "¡Enviado con Éxito!" },
  contactBadge1: { PT: "Suporte Imediato", EN: "Immediate Support", ES: "Soporte Inmediato" },
  contactBadge2: { PT: "Atendimento Online", EN: "Online Support", ES: "Atención Online" },
  backToHome: { PT: "Voltar ao Início", EN: "Back to Home", ES: "Volver al Inicio" },
  back: { PT: "Voltar", EN: "Back", ES: "Volver" },

  // Privacy Page
  privacyTag: { PT: "Privacidade e Segurança", EN: "Privacy and Security", ES: "Privacidad y Seguridad" },
  privacyTitle1: { PT: "Política de ", EN: "Privacy ", ES: "Política de " },
  privacyTitle2: { PT: "Privacidade", EN: "Policy", ES: "Privacidad" },
  privacySubtitle: { PT: "Privacidade total. Seus dados estão seguros conosco.", EN: "Full privacy. Your data is safe with us.", ES: "Privacidad total. Sus datos están seguros con nosotros." },
  privacyCard1Title: { PT: "Dados Criptografados", EN: "Encrypted Data", ES: "Datos Encriptados" },
  privacyCard1Desc: { PT: "Usamos tecnologia de ponta para garantir que suas informações sejam ilegíveis para terceiros.", EN: "We use state-of-the-art technology to ensure your information is unreadable to third parties.", ES: "Utilizamos tecnología de punta para garantizar que su información sea ilegible para terceros." },
  privacyCard2Title: { PT: "Zero Spam", EN: "Zero Spam", ES: "Cero Spam" },
  privacyCard2Desc: { PT: "Nunca venderemos ou compartilharemos seus dados com parceiros externos.", EN: "We will never sell or share your data with external partners.", ES: "Nunca venderemos ni compartiremos sus datos con socios externos." },
  privacyCard3Title: { PT: "Conformidade Total", EN: "Full Compliance", ES: "Cumplimiento Total" },
  privacyCard3Desc: { PT: "Operamos 100% de acordo com as leis europeias (GDPR) e brasileiras (LGPD).", EN: "We operate 100% in accordance with European (GDPR) and Brazilian (LGPD) laws.", ES: "Operamos 100% de acuerdo con las leyes europeas (GDPR) y brasileñas (LGPD)." },
  privacySec1Title: { PT: "Coleta de Informações", EN: "Information Collection", ES: "Recopilación de Información" },
  privacySec1Desc: { PT: "Coletamos apenas as informações necessárias para processar seu pedido: Nome, Email e Dados de Pagamento. Todos os pagamentos e transações financeiras são processados de forma 100% segura e criptografada pelo GG Checkout, e nenhum dado sensível de cartão é armazenado em nossos servidores.", EN: "We only collect the information necessary to process your order: Name, Email and Payment Data. All payments and financial transactions are processed in a 100% secure and encrypted way by GG Checkout, and no sensitive card data is stored on our servers.", ES: "Solo recopilamos la información necesaria para procesar su pedido: Nombre, Correo electrónico y Datos de pago. Todos los pagos y transacciones financieras son procesados de forma 100% segura y encriptada por GG Checkout, y no se almacenan datos confidenciales de tarjetas en nuestros servidores." },
  privacySec2Title: { PT: "O que fazemos com os dados", EN: "What we do with the data", ES: "Qué hacemos con los datos" },
  privacySec2Desc: { PT: "Seu email é utilizado exclusivamente para: Envio dos links de download, confirmação do pedido e envio de novidades do site (apenas se você autorizar no momento do checkout).", EN: "Your email is used exclusively for: Sending download links, order confirmation and sending site news (only if you authorize at the time of checkout).", ES: "Su correo electrónico se utiliza exclusivamente para: envío de enlaces de descarga, confirmación del pedido y envío de noticias del sitio (solo si lo autoriza al realizar el pago)." },

  // Footer / Support
  supportWhatsApp: { PT: "Whatsapp:", EN: "Whatsapp:", ES: "Whatsapp:" },
  supportEmail: { PT: "Email:", EN: "Email:", ES: "Correo electrónico:" },
  supportHours: { PT: "08:00h às 18:00h", EN: "08:00 AM to 06:00 PM", ES: "08:00h a 18:00h" },
  supportDays: { PT: "Seg-Sex:", EN: "Mon-Fri:", ES: "Lun-Vie:" },
  countryBR: { PT: "Real (BRL R$)", EN: "Real (BRL R$)", ES: "Real (BRL R$)" },
  countryUS: { PT: "Dólar (USD $)", EN: "Dollar (USD $)", ES: "Dólar (USD $)" },
  countryPT: { PT: "Euro (EUR €)", EN: "Euro (EUR €)", ES: "Euro (EUR €)" },

  // Testimonials
  testiTitle1: { PT: "Feedbacks ", EN: "Real ", ES: "Comentarios " },
  testiTitle2: { PT: "reais", EN: "feedbacks", ES: "reales" },
  
  // Editing Banner
  editingTitle: { PT: "Edição ", EN: "Uncomplicated ", ES: "Edición " },
  editingTitle2: { PT: "descomplicada", EN: "editing", ES: "sin complicaciones" },
  editingDesc: { PT: "Desenvolvido por profissionais para acelerar o seu fluxo de edição em segundos com 1 clique.", EN: "Developed by professionals to speed up your editing workflow in seconds with 1 click.", ES: "Desarrollado por profesionales para acelerar tu flujo de edición en segundos con 1 clic." },
  ebDesc2: { PT: "Explore nossas coleções e descubra o potencial máximo de cada clique agora mesmo.", EN: "Explore our collections and discover the full potential of every click right now.", ES: "Explore nuestras colecciones y descubra el máximo potencial de cada clic ahora mismo." },

  // Product Descriptions
  desc_1: { PT: "Transforme sua foto num aesthetic monocromático profundo.", EN: "Transform your photo into a deep monochromatic aesthetic.", ES: "Transforma tu foto en una profunda estética monocromática." },
  desc_2: { PT: "Tons quentes para suas fotos de praia.", EN: "Warm tones for your beach photos.", ES: "Tonos cálidos para tus fotos de playa." },
  desc_3: { PT: "Minimalista, cores sóbrias e elegantes.", EN: "Minimalist, sober and elegant colors.", ES: "Minimalista, colores sobrios y elegantes." },
  desc_4: { PT: "Cores coesas e pasteis para o seu feed.", EN: "Cohesive and pastel colors for your feed.", ES: "Colores cohesivos y pasteles para tu feed." },
  desc_5: { PT: "Foco nos tons azulados para fotos no frio.", EN: "Focus on bluish tones for cold photos.", ES: "Enfoque en tonos azulados para fotos con frío." },
  desc_6: { PT: "Ressalta os verdes vibrantes em fotos de campo.", EN: "Highlights vibrant greens in field photos.", ES: "Resalta los verdes vibrantes en fotos de campo." },
  desc_7: { PT: "Vintage luxuoso para lifestyle europeu.", EN: "Luxurious vintage for European lifestyle.", ES: "Vintage lujoso para estilo de vida europeo." },
  desc_8: { PT: "Pôr do sol e ares dourados nas suas fotos.", EN: "Sunsets and golden air in your photos.", ES: "Puestas de sol y aire dorado en tus fotos." },

  // Index Titles
  newArrivals: { PT: "Novidades Exclusivas", EN: "Exclusive Arrivals", ES: "Novedades Exclusivas" },
  bestSellers: { PT: "Best Sellers", EN: "Best Sellers", ES: "Los Más Vendidos" },
  bestSellersDesc: { PT: "Descubra os presets mais baixados e amados pela galera. Escolha as edições que são tendência e eleve o nível das suas fotos agora.", EN: "Discover the most downloaded and loved presets by our community. Choose the trending editions and elevate your photos now.", ES: "Descubre los presets más descargados y amados por la comunidad. Elige las ediciones que son tendencia y eleva el nivel de tus fotos ahora." },
  allPresets: { PT: "Todos os Presets", EN: "All Presets", ES: "Todos los Presets" },
  viewFullCatalog: { PT: "Ver Catálogo Completo", EN: "View Full Catalog", ES: "Ver Catálogo Completo" },
  categories: { PT: "Categorias", EN: "Categories", ES: "Categorías" },
  
  // Cart / Button
  addToCart: { PT: "ADD AO CARRINHO", EN: "ADD TO CART", ES: "ADD AL CARRITO" },
  addedToCart: { PT: "PRODUTO ADICIONADO!", EN: "PRODUCT ADDED!", ES: "¡PRODUCTO AÑADIDO!" },
  alreadyInCart: { PT: "Este preset já está no seu carrinho", EN: "This preset is already in your cart", ES: "Este preset ya está en tu carrito" },
  cartTitle: { PT: "Seu Carrinho", EN: "Your Cart", ES: "Tu Carrito" },
  emptyCart: { PT: "Seu carrinho está vazio.", EN: "Your cart is empty.", ES: "Tu carrito está vacío." },
  continueShopping: { PT: "Continuar Comprando", EN: "Continue Shopping", ES: "Seguir Comprando" },
  subtotal: { PT: "Subtotal", EN: "Subtotal", ES: "Subtotal" },
  discountCoupon: { PT: "Desconto", EN: "Discount", ES: "Descuento" },
  total: { PT: "Total", EN: "Total", ES: "Total" },
  checkout: { PT: "Finalizar Compra", EN: "Checkout", ES: "Finalizar Compra" },
  free: { PT: "GRÁTIS", EN: "FREE", ES: "GRATIS" },
  viewDetails: { PT: "VER DETALHES", EN: "VIEW DETAILS", ES: "VER DETALLES" },

  // Announcements
  announcement: { PT: "OFERTA ESPECIAL: LEVE 3, PAGUE 2 EM TODO O SITE!", EN: "SPECIAL OFFER: BUY 2, GET 1 FREE SITEWIDE!", ES: "OFERTA ESPECIAL: ¡LLEVA 3, PAGA 2 EN TODO EL SITIO!" },

  // Categories Text
  cat1: { PT: "Negócios", EN: "Business", ES: "Negocios" },
  cat2: { PT: "Lifestyle", EN: "Lifestyle", ES: "Lifestyle" },
  cat3: { PT: "Essential", EN: "Essential", ES: "Essential" },
  cat4: { PT: "Travel", EN: "Travel", ES: "Travel" },
  cat5: { PT: "Creative", EN: "Creative", ES: "Creative" },
  catAll: { PT: "Todos os Presets", EN: "All Presets", ES: "Todos los Presets" },
  catNav: { PT: "Navegação", EN: "Navigation", ES: "Navegación" },
  catFilter: { PT: "Filtrar por Coleção", EN: "Filter by Collection", ES: "Filtrar por Colección" },
  catShowing: { PT: "Exibindo", EN: "Showing", ES: "Mostrando" },
  catItems: { PT: "itens encontrados", EN: "items found", ES: "ítems encontrados" },
  catSort: { PT: "Ordenar por:", EN: "Sort by:", ES: "Ordenar por:" },
  catView: { PT: "Visualização:", EN: "View:", ES: "Visualización:" },
  catEmpty: { PT: "Ops! Nenhum preset encontrado", EN: "Oops! No preset found", ES: "¡Ops! No se encontró el preset" },
  catEmptyBtn: { PT: "Resetar Coleção", EN: "Reset Collection", ES: "Resetear Colección" },
  
  sortBestseller: { PT: "Mais Vendidos", EN: "Bestsellers", ES: "Más Vendidos" },
  sortPriceAsc: { PT: "Menor Preço", EN: "Price (Low-High)", ES: "Menor Precio" },
  sortPriceDesc: { PT: "Maior Preço", EN: "Price (High-Low)", ES: "Mayor Precio" },
  sortAz: { PT: "Nome (A-Z)", EN: "Name (A-Z)", ES: "Nombre (A-Z)" },

  // Testimonials Texts (Fallback translation)
  test1Text: { PT: "Fiquei impressionada com a diferença! O feed ficou super organizado e lindo. Já testei em várias fotos e todas ficaram maravilhosas, parecem de revista.", EN: "I was impressed with the difference! The feed is super organized and beautiful. Really looks like a magazine.", ES: "¡Me impresionó la diferencia! El feed quedó súper organizado y hermoso. Parecen de revista." },
  test2Text: { PT: "Achei bem fácil de usar. Não manjo nada de edição de foto, mas agora é só colocar o filtro e a foto já fica com outra qualidade. Parabéns a equipe pelo resultado final.", EN: "Very easy to use. I don't know much about editing, but this gave professional results with just one click.", ES: "Muy fácil de usar. No sé de edición, pero ahora solo pongo el filtro y la foto queda con otra calidad." },
  test3Text: { PT: "Finalmente consegui deixar meu feed organizado! Economizo horas que passava editando. Valeu cada centavo investido. Comprem sem medo.", EN: "Saved me hours of editing. Worth every penny. Buy without fear.", ES: "¡Ahorré horas que pasaba editando! Valió cada centavo invertido. Compren sin miedo." },
  test4Text: { PT: "Os presets salvaram minhas fotos da viagem! Um visual muito estético. Melhor compra que fiz pro meu Instagram. O suporte foi incrivel também.", EN: "They saved my travel photos! Very aesthetic. Best purchase for my Insta ever. Great support too.", ES: "¡Salvaron mis fotos de viaje! Un visual muy estético. La mejor compra para mi Instagram." },

  // Features
  feat1Title: { PT: "Download Instantâneo", EN: "Instant Download", ES: "Descarga Instantánea" },
  feat1Desc: { PT: "Receba o acesso no exato momento após o pagamento.", EN: "Access immediately after payment.", ES: "Recibe el acceso en el momento posterior al pago." },
  feat2Title: { PT: "Compra Segura", EN: "Secure Switch", ES: "Compra Segura" },
  feat2Desc: { PT: "Ambiente de compra criptografado e confiável.", EN: "Encrypted and highly reliable shopping environment.", ES: "Entorno de compra encriptado y confiable." },
  feat3Title: { PT: "Satisfação Garantida", EN: "Satisfaction Guaranteed", ES: "Satisfacción Garantizada" },
  feat3Desc: { PT: "Presets testados e aprovados para resultados incríveis.", EN: "Approved presets for an incredible outcome.", ES: "Presets probados y aprobados." },
  feat4Title: { PT: "Suporte Imediato", EN: "Immediate Support", ES: "Soporte Inmediato" },
  feat4Desc: { PT: "Ajuda personalizada sempre que precisar.", EN: "Personalized help whenever you need it.", ES: "Ayuda personalizada siempre que lo necesites." },

  // Footer
  // Footer
  footerAboutKey: { PT: "SOBRE GORG PRESETS", EN: "ABOUT GORG PRESETS", ES: "ACERCA DE GORG PRESETS" },
  footerAboutPara: { PT: "Nossa missão é simplificar sua edição através de presets exclusivos e versáteis. Com poucos cliques, você garante consistência visual e cores incríveis, economizando tempo sem abrir mão da exclusividade.", EN: "Our mission is to simplify your editing through exclusive and versatile presets. With just a few clicks, you guarantee visual consistency and incredible colors, saving time without giving up exclusivity.", ES: "Nuestra misión es simplificar su edición a través de presets exclusivos y versátiles. Con solo unos pocos clics, garantiza una consistencia visual y colores increíbles, ahorrando tiempo sin renunciar a la exclusividad." },
  footerInfoKey: { PT: "INFORMAÇÕES", EN: "INFORMATION", ES: "INFORMACIÓN" },
  footerFaq: { PT: "Perguntas Frequentes", EN: "Frequently Asked Questions", ES: "Preguntas Frecuentes" },
  footerContact: { PT: "Contato", EN: "Contact", ES: "Contacto" },
  footerTerms: { PT: "Termos de uso", EN: "Terms of use", ES: "Términos de uso" },
  footerShipping: { PT: "Política de Envio", EN: "Shipping Policy", ES: "Política de envío" },
  footerRefund: { PT: "Política de Reembolso", EN: "Refund Policy", ES: "Política de reembolso" },
  footerPrivacy: { PT: "Política de Privacidade", EN: "Privacy Policy", ES: "Política de privacidad" },
  footerSupportKey: { PT: "ATENDIMENTO ONLINE", EN: "ONLINE SUPPORT", ES: "ATENCIÓN EN LÍNEA" },
  footerWeAccept: { PT: "Nós aceitamos", EN: "We accept", ES: "Nosotros aceptamos" },

  // Product Detail (PD)
  pdSoldCount: { PT: "1540 VENDIDOS", EN: "1540 SOLD", ES: "1540 VENDIDOS" },
  pdOriginalBadge: { PT: "PRESET ORIGINAL GORG", EN: "ORIGINAL GORG PRESET", ES: "PRESET ORIGINAL GORG" },
  pdDiscountTag: { PT: "50% OFF", EN: "50% OFF", ES: "50% DTO" },
  pdInstallments: { PT: "Parcelado", EN: "Installments", ES: "Cuotas" },
  pdPixPrice: { PT: "À vista (Pix)", EN: "One-time (Pix/Cards)", ES: "Pago único (Pix/Cards)" },
  pdInstallmentText: { PT: "12x de", EN: "12x of", ES: "12x de" },
  pdBuyNow: { PT: "COMPRAR AGORA", EN: "BUY NOW", ES: "COMPRAR AHORA" },
  pdSecurePayment: { PT: "PAGAMENTO 100% SEGURO", EN: "100% SECURE PAYMENT", ES: "PAGO 100% SEGURO" },
  pdDescTitle: { PT: "Descrição do Pack", EN: "Pack Description", ES: "Descripción del Pack" },
  pdEstheticTitle: { PT: "ESTÉTICA DO PRESET", EN: "PRESET ESTHETICS", ES: "ESTÉTICA DEL PRESET" },
  pdIncludedTitle: { PT: "O QUE ESTÁ INCLUSO", EN: "WHAT'S INCLUDED", ES: "QUÉ ESTÁ INCLUIDO" },
  pdIdealTitle: { PT: "IDEAL PARA", EN: "IDEAL FOR", ES: "IDEAL PARA" },
  pdSafetyTitle: { PT: "Pagamento e segurança", EN: "Payment and security", ES: "Pago y seguridad" },
  pdSafetyDesc: { PT: "Suas informações de pagamento são processadas com segurança. Nós não armazenamos dados do cartão de crédito nem temos acesso aos números do seu cartão.", EN: "Your payment information is processed securely. We do not store credit card details nor have access to your card numbers.", ES: "Su información de pago se procesa de forma segura. No almacenamos los datos de la tarjeta de crédito ni tenemos acceso aos números da sua tarjeta." },
  pdYouMayLike: { PT: "Você pode gostar", EN: "You may like", ES: "Te puede gustar" },
  pdHomeBreadcrumb: { PT: "Página Inicial", EN: "Home", ES: "Inicio" },
  pdProductsBreadcrumb: { PT: "Produtos", EN: "Products", ES: "Productos" },
  pdHintDesktop: { PT: "Passe o mouse ou role para aproximar", EN: "Hover or scroll to zoom", ES: "Pasa el mouse o desplaza para acercar" },
  pdHintMobile: { PT: "Use os botões ou as fotos abaixo", EN: "Use buttons or thumbnails below", ES: "Usa los botones o las fotos inferiores" },
  pdInternationalTitle: { PT: "ENTREGA DIGITAL", EN: "DIGITAL DELIVERY", ES: "ENTREGA DIGITAL" },
  pdInternationalAccess: { PT: "Acesso Imediato via E-mail", EN: "Instant Access via Email", ES: "Acceso Inmediato por Email" },
  pdInternationalCompatible: { PT: "Compatível com Mobile & Desktop", EN: "Mobile & Desktop Compatible", ES: "Compatible con Mobile & Desktop" },
  pdInternationalLifetime: { PT: "Download Vitalício", EN: "Lifetime Download", ES: "Descarga Vitalicia" },
  pdBadgeWarranty: { PT: "7 dias de garantia", EN: "7-day guarantee", ES: "7 días de garantía" },
  pdBadgeSecure: { PT: "Pagamento 100% seguro", EN: "100% secure payment", ES: "Pago 100% seguro" },
  pdBadgeInstant: { PT: "Envio imediato via e-mail", EN: "Instant email delivery", ES: "Envío inmediato por e-mail" },

  faqNote: { PT: "Os presets são produtos digitais de entrega imediata. Verifique seu e-mail (incluindo spam) após a confirmação do pagamento.", EN: "Presets are digital products with immediate delivery. Please check your email (including spam) after payment confirmation.", ES: "Los presets son productos digitales de entrega inmediata. Verifique su correo electrónico (incluido el spam) después de la confirmación del pago." },

  // Shipping Page
  shippingTitle1: { PT: "Política de ", EN: "Shipping ", ES: "Política de " },
  shippingTitle2: { PT: "Envio", EN: "Policy", ES: "Envío" },
  shippingSubtitle: { PT: "Entregas digitais seguras e automáticas para qualquer lugar do mundo.", EN: "Secure and automatic digital deliveries anywhere in the world.", ES: "Entregas digitales seguras y automáticas a cualquier parte del mundo." },
  shippingCard1Title: { PT: "Envio Imediato", EN: "Immediate Shipping", ES: "Envío Inmediato" },
  shippingCard1Desc: { PT: "O download é liberado automaticamente após a aprovação do pagamento.", EN: "Download is automatically released after payment approval.", ES: "La descarga se libera automáticamente tras la aprobación del pago." },
  shippingCard2Title: { PT: "Email Seguro", EN: "Secure Email", ES: "Correo Seguro" },
  shippingCard2Desc: { PT: "Você receberá um email com os links e o guia de instalação em PDFs.", EN: "You will receive an email with the links and installation guide in PDFs.", ES: "Recibirás un correo con los enlaces y la guía de instalación en PDFs." },
  shippingCard3Title: { PT: "Acesso Vitalício", EN: "Lifetime Access", ES: "Acceso Vitalicio" },
  shippingCard3Desc: { PT: "O produto é seu para sempre. Pode baixar quantas vezes precisar.", EN: "The product is yours forever. You can download it as many times as you need.", ES: "El producto es tuyo para siempre. Puedes descargarlo tantas veces como necesites." },
  shippingSec1Title: { PT: "Prazos de Entrega", EN: "Delivery Times", ES: "Plazos de Entrega" },
  shippingSec1Desc1: { PT: "Cartão de Crédito e Pix: Entrega instantânea (em até 5 minutos).", EN: "Credit Card and Pix: Instant delivery (within 5 minutes).", ES: "Tarjeta de Crédito y Pix: Entrega instantánea (en hasta 5 minutos)." },
  shippingSec1Desc2: { PT: "Boleto Bancário: O link de download é enviado assim que o banco confirmar a compensação (de 24h a 48h úteis).", EN: "Bank Slip: The download link is sent as soon as the bank confirms compensation (from 24h to 48h business hours).", ES: "Boleto Bancario: El enlace de descarga se envía tan pronto como el banco confirme la compensación (de 24h a 48h hábiles)." },
  shippingSec2Title: { PT: "Não Recebi o Email", EN: "Didn't Receive Email", ES: "No Recibí el Correo" },
  shippingSec2Desc: { PT: "Certifique-se de verificar sua caixa de SPAM ou de PROMOÇÕES. Se após 1 hora do pagamento você ainda não tiver recebido, entre em contato imediatamente com o nosso suporte através do WhatsApp ou e-mail.", EN: "Be sure to check your SPAM or PROMOTIONS folder. If after 1 hour of payment you still haven't received it, contact our support immediately via WhatsApp or email.", ES: "Asegúrese de revisar su carpeta de SPAM o de PROMOCIONES. Si después de 1 hora del pago aún no lo ha recibido, contáctenos inmediatamente a través de WhatsApp o correo electrónico." },

  // Terms Page
  termsTitle1: { PT: "Termos de ", EN: "Terms of ", ES: "Términos de " },
  termsTitle2: { PT: "Serviço", EN: "Service", ES: "Servicio" },
  termsUpdate: { PT: "Última atualização: 19 de Março de 2026", EN: "Last update: March 19, 2026", ES: "Última actualización: 19 de marzo de 2026" },
  termsSec1Title: { PT: "1. Aceitação dos Termos", EN: "1. Acceptance of Terms", ES: "1. Aceptación de los Términos" },
  termsSec1Desc: { PT: "Ao acessar e usar este site, você concorda em cumprir e estar vinculado aos seguintes Termos de Serviço da Gorg Presets. Se você não concordar com qualquer parte desses termos, não use o nosso site ou produtos.", EN: "By accessing and using this site, you agree to comply with and be bound by the following Gorg Presets Terms of Service. If you do not agree with any part of these terms, do not use our site or products.", ES: "Al acceder y usar este sitio, usted acepta cumplir y estar vinculado a los siguientes Términos de Servicio de Gorg Presets. Si no está de acuerdo con alguna parte de estos términos, no use nuestro sitio o productos." },
  termsSec2Title: { PT: "2. Propriedade Intelectual", EN: "2. Intellectual Property", ES: "2. Propiedad Intelectual" },
  termsSec2Desc: { PT: "Todos os presets, vídeos, imagens e textos disponíveis neste site são propriedade exclusiva da Gorg Presets. A compra de um preset concede a você uma licença de uso pessoal e intransferível. É estritamente proibida a revenda, compartilhamento gratuito, sublicenciamento ou qualquer forma de distribuição comercial sem autorização expressa.", EN: "All presets, videos, images and texts available on this site are the exclusive property of Gorg Presets. The purchase of a preset grants you a personal and non-transferable license of use. Resale, free sharing, sublicensing or any form of commercial distribution without express authorization is strictly prohibited.", ES: "Todos los presets, videos, imágenes y textos disponibles en este sitio son propiedad exclusiva de Gorg Presets. La compra de un preset le otorga una licencia de uso personal e intransferible. Está estrictamente prohibida la reventa, el intercambio gratuito, el sublicenciamiento o cualquier forma de distribución comercial sin autorización expresa." },
  termsSec3Title: { PT: "3. Uso do Produto", EN: "3. Product Use", ES: "3. Uso del Producto" },
  termsSec3Desc: { PT: "Nossos presets são projetados para funcionar no Adobe Lightroom (Mobile e Desktop). A aplicação dos presets resulta em edições automáticas, mas os resultados finais podem variar dependendo da iluminação, cores e qualidade da foto original. A compra não garante acesso ao software Adobe Lightroom em si.", EN: "Our presets are designed to work in Adobe Lightroom (Mobile and Desktop). Applying presets results in automatic edits, but final results may vary depending on lighting, colors, and original photo quality. Purchase does not guarantee access to the Adobe Lightroom software itself.", ES: "Nuestros presets están diseñados para funcionar en Adobe Lightroom (Móvil y Escritorio). La aplicación de los presets resulta en ediciones automáticas, pero los resultados finales pueden variar según la iluminación, los colores y la calidad de la foto original. La compra no garantiza el acceso al software Adobe Lightroom en sí." },
  termsSec4Title: { PT: "4. Pagamentos e Reembolsos", EN: "4. Payments and Refunds", ES: "4. Pagos y Reembolsos" },
  termsSec4Desc: { PT: "Os preços estão sujeitos a alterações sem aviso prévio. Devido à natureza digital dos nossos produtos (arquivos baixáveis instantaneamente), as solicitações de reembolso são tratadas de acordo com as leis locais de comércio eletrônico para produtos digitais. Consulte nossa Política de Reembolso para detalhes específicos.", EN: "Prices are subject to change without notice. Due to the digital nature of our products (instantly downloadable files), refund requests are handled according to local e-commerce laws for digital products. See our Refund Policy for specific details.", ES: "Los precios están sujetos a cambios sin previo aviso. Debido a la naturaleza digital de nuestros productos (archivos descargables al instante), las solicitudes de reembolso se manejan de acuerdo con las leyes locales de comercio electrónico para productos digitales. Consulte nuestra Política de Reembolso para obtener detalles específicos." },
  termsFooterNotice: { PT: "Gorg Presets reserva-se o direito de atualizar estes termos a qualquer momento. O uso contínuo do site após as alterações constitui aceitação dos novos termos.", EN: "Gorg Presets reserves the right to update these terms at any time. Continued use of the site after changes constitutes acceptance of the new terms.", ES: "Gorg Presets se reserva el derecho de actualizar estos términos en cualquier momento. El uso continuado del sitio después de los cambios constituye la aceptación de los nuevos términos." },

  // Refund Page
  refundTitle1: { PT: "Política de ", EN: "Refund ", ES: "Política de " },
  refundTitle2: { PT: "Reembolso", EN: "Policy", ES: "Reembolso" },
  refundSubtitle: { PT: "Satisfação garantida ou seu investimento de volta.", EN: "Satisfaction guaranteed or your investment back.", ES: "Satisfacción garantizada o le devolvemos su inversión." },
  refundCard1Title: { PT: "7 Dias Grátis", EN: "7 Days Free", ES: "7 Días Gratis" },
  refundCard1Desc: { PT: "Garantia total de 7 dias após a confirmação da compra.", EN: "Full 7-day guarantee after purchase confirmation.", ES: "Garantía total de 7 días tras la confirmación de la compra." },
  refundCard2Title: { PT: "Devolução 100%", EN: "100% Refund", ES: "Devolución 100%" },
  refundCard2Desc: { PT: "Estornamos o valor integral sem questionários chatos.", EN: "We refund the full amount without boring questionnaires.", ES: "Reembolsamos el importe total sin cuestionarios aburridos." },
  refundCard3Title: { PT: "Suporte VIP", EN: "VIP Support", ES: "Soporte VIP" },
  refundCard3Desc: { PT: "Nossa prioridade é que você esteja feliz com as edições.", EN: "Our priority is for you to be happy with your edits.", ES: "Nuestra prioridad es que estés feliz con tus ediciones." },
  refundSec1Title: { PT: "Condições para Reembolso", EN: "Refund Conditions", ES: "Condiciones de Reembolso" },
  refundSec1Desc: { PT: "Nossa Política de Reembolso visa uma relação transparente com o nosso cliente. Como nossos produtos são digitais (entregáveis via download imediato), oferecemos uma garantia incondicional de 7 dias para que você possa testar o produto.", EN: "Our Refund Policy aims for a transparent relationship with our client. Since our products are digital (instantly downloadable), we offer an unconditional 7-day guarantee so you can test the product.", ES: "Nuestra Política de Reembolso busca una relación transparente con nuestro cliente. Como nuestros productos son digitales (descargables al instante), ofrecemos una garantía incondicional de 7 días para que pueda probar el producto." },
  refundSec2Title: { PT: "Como Solicitar", EN: "How to Request", ES: "Cómo Solicitar" },
  refundSec2Desc: { PT: "Basta enviar um e-mail para suporte@gorgpresets.com com o título 'Solicitação de Reembolso' acompanhado do seu número de pedido ou email de compra. O estorno será processado diretamente pelo processador de pagamento utilizado (Cartão, Pix ou Boleto).", EN: "Just send an email to suporte@gorgpresets.com with the subject 'Refund Request' along with your order number or purchase email. The reversal will be processed directly by the payment processor used (Card, Pix or Bank Slip).", ES: "Basta con enviar un correo a soporte@gorgpresets.com con el asunto 'Solicitud de Reembolso' junto con su número de pedido o correo de compra. El reembolso será procesado directamente por el procesador de pagos utilizado (Tarjeta, Pix o Boleto)." },

  // Cart Drawer
  cartMyPresets: { PT: "Meus Presets", EN: "My Presets", ES: "Mis Presets" },
  cartPack: { PT: "Pack Selecionado", EN: "Pack Selected", ES: "Pack Seleccionado" },
  cartPacks: { PT: "Packs Selecionados", EN: "Packs Selected", ES: "Packs Seleccionados" },
  cartPromoTitle: { PT: "Promoção Leve 3, Pague 2", EN: "Buy 2, Get 1 Free Promo", ES: "Promoción Lleva 3, Paga 2" },
  cartPromoWin: { PT: "Você já ganhou {n} pack(s) grátis!", EN: "You've already won {n} free pack(s)!", ES: "¡Ya has ganado {n} pack(s) gratis!" },
  cartPromoMiss: { PT: "Falta apenas {n} para ganhar outro pack!", EN: "Only {n} left to get another free pack!", ES: "¡Falta solo {n} para ganar otro pack!" },
  cartSummary: { PT: "Resumo do Pedido", EN: "Order Summary", ES: "Resumen del Pedido" },
  cartSavings: { PT: "Você economizou", EN: "You saved", ES: "Has ahorrado" },
  cartUpsell: { PT: "Você pode gostar também", EN: "You may also like", ES: "Te puede gustar también" },
  cartSecure: { PT: "Pagamento 100% processado de forma segura e imediata via PIX ou Cartão.", EN: "100% secure payment processed immediately via Card or PIX.", ES: "Pago 100% seguro procesado de forma inmediata vía Tarjeta o PIX." },
  cartRedir: { PT: "Redirecionamento Protegido", EN: "Secure Redirection", ES: "Redirección Protegida" },
  cartContinue: { PT: "CONTINUAR NAVEGANDO", EN: "CONTINUE SHOPPING", ES: "CONTINUAR NAVEGANDO" },
  cartExplore: { PT: "Começar a Explorar", EN: "Start Exploring", ES: "Empezar a Explorar" },
  cartTotalOrder: { PT: "Total do Pedido", EN: "Order Total", ES: "Total del Pedido" },
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
        } else if (data.country_code === 'ES') {
          setLanguage("ES");
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
