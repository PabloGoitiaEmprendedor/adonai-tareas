# Clerk Authentication — Configuración Completa

## 1. Migración de Base de Datos

La tabla `clerk_user_links` aún no está creada en Supabase. Debes aplicar la migración:

### Opción A — SQL Editor (recomendado)
1. Abre https://supabase.com/dashboard/project/bpckgibqjrqdxzbvtiyn/sql/new
2. Pega el contenido de `supabase/migrations/20260606125000_add_clerk_shadow_auth_bridge.sql`
3. Haz clic en **Run**

### Opción B — Script automático
```powershell
# 1. Obtén tu service_role key en:
#    https://supabase.com/dashboard/project/bpckgibqjrqdxzbvtiyn/settings/api
# 2. Ejecuta:
$env:SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key-aqui"
node scripts/apply-clerk-migration.mjs
```

---

## 2. Secrets de Supabase Edge Function

La Edge Function `clerk-supabase-token` necesita 3 secrets. Configúralos en Supabase:

### Desde la Dashboard
1. Ve a https://supabase.com/dashboard/project/bpckgibqjrqdxzbvtiyn/edge-functions
2. Selecciona `clerk-supabase-token`
3. Ve a la pestaña **Secrets**
4. Agrega:

| Secret | Valor | Dónde obtenerlo |
|--------|-------|-----------------|
| `CLERK_SECRET_KEY` | `sk_test_...` | https://dashboard.clerk.com → Apps → Adonai → API Keys |
| `CLERK_JWT_KEY` | `-----BEGIN PUBLIC KEY-----...` | Clerk Dashboard → Sessions → JWT Templates → "Supabase" → Public Key |
| `CLERK_AUTHORIZED_PARTIES` | `http://localhost:5173,https://adonai-tareas.vercel.app,https://webadonai.com` | URLs donde corre la app |

### Desde CLI (si funciona)
```powershell
npx supabase secrets set CLERK_SECRET_KEY=sk_test_...
npx supabase secrets set CLERK_JWT_KEY="-----BEGIN PUBLIC KEY-----..."
npx supabase secrets set CLERK_AUTHORIZED_PARTIES="http://localhost:5173,https://adonai-tareas.vercel.app"
```

---

## 3. JWT Template en Clerk Dashboard

Clerk necesita un JWT Template para que la Edge Function pueda verificar los tokens:

1. Ve a https://dashboard.clerk.com
2. Selecciona tu app **Adonai**
3. Navega a **Sessions** → **JWT Templates**
4. Haz clic en **+ New template**
5. Configura:
   - **Name**: `Supabase`
   - **Signing key**: Genera una nueva
   - **Claims** (opcional, por defecto funciona):
     ```json
     {
       "sub": "{{user.id}}",
       "email": "{{user.primary_email_address}}"
     }
     ```
6. Guarda el template
7. Copia la **Public Key** que aparece (es el `CLERK_JWT_KEY` del paso 2)

---

## 4. Verificación

### Probar la Edge Function localmente
```powershell
npx supabase functions serve clerk-supabase-token --env-file .env.local
```

### Probar el flujo completo
1. Abre la app en `http://localhost:5173`
2. Haz clic en "Entrar" / "Crear cuenta"
3. Inicia sesión con Clerk (email + código)
4. Abre DevTools → Console
5. Deberías ver:
   - `[Auth] Clerk to Supabase bridge...`
   - `[Auth] Internal Supabase session was created`

### Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `Server auth bridge is not configured` | Faltan secrets en Supabase | Configura `CLERK_SECRET_KEY`, `CLERK_JWT_KEY` |
| `Invalid Clerk token` | JWT Key incorrecta o template no existe | Regenera el JWT Template y actualiza `CLERK_JWT_KEY` |
| `Could not find the table public.clerk_user_links` | Migración no aplicada | Aplica la migración del Paso 1 |
| `Unauthorized` | Authorized Parties no coincide | Agrega la URL exacta de la app a `CLERK_AUTHORIZED_PARTIES` |

---

## 5. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `.env` | Se agregó `VITE_CLERK_PUBLISHABLE_KEY` |
| `.env.production` | Se agregó `VITE_CLERK_PUBLISHABLE_KEY` |
| `package.json` | Se agregó `@clerk/localizations` como dependencia directa |
| `supabase/migrations/20260606125000_add_clerk_shadow_auth_bridge.sql` | Migración lista (pendiente de aplicar) |
| `scripts/apply-clerk-migration.mjs` | Script auxiliar para aplicar la migración |
