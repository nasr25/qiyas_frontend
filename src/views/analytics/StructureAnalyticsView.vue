<template>
  <div class="page">
    <div>
      <h1 class="text-xl font-bold text-content">{{ t('analytics.title') }}</h1>
      <p class="text-sm text-content-subtle mt-1">{{ t('analytics.subtitle') }}</p>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <svg class="h-10 w-10 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <template v-else>
      <!-- Universal metrics: identical shape for every program, any depth. -->
      <section class="card p-5 space-y-3">
        <h2 class="font-bold text-content">{{ t('analytics.universal') }}</h2>
        <dl class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="universal-metrics">
          <div v-for="tile in tiles" :key="tile.key" class="rounded-lg border border-subtle p-3">
            <dt class="text-xs text-content-subtle">{{ tile.label }}</dt>
            <dd class="text-lg font-bold text-content" :data-testid="`metric-${tile.key}`">{{ tile.value }}</dd>
          </div>
        </dl>
      </section>

      <div v-if="!levels.length" class="card p-8 text-center text-content-subtle">
        {{ t('analytics.noLevels') }}
      </div>

      <template v-else>
        <!-- Drill-down. The trail and the current level both come from the
             API, so this markup never assumes a depth. -->
        <section class="card p-5 space-y-4">
          <HierarchyBreadcrumb :trail="trail" :root-label="programCode()" @navigate="navigateTo" />

          <h2 class="font-bold text-content">
            {{ t('analytics.byLevel') }} {{ currentLevel?.plural_name ?? currentLevel?.name }}
          </h2>
          <p class="text-xs text-content-subtle">{{ t('analytics.drillHint') }}</p>

          <div v-if="!groupRows.length" class="text-content-subtle text-sm">{{ t('analytics.noData') }}</div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-line text-content-subtle">
                  <th class="px-3 py-2 text-start">{{ currentLevel?.name }}</th>
                  <th class="px-3 py-2 text-end">{{ t('analytics.assessable') }}</th>
                  <th class="px-3 py-2 text-end">{{ t('analytics.assigned') }}</th>
                  <th class="px-3 py-2 text-end">{{ t('analytics.approved') }}</th>
                  <th class="px-3 py-2 text-end">{{ t('analytics.overdue') }}</th>
                  <th class="px-3 py-2 text-end">{{ t('analytics.completion') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in groupRows"
                  :key="row.node.id"
                  class="border-b border-line last:border-0"
                  :class="nextLevel ? 'cursor-pointer hover:bg-surface-subtle' : ''"
                  :data-testid="`group-row-${row.node.code}`"
                  @click="drillInto(row)"
                >
                  <td class="px-3 py-2">
                    <span class="badge badge-draft me-2">{{ row.node.code }}</span>
                    <span class="text-content">{{ row.node.name }}</span>
                  </td>
                  <td class="px-3 py-2 text-end">{{ row.metrics.count_assessable }}</td>
                  <td class="px-3 py-2 text-end">{{ row.metrics.count_assigned }}</td>
                  <td class="px-3 py-2 text-end">{{ row.metrics.count_approved }}</td>
                  <td class="px-3 py-2 text-end">{{ row.metrics.count_overdue }}</td>
                  <td class="px-3 py-2 text-end font-medium">{{ row.metrics.completion_percentage }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Report: cascading filters + arbitrary group-by chain. -->
        <section class="card p-5 space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <h2 class="font-bold text-content">{{ t('analytics.report') }}</h2>
            <a class="btn-secondary" :href="exportHref" data-testid="export-csv">{{ t('analytics.export') }}</a>
          </div>

          <HierarchyFilter
            :levels="filterLevels"
            :load-options="loadFilterOptions"
            @change="onFilterChange"
          />

          <div class="flex flex-wrap items-end gap-3">
            <div v-for="(sel, i) in groupBy" :key="i" class="min-w-[11rem]">
              <label class="label">{{ t('analytics.groupBy') }} {{ i + 1 }}</label>
              <select v-model="groupBy[i]" class="input" :data-testid="`group-by-${i}`" @change="loadReport">
                <option value="">—</option>
                <option v-for="d in dimensions" :key="d.key" :value="d.key">{{ d.name }}</option>
              </select>
            </div>
            <button
              v-if="groupBy.length < 4"
              class="btn-secondary"
              data-testid="add-grouping"
              @click="groupBy.push('')"
            >+ {{ t('analytics.addGrouping') }}</button>
          </div>

          <p class="text-xs text-content-subtle">{{ report?.row_count ?? 0 }} {{ t('analytics.rows') }}</p>

          <div v-if="report" data-testid="report-tree">
            <ReportGroup :node="report.grouping" :depth="0" />
          </div>
        </section>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import HierarchyBreadcrumb from '@/components/hierarchy/HierarchyBreadcrumb.vue'
import HierarchyFilter from '@/components/hierarchy/HierarchyFilter.vue'
import { hierarchyAnalyticsService } from '@/services/index'

const { t } = useI18n()
const route = useRoute()
const programCode = () => route.params.programCode

const loading = ref(true)
const levels = ref([])
const dimensions = ref([])
const metrics = ref({})
const trail = ref([])
const currentLevel = ref(null)
const nextLevel = ref(null)
const groupRows = ref([])
const groupBy = ref(['', ''])
const report = ref(null)
const filterNodeId = ref(null)

const filterLevels = computed(() => dimensions.value.filter(d => d.type === 'hierarchy' && d.filterable))

const tiles = computed(() => [
  ['count_assessable', t('analytics.assessable')],
  ['count_assigned', t('analytics.assigned')],
  ['count_unassigned', t('analytics.unassigned')],
  ['count_approved', t('analytics.approved')],
  ['count_overdue', t('analytics.overdue')],
  ['completion_percentage', t('analytics.completion')],
].map(([key, label]) => ({
  key,
  label,
  value: key.endsWith('percentage') ? `${metrics.value[key] ?? 0}%` : (metrics.value[key] ?? 0),
})))

const exportHref = computed(() =>
  hierarchyAnalyticsService.exportUrl(programCode(), { node_id: filterNodeId.value }))

/**
 * Renders the report's nested groups. Written as a render function because
 * the nesting depth is whatever the user chose — a fixed template would
 * reintroduce exactly the depth assumption this engine removes.
 */
const ReportGroup = (props) => {
  const { node, depth } = props
  if (node?.groups) {
    return h('ul', { class: depth ? 'ms-4 border-s border-line ps-3 space-y-1' : 'space-y-1' },
      node.groups.map(g => h('li', { key: `${g.dimension}-${g.key}`, 'data-testid': `report-group-${g.dimension}` }, [
        h('div', { class: 'flex items-center gap-2 flex-wrap py-0.5' }, [
          h('span', { class: 'text-content font-medium text-sm' }, g.key),
          h('span', { class: 'text-xs text-content-subtle' }, `n=${g.count}`),
          h('span', { class: 'text-xs text-content-subtle' }, `${g.totals.completion_percentage}%`),
        ]),
        h(ReportGroup, { node: g, depth: depth + 1 }),
      ])))
  }
  if (node?.rows?.length && depth) {
    return h('p', { class: 'ms-4 text-xs text-content-subtle' }, `${node.rows.length} ${t('analytics.rows')}`)
  }
  return null
}

async function loadMetrics() {
  metrics.value = (await hierarchyAnalyticsService.metrics(programCode(), { node_id: filterNodeId.value })).metrics
}

async function loadGroup(levelKey, nodeId) {
  const data = await hierarchyAnalyticsService.byLevel(programCode(), levelKey, { node_id: nodeId })
  currentLevel.value = data.level
  nextLevel.value = data.next_level
  groupRows.value = data.rows
}

function drillInto(row) {
  if (!nextLevel.value) return
  trail.value.push({
    id: row.node.id,
    level_key: row.node.level_key,
    level_name: currentLevel.value?.name,
    code: row.node.code,
    name: row.node.name,
  })
  loadGroup(nextLevel.value.key, row.node.id)
}

function navigateTo(crumb, index) {
  trail.value = index < 0 ? [] : trail.value.slice(0, index + 1)
  const nodeId = index < 0 ? null : crumb.id
  // The level shown is the one BELOW the crumb clicked, or the first level
  // when returning to the root.
  const levelKey = index < 0 ? levels.value[0].key : nextLevelAfter(crumb.level_key)
  if (levelKey) loadGroup(levelKey, nodeId)
}

function nextLevelAfter(levelKey) {
  const i = levels.value.findIndex(l => l.key === levelKey)
  return levels.value[i + 1]?.key ?? levels.value[i]?.key
}

const loadFilterOptions = (levelKey, parentNodeId) =>
  hierarchyAnalyticsService.filterOptions(programCode(), levelKey, parentNodeId)

async function onFilterChange(nodeId) {
  filterNodeId.value = nodeId
  await Promise.all([loadMetrics(), loadReport()])
}

async function loadReport() {
  const chosen = groupBy.value.filter(Boolean)
  report.value = await hierarchyAnalyticsService.report(programCode(), {
    group_by: chosen,
    node_id: filterNodeId.value,
  })
}

onMounted(async () => {
  loading.value = true
  try {
    levels.value = await hierarchyAnalyticsService.dashboardLevels(programCode())
    dimensions.value = (await hierarchyAnalyticsService.dimensions(programCode())).dimensions
    await loadMetrics()
    if (levels.value.length) {
      groupBy.value = [levels.value[0]?.key ?? '', levels.value[1]?.key ?? '']
      await Promise.all([loadGroup(levels.value[0].key, null), loadReport()])
    }
  } finally {
    loading.value = false
  }
})
</script>
