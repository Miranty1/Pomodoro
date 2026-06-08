import { NavLink } from 'react-router-dom'
import './NavBar.css'

const navItems = [
  { label: 'Timer', to: '/' },
  { label: 'Statistics', to: '/statistics' },
  { label: 'Settings', to: '/settings' },
]

function NavBar() {
  return (
    <nav style={styles.nav} className="navbar">
      <div style={styles.inner}>
        <div style={styles.brand}>
          <span style={styles.brandDot} />
          <span style={styles.brandName}>PAUL</span>
          <span style={styles.brandDivider} className="navbar-brand-divider" />
          <span style={styles.brandSub} className="navbar-brand-sub">Focus Timer</span>
        </div>
        <div style={styles.links} className="navbar-links">
          {navItems.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                ...styles.link,
                ...(isActive ? styles.activeLink : {}),
              })}
            >
              {label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}

const styles = {
  nav: {
    background: 'rgba(13, 13, 13, 0.92)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.065)',
    padding: '0 24px',
    height: '52px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
  },
  inner: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    width: '100%',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginRight: 'auto',
  },
  brandDot: {
    display: 'inline-block',
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: '#E8524A',
    boxShadow: '0 0 8px rgba(232, 82, 74, 0.6)',
    flexShrink: 0,
  },
  brandName: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: '800',
    fontSize: '15px',
    letterSpacing: '0.12em',
    color: '#ededed',
    lineHeight: 1,
  },
  brandDivider: {
    display: 'inline-block',
    width: '1px',
    height: '14px',
    background: 'rgba(255,255,255,0.12)',
    flexShrink: 0,
  },
  brandSub: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '11px',
    color: '#5e5e5e',
    letterSpacing: '0.02em',
    fontWeight: '400',
  },
  links: {
    display: 'flex',
    gap: '2px',
    alignItems: 'center',
  },
  link: {
    fontFamily: "'DM Sans', sans-serif",
    color: '#5e5e5e',
    padding: '6px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.15s ease',
    letterSpacing: '0.01em',
  },
  activeLink: {
    background: 'rgba(232, 82, 74, 0.13)',
    color: '#E8524A',
  },
}

export default NavBar
