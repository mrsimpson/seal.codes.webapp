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
const previewRef = ref<HTMLElement | null>(null);
const qrRef = ref<HTMLElement | null>(null);

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

const updatePosition = (e: MouseEvent) => {
  if (!previewRef.value || !isDragging.value) return;
  
  const rect = previewRef.value.getBoundingClientRect();
  const qrSize = qrRef.value?.offsetWidth || 48;
  const halfQrSize = qrSize / 2;
  
  // Calculate position as percentage
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  
  // Calculate boundaries considering QR code size
  const minX = (halfQrSize / rect.width) * 100;
  const maxX = 100 - (halfQrSize / rect.width) * 100;
  const minY = (halfQrSize / rect.height) * 100;
  const maxY = 100 - (halfQrSize / rect.height) * 100;
  
  // Keep QR code within bounds
  const boundedX = Math.max(minX, Math.min(maxX, x));
  const boundedY = Math.max(minY, Math.min(maxY, y));
  
  emit('positionUpdated', { x: boundedX, y: boundedY });
};

const startDragging = () => {
  isDragging.value = true;
  document.addEventListener('mousemove', updatePosition);
  document.addEventListener('mouseup', stopDragging);
};

const stopDragging = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', updatePosition);
  document.removeEventListener('mouseup', stopDragging);
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
      ref="previewRef"
      class="relative flex justify-center p-4"
    >
      <img 
        :src="previewUrl" 
        alt="Document preview" 
        class="max-w-full max-h-[400px] rounded shadow-sm" 
      />
      
      <!-- Draggable QR code indicator -->
      <div 
        v-if="!hasQr"
        ref="qrRef"
        class="absolute w-12 h-12 bg-primary-500 bg-opacity-50 border-2 border-primary-500 rounded-md cursor-move"
        :class="{ 'opacity-75': isDragging }"
        :style="{
          left: `${props.qrPosition.x}%`,
          top: `${props.qrPosition.y}%`,
          transform: 'translate(-50%, -50%)'
        }"
        @mousedown.prevent="startDragging"
      ></div>
    </div>
    
    <!-- PDF preview -->
    <div 
      v-else-if="documentType === 'pdf' && previewUrl" 
      ref="previewRef"
      class="relative w-full max-w-full h-[400px] p-4"
    >
      <iframe 
        :src="`${previewUrl}#view=FitH`" 
        class="w-full h-full rounded shadow-sm bg-white" 
        title="PDF preview"
      ></iframe>
      
      <!-- Draggable QR code indicator -->
      <div 
        v-if="!hasQr"
        ref="qrRef"
        class="absolute w-12 h-12 bg-primary-500 bg-opacity-50 border-2 border-primary-500 rounded-md cursor-move"
        :class="{ 'opacity-75': isDragging }"
        :style="{
          left: `${props.qrPosition.x}%`,
          top: `${props.qrPosition.y}%`,
          transform: 'translate(-50%, -50%)'
        }"
        @mousedown.prevent="startDragging"
      ></div>
    </div>
    
    <!-- No preview available -->
    <div v-else class="flex justify-center items-center p-12 text-gray-500">
      No preview available
    </div>
  </div>
</template>