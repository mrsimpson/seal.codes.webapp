<script setup lang="ts">
defineProps<{
  onClick?: () => void;
}>();
</script>

<template>
  <button
    @click="onClick"
    class="relative group bg-secondary-500 text-white text-xl px-12 py-4 rounded-full shadow-lg transition-all duration-300 overflow-visible"
  >
    <!-- Base button -->
    <div class="relative z-10">
      <slot>It's yours – seal it!</slot>
    </div>
    
    <!-- Wax seal effect -->
    <div 
      class="absolute inset-0 rounded-full transition-all duration-300 group-hover:bg-secondary-600 group-hover:shadow-[0_0_0_6px_rgba(150,26,26,0.1)]
      group-active:shadow-[0_0_0_12px_rgba(150,26,26,0.15)] group-active:scale-105"
    >
      <!-- Wax bulges -->
      <div class="absolute -inset-2 opacity-0 group-active:opacity-100 transition-opacity duration-200">
        <div class="absolute top-0 left-1/4 w-4 h-4 bg-secondary-500 rounded-full transform -translate-y-1/2"></div>
        <div class="absolute top-1/4 right-0 w-4 h-4 bg-secondary-500 rounded-full transform translate-x-1/2"></div>
        <div class="absolute bottom-0 left-1/3 w-4 h-4 bg-secondary-500 rounded-full transform translate-y-1/2"></div>
        <div class="absolute bottom-1/4 left-0 w-4 h-4 bg-secondary-500 rounded-full transform -translate-x-1/2"></div>
      </div>
    </div>
  </button>
</template>