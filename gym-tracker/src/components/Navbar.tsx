"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/workout", label: "Workout" },
  { href: "/progress", label: "Progress" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800 bg-black/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/dashboard" className="text-lg font-semibold tracking-[0.24em] text-white">
          IRON LOG
        </Link>

        <nav className="flex max-w-[46vw] items-center gap-2 overflow-x-auto rounded-full border border-zinc-800 bg-zinc-950/80 p-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-xs font-medium tracking-wide transition ${
                  isActive
                    ? "bg-white text-black"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden max-w-[120px] truncate text-xs text-zinc-400 sm:block">
            {user?.displayName ?? user?.email}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
