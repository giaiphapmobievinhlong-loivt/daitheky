/**
 * Facebook Graph API helpers. Posting to personal profiles and Groups is NOT
 * available via the API (Meta deprecated them); this supports Pages only.
 */
export const FB_GRAPH = "https://graph.facebook.com/v21.0";
export const FB_SCOPES = ["pages_show_list", "pages_manage_posts", "pages_read_engagement"];

export const FB_APP_ID = process.env.FACEBOOK_APP_ID ?? "";
export const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET ?? "";

export function fbConfigured(): boolean {
  return !!FB_APP_ID && !!FB_APP_SECRET;
}

export function oauthRedirectUri(origin: string): string {
  return `${origin}/api/facebook/callback`;
}

export function oauthDialogUrl(origin: string, state: string): string {
  const p = new URLSearchParams({
    client_id: FB_APP_ID,
    redirect_uri: oauthRedirectUri(origin),
    scope: FB_SCOPES.join(","),
    response_type: "code",
    state,
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${p.toString()}`;
}

type TokenResp = { access_token?: string; expires_in?: number; error?: { message?: string } };

export async function exchangeCodeForToken(code: string, origin: string): Promise<TokenResp> {
  const p = new URLSearchParams({
    client_id: FB_APP_ID,
    client_secret: FB_APP_SECRET,
    redirect_uri: oauthRedirectUri(origin),
    code,
  });
  const res = await fetch(`${FB_GRAPH}/oauth/access_token?${p.toString()}`);
  return res.json();
}

export async function exchangeForLongLived(shortToken: string): Promise<TokenResp> {
  const p = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: FB_APP_ID,
    client_secret: FB_APP_SECRET,
    fb_exchange_token: shortToken,
  });
  const res = await fetch(`${FB_GRAPH}/oauth/access_token?${p.toString()}`);
  return res.json();
}

export async function getMe(token: string): Promise<{ id?: string; name?: string }> {
  const res = await fetch(`${FB_GRAPH}/me?fields=id,name&access_token=${encodeURIComponent(token)}`);
  return res.json();
}

export type FbPage = { id: string; name: string; access_token: string; category?: string };

export async function getPages(token: string): Promise<FbPage[]> {
  const out: FbPage[] = [];
  let url: string | null = `${FB_GRAPH}/me/accounts?fields=id,name,access_token,category&limit=100&access_token=${encodeURIComponent(token)}`;
  // follow pagination
  while (url) {
    const res = await fetch(url);
    const json: { data?: FbPage[]; paging?: { next?: string } } = await res.json();
    if (Array.isArray(json.data)) out.push(...json.data);
    url = json.paging?.next ?? null;
  }
  return out;
}

/** Publish a post (text + optional photos) to a Page. Returns the post id. */
export async function postToPage(
  pageId: string,
  pageToken: string,
  message: string,
  photoUrls: string[]
): Promise<{ id?: string; error?: string }> {
  try {
    if (photoUrls.length === 0) {
      const res = await fetch(`${FB_GRAPH}/${pageId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, access_token: pageToken }),
      });
      const j = await res.json();
      return j.error ? { error: j.error.message } : { id: j.id };
    }

    if (photoUrls.length === 1) {
      const res = await fetch(`${FB_GRAPH}/${pageId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: photoUrls[0], caption: message, access_token: pageToken }),
      });
      const j = await res.json();
      return j.error ? { error: j.error.message } : { id: j.post_id || j.id };
    }

    // Multiple photos: upload unpublished, then attach to a feed post.
    const mediaIds: string[] = [];
    for (const url of photoUrls.slice(0, 10)) {
      const res = await fetch(`${FB_GRAPH}/${pageId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, published: false, access_token: pageToken }),
      });
      const j = await res.json();
      if (j.id) mediaIds.push(j.id);
    }
    const attached = mediaIds.map((id) => ({ media_fbid: id }));
    const res = await fetch(`${FB_GRAPH}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, attached_media: attached, access_token: pageToken }),
    });
    const j = await res.json();
    return j.error ? { error: j.error.message } : { id: j.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Lỗi đăng Facebook" };
  }
}
