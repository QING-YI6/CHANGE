import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (Capacitor.isNativePlatform()) {
  void initNative();
} else if ('serviceWorker' in navigator) {
  // 只在网页版注册 Service Worker；原生 App 的资源已经打包在安装包里，
  // 注册 SW 反而可能让更新后的版本读到旧缓存。
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* 离线能力失败也不影响使用 */
    });
  });
}

async function initNative() {
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const apply = async () => {
      const dark = document.documentElement.classList.contains('dark');
      await StatusBar.setStyle({ style: dark ? Style.Light : Style.Dark });
      await StatusBar.setBackgroundColor({ color: dark ? '#131211' : '#F6F2E9' });
    };
    await apply();
    new MutationObserver(() => void apply()).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
  } catch {
    /* 插件不可用时忽略 */
  }

  try {
    const { App: CapApp } = await import('@capacitor/app');
    CapApp.addListener('backButton', () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash && hash !== 'today') {
        window.location.hash = '/today';
      } else {
        void CapApp.exitApp();
      }
    });
  } catch {
    /* ignore */
  }
}
