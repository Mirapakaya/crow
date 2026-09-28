import { useRegisterSW } from 'virtual:pwa-register/react'
import { useApp } from './store'
import { translate } from '../i18n'
import { createLogger } from '../core/util/log'
import { Button } from '../ui/components/ui/button'

const log = createLogger('pwa')

/**
 * Service-worker update flow.
 *
 * The worker is registered with `skipWaiting: false` and the user is asked
 * before reloading. Swapping code out from under a running session is bad
 * practice generally; in an app holding decrypted key material in memory it
 * would also drop the vault mid-conversation.
 */
export function UpdatePrompt() {
  const locale = useApp((s) => s.settings.locale)
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW: (url) => log.info(`service worker registered at ${url}`),
    onRegisterError: (error) => log.warn('service worker registration failed', error),
  })

  if (!needRefresh) return null

  return (
    <div className="toast-region">
      <div className="toast">
        <span className="grow">{t('update.available')}</span>
        <Button size="sm" onClick={() => void updateServiceWorker(true)}>
          {t('update.reload')}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setNeedRefresh(false)}>
          {t('common.close')}
        </Button>
      </div>
    </div>
  )
}
