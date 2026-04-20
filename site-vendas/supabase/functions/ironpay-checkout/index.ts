import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const API_TOKEN = Deno.env.get('IRONPAY_API_TOKEN')

    if (!API_TOKEN) {
      return new Response(JSON.stringify({ success: false, message: 'Chave API da Ironpay não configurada.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    const payload = {
      api_token: API_TOKEN,
      offer_hash: body.offer_hash,
      amount: body.amount,
      payment_method: body.payment_method,
      cart: body.cart,
      customer: body.customer,
    };

    const BASE_URL = "https://api.ironpayapp.com.br/api/public/v1";

    const res = await fetch(`${BASE_URL}/transactions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: json.message ?? "Erro ao processar pagamento na Ironpay.", 
        errors: json.errors 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: res.status
      })
    }

    return new Response(JSON.stringify(json), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
