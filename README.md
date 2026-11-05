# Agenda

Agenda digitale per gli impegni di papà: poche funzioni, grandi, impossibili da sbagliare.
Sembra un'agenda di carta, con vista settimanale e mensile, e si sfoglia con il dito.

- **App:** https://simonebiscaro.github.io/Agenda/ (sull'iPhone: Safari → Condividi → *Aggiungi alla schermata Home*)
- **Come è fatta:** PWA senza build step (Preact + htm, ES modules), dati nel telefono (IndexedDB), copia di sicurezza cifrata su Supabase. Regole e decisioni in [CLAUDE.md](CLAUDE.md), fasi di lavoro in [docs/PROMPTS_CLAUDE_CODE.md](docs/PROMPTS_CLAUDE_CODE.md).

## Sviluppo

```sh
node --test tests/                    # test (Node 20+, nessuna dipendenza)
python3 -m http.server -d app 8080    # http://localhost:8080/
```

`#/catalogo` mostra tutti i componenti in tutti gli stati (pagina di sviluppo, non linkata).
Il deploy su GitHub Pages parte da solo a ogni push su `main` (`.github/workflows/pages.yml`).

## Limiti noti

Repo pubblico: il codice è visibile, i dati no (cifrati). Nessun promemoria o notifica, per scelta.
I dettagli sulla copia di sicurezza arrivano con la Fase 5.
