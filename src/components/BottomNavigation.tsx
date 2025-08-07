import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { User, FileText, Smartphone, ShoppingBag } from 'lucide-react';

const menuItems = [
  { title: "Profile", url: "/profile", icon: User },
  { title: "Contracts", url: "/contracts", icon: FileText },
  { title: "My Devices", url: "/my-devices", icon: Smartphone },
  { title: "Shop", url: "/shop", icon: ShoppingBag },
];

export function BottomNavigation() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/95 via-purple-900/80 to-slate-900/95 backdrop-blur-xl border-t border-white/20 shadow-2xl z-50">
      <div className="flex items-center justify-around py-3 px-4 max-w-md mx-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            className={`flex flex-col items-center justify-center py-3 px-4 rounded-xl transition-all duration-300 min-w-0 flex-1 group relative overflow-hidden ${
              isActive(item.url)
                ? "text-cyan-400 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 shadow-lg shadow-cyan-400/20"
                : "text-white/80 hover:text-white hover:bg-white/10 hover:shadow-lg hover:shadow-white/10"
            }`}
          >
            {/* Animated background on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className={`relative z-10 p-2 rounded-lg mb-1 ${
              isActive(item.url)
                ? "bg-gradient-to-r from-cyan-400/20 to-purple-400/20"
                : "bg-white/10 group-hover:bg-white/20"
            }`}>
              <item.icon className="h-5 w-5" />
            </div>
            
            <span className="text-xs font-semibold truncate relative z-10">{item.title}</span>
            
            {/* Active indicator */}
            {isActive(item.url) && (
              <div className="absolute top-1 right-1 w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full animate-pulse"></div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}