/**
 * IronPay API Service
 * Base URL: https://api.ironpayapp.com.br/api/public/v1
 *
 * IMPORTANTE: A variável VITE_IRONPAY_API_TOKEN deve estar no .env
 */

import { supabase } from "@/lib/supabase";

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
  if (!supabase) {
    return { success: false, message: 'Supabase não inicializado.' };
  }

  const payload = {
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

  try {
    const { data, error } = await supabase.functions.invoke('ironpay-checkout', {
      body: payload
    });

    if (error) {
      console.error('Supabase Function Invoke Error (Ironpay):', error);
      return { success: false, message: `Erro de Conexão na Cloud: ${error.message || 'Falha ao comunicar com Ironpay.'}` };
    }

    if (data?.success === false) {
       return { success: false, message: data.message ?? "Pagamento não aprovado pela Ironpay.", errors: data.errors };
    }

    return data as IronPayTransactionResponse;
  } catch (err: any) {
    console.error('Falha genérica Ironpay:', err);
    return { success: false, message: `Erro crítico de comunicação: ${err?.message || "Tente novamente."}` };
  }
}
