// VeriShot AI — TypeScript Type Definitions

export type RiskLevel = 'likely_genuine' | 'suspicious' | 'potentially_manipulated';
export type Page = 'home' | 'history' | 'settings' | 'about';
export type ScreenshotType = 
  | 'payment' 
  | 'bank_transaction' 
  | 'invoice' 
  | 'receipt' 
  | 'notification' 
  | 'ticket' 
  | 'generic_document' 
  | 'unknown';
export type ModuleStatus = 'ok' | 'unavailable' | 'error';

export interface OCRItem {
  text: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
}

export interface ForensicSignals {
  ela_score: number;
  ela_status: ModuleStatus;
  noise_score: number;
  noise_status: ModuleStatus;
  text_score: number;
  text_status: ModuleStatus;
  layout_score: number;
  layout_status: ModuleStatus;
}

export interface SuspiciousRegion {
  label: string;
  bbox: [number, number, number, number];
  confidence: number;
  reason: string;
}

export interface MetadataInfo {
  has_exif: boolean;
  software?: string | null;
  creation_date?: string | null;
  modification_date?: string | null;
  camera_make?: string | null;
  camera_model?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  color_profile?: string | null;
  warnings: string[];
}

export interface AnalysisResult {
  risk_score: number;
  risk_level: RiskLevel;
  screenshot_type: ScreenshotType;
  
  ml_score?: number | null;
  ml_status: ModuleStatus;
  ml_available: boolean;
  
  forensic_signals: ForensicSignals;
  
  suspicious_regions: SuspiciousRegion[];
  ocr_results: OCRItem[];
  metadata: MetadataInfo;
  
  // Base64-encoded images
  ela_image_b64?: string | null;
  gradcam_image_b64?: string | null;
  annotated_image_b64?: string | null;
  
  explanation: string[];
  warnings: string[];
}

export interface HistoryEntry {
  id: number;
  timestamp: string;
  filename: string;
  risk_score: number;
  risk_level: string;
  screenshot_type: string;
  ml_score?: number | null;
}

export interface HealthStatus {
  status: string;
  ml_model_loaded: boolean;
  ocr_available: boolean;
  version: string;
}

export type AnalysisState = 
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'analyzing'; step: string }
  | { status: 'complete'; result: AnalysisResult; file: File }
  | { status: 'error'; message: string };

export type ImageView = 'original' | 'ela' | 'gradcam' | 'annotated';

// Risk level helpers
export const RISK_COLORS: Record<RiskLevel, string> = {
  likely_genuine: '#22c55e',
  suspicious: '#f59e0b', 
  potentially_manipulated: '#ef4444',
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  likely_genuine: 'Likely Genuine',
  suspicious: 'Suspicious',
  potentially_manipulated: 'Potentially Manipulated',
};

export const RISK_ICONS: Record<RiskLevel, string> = {
  likely_genuine: '✓',
  suspicious: '⚠',
  potentially_manipulated: '✗',
};

export const SCREENSHOT_TYPE_LABELS: Record<ScreenshotType, string> = {
  payment: 'Payment',
  bank_transaction: 'Bank Transaction',
  invoice: 'Invoice',
  receipt: 'Receipt',
  notification: 'Notification',
  ticket: 'Ticket',
  generic_document: 'Document',
  unknown: 'Unknown',
};
