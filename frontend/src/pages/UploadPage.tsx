import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, ImageIcon, AlertCircle, Zap, Shield, Eye, Activity } from 'lucide-react';

interface UploadPageProps {
  onFileUpload: (file: File) => void;
  error?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 20;

export function UploadPage({ onFileUpload, error }: UploadPageProps) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup preview on unmount
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Unsupported format: ${file.type}. Please use PNG, JPG, or WebP.`;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: ${MAX_SIZE_MB} MB.`;
    }
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
    const url = URL.createObjectURL(file);
    setPreview(url);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else {
      setDragActive(false);
    }
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

  const handleAnalyze = () => {
    if (selectedFile) {
      onFileUpload(selectedFile);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.div
      key="upload"
      className="max-w-3xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Hero Section */}
      <motion.div className="text-center mb-12" variants={itemVariants}>
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full 
                     bg-brand-500/10 border border-brand-500/20 mb-6"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Activity className="w-4 h-4 text-brand-400" />
          <span className="text-sm text-brand-300 font-medium">
            AI-Powered Digital Forensics
          </span>
        </motion.div>

        {/* Logo and Hero Title */}
        <div className="flex flex-col items-center justify-center mb-4">
          <motion.div
            className="relative mb-5"
            whileHover={{ scale: 1.05, rotate: [0, -2, 2, 0] }}
            transition={{ duration: 0.4 }}
          >
            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/30 to-brand-500/30 rounded-3xl blur-xl opacity-75 animate-pulse" />
            <img
              src="/logo.png"
              alt="VeriShot AI Logo"
              className="relative w-28 h-28 object-contain drop-shadow-[0_0_25px_rgba(6,182,212,0.4)]"
            />
          </motion.div>

          <h1 className="text-5xl sm:text-6xl font-bold mb-2 leading-tight">
            <span className="text-gradient-brand">VeriShot</span>
            <span className="text-white"> AI</span>
          </h1>
        </div>
        <p className="text-2xl font-light text-surface-300 mb-3">
          Verify before you trust.
        </p>
        <p className="text-surface-500 max-w-lg mx-auto leading-relaxed">
          Upload a screenshot — payment confirmation, bank transaction, invoice, 
          or receipt — for multi-signal forensic analysis.
        </p>
      </motion.div>

      {/* Feature pills */}
      <motion.div 
        className="flex flex-wrap justify-center gap-3 mb-10"
        variants={itemVariants}
      >
        {[
          { icon: <Eye className="w-3.5 h-3.5" />, label: 'ELA Analysis' },
          { icon: <Zap className="w-3.5 h-3.5" />, label: 'AI Detection' },
          { icon: <Shield className="w-3.5 h-3.5" />, label: 'OCR Forensics' },
          { icon: <Activity className="w-3.5 h-3.5" />, label: 'Noise Analysis' },
        ].map((f) => (
          <div
            key={f.label}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                       bg-surface-800/80 border border-surface-700 
                       text-surface-300 text-xs font-medium"
          >
            <span className="text-brand-400">{f.icon}</span>
            {f.label}
          </div>
        ))}
      </motion.div>

      {/* Upload Zone */}
      <motion.div variants={itemVariants}>
        <div
          className={`upload-zone p-8 sm:p-12 text-center ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !selectedFile && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            id="file-input"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleInputChange}
            className="hidden"
          />

          {preview ? (
            <div className="space-y-6">
              {/* Preview */}
              <div className="relative inline-block">
                <img
                  src={preview}
                  alt="Upload preview"
                  className="max-h-64 max-w-full object-contain rounded-xl 
                             border border-surface-700 shadow-2xl mx-auto"
                />
                <button
                  className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-surface-700 
                             hover:bg-surface-600 border border-surface-600 
                             flex items-center justify-center text-surface-300 text-sm
                             transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreview(null);
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  ✕
                </button>
              </div>
              
              {selectedFile && (
                <p className="text-sm text-surface-400">
                  {selectedFile.name} — {(selectedFile.size / 1024).toFixed(0)} KB
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <motion.button
                  id="analyze-btn"
                  onClick={(e) => { e.stopPropagation(); handleAnalyze(); }}
                  className="px-8 py-3 rounded-xl font-semibold text-white
                             bg-gradient-to-r from-brand-600 to-brand-500
                             hover:from-brand-500 hover:to-brand-400
                             shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40
                             transition-all duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Analyze Screenshot
                </motion.button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreview(null);
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-8 py-3 rounded-xl font-semibold text-surface-300
                             bg-surface-800 hover:bg-surface-700 border border-surface-700
                             transition-all duration-200"
                >
                  Change Image
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              <motion.div
                animate={{ 
                  y: dragActive ? -8 : 0,
                  scale: dragActive ? 1.1 : 1,
                }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="w-20 h-20 mx-auto rounded-2xl bg-brand-500/10 
                                border border-brand-500/20 flex items-center justify-center
                                group-hover:bg-brand-500/15 transition-colors">
                  {dragActive ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      <ImageIcon className="w-10 h-10 text-brand-400" />
                    </motion.div>
                  ) : (
                    <Upload className="w-10 h-10 text-brand-400" />
                  )}
                </div>
              </motion.div>

              <div>
                <p className="text-xl font-semibold text-surface-200 mb-2">
                  {dragActive ? 'Drop your screenshot' : 'Drop screenshot here'}
                </p>
                <p className="text-surface-500 text-sm mb-1">or click to browse</p>
                <p className="text-surface-600 text-xs">
                  PNG • JPG • JPEG • WebP — max {MAX_SIZE_MB} MB
                </p>
              </div>

              <button
                id="browse-btn"
                className="px-6 py-2.5 rounded-xl text-sm font-medium 
                           text-brand-300 bg-brand-500/10 border border-brand-500/20
                           hover:bg-brand-500/20 transition-all duration-200"
              >
                Browse Files
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Errors */}
      {(validationError || error) && (
        <motion.div
          className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 
                     flex items-start gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-300 text-sm">{validationError || error}</p>
        </motion.div>
      )}

      {/* Disclaimer */}
      <motion.div
        className="mt-8 p-4 rounded-xl glass-lighter text-center"
        variants={itemVariants}
      >
        <p className="text-surface-500 text-xs leading-relaxed">
          <span className="text-surface-400 font-medium">Important:</span>{' '}
          VeriShot AI provides a <strong className="text-surface-400">forensic risk assessment</strong>,
          not definitive proof of authenticity or fraud. Results should be used as one 
          factor among many in evaluating document authenticity.
        </p>
      </motion.div>
    </motion.div>
  );
}
