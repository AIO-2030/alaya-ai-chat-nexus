import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { User, FileText, Smartphone, ShoppingBag } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Profile", url: "/profile", icon: User },
  { title: "Contracts", url: "/contracts", icon: FileText },
  { title: "My Devices", url: "/my-devices", icon: Smartphone },
  { title: "Shop", url: "/shop", icon: ShoppingBag },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar
      className={`${collapsed ? "w-16" : "w-64"} bg-gradient-to-br from-slate-900/90 via-purple-900/70 to-slate-900/90 backdrop-blur-xl border-r border-white/30 shadow-2xl`}
      collapsible="icon"
    >
      <SidebarContent className="bg-transparent">
        <SidebarGroup className="px-4 py-6">
          <SidebarGroupLabel className="text-white/80 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full animate-pulse"></div>
            Navigation
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu className="space-y-3">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) => `
                        flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 group relative overflow-hidden
                        ${isActive 
                          ? "bg-gradient-to-r from-cyan-500/30 to-purple-500/30 text-cyan-400 border border-cyan-400/30 shadow-lg shadow-cyan-400/20" 
                          : "text-white/80 hover:bg-white/10 hover:text-white hover:shadow-lg hover:shadow-white/10"
                        }
                      `}
                    >
                      {({ isActive }) => (
                        <>
                          {/* Animated background on hover */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                          
                                                <div className={`relative z-10 p-2 rounded-lg ${
                        isActive 
                          ? "bg-gradient-to-r from-cyan-400/30 to-purple-400/30" 
                          : "bg-white/5 group-hover:bg-white/15"
                      }`}>
                            <item.icon className="h-5 w-5 flex-shrink-0" />
                          </div>
                          
                          {!collapsed && (
                            <span className="font-semibold text-sm relative z-10">{item.title}</span>
                          )}
                          
                          {/* Active indicator */}
                          {isActive && !collapsed && (
                            <div className="absolute right-2 w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full animate-pulse"></div>
                          )}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {/* Decorative elements */}
        <div className="px-4 py-6">
          <div className="space-y-3">
            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-400/10 to-purple-400/10 rounded-lg flex items-center justify-center border border-white/10">
                <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}