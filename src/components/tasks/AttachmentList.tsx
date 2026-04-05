'use client';

import { useState, useRef, useCallback } from 'react';
import { Attachment } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { FileText, Image, Sheet, Paperclip, X, Download, Upload } from 'lucide-react';

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image size={16} className="text-blue-400" />;
  if (mimeType === 'application/pdf') return <FileText size={16} className="text-red-400" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv')
    return <Sheet size={16} className="text-green-500" />;
  if (mimeType.includes('word') || mimeType === 'text/plain')
    return <FileText size={16} className="text-blue-500" />;
  return <Paperclip size={16} className="text-gray-400" />;
}

interface AttachmentListProps {
  taskId: string;
  attachments: Attachment[];
  currentUserId: string | null;
  taskCreatorId: string;
  onAdd: (attachment: Attachment) => void;
  onRemove: (attachmentId: string) => void;
}

export function AttachmentList({
  taskId,
  attachments,
  currentUserId,
  taskCreatorId,
  onAdd,
  onRemove,
}: AttachmentListProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      setError(null);
      setUploading(true);
      setUploadProgress(0);

      try {
        // 1. Get presigned upload URL from our API
        const res = await fetch(`/api/tasks/${taskId}/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || 'application/octet-stream',
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? 'Upload failed');
        }

        const { attachment, uploadUrl } = await res.json();

        // 2. Upload directly to S3 via presigned URL using XHR for progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', uploadUrl);
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error('S3 upload failed'));
          };
          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.send(file);
        });

        onAdd(attachment);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [taskId, onAdd],
  );

  async function handleDownload(attachment: Attachment) {
    try {
      const res = await fetch(`/api/attachments/${attachment.id}/download`);
      if (res.ok) {
        const { url } = await res.json();
        window.open(url, '_blank');
      }
    } catch {
      // no-op
    }
  }

  async function handleDelete(attachmentId: string) {
    const res = await fetch(`/api/attachments/${attachmentId}`, { method: 'DELETE' });
    if (res.ok) onRemove(attachmentId);
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Attachments ({attachments.length})
      </label>

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="space-y-2 mb-3">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-button border border-gray-100"
              style={{ borderRadius: '8px' }}
            >
              {/* Image thumbnail or icon */}
              {a.mimeType.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.fileUrl}
                  alt={a.fileName}
                  className="w-10 h-10 object-cover rounded flex-shrink-0 cursor-pointer"
                  style={{ borderRadius: '6px' }}
                  onClick={() => handleDownload(a)}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-10 h-10 bg-white border border-gray-200 rounded flex items-center justify-center flex-shrink-0" style={{ borderRadius: '6px' }}>
                  {getFileIcon(a.mimeType)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{a.fileName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-gray-400">{formatFileSize(a.fileSize)}</span>
                  <span className="text-gray-200">·</span>
                  <Avatar
                    name={a.uploadedBy.name}
                    avatarUrl={a.uploadedBy.avatarUrl}
                    color={a.uploadedBy.color}
                    size="xs"
                  />
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(parseISO(a.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(a)}
                  className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                  title="Download"
                >
                  <Download size={14} />
                </button>
                {(currentUserId === a.uploadedById || currentUserId === taskCreatorId) && (
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      <div
        className={`border-2 border-dashed rounded-card p-4 text-center transition-colors cursor-pointer ${
          dragOver ? 'border-honey-400 bg-honey-50' : 'border-gray-200 hover:border-gray-300'
        }`}
        style={{ borderRadius: '12px' }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          accept="image/*,application/pdf,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.*,application/vnd.ms-excel"
        />
        {uploading ? (
          <div className="space-y-2">
            <Upload size={18} className="mx-auto text-honey-500 animate-bounce" />
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-honey-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">{uploadProgress}%</p>
          </div>
        ) : (
          <>
            <Paperclip size={16} className="mx-auto text-gray-400 mb-1" />
            <p className="text-xs text-gray-500">Drop files here or click to upload</p>
            <p className="text-xs text-gray-400 mt-0.5">Max 10MB · Images, PDFs, Docs</p>
          </>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-1.5">{error}</p>
      )}
    </div>
  );
}
