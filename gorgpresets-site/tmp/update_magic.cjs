const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

(async () => {
  const { error } = await supabase.from('sales_settings').update({ 
    magic_before_url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1200', 
    magic_after_url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=1200' 
  }).eq('id', 'main');
  
  if (error) {
    console.error('Update Error:', error);
  } else {
    console.log('Mágica Restaurada no Banco! ✅🚀');
  }
})();
