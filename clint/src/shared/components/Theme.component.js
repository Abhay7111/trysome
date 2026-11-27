const root = document.documentElement;
const STORAGE_KEY = 'theme';

const isDarkTheme = (theme) => theme === 'dark';

export const getTheme = () => (
  root.classList.contains('dark') ? 'dark' : 'light'
);

export const applyTheme = (theme) => {
  const nextTheme = isDarkTheme(theme) ? 'dark' : 'light';
  root.classList.toggle('dark', nextTheme === 'dark');
  root.dataset.theme = nextTheme;
  root.style.colorScheme = nextTheme;

  try {
    localStorage.setItem(STORAGE_KEY, nextTheme);
  } catch {
    // Theme still applies when storage is unavailable.
  }

  return nextTheme;
};

export const initTheme = () => {
  let saved;

  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    saved = null;
  }

  const prefersDark = typeof matchMedia === 'function'
    && matchMedia('(prefers-color-scheme: dark)').matches;

  return applyTheme(saved === 'dark' || saved === 'light'
    ? saved
    : (prefersDark ? 'dark' : 'light'));
};

export const toggleTheme = () => {
  return applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
};