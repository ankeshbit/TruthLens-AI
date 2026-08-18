import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, ImageIcon, AlertCircle, X, ScanSearch, FileImage } from 'lucide-react';

interface UploadPageProps {
  onFileUpload: (file: File) => void;
  error?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 20;

// Forensic modules that will run — static display only
const MODULES = [
  'ELA Analysis',
  'Noise Analysis',
  'OCR Text Extraction',
  'Layout Analysis',
  'Metadata Extraction',
  'ML Detection',
];

export function UploadPage({ onFileUpload, error }: UploadPageProps) {
  const [dragActive, setDragActive]         = useState(false);
  const [preview, setPreview]               = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile]     = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup URL on unmount
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type))
      return `Unsupported format: ${file.type || 'unknown'}. Use PNG, JPG, or WebP.`;
    if (file.size > MAX_SIZE_MB * 1024 * 1024)
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_SIZE_MB} MB.`;
    return null;
  };

  const handleFile = useCallback((file: File) => {
    const err = validateFile(file);
    if (err) {
      setValidationError(err);
      setPreview(null);
      setSelectedFile(null);
      return;
    }
    setValidationError(null);
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setSelectedFile(null);
    setValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const displayError = validationError || error;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Page header */}
      <div className="mb-6">
        <h2 className="text-[22px] font-semibold text-[var(--text-primary)] leading-none">
          Analyze Screenshot
        </h2>
        <p className="text-[13px] text-[var(--text-muted)] mt-1.5">
          Upload a screenshot for multi-signal digital forensic analysis.
        </p>
      </div>

      {/* Upload zone */}
      <div
        className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
        style={{ minHeight: 280 }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload screenshot dropzone"
        onKeyDown={(e) => e.key === 'Enter' && !selectedFile && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="file-input"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleInputChange}
          className="hidden"
          aria-label="File upload input"
        />

        {preview && selectedFile ? (
          /* ── File selected state ── */
          <div className="flex flex-col md:flex-row gap-6 p-6">
            {/* Image preview */}
            <div className="relative flex-shrink-0 flex items-start">
              <img
                src={preview}
                alt="Upload preview"
                className="max-h-52 max-w-[260px] w-auto object-contain rounded border border-[var(--border)]"
              />
              <button
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--elevated)] border border-[var(--border)]
                           flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                onClick={clearFile}
                aria-label="Remove file"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* File info + actions */}
            <div className="flex flex-col justify-between flex-1 min-w-0">
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-medium mb-1">
                    Selected File
                  </p>
                  <p className="text-[14px] font-medium text-[var(--text-primary)] truncate">
                    {selectedFile.name}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                    <span className="text-[11px] text-[var(--text-muted)]">Format</span>
                    <p className="text-[12px] text-[var(--text-secondary)] font-mono">
                      {selectedFile.type.split('/')[1].toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-[var(--text-muted)]">Size</span>
                    <p className="text-[12px] text-[var(--text-secondary)] font-mono">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                {/* Forensic modules */}
                <div>
                  <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-medium mb-1.5">
                    Analysis Modules
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {MODULES.map(m => (
                      <span
                        key={m}
                        className="text-[11px] px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)]"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  id="analyze-btn"
                  onClick={(e) => { e.stopPropagation(); onFileUpload(selectedFile); }}
                  className="btn btn-primary"
                  aria-label="Run forensic analysis"
                >
                  <ScanSearch className="w-4 h-4" />
                  Run Forensic Analysis
                </button>
                <button
                  onClick={clearFile}
                  className="btn btn-secondary"
                >
                  Change File
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Empty dropzone state ── */
          <div className="flex flex-col items-center justify-center p-10 text-center" style={{ minHeight: 280 }}>
            <div className="w-12 h-12 rounded-lg bg-[var(--elevated)] border border-[var(--border)] flex items-center justify-center mb-4">
              {dragActive
                ? <ImageIcon className="w-6 h-6 text-[var(--accent)]" />
                : <Upload className="w-6 h-6 text-[var(--text-muted)]" />
              }
            </div>
            <p className="text-[14px] font-medium text-[var(--text-secondary)] mb-1">
              {dragActive ? 'Drop screenshot here' : 'Drop screenshot here'}
            </p>
            <p className="text-[12px] text-[var(--text-muted)] mb-4">
              or click to browse files
            </p>
            <button
              id="browse-btn"
              className="btn btn-secondary text-xs"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              Browse Files
            </button>
            <p className="text-[11px] text-[var(--text-muted)] mt-3">
              PNG · JPG · JPEG · WebP — max {MAX_SIZE_MB} MB
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {displayError && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--danger)]/8 border border-[var(--danger)]/20"
          role="alert">
          <AlertCircle className="w-4 h-4 text-[var(--danger)] mt-0.5 flex-shrink-0" />
          <p className="text-[13px] text-[var(--danger)]">{displayError}</p>
        </div>
      )}

      {/* Forensic modules reference (when no file selected) */}
      {!selectedFile && (
        <div className="panel">
          <div className="panel-header">
            <FileImage className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">
              Forensic Modules
            </span>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              ['ELA Analysis',         'Error Level Analysis detects JPEG compression inconsistencies'],
              ['Noise Analysis',       'Spatial noise pattern variance detection'],
              ['OCR Extraction',       'Text region extraction and confidence scoring'],
              ['Layout Analysis',      'Document structure and region anomalies'],
              ['Metadata Extraction',  'EXIF data, software signatures, timestamps'],
              ['ML Detection',         'Trained manipulation classifier (when available)'],
            ].map(([name, desc]) => (
              <div key={name} className="p-3 rounded-md bg-[var(--surface)] border border-[var(--border)]">
                <p className="text-[12px] font-medium text-[var(--text-secondary)] mb-0.5">{name}</p>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="disclaimer-bar" role="note">
        <AlertCircle className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          <strong className="text-[var(--text-secondary)] font-medium">Forensic Disclaimer:</strong>{' '}
          VeriShot AI provides a risk assessment, not definitive proof of authenticity or fraud.
          Results should be considered alongside other evidence.
        </p>
      </div>
    </div>
  );
}
