# Agenda

Agenda di carta digitale per iPhone, pensata per una persona non tecnologica: vista settimanale e mensile, si sfoglia con il dito, pochi pulsanti grandi.

- **PWA** su GitHub Pages: <https://simonebiscaro.github.io/Agenda/> → Safari → Condividi → **Aggiungi alla schermata Home**.
- **Offline-first**: i dati stanno nel telefono (IndexedDB); copia di sicurezza **cifrata end-to-end** su Supabase (dalla Fase 5).
- Nessun build step, nessuna dipendenza a runtime da CDN, costo zero. Regole complete in [`CLAUDE.md`](CLAUDE.md), fasi in [`docs/PROMPTS_CLAUDE_CODE.md`](docs/PROMPTS_CLAUDE_CODE.md).

## Sviluppo

```sh
npm test                               # node --test tests/ (Node 20+)
python3 -m http.server -d app 8080     # poi http://localhost:8080/
```

`#/catalogo` mostra tutti i componenti in tutti gli stati (solo sviluppo, non linkato).
Ogni push su `main` esegue i test e pubblica la cartella `app/` su GitHub Pages.
A ogni modifica dell'app shell incrementare `CACHE_VERSION` in `app/sw.js` e `APP_VERSION` in `app/src/version.js`.

## Limiti noti

- Repo pubblico: il codice è visibile, i dati no (cifrati).
- Nessun promemoria o notifica, per scelta.
- Supabase Free non fa backup del database: le fotografie giornaliere stanno nello stesso progetto, quindi proteggono da errori sul telefono, non dalla perdita del progetto Supabase.
- Il progetto Supabase resta attivo grazie al keepalive del repo NexusLife: se quel repo viene archiviato, va aggiunto qui un `keepalive.yml` uguale.
- Se si perdono passphrase e telefono insieme, i dati non si recuperano.
