# 🛒 GORG PRESETS | Loja Oficial

Vitrine de luxo e e-commerce de presets profissionais. Desenvolvido para oferecer uma experiência de compra rápida, segura e visualmente deslumbrante, focada na conversão e na estética minimalista.

## 🌟 Funcionalidades
- **Catálogo Dinâmico**: Gestão de produtos via Painel Administrativo integrado.
- **Checkout Integrado**: Suporte a gateways como GGCheckout e IronPay.
- **Multi-idioma**: Suporte completo a Português, Inglês, Espanhol e Francês.
- **Analytics Interno**: Monitoramento de visitas, cliques e intenções de compra em tempo real.
- **Promoções Inteligentes**: Lógica de "Leve 3, Pague 2" configurável.

## 🛠️ Tecnologias
- **Frontend**: React + TypeScript + Vite
- **Global State**: Zustand
- **Estilização**: Tailwind CSS (Lucide & Sonner para feedbacks)
- **Database**: Supabase (Gestão de produtos e configurações do site)

## ⚙️ Configuração (Environment)
O projeto requer um arquivo `.env` com as seguintes chaves:
```env
VITE_SUPABASE_URL=seu_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
VITE_GGCHECKOUT_API_KEY=sua_chave_api
VITE_GGCHECKOUT_STORE_ID=sua_loja_id
```

## 🚀 Como Rodar
1. Instale as dependências: `npm install`
2. Inicie o servidor: `npm run dev`
3. Gere o bundle de produção: `npm run build`

---
© 2026 Gorg Presets. Elevando o padrão da fotografia mobile.
