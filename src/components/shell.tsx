"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  BookOpen,
  ChartNoAxesCombined,
  ChevronRight,
  Compass,
  Gamepad2,
  GraduationCap,
  Layers,
  Leaf,
  Menu,
  Search,
  Settings2,
  Wifi,
  X,
} from "lucide-react";
import type { Settings } from "@/lib/schema";

const navigation = [
  { href: "/", label: "Overview", icon: Compass },
  { href: "/library", label: "Book library", icon: BookOpen },
  { href: "/dictionary", label: "Dictionary", icon: Search },
  { href: "/lessons", label: "Lessons", icon: GraduationCap },
  { href: "/games", label: "Practice & play", icon: Gamepad2 },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
  { href: "/progress", label: "My progress", icon: ChartNoAxesCombined },
];
function subscribeMobile(callback: () => void) {
  const query = window.matchMedia("(max-width: 700px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
export function Shell({
  settings,
  children,
}: {
  settings: Settings;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const mobile = useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia("(max-width: 700px)").matches,
    () => false,
  );
  const sidebar = useRef<HTMLElement>(null);
  const menu = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (
        event.key === "/" &&
        !(
          event.target instanceof HTMLElement &&
          (event.target.isContentEditable ||
            /INPUT|TEXTAREA|SELECT/.test(event.target.tagName))
        )
      ) {
        event.preventDefault();
        if (pathname === "/dictionary")
          document
            .querySelector<HTMLInputElement>(".search-field input")
            ?.focus();
        else router.push("/dictionary");
      }
    }
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, [pathname, router]);
  useEffect(() => {
    if (!open || !mobile) return;
    const previousOverflow = document.body.style.overflow;
    const menuButton = menu.current;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>("a, button") ?? [],
      ).filter((item) => item.offsetParent !== null);
    focusable()[0]?.focus();
    function trap(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", trap);
      menuButton?.focus();
    };
  }, [open, mobile]);
  const current = navigation.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
  );
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          tabIndex={-1}
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        id="school-navigation"
        ref={sidebar}
        className={`sidebar ${open ? "is-open" : ""}`}
        inert={mobile && !open}
      >
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-icon">
            <Leaf size={23} />
          </span>
          <span>
            {settings.name}
            <small>YOUR LOCAL LEARNING SPACE</small>
          </span>
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        >
          <X size={20} />
        </button>
        <p className="nav-label">YOUR WORKSPACE</p>
        <nav aria-label="Main navigation">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={
                (href === "/" ? pathname === "/" : pathname.startsWith(href))
                  ? "page"
                  : undefined
              }
              className={`nav-item ${(href === "/" ? pathname === "/" : pathname.startsWith(href)) ? "active" : ""}`}
            >
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card">
            <span className="local-icon">
              <Wifi size={18} />
            </span>
            <strong>Learning, locally.</strong>
            <p>
              Your school. Your resources.
              <br />A whole world to explore.
            </p>
            <span className="tiny">
              <span className="status-dot" />
              No internet needed
            </span>
          </div>
          <Link
            href="/settings"
            className={`nav-item ${pathname === "/settings" ? "active" : ""}`}
            onClick={() => setOpen(false)}
          >
            <Settings2 size={19} />
            <span>Settings</span>
          </Link>
          <div className="sidebar-footer">
            <span className="avatar">L</span>
            <div>
              Made for curious minds<small>LinguaLocal v2</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace" inert={mobile && open}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              aria-expanded={open}
              aria-controls="school-navigation"
              ref={menu}
              onClick={() => setOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {current?.label ??
                (pathname === "/settings" ? "Settings" : "Explore")}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="local-pill">
              <span className="status-dot" />
              Local learning hub
            </span>
            <Link className="topbar-search" href="/dictionary">
              <Search size={16} />
              Find a word <kbd>/</kbd>
            </Link>
            <span className="avatar small">L</span>
          </div>
        </header>
        <main id="main-content" className="main-content">
          {children}
        </main>
        <footer className="page-footer">
          <span>Small steps. Endless possibilities.</span>
          <span>
            Made to work on your school network <Leaf size={12} />
          </span>
        </footer>
      </div>
    </div>
  );
}
