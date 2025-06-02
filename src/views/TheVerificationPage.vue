<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const verificationId = ref(route.params.id);
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-2xl mx-auto">
        <div class="bg-white rounded-xl shadow-sm p-8">
          <h1 class="text-3xl font-bold mb-8">How to Verify This Document</h1>
          
          <div class="space-y-8">
            <!-- Step 1 -->
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                1
              </div>
              <div>
                <h2 class="text-xl font-medium mb-2">Scan the QR Code</h2>
                <p class="text-gray-600">
                  Use any QR code scanner app on your smartphone to scan the QR code on the document.
                </p>
              </div>
            </div>
            
            <!-- Step 2 -->
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                2
              </div>
              <div>
                <h2 class="text-xl font-medium mb-2">Visit the Verification Link</h2>
                <p class="text-gray-600">
                  The QR code contains a unique verification link. Tap on it to open the verification page.
                </p>
              </div>
            </div>
            
            <!-- Step 3 -->
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                3
              </div>
              <div>
                <h2 class="text-xl font-medium mb-2">View Verification Details</h2>
                <p class="text-gray-600">
                  The verification page will show you when the document was sealed and by whom, confirming its authenticity.
                </p>
              </div>
            </div>
          </div>
          
          <div class="mt-8 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <p class="text-blue-700">
              <strong>Note:</strong> The seal verification process confirms that the document has not been altered since it was sealed.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>