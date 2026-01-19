'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Activity, ShieldCheck, WifiOff, Menu, X } from 'lucide-react';
import { useState } from 'react';

export const Header = () => {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navItems = [
        { name: 'Home', href: '/', icon: Home },
        { name: 'Connectivity', href: '/connectivity', icon: Activity },
        { name: 'Verification', href: '/verification', icon: ShieldCheck },
        { name: 'Offline Tools', href: '/offline', icon: WifiOff },
    ];

    return (
        <header className="bg-background/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-50 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo / Brand */}
                    <Link href="/" className="flex items-center space-x-2 font-bold text-lg group">
                        <span className="bg-expression-red text-white px-1.5 py-0.5 rounded text-sm transition-transform group-hover:scale-105 shadow-lg shadow-expression-red/20">IR</span>
                        <span className="text-foreground tracking-tight group-hover:text-white transition-colors">Rise Up</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex space-x-6">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center space-x-1.5 text-sm font-medium transition-all ${isActive
                                        ? 'text-expression-red drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                                        : 'text-zinc-400 hover:text-white hover:bg-white/5 px-2 py-1 rounded-lg'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Mobile Menu Button - Hidden as we use BottomNav now */}
                    <button
                        className="hidden"
                        aria-hidden="true"
                    >
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Dropdown */}
            {isMenuOpen && (
                <div className="md:hidden border-t border-white/10 bg-surface-1">
                    <nav className="flex flex-col p-4 space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                                        ? 'bg-expression-red/10 text-expression-red'
                                        : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            )}
        </header>
    );
};
