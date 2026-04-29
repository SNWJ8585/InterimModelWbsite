/**
 * Utility functions for neural mapping and model loading
 */

/**
 * Normalizes a URL for model loading.
 *
 * Notes:
 * - Mainland networks often block `raw.githubusercontent.com`. When a GitHub URL is detected,
 *   we prefer the jsDelivr GitHub CDN URL (`cdn.jsdelivr.net`) which is more likely to work
 *   without a VPN.
 * - For best reliability, host models on the same origin (e.g. `/models/...`) whenever possible.
 */
export function normalizeUrl(url: string): string {
  if (!url) return '';
  
  let processed = url.trim();

  // If someone pasted a GitHub URL pointing to this project's `public/models/...`,
  // prefer the same-origin static path. This avoids blocked CDNs on some devices/networks.
  // Examples:
  // - https://raw.githubusercontent.com/<u>/<r>/<b>/public/models/X.fbx
  // - https://github.com/<u>/<r>/blob/<b>/public/models/X.fbx
  const publicModelsMatch = processed.match(/\/public\/models\/([^/?#]+)$/);
  if (publicModelsMatch) {
    return `/models/${publicModelsMatch[1]}`;
  }

  // Handle GitHub links
  if (processed.includes('github.com')) {
    // Standard format: https://github.com/user/repo/blob/branch/path
    // Prefer jsDelivr over raw.githubusercontent.com.
    const githubRegex = /github\.com\/([^/]+)\/([^/]+)\/(blob|raw)\/([^/]+)\/(.+)/;
    const match = processed.match(githubRegex);
    
    if (match) {
      const [, user, repo, , branch, path] = match;
      return `https://cdn.jsdelivr.net/gh/${user}/${repo}@${branch}/${path}`;
    }
    
    // Fallback: try to convert to a jsDelivr gh URL even if the path is slightly different.
    const fallbackMatch = processed.match(/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/);
    if (fallbackMatch) {
      const [, user, repo, branch, path] = fallbackMatch;
      return `https://cdn.jsdelivr.net/gh/${user}/${repo}@${branch}/${path}`;
    }
  }

  // Handle raw.githubusercontent.com links (convert to jsDelivr GitHub CDN).
  const rawMatch = processed.match(/^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
  if (rawMatch) {
    const [, user, repo, branch, path] = rawMatch;
    return `https://cdn.jsdelivr.net/gh/${user}/${repo}@${branch}/${path}`;
  }
  
  // Remove trailing slashes 
  processed = processed.replace(/[\\/]+$/, "");
  
  // Ensure protocol
  if (processed && !processed.startsWith('http') && !processed.startsWith('/') && !processed.startsWith('data:')) {
    processed = 'https://' + processed;
  }
  
  return processed;
}
