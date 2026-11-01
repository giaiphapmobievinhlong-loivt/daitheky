"use client";
import { useEffect, useRef, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { ListingDTO } from "@/lib/types";
import { Loader2, Upload, Trash2, CheckCircle2, Circle } from "lucide-react";

export function SurveyDialog({
  listing,
  open,
  onOpenChange,
  onSaved,
  readOnly = false,
  viewAll = false,
}: {
  listing: ListingDTO | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  readOnly?: boolean;
  viewAll?: boolean;
}) {
  const [surveyed, setSurveyed] = useState(false);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (listing) {
      setSurveyed(listing.surveyed);
      setNote(listing.surveyNote ?? "");
      setPhotos(listing.surveyPhotos ?? []);
    }
  }, [listing]);

  if (!listing) return null;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/listings/${listing!.id}/survey`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surveyed, surveyNote: note }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Lưu thất bại");
      toast.success("Đã lưu khảo sát");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setSaving(false);
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch(`/api/listings/${listing!.id}/upload`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload thất bại");
      setPhotos(json.photos);
      setSurveyed(true);
      toast.success("Đã tải ảnh lên");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto(url: string) {
    try {
      const res = await fetch(
        `/api/listings/${listing!.id}/upload?url=${encodeURIComponent(url)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Xoá thất bại");
      setPhotos(json.photos);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    }
  }

  // Admin viewing everyone's surveys: read-only list grouped by member.
  if (viewAll) {
    const list = listing.surveyList ?? [];
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Khảo sát của các thành viên</DialogTitle>
            <DialogDescription className="line-clamp-2">{listing.title}</DialogDescription>
          </DialogHeader>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có ai khảo sát căn này.</p>
          ) : (
            <div className="space-y-4">
              {list.map((s) => (
                <div key={s.userId} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{s.fullName || s.username}</span>
                    {s.surveyed ? (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Đã KS
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <Circle className="h-3 w-3" /> Chưa
                      </Badge>
                    )}
                  </div>
                  {s.note && <p className="text-sm whitespace-pre-wrap">{s.note}</p>}
                  {s.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {s.photos.map((src) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={src} src={src} alt="" className="h-24 w-full rounded-md object-cover border" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {readOnly ? "Khảo sát (chỉ xem)" : "Khảo sát thực địa"}
          </DialogTitle>
          <DialogDescription className="line-clamp-2">
            {listing.title}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Checkbox
            id="surveyed"
            checked={surveyed}
            disabled={readOnly}
            onCheckedChange={(v) => setSurveyed(v === true)}
          />
          <Label htmlFor="surveyed">Đã khảo sát căn nhà này</Label>
        </div>

        <div className="space-y-2">
          <Label>Ghi chú khảo sát</Label>
          {readOnly ? (
            <p className="text-sm whitespace-pre-wrap rounded-md border p-2 min-h-[60px]">
              {note || <span className="text-muted-foreground">Không có ghi chú</span>}
            </p>
          ) : (
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tình trạng thực tế, hiện trạng, lưu ý khi dẫn khách..."
            />
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Ảnh khảo sát ({photos.length})</Label>
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
                Tải ảnh
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onUpload}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((src) => (
              <div key={src} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-24 w-full rounded-md object-cover border" />
                {!readOnly && (
                  <button
                    onClick={() => removePhoto(src)}
                    className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {photos.length === 0 && (
              <span className="text-sm text-muted-foreground col-span-3">Chưa có ảnh</span>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          {!readOnly && (
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Lưu
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
