import './window-preload'

// Say something
console.log('[Dobkapapp] : Preload execution started')

// Get versions
window.addEventListener('DOMContentLoaded', () => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const rootDomNode = document.getElementById('app')!
  const { env } = process
  const versions: Record<string, unknown> = {}

  // Dobkapapp Package version
  versions['dobkapapp'] = env['npm_package_version']
  versions['license'] = env['npm_package_license']

  // Process versions
  for (const type of ['chrome', 'node', 'electron']) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    versions[type] = process.versions[type]!.replace('+', '')
  }

  // NPM deps versions
  for (const type of ['react']) {
    const v = env['npm_package_dependencies_' + type]
    if (v) versions[type] = v.replace('^', '')
  }

  // NPM @dev deps versions
  for (const type of ['webpack', 'typescript']) {
    const v = env['npm_package_devDependencies_' + type]
    if (v) versions[type] = v.replace('^', '')
  }

  // Set versions to app data
  rootDomNode.setAttribute('data-versions', JSON.stringify(versions))
})
