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

const originals = {
  fetch: window.fetch,
  WebSocket: window.WebSocket,
  crypto: window.crypto,
  Worker: window.Worker,
  postMessage: window.postMessage.bind(window),
} as const

function createTrustedTypesPolicy(): void {
  if (typeof window.trustedTypes === 'undefined') return
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

function checkIntegrity(): boolean {
  if (window.fetch !== originals.fetch) return false
  if (window.WebSocket !== originals.WebSocket) return false
  if (window.crypto !== originals.crypto) return false
  if (window.Worker !== originals.Worker) return false
  return true
}

function startTamperCheck(onTamper: () => void): void {
  setInterval(() => {
    if (!checkIntegrity()) {
      console.warn('[crow] tamper check failed')
      onTamper()
    }
  }, 60_000)
}

function startDomGuard(onTamper: () => void): void {
  if (typeof MutationObserver === 'undefined') return
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

function freezeApiObjects(): void {
  // Object.freeze only prevents assignment to properties of the object itself;
  // it does not stop a hostile extension from replacing `window.fetch`, but it
  // does prevent accidental mutation of these API objects by the app.
  Object.freeze(Object.getPrototypeOf(originals.fetch.prototype))
  Object.freeze(Object.getPrototypeOf(originals.WebSocket.prototype))
  Object.freeze(Object.getPrototypeOf(originals.Worker.prototype))
}

export function bootstrap(onTamper: () => void): void {
  createTrustedTypesPolicy()
  freezeApiObjects()
  startTamperCheck(onTamper)
  startDomGuard(onTamper)
}
