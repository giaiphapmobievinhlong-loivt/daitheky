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
import type { ListingDTO } from "@/lib/types";
import { Loader2, Upload, Trash2 } from "lucide-react";

export function SurveyDialog({
  listing,
  open,
  onOpenChange,
  onSaved,
}: {
  listing: ListingDTO | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Khảo sát thực địa</DialogTitle>
          <DialogDescription className="line-clamp-2">
            {listing.title}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Checkbox
            id="surveyed"
            checked={surveyed}
            onCheckedChange={(v) => setSurveyed(v === true)}
          />
          <Label htmlFor="surveyed">Đã khảo sát căn nhà này</Label>
        </div>

        <div className="space-y-2">
          <Label>Ghi chú khảo sát</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tình trạng thực tế, hiện trạng, lưu ý khi dẫn khách..."
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Ảnh khảo sát ({photos.length})</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
              Tải ảnh
            </Button>
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
                <button
                  onClick={() => removePhoto(src)}
                  className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Lưu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
