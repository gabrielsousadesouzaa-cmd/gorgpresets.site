import { supabase } from "@/lib/supabase";

export interface GGCheckoutParams {
  amount: number; // centavos
  name: string;
  email: string;
  phone?: string;
  document?: string;
  items?: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
}

export async function createGGCheckoutSession(params: GGCheckoutParams) {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase não inicializado.' };
    }

    const { data, error } = await supabase.functions.invoke('ggcheckout-checkout', {
      body: params
    });

    if (error) {
      console.error('Supabase Function Invoke Error:', error);
      return { success: false, error: `Erro na Cloud: ${error.message || 'Falha ao chamar função'}` };
    }
    
    return data;
  } catch (error: any) {
    console.error('Error in GGCheckout service:', error);
    return { success: false, error: `Erro de Conexão: ${error.message || 'Falha na comunicação'}` };
  }
}
