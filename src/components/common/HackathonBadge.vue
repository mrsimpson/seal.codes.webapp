<script setup lang="ts">
import { computed } from 'vue'

interface Props {
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
    'bottom-right': 'fixed bottom-0 right-0 z-50',
    'bottom-left': 'fixed bottom-0 left-0 z-50',
    'top-right': 'fixed top-0 right-0 z-50',
    'top-left': 'fixed top-0 left-0 z-50'
  }
  
  return classes[props.position]
})
</script>

<template>
  <div :class="positionClasses" class="folded-corner-container">
    <div class="folded-corner"></div>
    <a
      href="https://github.com/kickiniteasy/bolt-hackathon-badge"
      target="_blank"
      rel="noopener noreferrer"
      :class="badgeClasses"
      title="Built with Bolt - Hackathon Entry"
      class="badge-link"
    >
      <img 
        src="/white_circle_360x360.png" 
        alt="Bolt Badge" 
        class="h-8 w-8"
      />
    </a>
  </div>
</template>

<style scoped>
.folded-corner-container {
  position: relative;
  overflow: hidden;
}

.folded-corner {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 0 80px 80px;
  border-color: transparent transparent #000 transparent;
  box-shadow: -2px 2px 5px rgba(0, 0, 0, 0.3);
  transform-origin: bottom right;
  transform: rotate(0deg);
  transition: all 0.3s ease;
  z-index: -1;
}

.folded-corner::before {
  content: '';
  position: absolute;
  bottom: -80px;
  right: -80px;
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  transform: rotate(45deg);
  z-index: 1;
}

.badge-link {
  position: relative;
  margin: 20px;
  z-index: 2;
}

.folded-corner-container:hover .folded-corner {
  transform: scale(1.05);
}
</style>