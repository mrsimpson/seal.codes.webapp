import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface AttestationData {
  h: {
    c: string;
    p: {
      p: string;
      d: string;
    };
  };
  t: string;
  i: {
    p: string;
    id: string;
  };
  s: {
    n: string;
    k: string;
  };
  e: {
    x: number;
    y: number;
    w: number;
    h: number;
    f: string;
  };
  sig?: string;
  u?: string;
}

interface VerificationRequest {
  attestationData: AttestationData;
}

interface SignatureVerificationResult {
  isValid: boolean;
  publicKeyId: string;
  timestamp: string;
  identity: {
    provider: string;
    identifier: string;
  };
  error?: string;
  details?: {
    keyFound: boolean;
    signatureMatch: boolean;
    timestampValid: boolean;
  };
}

interface SigningKey {
  key_id: string;
  public_key: string;
  algorithm: string;
  created_at: string;
  expires_at?: string;
}

serve(async (req) => {
  console.log(`🔧 Verify Signature Function called: ${req.method} ${req.url}`)
  
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  try {
    console.log('🔍 Starting signature verification process...')
    
    // Initialize Supabase client with service role for database access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('📋 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
    })
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing Supabase configuration' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }
    
    // Create client for database operations (using service role)
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

    // Parse the verification request
    const verificationRequest: VerificationRequest = await req.json()
    const { attestationData } = verificationRequest
    
    console.log('📦 Received verification request:', {
      publicKeyId: attestationData.s.k,
      timestamp: attestationData.t,
      hasSignature: !!attestationData.sig,
      provider: attestationData.i.p,
      identifier: attestationData.i.id,
    })

    // Validate required fields
    if (!attestationData.sig) {
      console.log('❌ No signature found in attestation data')
      return new Response(
        JSON.stringify({
          isValid: false,
          publicKeyId: attestationData.s.k,
          timestamp: attestationData.t,
          identity: {
            provider: attestationData.i.p,
            identifier: attestationData.i.id,
          },
          error: 'No signature found in attestation data',
        } as SignatureVerificationResult),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!attestationData.s.k) {
      console.log('❌ No public key ID found in attestation data')
      return new Response(
        JSON.stringify({
          isValid: false,
          publicKeyId: '',
          timestamp: attestationData.t,
          identity: {
            provider: attestationData.i.p,
            identifier: attestationData.i.id,
          },
          error: 'No public key ID found in attestation data',
        } as SignatureVerificationResult),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Get the public key from database using the key ID
    console.log('🔑 Retrieving public key from database...')
    
    const { data: keyData, error: keyError } = await supabaseService
      .from('signing_keys')
      .select('key_id, public_key, algorithm, created_at, expires_at')
      .eq('id', attestationData.s.k)
      .single()
    
    if (keyError || !keyData) {
      console.error('❌ Failed to retrieve public key:', keyError)
      return new Response(
        JSON.stringify({
          isValid: false,
          publicKeyId: attestationData.s.k,
          timestamp: attestationData.t,
          identity: {
            provider: attestationData.i.p,
            identifier: attestationData.i.id,
          },
          error: `Public key not found: ${attestationData.s.k}`,
          details: {
            keyFound: false,
            signatureMatch: false,
            timestampValid: false,
          },
        } as SignatureVerificationResult),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const signingKey: SigningKey = keyData
    console.log('✅ Retrieved public key:', {
      keyId: signingKey.key_id,
      algorithm: signingKey.algorithm,
      hasPublicKey: !!signingKey.public_key,
    })

    // Check if the key was valid at the time of signing
    const attestationTime = new Date(attestationData.t)
    const keyCreatedAt = new Date(signingKey.created_at)
    const keyExpiresAt = signingKey.expires_at ? new Date(signingKey.expires_at) : null
    
    const timestampValid = attestationTime >= keyCreatedAt && 
                          (!keyExpiresAt || attestationTime <= keyExpiresAt)
    
    if (!timestampValid) {
      console.error('❌ Key was not valid at attestation time:', {
        attestationTime: attestationData.t,
        keyCreatedAt: signingKey.created_at,
        keyExpiresAt: signingKey.expires_at,
      })
      return new Response(
        JSON.stringify({
          isValid: false,
          publicKeyId: attestationData.s.k,
          timestamp: attestationData.t,
          identity: {
            provider: attestationData.i.p,
            identifier: attestationData.i.id,
          },
          error: 'Public key was not valid at the time of attestation',
          details: {
            keyFound: true,
            signatureMatch: false,
            timestampValid: false,
          },
        } as SignatureVerificationResult),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Reconstruct the data that was signed (same as in sign-attestation)
    const packageToVerify = {
      hashes: {
        cryptographic: attestationData.h.c,
        pHash: attestationData.h.p.p,
        dHash: attestationData.h.p.d,
      },
      identity: {
        provider: attestationData.i.p,
        identifier: attestationData.i.id,
      },
      exclusionZone: {
        x: attestationData.e.x,
        y: attestationData.e.y,
        width: attestationData.e.w,
        height: attestationData.e.h,
        fillColor: `#${attestationData.e.f}`,
      },
      timestamp: attestationData.t,
      serviceInfo: {
        publicKeyId: attestationData.s.k,
      },
      ...(attestationData.u && { userUrl: attestationData.u }),
    }

    const dataToVerify = JSON.stringify(packageToVerify)
    const encoder = new TextEncoder()
    const dataBytes = encoder.encode(dataToVerify)

    console.log('🔐 Verifying signature with Ed25519...')

    try {
      // Parse the public key from PEM format
      const publicKeyPem = signingKey.public_key
      const publicKeyData = publicKeyPem
        .replace('-----BEGIN PUBLIC KEY-----', '')
        .replace('-----END PUBLIC KEY-----', '')
        .replace(/\s/g, '')

      const publicKeyBytes = Uint8Array.from(atob(publicKeyData), c => c.charCodeAt(0))
      
      // Import the public key for verification
      const publicKey = await crypto.subtle.importKey(
        'spki',
        publicKeyBytes,
        {
          name: 'Ed25519',
        },
        false,
        ['verify'],
      )

      // Convert signature from base64
      const signatureBytes = Uint8Array.from(atob(attestationData.sig), c => c.charCodeAt(0))

      // Verify the signature
      const signatureValid = await crypto.subtle.verify(
        'Ed25519',
        publicKey,
        signatureBytes,
        dataBytes,
      )

      console.log('✅ Signature verification completed:', { signatureValid })

      const result: SignatureVerificationResult = {
        isValid: signatureValid,
        publicKeyId: attestationData.s.k,
        timestamp: attestationData.t,
        identity: {
          provider: attestationData.i.p,
          identifier: attestationData.i.id,
        },
        details: {
          keyFound: true,
          signatureMatch: signatureValid,
          timestampValid: true,
        },
      }

      if (!signatureValid) {
        result.error = 'Signature verification failed'
      }

      console.log('🎉 Signature verification completed successfully')

      return new Response(
        JSON.stringify(result),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )

    } catch (cryptoError) {
      console.error('❌ Cryptographic verification failed:', cryptoError)
      
      return new Response(
        JSON.stringify({
          isValid: false,
          publicKeyId: attestationData.s.k,
          timestamp: attestationData.t,
          identity: {
            provider: attestationData.i.p,
            identifier: attestationData.i.id,
          },
          error: 'Cryptographic verification failed',
          details: {
            keyFound: true,
            signatureMatch: false,
            timestampValid: true,
          },
        } as SignatureVerificationResult),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

  } catch (error) {
    console.error('💥 Error in verify-signature function:', error)
    
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: errorDetails.message,
        timestamp: errorDetails.timestamp,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})