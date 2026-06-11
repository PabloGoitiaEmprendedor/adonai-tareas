/**
 * Aplica la migración clerk_user_links a Supabase.
 *
 * USO:
 *   1. Ve a https://supabase.com/dashboard/project/bpckgibqjrqdxzbvtiyn/settings/api
 *   2. Copia tu "service_role key"
 *   3. Ejecuta:
 *        $env:SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
 *        node scripts/apply-clerk-migration.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bpckgibqjrqdxzbvtiyn.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('ERROR: Necesitas la Service Role Key de Supabase.');
  console.error('Obténla en: https://supabase.com/dashboard/project/bpckgibqjrqdxzbvtiyn/settings/api');
  process.exit(1);
}

const sqlPath = resolve(__dirname, '..', 'supabase', 'migrations', '20260606125000_add_clerk_shadow_auth_bridge.sql');
const sql = readFileSync(sqlPath, 'utf-8');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log('Aplicando migración clerk_user_links via SQL API...');

  const { error } = await supabase.rpc('exec_sql', { query: sql });

  if (error && error.message?.includes('function exec_sql')) {
    console.log('exec_sql RPC no encontrado. Intentando via endpoint de base de datos...');

    try {
      const res = await fetch(
        `https://api.supabase.com/v1/projects/bpckgibqjrqdxzbvtiyn/database/query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ query: sql }),
        }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      console.log('Migración aplicada exitosamente via Management API.');
    } catch (err) {
      console.error(`\nNo se pudo aplicar automáticamente: ${err.message}`);
      console.log('\n--- INSTRUCCIÓN MANUAL ---');
      console.log('1. Abre: https://supabase.com/dashboard/project/bpckgibqjrqdxzbvtiyn/sql/new');
      console.log('2. Pega el contenido de: supabase/migrations/20260606125000_add_clerk_shadow_auth_bridge.sql');
      console.log('3. Haz clic en "Run"');
      process.exit(1);
    }
  } else if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } else {
    console.log('Migración aplicada exitosamente.');
  }
}

main();
