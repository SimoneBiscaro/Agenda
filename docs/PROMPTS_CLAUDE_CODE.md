# PROMPTS_CLAUDE_CODE.md — Agenda

Prompt da incollare in Claude Code (claude.ai/code o app iPhone), una fase alla volta, sul repo `SimoneBiscaro/Agenda`. Ogni fase produce un'app funzionante e pubblicata.

## Fase 0 — Preparazione manuale (circa 10 minuti, la fai tu)

**GitHub**
1. github.com → **New repository** → nome `agenda` → **Public** (serve per Pages gratuito) → spunta **Add a README file** → **Create repository**.
2. Nel repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Carica nella radice `CLAUDE.md` e in `docs/` questo file (**Add file → Upload files**, poi **Commit changes**). Se il repo lo collego io da claude.ai, questo passo lo faccio io.

**Supabase** (stesso progetto di NexusLife)
4. supabase.com/dashboard → progetto NexusLife → **Authentication → Users → Add user → Create new user**: email dedicata (es. `simobiscaro01+agenda@gmail.com`), password robusta, **Auto Confirm User** attivo. Salva email e password nel tuo gestore di password.
5. Scegli ora la **passphrase** della cifratura (almeno 12 caratteri) e salvala nello stesso posto. Serve in Fase 5.
6. Non toccare "Allow new users to sign up": resta spento.

**Claude Code**
7. claude.ai/code → collega GitHub se richiesto → repo `SimoneBiscaro/Agenda`, branch `main`, modalità **Accept edits** (o Auto).

## Ciclo di ogni fase
1. Fai il **merge della fase precedente** prima di iniziare.
2. Incolla il blocco della fase e invia. Puoi chiudere la scheda: la sessione continua.
3. A fine lavoro: **Create PR** → su GitHub **Merge pull request**.
4. Scheda **Actions**: deploy verde = app aggiornata su `https://simonebiscaro.github.io/Agenda/`. Sull'iPhone tocca l'avviso "C'è una versione nuova".
5. Problemi? Scrivili nella stessa sessione, anche dopo la PR.
6. Una sessione nuova per fase dà contesto pulito; le fasi 1–2 e 5–6 possono stare nella stessa sessione.

---

## Fase 1 — Scheletro, design system, PWA, deploy
```
Leggi CLAUDE.md per intero: è vincolante.

FASE 1 — Scheletro, design system, componenti, PWA, deploy.

Riferimento: il repo pubblico https://github.com/SimoneBiscaro/nexuslife usa lo stesso stack. Clonalo in sola lettura e copia/adatta ciò che serve (vendor Preact+htm, sw.js, pages.yml, html.js, test app-shell), senza portare nulla delle sue sezioni o del suo design.

1. Struttura del repository esattamente come CLAUDE.md §3. package.json con "test": "node --test tests/". README breve.
2. app/vendor/: preact e htm ESM da npm, versioni in VERSIONS.txt. app/fonts/: Atkinson Hyperlegible 400/700 e Lora 500/600 in woff2 (fontsource), @font-face in base.css con font-display: swap.
3. styles/tokens.css con TUTTI i token di §5 (colori, raggi, tap, font) e la scala testo in rem; classe html.large-text che porta la base a 115%. base.css: reset, body var(--paper), focus visibile var(--focus), prefers-reduced-motion. components.css: stili dei componenti sotto.
4. Componenti in src/ui/ (§5): Binding (13 anelli, aria-hidden), Header (due righe, varianti normale e Giorno), Segmented (Settimana | Mese, aria-pressed), BigButton (64 px, --ribbon, icona +), PageFlip (contenitore con le 4 animazioni avanti/indietro alternate A/B per farle ripartire, nessuna con reduced-motion), Sheet (dal basso, maniglia, sfondo che chiude, gestione focus e Esc), CategoryChip (pallino + nome, stato selezionato), ColorPicker (8 colori della palette, aria-label col nome del colore), Toast (2,2 s, role=status), Confirm (domanda + "Sì, …" / "No"), SyncDot (verde/grigio/arancione con aria-label a parole), icons.js (frecce, +, ingranaggio, indietro: SVG a tratto, currentColor).
5. Router hash di §8 con le viste vuote ma navigabili (titoli giusti, frecce che cambiano settimana/mese/giorno usando una funzione step provvisoria in src/domain/dates.js che in Fase 2 verrà completata e testata). Avvio su #/settimana/<oggi>.
6. Pagina #/catalogo (non linkata) con ogni componente in tutti gli stati, compresa la scala testo normale e grande.
7. PWA §10: manifest, icone generate (agenda rilegata con nastro rosso, SVG → PNG 180/192/512/maskable), apple-touch-icon, viewport-fit=cover, safe area, sw.js cache-first con CACHE_VERSION e elenco SHELL, avviso "C'è una versione nuova — Tocca per aggiornare". src/version.js con APP_VERSION = '0.1.0' uguale a CACHE_VERSION.
8. .github/workflows/pages.yml: deploy di app/ su Pages a ogni push su main, più workflow_dispatch.
9. config.js con SUPABASE_URL e SUPABASE_ANON_KEY vuoti (l'app funziona solo in locale fino alla Fase 5).

Test: tests/app-shell.test.js (ogni file della shell è in SHELL, peso shell senza font < 300 KB, CACHE_VERSION = APP_VERSION).

Non fare in questa fase: IndexedDB, logiche di dominio, form impegno, cloud.

Verifica: node --test tests/ verde (riporta il numero di test), console pulita con python3 -m http.server -d app 8080, controllo a 390 px e 430 px, catalogo completo. Commit e PR. Chiudi dicendomi l'URL Pages da aprire dopo il merge.
```

