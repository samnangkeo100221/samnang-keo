import React, { useState } from 'react';
import {
  FileSpreadsheet,
  X,
  ExternalLink,
  UploadCloud,
  DownloadCloud,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { GoogleSheetSyncInfo } from '../types';
import { extractSpreadsheetId } from '../services/googleSheets';

interface GoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncInfo: GoogleSheetSyncInfo;
  isLoggedIn: boolean;
  isLoggingIn?: boolean;
  userEmail?: string | null;
  onLogin: () => void;
  onCreateNewSheet: (title: string) => Promise<void>;
  onConnectExistingSheet: (idOrUrl: string) => Promise<void>;
  onExportToSheet: () => Promise<void>;
  onImportFromSheet: () => Promise<void>;
  isProcessing: boolean;
  productCount?: number;
  purchaseCount?: number;
  saleCount?: number;
}

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({
  isOpen,
  onClose,
  syncInfo,
  isLoggedIn,
  isLoggingIn = false,
  userEmail,
  onLogin,
  onCreateNewSheet,
  onConnectExistingSheet,
  onExportToSheet,
  onImportFromSheet,
  isProcessing,
  productCount,
  purchaseCount,
  saleCount,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'create' | 'connect'>('status');
  const [newSheetTitle, setNewSheetTitle] = useState('ប្រព័ន្ធគ្រប់គ្រងទំនិញ-Store_Database');
  const [existingSheetInput, setExistingSheetInput] = useState(
    () => syncInfo.spreadsheetId || '159SBfFQDZElBC1ZzFzp2q92zHREpg0nNK9bdfXfgdjU'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!newSheetTitle.trim()) {
      setErrorMessage('សូមបញ្ចូលឈ្មោះ Google Sheet');
      return;
    }
    try {
      await onCreateNewSheet(newSheetTitle.trim());
      setActiveTab('status');
    } catch (err: any) {
      setErrorMessage(err.message || 'បរាជ័យក្នុងការបង្កើត Sheet');
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const cleaned = extractSpreadsheetId(existingSheetInput);
    if (!cleaned) {
      setErrorMessage('សូមបញ្ចូល Spreadsheet ID ឬ Google Sheet URL ត្រឹមត្រូវ');
      return;
    }
    try {
      await onConnectExistingSheet(cleaned);
      setActiveTab('status');
    } catch (err: any) {
      setErrorMessage(err.message || 'បរាជ័យក្នុងការភ្ជាប់ Sheet');
    }
  };

  return (
    <div
      id="googlesheet-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
    >
      <div
        id="googlesheet-modal-container"
        className="w-full max-w-xl rounded-2xl bg-[#161920] p-6 shadow-2xl border border-[#2D333E] animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col text-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2D333E]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                ការភ្ជាប់ជាមួយ Google Sheets
              </h2>
              <p className="text-xs text-slate-400">
                ទាញយក និងរក្សាទុកទិន្នន័យស្តុក ទិញ-លក់ ទៅ Google Sheet
              </p>
            </div>
          </div>
          <button
            id="btn-close-sheet-modal"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#1C212B] hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Auth Check */}
        {!isLoggedIn ? (
          <div className="my-4 space-y-4">
            {/* Offline / Local Snapshot Status Card */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                <h4 className="text-sm font-bold text-emerald-400">
                  ទិន្នន័យចុងក្រោយពី Google Sheet (រក្សាទុកក្នុងម៉ាស៊ីន)
                </h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                កម្មវិធីបានរក្សាទុកទិន្នន័យដែលបានធ្វើបច្ចុប្បន្នភាពចុងក្រោយពី Google Sheet ក្នុងម៉ាស៊ីនរួចជាស្រេច។ រាល់ពេល Reload ទំព័រ ឬ Logout ចេញពីគណនី ទិន្នន័យនេះនៅតែបង្ហាញជាទិន្នន័យដើមជានិច្ច!
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-[#12151B] p-2 border border-[#2D333E]">
                  <span className="text-slate-400 text-[10px] block">ទំនិញក្នុងស្តុក</span>
                  <span className="font-bold text-emerald-300 text-sm">{(productCount ?? 0)} មុខ</span>
                </div>
                <div className="rounded-lg bg-[#12151B] p-2 border border-[#2D333E]">
                  <span className="text-slate-400 text-[10px] block">ទិញចូល</span>
                  <span className="font-bold text-blue-300 text-sm">{(purchaseCount ?? 0)} កំណត់ត្រា</span>
                </div>
                <div className="rounded-lg bg-[#12151B] p-2 border border-[#2D333E]">
                  <span className="text-slate-400 text-[10px] block">លក់ចេញ</span>
                  <span className="font-bold text-amber-300 text-sm">{(saleCount ?? 0)} វិក្កយបត្រ</span>
                </div>
              </div>
              {syncInfo.lastSyncedAt ? (
                <div className="mt-2.5 text-[11px] text-emerald-300/80 text-center font-mono">
                  ធ្វើបច្ចុប្បន្នភាពចុងក្រោយ៖ {new Date(syncInfo.lastSyncedAt).toLocaleString('km-KH')}
                </div>
              ) : (
                <div className="mt-2.5 text-[11px] text-slate-400 text-center">
                  ទិន្នន័យ Google Sheet រក្សាទុកក្នុង browser storage
                </div>
              )}
            </div>

            {/* Connect button for pulling live changes */}
            <div className="rounded-xl border border-[#2D333E] bg-[#12151B] p-4 text-center">
              <h5 className="text-xs font-semibold text-slate-200 mb-1">
                ចង់ធ្វើបច្ចុប្បន្នភាពទិន្នន័យថ្មីៗបន្ថែមពី Google Sheet មែនទេ?
              </h5>
              <p className="text-[11px] text-slate-400 mb-3 max-w-md mx-auto">
                សូមចុចចូលគណនី Google ដើម្បីទាញយកទិន្នន័យថ្មីបំផុតពី Google Sheet ឬបញ្ជូនទិន្នន័យទៅ Sheet ដោយស្វ័យប្រវត្តិ៖
              </p>
              <div className="flex justify-center">
                <button
                  id="btn-login-from-modal"
                  type="button"
                  onClick={onLogin}
                  disabled={isLoggingIn || isProcessing}
                  className={`gsi-material-button inline-flex items-center gap-3 rounded-xl border border-[#2D333E] bg-[#1C212B] px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#252C3A] active:bg-[#2D3546] transition-colors cursor-pointer ${
                    isLoggingIn || isProcessing ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoggingIn ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                  )}
                  <span>
                    {isLoggingIn ? 'កំពុងចូលគណនី...' : 'ចូលគណនី Google (Sign in with Google)'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-4 space-y-5">
            {/* Account Info Bar */}
            <div className="flex items-center justify-between rounded-xl bg-[#12151B] p-3 border border-[#2D333E] text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="text-slate-400">គណនីភ្ជាប់៖</span>
                <span className="font-semibold text-white">{userEmail}</span>
              </div>
              <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-medium">
                ភ្ជាប់រួចរាល់
              </span>
            </div>

            {/* Navigation Tabs inside modal */}
            <div className="flex rounded-xl bg-[#12151B] p-1 border border-[#2D333E]">
              <button
                type="button"
                onClick={() => setActiveTab('status')}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                  activeTab === 'status'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ស្ថានភាព Sheet
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                  activeTab === 'create'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                + បង្កើត Sheet ថ្មី
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('connect')}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                  activeTab === 'connect'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ភ្ជាប់ Sheet ដែលមានស្រាប់
              </button>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* TAB: STATUS */}
            {activeTab === 'status' && (
              <div className="space-y-4">
                {syncInfo.spreadsheetId ? (
                  <div className="rounded-2xl border border-[#2D333E] bg-[#121722] p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          Google Sheet បានភ្ជាប់ជោគជ័យ
                        </span>
                        <h4 className="mt-1 text-sm font-bold text-white">
                          {syncInfo.spreadsheetTitle || 'ប្រព័ន្ធគ្រប់គ្រងទំនិញ-Store_Database'}
                        </h4>
                        <p className="mt-0.5 font-mono text-xs text-slate-400 truncate max-w-sm">
                          ID: {syncInfo.spreadsheetId}
                        </p>
                      </div>
                      {syncInfo.spreadsheetUrl && (
                        <a
                          href={syncInfo.spreadsheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-[#1C212B] border border-[#2D333E] px-3 py-1.5 rounded-lg shadow-sm hover:bg-[#252C3A] transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>បើកមើល Sheet</span>
                        </a>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#2D333E] flex items-center justify-between text-xs text-slate-400">
                      <span>Sync ចុងក្រោយ៖</span>
                      <span className="font-medium text-white">
                        {syncInfo.lastSyncedAt
                          ? new Date(syncInfo.lastSyncedAt).toLocaleString('km-KH')
                          : 'មិនទាន់បាន Sync'}
                      </span>
                    </div>

                    {/* Action Sync Buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        id="btn-export-to-sheet"
                        type="button"
                        disabled={isProcessing}
                        onClick={onExportToSheet}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-950/40 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 transition-colors"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UploadCloud className="h-4 w-4" />
                        )}
                        <span>រក្សាទុកទៅ Sheet (Export)</span>
                      </button>

                      <button
                        id="btn-import-from-sheet"
                        type="button"
                        disabled={isProcessing}
                        onClick={onImportFromSheet}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#2D333E] bg-[#1C212B] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#252C3A] active:bg-[#2D3546] disabled:opacity-50 transition-colors"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        ) : (
                          <DownloadCloud className="h-4 w-4 text-emerald-400" />
                        )}
                        <span>ទាញយកពី Sheet (Import)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#2D333E] bg-[#12151B] p-6 text-center space-y-3">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#1C212B] text-slate-400">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        មិនទាន់មានការភ្ជាប់ Google Sheet នៅឡើយទេ
                      </h4>
                      <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                        អ្នកអាចបង្កើត Google Sheet ថ្មីដោយស្វ័យប្រវត្តិ ឬភ្ជាប់ Sheet ដែលមានស្រាប់
                      </p>
                    </div>
                    <div className="flex justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('create')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white shadow-md shadow-emerald-950/40 hover:bg-emerald-500 transition-colors"
                      >
                        <PlusCircle className="h-4 w-4" />
                        <span>បង្កើត Sheet ថ្មី</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('connect')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#2D333E] bg-[#1C212B] px-3.5 py-2 text-xs font-medium text-slate-200 shadow-sm hover:bg-[#252C3A] transition-colors"
                      >
                        <span>ភ្ជាប់ Sheet មានស្រាប់</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Information Card */}
                <div className="rounded-xl border border-[#2D333E] bg-[#12151B] p-3.5 text-xs text-slate-300 flex items-start gap-2.5">
                  <HelpCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-white">របៀបដំណើរការ៖</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-400">
                      <li>Google Sheet នឹងមាន ៤ សន្លឹក៖ ទំនិញ, ទិញចូល, លក់ចេញ, និង ការកំណត់</li>
                      <li>
                        <strong>រក្សាទុក (Export):</strong> បញ្ជូនទិន្នន័យទាំងអស់ពីកម្មវិធីទៅកាន់ Google Sheet
                      </li>
                      <li>
                        <strong>ទាញយក (Import):</strong> ផ្ទុកទិន្នន័យចុងក្រោយពី Google Sheet ចូលកម្មវិធីវិញ
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CREATE NEW */}
            {activeTab === 'create' && (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    ឈ្មោះ Google Spreadsheet ថ្មី
                  </label>
                  <input
                    type="text"
                    value={newSheetTitle}
                    onChange={(e) => setNewSheetTitle(e.target.value)}
                    placeholder="ឧ. បញ្ជីទំនិញហាងខ្មែរ"
                    className="w-full rounded-xl border border-[#2D333E] bg-[#0F1115] text-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden"
                    required
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    ប្រព័ន្ធនឹងបង្កើត Spreadsheet មួយក្នុង Google Drive របស់អ្នកដោយមាន ៤ Tabs រួចជាស្រេច
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('status')}
                    className="rounded-xl border border-[#2D333E] bg-[#1C212B] px-4 py-2 text-xs font-medium text-slate-300 hover:bg-[#252C3A]"
                  >
                    ត្រឡប់ក្រោយ
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-950/40 hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                    <span>បង្កើត និងភ្ជាប់ឥឡូវនេះ</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB: CONNECT EXISTING */}
            {activeTab === 'connect' && (
              <form onSubmit={handleConnect} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Google Spreadsheet URL ឬ ID
                  </label>
                  <input
                    type="text"
                    value={existingSheetInput}
                    onChange={(e) => setExistingSheetInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XR.../edit"
                    className="w-full rounded-xl border border-[#2D333E] bg-[#0F1115] text-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden font-mono text-xs"
                    required
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-slate-400">Sheet ដែលបានស្នើ៖</span>
                    <button
                      type="button"
                      onClick={() => setExistingSheetInput('159SBfFQDZElBC1ZzFzp2q92zHREpg0nNK9bdfXfgdjU')}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-mono text-[11px] text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                      <FileSpreadsheet className="h-3 w-3" />
                      159SBfFQDZElBC1ZzFzp2q92zHREpg0nNK9bdfXfgdjU
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('status')}
                    className="rounded-xl border border-[#2D333E] bg-[#1C212B] px-4 py-2 text-xs font-medium text-slate-300 hover:bg-[#252C3A]"
                  >
                    ត្រឡប់ក្រោយ
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-950/40 hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span>ភ្ជាប់ Sheet នេះ</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-[#2D333E] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#2D333E] bg-[#1C212B] px-4 py-1.5 text-xs font-medium text-slate-300 hover:bg-[#252C3A]"
          >
            បិទ (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
