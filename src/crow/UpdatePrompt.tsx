import { useApp } from './store'
import { translate } from '../i18n'
import { createLogger } from '../core/util/log'
import { useRegisterSW } from '@/lib/useRegisterSW'
import { Button } from '@/components/ui/button'

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

  const { needRefresh, updateServiceWorker, setNeedRefresh } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="pointer-events-none fixed bottom-4 left-0 right-0 z-[60] flex flex-col items-center gap-2 px-4">
      <div className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-md border border-border bg-card p-3 text-sm shadow-lg">
        <span className="min-w-0 flex-1">{t('update.available')}</span>
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
