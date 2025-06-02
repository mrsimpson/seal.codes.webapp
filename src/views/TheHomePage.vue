<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ImageUp, MapPin, ShieldCheck } from 'lucide-vue-next';
import IconifiedStepDescription from '../components/common/IconifiedStepDescription.vue';

const router = useRouter();

const startProcess = () => {
  router.push('/document');
};
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Hero Section -->
    <main class="container mx-auto px-4 py-16 text-center">
      <h1 class="text-6xl font-bold mb-6 bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500 text-transparent bg-clip-text">
        The Digital Seal for the<br>Modern Age
      </h1>
      
      <p class="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
        Add visible marks of authenticity to your documents, just like the royal seals of old.
      </p>
      
      <button 
        @click="startProcess"
        class="bg-primary-500 text-white text-xl px-12 py-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
      >
        It's yours – seal it!
      </button>
      
      <!-- Process Steps -->
      <div class="grid md:grid-cols-3 gap-8 mt-24">
        <IconifiedStepDescription
          :icon="ImageUp"
          title="Load Document"
          description="Load any PDF or image file you want to protect with a seal."
        />
        
        <IconifiedStepDescription
          :icon="MapPin"
          title="Position Your Seal"
          description="Place your unique seal exactly where you want it on the document."
        />
        
        <IconifiedStepDescription
          :icon="ShieldCheck"
          title="Seal it"
          description="seal.codes creates a cryptographic seal that clearly proves your ownership."
        />
      </div>
    </main>
  </div>
</template>