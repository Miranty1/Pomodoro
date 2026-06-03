import { NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Statistics', to: '/statistics' },
  { label: 'Settings', to: '/settings' },
]

function NavBar() {
  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
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
    </nav>
  )
}

const styles = {
  nav: {
    background: 'var(--bg-card)',
    padding: '12px 24px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  inner: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  link: {
    color: 'var(--text-secondary)',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  activeLink: {
    background: 'var(--accent)',
    color: '#ffffff',
  },
}

export default NavBar
