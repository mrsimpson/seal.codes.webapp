<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useDocumentStore } from '../stores/documentStore';
import DocumentDropzone from '../components/document/DocumentDropzone.vue';
import DocumentPreview from '../components/document/DocumentPreview.vue';
import SocialAuthSelector from '../components/auth/SocialAuthSelector.vue';
import HowItWorks from '../components/document/HowItWorks.vue';

const router = useRouter();
const documentStore = useDocumentStore();

const isDocumentLoaded = computed(() => documentStore.hasDocument);
const isProcessing = ref(false);
const qrPosition = ref({ x: 50, y: 50 });
const isDragging = ref(false);

const handleDocumentLoaded = (file: File) => {
  documentStore.setDocument(file);
};

const handleSocialAuth = async (provider: string) => {
  isProcessing.value = true;
  try {
    await documentStore.authenticateWith(provider);
    await documentStore.sealDocument(qrPosition.value);
    router.push(`/sealed/${documentStore.documentId}`);
  } catch (error) {
    console.error('Authentication error:', error);
  } finally {
    isProcessing.value = false;
  }
};

const setCornerPosition = (corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight') => {
  const positions = {
    topLeft: { x: 5, y: 5 },
    topRight: { x: 95, y: 5 },
    bottomLeft: { x: 5, y: 95 },
    bottomRight: { x: 95, y: 95 }
  };
  qrPosition.value = positions[corner];
};

const chooseNewDocument = () => {
  documentStore.reset();
};

// Drag and drop functionality
const handleDragStart = (e: DragEvent) => {
  if (!e.target) return;
  isDragging.value = true;
};

const handleDrag = (e: DragEvent) => {
  if (!e.target || !e.clientX || !e.clientY) return;
  
  const previewEl = document.querySelector('.document-preview-container');
  if (!previewEl) return;
  
  const rect = previewEl.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  
  qrPosition.value = {
    x: Math.max(5, Math.min(95, x)),
    y: Math.max(5, Math.min(95, y))
  };
};

const handleDragEnd = () => {
  isDragging.value = false;
};
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <div class="mb-6">
        <h1 class="text-3xl font-bold">Load Your Document</h1>
      </div>
      
      <div class="grid md:grid-cols-3 gap-8">
        <!-- Main Content -->
        <div class="md:col-span-2">
          <div class="bg-white rounded-xl shadow-sm p-6">
            <DocumentDropzone 
              v-if="!isDocumentLoaded" 
              @file-loaded="handleDocumentLoaded" 
            />
            
            <div v-else>
              <div class="relative document-preview-container">
                <DocumentPreview 
                  :document="documentStore.uploadedDocument" 
                  :qr-position="qrPosition"
                  :has-qr="false"
                />
                
                <!-- QR Code Corner Controls -->
                <div class="absolute right-0 top-1/2 -translate-y-1/2 transform flex flex-col gap-2 mr-4">
                  <button 
                    @click="setCornerPosition('topLeft')"
                    class="w-8 h-8 bg-white rounded-lg shadow-md hover:bg-gray-50 flex items-center justify-center border border-gray-200"
                    title="Top Left"
                  >
                    ↖
                  </button>
                  <button 
                    @click="setCornerPosition('topRight')"
                    class="w-8 h-8 bg-white rounded-lg shadow-md hover:bg-gray-50 flex items-center justify-center border border-gray-200"
                    title="Top Right"
                  >
                    ↗
                  </button>
                  <button 
                    @click="setCornerPosition('bottomLeft')"
                    class="w-8 h-8 bg-white rounded-lg shadow-md hover:bg-gray-50 flex items-center justify-center border border-gray-200"
                    title="Bottom Left"
                  >
                    ↙
                  </button>
                  <button 
                    @click="setCornerPosition('bottomRight')"
                    class="w-8 h-8 bg-white rounded-lg shadow-md hover:bg-gray-50 flex items-center justify-center border border-gray-200"
                    title="Bottom Right"
                  >
                    ↘
                  </button>
                </div>
              </div>
              
              <div class="flex gap-4 mt-6">
                <button 
                  @click="chooseNewDocument"
                  class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Choose Another Document
                </button>
              </div>
              
              <div class="mt-6">
                <h3 class="text-xl font-medium mb-3">Authenticate yourself with</h3>
                <SocialAuthSelector 
                  @provider-selected="handleSocialAuth"
                  :is-processing="isProcessing"
                />
              </div>
            </div>
          </div>
        </div>
        
        <!-- Sidebar -->
        <div class="md:col-span-1">
          <HowItWorks />
        </div>
      </div>
    </div>
  </div>
</template>