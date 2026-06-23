'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useJobs } from '@/hooks/useJobs';
import { useWatchlist } from '@/hooks/useWatchlist';
import { daysUntilDate, daysSince } from '@/utils/helpers';
import { popoverReveal } from '@/utils/motion';
import { LogoMark } from './Logo';
import { DeleteAccountModal } from './DeleteAccountModal';

const NAV_ITEMS = [
  { href: '/about', label: 'About' },
  { href: '/dashboard', label: 'Applications' },
  { href: '/watchlist', label: 'Watchlist' },
];

// Each page mounts its own AppHeader, so the active-pill can't persist across
// navigations via layoutId. Instead we remember the tab you left from (module
// scope survives the remount) and slide the pill in from there on arrival.
let lastNavPath: string | null = null;

const PILL_SPRING = {
  type: 'spring' as const,
  stiffness: 360,
  damping: 30,
  mass: 0.8,
};

// useLayoutEffect on the client (positions the pill before paint), useEffect on
// the server to avoid the SSR warning.
const useIsoLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Shared ribbon: brand, section navigation, theme toggle, and the account
 * menu (sign out / delete account). Used by every signed-in page.
 */
export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut, deleteAccount } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  // Sliding active-tab pill geometry.
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const pillX = useMotionValue(0);
  const pillW = useMotionValue(0);
  const [pillReady, setPillReady] = useState(false);

  // Position the pill under the active tab; slide it in from the previous tab.
  useIsoLayoutEffect(() => {
    const nav = navRef.current;
    const activeEl = itemRefs.current[pathname];
    if (!nav || !activeEl) return;
    const navRect = nav.getBoundingClientRect();
    const measure = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return { left: r.left - navRect.left + nav.scrollLeft, width: r.width };
    };
    const target = measure(activeEl);
    const fromEl =
      lastNavPath && lastNavPath !== pathname
        ? itemRefs.current[lastNavPath]
        : null;
    lastNavPath = pathname;

    if (fromEl) {
      const from = measure(fromEl);
      pillX.set(from.left);
      pillW.set(from.width);
      setPillReady(true);
      const ax = animate(pillX, target.left, PILL_SPRING);
      const aw = animate(pillW, target.width, PILL_SPRING);
      return () => {
        ax.stop();
        aw.stop();
      };
    }

    // No previous tab (fresh load / deep link): just place it.
    pillX.set(target.left);
    pillW.set(target.width);
    setPillReady(true);
  }, [pathname]);

  // Keep the pill aligned to the active tab on viewport resize.
  useEffect(() => {
    const onResize = () => {
      const nav = navRef.current;
      const activeEl = itemRefs.current[pathname];
      if (!nav || !activeEl) return;
      const navRect = nav.getBoundingClientRect();
      const r = activeEl.getBoundingClientRect();
      pillX.set(r.left - navRect.left + nav.scrollLeft);
      pillW.set(r.width);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [pathname, pillX, pillW]);

  // Bell reminders, two kinds merged:
  //  1. Follow-ups that are overdue / due today / due tomorrow (not done).
  //  2. Watchlist entries added more than a week ago (a nudge to act).
  // Clicking a row opens that item's detail modal on the relevant page.
  const { jobs } = useJobs(user);
  const { companies } = useWatchlist(user);

  type Reminder = {
    key: string;
    title: string;
    subtitle: string;
    label: string;
    color: string;
    onOpen: () => void;
  };

  const reminders = useMemo<Reminder[]>(() => {
    const openOnPage = (
      page: string,
      storageKey: string,
      eventName: string,
      id: string,
    ) => {
      setBellOpen(false);
      try {
        sessionStorage.setItem(storageKey, id);
      } catch {
        /* sessionStorage unavailable — fall back to plain navigation */
      }
      window.dispatchEvent(new CustomEvent(eventName, { detail: { id } }));
      router.push(page);
    };

    // 1. Due follow-ups (overdue / today / tomorrow), soonest first.
    const followUps = jobs
      .filter((j) => {
        if (!j.follow_up_date || j.follow_up_done) return false;
        const d = daysUntilDate(j.follow_up_date);
        return d !== null && d <= 1;
      })
      .map((j) => ({ job: j, d: daysUntilDate(j.follow_up_date)! }))
      .sort((a, b) => a.d - b.d)
      .map(
        ({ job, d }): Reminder => ({
          key: `job-${job.id}`,
          title: job.company_name,
          subtitle: job.role,
          label: d < 0 ? 'Overdue' : d === 0 ? 'Today' : 'Tomorrow',
          color: d < 0 ? '#dc2626' : '#d97706',
          onOpen: () =>
            openOnPage(
              '/dashboard',
              'trackitt-open-job',
              'trackitt:open-job',
              job.id,
            ),
        }),
      );

    // 2. Watchlist entries older than a week, oldest first.
    const stale = companies
      .map((c) => ({ c, age: daysSince(c.created_at) }))
      .filter(({ age }) => age >= 7)
      .sort((a, b) => b.age - a.age)
      .map(
        ({ c, age }): Reminder => ({
          key: `watch-${c.id}`,
          title: c.company_name,
          subtitle:
            (c.kind ?? 'Company') === 'Job' && c.role
              ? c.role
              : 'On your watchlist',
          label: `${Math.max(1, Math.floor(age / 7))}w+ ago`,
          color: 'rgb(var(--rgb-ink) / 0.55)',
          onOpen: () =>
            openOnPage(
              '/watchlist',
              'trackitt-open-watch',
              'trackitt:open-watch',
              c.id,
            ),
        }),
      );

    return [...followUps, ...stale];
  }, [jobs, companies, router]);

  const totalCount = reminders.length;

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  useEffect(() => {
    if (!bellOpen) return;
    const onClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [bellOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    router.replace('/login');
  };

  const handleDeleteAccount = async () => {
    await deleteAccount();
    router.replace('/login');
  };

  const userLabel =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    'Account';
  const userInitial = (user?.email?.[0] ?? userLabel[0] ?? 'A').toUpperCase();

  return (
    <div className="bg-secondary">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-10 min-h-20 py-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        {/* Brand */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 font-display font-extrabold text-primary text-2xl tracking-tight"
        >
          <LogoMark size={30} />
          Trackitt
        </Link>

        {/* Section navigation */}
        {/* overflow-x-auto enables horizontal scroll when items don't fit (mobile);
            on desktop it switches to visible. The px-2/-mx-2 "bleed" widens the
            clip box by 8px on each side without shifting layout, so the outline
            and hover-scale of the flush first & last items are never clipped. */}
        <nav
          ref={navRef}
          className="relative order-last w-full sm:order-none sm:w-auto flex items-center gap-4 px-2 -mx-2 overflow-x-auto sm:overflow-x-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {/* The yellow active-tab pill — slides between tabs on navigation. */}
          <motion.span
            aria-hidden="true"
            className="absolute top-1/2 left-0 z-0 h-8 rounded-full bg-accent pointer-events-none"
            style={{ x: pillX, width: pillW, y: '-50%', opacity: pillReady ? 1 : 0 }}
          />
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                ref={(el) => {
                  itemRefs.current[item.href] = el;
                }}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`press group relative z-10 whitespace-nowrap h-8 flex items-center px-3.5 text-sm rounded-full ${
                  active
                    ? 'font-semibold text-[#2d3a3a]'
                    : 'font-medium text-[rgb(var(--rgb-on-dark))] hover:text-accent hover:scale-[1.04]'
                }`}
              >
                {item.label}
                {!active && (
                  /* The rect is inset 1px on every side (via calc width/height)
                     so its full stroke sits inside the link box — otherwise the
                     nav's overflow-x-auto (which forces overflow-y to clip) cuts
                     off the top and bottom of the outline. */
                  <svg className="absolute inset-0 w-full h-full pointer-events-none -scale-y-100 overflow-visible" aria-hidden="true">
                    <rect
                      x="1"
                      y="1"
                      rx="15"
                      ry="15"
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth="0.75"
                      pathLength="10000"
                      style={{ width: 'calc(100% - 2px)', height: 'calc(100% - 2px)' }}
                      className="opacity-0 group-hover:opacity-100 [stroke-dasharray:10000] [stroke-dashoffset:10000] group-hover:[stroke-dashoffset:0] transition-all duration-700 ease-in-out"
                    />
                  </svg>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Notification bell + account */}
        <div className="flex items-center gap-3">
          <div className="relative" ref={bellRef}>
            <button
              type="button"
              onClick={() => {
                setBellOpen((v) => !v);
                setMenuOpen(false);
              }}
              aria-haspopup="menu"
              aria-expanded={bellOpen}
              aria-label={
                totalCount > 0
                  ? `${totalCount} reminder${totalCount === 1 ? '' : 's'}`
                  : 'Reminders'
              }
              title="Reminders"
              className="press group relative flex items-center justify-center w-9 h-9 rounded-full text-primary hover:scale-110"
            >
              <BellIcon />
              {totalCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: 'var(--color-accent)', color: '#2d3a3a' }}
                >
                  {totalCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {bellOpen && (
                <motion.div
                  variants={popoverReveal}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  role="menu"
                  className="dropdown-panel absolute right-0 mt-2 w-[290px] rounded-xl overflow-hidden z-50"
                  style={{ transformOrigin: 'top right' }}
                >
                  <div
                    className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
                    style={{
                      color: 'rgb(var(--rgb-ink) / 0.55)',
                      borderBottom: '1px solid rgb(var(--rgb-secondary) / 0.1)',
                    }}
                  >
                    Reminders
                  </div>

                  {reminders.length === 0 ? (
                    <div
                      className="px-4 py-6 text-center text-sm"
                      style={{ color: 'rgb(var(--rgb-ink) / 0.6)' }}
                    >
                      You&rsquo;re all caught up — nothing needs attention.
                    </div>
                  ) : (
                    <div className="max-h-[340px] overflow-y-auto scroll-area">
                      {reminders.map((r) => (
                        <button
                          key={r.key}
                          type="button"
                          role="menuitem"
                          onClick={r.onOpen}
                          className="w-full text-left px-4 py-2.5 transition-colors hover:bg-accent/15 active:bg-accent/30 flex items-center justify-between gap-3"
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-secondary truncate">
                              {r.title}
                            </span>
                            <span
                              className="block text-xs truncate"
                              style={{ color: 'rgb(var(--rgb-ink) / 0.55)' }}
                            >
                              {r.subtitle}
                            </span>
                          </span>
                          <span
                            className="shrink-0 text-xs font-semibold"
                            style={{ color: r.color }}
                          >
                            {r.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={`Account menu (${userLabel})`}
              title={userLabel}
              className="press flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold text-[rgb(var(--rgb-on-dark))] border border-accent hover:bg-accent hover:text-[#2d3a3a] hover:scale-110"
            >
              {userInitial}
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  variants={popoverReveal}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  role="menu"
                  className="dropdown-panel absolute right-0 mt-2 min-w-[200px] rounded-xl overflow-hidden z-50"
                  style={{ transformOrigin: 'top right' }}
                >
                  {/* Appearance toggle */}
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm font-medium text-secondary">
                      Dark mode
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={theme === 'dark'}
                      aria-label="Toggle dark mode"
                      onClick={toggleTheme}
                      className="relative w-11 h-6 rounded-full transition-colors duration-200 ease-out shrink-0"
                      style={{
                        background:
                          theme === 'dark'
                            ? 'var(--color-accent)'
                            : 'rgb(var(--rgb-secondary) / 0.25)',
                      }}
                    >
                      <span
                        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out flex items-center justify-center"
                        style={{
                          transform:
                            theme === 'dark'
                              ? 'translateX(20px)'
                              : 'translateX(0)',
                          color: theme === 'dark' ? '#2d3a3a' : '#9aa6a6',
                        }}
                      >
                        {theme === 'dark' ? (
                          <MoonIcon small />
                        ) : (
                          <SunIcon small />
                        )}
                      </span>
                    </button>
                  </div>
                  <div
                    style={{
                      borderTop: '1px solid rgb(var(--rgb-secondary) / 0.1)',
                    }}
                  />
                  <MenuItem onClick={handleSignOut}>Sign Out</MenuItem>
                  <MenuItem
                    tone="danger"
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteOpen(true);
                    }}
                  >
                    Delete Account
                  </MenuItem>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <DeleteAccountModal
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'danger';
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent/20 active:bg-accent/30 ${
        tone === 'danger' ? '' : 'text-secondary'
      }`}
      style={tone === 'danger' ? { color: '#dc2626' } : undefined}
    >
      {children}
    </button>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="fill-transparent group-hover:fill-accent transition-[fill] duration-200"
      />
      <path
        d="M13.7 21a2 2 0 01-3.4 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon({ small = false }: { small?: boolean }) {
  const s = small ? 12 : 18;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon({ small = false }: { small?: boolean }) {
  const s = small ? 12 : 18;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.5 14.5A8 8 0 019.5 3.5a8 8 0 1011 11z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
