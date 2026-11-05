# CLAUDE.md — Agenda PWA

Questo file è il contesto permanente per Claude Code. Leggilo per intero prima di ogni attività. È vincolante.

## 1. Cos'è
**Agenda** è un'agenda digitale per gli impegni del padre di Simo, che ha quasi 70 anni e non è una persona tecnologica. Usa **solo iPhone**.
Obiettivo: poche funzioni, grandi, impossibili da sbagliare. La pagina principale deve sembrare un'agenda di carta, con vista settimanale e mensile, e si sfoglia con il dito.
- È una **PWA** installata con "Aggiungi alla schermata Home", ospitata su **GitHub Pages**, con **backup automatico cifrato su Supabase** (piano gratuito).
- Utente unico, un solo dispositivo. Nessuna sync con il computer, nessuna notifica, nessuna analytics, nessun tracker, nessun CDN a runtime.
- **Offline-first**: IndexedDB è il database principale. Il cloud è la copia di sicurezza.
- **Cifratura end-to-end**: Supabase riceve solo payload cifrati (gli impegni includono visite mediche).
- **Costo zero**. Stesso metodo, stack e struttura di NexusLife (`https://github.com/SimoneBiscaro/nexuslife`, pubblico): i moduli di infrastruttura (IndexedDB, repo, sync, crypto, auth, service worker, test helper) si copiano da lì e si adattano.

## 2. Stack (vincolante)
- **Nessun build step.** HTML + CSS + JavaScript ES modules serviti così come sono.
- UI: **Preact + htm**, file ESM copiati in `app/vendor/` (da npm una volta sola, poi committati; versioni in `app/vendor/VERSIONS.txt`).
- Font self-hosted in `app/fonts/` (woff2): **Atkinson Hyperlegible** 400 e 700 (`@fontsource/atkinson-hyperlegible`) per testo e numeri; **Lora** 500 e 600 (`@fontsource/lora`) per titoli e numeri dei giorni. Nessuna richiesta a Google.
- Persistenza: **IndexedDB** con wrapper nostro (store `records` chiave `[entity,id]`, `outbox`, `meta`).
- Cloud: **Supabase** via `fetch` REST (PostgREST + GoTrue). Niente `supabase-js`.
- Crittografia: **WebCrypto** AES-GCM 256, chiave da PBKDF2-SHA256 con 600.000 iterazioni, IV casuale di 12 byte.
- Test: `node --test tests/` sui moduli puri (Node 20+, nessuna dipendenza).
- Deploy: **GitHub Actions → GitHub Pages**, cartella `app/` pubblicata tale e quale.
- Lingua `it-IT`, fuso `Europe/Rome`, settimana da **lunedì**, date con `Intl.DateTimeFormat('it-IT')` o con le tabelle di nomi in `domain/dates.js`.

## 3. Struttura del repository
```
/
├── CLAUDE.md  README.md  package.json
├── docs/
│   ├── supabase.sql            # solo aggiunte idempotenti (tabella snapshots), vedi §8
│   ├── PROMPTS_CLAUDE_CODE.md
│   └── CHECKLIST_IPHONE.md     # collaudo manuale (Fase 6)
├── app/                        # ← pubblicata su GitHub Pages
│   ├── index.html  manifest.webmanifest  sw.js  config.js
│   ├── icons/  vendor/  fonts/
│   ├── styles/  tokens.css  base.css  components.css
│   └── src/
│       ├── main.js  router.js  version.js
│       ├── store/    db.js  repo.js  state.js  seed.js  settings.js  demo.js
│       ├── domain/   dates.js  events.js  categories.js  swipe.js  snapshots.js  dedupe.js
│       ├── sync/     crypto.js  auth.js  api.js  sync.js  snapshots.js
│       ├── ui/       Binding.js  Header.js  PageFlip.js  Sheet.js  BigButton.js  Segmented.js
│       │             CategoryChip.js  ColorPicker.js  Toast.js  Confirm.js  SyncDot.js  icons.js  html.js
│       └── views/    settimana/  mese/  giorno/  impegno/ (sheet nuovo/modifica)  impostazioni/  catalogo/
├── tests/  *.test.js  helpers/ (fake-idb.js, fake-supabase.js)
└── .github/workflows/  pages.yml
```
Percorsi sempre relativi (`./src/...`): il sito vive sotto `https://simonebiscaro.github.io/agenda/`.

