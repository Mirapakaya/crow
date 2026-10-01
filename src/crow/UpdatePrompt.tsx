import { useApp } from './store'
import { translate } from '../i18n'
import { useRegisterSW } from '../lib/useRegisterSW'

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

  const { needRefresh, updateServiceWorker, setNeedRefresh } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="toast-region">
      <div className="toast">
        <span className="grow">{t('update.available')}</span>
        <button className="btn btn-primary small" onClick={() => void updateServiceWorker(true)}>
          {t('update.reload')}
        </button>
        <button className="btn btn-ghost small" onClick={() => setNeedRefresh(false)}>
          {t('common.close')}
        </button>
      </div>
    </div>
  )
}
