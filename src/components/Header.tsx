import React, { useState } from 'react';
import {
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  FileSpreadsheet,
  RefreshCw,
  DollarSign,
  User as UserIcon,
  LogOut,
  Edit2,
  Check,
  X,
  Store,
  ChevronDown,
  Sun,
  Moon,
  Loader2,
} from 'lucide-react';
import { ActivePage, ExchangeRateConfig, GoogleSheetSyncInfo, ThemeMode } from '../types';
import { AcledaRateModal } from './AcledaRateModal';

interface HeaderProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  exchangeRate: ExchangeRateConfig;
  onUpdateExchangeRate: (
    newBuyRate: number,
    newSellRate: number
  ) => void;
  syncInfo: GoogleSheetSyncInfo;
  isLoggedIn: boolean;
  isLoggingIn?: boolean;
  userEmail?: string | null;
  onOpenSheetModal: () => void;
  onQuickSync: () => void;
  isSyncing: boolean;
  onLogin: () => void;
  onLogout: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePage,
  setActivePage,
  exchangeRate,
  onUpdateExchangeRate,
  syncInfo,
  isLoggedIn,
  isLoggingIn = false,
  userEmail,
  onOpenSheetModal,
  onQuickSync,
  isSyncing,
  onLogin,
  onLogout,
  theme,
  onToggleTheme,
}) => {
  const [isAcledaModalOpen, setIsAcledaModalOpen] = useState(false);

  return (
    <header className="bg-[#161920]/95 backdrop-blur-md border-b border-[#2D333E] shadow-sm w-full max-w-full">
      <div className="w-full max-w-[1760px] mx-auto px-2 sm:px-4 lg:px-5">
        <div className="flex items-center justify-between h-13 sm:h-14 gap-1.5 sm:gap-3">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-950/50 shrink-0">
              <Store className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-bold text-white leading-tight truncate">
                ប្រព័ន្ធគ្រប់គ្រងទំនិញ
              </h1>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                ទិញ-លក់ គិតប្រាក់ចំណេញ ($ & ៛)
              </p>
            </div>
          </div>

          {/* Navigation Tabs (4 Pages - Desktop only) */}
          <nav className="hidden md:flex items-center space-x-1 rounded-xl bg-[#0F1115] p-1 border border-[#2D333E] shrink-0">
            <button
              id="tab-products"
              type="button"
              onClick={() => setActivePage('products')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activePage === 'products'
                  ? 'bg-[#1C212B] text-white border border-[#2D333E]/80 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-[#1C212B]/60'
              }`}
            >
              <Package className="h-4 w-4 text-blue-400" />
              <span>១. ទំនិញ</span>
            </button>

            <button
              id="tab-purchases"
              type="button"
              onClick={() => setActivePage('purchases')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activePage === 'purchases'
                  ? 'bg-[#1C212B] text-white border border-[#2D333E]/80 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-[#1C212B]/60'
              }`}
            >
              <ArrowDownLeft className="h-4 w-4 text-blue-400" />
              <span>២. ទិញចូល (Stock In)</span>
            </button>

            <button
              id="tab-sales"
              type="button"
              onClick={() => setActivePage('sales')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activePage === 'sales'
                  ? 'bg-[#1C212B] text-white border border-[#2D333E]/80 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-[#1C212B]/60'
              }`}
            >
              <ArrowUpRight className="h-4 w-4 text-emerald-400" />
              <span>៣. លក់ចេញ (POS Register)</span>
            </button>

            <button
              id="tab-reports"
              type="button"
              onClick={() => setActivePage('reports')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activePage === 'reports'
                  ? 'bg-[#1C212B] text-white border border-[#2D333E]/80 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-[#1C212B]/60'
              }`}
            >
              <BarChart3 className="h-4 w-4 text-purple-400" />
              <span>៤. របាយការណ៍ (Reports)</span>
            </button>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {/* Exchange Rate Badge */}
            <button
              id="btn-open-acleda-rate-modal"
              type="button"
              onClick={() => setIsAcledaModalOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-amber-500/40 bg-[#161F2E] hover:bg-[#1A2638] px-1.5 py-1 sm:px-2.5 sm:py-1.5 text-xs text-slate-200 shadow-sm transition-all hover:border-amber-400 group cursor-pointer shrink-0"
              title="ចុចដើម្បីពិនិត្យ ឬផ្លាស់ប្ដូរអត្រាទិញ និងអត្រាលក់"
            >
              <div className="hidden sm:flex flex-col text-left">
                <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-semibold leading-tight">
                  <span>អត្រាប្ដូរប្រាក់</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
                  <span className="text-blue-400" title="អត្រាទិញ">
                    ទិញ:{(exchangeRate.buyRate || 4000).toLocaleString('km-KH')}៛
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="text-emerald-400" title="អត្រាលក់">
                    លក់:{(exchangeRate.sellRate || 4100).toLocaleString('km-KH')}៛
                  </span>
                </div>
              </div>
              {/* Mobile compact rate */}
              <div className="flex sm:hidden flex-col text-left font-mono text-[10px] font-bold leading-tight">
                <span className="text-blue-400">
                  {(exchangeRate.buyRate || 4000).toLocaleString('km-KH')}៛
                </span>
                <span className="text-emerald-400">
                  {(exchangeRate.sellRate || 4100).toLocaleString('km-KH')}៛
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-slate-400 group-hover:text-amber-300 transition-colors shrink-0" />
            </button>

            {/* Google Sheets Trigger */}
            <div className="flex items-center shrink-0">
              <button
                id="btn-open-google-sheets-modal"
                type="button"
                onClick={onOpenSheetModal}
                className={`inline-flex items-center gap-1.5 rounded-xl border p-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold shadow-2xs transition-all ${
                  syncInfo.spreadsheetId
                    ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-950/70'
                    : 'border-[#2D333E] bg-[#1C212B] text-slate-300 hover:bg-[#252C3A]'
                }`}
                title="គ្រប់គ្រង Google Sheets"
              >
                <FileSpreadsheet className={`h-4 w-4 shrink-0 ${syncInfo.spreadsheetId ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className="hidden md:inline">
                  {syncInfo.spreadsheetId ? 'Google Sheets' : 'ភ្ជាប់ Sheets'}
                </span>
                {syncInfo.spreadsheetId && (
                  <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                )}
              </button>

              {syncInfo.spreadsheetId && (
                <button
                  id="btn-quick-sync"
                  type="button"
                  disabled={isSyncing}
                  onClick={onQuickSync}
                  className="ml-1 rounded-xl p-1.5 text-emerald-400 hover:bg-[#1C212B] active:bg-[#252C3A] border border-emerald-500/30 transition-colors disabled:opacity-50"
                  title="Sync ទិន្នន័យទៅ Google Sheet"
                >
                  <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            {/* Day / Night Theme Switcher (បន្ថែម theme ថ្ងៃ និង យប់) */}
            <button
              id="btn-toggle-theme"
              type="button"
              onClick={onToggleTheme}
              className={`inline-flex items-center gap-1 rounded-xl border p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer select-none active:scale-95 shrink-0 ${
                theme === 'light'
                  ? 'border-amber-400/60 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:border-amber-500'
                  : 'border-[#2D333E] bg-[#1C212B] text-slate-200 hover:text-white hover:bg-[#252C3A]'
              }`}
              title={theme === 'light' ? 'ប្តូរទៅ Theme យប់ (Dark Mode)' : 'ប្តូរទៅ Theme ថ្ងៃ (Light Mode)'}
            >
              {theme === 'light' ? (
                <>
                  <Sun className="h-4 w-4 text-amber-500 fill-amber-400 shrink-0" />
                  <span className="font-bold hidden sm:inline">ថ្ងៃ</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-indigo-400 fill-indigo-400/30 shrink-0" />
                  <span className="font-bold hidden sm:inline">យប់</span>
                </>
              )}
            </button>

            {/* User Account / Google Login */}
            {isLoggedIn ? (
              <div className="flex items-center gap-1 pl-1 sm:pl-2 border-l border-[#2D333E] shrink-0">
                <div
                  className="flex items-center gap-1.5 rounded-xl bg-[#1C212B] p-1.5 sm:px-2.5 sm:py-1 text-xs text-slate-300 border border-[#2D333E]"
                  title={userEmail || ''}
                >
                  <UserIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="hidden lg:inline max-w-[120px] truncate font-medium">
                    {userEmail}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-xl p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                  title="ចាកចេញ (Sign out)"
                >
                  <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                </button>
              </div>
            ) : (
              <button
                id="btn-header-login"
                type="button"
                onClick={onLogin}
                disabled={isLoggingIn}
                className={`gsi-material-button inline-flex items-center gap-1.5 rounded-xl border border-[#2D333E] bg-[#1C212B] p-1.5 sm:px-3 sm:py-1.5 text-xs font-medium text-slate-200 shadow-2xs hover:bg-[#252C3A] active:bg-[#2A3342] transition-colors shrink-0 ${
                  isLoggingIn ? 'opacity-60 cursor-not-allowed' : ''
                }`}
                title="ចូលគណនី Google"
              >
                {isLoggingIn ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400 shrink-0" />
                ) : (
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                )}
                <span className="hidden sm:inline">
                  {isLoggingIn ? 'កំពុងចូល...' : 'ចូល Google'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Tabs (visible on mobile screens) - Perfect 4 Equal Columns */}
        <div className="grid grid-cols-4 gap-1 py-1.5 border-t border-[#2D333E] md:hidden w-full">
          <button
            type="button"
            onClick={() => setActivePage('products')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 text-[10px] sm:text-xs font-semibold rounded-lg text-center transition-all ${
              activePage === 'products' ? 'bg-[#1C212B] text-blue-400 border border-[#2D333E]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate w-full text-center">១. ទំនិញ</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePage('purchases')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 text-[10px] sm:text-xs font-semibold rounded-lg text-center transition-all ${
              activePage === 'purchases' ? 'bg-[#1C212B] text-blue-400 border border-[#2D333E]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownLeft className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate w-full text-center">២. ទិញចូល</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePage('sales')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 text-[10px] sm:text-xs font-semibold rounded-lg text-center transition-all ${
              activePage === 'sales' ? 'bg-[#1C212B] text-emerald-400 border border-[#2D333E]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate w-full text-center">៣. លក់ចេញ</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePage('reports')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 text-[10px] sm:text-xs font-semibold rounded-lg text-center transition-all ${
              activePage === 'reports' ? 'bg-[#1C212B] text-purple-400 border border-[#2D333E]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate w-full text-center">៤. របាយការណ៍</span>
          </button>
        </div>
      </div>

      {/* Exchange Rate Modal */}
      <AcledaRateModal
        isOpen={isAcledaModalOpen}
        onClose={() => setIsAcledaModalOpen(false)}
        currentRate={exchangeRate}
        onSelectRate={(newBuyRate, newSellRate) => {
          onUpdateExchangeRate(newBuyRate, newSellRate);
        }}
      />
    </header>
  );
};
