/**
 * BuckPay Frontend Service
 *
 * Toda comunicação com a BuckPay passa pela nossa Edge Function.
 * O token NUNCA fica exposto aqui.
 *
 * Edge Function URL: https://<project-ref>.functions.supabase.co/create-pix
 */

// URL da Edge Function Supabase
const EDGE_FN = `https://ibsnizsdascywkonvcvu.functions.supabase.co/create-pix`;

// ─── Tipos ───────────────────────────────────────────────────────

export interface CreatePixParams {
  name: string;
  email: string;
  document?: string;   // CPF sem pontuação
  phone?: string;      // ex: "5511999999999"
  amount: number;      // centavos
}

export interface PixData {
  code: string;           // copia e cola
  qrcode_base64: string;  // imagem base64
}

export interface CreatePixResponse {
  success: boolean;
  external_id?: string;
  pix?: PixData;
  error?: string;
}

export type PixStatus = "pending" | "paid" | "cancelled" | "expired";

export interface StatusResponse {
  success: boolean;
  status?: PixStatus;
  error?: string;
}

// ─── Criar transação PIX ─────────────────────────────────────────

export async function createPixTransaction(
  params: CreatePixParams
): Promise<CreatePixResponse> {
  try {
    const res = await fetch(EDGE_FN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const json = await res.json();

    if (!res.ok || json.error) {
      return { success: false, error: json.error ?? "Erro ao gerar PIX." };
    }

    const pix = json?.data?.pix;
    if (!pix?.code) {
      return { success: false, error: "Resposta inválida da BuckPay." };
    }

    return {
      success: true,
      external_id: json.external_id,
      pix: {
        code: pix.code,
        qrcode_base64: pix.qrcode_base64 ?? "",
      },
    };
  } catch {
    return { success: false, error: "Falha de conexão. Verifique sua internet." };
  }
}

// ─── Consultar status ─────────────────────────────────────────────

export async function getPixStatus(external_id: string): Promise<StatusResponse> {
  try {
    const res = await fetch(`${EDGE_FN}?external_id=${external_id}`);
    const json = await res.json();

    if (!res.ok || json.error) {
      return { success: false, error: json.error ?? "Erro ao consultar status." };
    }

    return { success: true, status: json?.data?.status as PixStatus };
  } catch {
    return { success: false, error: "Falha ao verificar status." };
  }
}
