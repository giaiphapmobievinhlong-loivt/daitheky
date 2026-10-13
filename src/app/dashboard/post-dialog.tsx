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
import { Copy, Share2, Users, MessageCircle, AtSign } from "lucide-react";

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

  // keep text in sync when listing changes
  useEffect(() => setText(initial), [initial]);

  const images = useMemo(() => {
    if (!listing) return [];
    const all = [listing.avatar, ...(listing.images ?? []), ...(listing.surveyPhotos ?? [])];
    return all.filter((x): x is string => !!x);
  }, [listing]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Đã sao chép nội dung bài đăng");
    } catch {
      toast.error("Không sao chép được, hãy chọn và copy thủ công");
    }
  }

  const platforms = [
    { key: "fb", label: "Facebook cá nhân", icon: Share2 },
    { key: "group", label: "Group Facebook", icon: Users },
    { key: "zalo", label: "Zalo", icon: MessageCircle },
    { key: "threads", label: "Threads", icon: AtSign },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Soạn bài đăng</DialogTitle>
          <DialogDescription>
            Nội dung theo mẫu (đã ẩn số nhà). Chỉnh sửa rồi sao chép để đăng.
          </DialogDescription>
        </DialogHeader>

        {images.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.slice(0, 8).map((src) => (
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
          className="min-h-[260px] font-mono text-sm"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={copy}>
            <Copy /> Sao chép nội dung
          </Button>
          {platforms.map((p) => (
            <Button
              key={p.key}
              variant="outline"
              onClick={() =>
                toast.info(`Đăng tự động lên ${p.label} sẽ bổ sung ở giai đoạn sau`)
              }
            >
              <p.icon /> {p.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          <Badge variant="secondary">Giai đoạn 1</Badge> hiện hỗ trợ sao chép thủ
          công. Đăng tự động các nền tảng sẽ mở dần.
        </p>
      </DialogContent>
    </Dialog>
  );
}
