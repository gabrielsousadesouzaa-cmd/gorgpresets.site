import type {
  AddMemberInput,
  AddMemberResult,
  AuthSnapshot,
  Catalog,
  CheckoutItem,
  EmailLog,
  EmailLogFilter,
  EmailProviderStatus,
  EmailSettings,
  EmailTemplate,
  Lesson,
  Material,
  MemberSummary,
  Module,
  PortalSettings,
  PortalStats,
  Product,
  Progress,
  ReorderTable,
  Row,
  SimulateSaleInput,
  SmtpInput,
  TemplateKind,
  UploadOptions,
  WebhookLog,
  WebhookLogFilter,
} from "./types";

/**
 * Contrato único de acesso a dados. Existem duas implementações:
 * - supabaseRepo: produção (Postgres + Storage + Edge Function)
 * - localRepo: modo demonstração, salvo no navegador (sem backend)
 */
export interface MembersRepo {
  mode: "supabase" | "demo";

  // ── Autenticação ─────────────────────────────────────────────
  getAuth(): Promise<AuthSnapshot>;
  onAuthChange(cb: () => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  firstAccess(email: string, password: string, name: string): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  /** Troca obrigatória da senha provisória/padrão: grava a nova senha e libera o conteúdo. */
  completePasswordChange(password: string): Promise<void>;
  updateName(name: string): Promise<void>;
  verifyMfa(code: string): Promise<void>;

  // ── Portal do membro ─────────────────────────────────────────
  getSettings(): Promise<PortalSettings>;
  getCatalog(): Promise<Catalog>;
  getMyAccess(): Promise<string[]>;
  getMaterials(productId: string): Promise<Material[]>;
  getProgress(): Promise<Progress[]>;
  saveProgress(progress: Progress): Promise<void>;
  /** Converte `storage://bucket/caminho` em URL assinada; outras URLs passam direto. */
  resolveMediaUrl(url: string): Promise<string>;

  // ── Studio (somente produtor) ────────────────────────────────
  saveSettings(settings: PortalSettings): Promise<void>;
  saveProduct(product: Product): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  saveModule(mod: Module): Promise<Module>;
  deleteModule(id: string): Promise<void>;
  saveLesson(lesson: Lesson): Promise<Lesson>;
  deleteLesson(id: string): Promise<void>;
  saveMaterial(material: Material): Promise<Material>;
  deleteMaterial(id: string): Promise<void>;
  saveRow(row: Row): Promise<Row>;
  deleteRow(id: string): Promise<void>;
  reorder(table: ReorderTable, ids: string[]): Promise<void>;
  listMaterialsAdmin(): Promise<Material[]>;

  listMembers(): Promise<MemberSummary[]>;
  addMember(input: AddMemberInput): Promise<AddMemberResult>;
  /** Substitui a lista de coleções liberadas para o e-mail. */
  setMemberAccess(email: string, productIds: string[]): Promise<void>;
  /** Acrescenta coleções sem remover as que o e-mail já tem (importação). */
  grantAccess(email: string, productIds: string[]): Promise<void>;
  removeMember(email: string): Promise<void>;
  /** forceChange: o membro precisa criar outra senha no próximo acesso. */
  setMemberPassword(email: string, password: string, forceChange?: boolean): Promise<void>;
  /** Envia o link de redefinição de senha para o membro. */
  sendPasswordReset(email: string): Promise<void>;
  /** Gera senha nova e reenvia o e-mail de acesso (devolve a senha para o produtor também). */
  resendAccess(email: string): Promise<{ password: string; emailed: boolean; emailError: string }>;
  setMemberBlocked(email: string, blocked: boolean): Promise<void>;
  /** Muda nome e/ou e-mail (os acessos vão junto). Devolve o e-mail final. */
  updateMember(email: string, patch: { name?: string; newEmail?: string }): Promise<string>;
  getStats(): Promise<PortalStats>;

  // ── Automação do checkout ────────────────────────────────────
  /** Link do webhook com o token (visível só para o produtor). */
  getWebhookUrl(): Promise<string>;
  /** Gera um novo token; o link antigo para de funcionar. */
  rotateWebhookToken(): Promise<string>;
  listCheckoutItems(): Promise<CheckoutItem[]>;
  saveCheckoutItem(item: CheckoutItem): Promise<CheckoutItem>;
  deleteCheckoutItem(id: string): Promise<void>;
  getAutomationStatus(): Promise<{ hasFixedPassword: boolean }>;
  /** Senha padrão das contas criadas pela automação (vazio remove). Nunca volta para o navegador. */
  saveFixedPassword(password: string): Promise<{ hasFixedPassword: boolean }>;
  /** Venda de teste no formato do GGCheckout, processada como uma real. */
  simulateSale(input: SimulateSaleInput): Promise<{ ok: boolean; result: unknown }>;

  // ── Históricos ───────────────────────────────────────────────
  listWebhookLogs(filter?: WebhookLogFilter): Promise<WebhookLog[]>;
  /** Processa de novo o payload de um evento (ex: depois de ligar o produto a uma coleção). */
  replayWebhook(id: string): Promise<{ ok: boolean; result: unknown }>;
  clearWebhookLogs(): Promise<void>;
  listEmailLogs(filter?: EmailLogFilter): Promise<EmailLog[]>;
  /** HTML exatamente como foi enviado. */
  getEmailHtml(id: string): Promise<string>;
  resendEmail(id: string, to?: string): Promise<void>;
  clearEmailLogs(): Promise<void>;

  // ── Envio de e-mails ─────────────────────────────────────────
  getEmailStatus(): Promise<EmailProviderStatus>;
  /** smtp/resendKey: null remove; ausente mantém. Senhas e chaves nunca voltam para o navegador. */
  saveEmailProvider(input: { smtp?: SmtpInput | null; resendKey?: string | null; skipVerify?: boolean }): Promise<EmailProviderStatus>;
  testEmailConnection(): Promise<{ ok: boolean; message: string }>;
  /** Envia um teste do modelo (o que está na tela, mesmo antes de salvar). */
  sendTestEmail(input: { to: string; kind: TemplateKind; template: EmailTemplate; settings: EmailSettings; existingAccount?: boolean }): Promise<void>;

  upload(file: File, options: UploadOptions): Promise<string>;
}

export class SetupRequiredError extends Error {
  constructor(message = "As tabelas da área de membros ainda não foram criadas no Supabase.") {
    super(message);
    this.name = "SetupRequiredError";
  }
}
