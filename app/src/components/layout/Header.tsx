import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Download,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Newspaper,
  Search,
  Settings,
  Sparkles,
  Sun,
  Timer,
  X,
} from 'lucide-react';
import { QuickAddTask } from '../tasks/QuickAddTask';
import { useTheme } from '../../context/ThemeContext';
import { DataExportImport } from '../common/DataPortability';
import { SyncStatus } from '../common/SyncStatus';
import { ExpandableModal } from '../common/ExpandableModal';
import { LoginModal } from '../auth/LoginModal';
import { AccountSettings } from '../auth/AccountSettings';
import { useAuth } from '../../context/AuthContext';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import {
  isPrimaryDestinationActive,
  PRIMARY_NAV_ITEMS,
  useInboxCount,
} from './navigation';

interface HeaderProps {
  onOpenFocusTimer?: () => void;
}

const utilityButtonClass =
  'ui-control ui-button ui-button--ghost flex w-full items-center gap-3 px-3 text-left';

export function Header({ onOpenFocusTimer }: HeaderProps) {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut, isConfigured } = useAuth();
  const inboxCount = useInboxCount();
  const [utilityOpen, setUtilityOpen] = useState(false);
  const [dataModalOpen, setDataModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const utilityDialogRef = useDialogFocus<HTMLDivElement>(utilityOpen);
  const accountDialogRef = useDialogFocus<HTMLDivElement>(accountModalOpen);

  useEffect(() => {
    if (!utilityOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setUtilityOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [utilityOpen]);

  const closeUtilities = () => setUtilityOpen(false);

  const triggerSearch = () => {
    closeUtilities();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
  };

  return (
    <>
      <header className="safe-area-pt sticky top-0 z-40 border-b border-[var(--rule-strong)] bg-[var(--surface)] text-[var(--ink)]">
        <div className="mx-auto flex h-14 max-w-[96rem] items-center gap-3 px-3 md:px-6">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2 font-semibold tracking-[-0.02em] text-[var(--ink)]"
            aria-label="Assisy Today"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--action)] text-[var(--action-ink)]">
              <Sparkles size={16} aria-hidden="true" />
            </span>
            <span className="hidden sm:inline">Assisy</span>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-stretch justify-center md:flex" aria-label="Primary">
            {PRIMARY_NAV_ITEMS.map(item => {
              const active = isPrimaryDestinationActive(pathname, item.to);
              const navClass = `relative flex min-h-14 items-center gap-2 border-b-2 px-3 text-sm font-semibold ${
                active
                  ? 'border-[var(--action)] text-[var(--ink)]'
                  : 'border-transparent text-[var(--ink-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]'
              }`;

              if (item.to !== '/tasks') {
                return (
                  <NavLink key={item.to} to={item.to} className={navClass} aria-current={active ? 'page' : undefined}>
                    <item.icon size={16} aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              }

              return (
                <span key={item.to} className="relative flex">
                  <NavLink to="/tasks" className={`${navClass} pr-9`} aria-current={active ? 'page' : undefined}>
                    <item.icon size={16} aria-hidden="true" />
                    <span>Tasks</span>
                  </NavLink>
                  {inboxCount > 0 && (
                    <span
                      className="pointer-events-none absolute right-2 top-1/2 z-10 min-w-5 -translate-y-1/2 rounded-full bg-[var(--danger)] px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums text-[var(--ink-inverse)]"
                      aria-hidden="true"
                    >
                      {inboxCount > 99 ? '99+' : inboxCount}
                    </span>
                  )}
                </span>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <QuickAddTask />
            <button
              type="button"
              onClick={() => setUtilityOpen(true)}
              className="ui-control ui-icon-button inline-flex items-center justify-center"
              aria-label="Open utilities"
              aria-expanded={utilityOpen}
              aria-haspopup="dialog"
            >
              <Menu size={19} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {utilityOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--surface-overlay)]"
            onClick={closeUtilities}
            aria-label="Close utilities"
          />
          <div
            ref={utilityDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="utility-menu-title"
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex w-[min(22rem,calc(100vw-2rem))] flex-col border-l border-[var(--rule-strong)] bg-[var(--surface-raised)] text-[var(--ink)] shadow-[var(--shadow-elevated)] outline-none"
          >
            <div className="flex h-14 items-center justify-between border-b border-[var(--rule)] px-4">
              <div>
                <h2 id="utility-menu-title" className="text-sm font-bold">Desk utilities</h2>
                <p className="text-xs text-[var(--ink-muted)]">Tools and account</p>
              </div>
              <button
                type="button"
                onClick={closeUtilities}
                className="ui-control ui-icon-button inline-flex items-center justify-center"
                aria-label="Close utilities"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="border-b border-[var(--rule)] px-4 py-3">
              <SyncStatus />
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <nav className="border-b border-[var(--rule)] pb-3" aria-label="Utility destination">
                <NavLink
                  to="/feed"
                  onClick={closeUtilities}
                  className={({ isActive }) =>
                    `${utilityButtonClass} ${isActive ? 'bg-[var(--state-selected)] text-[var(--ink)]' : ''}`
                  }
                >
                  <Newspaper size={17} aria-hidden="true" />
                  <span>Feed</span>
                </NavLink>
              </nav>

              <div className="space-y-1 border-b border-[var(--rule)] py-3">
                <button type="button" onClick={triggerSearch} className={utilityButtonClass}>
                  <Search size={17} aria-hidden="true" />
                  <span>Search</span>
                  <kbd className="ml-auto font-mono text-xs text-[var(--ink-muted)]">⌘K</kbd>
                </button>
                {onOpenFocusTimer && (
                  <button
                    type="button"
                    onClick={() => {
                      closeUtilities();
                      onOpenFocusTimer();
                    }}
                    className={utilityButtonClass}
                  >
                    <Timer size={17} aria-hidden="true" />
                    <span>Focus timer</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    closeUtilities();
                    setDataModalOpen(true);
                  }}
                  className={utilityButtonClass}
                >
                  <Download size={17} aria-hidden="true" />
                  <span>Backup &amp; restore</span>
                </button>
                <button type="button" onClick={toggleTheme} className={utilityButtonClass}>
                  {theme === 'dark' ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
                  <span>{theme === 'dark' ? 'Use light theme' : 'Use dark theme'}</span>
                </button>
              </div>

              {isConfigured && (
                <div className="space-y-1 pt-3">
                  {user ? (
                    <>
                      <p className="truncate px-3 pb-2 text-xs text-[var(--ink-muted)]">{user.email}</p>
                      <button
                        type="button"
                        onClick={() => {
                          closeUtilities();
                          setAccountModalOpen(true);
                        }}
                        className={utilityButtonClass}
                      >
                        <Settings size={17} aria-hidden="true" />
                        <span>Account settings</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void signOut();
                          closeUtilities();
                        }}
                        className={utilityButtonClass}
                      >
                        <LogOut size={17} aria-hidden="true" />
                        <span>Sign out</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        closeUtilities();
                        setLoginModalOpen(true);
                      }}
                      className={utilityButtonClass}
                    >
                      <LogIn size={17} aria-hidden="true" />
                      <span>Sign in</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ExpandableModal
        isOpen={dataModalOpen}
        onClose={() => setDataModalOpen(false)}
        title="Backup & Restore"
        icon={<Download className="h-5 w-5 text-[var(--action)]" />}
      >
        {() => (
          <div className="p-6">
            <DataExportImport onClose={() => setDataModalOpen(false)} />
          </div>
        )}
      </ExpandableModal>

      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

      {accountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--surface-overlay)]"
            onClick={() => setAccountModalOpen(false)}
            aria-label="Close account settings"
          />
          <div className="relative w-full max-w-sm overflow-hidden rounded-[var(--radius-lg)] border border-[var(--rule-strong)] bg-[var(--surface-raised)] shadow-[var(--shadow-elevated)]">
            <div
              ref={accountDialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Account settings"
              tabIndex={-1}
              className="outline-none"
            >
              <AccountSettings onClose={() => setAccountModalOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
