"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FiltersData, ListingDTO } from "@/lib/types";
import { publicAddress, formatPrice } from "@/lib/mapper";
import { PostDialog } from "./post-dialog";
import { SurveyDialog } from "./survey-dialog";
import {
  Loader2,
  RefreshCw,
  Share2,
  Video,
  ClipboardCheck,
  LogOut,
  Search,
  CheckCircle2,
  Circle,
} from "lucide-react";

const ALL = "__all__";

// Source timestamps are unix seconds; show dd/mm/yyyy.
function formatDate(...ts: (number | null | undefined)[]): string {
  const t = ts.find((x) => x != null && x > 0);
  if (!t) return "—";
  const d = new Date(t * 1000);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function DashboardClient({ fullName }: { fullName: string }) {
  const router = useRouter();

  const [rows, setRows] = useState<ListingDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // per-column filters
  const [keyword, setKeyword] = useState("");
  const [fTitle, setFTitle] = useState("");
  const [fAddress, setFAddress] = useState("");
  const [fMinArea, setFMinArea] = useState("");
  const [fMaxArea, setFMaxArea] = useState("");
  const [fMinFront, setFMinFront] = useState("");
  const [fFloors, setFFloors] = useState(ALL);
  const [fMinPrice, setFMinPrice] = useState("");
  const [fMaxPrice, setFMaxPrice] = useState("");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo] = useState("");
  const [fSurveyed, setFSurveyed] = useState(ALL);
  const [sortBy, setSortBy] = useState("area");
  const [sortDir, setSortDir] = useState("desc");

  const [filtersData, setFiltersData] = useState<FiltersData>({ districts: [], floors: [] });

  function resetFilters() {
    setKeyword("");
    setFTitle("");
    setFAddress("");
    setFMinArea("");
    setFMaxArea("");
    setFMinFront("");
    setFFloors(ALL);
    setFMinPrice("");
    setFMaxPrice("");
    setFDateFrom("");
    setFDateTo("");
    setFSurveyed(ALL);
    setPage(1);
  }

  // sync
  const [syncing, setSyncing] = useState(false);
  const [syncInfo, setSyncInfo] = useState<string>("");

  // dialogs
  const [postItem, setPostItem] = useState<ListingDTO | null>(null);
  const [surveyItem, setSurveyItem] = useState<ListingDTO | null>(null);

  const loadFilters = useCallback(async () => {
    const res = await fetch("/api/filters");
    if (res.ok) setFiltersData(await res.json());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortBy,
        sortDir,
      });
      if (keyword.trim()) params.set("keyword", keyword.trim());
      if (fTitle.trim()) params.set("title", fTitle.trim());
      if (fAddress.trim()) params.set("address", fAddress.trim());
      if (fMinArea) params.set("minArea", fMinArea);
      if (fMaxArea) params.set("maxArea", fMaxArea);
      if (fMinFront) params.set("minFront", fMinFront);
      if (fFloors !== ALL) params.set("floors", fFloors);
      if (fMinPrice) params.set("minPrice", fMinPrice);
      if (fMaxPrice) params.set("maxPrice", fMaxPrice);
      if (fDateFrom) params.set("dateFrom", fDateFrom);
      if (fDateTo) params.set("dateTo", fDateTo);
      if (fSurveyed !== ALL) params.set("surveyed", fSurveyed === "yes" ? "yes" : "no");

      const res = await fetch(`/api/listings?${params.toString()}`);
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const json = await res.json();
      setRows(json.rows ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [
    page, sortBy, sortDir, keyword, fTitle, fAddress, fMinArea, fMaxArea,
    fMinFront, fFloors, fMinPrice, fMaxPrice, fDateFrom, fDateTo, fSurveyed, router,
  ]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  // Debounced load so typing in column filters does not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
  }, [load]);

  async function runSync() {
    setSyncing(true);
    setSyncInfo("Đang đồng bộ...");
    try {
      let offset = 0;
      let done = false;
      let grand = 0;
      let safety = 0;
      while (!done && safety < 2000) {
        safety++;
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offset, pageSize: 100 }),
        });
        if (res.status === 401) {
          toast.error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
          // Clear the (now-stale) app session so /login shows the form
          // instead of bouncing back to the dashboard.
          await fetch("/api/auth/logout", { method: "POST" });
          router.replace("/login");
          router.refresh();
          return;
        }
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Đồng bộ thất bại");
        grand += json.fetched;
        offset = json.nextOffset;
        done = json.done;
        setSyncInfo(`Đã đồng bộ ${grand.toLocaleString("vi")} / ${json.total.toLocaleString("vi")}`);
      }
      toast.success(`Đồng bộ xong ${grand.toLocaleString("vi")} căn`);
      await loadFilters();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi đồng bộ");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncInfo(""), 4000);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <div className="container py-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Danh sách nhà</h1>
          <p className="text-sm text-muted-foreground">
            Xin chào, {fullName} · {total.toLocaleString("vi")} căn
          </p>
        </div>
        <div className="flex items-center gap-2">
          {syncInfo && <span className="text-sm text-muted-foreground">{syncInfo}</span>}
          <Button onClick={runSync} disabled={syncing}>
            {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Đồng bộ dữ liệu
          </Button>
          <Button variant="outline" onClick={logout}>
            <LogOut /> Đăng xuất
          </Button>
        </div>
      </div>

      {/* Top bar: global search + sort + reset */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            name="dtk-search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="pl-8"
            placeholder="Tìm nhanh (tiêu đề, mô tả, đường)..."
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-56">
          <Combobox
            value={`${sortBy}:${sortDir}`}
            onChange={(v) => {
              const [b, d] = v.split(":");
              setSortBy(b);
              setSortDir(d);
              setPage(1);
            }}
            placeholder="Sắp xếp"
            searchPlaceholder="Tìm cách sắp xếp..."
            options={[
              { value: "area:desc", label: "Diện tích giảm dần" },
              { value: "area:asc", label: "Diện tích tăng dần" },
              { value: "front:desc", label: "Ngang giảm dần" },
              { value: "price:asc", label: "Giá tăng dần" },
              { value: "price:desc", label: "Giá giảm dần" },
              { value: "date:desc", label: "Ngày mới nhất" },
              { value: "modified:desc", label: "Mới cập nhật" },
            ]}
          />
        </div>
        <Button variant="outline" onClick={resetFilters}>Xoá lọc</Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[56px]">Ảnh</TableHead>
              <TableHead className="min-w-[320px]">Tiêu đề</TableHead>
              <TableHead className="min-w-[200px]">Địa chỉ</TableHead>
              <TableHead className="text-right w-[1%] whitespace-nowrap">DT (m²)</TableHead>
              <TableHead className="text-right w-[1%] whitespace-nowrap">Ngang × Dài</TableHead>
              <TableHead className="w-[1%] whitespace-nowrap">Kết cấu</TableHead>
              <TableHead className="text-right w-[1%] whitespace-nowrap">Giá</TableHead>
              <TableHead className="text-right w-[1%] whitespace-nowrap">Ngày</TableHead>
              <TableHead className="text-center w-[1%] whitespace-nowrap">Khảo sát</TableHead>
              <TableHead className="text-right w-[1%] whitespace-nowrap">Thao tác</TableHead>
            </TableRow>
            {/* Per-column filter row */}
            <TableRow className="hover:bg-transparent align-top">
              <TableHead className="p-1"></TableHead>
              <TableHead className="p-1">
                <Input
                  className="h-8"
                  placeholder="Lọc tiêu đề"
                  autoComplete="off"
                  value={fTitle}
                  onChange={(e) => { setFTitle(e.target.value); setPage(1); }}
                />
              </TableHead>
              <TableHead className="p-1">
                <Input
                  className="h-8"
                  placeholder="Đường / phường / quận"
                  autoComplete="off"
                  value={fAddress}
                  onChange={(e) => { setFAddress(e.target.value); setPage(1); }}
                />
              </TableHead>
              <TableHead className="p-1">
                <div className="flex gap-1">
                  <Input
                    className="h-8 w-16 text-right"
                    type="number"
                    placeholder="từ"
                    autoComplete="off"
                    value={fMinArea}
                    onChange={(e) => { setFMinArea(e.target.value); setPage(1); }}
                  />
                  <Input
                    className="h-8 w-16 text-right"
                    type="number"
                    placeholder="đến"
                    autoComplete="off"
                    value={fMaxArea}
                    onChange={(e) => { setFMaxArea(e.target.value); setPage(1); }}
                  />
                </div>
              </TableHead>
              <TableHead className="p-1">
                <Input
                  className="h-8 w-20 text-right"
                  type="number"
                  placeholder="ngang ≥"
                  autoComplete="off"
                  value={fMinFront}
                  onChange={(e) => { setFMinFront(e.target.value); setPage(1); }}
                />
              </TableHead>
              <TableHead className="p-1">
                <Combobox
                  className="h-8"
                  value={fFloors}
                  onChange={(v) => { setFFloors(v); setPage(1); }}
                  placeholder="Số tầng"
                  searchPlaceholder="Tìm..."
                  emptyText="Không có"
                  options={[
                    { value: ALL, label: "Mọi số tầng" },
                    ...filtersData.floors.map((f) => ({ value: String(f), label: `${f} tầng` })),
                  ]}
                />
              </TableHead>
              <TableHead className="p-1">
                <div className="flex gap-1">
                  <Input
                    className="h-8 w-16 text-right"
                    type="number"
                    placeholder="từ"
                    autoComplete="off"
                    value={fMinPrice}
                    onChange={(e) => { setFMinPrice(e.target.value); setPage(1); }}
                  />
                  <Input
                    className="h-8 w-16 text-right"
                    type="number"
                    placeholder="đến"
                    autoComplete="off"
                    value={fMaxPrice}
                    onChange={(e) => { setFMaxPrice(e.target.value); setPage(1); }}
                  />
                </div>
              </TableHead>
              <TableHead className="p-1">
                <div className="flex flex-col gap-1">
                  <Input
                    className="h-8"
                    type="date"
                    autoComplete="off"
                    value={fDateFrom}
                    onChange={(e) => { setFDateFrom(e.target.value); setPage(1); }}
                  />
                  <Input
                    className="h-8"
                    type="date"
                    autoComplete="off"
                    value={fDateTo}
                    onChange={(e) => { setFDateTo(e.target.value); setPage(1); }}
                  />
                </div>
              </TableHead>
              <TableHead className="p-1">
                <Combobox
                  className="h-8"
                  value={fSurveyed}
                  onChange={(v) => { setFSurveyed(v); setPage(1); }}
                  placeholder="Tất cả"
                  searchPlaceholder="Tìm..."
                  options={[
                    { value: ALL, label: "Tất cả" },
                    { value: "yes", label: "Đã KS" },
                    { value: "no", label: "Chưa KS" },
                  ]}
                />
              </TableHead>
              <TableHead className="p-1"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  <Loader2 className="mx-auto animate-spin" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  Chưa có dữ liệu. Bấm “Đồng bộ dữ liệu” để tải từ hệ thống.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.avatar} alt="" className="h-12 w-12 rounded object-cover border" />
                    ) : (
                      <div className="h-12 w-12 rounded bg-muted" />
                    )}
                  </TableCell>
                  <TableCell className="min-w-[320px] max-w-[460px]">
                    <div className="line-clamp-2 text-sm font-medium">{r.title}</div>
                  </TableCell>
                  <TableCell className="min-w-[200px] max-w-[300px] text-sm">
                    {publicAddress(r) || "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap">{r.area ?? "—"}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {r.frontLabel ?? (r.front != null ? r.front : "—")}
                    {r.lengthM != null ? ` × ${r.lengthM}` : ""}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{r.structure || "—"}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatPrice(r)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(r.sourcePublished, r.sourceModified, r.sourceCreated)}
                  </TableCell>
                  <TableCell className="text-center">
                    {r.surveyed ? (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Đã KS
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <Circle className="h-3 w-3" /> Chưa
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => setPostItem(r)}>
                        <Share2 /> Đăng
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toast.info("Tạo video AI sẽ bổ sung ở giai đoạn sau")}
                      >
                        <Video /> Video
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setSurveyItem(r)}>
                        <ClipboardCheck /> KS
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Trang {page} / {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Sau
          </Button>
        </div>
      </div>

      <PostDialog
        listing={postItem}
        open={!!postItem}
        onOpenChange={(v) => !v && setPostItem(null)}
      />
      <SurveyDialog
        listing={surveyItem}
        open={!!surveyItem}
        onOpenChange={(v) => !v && setSurveyItem(null)}
        onSaved={load}
      />
    </div>
  );
}
