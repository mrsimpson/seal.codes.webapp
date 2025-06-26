<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'text' | 'badge'
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'text',
  size: 'md'
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

const boltIcon = computed(() => {
  // Simple bolt/lightning icon as SVG
  return `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2L3 14h6l-2 8 10-12h-6l2-8z"/>
    </svg>
  `
})
</script>

<template>
  <a
    href="https://github.com/kickiniteasy/bolt-hackathon-badge"
    target="_blank"
    rel="noopener noreferrer"
    :class="badgeClasses"
    title="Built with Bolt - Hackathon Entry"
  >
    <span v-html="boltIcon" class="flex-shrink-0" />
    <span v-if="variant === 'text'">Built with Bolt</span>
    <span v-else>Bolt</span>
  </a>
</template>