<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'text' | 'badge'
  size?: 'sm' | 'md' | 'lg'
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'badge',
  size: 'md',
  position: 'bottom-right'
})

const badgeClasses = computed(() => {
  const baseClasses = 'inline-flex items-center gap-2 font-medium transition-all duration-200'
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  }
  
  const variantClasses = {
    text: 'text-gray-600 hover:text-primary-500',
    badge: 'bg-black text-white rounded-full hover:bg-gray-800'
  }
  
  return [
    baseClasses,
    sizeClasses[props.size],
    variantClasses[props.variant]
  ].join(' ')
})

const positionClasses = computed(() => {
  const classes = {
    'bottom-right': 'fixed bottom-4 right-4 z-50',
    'bottom-left': 'fixed bottom-4 left-4 z-50',
    'top-right': 'fixed top-4 right-4 z-50',
    'top-left': 'fixed top-4 left-4 z-50'
  }
  
  return classes[props.position]
})
</script>

<template>
  <div :class="positionClasses">
    <a
      href="https://github.com/kickiniteasy/bolt-hackathon-badge"
      target="_blank"
      rel="noopener noreferrer"
      :class="badgeClasses"
      title="Built with Bolt - Hackathon Entry"
    >
      <img 
        v-if="variant === 'badge'"
        src="/black_circle_360x360.svg" 
        alt="Bolt Badge" 
        class="h-8 w-8"
      />
      <img 
        v-else
        src="/logotext_poweredby_360w.svg" 
        alt="Powered by Bolt" 
        class="h-6"
      />
    </a>
  </div>
</template>