## 4. Regole ferree
1. Codice completo e funzionante: niente stub, niente segnaposto, niente commenti "da fare", niente dati finti nel prodotto. Ammesso un pulsante "Carica impegni di prova" in Impostazioni → Area tecnica, che li marca `demo:true` e un pulsante che li cancella.
2. Le logiche in `src/domain/` sono funzioni pure, ricevono `today` (stringa `AAAA-MM-GG`) come parametro, mai `new Date()` interno, e hanno test, casi limite compresi (§7).
3. Fase finita solo con: `node --test tests/` verde (riporta il numero di test), console pulita con `python3 -m http.server -d app 8080`, controllo visivo a **390 px** e a **430 px** (iPhone grande). Il desktop non è un obiettivo: a larghezze > 600 px l'agenda resta una colonna centrata di 480 px.
4. Accessibilità prima di tutto (utente anziano): contrasto testo ≥ 4,5:1 (anche le etichette piccole), bersagli di tocco ≥ **48 px** (pulsanti principali 64 px), `aria-label` sui pulsanti a icona, focus visibile, `prefers-reduced-motion` rispettato, testo minimo 16 px. Il colore non porta mai da solo il significato: ogni categoria ha anche il nome.
5. Mai committare `service_role` né password né passphrase. In `config.js` solo URL e chiave pubblica (publishable). Config vuota = app solo locale.
6. Modifica allo schema IndexedDB → nuova versione con migrazione esplicita. Entità o campi facoltativi nuovi in `records` non cambiano lo schema.
7. Modifica all'app shell → incrementa `CACHE_VERSION` in `sw.js` e `APP_VERSION` in `src/version.js` (stesso valore). Un test verifica che ogni file della shell sia nell'elenco `SHELL` del service worker; un altro che la shell senza font pesi < 300 KB.
8. Commit in italiano, brevi, all'imperativo.
9. Interfaccia senza gergo: mai "sync", "record", "cache", "errore 401". Si scrive "Copia di sicurezza", "impegno", "Riprova più tardi".

## 5. Design system "Agenda di carta"
Solo tema chiaro (D8). Carta crema, rilegatura ad anelli in alto, nastro segnalibro rosso come colore d'azione. Riferimento visivo: la demo interattiva su claude.ai ("Agenda Papà – demo").

