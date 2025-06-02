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
      
      <div v-else class="md:flex md:gap-8">
        <!-- Main Column -->
        <div class="md:w-7/10">
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
            
            <div class="flex justify-center mt-4 mb-8">
              <button 
                @click="downloadDocument" 
                class="btn btn-primary flex items-center"
              >
                <span class="mr-2">Download Document</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L10 12.586l2.293-2.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
            
            <!-- What's in Your Seal -->
            <div class="bg-gray-50 p-6 rounded-lg">
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
  </div>
</template>