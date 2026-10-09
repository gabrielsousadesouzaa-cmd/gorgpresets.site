import type {
  AddMemberInput,
  AddMemberResult,
  AuthSnapshot,
  Catalog,
  EmailSettings,
  EmailStatus,
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
  UploadOptions,
  WebhookLog,
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
  setMemberPassword(email: string, password: string): Promise<void>;
  listWebhookLogs(): Promise<WebhookLog[]>;
  getStats(): Promise<PortalStats>;
  /** Link do webhook com o token (visível só para o produtor). */
  getWebhookUrl(): Promise<string>;
  /** Gera um novo token; o link antigo para de funcionar. */
  rotateWebhookToken(): Promise<string>;
  /** Conexão com o Resend (provedor do e-mail de boas-vindas). */
  getEmailStatus(): Promise<EmailStatus>;
  /** Salva a chave do Resend (vazio remove). A chave nunca volta para o navegador. */
  saveEmailKey(key: string): Promise<EmailStatus>;
  /** Envia o e-mail de boas-vindas de teste com o modelo informado. */
  sendTestEmail(to: string, settings: EmailSettings, existingAccount?: boolean): Promise<void>;

  upload(file: File, options: UploadOptions): Promise<string>;
}

export class SetupRequiredError extends Error {
  constructor(message = "As tabelas da área de membros ainda não foram criadas no Supabase.") {
    super(message);
    this.name = "SetupRequiredError";
  }
}
