import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { User, FileText, Smartphone, ShoppingBag } from 'lucide-react';

const menuItems = [
  { title: "Profile", url: "/profile", icon: User },
  { title: "Contracts", url: "/contracts", icon: FileText },
  { title: "My Devices", url: "/mydevices", icon: Smartphone },
  { title: "Shop", url: "/shop", icon: ShoppingBag },
];

export function BottomNavigation() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10 z-50">
      <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all duration-200 min-w-0 flex-1 ${
              isActive(item.url)
                ? "text-cyan-400"
                : "text-white/60 hover:text-white/80"
            }`}
          >
            <item.icon className={`h-5 w-5 mb-1 ${isActive(item.url) ? 'text-cyan-400' : ''}`} />
            <span className="text-xs font-medium truncate">{item.title}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}