"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, X, Upload, Loader2 } from "lucide-react";
import { uploadProductImage } from "@/lib/firebase/storage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  productId: string;
}

export default function ImageUpload({ value, onChange, productId }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // バリデーション
    if (!file.type.startsWith("image/")) {
      toast.error("画像ファイルを選択してください");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("ファイルサイズは2MB以下にしてください");
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadProductImage(productId, file);
      onChange(url);
      toast.success("画像をアップロードしました");
    } catch (error: any) {
      console.error("Upload error details:", error);
      const errorMessage = error?.message || "不明なエラーが発生しました";
      
      if (errorMessage.includes("unauthorized") || errorMessage.includes("permission")) {
        toast.error("権限がありません（管理者アカウントか確認してください）");
      } else {
        toast.error(`アップロード失敗: ${errorMessage}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    onChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center gap-4">
        {value ? (
          <div className="relative w-40 h-40 rounded-xl overflow-hidden border border-border shadow-sm group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Product"
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
            />
            <button
              onClick={removeImage}
              className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "w-40 h-40 rounded-xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/30 transition-all",
              isUploading && "pointer-events-none opacity-50"
            )}
          >
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : (
              <>
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Upload Photo</span>
              </>
            )}
          </div>
        )}

        <div className="flex-1 space-y-2">
          <p className="text-sm font-bold text-foreground">商品画像</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            推奨サイズ: 800x800px以上<br />
            形式: JPG, PNG, WebP (2MB以下)
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading || !productId}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg shadow-sm font-bold text-xs"
          >
            {value ? "画像を変更" : "画像を選択"}
          </Button>
          {!productId && (
            <p className="text-destructive text-[10px] font-bold">
              ※ 画像をアップロードするには、先に基本情報の保存が必要です
            </p>
          )}
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
    </div>
  );
}
