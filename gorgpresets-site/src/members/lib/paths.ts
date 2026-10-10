// Endereços da Área de Membros.
//
// A área tem endereço próprio (area.gorgpresets.com), separado da loja
// (www.gorgpresets.com) e da área antiga (membros.gorgpresets.com, WordPress).
// O mesmo projeto da Vercel atende os dois domínios: no endereço próprio as
// rotas ficam na raiz (/colecao/x, /studio); na loja e nas prévias da Vercel,
// sob /membros (/membros/colecao/x).

/** Endereço oficial da área de membros (links de e-mail e da loja). */
export const MEMBERS_ORIGIN = "https://area.gorgpresets.com";

/** Endereço da loja. */
export const STORE_ORIGIN = "https://www.gorgpresets.com";

/** Logo dos e-mails (fundo transparente, escrito em preto): o da loja, que já está no ar. */
export const EMAIL_LOGO_URL = `${STORE_ORIGIN}/logo.png`;

/** Domínios da loja: lá, /membros leva para o endereço próprio. */
const STORE_HOSTS = new Set(["gorgpresets.com", "www.gorgpresets.com"]);

/** "area." (e "membros.", quando a área antiga for desligada) abre direto a área de membros. */
const MEMBERS_HOST = /^(area|membros)\./i;

const currentHost = () => (typeof window === "undefined" ? "" : window.location.hostname);

export const isMembersHost = (host = currentHost()) => MEMBERS_HOST.test(host);
export const isStoreHost = (host = currentHost()) => STORE_HOSTS.has(host.toLowerCase());

/** Prefixo das rotas: "" no endereço próprio, "/membros" na loja, nas prévias e no computador. */
export const MEMBERS_BASE = isMembersHost() ? "" : "/membros";

/**
 * Caminho dentro da área de membros: mp("/colecao/x") → "/colecao/x" no endereço
 * próprio ou "/membros/colecao/x" no resto. mp("/") é o início; mp("/?editar=1") também funciona.
 */
export function mp(path = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!MEMBERS_BASE) return p;
  if (p === "/") return MEMBERS_BASE;
  if (p.startsWith("/?") || p.startsWith("/#")) return MEMBERS_BASE + p.slice(1);
  return MEMBERS_BASE + p;
}

/** Suporte sem WhatsApp configurado: a página de contato da loja (aberta para todos). */
export const STORE_CONTACT_URL = `${STORE_ORIGIN}/contact`;

/** Link "Ir para a loja": no endereço próprio aponta para a loja; no resto, para a raiz do site. */
export const storeHref = () => (isMembersHost() ? STORE_ORIGIN : "/");

/** O caminho atual pertence à área de membros? */
export const inMembersArea = (pathname: string) => !MEMBERS_BASE || pathname === MEMBERS_BASE || pathname.startsWith(`${MEMBERS_BASE}/`);

/** O caminho atual é do Studio do produtor? */
export const inStudio = (pathname: string) => pathname === mp("/studio") || pathname.startsWith(`${mp("/studio")}/`);

/** Endereço completo da área como o visitante está vendo (Studio, links copiados). */
export const portalUrl = () => (typeof window === "undefined" ? MEMBERS_ORIGIN : window.location.origin + MEMBERS_BASE);

/**
 * Endereço que os e-mails usam: o oficial. Nas prévias da Vercel e no computador,
 * o da própria página (para os links do teste funcionarem ali).
 */
export const emailPortalUrl = () => {
  const host = currentHost();
  return !host || isMembersHost(host) || isStoreHost(host) ? MEMBERS_ORIGIN : portalUrl();
};

/** Na loja, o caminho equivalente no endereço próprio: /membros/colecao/x → https://area.../colecao/x. */
export function membersUrlFromStorePath(pathname: string, search = "", hash = ""): string {
  const rest = pathname.replace(/^\/membros(?=\/|$)/, "") || "/";
  return `${MEMBERS_ORIGIN}${rest}${search}${hash}`;
}
