import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!supabaseUrl || !anonKey || !serviceKey || !authHeader) {
    return json({ error: 'La función no está configurada.' }, 500)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) return json({ error: 'Sesión inválida' }, 401)

  const { data: actor, error: actorError } = await userClient
    .from('profiles')
    .select('rol, activo')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (actorError || !actor?.activo || !['admin', 'rh_admin'].includes(actor.rol)) {
    return json({ error: 'Sin permiso para crear usuarios' }, 403)
  }

  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const nombre = String(body.nombre_completo ?? '').trim()
  const rol = String(body.rol ?? 'viewer')
  const allowed = actor.rol === 'admin' ? ['admin', 'rh_admin', 'viewer'] : ['rh_admin', 'viewer']

  if (!allowed.includes(rol)) return json({ error: 'No puedes asignar ese rol' }, 403)
  if (!email || !nombre || password.length < 8) {
    return json({ error: 'Correo, nombre y una contraseña de al menos 8 caracteres son obligatorios' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceKey)
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: nombre },
  })
  if (createError || !created.user) return json({ error: createError?.message ?? 'No se pudo crear la cuenta' }, 400)

  const { error: profileError } = await admin
    .from('profiles')
    .update({ rol, nombre_completo: nombre.slice(0, 150), activo: true })
    .eq('id', created.user.id)
  if (profileError) return json({ error: profileError.message }, 500)

  return json({ id: created.user.id, email, rol })
})