## Fase 2 — Archivio locale e tutte le logiche di dominio
```
Leggi CLAUDE.md per intero: è vincolante.

FASE 2 — Archivio locale e logiche di dominio, con test. Nessuna UI nuova.

1. src/store/db.js, repo.js, state.js: adatta quelli di NexusLife (store records chiave [entity,id], outbox, meta; CRUD con createdAt/updatedAt/deleted; tombstone e purge dopo 180 giorni; segnali di stato). tests/helpers/fake-idb.js.
2. src/store/seed.js: al primo avvio crea le 6 categorie predefinite con gli id fissi di §6 e il record settings (largeText false). Idempotente: rieseguito non crea doppioni.
3. src/domain/dates.js completo (§7): startOfWeek, isoWeek, weekLabel, monthGrid, nomi italiani, step(view, anchor, dir), formati per esteso ("Giovedì 5 novembre 2026").
4. src/domain/events.js (§7): occurrences con annuali e regola 29 febbraio, ordinamento, weekRows (max 2 + "+ altri N"), monthBars (max 3 + "+N"), dayRows (Giorno + 07–22 con agganci prima delle 7 e dopo le 22), validate con i messaggi esatti, etichette conteggio.
5. src/domain/categories.js, swipe.js, snapshots.js, dedupe.js (§7).
6. src/store/demo.js: "Carica impegni di prova" (12 impegni distribuiti su 4 settimane da oggi, tutte le categorie, uno annuale, un giorno con 3 impegni, uno alle 6:30 e uno alle 23:00) con demo:true, e "Cancella impegni di prova".

Casi limite obbligatori nei test: isoWeek 2026-01-01, 2026-12-28, 2027-01-01; monthGrid febbraio 2027 (4 righe), ottobre 2026 (5), novembre 2026 (6), marzo 2026 (6); step da 31 gennaio a febbraio in vista mese; settimana che cavalca due mesi e due anni (29/12/2026–04/01/2027); cambio ora legale 29/03/2026 e 25/10/2026; annuale del 29/02/2028 nel 2029 e nel 2032; annuale non mostrato prima del suo anno; ordinamento tutto il giorno → ora → titolo; validate con titolo di soli spazi e di 81 caratteri; classifySwipe a 59/60 px e con diagonale; shouldSnapshot a 19 h 59 e 20 h; toPrune con 31 fotografie; eliminazione categoria → impegni in cat-altro; nome categoria duplicato con accenti diversi.

Verifica: node --test tests/ verde (riporta il numero di test), console pulita, app invariata a 390 px. Commit e PR.
```

