/**
 * Client for the daitheky source API (api-dtk.thangbk.com).
 * See memory daitheky-source-api for the auth scheme.
 */
const API_BASE = process.env.SOURCE_API_BASE ?? "https://api-dtk.thangbk.com";
const API_VERSION = "v2";

// Stable device fingerprint for this app (single-device per account on the source).
const DEVICE_SUM = process.env.SOURCE_DEVICE_SUM ?? "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";

export type SourceLoginResult = {
  accessToken: string;
  user: Record<string, unknown>;
};

function headers(token?: string): HeadersInit {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-api-version": API_VERSION,
  };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

export async function sourceLogin(
  username: string,
  password: string
): Promise<SourceLoginResult> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ username, password, sum: DEVICE_SUM }),
  });
  const json = await res.json().catch(() => ({}));
  if (json?.code !== 200 || !json?.data?.access_token) {
    throw new Error(json?.message || "Đăng nhập thất bại");
  }
  return { accessToken: json.data.access_token, user: json.data.user };
}

export async function sourceLogout(token: string): Promise<void> {
  // Frees the single-device slot on the source so the user can sign in
  // elsewhere (e.g. the tuan123.daitheky.net website) right after.
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "GET",
      headers: headers(token),
    });
  } catch {
    // best-effort; don't block local logout if the source call fails
  }
}

export type SourceRecord = {
  id: string;
  title?: string;
  description?: string;
  location?: {
    province?: string;
    district?: string;
    ward?: string;
    street?: string;
    number?: string;
    address?: string;
  };
  price?: { unit?: number; value?: number; absolute?: number; status?: number };
  additional?: { front?: number; room?: number; toilet?: number; floor?: number };
  area?: number;
  segment?: number;
  type?: number;
  attribute?: string[];
  avatar?: string;
  images_album?: string;
  images?: string[] | null;
  zone_group?: string;
  sale_type?: string;
  transfer_status?: number;
  level?: number;
  created?: number;
  modified?: number;
  published?: number;
};

export async function sourceSearch(
  token: string,
  opts: { size: number; offset: number; keyword?: string }
): Promise<{ data: SourceRecord[]; total: number }> {
  const res = await fetch(`${API_BASE}/bi-kip-tong/search`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      size: opts.size,
      offset: opts.offset,
      keyword: opts.keyword ?? "",
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!json?.success) {
    throw new Error(json?.message || "Không tải được dữ liệu từ nguồn");
  }
  return { data: json.detail?.data ?? [], total: json.detail?.total ?? 0 };
}

export type Province = {
  id?: string;
  code?: string;
  name: string;
  districts: {
    id: string;
    name: string;
    wards: { id: string; name: string }[];
  }[];
};

export async function sourceLocal(token: string): Promise<Province[]> {
  const res = await fetch(`${API_BASE}/resource/local`, {
    method: "GET",
    headers: headers(token),
  });
  const json = await res.json().catch(() => ({}));
  if (!json?.detail) return [];
  return json.detail as Province[];
}
