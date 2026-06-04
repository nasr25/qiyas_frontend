<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <h1 class="text-xl font-bold text-content">{{ t('users.title') }}</h1>
      <div class="flex gap-2">
        <button class="btn-secondary btn-sm" @click="showLdapModal = true">{{ t('users.importAD') }}</button>
        <button class="btn-primary btn-sm" @click="openCreate">+ {{ t('users.new') }}</button>
      </div>
    </div>

    <!-- Search -->
    <div class="card p-4 flex gap-3">
      <input v-model="search" class="input flex-1" :placeholder="t('common.search')" @input="debouncedSearch" />
    </div>

    <!-- Table -->
    <div class="card">
      <div v-if="loading" class="flex justify-center py-16">
        <svg class="h-8 w-8 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
      <template v-else>
        <div class="table-wrapper rounded-xl border-0">
          <table class="table">
            <thead>
              <tr>
                <th>{{ t('users.name') }}</th>
                <th>{{ t('users.username') }}</th>
                <th>{{ t('users.email') }}</th>
                <th>{{ t('users.department') }}</th>
                <th>{{ t('users.roles') }}</th>
                <th>Auth</th>
                <th>{{ t('users.active') }}</th>
                <th>{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!users.length">
                <td colspan="8" class="text-center py-10 text-content-subtle">{{ t('common.noData') }}</td>
              </tr>
              <tr v-for="user in users" :key="user.id">
                <td class="font-medium">{{ user.name }}</td>
                <td class="font-mono text-xs">{{ user.username }}</td>
                <td class="text-xs">{{ user.email }}</td>
                <td>{{ user.department?.name_ar }}</td>
                <td>
                  <div class="flex flex-wrap gap-1">
                    <span v-for="role in (user.roles || [])" :key="role" class="badge badge-under-review text-xs">{{ role }}</span>
                  </div>
                </td>
                <td>
                  <span :class="user.auth_type === 'ldap' ? 'badge-under-review' : 'badge-draft'" class="badge text-xs">
                    {{ user.auth_type === 'ldap' ? t('users.authType.ldap') : t('users.authType.local') }}
                  </span>
                </td>
                <td>
                  <button
                    class="relative inline-flex h-5 w-9 rounded-full transition-colors"
                    :class="user.is_active ? 'bg-success-500' : 'bg-surface-inset'"
                    @click="handleToggleActive(user)"
                  >
                    <span class="inline-block h-4 w-4 mt-0.5 rounded-full bg-surface-raised shadow transition-transform"
                      :class="user.is_active ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0.5 rtl:-translate-x-0.5'" />
                  </button>
                </td>
                <td>
                  <div class="flex items-center gap-1">
                    <button class="btn-secondary btn-sm" @click="openEdit(user)">{{ t('common.edit') }}</button>
                    <button v-if="user.auth_type === 'local'" class="btn-secondary btn-sm" @click="openResetPassword(user)">{{ t('users.resetPassword') }}</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <AppPagination
          v-if="meta.last_page > 1"
          :current-page="meta.current_page"
          :last-page="meta.last_page"
          :total="meta.total"
          @page-change="fetchUsers"
        />
      </template>
    </div>

    <!-- Create/Edit User Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showUserModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.esc="showUserModal = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showUserModal = false" />
          <div class="relative card w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 class="text-lg font-semibold mb-4">{{ editId ? t('common.edit') : t('users.new') }}</h3>
            <form @submit.prevent="handleSaveUser" class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="label">{{ t('users.name') }}</label>
                  <input v-model="userForm.name" class="input" required />
                </div>
                <div>
                  <label class="label">{{ t('users.username') }}</label>
                  <input v-model="userForm.username" class="input" :required="!editId" />
                </div>
              </div>
              <div>
                <label class="label">{{ t('users.email') }}</label>
                <input v-model="userForm.email" type="email" class="input" />
              </div>
              <div v-if="!editId">
                <label class="label">Password</label>
                <input v-model="userForm.password" type="password" class="input" required />
              </div>
              <div>
                <label class="label">{{ t('users.department') }}</label>
                <select v-model="userForm.department_id" class="input">
                  <option value="">— None —</option>
                  <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name_ar }}</option>
                </select>
              </div>
              <div>
                <label class="label">{{ t('users.roles') }}</label>
                <div class="flex flex-wrap gap-2">
                  <label v-for="role in allRoles" :key="role" class="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      class="h-4 w-4 rounded border-line text-primary-600"
                      :value="role"
                      v-model="userForm.roles"
                    />
                    {{ role }}
                  </label>
                </div>
              </div>
              <div class="flex justify-end gap-3 pt-2">
                <button type="button" class="btn-secondary" @click="showUserModal = false">{{ t('common.cancel') }}</button>
                <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? t('common.loading') : t('common.save') }}</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Reset Password Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="resetModal.show" class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.esc="resetModal.show = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="resetModal.show = false" />
          <div class="relative card w-full max-w-sm p-6 shadow-xl">
            <h3 class="text-lg font-semibold mb-4">{{ t('users.resetPassword') }}</h3>
            <div class="space-y-4">
              <div>
                <label class="label">New Password</label>
                <input v-model="resetModal.password" type="password" class="input" required />
              </div>
              <div class="flex justify-end gap-3">
                <button class="btn-secondary" @click="resetModal.show = false">{{ t('common.cancel') }}</button>
                <button class="btn-primary" :disabled="!resetModal.password || resetModal.saving" @click="handleResetPassword">
                  {{ resetModal.saving ? t('common.loading') : t('common.save') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- LDAP Search Dialog -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showLdapModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.esc="showLdapModal = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showLdapModal = false" />
          <div class="relative card w-full max-w-2xl p-6 shadow-xl max-h-[85vh] flex flex-col">
            <h3 class="text-lg font-semibold mb-4">{{ t('users.searchAD') }}</h3>
            <div class="flex gap-3 mb-4">
              <input v-model="ldap.query" class="input flex-1" :placeholder="t('common.search')" @keydown.enter="searchLdap" />
              <button class="btn-primary" :disabled="ldap.searching" @click="searchLdap">{{ t('common.search') }}</button>
            </div>
            <!-- Results -->
            <div class="flex-1 overflow-y-auto min-h-0">
              <div v-if="ldap.searching" class="flex justify-center py-8">
                <svg class="h-6 w-6 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="result in ldap.results"
                  :key="result.username"
                  class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
                  :class="ldap.selected?.username === result.username
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-line hover:bg-surface-muted'"
                  @click="ldap.selected = result"
                >
                  <div class="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 font-semibold text-sm shrink-0">
                    {{ (result.name || '?')[0].toUpperCase() }}
                  </div>
                  <div>
                    <p class="text-sm font-medium text-content">{{ result.name }}</p>
                    <p class="text-xs text-content-muted">{{ result.email }} · {{ result.username }}</p>
                  </div>
                </div>
                <div v-if="!ldap.results.length && ldap.searched" class="text-center py-8 text-content-subtle text-sm">{{ t('common.noData') }}</div>
              </div>
            </div>
            <!-- Import form -->
            <div v-if="ldap.selected" class="border-t border-line mt-4 pt-4 space-y-3">
              <p class="text-sm font-medium text-content">Import: <strong>{{ ldap.selected.name }}</strong></p>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label">{{ t('users.department') }}</label>
                  <select v-model="ldap.department_id" class="input">
                    <option value="">— None —</option>
                    <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name_ar }}</option>
                  </select>
                </div>
                <div>
                  <label class="label">{{ t('users.roles') }}</label>
                  <select v-model="ldap.roles" multiple class="input h-20 text-xs">
                    <option v-for="role in allRoles" :key="role" :value="role">{{ role }}</option>
                  </select>
                </div>
              </div>
              <div class="flex justify-end gap-3">
                <button class="btn-secondary" @click="showLdapModal = false">{{ t('common.cancel') }}</button>
                <button class="btn-primary" :disabled="ldap.importing" @click="handleImportLdap">
                  {{ ldap.importing ? t('common.loading') : t('users.importAD') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { adminService, departmentsService } from '@/services/index'
import AppPagination from '@/components/common/AppPagination.vue'

const { t } = useI18n()
const appStore = useAppStore()

const loading     = ref(true)
const saving      = ref(false)
const users       = ref([])
const departments = ref([])
const search      = ref('')
const meta = ref({ current_page: 1, last_page: 1, total: 0 })

const editId       = ref(null)
const showUserModal = ref(false)
const showLdapModal = ref(false)

const allRoles = ['super-admin', 'coordinator', 'employee', 'auditor', 'executive']

const userForm = reactive({
  name: '', username: '', email: '', password: '',
  department_id: '', roles: [],
})

const resetModal = reactive({ show: false, userId: null, password: '', saving: false })

const ldap = reactive({
  query: '', results: [], selected: null, searching: false,
  searched: false, department_id: '', roles: [], importing: false,
})

let searchTimeout = null

async function fetchUsers(page = 1) {
  loading.value = true
  try {
    const res = await adminService.listUsers({ page, search: search.value })
    users.value = res.data || res
    if (res.meta) meta.value = res.meta
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    loading.value = false
  }
}

function debouncedSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => fetchUsers(1), 400)
}

