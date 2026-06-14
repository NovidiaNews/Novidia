"use client";

import { Activity, Atom, BookOpen, ChevronDown, ChevronRight, ChevronLeft, Cpu, Film, Menu, Search, X, Loader2, LogOut, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
    const router = useRouter();
    
    // Auth State
    const [user, setUser] = useState<{ username: string; email: string; profilePicture?: string } | null>(null);
    const [isAuthDropdownOpen, setIsAuthDropdownOpen] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem("novidia_user");
        const storedToken = localStorage.getItem("novidia_token");
        if (storedUser && storedToken) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                // Ignore
            }
        }
        
        // Listen to storage changes to keep Navbar in sync
        const handleStorageChange = () => {
            const stored = localStorage.getItem("novidia_user");
            if (stored) {
                try {
                    setUser(JSON.parse(stored));
                } catch (e) {
                    setUser(null);
                }
            } else {
                setUser(null);
            }
        };
        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("novidia_auth_change", handleStorageChange);
        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("novidia_auth_change", handleStorageChange);
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("novidia_token");
        localStorage.removeItem("novidia_user");
        setUser(null);
        setIsAuthDropdownOpen(false);
        window.dispatchEvent(new Event("novidia_auth_change"));
        router.push("/");
    };
    
    // Search state
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<{title: string; url: string}[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const searchInputRef = useRef<HTMLInputElement>(null);

    // Close menu when resizing to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1280) { // xl breakpoint
                setIsMobileMenuOpen(false);
                setActiveSubmenu(null);
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Focus search input when activated
    useEffect(() => {
        if (isSearchActive && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchActive]);

    // Mock search function
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        const timeoutId = setTimeout(() => {
            // Mock fetching from /search endpoint
            setSearchResults([
                { title: `Szukaj "${searchQuery}" w postach`, url: `/search?q=${searchQuery}` },
                { title: "Sztuczna inteligencja w edukacji", url: "/categories?tag=technology" },
                { title: "Nowe zasady oceniania z matematyki", url: "/categories?tag=science" },
                { title: "Szkolne koło teatralne ogłasza casting", url: "/categories?tag=culture" },
                { title: "Wyniki zawodów sportowych", url: "/categories?tag=sport" }
            ].filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.url.includes('search')));
            setIsSearching(false);
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    function toggleDropdown(id: string) {
        setOpenDropdown((current) => (current === id ? null : id));
    }

    function toggleMobileMenu() {
        if (isSearchActive) {
            setIsSearchActive(false);
            setSearchQuery("");
        }
        setIsMobileMenuOpen(!isMobileMenuOpen);
        if (isMobileMenuOpen) {
            setActiveSubmenu(null);
        }
    }

    function toggleSearch() {
        setIsSearchActive(!isSearchActive);
        if (!isSearchActive) {
            setIsMobileMenuOpen(false);
            setActiveSubmenu(null);
        } else {
            setSearchQuery("");
        }
    }

    // Spotify-like background loading logic
    function handleMobileNav(e: React.MouseEvent<HTMLAnchorElement>, url: string) {
        e.preventDefault();
        setIsMobileMenuOpen(false);
        
        // Prefetch the route immediately in the background
        router.prefetch(url);
        
        // Wait for the mobile menu closing animation (500ms) to finish before actually pushing
        setTimeout(() => {
            router.push(url);
        }, 500);
    }

    function handleSearchNav(e: React.MouseEvent<HTMLAnchorElement>, url: string) {
        e.preventDefault();
        setIsSearchActive(false);
        
        router.prefetch(url);
        setTimeout(() => {
            router.push(url);
        }, 300); // 300ms matches the search dropdown transition duration
    }

    const activeNavObj = navigation.find((n) => n.id === activeSubmenu);

    return (
        <nav className="bg-zinc-50 px-4 md:px-8 py-6 z-100 relative w-full shadow-sm">
            <div className="flex items-center justify-between gap-4 md:gap-6 relative w-full h-10">
                
                {/* LEFT: LOGO */}
                <div className="flex flex-row gap-10">
                    <div className="shrink-0 z-20">
                        <Link href="/">
                            <p className="text-xl logo-novidia text-main font-bold">Novidia.</p>
                        </Link>
                    </div>

                    {/* CENTER: DESKTOP LINKS */}
                    <div className="xl:flex hidden items-center justify-center flex-1 transition-all duration-500">
                        <ul className="flex items-center gap-6 font-montserrat w-max">
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
                    </div>
                </div>

                {/* RIGHT: SEARCH, AUTH, MOBILE TOGGLE */}
                <div className={`flex items-center justify-end h-full gap-4 transition-all duration-500 z-20 ${
                    isSearchActive ? "flex-1" : "flex-none"
                }`}>
                    
                    {/* EXPANDABLE SEARCH */}
                    <div className={`flex items-center justify-end transition-all duration-500 ${isSearchActive ? 'w-48 sm:w-64 xl:w-80' : 'w-10'}`}>
                        <div className={`flex items-center bg-zinc-50 rounded-full overflow-hidden transition-all duration-500 border ${
                            isSearchActive 
                                ? 'w-full px-2 md:px-4 h-10 border-zinc-200' 
                                : 'w-10 h-10 px-0 border-transparent bg-transparent shadow-none hover:bg-zinc-100'
                        }`}>
                            {/* Icon Button */}
                            <button onClick={toggleSearch} className="shrink-0 relative flex items-center justify-center w-10 h-10 text-zinc-400 hover:text-zinc-600 transition-colors rounded-full">
                                <Search className={`absolute h-6 w-6 xl:h-5 xl:w-5 transition-all duration-300 ${isSearchActive ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`} />
                                <X className={`absolute h-5 w-5 transition-all duration-300 ${isSearchActive ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`} />
                            </button>
                            {/* Input */}
                            <input 
                                ref={searchInputRef}
                                type="text" 
                                placeholder="Szukaj artykułów, tematów..." 
                                className={`w-full h-full bg-transparent outline-none text-sm text-zinc-700 transition-all duration-500 ${
                                    isSearchActive ? 'opacity-100 ml-2 w-full' : 'opacity-0 w-0'
                                }`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* DESKTOP AUTH */}
                    <div className="xl:flex hidden items-center gap-4 transition-all duration-300">
                        <div className="w-0.5 h-4 bg-zinc-200 shrink-0"></div>
                        {user ? (
                            <div className="relative">
                                <button
                                    onClick={() => setIsAuthDropdownOpen(!isAuthDropdownOpen)}
                                    className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity"
                                >
                                    {user.profilePicture ? (
                                        user.profilePicture.startsWith("<svg") ? (
                                            <div 
                                                className="w-10 h-10 rounded-full overflow-hidden border border-zinc-200 bg-white"
                                                dangerouslySetInnerHTML={{ __html: user.profilePicture }}
                                            />
                                        ) : (
                                            <img
                                                src={user.profilePicture}
                                                alt={user.username}
                                                className="w-10 h-10 rounded-full object-cover border border-zinc-200"
                                            />
                                        )
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600">
                                            <UserIcon size={18} />
                                        </div>
                                    )}
                                    <span className="text-sm font-semibold text-zinc-700 font-montserrat">{user.username}</span>
                                    <ChevronDown size={16} className={`text-zinc-500 transition-transform ${isAuthDropdownOpen ? "rotate-180" : ""}`} />
                                </button>
                                {isAuthDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg z-50">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer text-left"
                                        >
                                            <LogOut size={16} />
                                            <span>Wyloguj się</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <Link href="/register" className="shrink-0 inline-flex items-center gap-2 rounded-full bg-main hover:brightness-110 px-6 py-2 text-sm text-white transition-all">
                                    <span className="text-nowrap font-montserrat font-medium">Zarejestruj się</span>
                                </Link>
                                <Link href="/login" className="shrink-0 inline-flex items-center gap-2 rounded-full bg-zinc-200 px-6 py-2 text-sm text-zinc-800 hover:bg-zinc-300 transition-colors">
                                    <span className="text-nowrap font-montserrat font-medium">Zaloguj się</span>
                                </Link>
                            </>
                        )}
                    </div>

                    {/* MOBILE BURGER */}
                    <div className="xl:hidden flex transition-all duration-500">
                        <button 
                            onClick={toggleMobileMenu} 
                            className="relative flex items-center justify-center w-10 h-10 text-zinc-400 hover:text-zinc-800 transition-colors"
                        >
                            <Menu className={`absolute h-7 w-7 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`} />
                            <X className={`absolute h-7 w-7 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* SEARCH RESULTS DROPDOWN */}
            <div className={`absolute top-22 left-0 w-full px-4 md:px-8 z-50 flex justify-end transition-all duration-300 origin-top ${
                isSearchActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
            }`}>
                <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-zinc-100 p-2 md:p-4 overflow-hidden">
                    {isSearching ? (
                        <div className="flex items-center justify-center py-8 text-zinc-400">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            <span className="text-sm">Szukanie...</span>
                        </div>
                    ) : searchResults.length > 0 ? (
                        <ul className="space-y-1 md:space-y-2">
                            {searchResults.map((result, idx) => (
                                <li key={idx}>
                                    <Link onClick={(e) => handleSearchNav(e, result.url)} href={result.url} className="block px-4 py-3 rounded-xl hover:bg-zinc-50 transition-colors text-sm text-zinc-700">
                                        {result.title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : searchQuery.length > 0 ? (
                        <div className="py-8 text-center text-sm text-zinc-500">
                            Brak wyników dla "{searchQuery}"
                        </div>
                    ) : (
                        <div className="py-6 text-center text-sm text-zinc-400">
                            Wpisz co najmniej 3 znaki aby rozpocząć wyszukiwanie
                        </div>
                    )}
                </div>
            </div>

            {/* MOBILE MENU FULLSCREEN OVERLAY */}
            <div 
                className={`xl:hidden fixed top-22 left-0 w-full z-40 transition-all duration-500 ease-in-out border-zinc-200 overflow-hidden ${
                    isMobileMenuOpen ? "h-[80vh] opacity-100 shadow-2xl border-t bg-zinc-50/85 backdrop-blur-xl" : "h-0 opacity-0 border-t-0 bg-zinc-50/0 backdrop-blur-none"
                }`}
            >
                <div className="relative w-full h-full overflow-hidden p-6 md:px-8">
                    
                    {/* MAIN MENU VIEW */}
                    <div 
                        className={`absolute inset-0 w-full h-full p-6 md:px-8 flex flex-col gap-6 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                            activeSubmenu ? "-translate-x-full" : "translate-x-0"
                        }`}
                    >
                        {navigation.map((item, index) => (
                            <div 
                                key={item.id} 
                                className={`transition-all duration-500 transform ${
                                    isMobileMenuOpen && !activeSubmenu 
                                        ? "translate-y-0 opacity-100" 
                                        : "translate-y-8 opacity-0"
                                }`}
                                style={{ transitionDelay: `${index * 50}ms` }}
                            >
                                {item.children?.length ? (
                                    <button
                                        onClick={() => setActiveSubmenu(item.id)}
                                        className="flex items-center justify-between w-full text-left text-xl font-montserrat font-semibold text-zinc-600 hover:text-main transition-colors group"
                                    >
                                        <span>{item.title}</span>
                                        <ChevronRight className="h-6 w-6 text-zinc-400 group-hover:text-main transition-colors" />
                                    </button>
                                ) : (
                                    <Link
                                        href={item.url}
                                        onClick={(e) => handleMobileNav(e, item.url)}
                                        className="block w-full text-xl font-montserrat font-semibold text-zinc-600 hover:text-main transition-colors"
                                    >
                                        {item.title}
                                    </Link>
                                )}
                            </div>
                        ))}
                        
                        {/* Mobile Auth Buttons */}
                        <div className={`mt-auto pt-8 flex flex-col gap-4 border-t border-zinc-200 transition-all duration-500 transform ${
                             isMobileMenuOpen && !activeSubmenu ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                        }`} style={{ transitionDelay: `${navigation.length * 50}ms` }}>
                            {user ? (
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-3 p-3 bg-zinc-100 rounded-2xl">
                                        {user.profilePicture ? (
                                            user.profilePicture.startsWith("<svg") ? (
                                                <div 
                                                    className="w-12 h-12 rounded-full overflow-hidden border border-zinc-200 bg-white"
                                                    dangerouslySetInnerHTML={{ __html: user.profilePicture }}
                                                />
                                            ) : (
                                                <img
                                                    src={user.profilePicture}
                                                    alt={user.username}
                                                    className="w-12 h-12 rounded-full object-cover border border-zinc-200"
                                                />
                                            )
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600">
                                                <UserIcon size={22} />
                                            </div>
                                        )}
                                        <div className="flex flex-col">
                                            <span className="text-base font-bold text-zinc-800 font-montserrat">{user.username}</span>
                                            <span className="text-xs text-zinc-500 font-montserrat">{user.email}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-center rounded-full bg-red-100 py-4 text-lg text-red-700 font-montserrat font-semibold hover:bg-red-200 transition-colors cursor-pointer"
                                    >
                                        Wyloguj się
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <Link
                                        href="/register"
                                        onClick={(e) => handleMobileNav(e, "/register")}
                                        className="w-full text-center rounded-full bg-main py-4 text-lg text-white font-montserrat font-medium transition-all hover:brightness-110"
                                    >
                                        Zarejestruj się
                                    </Link>
                                    <Link
                                        href="/login"
                                        onClick={(e) => handleMobileNav(e, "/login")}
                                        className="w-full text-center rounded-full bg-zinc-200 py-4 text-lg text-zinc-800 font-montserrat font-medium hover:bg-zinc-300 transition-colors"
                                    >
                                        Zaloguj się
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* SUBMENU VIEW */}
                    <div 
                        className={`absolute inset-0 w-full h-full p-6 md:px-8 flex flex-col transition-transform duration-500 overflow-scroll ease-[cubic-bezier(0.22,1,0.36,1)] ${
                            activeSubmenu ? "translate-x-0" : "translate-x-full"
                        }`}
                    >
                        {activeSubmenu && (
                            <>
                                <button
                                    onClick={() => setActiveSubmenu(null)}
                                    className="flex items-center gap-2 text-zinc-500 hover:text-zinc-800 transition-colors mb-8 group"
                                >
                                    <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                                    <span className="font-montserrat font-medium">Wróć</span>
                                </button>
                                <h3 className="text-3xl font-montserrat font-bold text-zinc-800 mb-6">
                                    {activeNavObj?.title}
                                </h3>
                                <div className="flex flex-col gap-3">
                                    {activeNavObj?.children?.map((child, index) => {
                                        const Icon = child.icon ? categoryIcons[child.icon] : null;
                                        return (
                                            <Link
                                                key={child.id}
                                                href={child.url}
                                                onClick={(e) => handleMobileNav(e, child.url)}
                                                className={`flex items-center gap-4 p-4 rounded-2xl bg-white border border-zinc-100 shadow-sm hover:shadow-md hover:border-zinc-200 transition-all duration-300 transform ${
                                                    activeSubmenu 
                                                        ? "translate-y-0 opacity-100" 
                                                        : "translate-y-8 opacity-0"
                                                }`}
                                                style={{ transitionDelay: `${index * 50 + 200}ms` }}
                                            >
                                                {Icon && (
                                                    <div className="bg-zinc-50 p-3 rounded-xl">
                                                        <Icon className="h-6 w-6 text-main" />
                                                    </div>
                                                )}
                                                <span className="text-xl font-montserrat font-medium text-zinc-700">
                                                    {child.title}
                                                </span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}