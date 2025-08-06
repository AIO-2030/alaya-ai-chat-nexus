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
  { title: "My Devices", url: "/mydevices", icon: Smartphone },
  { title: "Shop", url: "/shop", icon: ShoppingBag },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border-r-2 border-cyan-400" 
      : "text-white/80 hover:bg-white/10 hover:text-white";

  return (
    <Sidebar
      className={`${collapsed ? "w-16" : "w-64"} bg-black/30 backdrop-blur-xl border-r border-white/10`}
      collapsible="icon"
    >
      <SidebarContent className="bg-transparent">
        <SidebarGroup className="px-3 py-4">
          <SidebarGroupLabel className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">
            Menu
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200
                        ${getNavCls({ isActive })}
                      `}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && (
                        <span className="font-medium">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}