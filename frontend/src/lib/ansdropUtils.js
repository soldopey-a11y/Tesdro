export function shortAddr(a) {
  if (!a) return '';
  return a.slice(0, 4) + '…' + a.slice(-4);
}

export function fmt(n) {
  if (n === undefined || n === null || isNaN(n)) return '0';
  return Number(n).toLocaleString('en-US');
}

export function fmtMs(ms) {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export const API = (process.env.REACT_APP_BACKEND_URL || '') + '/api';
