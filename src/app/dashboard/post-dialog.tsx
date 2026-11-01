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
import { buildPost } from "@/lib/post-template";
import type { ListingDTO } from "@/lib/types";
import { Copy, Download, ExternalLink, Loader2, Rocket } from "lucide-react";

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

  useEffect(() => setText(initial), [initial]);

  const images = useMemo(() => {
    if (!listing) return [];
    const all = [listing.avatar, ...(listing.images ?? []), ...(listing.surveyPhotos ?? [])];
    return Array.from(new Set(all.filter((x): x is string => !!x)));
  }, [listing]);

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

  async function downloadAll() {
    if (images.length === 0) {
      toast.info("Căn này chưa có ảnh");
      return;
    }
    setDownloading(true);
    try {
      for (let i = 0; i < images.length; i++) {
        const name = `nha_${listing?.id?.slice(0, 6) || "anh"}_${i + 1}.jpg`;
        const href = `/api/download?url=${encodeURIComponent(images[i])}&name=${encodeURIComponent(name)}`;
        const a = document.createElement("a");
        a.href = href;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // small delay so the browser doesn't drop concurrent downloads
        await new Promise((r) => setTimeout(r, 400));
      }
      toast.success(`Đang tải ${images.length} ảnh về máy`);
    } finally {
      setDownloading(false);
    }
  }

  function openPlatform(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // One-click: copy text, download all images, open Facebook.
  async function prepareAndOpen(url: string) {
    await copy();
    await downloadAll();
    openPlatform(url);
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
            Nội dung theo mẫu (đã ẩn số nhà). Bấm một nền tảng để tự động: sao chép
            nội dung + tải sẵn ảnh + mở trang đăng.
          </DialogDescription>
        </DialogHeader>

        {images.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.slice(0, 10).map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt=""
                className="h-20 w-20 flex-shrink-0 rounded-md object-cover border"
              />
            ))}
          </div>
        )}

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[240px] font-mono text-sm"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={copy}>
            <Copy /> Sao chép nội dung
          </Button>
          <Button variant="outline" onClick={downloadAll} disabled={downloading}>
            {downloading ? <Loader2 className="animate-spin" /> : <Download />}
            Tải tất cả ảnh ({images.length})
          </Button>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium flex items-center gap-2">
            <Rocket className="h-4 w-4" /> Đăng lên nền tảng
          </div>
          <div className="flex flex-wrap gap-2">
            {platforms.map((p) => (
              <Button key={p.key} onClick={() => prepareAndOpen(p.url)}>
                <ExternalLink /> {p.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-1 text-xs text-muted-foreground">
          <Badge variant="secondary">Lưu ý</Badge>
          <span>
            Meta không cho đăng tự động lên <b>trang cá nhân</b> và <b>Group</b> — app
            đã chuẩn bị sẵn (nội dung đã copy + ảnh đã tải), anh/chị chỉ cần dán nội
            dung, chọn ảnh vừa tải và bấm Đăng. Đăng tự động <b>Fanpage</b> sẽ có ở bước sau.
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