function openCreate() {
  editId.value = null
  Object.assign(userForm, { name: '', username: '', email: '', password: '', department_id: '', roles: [] })
  showUserModal.value = true
}

function openEdit(user) {
  editId.value = user.id
  Object.assign(userForm, {
    name: user.name,
    username: user.username,
    email: user.email,
    password: '',
    department_id: user.department?.id || '',
    roles: [...(user.roles || [])],
  })
  showUserModal.value = true
}

function openResetPassword(user) {
  resetModal.userId = user.id
  resetModal.password = ''
  resetModal.show = true
}

async function handleSaveUser() {
  saving.value = true
  try {
    // Empty department => null (auditors etc. need no department).
    const payload = { ...userForm, department_id: userForm.department_id || null }
    if (editId.value) {
      await adminService.updateUser(editId.value, payload)
    } else {
      await adminService.createUser(payload)
    }
    appStore.showToast(t('common.success'), 'success')
    showUserModal.value = false
    await fetchUsers(meta.value.current_page)
  } catch (e) {
    appStore.showToast(e?.response?.data?.message || t('common.error'), 'error')
  } finally {
    saving.value = false
  }
}

async function handleToggleActive(user) {
  try {
    await adminService.toggleActive(user.id)
    user.is_active = !user.is_active
  } catch {
    appStore.showToast(t('common.error'), 'error')
  }
}

async function handleResetPassword() {
  resetModal.saving = true
  try {
    await adminService.resetPassword(resetModal.userId, { password: resetModal.password })
    appStore.showToast(t('common.success'), 'success')
    resetModal.show = false
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    resetModal.saving = false
  }
}

async function searchLdap() {
  if (!ldap.query.trim()) return
  ldap.searching = true
  ldap.results = []
  ldap.selected = null
  try {
    ldap.results = await adminService.ldapSearch(ldap.query)
    ldap.searched = true
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    ldap.searching = false
  }
}

async function handleImportLdap() {
  if (!ldap.selected) return
  ldap.importing = true
  try {
    await adminService.importLdap({
      ...ldap.selected,
      department_id: ldap.department_id || null,
      roles: ldap.roles,
    })
    appStore.showToast(t('common.success'), 'success')
    showLdapModal.value = false
    await fetchUsers()
  } catch (e) {
    appStore.showToast(e?.response?.data?.message || t('common.error'), 'error')
  } finally {
    ldap.importing = false
  }
}

onMounted(async () => {
  try {
    const res = await departmentsService.list()
    departments.value = res.data || res
  } catch {}
  await fetchUsers()
})
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
