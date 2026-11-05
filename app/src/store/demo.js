/*
 * "Carica impegni di prova" (Impostazioni → Area tecnica): impegni d'esempio marcati demo:true,
 * rimovibili in un colpo solo con "Cancella impegni di prova". Mai creati da soli.
 */
import { addDays } from '../domain/dates.js';
import { getRepo } from './repo.js';

/**
 * I 12 impegni di prova, su 4 settimane a partire da `today`: tutte le categorie predefinite,
 * uno annuale, un giorno con 3 impegni, uno alle 6:30 e uno alle 23:00.
 * @param {string} today 'AAAA-MM-GG'
 */
export function buildDemoEvents(today) {
  const at = (days, time, title, categoryId, repeat = 'none') => ({
    title, date: addDays(today, days), time, categoryId, repeat, demo: true,
  });
  return [
    at(0, '10:30', 'Visita dal medico di base', 'cat-salute'),
    at(1, '08:00', 'Spesa al mercato', 'cat-casa'),
    at(2, '06:30', 'Analisi del sangue a digiuno', 'cat-salute'),
    at(2, '12:30', 'Pranzo dai nipoti', 'cat-famiglia'),
    at(2, '18:00', 'Innaffiare l’orto', 'cat-giardino'),
    at(4, '', 'Pesca al lago', 'cat-pesca'),
    at(6, '09:00', 'Idraulico per la caldaia', 'cat-casa'),
    at(9, '', 'Compleanno di Anna', 'cat-famiglia', 'yearly'),
    at(12, '23:00', 'Partita in televisione', 'cat-altro'),
    at(15, '10:00', 'Potare le rose', 'cat-giardino'),
    at(20, '07:00', 'Gara di pesca', 'cat-pesca'),
    at(26, '15:30', 'Controllo dal dentista', 'cat-salute'),
  ];
}

/** Elimina (tombstone) tutti gli impegni di prova. @returns numero eliminati */
export async function clearDemo(repo) {
  const r = repo ?? (await getRepo());
  const demo = (await r.list('event')).filter((e) => e.demo);
  if (demo.length) await r.batch(demo.map((e) => ({ entity: 'event', id: e.id, patch: { deleted: true } })));
  return demo.length;
}

/** Carica gli impegni di prova, togliendo prima quelli caricati in precedenza. @returns numero creati */
export async function loadDemo(today, repo) {
  const r = repo ?? (await getRepo());
  await clearDemo(r);
  const events = buildDemoEvents(today);
  await r.batch(events.map((e) => ({ entity: 'event', create: e })));
  return events.length;
}
