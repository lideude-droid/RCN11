const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn(
    '[supabase] SUPABASE_URL ou SUPABASE_SERVICE_KEY em falta nas variáveis de ambiente. ' +
    'O feed não vai funcionar até configurares isto no Render.'
  );
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_KEY || '', {
  auth: { persistSession: false }
});

module.exports = { supabase };
