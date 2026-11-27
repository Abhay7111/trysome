import { useState } from 'react'
import { getTheme, toggleTheme } from './Theme.component'

const Nav_component = () => {
  const [theme, setTheme] = useState(getTheme);

  const handleThemeToggle = () => {
    setTheme(toggleTheme());
  };

  return (
    <nav aria-label="Primary navigation">
      <button
        type="button"
        onClick={handleThemeToggle}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>
    </nav>
  )
}

export default Nav_component
