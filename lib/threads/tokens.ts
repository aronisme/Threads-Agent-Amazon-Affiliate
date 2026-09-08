/**
 * Meta Threads Long-Lived Token Refresher
 * Refresh tokens every 30-45 days to maintain perpetual access.
 */

export interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  expiresIn?: number;
  error?: string;
}

export async function refreshThreadsToken(currentToken?: string): Promise<TokenRefreshResult> {
  const token = currentToken || process.env.THREADS_ACCESS_TOKEN;

  if (!token || token.startsWith('mock_')) {
    return {
      success: true,
      accessToken: token || 'mock_token',
      expiresIn: 5184000, // 60 days
    };
  }

  try {
    const url = `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.error?.message || `Failed to refresh Threads token: HTTP ${res.status}`);
    }

    return {
      success: true,
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  } catch (err: any) {
    console.error('❌ Threads Token Refresh Error:', err);
    return {
      success: false,
      error: err.message || 'Unknown error refreshing token',
    };
  }
}
