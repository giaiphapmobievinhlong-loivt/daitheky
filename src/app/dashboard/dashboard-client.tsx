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

export function DashboardClient({ fullName }: { fullName: string }) {
  const router = useRouter();

  const [rows, setRows] = useState<ListingDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // filters
  const [keyword, setKeyword] = useState("");
  const [district, setDistrict] = useState(ALL);
  const [ward, setWard] = useState(ALL);
  const [minFront, setMinFront] = useState("");
  const [floors, setFloors] = useState(ALL);
  const [surveyed, setSurveyed] = useState(ALL);
  const [sortBy, setSortBy] = useState("area");
  const [sortDir, setSortDir] = useState("desc");

  const [filtersData, setFiltersData] = useState<FiltersData>({ districts: [], floors: [] });

  // sync
  const [syncing, setSyncing] = useState(false);
  const [syncInfo, setSyncInfo] = useState<string>("");

  // dialogs
  const [postItem, setPostItem] = useState<ListingDTO | null>(null);
  const [surveyItem, setSurveyItem] = useState<ListingDTO | null>(null);

  const wardOptions = useMemo(() => {
    if (district === ALL) return [];
    return filtersData.districts.find((d) => d.district === district)?.wards ?? [];
  }, [district, filtersData]);

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
      if (district !== ALL) params.set("district", district);
      if (ward !== ALL) params.set("ward", ward);
      if (minFront) params.set("minFront", minFront);
      if (floors !== ALL) params.set("floors", floors);
      if (surveyed !== ALL) params.set("surveyed", surveyed === "yes" ? "yes" : "no");

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
  }, [page, sortBy, sortDir, keyword, district, ward, minFront, floors, surveyed, router]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    load();
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
          router.replace("/login");
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

  function resetToFirstPage() {
    setPage(1);
  }

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

      {/* Filters */}
      <div className="grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            name="dtk-search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="pl-8"
            placeholder="Tìm tiêu đề, đường..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") resetToFirstPage();
            }}
          />
        </div>

        <Combobox
          value={district}
          onChange={(v) => {
            setDistrict(v);
            setWard(ALL);
            resetToFirstPage();
          }}
          placeholder="Tất cả quận"
          searchPlaceholder="Tìm quận..."
          emptyText="Không tìm thấy quận"
          options={[
            { value: ALL, label: "Tất cả quận" },
            ...filtersData.districts.map((d) => ({ value: d.district, label: d.district })),
          ]}
        />

        <Combobox
          value={ward}
          onChange={(v) => {
            setWard(v);
            resetToFirstPage();
          }}
          disabled={district === ALL}
          placeholder="Tất cả phường"
          searchPlaceholder="Tìm phường..."
          emptyText="Không tìm thấy phường"
          options={[
            { value: ALL, label: "Tất cả phường" },
            ...wardOptions.map((w) => ({ value: w, label: w })),
          ]}
        />

        <Input
          type="number"
          autoComplete="off"
          placeholder="Đường trước nhà ≥ (m)"
          value={minFront}
          onChange={(e) => setMinFront(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") resetToFirstPage();
          }}
        />

        <Combobox
          value={floors}
          onChange={(v) => { setFloors(v); resetToFirstPage(); }}
          placeholder="Mọi số tầng"
          searchPlaceholder="Tìm số tầng..."
          emptyText="Không có"
          options={[
            { value: ALL, label: "Kết cấu: mọi số tầng" },
            ...filtersData.floors.map((f) => ({ value: String(f), label: `${f} tầng` })),
          ]}
        />

        <Combobox
          value={surveyed}
          onChange={(v) => { setSurveyed(v); resetToFirstPage(); }}
          placeholder="Khảo sát"
          searchPlaceholder="Tìm..."
          options={[
            { value: ALL, label: "Mọi trạng thái" },
            { value: "yes", label: "Đã khảo sát" },
            { value: "no", label: "Chưa khảo sát" },
          ]}
        />

        <Combobox
          value={`${sortBy}:${sortDir}`}
          onChange={(v) => {
            const [b, d] = v.split(":");
            setSortBy(b);
            setSortDir(d);
            resetToFirstPage();
          }}
          placeholder="Sắp xếp"
          searchPlaceholder="Tìm cách sắp xếp..."
          options={[
            { value: "area:desc", label: "Diện tích giảm dần" },
            { value: "area:asc", label: "Diện tích tăng dần" },
            { value: "front:desc", label: "Mặt tiền giảm dần" },
            { value: "price:asc", label: "Giá tăng dần" },
            { value: "price:desc", label: "Giá giảm dần" },
            { value: "modified:desc", label: "Mới cập nhật" },
          ]}
        />

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={resetToFirstPage}>Lọc</Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70px]">Ảnh</TableHead>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Địa chỉ</TableHead>
              <TableHead className="text-right">DT (m²)</TableHead>
              <TableHead className="text-right">Ngang × Dài</TableHead>
              <TableHead>Kết cấu</TableHead>
              <TableHead className="text-right">Giá</TableHead>
              <TableHead className="text-center">Khảo sát</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  <Loader2 className="mx-auto animate-spin" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
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
                  <TableCell className="max-w-[260px]">
                    <div className="line-clamp-2 text-sm font-medium">{r.title}</div>
                  </TableCell>
                  <TableCell className="max-w-[200px] text-sm">
                    {publicAddress(r) || "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">{r.area ?? "—"}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {r.frontLabel ?? (r.front != null ? r.front : "—")}
                    {r.lengthM != null ? ` × ${r.lengthM}` : ""}
                  </TableCell>
                  <TableCell className="text-sm">{r.structure || "—"}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatPrice(r)}</TableCell>
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
