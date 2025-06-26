<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'badge' | 'text'
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
    'bottom-right': 'fixed bottom-0 right-0 z-[9999]',
    'bottom-left': 'fixed bottom-0 left-0 z-[9999]',
    'top-right': 'fixed top-0 right-0 z-[9999]',
    'top-left': 'fixed top-0 left-0 z-[9999]'
  }
  
  return classes[props.position]
})
</script>

<template>
  <div :class="positionClasses" class="folded-corner-container">
    <!-- Folded corner effect -->
    <div class="folded-corner">
      <div class="inner-shadow"></div>
    </div>
    
    <!-- Badge -->
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
        class="badge-image"
      />
    </a>
  </div>
</template>

<style scoped>
.folded-corner-container {
  position: fixed;
  bottom: 0;
  right: 0;
  overflow: visible;
  width: 200px;
  height: 200px;
  pointer-events: none;
}

.folded-corner {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 0 200px 200px;
  border-color: transparent transparent rgba(0, 0, 0, 0.85) transparent;
  transform-origin: bottom right;
  transition: all 0.3s ease;
  z-index: 9998;
  filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.2));
  border-radius: 0 0 0 3px;
}

.inner-shadow {
  position: absolute;
  bottom: -200px;
  right: -200px;
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
  transform: rotate(45deg);
  z-index: 9999;
}

.badge-link {
  position: absolute;
  bottom: 40px;
  right: 40px;
  z-index: 10000;
  pointer-events: auto;
}

.badge-image {
  width: 80px;
  height: 80px;
  transform: translate(10px, 10px);
  transition: transform 0.3s ease-in-out;
}

.folded-corner-container:hover .folded-corner {
  border-width: 0 0 210px 210px;
}

.folded-corner-container:hover .badge-image {
  transform: translate(5px, 5px) scale(1.05);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .folded-corner-container {
    width: 150px;
    height: 150px;
  }
  
  .folded-corner {
    border-width: 0 0 150px 150px;
  }
  
  .inner-shadow {
    bottom: -150px;
    right: -150px;
    width: 150px;
    height: 150px;
  }
  
  .badge-link {
    bottom: 30px;
    right: 30px;
  }
  
  .badge-image {
    width: 60px;
    height: 60px;
  }
  
  .folded-corner-container:hover .folded-corner {
    border-width: 0 0 160px 160px;
  }
}
</style>