/*
 * Configurazione Supabase (pubblica per design: la sicurezza sta in RLS e nella cifratura E2E).
 * Solo l'URL del progetto e la chiave pubblica (publishable). MAI la service_role.
 * Valori vuoti = nessuna copia nel cloud: l'app funziona solo su questo telefono. Con i valori qui sotto, la copia si attiva solo dopo il collegamento in Impostazioni.
 */
export const SUPABASE_URL = 'https://hsnzyyynsstxaodkozzv.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_wFR753ZmdrbRreKYDy_DJg_hnS-xfbE';
