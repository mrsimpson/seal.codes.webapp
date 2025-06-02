<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDocumentStore } from '../stores/documentStore';
import DescriptionWrapper from '../components/common/DescriptionWrapper.vue';

const route = useRoute();
const router = useRouter();
const documentStore = useDocumentStore();

const documentId = computed(() => route.params.documentId as string);
const isLoading = ref(true);

onMounted(async () => {
  try {
    if (!documentStore.hasDocument || documentStore.documentId !== documentId.value) {
      router.push('/document');
      return;
    }
    
    isLoading.value = false;
  } catch (error) {
    console.error('Error loading sealed document:', error);
    isLoading.value = false;
  }
});

const downloadDocument = () => {
  documentStore.downloadSealedDocument();
};

const goBack = () => {
  router.push('/document');
};
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <div class="mb-6">
        <h1 class="text-3xl font-bold">Your Sealed Document</h1>
        <p class="text-gray-600">Your document has been successfully sealed</p>
      </div>
      
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
      
      <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Main Column -->
        <div class="md:col-span-2">
          <div class="card mb-8 animate-fade-in">
            <h2 class="text-2xl font-bold mb-4">Sealed Document</h2>
            
            <div class="mb-6">
              <div class="bg-gray-100 p-4 rounded-lg flex items-center justify-center">
                <img 
                  v-if="documentStore.sealedDocumentUrl" 
                  :src="documentStore.sealedDocumentUrl" 
                  alt="Sealed Document" 
                  class="max-w-full max-h-[500px] rounded shadow-sm" 
                />
              </div>
            </div>
            
            <div class="flex justify-between items-center">
              <button 
                @click="goBack"
                class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <span>← Back</span>
              </button>
              
              <button 
                @click="downloadDocument" 
                class="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
              >
                <span>Download Document</span>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Sidebar -->
        <div class="md:col-span-1">
          <div class="bg-white rounded-xl shadow-sm p-6">
            <h3 class="text-lg font-medium mb-4">What's in Your Seal?</h3>
            <ul class="space-y-2">
              <li class="flex items-center">
                <span class="w-2 h-2 bg-primary-500 rounded-full mr-2"></span>
                A unique document identifier
              </li>
              <li class="flex items-center">
                <span class="w-2 h-2 bg-primary-500 rounded-full mr-2"></span>
                Timestamp of sealing
              </li>
              <li class="flex items-center">
                <span class="w-2 h-2 bg-primary-500 rounded-full mr-2"></span>
                Your authentication information (hashed for privacy)
              </li>
              <li class="flex items-center">
                <span class="w-2 h-2 bg-primary-500 rounded-full mr-2"></span>
                A verification URL that can be accessed by scanning the QR code with any QR code reader
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>