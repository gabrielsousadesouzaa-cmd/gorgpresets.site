const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

(async () => {
  const { data, error } = await supabase.from('sales_settings').select('*');
  if (error) {
    console.error('DB Error:', error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
})();
