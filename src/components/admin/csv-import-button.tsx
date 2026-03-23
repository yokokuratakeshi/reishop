"use client";

import React, { useState, useRef } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface CsvImportButtonProps {
  title: string;
  description: string;
  onImport: (data: any[]) => Promise<{ success: boolean; message: string; count?: number }>;
  templateUrl?: string;
  buttonText?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
}

export function CsvImportButton({
  title,
  description,
  onImport,
  templateUrl,
  buttonText = "CSVインポート",
  variant = "outline",
}: CsvImportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
        toast.error("CSVファイルを指定してください");
        return;
      }
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = (file: File) => {
    setIsParsing(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setPreviewData(results.data);
        setIsParsing(false);
      },
      error: (error) => {
        console.error("CSV Parse Error:", error);
        toast.error("CSVの解析に失敗しました");
        setIsParsing(false);
      },
    });
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;

    setIsImporting(true);
    try {
      const result = await onImport(previewData);
      if (result.success) {
        toast.success(result.message);
        setIsOpen(false);
        resetState();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Import Error:", error);
      toast.error("インポート中にエラーが発生しました");
    } finally {
      setIsImporting(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setPreviewData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetState();
    }}>
      <DialogTrigger
        render={
          <Button variant={variant} className="gap-2">
            <Upload className="w-4 h-4" />
            {buttonText}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="csv-file">CSVファイルを選択</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              ref={fileInputRef}
              disabled={isImporting}
            />
          </div>

          {templateUrl && (
            <div className="text-sm text-muted-foreground italic">
              <a href={templateUrl} className="text-primary hover:underline flex items-center gap-1">
                <FileText className="w-4 h-4" />
                テンプレートをダウンロード
              </a>
            </div>
          )}

          {file && (
            <div className="bg-muted p-3 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium truncate">{file.name}</span>
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {previewData.length} 件のデータ
              </div>
            </div>
          )}

          {previewData.length > 0 && (
            <div className="max-h-[200px] overflow-auto border rounded text-[10px] p-2 bg-slate-950 text-slate-50 font-mono">
              <table className="w-full">
                <thead>
                  <tr>
                    {Object.keys(previewData[0]).map((key) => (
                      <th key={key} className="text-left border-b border-slate-800 p-1">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((val: any, j) => (
                        <td key={j} className="p-1 border-b border-slate-900 truncate max-w-[100px]">{val}</td>
                      ))}
                    </tr>
                  ))}
                  {previewData.length > 5 && (
                    <tr>
                      <td colSpan={Object.keys(previewData[0]).length} className="p-1 text-center text-slate-500 italic">
                        ...他 {previewData.length - 5} 件
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isImporting}>
            キャンセル
          </Button>
          <Button
            onClick={handleImport}
            disabled={previewData.length === 0 || isImporting || isParsing}
            className="gap-2"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                インポート中...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                インポート実行
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
