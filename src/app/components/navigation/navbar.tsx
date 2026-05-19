"use client";

import { Activity, Atom, BookOpen, ChevronDown, Cpu, Film, Menu, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const categoryIcons = {
    sport: Activity,
    culture: BookOpen,
    science: Atom,
    technology: Cpu,
    entertainment: Film,
} as const;

type CategoryIconKey = keyof typeof categoryIcons;

interface NavigationItem {
    id: string;
    title: string;
    url: string;
    icon?: CategoryIconKey;
}

interface Navigation {
    id: string;
    title: string;
    url: string;
    children?: NavigationItem[];
}

interface NavbarProps {
    navigation: Navigation[];
}

export default function Navbar({ navigation }: NavbarProps) {
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    function toggleDropdown(id: string) {
        setOpenDropdown((current) => (current === id ? null : id));
    }

    return (
        <nav className="bg-zinc-50 px-8 py-6">
            <div className="flex items-center gap-6">
                <Link href="/">
                    <p className="text-xl logo-novidia text-main ">Novidia.</p>
                </Link>
                <ul className="sm:flex hidden items-center gap-6 font-montserrat">
                    {navigation.map((item) => (
                        <li key={item.id} className="relative">
                            {item.children?.length ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => toggleDropdown(item.id)}
                                        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-800 transition-colors"
                                    >
                                        {item.title}
                                        <ChevronDown
                                            className={`h-4 w-4 transition-transform ${openDropdown === item.id ? "rotate-180" : ""}`}
                                        />
                                    </button>
                                    {openDropdown === item.id && (
                                        <ul className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg">
                                            {item.children.map((child) => {
                                                const Icon = child.icon ? categoryIcons[child.icon] : null;
                                                return (
                                                    <li key={child.id}>
                                                        <Link
                                                            href={child.url}
                                                            className="group flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100"
                                                        >
                                                            {Icon ? <Icon className="h-4 w-4 text-zinc-500 group-hover:text-zinc-700" /> : null}
                                                            {child.title}
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </>
                            ) : (
                                <Link
                                    href={item.url}
                                    className="text-sm font-medium text-zinc-400 hover:text-zinc-800 transition-colors"
                                >
                                    {item.title}
                                </Link>
                            )}
                        </li>
                    ))}
                </ul>
                <div className="w-full"/>
                <ul className="sm:flex hidden items-center gap-4 h-full">
                    <li>
                        <Link
                            href="/search"
                            className="group inline-flex overflow-clip transition-all gap-0 hover:gap-4 items-center rounded-full bg-zinc-50 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-200"
                        >
                            <Search className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-zinc-600" />
                            <span className="hidden sm:inline-flex w-0.5 opacity-0 transition-all duration-600 group-hover:w-20 group-hover:opacity-100">
                                Szukaj
                            </span>
                        </Link>
                    </li>
                    <li>
                        <div className="w-0.5 h-4 bg-zinc-200"></div>
                    </li>
                    <li>
                        <Link
                            href="/register"
                            className="inline-flex items-center gap-2 w-fit rounded-full bg-main hover:bg-lighter px-6 py-2 text-sm text-white transition-all hover:brightness-150 brightness-100"
                        >
                            <p className="text-nowrap font-montserrat font-medium">Zarejestruj się</p>
                        </Link>
                    </li>
                    <li>
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 w-fit rounded-full bg-zinc-200 px-6 py-2 text-sm text-zinc-800 hover:bg-zinc-300 transition-colors"
                        >
                            <p className="text-nowrap font-montserrat font-medium">Zaloguj się</p>
                        </Link>
                    </li>
                </ul>
                <ul className="sm:hidden flex row items-center gap-4 h-full">
                    <li className="flex row gap-4">
                        <Link
                            href="/search"
                            className="group inline-flex overflow-clip transition-all gap-0 items-center rounded-full bg-zinc-50 text-sm text-zinc-700 hover:text-zinc-800"
                        >
                            <Search className="h-6 w-6 text-zinc-400 transition-colors group-hover:text-zinc-600" />
                        </Link>
                        <button>
                                <Menu className="h-6 w-6 text-zinc-400 transition-colors group-hover:text-zinc-600 bg-zinc-50 text-sm hover:text-zinc-800"/>
                        </button>
                    </li>
                </ul>
            </div>
        </nav>
    );
}