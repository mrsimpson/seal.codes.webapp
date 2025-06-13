# OAuth Provider Setup Instructions

## The Issue
The error "Unsupported provider: provider is not enabled" means that GitHub OAuth is not configured in your Supabase project.

## Steps to Fix

### 1. Enable GitHub OAuth in Supabase Dashboard

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `seal-codes`
3. Navigate to **Authentication** → **Providers**
4. Find **GitHub** in the list of providers
5. Toggle it to **Enabled**

### 2. Configure GitHub OAuth Application

You need to create a GitHub OAuth app and get the credentials:

#### Create GitHub OAuth App:
1. Go to GitHub Settings: https://github.com/settings/developers
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in the details:
   - **Application name**: `seal.codes Development`
   - **Homepage URL**: `https://your-webcontainer-url.webcontainer-api.io`
   - **Authorization callback URL**: `https://ciabpodgryewgkhxepwb.supabase.co/auth/v1/callback`
4. Click **Register application**
5. Copy the **Client ID** and generate a **Client Secret**

#### Configure in Supabase:
1. Back in Supabase Dashboard → Authentication → Providers → GitHub
2. Enter your GitHub **Client ID**
3. Enter your GitHub **Client Secret**
4. Set **Redirect URL** to: `https://ciabpodgryewgkhxepwb.supabase.co/auth/v1/callback`
5. Click **Save**

### 3. Update Site URL Configuration

In Supabase Dashboard → Authentication → URL Configuration:

1. **Site URL**: Set to your current WebContainer URL:
   ```
   https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3-f3a5rti9--5173--858c0e43.local-credentialless.webcontainer-api.io
   ```

2. **Redirect URLs**: Add your document page URL:
   ```
   https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3-f3a5rti9--5173--858c0e43.local-credentialless.webcontainer-api.io/document
   ```

### 4. Optional: Enable Google OAuth

If you also want Google authentication:

1. Follow similar steps for Google OAuth
2. Create a Google Cloud Console project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Configure in Supabase

### 5. Test the Configuration

After completing the setup:
1. Restart your development server
2. Try the GitHub authentication again
3. You should be redirected to GitHub for authorization
4. After approval, you'll be redirected back to your app

## Important Notes

- The WebContainer URL changes each time you restart the environment
- You'll need to update the Site URL and Redirect URLs in Supabase when this happens
- For production, use your actual domain name
- Keep your OAuth credentials secure and never commit them to version control

## Troubleshooting

If you still get errors:
1. Check that the GitHub OAuth app callback URL matches Supabase exactly
2. Verify that the Site URL in Supabase matches your current WebContainer URL
3. Make sure both Client ID and Client Secret are correctly entered
4. Try clearing your browser cache and cookies