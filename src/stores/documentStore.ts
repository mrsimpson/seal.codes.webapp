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
import { CodedError } from '@/types/errors'
import type { QRCodeUIPosition, AttestationData } from '@/types/qrcode'

// Unique ID generation for documents
const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

// Helper functions for document persistence
const saveDocumentToStorage = async (file: File): Promise<void> => {
  try {
    // Convert file to base64 for storage
    const arrayBuffer = await file.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    
    const documentData = {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      data: base64,
      timestamp: Date.now(),
    }
    
    localStorage.setItem('seal-codes-document-data', JSON.stringify(documentData))
    console.log('💾 Document saved to localStorage:', file.name, 'Size:', file.size)
  } catch (error) {
    console.error('❌ Failed to save document to storage:', error)
    // Don't throw - this is not critical for the main flow
  }
}

const loadDocumentFromStorage = (): File | null => {
  try {
    const documentDataJson = localStorage.getItem('seal-codes-document-data')
    if (!documentDataJson) {
      return null
    }
    
    const documentData = JSON.parse(documentDataJson)
    
    // Check if data is not too old (24 hours max)
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    if (Date.now() - documentData.timestamp > maxAge) {
      console.log('📅 Stored document data is too old, removing...')
      localStorage.removeItem('seal-codes-document-data')
      return null
    }
    
    // Convert base64 back to File
    const binaryString = atob(documentData.data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    const file = new File([bytes], documentData.name, {
      type: documentData.type,
      lastModified: documentData.lastModified,
    })
    
    console.log('📥 Document loaded from localStorage:', file.name, 'Size:', file.size)
    return file
  } catch (error) {
    console.error('❌ Failed to load document from storage:', error)
    localStorage.removeItem('seal-codes-document-data')
    return null
  }
}

const clearDocumentFromStorage = () => {
  localStorage.removeItem('seal-codes-document-data')
  console.log('🗑️ Document data cleared from localStorage')
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
  
  // QR positioning state - persisted through OAuth flow
  const qrPosition = ref<QRCodeUIPosition>({ x: 85, y: 15 })
  const qrSizePercent = ref<number>(20)
  
  // OAuth flow state
  const pendingAuthentication = ref<string | null>(null) // Provider being authenticated
  const shouldSealAfterAuth = ref<boolean>(false) // Flag to seal after auth
  const isProcessingPostAuth = ref<boolean>(false) // Flag for post-auth processing
  
  // Format conversion state
  const formatConversionResult = ref<FormatConversionResult | null>(null)
  const showFormatConversionNotification = ref(false)
  
  // Store initialization flag
  const isInitialized = ref(false)
  
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
  
  // Initialize store state from localStorage if needed
  const initializeStore = () => {
    if (isInitialized.value) {
      return
    }
    
    console.log('🔄 Initializing document store...')
    
    // Try to restore document from localStorage
    const restoredDocument = loadDocumentFromStorage()
    if (restoredDocument) {
      console.log('📥 Restoring document from localStorage:', restoredDocument.name)
      
      uploadedDocument.value = restoredDocument
      
      // Determine document type
      if (restoredDocument.type === 'application/pdf') {
        documentType.value = 'pdf'
      } else if (restoredDocument.type.startsWith('image/')) {
        documentType.value = 'image'
      }
      
      // Create preview URL
      documentPreviewUrl.value = URL.createObjectURL(restoredDocument)
      
      console.log('✅ Document restored successfully')
    }
    
    // Try to restore OAuth state
    const savedStateJson = localStorage.getItem('seal-codes-oauth-state')
    if (savedStateJson) {
      try {
        const savedState = JSON.parse(savedStateJson)
        console.log('📥 Restoring OAuth state:', savedState)
        
        // Restore QR positioning
        if (savedState.qrPosition) {
          qrPosition.value = savedState.qrPosition
        }
        if (savedState.qrSizePercent) {
          qrSizePercent.value = savedState.qrSizePercent
        }
        
        // Set flags for post-auth processing
        if (savedState.shouldSeal) {
          shouldSealAfterAuth.value = true
        }
        
        console.log('✅ OAuth state restored')
      } catch (error) {
        console.error('❌ Failed to restore OAuth state:', error)
        localStorage.removeItem('seal-codes-oauth-state')
      }
    }
    
    isInitialized.value = true
    console.log('✅ Store initialization completed')
  }
  
  // Actions
  const setDocument = async (file: File) => {
    console.log('📄 Setting document in store:', file.name, file.type)
    
    try {
      uploadedDocument.value = file
      
      // Determine document type
      if (file.type === 'application/pdf') {
        documentType.value = 'pdf'
      } else if (file.type.startsWith('image/')) {
        documentType.value = 'image'
      } else {
        throw new CodedError('unsupported_format', 'Unsupported file type')
      }
      
      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        throw new CodedError('file_too_large', 'File is too large')
      }
      
      // Create a preview URL
      documentPreviewUrl.value = URL.createObjectURL(file)
      
      // Save document to localStorage for OAuth persistence
      await saveDocumentToStorage(file)
      
      console.log('✅ Document set successfully:', {
        name: file.name,
        type: documentType.value,
        size: file.size,
        previewUrl: documentPreviewUrl.value,
      })
    } catch (error) {
      if (error instanceof CodedError) {
        throw error
      }
      throw new CodedError('document_load_failed', 'Failed to load document')
    }
  }
  
  const updateQRPosition = (position: QRCodeUIPosition) => {
    qrPosition.value = position
    console.log('📍 QR position updated:', position)
  }
  
  const updateQRSize = (size: number) => {
    qrSizePercent.value = size
    console.log('📏 QR size updated:', size)
  }
  
  const authenticateWith = async (provider: string) => {
    console.log('🔐 Starting authentication with provider:', provider)
    
    isAuthenticating.value = true
    authError.value = null
    pendingAuthentication.value = provider
    shouldSealAfterAuth.value = hasDocument.value // Only seal if we have a document
    
    try {
      // Save current state to localStorage for persistence through OAuth redirect
      if (hasDocument.value) {
        const stateToSave = {
          qrPosition: qrPosition.value,
          qrSizePercent: qrSizePercent.value,
          shouldSeal: true,
          timestamp: Date.now(),
          documentName: uploadedDocument.value?.name,
          documentType: documentType.value,
          documentSize: uploadedDocument.value?.size,
        }
        localStorage.setItem('seal-codes-oauth-state', JSON.stringify(stateToSave))
        console.log('💾 Saved OAuth state to localStorage:', stateToSave)
      }
      
      // Initiate OAuth sign-in - this will redirect the user
      await authService.signInWithProvider(provider)
      
      console.log('✅ OAuth sign-in initiated, user will be redirected')
      
    } catch (error) {
      console.error('❌ Authentication failed:', error)
      
      // Clean up state on error
      pendingAuthentication.value = null
      shouldSealAfterAuth.value = false
      localStorage.removeItem('seal-codes-oauth-state')
      clearDocumentFromStorage()
      
      // Re-throw coded errors for the component to handle
      if (error instanceof OAuthProviderError || error instanceof CodedError) {
        throw error
      }
      
      // Handle Error objects with specific messages
      if (error instanceof Error) {
        const message = error.message
        if (message === 'network_error' || message === 'authentication_failed' || message === 'unknown_error') {
          throw new CodedError(message as any, message)
        }
      }
      
      // Default error
      authError.value = error instanceof Error ? error.message : 'Authentication failed'
      throw new CodedError('authentication_failed', 'Authentication failed')
    } finally {
      isAuthenticating.value = false
    }
  }
  
  const handleAuthenticationSuccess = async (): Promise<string | null> => {
    console.log('🎉 Authentication successful, checking for pending seal operation...')
    
    // Prevent multiple simultaneous processing
    if (isProcessingPostAuth.value) {
      console.log('⏳ Already processing post-auth, skipping...')
      return null
    }
    
    isProcessingPostAuth.value = true
    
    try {
      // Initialize store state if not already done
      initializeStore()
      
      // Check if we have saved OAuth state
      const savedStateJson = localStorage.getItem('seal-codes-oauth-state')
      if (savedStateJson) {
        const savedState = JSON.parse(savedStateJson)
        console.log('📥 Restored OAuth state from localStorage:', savedState)
        
        // Restore QR positioning
        if (savedState.qrPosition) {
          qrPosition.value = savedState.qrPosition
        }
        if (savedState.qrSizePercent) {
          qrSizePercent.value = savedState.qrSizePercent
        }
        
        // Check if we should seal the document
        if (savedState.shouldSeal && hasDocument.value && isAuthenticated.value) {
          console.log('🔒 Auto-sealing document after authentication...')
          
          // Clean up saved state first
          localStorage.removeItem('seal-codes-oauth-state')
          
          // Small delay to ensure UI is ready
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Trigger document sealing
          const documentId = await sealDocument(qrPosition.value, qrSizePercent.value)
          
          // Clean up document storage after successful sealing
          clearDocumentFromStorage()
          
          // Reset pending state
          pendingAuthentication.value = null
          shouldSealAfterAuth.value = false
          
          return documentId
        }
        
        // Clean up saved state even if we don't seal
        localStorage.removeItem('seal-codes-oauth-state')
      }
      
      // Reset pending state
      pendingAuthentication.value = null
      shouldSealAfterAuth.value = false
      
    } catch (error) {
      console.error('❌ Error handling authentication success:', error)
      localStorage.removeItem('seal-codes-oauth-state')
      clearDocumentFromStorage()
      
      // Reset state on error
      pendingAuthentication.value = null
      shouldSealAfterAuth.value = false
      
      throw error
    } finally {
      isProcessingPostAuth.value = false
    }
    
    return null
  }
  
  const sealDocument = async (position: QRCodeUIPosition, sizePercent: number = 20) => {
    if (!uploadedDocument.value || !isAuthenticated.value || !currentUser.value) {
      throw new CodedError('document_seal_failed', 'Document or authentication missing')
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
      
      if (error instanceof CodedError) {
        throw error
      }
      
      throw new CodedError('document_seal_failed', 'Failed to seal document')
    }
  }
  
  // Initialize authentication state
  const initializeAuth = async () => {
    console.log('🔐 Initializing authentication state...')
    
    // Initialize store first
    initializeStore()
    
    try {
      // Get current session
      const session = await authService.getSession()
      if (session) {
        currentUser.value = session.user
        console.log('✅ User already authenticated:', session.user.email)
        
        // Check if we need to handle post-OAuth sealing
        const documentId = await handleAuthenticationSuccess()
        if (documentId) {
          console.log('🎯 Post-auth sealing completed, document ID:', documentId)
        }
      }

      // Listen for auth state changes
      authService.onAuthStateChange(async (session) => {
        if (session) {
          currentUser.value = session.user
          console.log('✅ User authenticated:', session.user.email)
          
          // Handle post-OAuth sealing
          const documentId = await handleAuthenticationSuccess()
          if (documentId) {
            console.log('🎯 Post-auth sealing completed, document ID:', documentId)
          }
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
      throw new CodedError('document_processing_failed', 'No document available')
    }

    if (documentType.value === 'image') {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
        img.onerror = () => reject(new CodedError('document_processing_failed', 'Failed to load image dimensions'))
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

    throw new CodedError('unsupported_format', 'Unsupported document type')
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
        reject(new CodedError('document_processing_failed', 'Could not get canvas context'))
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
              reject(new CodedError('document_processing_failed', 'Failed to create image blob'))
            }
          }, outputFormat, quality)
        }
        
        sealImg.onerror = () => reject(new CodedError('document_processing_failed', 'Failed to load seal image'))
        sealImg.src = sealDataUrl
      }
      
      img.onerror = () => reject(new CodedError('document_processing_failed', 'Failed to load original image'))
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
    
    // Reset QR positioning to defaults
    qrPosition.value = { x: 85, y: 15 }
    qrSizePercent.value = 20
    
    // Reset OAuth flow state
    pendingAuthentication.value = null
    shouldSealAfterAuth.value = false
    isProcessingPostAuth.value = false
    
    // Clean up any saved OAuth state and document data
    localStorage.removeItem('seal-codes-oauth-state')
    clearDocumentFromStorage()
    
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
    qrPosition,
    qrSizePercent,
    pendingAuthentication,
    shouldSealAfterAuth,
    isProcessingPostAuth,
    
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
    updateQRPosition,
    updateQRSize,
    authenticateWith,
    handleAuthenticationSuccess,
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