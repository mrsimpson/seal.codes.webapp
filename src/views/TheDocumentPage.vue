<script setup lang="ts">
import { ref, computed, watch, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDocumentStore } from '../stores/documentStore'
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
const { add } = useMagicToast('document-toasts')

// Toast component
const ToastComponent = defineAsyncComponent(() => import('../components/common/ToastComponent.vue'))

const isDocumentLoaded = computed(() => documentStore.hasDocument)
const isProcessing = ref(false)
const qrPosition = ref<QRCodeUIPosition>({ x: 50, y: 50 })
const qrSize = ref(20) // Default 20% of container width (between min 15% and max 35%)

// Helper function to show toast messages
const showToast = (type: 'success' | 'error' | 'warning' | 'info', messageKey: string, params?: Record<string, any>) => {
  const message = t(messageKey, params)
  add({
    component: ToastComponent,
    props: {
      type,
      message,
      onClose: () => {}, // MagicToast handles removal automatically
    },
  })
}

const handleDocumentLoaded = async (file: File) => {
  console.log('🔥 Document loaded in TheDocumentPage:', file.name, file.type)
  try {
    await documentStore.setDocument(file)
    console.log('✅ Document successfully set in store')
  } catch (error) {
    console.error('❌ Error setting document in store:', error)
    
    if (error instanceof CodedError) {
      showToast('error', `errors.${error.code}`)
    } else {
      showToast('error', 'errors.document_load_failed')
    }
  }
}

const handleSocialAuth = async (provider: string) => {
  isProcessing.value = true
  try {
    await documentStore.authenticateWith(provider)
    // Note: Don't seal document here - it will be handled by the watcher
    // after the user returns from OAuth redirect and is authenticated
  } catch (error) {
    console.error('Authentication error:', error)
    
    // Handle OAuth provider configuration errors
    if (error instanceof OAuthProviderError && error.isConfigurationError) {
      showToast('error', 'errors.provider_not_configured', { provider: error.provider })
    } else if (error instanceof CodedError) {
      showToast('error', `errors.${error.code}`)
    } else {
      // Handle other authentication errors
      showToast('error', 'errors.authentication_failed')
    }
  } finally {
    isProcessing.value = false
  }
}

// Watch for both document and authentication to be ready, then seal and navigate
watch(
  () => [documentStore.hasDocument, documentStore.isAuthenticated],
  async ([hasDocument, isAuthenticated]) => {
    if (hasDocument && isAuthenticated) {
      try {
        isProcessing.value = true
        showToast('info', 'Sealing your document...')
        
        await documentStore.sealDocument(qrPosition.value, qrSize.value)
        
        showToast('success', 'Document sealed successfully!')
        
        router.push(`/sealed/${documentStore.documentId}`)
      } catch (error) {
        console.error('Error sealing document:', error)
        
        if (error instanceof CodedError) {
          showToast('error', `errors.${error.code}`)
        } else {
          showToast('error', 'errors.document_seal_failed')
        }
      } finally {
        isProcessing.value = false
      }
    }
  }
)

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
    <!-- Toast Provider -->
    <magic-toast-provider id="document-toasts" />
    
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
              <div>
                <h3 class="text-xl font-medium mb-3">
                  {{ t("document.controls.authenticateWith") }}
                </h3>
                <SocialAuthSelector
                  :is-processing="isProcessing"
                  @provider-selected="handleSocialAuth"
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