// Regras da automação do checkout (o que fazer a cada venda, reembolso e
// chargeback). Sem dependências: usado pela Edge Function e pelo Studio.

export type PasswordMode = "random" | "fixed" | "cpf";

export interface AutomationSettings {
  /** Webhook ligado. Desligado, as vendas só ficam registradas no histórico. */
  enabled: boolean;
  grantOnApproved: boolean;
  revokeOnRefund: boolean;
  revokeOnChargeback: boolean;
  /** Senha das contas criadas pela automação. */
  passwordMode: PasswordMode;
  /** Pede uma senha nova no primeiro acesso (o conteúdo só abre depois). */
  forcePasswordChange: boolean;
  /** Espera antes de enviar o e-mail, para juntar compras seguidas num só (0 a 8 s). */
  batchSeconds: number;
}

export const DEFAULT_AUTOMATION: AutomationSettings = {
  enabled: true,
  grantOnApproved: true,
  revokeOnRefund: true,
  revokeOnChargeback: true,
  passwordMode: "random",
  forcePasswordChange: false,
  batchSeconds: 4,
};

export const PASSWORD_MODES: Array<{ id: PasswordMode; label: string; text: string }> = [
  { id: "random", label: "Senha aleatória", text: "Cada comprador recebe uma senha única por e-mail. A opção mais segura." },
  { id: "fixed", label: "Senha padrão", text: "Todos recebem a mesma senha (mínimo 6 caracteres). Prático, mas qualquer um que saiba o e-mail de um aluno consegue entrar — use com a troca obrigatória." },
  { id: "cpf", label: "CPF do comprador", text: "A senha é o CPF (só números) enviado pelo checkout. Sem CPF no pedido, usa uma senha aleatória." },
];

const bool = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);

export function mergeAutomation(raw: unknown): AutomationSettings {
  const d = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const mode = d.passwordMode === "fixed" || d.passwordMode === "cpf" || d.passwordMode === "random" ? d.passwordMode : DEFAULT_AUTOMATION.passwordMode;
  const batch = typeof d.batchSeconds === "number" && Number.isFinite(d.batchSeconds) ? Math.round(d.batchSeconds) : DEFAULT_AUTOMATION.batchSeconds;
  return {
    enabled: bool(d.enabled, DEFAULT_AUTOMATION.enabled),
    grantOnApproved: bool(d.grantOnApproved, DEFAULT_AUTOMATION.grantOnApproved),
    revokeOnRefund: bool(d.revokeOnRefund, DEFAULT_AUTOMATION.revokeOnRefund),
    revokeOnChargeback: bool(d.revokeOnChargeback, DEFAULT_AUTOMATION.revokeOnChargeback),
    passwordMode: mode,
    forcePasswordChange: bool(d.forcePasswordChange, DEFAULT_AUTOMATION.forcePasswordChange),
    batchSeconds: Math.min(8, Math.max(0, batch)),
  };
}

/** Senha a partir do CPF/CNPJ (só dígitos). Vazio quando não dá para usar. */
export function documentPassword(document: string): string {
  const digits = String(document || "").replace(/\D/g, "");
  return digits.length >= 6 ? digits : "";
}
