"use client";
import { useLocale } from "@/components/locale-provider";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  BookOpen,
  ChartNoAxesCombined,
  Compass,
  Gamepad2,
  GraduationCap,
  Layers,
  Leaf,
  Menu,
  Search,
  Settings2,
  X,
} from "lucide-react";
import type { Settings } from "@/lib/schema";
import { LanguageSelect } from "./language-select";

const navigation = [
  { href: "/", label: "Home", icon: Compass },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/dictionary", label: "Dictionary", icon: Search },
  { href: "/lessons", label: "Lessons", icon: GraduationCap },
  { href: "/games", label: "Games", icon: Gamepad2 },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
  { href: "/progress", label: "Progress", icon: ChartNoAxesCombined },
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
  const { t } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const mobile = useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia("(max-width: 700px)").matches,
    () => false,
  );
  const [navigationContext, setNavigationContext] = useState({
    pathname,
    mobile,
  });
  if (
    navigationContext.pathname !== pathname ||
    navigationContext.mobile !== mobile
  ) {
    setNavigationContext({ pathname, mobile });
    if (open) setOpen(false);
  }
  const sidebar = useRef<HTMLElement>(null);
  const menu = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !(
          event.target instanceof HTMLElement &&
          (event.target.isContentEditable ||
            /INPUT|TEXTAREA|SELECT/.test(event.target.tagName))
        )
      ) {
        event.preventDefault();
        setOpen(false);
        if (pathname === "/dictionary")
          requestAnimationFrame(() =>
            document
              .querySelector<HTMLInputElement>(".search-field input")
              ?.focus(),
          );
        else router.push("/dictionary?focus=search");
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
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        {t("Skip to content")}
      </a>
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label={t("Close navigation")}
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
          <span>{settings.name}</span>
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label={t("Close navigation")}
          onClick={() => setOpen(false)}
        >
          <X size={20} />
        </button>
        <nav aria-label={t("Main navigation")}>
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
              <span>{t(label)}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link
            href="/settings"
            aria-current={pathname === "/settings" ? "page" : undefined}
            className={`nav-item ${pathname === "/settings" ? "active" : ""}`}
            onClick={() => setOpen(false)}
          >
            <Settings2 size={19} />
            <span>{t("Settings")}</span>
          </Link>
        </div>
      </aside>
      <div className="workspace" inert={mobile && open}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label={t("Open navigation")}
              aria-expanded={open}
              aria-controls="school-navigation"
              ref={menu}
              onClick={() => setOpen(true)}
            >
              <Menu size={20} />
            </button>
          </div>
          <div className="topbar-right">
            <LanguageSelect />
            {pathname !== "/dictionary" && (
              <Link className="topbar-search" href="/dictionary">
                <Search size={16} />
                {t("Find a word")}
                <kbd>/</kbd>
              </Link>
            )}
          </div>
        </header>
        <main id="main-content" className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
