/*
 * Configurazione Supabase (pubblica per design: la sicurezza sta in RLS e nella cifratura E2E).
 * Solo l'URL del progetto e la chiave pubblica (publishable). MAI la service_role.
 * Valori vuoti = nessuna copia nel cloud: l'app funziona solo su questo telefono (fino alla Fase 5).
 */
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
