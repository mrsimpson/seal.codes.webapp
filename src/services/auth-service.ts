/**
 * Authentication service for seal.codes
 * Handles OAuth authentication using Supabase
 */

import { supabase } from './supabase-client'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import type { Provider } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  provider: string
  displayName: string
  avatarUrl?: string
}

export interface AuthSession {
  user: AuthUser
  accessToken: string
  expiresAt: number
}

/**
 * Custom error class for OAuth provider configuration issues
 */
export class OAuthProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public isConfigurationError: boolean = false
  ) {
    super(message)
    this.name = 'OAuthProviderError'
  }
}

/**
 * Authentication service class
 */
export class AuthService {
  /**
   * Sign in with OAuth provider
   * 
   * @param provider - OAuth provider (google, github, etc.)
   * @returns Promise that resolves when sign-in is initiated
   */
  async signInWithProvider(provider: string): Promise<{ error?: AuthError | OAuthProviderError }> {
    try {
      console.log(`🔐 Initiating OAuth sign-in with ${provider}`)
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as Provider,
        options: {
          redirectTo: `${window.location.origin}/document`,
        },
      })

      if (error) {
        console.error('OAuth sign-in error:', error)
        
        // Check if this is a provider configuration error
        if (error.message?.includes('provider is not enabled') || 
            error.message?.includes('Unsupported provider')) {
          return { 
            error: new OAuthProviderError(
              `${provider} authentication is not yet configured. This app is in active development and more providers will be added soon.`,
              provider,
              true
            )
          }
        }
        
        return { error }
      }

      console.log(`✅ OAuth sign-in initiated for ${provider}`)
      return {}
    } catch (error) {
      console.error('Unexpected error during OAuth sign-in:', error)
      
      // Check if this looks like a configuration error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage.includes('provider') || errorMessage.includes('not enabled')) {
        return { 
          error: new OAuthProviderError(
            `${provider} authentication is not yet configured. This app is in active development and more providers will be added soon.`,
            provider,
            true
          )
        }
      }
      
      return { 
        error: { 
          message: errorMessage,
          name: 'UnknownError',
          status: 500
        } as AuthError 
      }
    }
  }

  /**
   * Get current session
   * 
   * @returns Current session or null if not authenticated
   */
  async getSession(): Promise<AuthSession | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
        return null
      }

      if (!session) {
        return null
      }

      return this.transformSession(session)
    } catch (error) {
      console.error('Unexpected error getting session:', error)
      return null
    }
  }

  /**
   * Get current user
   * 
   * @returns Current user or null if not authenticated
   */
  async getUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error('Error getting user:', error)
        return null
      }

      if (!user) {
        return null
      }

      return this.transformUser(user)
    } catch (error) {
      console.error('Unexpected error getting user:', error)
      return null
    }
  }

  /**
   * Sign out current user
   * 
   * @returns Promise that resolves when sign-out is complete
   */
  async signOut(): Promise<{ error?: AuthError }> {
    try {
      console.log('🔐 Signing out user')
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Sign-out error:', error)
        return { error }
      }

      console.log('✅ User signed out successfully')
      return {}
    } catch (error) {
      console.error('Unexpected error during sign-out:', error)
      return { 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          name: 'UnknownError',
          status: 500
        } as AuthError 
      }
    }
  }

  /**
   * Listen for authentication state changes
   * 
   * @param callback - Callback function to handle auth state changes
   * @returns Unsubscribe function
   */
  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`🔐 Auth state changed: ${event}`)
        
        if (session) {
          const transformedSession = this.transformSession(session)
          callback(transformedSession)
        } else {
          callback(null)
        }
      }
    )

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe()
    }
  }

  /**
   * Get access token for API calls
   * 
   * @returns Access token or null if not authenticated
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token || null
    } catch (error) {
      console.error('Error getting access token:', error)
      return null
    }
  }

  /**
   * Transform Supabase user to our AuthUser format
   */
  private transformUser(user: User): AuthUser {
    const provider = user.app_metadata?.provider || 'unknown'
    const displayName = user.user_metadata?.full_name || 
                       user.user_metadata?.name || 
                       user.email?.split('@')[0] || 
                       'User'

    return {
      id: user.id,
      email: user.email || '',
      provider,
      displayName,
      avatarUrl: user.user_metadata?.avatar_url,
    }
  }

  /**
   * Transform Supabase session to our AuthSession format
   */
  private transformSession(session: Session): AuthSession {
    return {
      user: this.transformUser(session.user),
      accessToken: session.access_token,
      expiresAt: session.expires_at || 0,
    }
  }
}

/**
 * Default auth service instance
 */
export const authService = new AuthService()