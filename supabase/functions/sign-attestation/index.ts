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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify the user's session
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse the attestation package
    const attestationPackage: AttestationPackage = await req.json()

    // Validate that the identity in the package matches the authenticated user
    const userEmail = user.email
    const userProvider = user.app_metadata?.provider || 'unknown'

    if (attestationPackage.identity.identifier !== userEmail) {
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

    // Get the private key from environment
    const privateKeyPem = Deno.env.get('ATTESTATION_PRIVATE_KEY')
    if (!privateKeyPem) {
      console.error('ATTESTATION_PRIVATE_KEY environment variable not set')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Import the private key
    const privateKeyData = privateKeyPem
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '')

    const privateKeyBytes = Uint8Array.from(atob(privateKeyData), c => c.charCodeAt(0))
    
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyBytes,
      {
        name: 'Ed25519',
      },
      false,
      ['sign']
    )

    // Create the data to sign (JSON string of the complete package)
    const dataToSign = JSON.stringify(packageToSign)
    const encoder = new TextEncoder()
    const dataBytes = encoder.encode(dataToSign)

    // Sign the data
    const signatureBytes = await crypto.subtle.sign(
      'Ed25519',
      privateKey,
      dataBytes
    )

    // Convert signature to base64
    const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))

    // Generate the public key from the private key for verification
    // For Ed25519, we need to extract the public key from the private key
    // This is a simplified approach - in production, store the public key separately
    const publicKeyBytes = privateKeyBytes.slice(-32) // Last 32 bytes for Ed25519
    const publicKey = btoa(String.fromCharCode(...publicKeyBytes))

    const response: SigningResponse = {
      timestamp,
      signature,
      publicKey,
      publicKeyId
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in sign-attestation function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})