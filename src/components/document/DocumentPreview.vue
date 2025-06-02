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
const isDragging = ref(false);

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

const emit = defineEmits<{
  (e: 'positionUpdated', position: { x: number, y: number }): void;
}>();

const handleDragStart = (e: DragEvent) => {
  if (!e.target) return;
  isDragging.value = true;
};

const handleDrag = (e: DragEvent) => {
  if (!e.target || !e.clientX || !e.clientY) return;
  
  const previewEl = e.currentTarget as HTMLElement;
  const rect = previewEl.getBoundingClientRect();
  
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  
  emit('positionUpdated', {
    x: Math.max(5, Math.min(95, x)),
    y: Math.max(5, Math.min(95, y))
  });
};

const handleDragEnd = () => {
  isDragging.value = false;
};
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
      @dragover.prevent
    >
      <img 
        :src="previewUrl" 
        alt="Document preview" 
        class="max-w-full max-h-[400px] rounded shadow-sm" 
      />
      
      <!-- Draggable QR code indicator -->
      <div 
        v-if="!hasQr"
        draggable="true"
        @dragstart="handleDragStart"
        @drag="handleDrag"
        @dragend="handleDragEnd"
        class="absolute w-12 h-12 bg-primary-500 bg-opacity-50 border-2 border-primary-500 rounded-md cursor-move"
        :class="{ 'opacity-75': isDragging }"
        :style="{
          left: `calc(${props.qrPosition.x}% - 24px)`,
          top: `calc(${props.qrPosition.y}% - 24px)`,
        }"
      ></div>
    </div>
    
    <!-- PDF preview -->
    <div 
      v-else-if="documentType === 'pdf' && previewUrl" 
      class="flex justify-center p-4"
      @dragover.prevent
    >
      <div class="relative w-full max-w-full h-[400px] border border-gray-300 rounded shadow-sm">
        <iframe 
          :src="`${previewUrl}#view=FitH`" 
          class="w-full h-full rounded" 
          title="PDF preview"
        ></iframe>
        
        <!-- Draggable QR code indicator -->
        <div 
          v-if="!hasQr"
          draggable="true"
          @dragstart="handleDragStart"
          @drag="handleDrag"
          @dragend="handleDragEnd"
          class="absolute w-12 h-12 bg-primary-500 bg-opacity-50 border-2 border-primary-500 rounded-md cursor-move"
          :class="{ 'opacity-75': isDragging }"
          :style="{
            left: `calc(${props.qrPosition.x}% - 24px)`,
            top: `calc(${props.qrPosition.y}% - 24px)`,
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