/**
 * Crow bootstrap — runs before the rest of the app.
 *
 * 1. Capture references to security-critical browser APIs so a malicious
 *    extension cannot replace them after the app loads.
 * 2. Create the Trusted Types policy used by the strict CSP.
 * 3. Periodically re-check that the APIs are still the originals (heuristic,
 *    not proof — a malicious extension with page access can defeat this).
 * 4. Observe the DOM for unexpected scripts, iframes, or shadow roots and
 *    signal the app to lock the vault.
 */

const TRUSTED_POLICY_NAME = 'crow'

type Originals = {
  fetch: typeof window.fetch
  WebSocket: typeof window.WebSocket
  crypto: typeof window.crypto
  Worker: typeof window.Worker
  postMessage: typeof window.postMessage
}

function getOriginals(): Originals | null {
  if (typeof window === 'undefined') return null
  return {
    fetch: window.fetch,
    WebSocket: window.WebSocket,
    crypto: window.crypto,
    Worker: window.Worker,
    postMessage: window.postMessage.bind(window),
  }
}

function createTrustedTypesPolicy(): void {
  if (typeof window === 'undefined' || typeof window.trustedTypes === 'undefined') return
  try {
    window.trustedTypes.createPolicy(TRUSTED_POLICY_NAME, {
      createHTML: (input: string) => input,
      createScript: (input: string) => input,
      createScriptURL: (input: string) => input,
    })
  } catch {
    // Policy may already exist during hot reload.
  }
}

function checkIntegrity(originals: Originals | null): boolean {
  if (!originals) return true
  if (window.fetch !== originals.fetch) return false
  if (window.WebSocket !== originals.WebSocket) return false
  if (window.crypto !== originals.crypto) return false
  if (window.Worker !== originals.Worker) return false
  return true
}

function startTamperCheck(onTamper: () => void, originals: Originals | null): void {
  if (!originals || typeof window === 'undefined') return
  setInterval(() => {
    if (!checkIntegrity(originals)) {
      console.warn('[crow] tamper check failed')
      onTamper()
    }
  }, 60_000)
}

function startDomGuard(onTamper: () => void): void {
  if (typeof window === 'undefined' || typeof MutationObserver === 'undefined' || !document.documentElement) return
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue
        if (
          node.tagName === 'SCRIPT' ||
          node.tagName === 'IFRAME' ||
          (node.shadowRoot && node.getRootNode() !== document)
        ) {
          onTamper()
          return
        }
      }
    }
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
}

function freezeApiObjects(originals: Originals | null): void {
  if (!originals) return
  // fetch is not a constructor and has no .prototype, so only freeze the
  // prototype chains of constructor-based APIs.
  Object.freeze(Object.getPrototypeOf(originals.WebSocket.prototype))
  Object.freeze(Object.getPrototypeOf(originals.Worker.prototype))
}

export function bootstrap(onTamper: () => void): void {
  const originals = getOriginals()
  if (!originals) return
  createTrustedTypesPolicy()
  freezeApiObjects(originals)
  startTamperCheck(onTamper, originals)
  startDomGuard(onTamper)
}
