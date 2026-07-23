<script setup lang="ts">
interface Props {
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  size: 'md',
})

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

function close() {
  emit('update:modelValue', false)
}

const sizeClass = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
}[props.size]
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 px-4"
        @keydown.esc="close"
      >
        <div
          class="w-full rounded-lg bg-white shadow-xl"
          :class="sizeClass"
          role="dialog"
          aria-modal="true"
        >
          <header class="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <h3 class="text-lg font-semibold text-ink-900">{{ title }}</h3>
            <button
              type="button"
              class="rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              aria-label="Cerrar"
              @click="close"
            >
              ✕
            </button>
          </header>

          <div class="max-h-[70vh] overflow-y-auto px-5 py-4">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="flex justify-end gap-2 border-t border-ink-100 px-5 py-4">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