**Token (`tokens.css`)**
```
--paper:#F7F2E8; --paper-2:#EFE7D6; --paper-weekend:#F2EBDC; --today:#FFF3C4;
--line:#DDD2BE; --field-border:#8C7F69; --white:#FFFFFF;
--ink:#1F1A14; --ink-2:#5A5043; --ink-3:#6B604F;           /* ink-3 = testo tenue, contrasto ≥ 5:1 su paper */
--binding:#2B241C;
--ribbon:#A3242B; --ribbon-dark:#7E1A20; --ribbon-tint:#F9E3E3;
--focus:#1F5FAD;
--radius-s:8px; --radius-m:12px; --radius-l:16px; --radius-sheet:22px;
--tap-min:48px; --tap-main:64px;
--font-ui:'Atkinson Hyperlegible',system-ui,sans-serif; --font-title:Lora,Georgia,serif;
```
**Scala testo** (rem, base 16 px; con "Testo più grande" la base diventa 18,4 px = +15%, D5): titolo pagina 1,75 · numero giorno settimana 1,875 · titolo sheet 1,625 · pulsante principale 1,375 · testo impegno 1,125 · etichette 1 (mai sotto 1 rem tranne l'indicatore "+2" nel mese a 0,8125 rem in grassetto).

**Palette categorie** (8 colori, testo bianco sopra: tutti ≥ 4,5:1 tranne Arancione, usato solo con testo grassetto ≥ 18 px):
Rosso `#B3261E` · Blu `#1F5FAD` · Verde acqua `#00796B` · Verde `#4E7D1E` · Marrone `#7A4E1D` · Arancione `#C2611F` · Viola `#8E3B8E` · Grigio `#4A4A4A`.

**Layout schermo** (dall'alto): rilegatura 26 px (13 anelli crema su `--binding`, decorativa, `aria-hidden`) → intestazione `--paper-2` (riga 1: selettore Settimana | Mese, icona ingranaggio Impostazioni, pulsante "Oggi"; riga 2: freccia ‹ 52 px, titolo Lora e sottotitolo, freccia ›) → pagina che scorre in verticale → barra in basso con il pulsante **"+ Nuovo impegno"** (64 px, `--ribbon`, a tutta larghezza, `env(safe-area-inset-bottom)`). Nella vista Giorno la riga 1 diventa "‹ Torna alla settimana/al mese" + "Oggi".

**Sfoglio (PageFlip)**: la pagina entra da destra (avanti) o da sinistra (indietro) con `perspective(1100px) translateX(±42%) rotateY(∓22deg)` e opacità 0,15→1 in 450 ms `cubic-bezier(.2,.75,.25,1)`, `transform-origin` sul bordo opposto. Con reduced-motion nessuna animazione. Le frecce ‹ › fanno la stessa cosa.

**Sheet**: pannello dal basso (raggio 22 px, max 90% altezza, maniglia grigia), sfondo scurito toccabile per chiudere. **Toast**: in basso sopra il pulsante, 2,2 s, `role="status"` ("Impegno salvato", "Modifiche salvate", "Impegno eliminato").

## 6. Modello dati
Ogni record: `{ id (UUID v4), entity, createdAt, updatedAt (ISO), deleted (bool), ...campi }`. Eliminazioni = **tombstone**, eliminate davvero dopo 180 giorni.

| entity | campi |
|---|---|
| `event` | title (1–80 caratteri dopo trim), date (`AAAA-MM-GG`), time (`HH:MM` oppure `""` = tutto il giorno), categoryId, repeat (`none` \| `yearly`), demo? (bool) |
| `category` | name (1–24 caratteri), normName, color (uno degli 8 della palette), builtin (bool), order (intero) |
| `settings` | record unico id `settings`: largeText (false), lastSnapshotAt?, cloudEmail? |

Solo ora d'inizio, nessuna durata o ora di fine (D2), nessuna nota, nessun allegato.
**Categorie predefinite** (D4, id fissi così due dispositivi non creano doppioni): `cat-salute` Salute #B3261E · `cat-famiglia` Famiglia #1F5FAD · `cat-casa` Casa #7A4E1D · `cat-pesca` Pesca #00796B · `cat-giardino` Giardino #4E7D1E · `cat-altro` Altro #4A4A4A (builtin, non eliminabile, ultima). Le altre predefinite si possono rinominare, ricolorare ed eliminare; si creano categorie nuove.

## 7. Logiche di dominio (implementare e testare esattamente così)
**`dates.js`**
- `startOfWeek(ds)` = lunedì della settimana; `isoWeek(ds)` secondo ISO 8601 (test: 2026-01-01 → settimana 1; 2027-01-01 → settimana 53 del 2026; 2026-12-28 → 53).
- `weekLabel(ds)`: titolo = mese e anno del **giovedì** della settimana ("Novembre 2026"); sottotitolo "2 – 8 nov · settimana 45", oppure "30 nov – 6 dic · settimana 49" se la settimana cavalca due mesi.
- `monthGrid(year, month)`: righe da lunedì a domenica, **4, 5 o 6 righe** secondo il mese (test: febbraio 2027 = 4 righe; novembre 2026 = 5; marzo 2026 = 6), ogni cella `{ ds, inMonth, isToday, weekday }`.
- Nomi italiani: giorni (Lunedì…Domenica, abbreviati Lun…Dom, iniziali L M M G V S D) e mesi (gennaio…dicembre, abbreviati gen…dic). Titoli con iniziale maiuscola.
- Navigazione `step(view, anchor, dir)`: settimana ±7 giorni; mese → il giorno 1 del mese ±1; giorno ±1. Fine mese, bisestile e cambio ora legale (29/03/2026, 25/10/2026) testati: si lavora solo su date di calendario, mai su millisecondi.

**`events.js`**
- `occurrences(events, from, to)`: impegni non eliminati nell'intervallo, inclusi gli **annuali** (D3) a partire dall'anno della data originale (mai prima). Annuale del 29 febbraio → 28 febbraio negli anni non bisestili. Ogni occorrenza porta `eventId` e la data dell'occorrenza.
- Ordinamento nel giorno: prima "tutto il giorno", poi per ora, poi per titolo (`localeCompare` it).
- `weekRows(events, anchor, today)`: 7 righe; ogni riga mostra **al massimo 2** impegni e "+ altri N" se sono di più.
- `monthBars(events, year, month)`: per cella al massimo **3** barrette colore categoria e "+N" oltre.
- `dayRows(events, ds)`: riga "Giorno" (tutto il giorno) + righe orarie **07:00–22:00**; un impegno prima delle 7 sta nella riga 07, dalle 23 in poi nella riga 22, mostrando comunque la sua ora vera.
- `validate(form)`: titolo vuoto → "Scrivi che cosa devi fare."; oltre 80 caratteri → "Al massimo 80 caratteri."; data mancante o non valida → "Scegli il giorno."; ora non `HH:MM` 00:00–23:59 quando "A un orario" → "Scegli l'ora.". Il modulo salva l'ora solo se la scelta è "A un orario".
- Etichette: "Nessun impegno", "1 impegno", "N impegni".

**`categories.js`**: `normName` (minuscolo, trim, spazi singoli, senza accenti NFD); nome duplicato (stesso normName) rifiutato con "Esiste già una categoria con questo nome."; eliminando una categoria i suoi impegni passano a `cat-altro`; `cat-altro` non si elimina né si rinomina.

**`swipe.js`**: `classifySwipe(dx, dy)` → `next` se dx ≤ −60 e |dx| > 1,3·|dy|; `prev` se dx ≥ 60 e stessa condizione; altrimenti `null`. Dopo uno sfoglio i tocchi sono ignorati per 350 ms (niente apertura involontaria di un giorno). Solo `touch-action: pan-y` sulla pagina: lo scorrimento verticale resta libero.

**`snapshots.js`**: `shouldSnapshot(lastSnapshotAt, now)` vero se mai fatto o se sono passate ≥ 20 ore; `toPrune(list)` tiene le **30** più recenti; `summary(payload)` → numero impegni e data.

**`dedupe.js`** (dopo il download dal cloud): categorie non builtin per `normName` (gli impegni passano alla vincitrice, la più vecchia per `createdAt`); il perdente diventa tombstone. Gli impegni non si deduplicano.

## 8. Comportamenti dell'interfaccia
- **Avvio**: sempre in vista Settimana su oggi (ultima vista non ricordata, per semplicità).
- **Router hash**: `#/settimana/AAAA-MM-GG`, `#/mese/AAAA-MM`, `#/giorno/AAAA-MM-GG`, `#/impostazioni`, `#/catalogo` (solo sviluppo, non linkato).
- **Settimana**: 7 righe da 84 px min; a sinistra numero (Lora) e giorno abbreviato, oggi in cerchio `--ribbon` con riga `--today`, sabato e domenica numero in `--ribbon-dark` e riga `--paper-weekend`. **Toccare un punto qualunque della riga apre il Giorno** (D1): nessun inserimento diretto dalla settimana. Gli impegni mostrati sono solo da leggere.
- **Mese**: griglia 7 colonne con barrette colore e legenda delle categorie sotto; toccare un giorno apre il Giorno.
- **Giorno**: titolo "Giovedì 5", sottotitolo "Oggi · novembre 2026". Toccare un'**ora** vuota o la sua etichetta apre "Nuovo impegno" con giorno e ora già scelti; toccare la riga "Giorno" lo apre come "Tutto il giorno"; toccare un impegno apre "Modifica impegno". Se la pagina del giorno è oggi, all'apertura scorre all'ora corrente meno un'ora.
- **Pulsante "+ Nuovo impegno"**: apre lo sheet con il giorno del Giorno aperto, altrimenti oggi se visibile, altrimenti il primo giorno visibile; scelta iniziale "Tutto il giorno".
- **Sheet impegno**: "Che cosa?" (campo testo 58 px, `enterkeyhint="done"`) · "Quale giorno?" (data scritta per esteso + `input type=date`) · due pulsanti "Tutto il giorno" | "A un orario" (+ `input type=time` passo 5 minuti, predefinito 09:00) · interruttore "Si ripete ogni anno" (compleanni, anniversari) · Categoria (pastiglie con pallino e nome, + "Nuova" con nome e 8 colori) · "Salva impegno" / "Salva le modifiche" · "Annulla". In modifica: "Elimina questo impegno" → conferma "Vuoi davvero eliminarlo?" "Sì, elimina" / "No". Per un annuale: "Modifichi e elimini l'impegno di tutti gli anni." scritto sopra i pulsanti.
- **Impostazioni** (ingranaggio): "Testo più grande" (interruttore), "Categorie" (rinomina, colore, elimina con conferma, aggiungi), "Copia di sicurezza" (stato a parole: "Ultima copia: oggi alle 9:12" oppure "Mai fatta"; pulsante "Fai una copia adesso"; "Ripristina una copia" — vedi §9), "Area tecnica" chiusa di default (collegamento al cloud, impegni di prova, versione app).

## 9. Copia di sicurezza, cloud e sicurezza
**Progetto Supabase**: lo stesso di NexusLife, con un **utente dedicato** all'agenda (creato a mano, Auto Confirm). Le tabelle `records` e `vault` esistono già e la RLS `auth.uid() = user_id` separa i dati dei due utenti: **non modificarle**. `docs/supabase.sql` aggiunge solo la tabella `snapshots` e le sue policy, in modo idempotente, senza toccare nient'altro. Il keepalive del progetto lo fa già il repo NexusLife: qui non serve un workflow keepalive.

**Copia continua (D6)**: ogni record va su `records` cifrato, come in NexusLife (RPC `upsert_records`, last-writer-wins, lettura incrementale per `server_ts`, outbox persistente, sync all'avvio, su `online`, ogni 60 s in primo piano, backoff). In chiaro solo `entity`, `id`, `updated_at`, `deleted`. Nell'intestazione un puntino discreto: verde = copia aggiornata, grigio = senza rete, arancione = qualcosa da sistemare (toccandolo si apre Impostazioni → Copia di sicurezza).

**Fotografie giornaliere (D7)**: nessun file sull'iPhone, nessun download, nessun ZIP. Una volta al giorno (`shouldSnapshot`) l'app carica nella tabella `snapshots` una fotografia completa cifrata (`{ schemaVersion: 1, appVersion, createdAt, records:[...] }`, cifrata con la stessa chiave) e tiene le ultime 30. "Ripristina una copia" mostra l'elenco (data per esteso e numero di impegni), anteprima, poi **Sostituisci tutto** con doppia conferma (i record attuali diventano tombstone, così il cloud si allinea). Una fotografia con `schemaVersion` più recente dell'app viene rifiutata con un messaggio chiaro.

```sql
-- tabella snapshots (in docs/supabase.sql, con istruzioni passo passo in testa)
create table if not exists public.snapshots (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null, created_at timestamptz not null default now(),
  schema_version integer not null, event_count integer not null,
  iv text not null, payload text not null,
  primary key (user_id, id)
);
-- RLS on + 4 policy (select/insert/update/delete) con (select auth.uid()) = user_id,
-- revoke all from anon, grant select/insert/update/delete to authenticated,
-- indice (user_id, created_at desc).
```
`event_count` è in chiaro: rivela solo quanti impegni ci sono, accettato per poter mostrare l'elenco senza decifrare.

**Collegamento al cloud** (Impostazioni → Area tecnica → "Collega la copia di sicurezza"; lo fa Simo una volta): email e password dell'utente dedicato, passphrase (minimo 12 caratteri, ripetuta), "Ricorda su questo dispositivo" attivo di default (chiave `CryptoKey` non estraibile in IndexedDB). Al primo collegamento crea il `vault`; ai successivi verifica la passphrase con il `verifier`. Avviso esplicito: "Senza la passphrase la copia nel cloud non si può leggere. Conservala in un posto sicuro." Su un iPhone nuovo, collegandosi, l'app scarica tutto.

**Auth**: email + password (`/auth/v1/token?grant_type=password`), refresh token gestito, sessione rinnovata in silenzio. Le iscrizioni nuove sono disattivate sul progetto.

## 10. PWA
Manifest con `name` "Agenda", `short_name` "Agenda", `start_url` e `scope` relativi (`./`), `display: standalone`, `background_color` e `theme_color` `#F7F2E8`, icone 192/512/maskable + `apple-touch-icon` 180 (un'agenda rilegata con nastro rosso, disegnata in SVG e convertita in PNG). `viewport-fit=cover`, safe area, `user-scalable` consentito. Service worker cache-first per la shell; con una versione nuova compare in alto "C'è una versione nuova — Tocca per aggiornare".

## 11. Limiti noti (da riportare nel README)
Repo pubblico: il codice è visibile, i dati no (cifrati). Nessun promemoria o notifica (scelta voluta). Supabase Free non fa backup del database: le fotografie stanno nello stesso progetto, quindi proteggono da errori sul telefono, non dalla perdita del progetto Supabase. Il progetto resta attivo grazie al keepalive del repo NexusLife: se quel repo viene archiviato, va aggiunto qui un `keepalive.yml` uguale. Se si perdono passphrase e telefono insieme, i dati non si recuperano.
