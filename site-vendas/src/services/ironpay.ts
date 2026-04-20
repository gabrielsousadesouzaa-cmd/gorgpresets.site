/**
 * IronPay API Service
 * Base URL: https://api.ironpayapp.com.br/api/public/v1
 *
 * IMPORTANTE: A variável VITE_IRONPAY_API_TOKEN deve estar no .env
 */

const API_TOKEN = import.meta.env.VITE_IRONPAY_API_TOKEN ?? "";
const BASE_URL = "https://api.ironpayapp.com.br/api/public/v1";

// ────────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────────

export type PaymentMethod = "pix" | "credit_card";

export interface CartItem {
  /** Hash da oferta cadastrada na IronPay (campo ironpayHash no produto) */
  product_hash: string;
  title: string;
  price: number;
  quantity: number;
}

export interface Customer {
  name: string;
  email: string;
  /** CPF ou documento – enviado como string sem pontuação */
  document?: string;
  /** Ex: "11999999999" (só números) */
  mobile?: string;
}

export interface CreateTransactionParams {
  /** Hash da oferta principal (primeiro item ou oferta principal da conta) */
  offer_hash: string;
  amount: number;          // valor total em REAIS (float)
  payment_method: PaymentMethod;
  cart: CartItem[];
  customer: Customer;
}

// Resposta completa da IronPay (campos principais que nos interessam)
export interface IronPayTransactionResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string | number;
    status: string;
    payment_method: string;
    amount: number;
    /** Link externo para redirecionar no caso de cartão de crédito */
    payment_link?: string;
    pix?: {
      /** QR Code em base64 – use na tag <img> */
      qr_code_image?: string;
      /** Código copia-e-cola do PIX */
      qr_code?: string;
      /** Chave EMV (alternativa) */
      emv?: string;
      expires_at?: string;
    };
  };
  errors?: Record<string, string[]>;
}

// ────────────────────────────────────────────────────────────────
// Função principal
// ────────────────────────────────────────────────────────────────

export async function createIronPayTransaction(
  params: CreateTransactionParams
): Promise<IronPayTransactionResponse> {
  const payload = {
    api_token: API_TOKEN,
    offer_hash: params.offer_hash,
    amount: params.amount,
    payment_method: params.payment_method,
    cart: params.cart.map((item) => ({
      product_hash: item.product_hash,
      title: item.title,
      price: item.price,
      quantity: item.quantity,
    })),
    customer: params.customer,
  };

  const res = await fetch(`${BASE_URL}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  // Log para depuração (remover em produção)
  console.log("[IronPay] Payload enviado:", JSON.stringify(payload, null, 2));

  const json = await res.json();

  // Garante que erros HTTP virem como `success: false`
  if (!res.ok) {
    return { success: false, message: json.message ?? "Erro ao processar pagamento.", errors: json.errors };
  }

  return json as IronPayTransactionResponse;
}
