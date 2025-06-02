<script setup lang="ts">
defineProps<{
  isProcessing: boolean;
}>();

const emit = defineEmits<{
  (e: 'providerSelected', provider: string): void;
}>();

const handleProviderSelect = (provider: string) => {
  emit('providerSelected', provider);
};
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
    <!-- Google -->
    <button 
      @click="handleProviderSelect('google')"
      :disabled="isProcessing"
      class="aspect-square flex items-center justify-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
    >
      <img src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png" alt="Google" class="w-8 h-8 object-contain" />
    </button>

    <!-- GitHub -->
    <button 
      @click="handleProviderSelect('github')"
      :disabled="isProcessing"
      class="aspect-square flex items-center justify-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
    >
      <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="GitHub" class="w-8 h-8 object-contain" />
    </button>

    <!-- Microsoft -->
    <button 
      @click="handleProviderSelect('microsoft')"
      :disabled="isProcessing"
      class="aspect-square flex items-center justify-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
    >
      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/1024px-Microsoft_logo.svg.png" alt="Microsoft" class="w-8 h-8 object-contain" />
    </button>

    <!-- Apple -->
    <button 
      @click="handleProviderSelect('apple')"
      :disabled="isProcessing"
      class="aspect-square flex items-center justify-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
    >
      <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" alt="Apple" class="w-8 h-8 object-contain" />
    </button>
  </div>
</template>