## Fase 3 — Settimana, Giorno, sfoglio e impegni
```
Leggi CLAUDE.md per intero: è vincolante.

FASE 3 — Vista Settimana, vista Giorno, sfoglio con il dito, sheet Nuovo/Modifica impegno.

1. views/settimana/ (§8): 7 righe da weekRows, oggi e weekend come da §5. Tocco su tutta la riga → #/giorno/<data> (D1). Header con titolo e sottotitolo di weekLabel.
2. views/giorno/ (§8): dayRows; tocco su ora vuota o sulla sua etichetta → sheet Nuovo con giorno e ora; riga "Giorno" → sheet Nuovo "Tutto il giorno"; tocco su impegno → sheet Modifica. Pulsante "‹ Torna alla settimana" (o "al mese" se arrivi dal mese). Se il giorno è oggi, scroll iniziale all'ora corrente meno un'ora.
3. Sfoglio: pointerdown/pointerup sulla pagina con classifySwipe, step e PageFlip; tocchi ignorati per 350 ms dopo uno sfoglio; touch-action: pan-y. Frecce ‹ › e "Oggi" funzionanti.
4. views/impegno/ sheet (§8) con tutti i campi, validate, messaggi d'errore sotto il campo (role=alert), interruttore "Si ripete ogni anno", scelta categoria con pastiglie e "+ Nuova" (nome + ColorPicker, regole di categories.js), Salva/Annulla, Elimina con Confirm, avviso per gli annuali. Toast dopo salvataggio ed eliminazione.
5. Pulsante "+ Nuovo impegno" con la regola della data di §8.
6. Impostazioni → Area tecnica: "Carica impegni di prova" e "Cancella impegni di prova" (Area tecnica chiusa di default, si apre con un tocco su "Area tecnica").

Non fare in questa fase: vista Mese (il selettore Mese mostra la vista vuota della Fase 1), gestione categorie in Impostazioni, cloud.

Verifica: node --test tests/ verde (riporta il numero di test), console pulita, controllo a 390 e 430 px. Verifica manuale e scrivi l'esito: sfoglio avanti/indietro con il trackpad o il mouse trascinando, tocco riga → giorno, inserimento a un'ora e tutto il giorno, modifica, eliminazione, annuale, categoria nuova, ricarica della pagina con i dati ancora lì. Commit e PR.
```

## Fase 4 — Mese, categorie e impostazioni
```
Leggi CLAUDE.md per intero: è vincolante.

FASE 4 — Vista Mese, gestione categorie, Impostazioni.

1. views/mese/ (§8): monthGrid (4/5/6 righe, altezza celle adattata per riempire la pagina senza scorrere a 390×844), numero giorno, barrette monthBars, "+N", oggi evidenziato, giorni fuori mese in --ink-3 e più piccoli, weekend in --ribbon-dark, legenda categorie sotto la griglia. Tocco su un giorno → #/giorno/<data>; da lì "‹ Torna al mese". Sfoglio di mese in mese con PageFlip. Passando da Mese a Settimana, se il mese mostrato è quello di oggi si va alla settimana di oggi, altrimenti alla prima settimana del mese.
2. views/impostazioni/ (§8): "Testo più grande" (settings.largeText → classe html.large-text, applicata subito e all'avvio); "Categorie": elenco con pallino e nome, rinomina, cambia colore, elimina con Confirm ("Gli impegni di questa categoria passeranno in Altro."), aggiungi; cat-altro bloccata. "Copia di sicurezza": per ora solo la scritta "Non ancora collegata" (arriva in Fase 5). Area tecnica con versione app.
3. Controllo che con "Testo più grande" nessuna vista si rompa: settimana scorre in verticale se serve, mese resta leggibile (numero giorno mai tagliato), sheet scorre.

Verifica: node --test tests/ verde (riporta il numero di test), console pulita, controllo a 390 e 430 px con testo normale e grande. Commit e PR.
```

