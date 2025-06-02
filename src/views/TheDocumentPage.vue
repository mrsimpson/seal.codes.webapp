<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useDocumentStore } from '../stores/documentStore';
import DocumentDropzone from '../components/document/DocumentDropzone.vue';
import DocumentPreview from '../components/document/DocumentPreview.vue';
import QrPlacementSelector from '../components/document/QrPlacementSelector.vue';
import SocialAuthSelector from '../components/auth/SocialAuthSelector.vue';
import HowItWorks from '../components/document/HowItWorks.vue';

const router = useRouter();
const documentStore = useDocumentStore();

const isDocumentLoaded = computed(() => documentStore.hasDocument);
const isProcessing = ref(false);
const qrPosition = ref({ x: 50, y: 50 });
const showQrPositioning = ref(false);

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

const updateQrPosition = (position: { x: number, y: number }) => {
  qrPosition.value = position;
};

const chooseNewDocument = () => {
  documentStore.reset();
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
              <DocumentPreview 
                :document="documentStore.uploadedDocument" 
                :qr-position="qrPosition"
                :has-qr="false"
              />
              
              <div class="flex gap-4 mt-6">
                <button 
                  @click="chooseNewDocument"
                  class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Choose Another Document
                </button>
                <button 
                  @click="showQrPositioning = !showQrPositioning"
                  class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {{ showQrPositioning ? 'Hide QR Positioning' : 'Position QR Code' }}
                </button>
              </div>
              
              <div v-if="showQrPositioning" class="mt-6">
                <h3 class="text-xl font-medium mb-3">QR Code Placement</h3>
                <QrPlacementSelector 
                  :initial-position="qrPosition"
                  @position-updated="updateQrPosition"
                />
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