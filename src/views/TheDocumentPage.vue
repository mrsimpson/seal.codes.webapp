<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDocumentStore } from '../stores/documentStore'
import { useToast } from '@/composables/useToast'
import { qrCodeUICalculator } from '@/services/qrcode-ui-calculator'
import { OAuthProviderError, CodedError } from '@/types/errors'
import DocumentDropzone from '../components/document/DocumentDropzone.vue'
import DocumentPreview from '../components/document/DocumentPreview.vue'
import SocialAuthSelector from '../components/auth/SocialAuthSelector.vue'
import HowItWorks from '../components/document/HowItWorks.vue'
import BaseButton from '../components/common/BaseButton.vue'
import { QRCodeUIPosition } from '@/types/qrcode'

const router = useRouter()
const { t } = useI18n()
const documentStore = useDocumentStore()
const { success, error } = useToast()

const isDocumentLoaded = computed(() => documentStore.hasDocument)
const isProcessing = ref(false)
const qrPosition = ref<QRCodeUIPosition>({ x: 50, y: 50 })
const qrSize = ref(20) // Default 20% of container width (between min 15% and max 35%)

// Track if we've already attempted sealing to prevent multiple attempts
const sealingAttempted = ref(false)

const handleDocumentLoaded = async (file: File) => {
  console.log('🔥 Document loaded in TheDocumentPage:', file.name, file.type)
  try {
    await documentStore.setDocument(file)
    console.log('✅ Document successfully set in store')
    
    // Reset sealing attempt flag when new document is loaded
    sealingAttempted.value = false
    
    // If user is already authenticated, trigger sealing immediately
    if (documentStore.isAuthenticated) {
      console.log('🔐 User already authenticated, triggering sealing...')
      await triggerSealing()
    }
  } catch (err) {
    console.error('❌ Error setting document in store:', err)
    
    if (err instanceof CodedError) {
      error(t(`errors.${err.code}`))
    } else {
      error(t('errors.document_load_failed'))
    }
  }
}

const handleSocialAuth = async (provider: string) => {
  isProcessing.value = true
  try {
    await documentStore.authenticateWith(provider)
    // Note: The actual sealing will be triggered by the watcher when auth completes
  } catch (err) {
    console.error('Authentication error:', err)
    
    // Handle OAuth provider configuration errors
    if (err instanceof OAuthProviderError && err.isConfigurationError) {
      error(t('errors.provider_not_configured', { provider: err.provider }))
    } else if (err instanceof CodedError) {
      error(t(`errors.${err.code}`))
    } else {
      // Handle other authentication errors
      error(t('errors.authentication_failed'))
    }
  } finally {
    isProcessing.value = false
  }
}

const triggerSealing = async () => {
  if (sealingAttempted.value) {
    console.log('🔒 Sealing already attempted, skipping...')
    return
  }
  
  if (!documentStore.hasDocument || !documentStore.isAuthenticated) {
    console.log('🔒 Cannot seal: missing document or authentication')
    return
  }
  
  sealingAttempted.value = true
  
  try {
    isProcessing.value = true
    success('Sealing your document...')
    
    console.log('🔒 Starting document sealing process...')
    await documentStore.sealDocument(qrPosition.value, qrSize.value)
    
    success('Document sealed successfully!')
    
    console.log('🔒 Document sealed, navigating to sealed page...')
    router.push(`/sealed/${documentStore.documentId}`)
  } catch (err) {
    console.error('Error sealing document:', err)
    
    // Reset the flag so user can try again
    sealingAttempted.value = false
    
    if (err instanceof CodedError) {
      error(t(`errors.${err.code}`))
    } else {
      error(t('errors.document_seal_failed'))
    }
  } finally {
    isProcessing.value = false
  }
}

// Watch for both document and authentication to be ready, then seal and navigate
watch(
  () => [documentStore.hasDocument, documentStore.isAuthenticated],
  async ([hasDocument, isAuthenticated]) => {
    console.log('🔍 Watcher triggered:', { hasDocument, isAuthenticated, sealingAttempted: sealingAttempted.value })
    
    if (hasDocument && isAuthenticated && !sealingAttempted.value) {
      console.log('🔒 Both document and auth ready, triggering sealing...')
      await triggerSealing()
    }
  },
  { immediate: true } // Check immediately in case both are already ready
)

