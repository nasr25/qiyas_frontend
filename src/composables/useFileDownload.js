/**
 * Triggers a browser save for a Blob returned by an authenticated API call
 * (axios responseType: 'blob'), so downloads carry the auth header instead
 * of relying on a plain <a href> which cannot attach it.
 */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob instanceof Blob ? blob : new Blob([blob]))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