## Fase 5 — Copia di sicurezza cifrata su Supabase
Tieni pronti: email e password dell'utente dedicato e la passphrase (le inserirai tu nell'app, **non** nel prompt).
```
Leggi CLAUDE.md per intero: è vincolante.

FASE 5 — Copia di sicurezza continua e cifrata su Supabase (§9).

1. config.js: SUPABASE_URL = 'https://hsnzyyynsstxaodkozzv.supabase.co' e SUPABASE_ANON_KEY = 'sb_publishable_wFR753ZmdrbRreKYDy_DJg_hnS-xfbE' (pubblici per design, già usati da NexusLife).
2. src/sync/crypto.js, auth.js, api.js, sync.js: copia e adatta quelli di NexusLife. Usa le tabelle records e vault ESISTENTI e la RPC upsert_records esistente, senza modificarle. Outbox, sync all'avvio, su online, ogni 60 s in primo piano, backoff, gestione orologio sfasato, dedupe.js dopo il download.
3. SyncDot nell'intestazione (§9) e sezione "Copia di sicurezza" in Impostazioni con stato a parole. Area tecnica → "Collega la copia di sicurezza": email, password, passphrase (min 12, ripetuta), "Ricorda su questo dispositivo" attivo, avviso sulla passphrase; primo collegamento crea il vault, successivi lo verificano; "Scollega" con Confirm. Messaggi senza gergo (regola 9).
4. docs/supabase.sql: SOLO la tabella snapshots di §9 con RLS, policy, grant e indice, idempotente, con le istruzioni passo passo in testa (SQL Editor → New query → incolla → Run → Success). Avvertenza in testa: "Non contiene e non modifica records, vault, upsert_records e ping, che appartengono già al progetto."
5. tests/helpers/fake-supabase.js e test di sync (cifra/decifra, LWW, outbox offline → online, passphrase sbagliata, dedupe categorie, nessun campo in chiaro oltre entity/id/updated_at/deleted).

Non fare in questa fase: fotografie giornaliere e ripristino (Fase 6).

Verifica: node --test tests/ verde (riporta il numero di test), console pulita, app ancora pienamente funzionante senza rete e con config vuota. Commit e PR. Chiudi con le istruzioni passo passo per me: dove incollare docs/supabase.sql e come collegare l'app dall'iPhone.
```

## Fase 6 — Fotografie giornaliere, ripristino, rifinitura
```
Leggi CLAUDE.md per intero: è vincolante.

FASE 6 — Fotografie giornaliere su Supabase, ripristino, affidabilità e collaudo.

1. src/sync/snapshots.js (§9): all'avvio e al ritorno in primo piano, se collegato e shouldSnapshot è vero, carica una fotografia cifrata completa nella tabella snapshots e pota con toPrune (30). Aggiorna settings.lastSnapshotAt. "Fai una copia adesso" in Impostazioni.
2. "Ripristina una copia": elenco fotografie (data per esteso, ora, numero impegni), anteprima dopo la decifratura (impegni per categoria, primo e ultimo), "Sostituisci tutto" con doppia conferma ("Gli impegni di adesso verranno sostituiti da quelli del <data>."), rifiuto di schemaVersion più recente. Nessun file scaricato sull'iPhone (D7).
3. Robustezza: IndexedDB non disponibile (navigazione privata) → messaggio chiaro; quota piena; sessione scaduta → rinnovo silenzioso o puntino arancione; chiusura dell'app a metà salvataggio; doppio tocco su Salva non crea due impegni.
4. Prestazioni: apertura < 1 s su iPhone con 2.000 impegni (memo delle occorrenze per intervallo); test con 2.000 impegni sul calcolo di settimana, mese e giorno.
5. docs/CHECKLIST_IPHONE.md: circa 20 punti di collaudo (installazione su Home, settimana, sfoglio, giorno, inserimento a ora e tutto il giorno, annuale, modifica, eliminazione, mese, categorie, testo grande, offline, collegamento cloud, copia adesso, ripristino, iPhone nuovo, aggiornamento versione).
6. README: cos'è, URL, come si installa sull'iPhone di papà, come si collega la copia, limiti noti di §11.
7. APP_VERSION e CACHE_VERSION a '1.0.0'.

Verifica: node --test tests/ verde (riporta il numero di test), console pulita, controllo a 390 e 430 px. Commit e PR.
```

---

## Prompt jolly

**Correzione da collaudo**
```
Leggi CLAUDE.md. Durante il collaudo ho trovato questi problemi:
1. …
2. …
Correggili senza toccare il resto, aggiungi un test per ogni bug di logica, aggiorna CACHE_VERSION e APP_VERSION, commit e PR.
```

**Nuova funzione**
```
Leggi CLAUDE.md. Voglio aggiungere: …
Prima proponi in 5 righe dove si inserisce (dati, dominio, UI) e cosa cambia nello schema; aspetta il mio ok, poi implementa con test, aggiorna CLAUDE.md se cambi regole o schema, commit e PR.
```
