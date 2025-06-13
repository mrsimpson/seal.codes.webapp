import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface AttestationPackage {
  hashes: {
    cryptographic: string;
    pHash: string;
    dHash: string;
  };
  identity: {
    provider: string;
    identifier: string;
  };
  exclusionZone: {
    x: number;
    y: number;
    width: number;
    height: number;
    fillColor: string;
  };
  userUrl?: string;
  // Server will add these fields:
  timestamp?: string;
  serviceInfo?: {
    publicKeyId: string;
  };
}

interface SigningResponse {
  timestamp: string;
  signature: string;
  publicKey: string;
  publicKeyId: string;
}

serve(async (req) => {
  console.log(`🔧 Edge Function called: ${req.method} ${req.url}`)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request')
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    console.log(`❌ Method not allowed: ${req.method}`)
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    console.log('🔐 Starting attestation signing process...')
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    console.log('📋 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnonKey: !!supabaseAnonKey,
      hasPrivateKey: !!Deno.env.get('ATTESTATION_PRIVATE_KEY')
    })
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing Supabase configuration' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('❌ Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🔍 Verifying user authentication...')
    
    // Verify the user's session
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ User authenticated:', user.email)

    // Parse the attestation package
    const attestationPackage: AttestationPackage = await req.json()
    console.log('📦 Received attestation package:', {
      provider: attestationPackage.identity.provider,
      identifier: attestationPackage.identity.identifier,
      hasHashes: !!attestationPackage.hashes,
      hasExclusionZone: !!attestationPackage.exclusionZone
    })

    // Validate that the identity in the package matches the authenticated user
    const userEmail = user.email
    const userProvider = user.app_metadata?.provider || 'unknown'

    console.log('🔍 Validating identity match:', {
      userEmail,
      userProvider,
      packageEmail: attestationPackage.identity.identifier,
      packageProvider: attestationPackage.identity.provider
    })

    if (attestationPackage.identity.identifier !== userEmail) {
      console.error('❌ Identity mismatch: email')
      return new Response(
        JSON.stringify({ 
          error: 'Identity mismatch: attestation package identity does not match authenticated user' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (attestationPackage.identity.provider !== userProvider) {
      console.error('❌ Identity mismatch: provider')
      return new Response(
        JSON.stringify({ 
          error: 'Provider mismatch: attestation package provider does not match authenticated user' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ Identity validation passed')

    // Add server timestamp and public key ID
    const timestamp = new Date().toISOString()
    const publicKeyId = "mvp-key-2024"
    
    const packageToSign = {
      ...attestationPackage,
      timestamp,
      serviceInfo: {
        publicKeyId
      }
    }

    console.log('📝 Package prepared for signing with timestamp:', timestamp)

    // Get the private key from environment
    const privateKeyPem = Deno.env.get('ATTESTATION_PRIVATE_KEY')
    if (!privateKeyPem) {
      console.error('❌ ATTESTATION_PRIVATE_KEY environment variable not set')
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error: Missing signing key',
          details: 'The server is not properly configured for signing operations'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🔑 Private key found, preparing for signing...')

    // For MVP: Use a simple mock signature instead of real cryptographic signing
    // This allows us to test the flow without setting up complex key management
    console.log('⚠️ Using mock signature for MVP - not cryptographically secure!')
    
    const dataToSign = JSON.stringify(packageToSign)
    const mockSignature = btoa(`mock-signature-${timestamp}-${userEmail}`)
    const mockPublicKey = btoa(`mock-public-key-${publicKeyId}`)

    console.log('✅ Mock signature generated')

    const response: SigningResponse = {
      timestamp,
      signature: mockSignature,
      publicKey: mockPublicKey,
      publicKeyId
    }

    console.log('🎉 Signing completed successfully')

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('💥 Error in sign-attestation function:', error)
    
    // Provide more detailed error information
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: errorDetails.message,
        timestamp: errorDetails.timestamp
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})