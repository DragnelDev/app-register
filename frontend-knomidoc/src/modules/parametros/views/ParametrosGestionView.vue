<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { parametrosGestionService } from '@/services/gestion.service'
import { extractApiErrorMessage } from '@/utils/http-error'
import type { ParametroGestion } from '@/types/gestion.types'

const gestiones = ref<ParametroGestion[]>([])
const loading = ref(false)
const error = ref('')
const aviso = ref('')
const modalOpen = ref(false)
const saving = ref(false)
const modalError = ref('')
const editando = ref<ParametroGestion | null>(null)
const form = reactive({ gestion: new Date().getFullYear() as number | string, fechaApertura: '', observaciones: '' })

async function cargar() {
  loading.value = true
  error.value = ''
  try {
    gestiones.value = await parametrosGestionService.list()
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudieron cargar las gestiones.')
  } finally {
    loading.value = false
  }
}

function nueva() {
  editando.value = null
  Object.assign(form, { gestion: new Date().getFullYear(), fechaApertura: '', observaciones: '' })
  modalError.value = ''
  modalOpen.value = true
}

function editar(g: ParametroGestion) {
  editando.value = g
  Object.assign(form, {
    gestion: g.gestion,
    fechaApertura: g.fechaApertura?.slice(0, 10) ?? '',
    observaciones: g.observaciones ?? '',
  })
  modalError.value = ''
  modalOpen.value = true
}

async function guardar() {
  saving.value = true
  modalError.value = ''
  try {
    if (editando.value) {
      await parametrosGestionService.update(editando.value.id, {
        fechaApertura: form.fechaApertura || undefined,
        observaciones: form.observaciones || undefined,
      })
    } else {
      await parametrosGestionService.create({
        gestion: Number(form.gestion),
        fechaApertura: form.fechaApertura || undefined,
        observaciones: form.observaciones || undefined,
      })
    }
    modalOpen.value = false
    await cargar()
  } catch (err) {
    modalError.value = extractApiErrorMessage(err, 'No se pudo guardar la gestión.')
  } finally {
    saving.value = false
  }
}

async function accion(g: ParametroGestion, a: 'activar' | 'cerrar' | 'reabrir') {
  const textos = {
    activar: `¿Marcar la gestión ${g.gestion} como activa? Será la que se proponga al registrar comprobantes.`,
    cerrar: `¿Cerrar la gestión ${g.gestion}?`,
    reabrir: `¿Reabrir la gestión ${g.gestion}?`,
  }
  if (!confirm(textos[a])) return
  error.value = ''
  aviso.value = ''
  try {
    await parametrosGestionService.accion(g.id, a)
    aviso.value = `Gestión ${g.gestion}: ${a === 'activar' ? 'activada' : a === 'cerrar' ? 'cerrada' : 'reabierta'}.`
    await cargar()
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudo completar la acción.')
  }
}

async function eliminar(g: ParametroGestion) {
  if (!confirm(`¿Eliminar la gestión ${g.gestion}?`)) return
  error.value = ''
  try {
    await parametrosGestionService.remove(g.id)
    await cargar()
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudo eliminar la gestión.')
  }
}

onMounted(cargar)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Parámetros de gestión</h1>
        <p class="text-sm text-ink-500 dark:text-ink-400">
          Años de gestión del archivo. La gestión activa se propone por defecto al registrar comprobantes.
        </p>
      </div>
      <BaseButton @click="nueva"><i class="fa-solid fa-plus" aria-hidden="true" /> Nueva gestión</BaseButton>
    </div>

    <p v-if="aviso" class="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300">{{ aviso }}</p>
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    <p v-if="loading" class="text-sm text-ink-500">Cargando…</p>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div v-for="g in gestiones" :key="g.id" class="card flex flex-col gap-3 p-5" :class="g.activa ? 'ring-2 ring-seal-500 dark:ring-seal-300' : ''">
        <div class="flex items-start justify-between">
          <div>
            <p class="font-display text-3xl font-semibold">{{ g.gestion }}</p>
            <p class="text-xs text-ink-500 dark:text-ink-400">
              {{ g.totalComprobantes ?? 0 }} comprobantes
              <template v-if="g.fechaApertura"> · apertura {{ g.fechaApertura.slice(0, 10) }}</template>
              <template v-if="g.fechaCierre"> · cierre {{ g.fechaCierre.slice(0, 10) }}</template>
            </p>
          </div>
          <div class="flex flex-col items-end gap-1">
            <span v-if="g.activa" class="badge bg-seal-100 text-seal-800 dark:bg-seal-400/15 dark:text-seal-300">Activa</span>
            <span class="badge" :class="g.estado === 'ABIERTA' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300' : 'bg-ink-100 text-ink-600 dark:bg-white/10 dark:text-ink-300'">
              {{ g.estado === 'ABIERTA' ? 'Abierta' : 'Cerrada' }}
            </span>
          </div>
        </div>
        <p v-if="g.observaciones" class="text-sm text-ink-600 dark:text-ink-300">{{ g.observaciones }}</p>
        <div class="mt-auto flex flex-wrap gap-2">
          <BaseButton v-if="!g.activa && g.estado === 'ABIERTA'" size="sm" @click="accion(g, 'activar')">Activar</BaseButton>
          <BaseButton v-if="!g.activa && g.estado === 'ABIERTA'" size="sm" variant="secondary" @click="accion(g, 'cerrar')">Cerrar</BaseButton>
          <BaseButton v-if="g.estado === 'CERRADA'" size="sm" variant="secondary" @click="accion(g, 'reabrir')">Reabrir</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="editar(g)">Editar</BaseButton>
          <BaseButton v-if="!g.activa && !g.totalComprobantes" size="sm" variant="danger" @click="eliminar(g)">Eliminar</BaseButton>
        </div>
      </div>
      <p v-if="!loading && !gestiones.length" class="text-sm text-ink-500">Aún no hay gestiones. Registre la primera.</p>
    </div>

    <BaseModal v-model="modalOpen" :title="editando ? `Editar gestión ${editando.gestion}` : 'Nueva gestión'" size="sm">
      <form id="gestion-form" class="space-y-4" @submit.prevent="guardar">
        <BaseInput v-model="form.gestion" type="number" label="Año de gestión" required :disabled="Boolean(editando)" />
        <BaseInput v-model="form.fechaApertura" type="date" label="Fecha de apertura" hint="Opcional; por defecto el 1 de enero." />
        <BaseInput v-model="form.observaciones" label="Observaciones" />
        <p v-if="modalError" class="text-sm text-red-600">{{ modalError }}</p>
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="modalOpen = false">Cancelar</BaseButton>
        <BaseButton type="submit" form="gestion-form" :loading="saving">Guardar</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
