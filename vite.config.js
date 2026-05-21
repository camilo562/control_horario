import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

// https://vite.dev/config/
const getBuildVersion = () => {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)

  try {
    const commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()

    return `${timestamp}-${commit}`
  } catch {
    return timestamp
  }
}

const buildVersion = process.env.VITE_APP_VERSION || getBuildVersion()

const htmlVersionPlugin = () => ({
  name: 'html-version',
  transformIndexHtml(html) {
    return html.replace(/%APP_VERSION%/g, buildVersion)
  },
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify(
        {
          version: buildVersion,
          builtAt: new Date().toISOString()
        },
        null,
        2
      )
    })
  }
})

export default defineConfig({
  plugins: [react(), htmlVersionPlugin()],
})