// Check on mount if both document and auth are ready (e.g., after OAuth redirect)
onMounted(async () => {
  console.log('🔄 TheDocumentPage mounted, checking readiness...')
  console.log('📄 Has document:', documentStore.hasDocument)
  console.log('🔐 Is authenticated:', documentStore.isAuthenticated)
  
  // If both are ready on mount (e.g., after OAuth redirect), trigger sealing
  if (documentStore.hasDocument && documentStore.isAuthenticated && !sealingAttempted.value) {
    console.log('🔒 Both ready on mount, triggering sealing...')
    await triggerSealing()
  }
})

// Calculate safe margins based on QR code size using the UI calculator
const cornerPositions = computed(() => {
  return qrCodeUICalculator.getCornerPositions(qrSize.value)
})

const setCornerPosition = (
  corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight',
) => {
  const position = cornerPositions.value[corner]
  if (position) {
    qrPosition.value = position
  }
}

const chooseNewDocument = () => {
  documentStore.reset()
  sealingAttempted.value = false
}

const updateQrPosition = (position: { x: number; y: number }) => {
  qrPosition.value = position
}

const updateQrSize = (size: number) => {
  qrSize.value = size
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <div class="mb-6">
        <h1 class="text-3xl font-bold">
          {{ t("document.title") }}
        </h1>
      </div>

      <div class="grid md:grid-cols-3 gap-8">
        <!-- Main Content -->
        <div class="md:col-span-2">
          <div class="bg-white rounded-xl shadow-sm p-6">
            <!-- Document Upload Section -->
            <div v-if="!isDocumentLoaded">
              <DocumentDropzone @file-loaded="handleDocumentLoaded" />
            </div>

            <!-- Document Preview and Controls Section -->
            <div v-else>
              <div class="mb-4">
                <DocumentPreview
                  :document="documentStore.uploadedDocument"
                  :qr-position="qrPosition"
                  :qr-size-percent="qrSize"
                  :has-qr="false"
                  :attestation-data="documentStore.currentAttestationData"
                  :auth-provider="documentStore.authProvider || undefined"
                  :user-name="documentStore.userName || undefined"
                  @position-updated="updateQrPosition"
                  @size-updated="updateQrSize"
                />
              </div>

              <!-- Controls Bar -->
              <div class="flex justify-between items-center mb-6">
                <BaseButton
                  variant="outline"
                  @click="chooseNewDocument"
                >
                  {{ t("document.controls.chooseAnother") }}
                </BaseButton>

                <div class="flex gap-2">
                  <button
                    v-for="(position, key) in {
                      topLeft: '↖',
                      topRight: '↗',
                      bottomLeft: '↙',
                      bottomRight: '↘',
                    }"
                    :key="key"
                    class="w-12 h-12 md:w-10 md:h-10 bg-white rounded-lg shadow-sm 
                           hover:bg-gray-50 active:bg-gray-100 flex items-center justify-center 
                           border border-gray-200 transition-colors touch-manipulation"
                    :title="t(`document.preview.corners.${key}`)"
                    @click="setCornerPosition(key as any)"
                  >
                    {{ position }}
                  </button>
                </div>
              </div>

              <!-- Social Authentication Section -->
              <div v-if="!documentStore.isAuthenticated">
                <h3 class="text-xl font-medium mb-3">
                  {{ t("document.controls.authenticateWith") }}
                </h3>
                <SocialAuthSelector
                  :is-processing="isProcessing"
                  @provider-selected="handleSocialAuth"
                />
              </div>
              
              <!-- Processing State -->
              <div v-else-if="isProcessing" class="text-center py-8">
                <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4" />
                <p class="text-gray-600">Processing your document...</p>
              </div>
              
              <!-- Authenticated State -->
              <div v-else class="text-center py-8">
                <div class="text-green-600 mb-4">
                  <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <p class="text-gray-600">Authenticated as {{ documentStore.userName }}</p>
                <p class="text-sm text-gray-500 mt-2">Your document will be sealed automatically...</p>
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