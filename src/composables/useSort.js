import { ref, computed, unref } from 'vue'

/** Reads a possibly-dotted path (e.g. "department.name_ar") off an object. */
function getValue(obj, path) {
  if (!path) return undefined
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
}

/**
 * Client-side table sorting. Sorts the currently-loaded rows by any column.
 *
 * @param {import('vue').Ref<Array>|Array} rows  reactive rows source
 * @returns { sorted, sortKey, sortDir, sortBy }
 *
 * Usage:
 *   const { sorted, sortKey, sortDir, sortBy } = useSort(rows)
 *   v-for="row in sorted"
 *   <SortableTh field="name_ar" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">Name</SortableTh>
 */
export function useSort(rows, initialKey = null, initialDir = 'asc') {
  const sortKey = ref(initialKey)
  const sortDir = ref(initialDir)

  function sortBy(key) {
    if (sortKey.value === key) {
      sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortKey.value = key
      sortDir.value = 'asc'
    }
  }

  const sorted = computed(() => {
    const arr = [...(unref(rows) || [])]
    if (!sortKey.value) return arr
    const factor = sortDir.value === 'asc' ? 1 : -1
    return arr.sort((a, b) => {
      let av = getValue(a, sortKey.value)
      let bv = getValue(b, sortKey.value)
      if (av == null) av = ''
      if (bv == null) bv = ''
      // Numeric compare when both look numeric (and aren't objects).
      const na = typeof av !== 'object' ? parseFloat(av) : NaN
      const nb = typeof bv !== 'object' ? parseFloat(bv) : NaN
      const bothNumeric = !Number.isNaN(na) && !Number.isNaN(nb) &&
        String(av).trim() !== '' && String(bv).trim() !== ''
      if (bothNumeric) return (na - nb) * factor
      return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * factor
    })
  })

  return { sorted, sortKey, sortDir, sortBy }
}
