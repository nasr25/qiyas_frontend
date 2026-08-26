<template>
  <div class="page">
    <div>
      <h1 class="text-xl font-bold text-content">{{ t('hierarchy.title') }}</h1>
      <p class="text-sm text-content-subtle mt-1">{{ t('hierarchy.subtitle') }}</p>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <svg class="h-10 w-10 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <div v-else-if="!levels.length" class="card p-10 text-center">
      <p class="text-content-subtle">{{ t('hierarchy.notConfigured') }}</p>
    </div>

    <template v-else>
      <!-- Breadcrumb -->
      <nav class="flex flex-wrap items-center gap-2 text-sm" data-testid="hierarchy-breadcrumb">
        <button type="button" class="text-brand hover:underline" @click="goToRoot">{{ t('hierarchy.root') }}</button>
        <template v-for="(crumb, i) in breadcrumb" :key="crumb.id">
          <span class="text-content-subtle">/</span>
          <button type="button" class="text-brand hover:underline" @click="drillTo(i)">{{ crumb.name_ar }}</button>
        </template>
      </nav>

      <div class="flex items-center justify-between flex-wrap gap-3">
        <h2 class="font-bold text-content">{{ currentLevelLabel }}</h2>
        <button v-if="nextLevel" class="btn-primary" data-testid="create-child-button" @click="openCreateModal">
          + {{ nextLevel.label_ar }}
        </button>
      </div>

      <div v-if="!children.length" class="card p-8 text-center text-content-subtle">{{ t('common.noData') }}</div>
      <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="node in children"
          :key="node.id"
          type="button"
          class="card p-4 text-start hover:shadow-lg transition-all"
          :data-testid="`hierarchy-node-${node.code}`"
          @click="open(node)"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="badge badge-draft">{{ node.code }}</span>
            <span v-if="node.is_assessable" class="badge badge-approved">{{ t('hierarchy.assessable') }}</span>
          </div>
          <p class="font-medium text-content">{{ node.name_ar }}</p>
          <p v-if="node.children_count" class="text-xs text-content-subtle mt-1">{{ node.children_count }} {{ t('hierarchy.children') }}</p>
        </button>
      </div>
    </template>

    <!-- Create node modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div class="card w-full max-w-lg p-5 space-y-3">
          <h3 class="font-bold text-content">{{ nextLevel?.label_ar }}</h3>
          <div>
            <label class="label">{{ t('hierarchy.code') }}</label>
            <input v-model="form.code" class="input" data-testid="node-code-input" />
          </div>
          <div>
            <label class="label">{{ t('hierarchy.nameAr') }}</label>
            <input v-model="form.name_ar" class="input" data-testid="node-name-ar-input" />
          </div>
          <div>
            <label class="label">{{ t('hierarchy.nameEn') }}</label>
            <input v-model="form.name_en" class="input" data-testid="node-name-en-input" />
          </div>
          <template v-if="nextLevel?.is_assessable">
            <div>
              <label class="label">{{ t('hierarchy.guidance') }}</label>
              <textarea v-model="form.guidance_ar" class="input" rows="2" data-testid="node-guidance-ar-input"></textarea>
            </div>
            <div>
              <label class="label">{{ t('hierarchy.evidenceRequirements') }}</label>
              <textarea v-model="form.evidence_requirements_ar" class="input" rows="2" data-testid="node-evidence-requirements-input"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">{{ t('hierarchy.weight') }}</label>
                <input v-model="form.weight" type="number" class="input" data-testid="node-weight-input" />
              </div>
              <div>
                <label class="label">{{ t('workflow.dueDate') }}</label>
                <input v-model="form.due_date" type="date" class="input" data-testid="node-due-date-input" />
              </div>
            </div>
          </template>
          <div class="flex justify-end gap-2 pt-2">
            <button class="btn-secondary" @click="showModal = false">{{ t('common.cancel') }}</button>
            <button class="btn-primary" :disabled="saving" data-testid="save-node-button" @click="createChild">
              {{ saving ? t('common.saving') : t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { hierarchyService, cyclesService } from '@/services/index'
import { useAppStore } from '@/stores/app'

const { t } = useI18n()
const route = useRoute()
const appStore = useAppStore()
const programCode = () => route.params.programCode

const loading = ref(true)
const saving = ref(false)
const levels = ref([])
const cycleId = ref(null)
const breadcrumb = ref([]) // [{id, node_type, name_ar}]
const children = ref([])
const showModal = ref(false)
const form = ref({ code: '', name_ar: '', name_en: '', guidance_ar: '', evidence_requirements_ar: '', weight: '', due_date: '' })

const currentParentId = computed(() => breadcrumb.value.length ? breadcrumb.value[breadcrumb.value.length - 1].id : null)
const currentNodeType = computed(() => breadcrumb.value.length ? breadcrumb.value[breadcrumb.value.length - 1].node_type : null)

const nextLevel = computed(() => levels.value.find(l => l.parent_type === currentNodeType.value))
const currentLevelLabel = computed(() =>
  currentNodeType.value ? (levels.value.find(l => l.node_type === currentNodeType.value)?.label_ar ?? '') : t('hierarchy.root'),
)

async function loadChildren() {
  children.value = await hierarchyService.children(programCode(), currentParentId.value, cycleId.value)
}

function goToRoot() {
  breadcrumb.value = []
  loadChildren()
}

function drillTo(index) {
  breadcrumb.value = breadcrumb.value.slice(0, index + 1)
  loadChildren()
}

async function open(node) {
  breadcrumb.value.push({ id: node.id, node_type: node.node_type, name_ar: node.name_ar })
  await loadChildren()
}

function openCreateModal() {
  form.value = { code: '', name_ar: '', name_en: '', guidance_ar: '', evidence_requirements_ar: '', weight: '', due_date: '' }
  showModal.value = true
}

async function createChild() {
  saving.value = true
  try {
    await hierarchyService.create(programCode(), {
      node_type: nextLevel.value.node_type,
      parent_id: currentParentId.value,
      cycle_id: cycleId.value,
      ...form.value,
    })
    showModal.value = false
    appStore.showToast(t('common.success'), 'success')
    await loadChildren()
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    levels.value = await hierarchyService.levels(programCode())
    if (levels.value.length) {
      const cyclesRes = await cyclesService.list(programCode(), { status: 'active' })
      cycleId.value = cyclesRes.data?.[0]?.id ?? null
      await loadChildren()
    }
  } finally {
    loading.value = false
  }
})
</script>
