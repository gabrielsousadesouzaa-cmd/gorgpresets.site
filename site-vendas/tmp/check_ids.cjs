const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ibsnizsdascywkonvcvu.supabase.co';
const supabaseKey = 'sb_publishable_4Y3tTft5Y-NbYkvKd__Drg_9CeeLKU-';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProducts() {
  console.log('--- Iniciando diagnóstico de IDs ---');
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, checkout_id, checkout_url')
      .limit(5);

    if (error) {
      console.error('Erro ao buscar dados:', error.message);
      return;
    }

    if (data && data.length > 0) {
      console.log('Encontrados ' + data.length + ' produtos.');
      for (const p of data) {
        console.log('----------------------------');
        console.log('Nome: ' + p.name);
        console.log('ID Supabase: ' + p.id);
        console.log('Checkout ID (GGC): ' + (p.checkout_id || 'VAZIO'));
        console.log('Checkout URL: ' + (p.checkout_url || 'N/A'));
      }
    } else {
      console.log('Nenhum produto encontrado no banco.');
    }
  } catch (err) {
    console.error('Erro geral:', err.message);
  }
}

checkProducts();
