<script setup lang="ts">
import { ref, computed } from 'vue';
import QRCode from 'qrcode';

const props = defineProps<{
  position: { x: number; y: number };
  containerWidth: number;
  containerHeight: number;
  authProvider?: string;
  userName?: string;
}>();

const emit = defineEmits<{
  (e: 'positionUpdated', position: { x: number; y: number }): void;
  (e: 'sizeUpdated', size: number): void;
}>();

const isDragging = ref(false);
const size = ref(20); // Default 20% of container width
const qrCodeUrl = ref('');

// Generate QR code
const generateQrCode = async () => {
  try {
    qrCodeUrl.value = await QRCode.toDataURL('https://seal.codes', {
      width: 200,
      margin: 0,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
  }
};

generateQrCode();

const startDragging = () => {
  isDragging.value = true;
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDragging);
};

const stopDragging = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDragging);
};

const handleDrag = (e: MouseEvent) => {
  if (!isDragging.value) return;
  
  const rect = document.querySelector('.document-preview')?.getBoundingClientRect();
  if (!rect) return;
  
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  
  // Keep QR code within bounds considering its size
  const halfSizePercent = (size.value / 2);
  const boundedX = Math.max(halfSizePercent, Math.min(100 - halfSizePercent, x));
  const boundedY = Math.max(halfSizePercent, Math.min(100 - halfSizePercent, y));
  
  emit('positionUpdated', { x: boundedX, y: boundedY });
};

const adjustSize = (delta: number) => {
  const newSize = Math.max(10, Math.min(30, size.value + delta));
  size.value = newSize;
  emit('sizeUpdated', newSize);
};

// Calculate actual size in pixels
const sizeInPixels = computed(() => {
  const minDimension = Math.min(props.containerWidth, props.containerHeight);
  return (minDimension * size.value) / 100;
});
</script>

<template>
  <div 
    class="absolute cursor-move"
    :style="{
      left: `${position.x}%`,
      top: `${position.y}%`,
      transform: 'translate(-50%, -50%)',
    }"
    @mousedown="startDragging"
  >
    <!-- QR Code Container -->
    <div 
      class="relative bg-white rounded-lg shadow-lg"
    >
      <!-- QR Code -->
      <div 
        :style="{
          width: `${sizeInPixels}px`,
          height: `${sizeInPixels}px`,
        }"
        class="p-[10px]"
      >
        <img 
          v-if="qrCodeUrl" 
          :src="qrCodeUrl" 
          alt="QR Code"
          class="w-full h-full"
        />
      </div>
      
      <!-- Auth Identity Placeholder (below QR code) -->
      <div class="px-2 py-3 border-t border-gray-100">
        <div class="flex items-center justify-center gap-2 mb-1">
          <div class="w-4 h-4 bg-gray-300 rounded-full"></div>
          <div class="w-16 h-3 bg-gray-300 rounded"></div>
        </div>
        <div class="flex justify-center">
          <div class="w-24 h-2 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
    
    <!-- Size Controls -->
    <div class="absolute left-1/2 transform -translate-x-1/2 mt-2 flex gap-2 bg-white rounded-lg shadow-md p-1">
      <button 
        @click="adjustSize(-2)" 
        class="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded"
      >
        −
      </button>
      <button 
        @click="adjustSize(2)"
        class="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded"
      >
        +
      </button>
    </div>
  </div>
</template>