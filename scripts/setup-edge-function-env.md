# Setting up Edge Function Environment Variables

## For MVP/Testing (Mock Signing)

To get the signing service working for testing, you need to set the `ATTESTATION_PRIVATE_KEY` environment variable in your Supabase project.

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions**
3. Add a new environment variable:
   - **Name**: `ATTESTATION_PRIVATE_KEY`
   - **Value**: `mock-key-for-mvp-testing`

### Option 2: Using Supabase CLI

```bash
# Set the environment variable for Edge Functions
supabase secrets set ATTESTATION_PRIVATE_KEY="mock-key-for-mvp-testing"
```

### Option 3: Using the .env file (for local development)

1. Copy `.env.example` to `.env`
2. Set the value:
   ```
   ATTESTATION_PRIVATE_KEY="mock-key-for-mvp-testing"
   ```

## For Production (Real Cryptographic Signing)

For production, you'll need a real Ed25519 private key. Here's how to generate one:

```bash
# Generate Ed25519 key pair
openssl genpkey -algorithm Ed25519 -out private_key.pem
openssl pkey -in private_key.pem -pubout -out public_key.pem

# Set the private key as environment variable
supabase secrets set ATTESTATION_PRIVATE_KEY="$(cat private_key.pem)"
```

**Important**: 
- Never commit real private keys to version control
- Store private keys securely (use a key management service in production)
- The current implementation uses mock signatures for MVP testing

## Verifying the Setup

After setting the environment variable, test the signing service:

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/sign-attestation' \
  -H 'Authorization: Bearer your-jwt-token' \
  -H 'Content-Type: application/json' \
  -d '{"hashes":{"cryptographic":"test","pHash":"test","dHash":"test"},"identity":{"provider":"github","identifier":"test@example.com"},"exclusionZone":{"x":0,"y":0,"width":100,"height":100,"fillColor":"#FFFFFF"}}'
```

You should get a successful response with mock signature data.