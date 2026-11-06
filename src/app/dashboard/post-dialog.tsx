"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { buildPost } from "@/lib/post-template";
import type { ListingDTO } from "@/lib/types";
import { Copy, Download, ExternalLink, Loader2, Rocket, Send, Check } from "lucide-react";

const FB_PROFILE = "https://www.facebook.com/";
const FB_GROUPS = "https://www.facebook.com/groups/feed/";
const THREADS = "https://www.threads.net/";
const ZALO = "https://chat.zalo.me/";

export function PostDialog({
  listing,
  open,
  onOpenChange,
}: {
  listing: ListingDTO | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const initial = useMemo(() => (listing ? buildPost(listing) : ""), [listing]);
  const [text, setText] = useState(initial);
  const [downloading, setDownloading] = useState(false);

  // images
  const [gallery, setGallery] = useState<string[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // facebook
  const [fbPages, setFbPages] = useState<{ id: string; name: string }[]>([]);
  const [selectedPage, setSelectedPage] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => setText(initial), [initial]);

  const allImages = useMemo(() => {
    if (!listing) return [];
    const all = [listing.avatar, ...gallery, ...(listing.surveyPhotos ?? [])];
    return Array.from(new Set(all.filter((x): x is string => !!x)));
  }, [listing, gallery]);

  // When the dialog opens for a listing: fetch its full gallery + default-select all.
  useEffect(() => {
    if (!open || !listing) return;
    setGallery([]);
    setLoadingGallery(true);
    fetch(`/api/listings/${listing.id}/gallery`)
      .then((r) => (r.ok ? r.json() : { images: [] }))
      .then((j) => setGallery(Array.isArray(j.images) ? j.images : []))
      .catch(() => setGallery([]))
      .finally(() => setLoadingGallery(false));

    fetch("/api/facebook/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.connected && Array.isArray(j.pages)) {
          setFbPages(j.pages);
          setSelectedPage((p) => p || j.pages[0]?.id || "");
        } else setFbPages([]);
      })
      .catch(() => setFbPages([]));
  }, [open, listing]);

  // default-select every image whenever the image set changes
  useEffect(() => {
    setSelected(new Set(allImages));
  }, [allImages]);

  const selectedImages = useMemo(
    () => allImages.filter((x) => selected.has(x)),
    [allImages, selected]
  );

  function toggle(src: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(src)) next.delete(src);
      else next.add(src);
      return next;
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Đã sao chép nội dung — giờ dán vào bài đăng");
      return true;
    } catch {
      toast.error("Không sao chép được, hãy chọn và copy thủ công");
      return false;
    }
  }

  async function downloadSelected() {
    if (selectedImages.length === 0) {
      toast.info("Chưa chọn ảnh nào");
      return;
    }
    setDownloading(true);
    try {
      for (let i = 0; i < selectedImages.length; i++) {
        const name = `nha_${listing?.id?.slice(0, 6) || "anh"}_${i + 1}.jpg`;
        const href = `/api/download?url=${encodeURIComponent(selectedImages[i])}&name=${encodeURIComponent(name)}`;
        const a = document.createElement("a");
        a.href = href;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        await new Promise((r) => setTimeout(r, 400));
      }
      toast.success(`Đang tải ${selectedImages.length} ảnh về máy`);
    } finally {
      setDownloading(false);
    }
  }

  function openPlatform(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function prepareAndOpen(url: string) {
    await copy();
    await downloadSelected();
    openPlatform(url);
  }

  async function postFanpage() {
    if (!selectedPage) {
      toast.error("Chọn Trang để đăng");
      return;
    }
    setPosting(true);
    try {
      const res = await fetch("/api/facebook/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: selectedPage, message: text, photoUrls: selectedImages }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Đăng thất bại");
      toast.success("Đã đăng lên Fanpage");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi đăng Fanpage");
    } finally {
      setPosting(false);
    }
  }

  const platforms = [
    { key: "fb", label: "Facebook cá nhân", url: FB_PROFILE },
    { key: "group", label: "Group Facebook", url: FB_GROUPS },
    { key: "threads", label: "Threads", url: THREADS },
    { key: "zalo", label: "Zalo", url: ZALO },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Soạn & đăng bài</DialogTitle>
          <DialogDescription>
            Chọn ảnh muốn dùng (bỏ tick ảnh có người). Chỉ ảnh được tick mới được
            tải/đăng.
          </DialogDescription>
        </DialogHeader>

        {/* Image picker */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              Ảnh ({selectedImages.length}/{allImages.length} đã chọn)
              {loadingGallery && <Loader2 className="inline ml-2 h-3 w-3 animate-spin" />}
            </span>
            <div className="flex gap-2">
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => setSelected(new Set(allImages))}
              >
                Chọn tất cả
              </button>
              <button
                className="text-xs text-muted-foreground hover:underline"
                onClick={() => setSelected(new Set())}
              >
                Bỏ chọn
              </button>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2 max-h-[220px] overflow-y-auto">
            {allImages.map((src) => {
              const on = selected.has(src);
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => toggle(src)}
                  className={`relative aspect-square overflow-hidden rounded-md border-2 ${
                    on ? "border-primary" : "border-transparent opacity-50"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  {on && (
                    <span className="absolute right-0.5 top-0.5 rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
            {!loadingGallery && allImages.length === 0 && (
              <span className="col-span-5 text-sm text-muted-foreground">Không có ảnh</span>
            )}
          </div>
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[200px] font-mono text-sm"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={copy}>
            <Copy /> Sao chép nội dung
          </Button>
          <Button variant="outline" onClick={downloadSelected} disabled={downloading}>
            {downloading ? <Loader2 className="animate-spin" /> : <Download />}
            Tải ảnh đã chọn ({selectedImages.length})
          </Button>
        </div>

        {fbPages.length > 0 && (
          <div className="space-y-2 rounded-lg border p-3">
            <div className="text-sm font-medium flex items-center gap-2">
              <Send className="h-4 w-4" /> Đăng tự động lên Fanpage
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-60">
                <Combobox
                  value={selectedPage}
                  onChange={setSelectedPage}
                  placeholder="Chọn Trang"
                  searchPlaceholder="Tìm Trang..."
                  options={fbPages.map((p) => ({ value: p.id, label: p.name }))}
                />
              </div>
              <Button onClick={postFanpage} disabled={posting}>
                {posting ? <Loader2 className="animate-spin" /> : <Send />}
                Đăng lên Trang
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-sm font-medium flex items-center gap-2">
            <Rocket className="h-4 w-4" /> Đăng tay (cá nhân / Group / Threads / Zalo)
          </div>
          <div className="flex flex-wrap gap-2">
            {platforms.map((p) => (
              <Button key={p.key} variant="outline" onClick={() => prepareAndOpen(p.url)}>
                <ExternalLink /> {p.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-1 text-xs text-muted-foreground">
          <Badge variant="secondary">Lưu ý</Badge>
          <span>
            Đăng tay: app copy nội dung + tải ảnh đã chọn + mở trang, anh/chị dán và
            chọn ảnh. Meta không cho đăng tự động cá nhân/Group.
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
