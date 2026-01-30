import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Sparkles, FileText, Smartphone, Gift, Palette } from 'lucide-react';
import styles from '../styles/components/BottomNavigation.module.css';

const menuItems = [
  { title: "AI", url: "/", icon: Sparkles },
  { title: "Contracts", url: "/contracts", icon: FileText },
  { title: "Gallery", url: "/gallery", icon: Palette },
  { title: "Gift", url: "/shop", icon: Gift },
  { title: "Devices", url: "/my-devices", icon: Smartphone }
];

export function BottomNavigation() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <nav className={styles.nav}>
      <div className={styles.nav__container}>
        {menuItems.map((item) => {
          const active = isActive(item.url);
          return (
            <NavLink
              key={item.title}
              to={item.url}
              className={`${styles.nav__item} ${
                active ? styles['nav__item--active'] : styles['nav__item--inactive']
              }`}
              aria-label={item.title}
              aria-current={active ? 'page' : undefined}
            >
              <div className={styles.nav__icon__container}>
                <item.icon className={styles.nav__icon} />
              </div>
              
              <span className={styles.nav__label}>{item.title}</span>
              
              {/* Active indicator */}
              {active && (
                <div className={styles.nav__indicator}></div>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
