<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';

const props = defineProps<{
  document: File | null;
  qrPosition: { x: number, y: number };
  hasQr?: boolean;
}>();

const previewUrl = ref('');
const documentType = ref<'pdf' | 'image' | null>(null);
const isLoading = ref(true);

// Create document preview
watch(() => props.document, async (newDocument) => {
  if (!newDocument) return;
  
  isLoading.value = true;
  
  // Determine document type
  if (newDocument.type === 'application/pdf') {
    documentType.value = 'pdf';
  } else if (newDocument.type.startsWith('image/')) {
    documentType.value = 'image';
  } else {
    documentType.value = null;
    isLoading.value = false;
    return;
  }
  
  // Create object URL for preview
  previewUrl.value = URL.createObjectURL(newDocument);
  isLoading.value = false;
}, { immediate: true });

// Clean up object URL on component unmount
onMounted(() => {
  return () => {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
    }
  };
});
</script>

<template>
  <div class="bg-gray-100 rounded-lg">
    <!-- Loading indicator -->
    <div v-if="isLoading" class="flex justify-center items-center p-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
    </div>
    
    <!-- Image preview -->
    <div 
      v-else-if="documentType === 'image' && previewUrl" 
      class="relative flex justify-center p-4"
    >
      <img 
        :src="previewUrl" 
        alt="Document preview" 
        class="max-w-full max-h-[400px] rounded shadow-sm" 
      />
      
      <!-- QR code position indicator -->
      <div 
        v-if="!hasQr"
        class="absolute w-12 h-12 bg-primary-500 bg-opacity-50 border-2 border-primary-500 rounded-md pointer-events-none"
        :style="{
          left: `calc(${qrPosition.x}% - 24px)`,
          top: `calc(${qrPosition.y}% - 24px)`,
        }"
      ></div>
    </div>
    
    <!-- PDF preview -->
    <div 
      v-else-if="documentType === 'pdf' && previewUrl" 
      class="flex justify-center p-4"
    >
      <div class="relative w-full max-w-full h-[400px] border border-gray-300 rounded shadow-sm">
        <iframe 
          :src="`${previewUrl}#view=FitH`" 
          class="w-full h-full rounded" 
          title="PDF preview"
        ></iframe>
        
        <!-- QR code position indicator (not fully accurate for PDFs) -->
        <div 
          v-if="!hasQr"
          class="absolute w-12 h-12 bg-primary-500 bg-opacity-50 border-2 border-primary-500 rounded-md pointer-events-none"
          :style="{
            left: `calc(${qrPosition.x}% - 24px)`,
            top: `calc(${qrPosition.y}% - 24px)`,
          }"
        ></div>
      </div>
    </div>
    
    <!-- No preview available -->
    <div v-else class="flex justify-center items-center p-12 text-gray-500">
      No preview available
    </div>
  </div>
</template>