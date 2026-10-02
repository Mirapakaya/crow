/* Theme bootstrap — loaded as an external script so the CSP does not need 'unsafe-inline'. */
(function () {
  try {
    var raw = localStorage.getItem('crow:display')
    var stored = raw ? JSON.parse(raw) : {}
    var theme = stored.theme || 'system'
    var resolved = theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme
    document.documentElement.classList.add(resolved)
    document.documentElement.setAttribute('data-theme', resolved)
    document.documentElement.lang = stored.locale || 'en'
  } catch {}
})()
