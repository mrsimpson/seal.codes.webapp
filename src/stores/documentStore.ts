import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { PDFDocument } from 'pdf-lib'
import { qrCodeUICalculator } from '@/services/qrcode-ui-calculator'
import { attestationBuilder } from '@/services/attestation-builder'
import { qrSealRenderer } from '@/services/qr-seal-renderer'
import { documentHashService } from '@/services/document-hash-service'
import { formatConversionService, type FormatConversionResult } from '@/services/format-conversion-service'
import { authService, type AuthUser, OAuthProviderError } from '@/services/auth-service'
import { signingService } from '@/services/signing-service'
import type { QRCodeUIPosition, AttestationData } from '@/types/qrcode'

// Unique ID generation for documents
const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

export const useDocumentStore = defineStore('document', () => {
  // State
  const uploadedDocument = ref<File | null>(null)
  const documentType = ref<'pdf' | 'image' | null>(null)
  const documentId = ref<string>('')
  const documentPreviewUrl = ref<string>('')
  const sealedDocumentUrl = ref<string>('')
  const sealedDocumentBlob = ref<Blob | null>(null)
  const currentUser = ref<AuthUser | null>(null)
  const isAuthenticating = ref(false)
  const authError = ref<string | null>(null)
  
  // Format conversion state
  const formatConversionResult = ref<FormatConversionResult | null>(null)
  const showFormatConversionNotification = ref(false)
  
  // Getters
  const hasDocument = computed(() => uploadedDocument.value !== null)
  const fileName = computed(() => uploadedDocument.value?.name || '')
  const isAuthenticated = computed(() => currentUser.value !== null)
  const authProvider = computed(() => currentUser.value?.provider || null)
  const userName = computed(() => currentUser.value?.displayName || currentUser.value?.email || null)
  const userEmail = computed(() => currentUser.value?.email || null)
  
  const currentAttestationData = computed((): AttestationData | undefined => {
    if (!isAuthenticated.value || !authProvider.value || !userEmail.value) {
      return undefined
    }
    
    try {
      return buildAttestationData()
    } catch (error) {
      console.warn('Could not build attestation data:', error)
      return undefined
    }
  })
  
  // Actions
  const setDocument = async (file: File) => {
    console.log('📄 Setting document in store:', file.name, file.type)
    
    uploadedDocument.value = file
    
    // Determine document type
    if (file.type === 'application/pdf') {
      documentType.value = 'pdf'
    } else if (file.type.startsWith('image/')) {
      documentType.value = 'image'
    } else {
      throw new Error('Unsupported file type')
    }
    
    // Create a preview URL
    documentPreviewUrl.value = URL.createObjectURL(file)
    
    console.log('✅ Document set successfully:', {
      name: file.name,
      type: documentType.value,
      size: file.size,
      previewUrl: documentPreviewUrl.value,
    })
  }
  
  const authenticateWith = async (provider: string) => {
    console.log('🔐 Authenticating with provider:', provider)
    
    isAuthenticating.value = true
    authError.value = null
    
    try {
      // Initiate OAuth sign-in
      const { error } = await authService.signInWithProvider(provider)
      
      if (error) {
        // Check if this is a provider configuration error
        if (error instanceof OAuthProviderError && error.isConfigurationError) {
          // This will be handled by the component to show a toast
          throw error
        }
        
        authError.value = error.message
        throw new Error(error.message)
      }
      
      // OAuth sign-in initiated - the user will be redirected
      // The actual authentication completion will be handled by onAuthStateChange
      console.log('✅ OAuth sign-in initiated')
      
    } catch (error) {
      console.error('❌ Authentication failed:', error)
      
      // Re-throw OAuthProviderError so the component can handle it
      if (error instanceof OAuthProviderError) {
        throw error
      }
      
      authError.value = error instanceof Error ? error.message : 'Authentication failed'
      throw error
    } finally {
      isAuthenticating.value = false
    }
  }
  
  const sealDocument = async (position: QRCodeUIPosition, sizePercent: number = 20) => {
    if (!uploadedDocument.value || !isAuthenticated.value || !currentUser.value) {
      throw new Error('Document or authentication missing')
    }

    console.log('🔒 Starting document sealing process...')

    try {
      // Get document dimensions for pixel calculation
      const documentDimensions = await getDocumentDimensions()
      console.log('📐 Document dimensions:', documentDimensions)
      
      // Calculate exact pixel positioning using our UI calculator
      const pixelCalculation = qrCodeUICalculator.calculateEmbeddingPixels(
        position,
        sizePercent,
        documentDimensions,
        documentType.value as 'pdf' | 'image',
      )
      console.log('📍 Pixel calculation result:', pixelCalculation)

      // Calculate document hashes with exclusion zone
      const documentHashes = await documentHashService.calculateDocumentHashes(
        uploadedDocument.value,
        pixelCalculation.exclusionZone,
      )
      console.log('🔢 Document hashes calculated:', documentHashes)

      // Build attestation package for server signing (without timestamp and service info)
      const attestationPackage = attestationBuilder.buildAttestationPackage({
        documentHashes,
        identity: {
          provider: currentUser.value.provider,
          identifier: currentUser.value.email,
        },
        exclusionZone: pixelCalculation.exclusionZone,
      })
      console.log('📋 Attestation package built for signing:', attestationPackage)

      // Send to server for signing
      const signingResponse = await signingService.signAttestation(attestationPackage)
      console.log('✅ Server signing completed:', signingResponse)

      // Combine client package with server signature to create final attestation data
      const finalAttestationData = attestationBuilder.combineWithServerSignature(
        attestationPackage,
        signingResponse
      )
      console.log('🔗 Final attestation data created:', finalAttestationData)

      // Generate complete QR seal (including borders, identity, etc.)
      // Pass the base URL for verification links
      const sealResult = await qrSealRenderer.generateSeal({
        attestationData: finalAttestationData,
        qrSizeInPixels: pixelCalculation.sizeInPixels,
        providerId: currentUser.value.provider,
        userIdentifier: currentUser.value.displayName,
        baseUrl: window.location.origin,
      })
      console.log('🎨 QR seal generated:', sealResult.dimensions)

      // Generate a unique document ID
      documentId.value = generateUniqueId()

      // Embed the complete seal
      if (documentType.value === 'pdf') {
        await sealPdfDocument(
          sealResult.dataUrl, 
          pixelCalculation.position, 
          sealResult.dimensions.width,
          sealResult.dimensions.height,
        )
      } else if (documentType.value === 'image') {
        await sealImageDocument(
          sealResult.dataUrl, 
          pixelCalculation.position, 
          sealResult.dimensions.width,
          sealResult.dimensions.height,
        )
      }

      console.log('✅ Document sealing completed successfully')
      return documentId.value
    } catch (error) {
      console.error('❌ Error sealing document:', error)
      throw new Error('Failed to seal document: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }
  
  // Initialize authentication state
  const initializeAuth = async () => {
    console.log('🔐 Initializing authentication state...')
    
    try {
      // Get current session
      const session = await authService.getSession()
      if (session) {
        currentUser.value = session.user
        console.log('✅ User already authenticated:', session.user.email)
      }

      // Listen for auth state changes
      authService.onAuthStateChange((session) => {
        if (session) {
          currentUser.value = session.user
          console.log('✅ User authenticated:', session.user.email)
        } else {
          currentUser.value = null
          console.log('🔐 User signed out')
        }
      })
    } catch (error) {
      console.error('❌ Error initializing auth:', error)
    }
  }
  
  const signOut = async () => {
    console.log('🔐 Signing out user...')
    
    try {
      await authService.signOut()
      currentUser.value = null
      console.log('✅ User signed out successfully')
    } catch (error) {
      console.error('❌ Error signing out:', error)
      throw error
    }
  }
  
  // Helper function to get document dimensions
  const getDocumentDimensions = async (): Promise<{ width: number; height: number }> => {
    if (!uploadedDocument.value) {
      throw new Error('No document available')
    }

    if (documentType.value === 'image') {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
        img.onerror = () => reject(new Error('Failed to load image dimensions'))
        img.src = documentPreviewUrl.value
      })
    } else if (documentType.value === 'pdf') {
      // For PDFs, we need to get the page dimensions
      const fileArrayBuffer = await uploadedDocument.value.arrayBuffer()
      const pdfDoc = await PDFDocument.load(fileArrayBuffer)
      const firstPage = pdfDoc.getPages()[0]
      const { width, height } = firstPage.getSize()
      return { width, height }
    }

    throw new Error('Unsupported document type')
  }

  // Helper function to build attestation data
  const buildAttestationData = (): AttestationData => {
    if (!authProvider.value || !userEmail.value) {
      throw new Error('Authentication data missing')
    }

    // TODO: Use actual document hashes and exclusion zone
    // For now, using placeholder values
    const placeholderExclusionZone = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      fillColor: '#FFFFFF',
    }

    return attestationBuilder.buildCompactAttestation({
      documentHashes: {
        cryptographic: 'placeholder-crypto-hash',
        pHash: 'placeholder-phash',
        dHash: 'placeholder-dhash',
      },
      identity: {
        provider: authProvider.value,
        identifier: userEmail.value,
      },
      serviceInfo: {
        publicKeyId: 'placeholder-key-id',
      },
      exclusionZone: placeholderExclusionZone,
    })
  }
  
  const sealPdfDocument = async (
    sealDataUrl: string, 
    position: { x: number; y: number }, 
    width: number,
    height: number,
  ) => {
    if (!uploadedDocument.value) {
      return
    }
    
    console.log('📄 Sealing PDF document...')
    
    // Read the PDF file
    const fileArrayBuffer = await uploadedDocument.value.arrayBuffer()
    const pdfDoc = await PDFDocument.load(fileArrayBuffer)
    
    // Convert seal image to PNG for embedding
    const sealImage = await pdfDoc.embedPng(sealDataUrl)
    
    // Add seal to the first page of the PDF
    const pages = pdfDoc.getPages()
    const firstPage = pages[0]
    
    // Use the exact position and dimensions of the complete seal
    firstPage.drawImage(sealImage, {
      x: position.x,
      y: position.y,
      width: width,
      height: height,
    })
    
    // Save the PDF
    const sealedPdfBytes = await pdfDoc.save()
    const sealedPdfBlob = new Blob([sealedPdfBytes], { type: 'application/pdf' })
    
    sealedDocumentBlob.value = sealedPdfBlob
    sealedDocumentUrl.value = URL.createObjectURL(sealedPdfBlob)
    
    console.log('✅ PDF sealing completed')
  }
  
  const sealImageDocument = async (
    sealDataUrl: string, 
    position: { x: number; y: number }, 
    width: number,
    height: number,
  ) => {
    if (!uploadedDocument.value) {
      return
    }
    
    console.log('🖼️ Sealing image document...')
    
    // Step 1: Convert to optimal format if needed
    console.log('🔄 Checking format conversion requirements...')
    const conversionResult = await formatConversionService.convertToOptimalFormat(uploadedDocument.value, false) // Default to WebP
    
    // Store conversion result for UI notification
    formatConversionResult.value = conversionResult
    if (conversionResult.wasConverted) {
      showFormatConversionNotification.value = true
      console.log('✅ Format converted:', {
        from: conversionResult.originalFormat,
        to: conversionResult.finalFormat,
        reason: conversionResult.conversionReason
      })
    }
    
    // Use the converted file for sealing
    const fileToSeal = conversionResult.file
    
    return new Promise<void>((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }
      
      img.onload = () => {
        // Set canvas dimensions to match the image
        canvas.width = img.width
        canvas.height = img.height
        
        // Draw the original image
        ctx.drawImage(img, 0, 0)
        
        // Load complete seal image
        const sealImg = new Image()
        sealImg.onload = () => {
          // Use the exact position and dimensions of the complete seal
          ctx.drawImage(sealImg, position.x, position.y, width, height)
          
          // Convert canvas to blob with optimal format
          const outputFormat = conversionResult.finalFormat
          const quality = outputFormat === 'image/webp' ? 1.0 : undefined // Lossless for WebP
          
          canvas.toBlob((blob) => {
            if (blob) {
              sealedDocumentBlob.value = blob
              sealedDocumentUrl.value = URL.createObjectURL(blob)
              console.log('✅ Image sealing completed')
              console.log('📊 Final sealed document:', {
                format: outputFormat,
                size: blob.size,
                dimensions: `${canvas.width}x${canvas.height}`
              })
              resolve()
            } else {
              reject(new Error('Failed to create image blob'))
            }
          }, outputFormat, quality)
        }
        
        sealImg.onerror = () => reject(new Error('Failed to load seal image'))
        sealImg.src = sealDataUrl
      }
      
      img.onerror = () => reject(new Error('Failed to load original image'))
      img.src = URL.createObjectURL(fileToSeal)
    })
  }
  
  const downloadSealedDocument = () => {
    if (!sealedDocumentUrl.value || !uploadedDocument.value) {
      return
    }
    
    const a = document.createElement('a')
    a.href = sealedDocumentUrl.value
    
    // Get the filename from the conversion result if available, otherwise use original
    let baseFileName: string
    let fileExtension: string
    
    if (formatConversionResult.value?.wasConverted) {
      // Use the converted file's name and extension
      const convertedName = formatConversionResult.value.file.name
      const dotIndex = convertedName.lastIndexOf('.')
      if (dotIndex !== -1) {
        baseFileName = convertedName.substring(0, dotIndex)
        fileExtension = convertedName.substring(dotIndex)
      } else {
        baseFileName = convertedName
        fileExtension = ''
      }
    } else {
      // Use original file name
      const originalName = uploadedDocument.value.name
      const dotIndex = originalName.lastIndexOf('.')
      if (dotIndex !== -1) {
        baseFileName = originalName.substring(0, dotIndex)
        fileExtension = originalName.substring(dotIndex)
      } else {
        baseFileName = originalName
        fileExtension = ''
      }
    }
    
    // Add 'sealed' suffix before extension
    const downloadName = `${baseFileName}-sealed${fileExtension}`
    
    a.download = downloadName
    a.click()
  }
  
  const reset = () => {
    console.log('🔄 Resetting document store...')
    
    // Clean up object URLs to prevent memory leaks
    if (documentPreviewUrl.value) {
      URL.revokeObjectURL(documentPreviewUrl.value)
    }
    if (sealedDocumentUrl.value) {
      URL.revokeObjectURL(sealedDocumentUrl.value)
    }
    
    // Reset state (but keep authentication)
    uploadedDocument.value = null
    documentType.value = null
    documentId.value = ''
    documentPreviewUrl.value = ''
    sealedDocumentUrl.value = ''
    sealedDocumentBlob.value = null
    formatConversionResult.value = null
    showFormatConversionNotification.value = false
    authError.value = null
    
    console.log('✅ Document store reset completed')
  }
  
  return { 
    // State
    uploadedDocument, 
    documentType,
    documentId,
    documentPreviewUrl,
    sealedDocumentUrl,
    currentUser,
    isAuthenticating,
    authError,
    formatConversionResult,
    showFormatConversionNotification,
    
    // Getters
    hasDocument,
    fileName,
    isAuthenticated,
    authProvider,
    userName,
    userEmail,
    currentAttestationData,
    
    // Actions
    setDocument,
    authenticateWith,
    sealDocument,
    downloadSealedDocument,
    initializeAuth,
    signOut,
    acknowledgeFormatConversion: () => {
      showFormatConversionNotification.value = false
    },
    reset,
  }
})