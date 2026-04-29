/**
 * Utility functions for neural mapping and model loading
 */

/**
 * Normalizes a URL to ensure it points to a raw file if it's from GitHub,
 * and handles common input errors.
 */
export function normalizeUrl(url: string): string {
  if (!url) return '';
  
  let processed = url.trim();
  
  // Handle GitHub links
  if (processed.includes('github.com')) {
    // Standard format: https://github.com/user/repo/blob/branch/path
    // Use jsdelivr for better reliability and CORS
    const githubRegex = /github\.com\/([^/]+)\/([^/]+)\/(blob|raw)\/([^/]+)\/(.+)/;
    const match = processed.match(githubRegex);
    
    if (match) {
      const [, user, repo, , branch, path] = match;
      return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`;
    }
    
    // Fallback simple replacement if regex doesn't match perfectly
    if (processed.includes('/blob/')) {
      processed = processed
        .replace('github.com', 'raw.githubusercontent.com')
        .replace('/blob/', '/');
    } else if (processed.includes('/raw/')) {
      processed = processed
        .replace('github.com', 'raw.githubusercontent.com')
        .replace('/raw/', '/');
    }
  }
  
  // Remove trailing slashes 
  processed = processed.replace(/[\\/]+$/, "");
  
  // Ensure protocol
  if (processed && !processed.startsWith('http') && !processed.startsWith('/') && !processed.startsWith('data:')) {
    processed = 'https://' + processed;
  }
  
  return processed;
}
