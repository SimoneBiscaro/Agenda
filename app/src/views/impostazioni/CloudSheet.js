import { useEffect, useState } from '../../../vendor/preact-hooks.mjs';
import { html } from '../../ui/html.js';
import { Sheet } from '../../ui/Sheet.js';
import { BigButton } from '../../ui/BigButton.js';
import { Confirm } from '../../ui/Confirm.js';
import { showToast } from '../../ui/Toast.js';
import { useSignal } from '../../store/state.js';
import {
  cloudConfigured, createPassphrase, describeSyncError, disconnect, MIN_PASSPHRASE, refreshVaultInfo,
  signIn, syncState, unlock,
} from '../../store/cloud.js';

const Err = ({ id, text }) => (text ? html`<p class="field__error" id=${id} role="alert">${text}</p>` : null);

function Field({ id, label, type = 'text', value, onInput, error, autocomplete, hint }) {
  return html`
    <div class="field">
      <label class="field__label" for=${id}>${label}</label>
      ${hint && html`<p class="field__hint">${hint}</p>`}
      <input id=${id} name=${id} class="field__input" type=${type} value=${value} autocomplete=${autocomplete}
        autocapitalize="off" autocorrect="off" spellcheck="false"
        aria-invalid=${error ? 'true' : 'false'} aria-describedby=${error ? `${id}-err` : undefined}
        onInput=${(e) => onInput(e.currentTarget.value)} />
      <${Err} id=${`${id}-err`} text=${error} />
    </div>`;
}

/** Passo 1: email e password dell'utente dedicato all'agenda. */
function SignInStep() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Scrivi email e password.'); return; }
    setBusy(true);
    setError('');
    try {
      await signIn(email, password);
    } catch (err) {
      setError(describeSyncError(err));
    } finally {
      setBusy(false);
    }
  };
  return html`
    <form class="ev-form" onSubmit=${submit} novalidate>
      <p class="settings__text">Accedi con l’email e la password create per l’agenda.</p>
      <${Field} id="cloud-email" label="Email" type="email" value=${email} onInput=${setEmail} autocomplete="username" />
      <${Field} id="cloud-password" label="Password" type="password" value=${password} onInput=${setPassword} autocomplete="current-password" />
      <${Err} id="cloud-signin-err" text=${error} />
      <${BigButton} type="submit" label=${busy ? 'Accesso in corso…' : 'Accedi'} disabled=${busy} />
    </form>`;
}

/** Passo 2: passphrase nuova (primo collegamento) o da verificare (collegamenti successivi). */
function PassphraseStep({ vault }) {
  const creating = vault === 'missing';
  const [pass, setPass] = useState('');
  const [repeat, setRepeat] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (pass.length < MIN_PASSPHRASE) errs.pass = `Almeno ${MIN_PASSPHRASE} caratteri.`;
    else if (creating && pass !== repeat) errs.repeat = 'Le due passphrase non sono uguali.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      if (creating) await createPassphrase(pass, { remember });
      else await unlock(pass, { remember });
      showToast('Copia di sicurezza collegata');
    } catch (err) {
      setErrors({ pass: describeSyncError(err) });
    } finally {
      setBusy(false);
    }
  };

  return html`
    <form class="ev-form" onSubmit=${submit} novalidate>
      <p class="cloud__warning" role="note">Senza la passphrase la copia nel cloud non si può leggere. Conservala in un posto sicuro.</p>
      <${Field} id="cloud-pass" type="password" value=${pass} onInput=${(v) => { setPass(v); setErrors({}); }}
        label=${creating ? 'Scegli la passphrase' : 'Passphrase'} autocomplete=${creating ? 'new-password' : 'current-password'}
        hint=${creating ? `Almeno ${MIN_PASSPHRASE} caratteri: meglio una frase di 4 o 5 parole.` : null} error=${errors.pass} />
      ${creating && html`<${Field} id="cloud-repeat" type="password" value=${repeat} onInput=${(v) => { setRepeat(v); setErrors({}); }}
        label="Ripeti la passphrase" autocomplete="new-password" error=${errors.repeat} />`}
      <label class="switch">
        <input type="checkbox" role="switch" checked=${remember} onChange=${(e) => setRemember(e.currentTarget.checked)} />
        <span class="switch__track" aria-hidden="true"><span class="switch__thumb"></span></span>
        <span class="switch__label">Ricorda su questo dispositivo<span class="switch__hint">Così non serve riscriverla a ogni apertura</span></span>
      </label>
      <${BigButton} type="submit" label=${busy ? 'Collegamento in corso…' : (creating ? 'Crea la passphrase e collega' : 'Collega')} disabled=${busy} />
    </form>`;
}

/**
 * "Collega la copia di sicurezza" (Impostazioni → Area tecnica): accesso, passphrase, scollegamento.
 * @param {{ open: boolean, onClose: () => void }} props
 */
export function CloudSheet({ open, onClose }) {
  const s = useSignal(syncState);
  const [askDisconnect, setAskDisconnect] = useState(false);
  const [vaultError, setVaultError] = useState('');
  const linked = !['off', 'expired', 'locked'].includes(s.phase);

  // Accesso fatto ma non si sa ancora se la passphrase esiste: lo si chiede al cloud.
  useEffect(() => {
    if (open && s.phase === 'locked' && !s.vault) {
      refreshVaultInfo().then(() => setVaultError(''), (err) => setVaultError(describeSyncError(err)));
    }
  }, [open, s.phase, s.vault]);

  let body;
  if (!cloudConfigured) {
    body = html`<p class="settings__text">Questa versione dell’app non ha un cloud configurato.</p>`;
  } else if (linked) {
    body = html`
      <div class="ev-form">
        <p class="settings__text">Collegata come <strong>${s.email}</strong>.
          ${s.remembered ? ' La passphrase è ricordata su questo telefono.' : ' La passphrase va riscritta a ogni apertura dell’app.'}</p>
        <${BigButton} label="Fatto" onClick=${onClose} />
        <${BigButton} label="Scollega questo telefono" variant="danger" onClick=${() => setAskDisconnect(true)} />
      </div>`;
  } else if (s.phase === 'locked') {
    body = s.vault
      ? html`<${PassphraseStep} key=${s.vault} vault=${s.vault} />`
      : html`<div class="ev-form">
          <p class="settings__text">${vaultError || 'Controllo in corso…'}</p>
          ${vaultError && html`<${BigButton} label="Riprova" variant="secondary"
            onClick=${() => refreshVaultInfo().then(() => setVaultError(''), (err) => setVaultError(describeSyncError(err)))} />`}
        </div>`;
  } else {
    body = html`
      ${s.phase === 'expired' && html`<p class="cloud__warning" role="note">Il collegamento è scaduto: accedi di nuovo.</p>`}
      <${SignInStep} />`;
  }

  return html`
    <${Sheet} open=${open} onClose=${onClose} title="Copia di sicurezza">${body}<//>
    <${Confirm} open=${askDisconnect} question="Scollegare questo telefono?"
      detail="Gli impegni restano sul telefono e la copia nel cloud resta dov’è, ma da ora non si aggiorna più."
      yesLabel="Sì, scollega" onNo=${() => setAskDisconnect(false)}
      onYes=${async () => {
        setAskDisconnect(false);
        await disconnect();
        showToast('Copia di sicurezza scollegata');
      }} />`;
}
