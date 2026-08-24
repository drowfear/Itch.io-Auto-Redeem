// ==UserScript==
// @name         Redeem itch.io (English)
// @namespace    Redeem-itch.io
// @version      2.1.0
// @description  Automatically claim free game keys on itch.io with a live progress panel and parallel claiming
// @author       Drowfear (https://github.com/drowfear)
// @iconURL      https://itch.io/favicon.ico
// @include      *://*itch.io/*
// @include      *://keylol.com/*
// @include      *://www.steamgifts.com/discussion/*
// @include      *://www.reddit.com/r/*
// @include      *://new.isthereanydeal.com/deals/*
// @include      *://freegames.codes/game/*
// @include      *://itchclaim.tmbpeter.com/*
// @include      *://shaigrorb.github.io/freetchio/*
// @supportURL   https://buymeacoffee.com/drowfear
// @homepage     https://github.com/drowfear
// @require      https://cdn.jsdelivr.net/npm/jquery@3.4.1/dist/jquery.slim.min.js
// @require      https://cdn.jsdelivr.net/npm/sweetalert2@11
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// @grant        GM_addStyle
// @grant        unsafeWindow
// @run-at       document-end
// @connect      itch.io
// @connect      *.itch.io
// @connect      itch.zone
// @connect      *.itch.zone
// ==/UserScript==

/* global $, MutationObserver, Swal, GM_xmlhttpRequest, GM_registerMenuCommand */
/* global GM_openInTab, GM_addStyle, unsafeWindow, checkItchGame */
/* eslint-disable camelcase */

(function () {
  'use strict';

  const CONFIG = {
    closeWindow: true,
    concurrency: 6,
    requestTimeout: 20000,
    maxAttempts: 2,
    retryDelay: 300
  };

  const currentUrl = window.location.href;

  /* Cache de resultados por URL dentro de la misma pestaña */
  const processedGames = new Map();

  /* ------------------------------------------------------------------ */
  /* Estilos                                                             */
  /* ------------------------------------------------------------------ */

  GM_addStyle(`
    #df-support-banner {
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      z-index: 999999 !important;
      width: 300px !important;
      box-sizing: border-box !important;
      background: #18181b !important;
      color: #f4f4f5 !important;
      padding: 14px 18px !important;
      border-radius: 12px !important;
      box-shadow:
        0 10px 25px -5px rgba(0, 0, 0, 0.6),
        0 0 0 1px rgba(255, 255, 255, 0.1) !important;
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        sans-serif !important;
      text-align: center !important;
      border: 2px solid #fa4056 !important;
    }

    #df-support-banner a:hover {
      opacity: 0.85;
    }

    #df-progress-panel {
      position: fixed !important;
      top: 210px !important;
      right: 20px !important;
      z-index: 999998 !important;
      width: 300px !important;
      max-height: calc(100vh - 240px) !important;
      box-sizing: border-box !important;
      display: none;
      flex-direction: column;
      background: #18181b !important;
      color: #f4f4f5 !important;
      border-radius: 12px !important;
      border: 1px solid #3f3f46 !important;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6) !important;
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        sans-serif !important;
      overflow: hidden;
    }

    #df-progress-panel.df-visible {
      display: flex !important;
    }

    #df-progress-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background: #27272a;
      font-size: 12px;
      font-weight: 700;
      color: #ffffff;
    }

    #df-progress-header button {
      background: none;
      border: none;
      color: #a1a1aa;
      cursor: pointer;
      font-size: 13px;
      font-weight: bold;
      padding: 0 3px;
    }

    #df-progress-header button:hover {
      color: #ffffff;
    }

    #df-progress-bar-wrap {
      height: 4px;
      background: #3f3f46;
      width: 100%;
    }

    #df-progress-bar {
      height: 100%;
      width: 0%;
      background: #22c55e;
      transition: width 0.2s ease;
    }

    #df-progress-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 8px;
      padding: 8px 12px;
      font-size: 11px;
      color: #d4d4d8;
      border-bottom: 1px solid #27272a;
    }

    #df-progress-list {
      list-style: none;
      margin: 0;
      padding: 4px 0;
      overflow-y: auto;
      flex: 1 1 auto;
    }

    #df-progress-list::-webkit-scrollbar {
      width: 8px;
    }

    #df-progress-list::-webkit-scrollbar-thumb {
      background: #52525b;
      border-radius: 4px;
    }

    .df-progress-item {
      display: flex;
      align-items: flex-start;
      gap: 7px;
      padding: 6px 12px;
      font-size: 11.5px;
      line-height: 1.35;
      border-bottom: 1px solid #212124;
    }

    .df-progress-item:last-child {
      border-bottom: none;
    }

    .df-progress-icon {
      flex: 0 0 auto;
      width: 14px;
      text-align: center;
    }

    .df-progress-body {
      flex: 1 1 auto;
      min-width: 0;
    }

    .df-progress-name {
      display: block;
      color: #f4f4f5;
      text-decoration: none;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .df-progress-name:hover {
      color: #38bdf8;
      text-decoration: underline;
    }

    .df-progress-msg {
      display: block;
      font-size: 10.5px;
      color: #a1a1aa;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .df-status-claimed .df-progress-name { color: #22c55e; }
    .df-status-owned .df-progress-name { color: #38bdf8; }
    .df-status-error .df-progress-name { color: #ef4444; }
    .df-status-skipped .df-progress-name { color: #f59e0b; }

    .df-spin {
      display: inline-block;
      animation: df-spin-anim 1s linear infinite;
    }

    @keyframes df-spin-anim {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .swal2-popup {
      background: #18181b !important;
      color: #f4f4f5 !important;
      border-radius: 16px !important;
      border: 1px solid #27272a !important;
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        sans-serif !important;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5) !important;
    }

    .swal2-title {
      color: #ffffff !important;
      font-weight: 700 !important;
      font-size: 1.25rem !important;
    }

    .swal2-content,
    .swal2-html-container {
      color: #e4e4e7 !important;
      font-size: 0.95rem !important;
    }

    .swal2-content a,
    .swal2-html-container a {
      color: #38bdf8 !important;
      word-break: break-all;
    }

    .swal2-styled.swal2-confirm {
      background-color: #fa4056 !important;
      border-radius: 8px !important;
      font-weight: 600 !important;
      padding: 8px 24px !important;
      border: none !important;
      box-shadow: none !important;
    }

    .swal2-icon.swal2-info { border-color: #38bdf8 !important; color: #38bdf8 !important; }
    .swal2-icon.swal2-success { border-color: #22c55e !important; color: #22c55e !important; }
    .swal2-icon.swal2-error { border-color: #ef4444 !important; color: #ef4444 !important; }
    .swal2-icon.swal2-warning { border-color: #f59e0b !important; color: #f59e0b !important; }

    .df-redeem-link {
      cursor: pointer;
    }
  `);

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                          */
  /* ------------------------------------------------------------------ */

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function consoleLog(message, type = 'info') {
    const colors = {
      success: 'green',
      warning: 'orange',
      info: '#38bdf8',
      error: 'red'
    };

    console.log(
      `%c[Redeem itch.io] ${String(message).replace(/<br\s*\/?>/gi, ' ')}`,
      `color:${colors[type] || '#38bdf8'}`
    );
  }

  function notify(message, type = 'info', title = null) {
    const titles = {
      success: 'Success!',
      error: 'Error',
      warning: 'Warning',
      info: 'Notice'
    };

    consoleLog(message, type);

    Swal.fire({
      title: title || titles[type] || 'Notice',
      html: message,
      icon: type,
      showConfirmButton: true,
      customClass: { title: 'break-all' }
    });
  }

  function normalizeItchUrl(value, base = window.location.href) {
    if (!value) return null;

    try {
      const parsedUrl = new URL(String(value).trim(), base);

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) return null;

      const hostname = parsedUrl.hostname.toLowerCase();

      if (hostname !== 'itch.io' && !hostname.endsWith('.itch.io')) return null;

      parsedUrl.hash = '';
      return parsedUrl.href;
    } catch (error) {
      return null;
    }
  }

  function isItchBundleUrl(value) {
    const normalizedUrl = normalizeItchUrl(value);
    if (!normalizedUrl) return false;

    const parsedUrl = new URL(normalizedUrl);

    return (
      ['itch.io', 'www.itch.io'].includes(parsedUrl.hostname.toLowerCase()) &&
      /^\/s\/\d+\/[^/]+\/?$/i.test(parsedUrl.pathname)
    );
  }

  function isItchGameUrl(value) {
    const normalizedUrl = normalizeItchUrl(value);
    if (!normalizedUrl) return false;

    const parsedUrl = new URL(normalizedUrl);
    const hostname = parsedUrl.hostname.toLowerCase();

    if (hostname === 'itch.io' || hostname === 'www.itch.io') return false;

    return /^\/[^/]+(?:\/purchase)?\/?$/i.test(parsedUrl.pathname);
  }

  function isItchDownloadUrl(value) {
    const normalizedUrl = normalizeItchUrl(value);
    if (!normalizedUrl) return false;

    const parsedUrl = new URL(normalizedUrl);

    return (
      parsedUrl.hostname.toLowerCase().endsWith('.itch.io') &&
      /^\/[^/]+\/download\/.*$/i.test(parsedUrl.pathname)
    );
  }

  function getGameBaseUrl(value) {
    const normalizedUrl = normalizeItchUrl(value);
    if (!normalizedUrl) return null;

    const parsedUrl = new URL(normalizedUrl);

    parsedUrl.pathname = parsedUrl.pathname
      .replace(/\/purchase\/?$/i, '')
      .replace(/\/+$/, '');

    parsedUrl.search = '';
    parsedUrl.hash = '';

    return parsedUrl.href.replace(/\/$/, '');
  }

  function getPurchaseUrl(value) {
    const normalizedUrl = normalizeItchUrl(value);
    if (!normalizedUrl) return null;

    const parsedUrl = new URL(normalizedUrl);

    if (/\/purchase\/?$/i.test(parsedUrl.pathname)) return parsedUrl.href;

    parsedUrl.pathname = `${parsedUrl.pathname.replace(/\/+$/, '')}/purchase`;
    parsedUrl.search = '';
    parsedUrl.hash = '';

    return parsedUrl.href;
  }

  function getGameTitle(url) {
    try {
      const parsedUrl = new URL(url);
      const slug = parsedUrl.pathname
        .replace(/\/purchase\/?$/i, '')
        .replace(/^\/+|\/+$/g, '');

      const author = parsedUrl.hostname.replace(/\.itch\.io$/i, '');
      const name = (slug || author).replace(/[-_]/g, ' ');

      return `${name} · ${author}`;
    } catch (error) {
      return url;
    }
  }

  function isFreeCheckout(html) {
    const priceText = html
      .find('.button_message')
      .eq(0)
      .find('.dollars[itemprop]')
      .text();

    const placeholder = html.find('.money_input').attr('placeholder') || '';

    const buyMessage = html
      .find('.button_message')
      .eq(0)
      .find('.buy_message')
      .text();

    return (
      /(?:^|\D)0\.00(?:\D|$)/i.test(priceText) ||
      /(?:^|\D)0\.00(?:\D|$)/i.test(placeholder) ||
      /自己出价|Name your own price|Pon tu propio precio/i.test(buyMessage)
    );
  }

  function isLinkedPage(html) {
    const linkedText =
      /This page is linked|此页面已链接到帐户|Esta página está vinculada/i.test(
        html.find('div.inner_column').text()
      );

    const downloadAvailable =
      html.find('a.button.download_btn[data-upload_id]').length > 0;

    return linkedText || downloadAvailable;
  }

  function delay(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  /* Ejecuta tareas en paralelo con límite de concurrencia */
  async function runPool(items, limit, worker) {
    const queue = [...items];
    const size = Math.max(1, Math.min(limit, queue.length || 1));

    const runners = Array.from({ length: size }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        await worker(item);
      }
    });

    await Promise.all(runners);
  }

  /* ------------------------------------------------------------------ */
  /* Panel de progreso (lado derecho)                                    */
  /* ------------------------------------------------------------------ */

  const ProgressPanel = (() => {
    const STATUS_META = {
      pending: { icon: '•', label: 'Queued' },
      working: { icon: '<span class="df-spin">◠</span>', label: 'Working' },
      claimed: { icon: '✅', label: 'Claimed' },
      owned: { icon: '📦', label: 'Already owned' },
      skipped: { icon: '⚠️', label: 'Skipped' },
      error: { icon: '❌', label: 'Failed' }
    };

    let panel = null;
    let list = null;
    let stats = null;
    let bar = null;
    let counters = null;

    function resetCounters() {
      counters = {
        total: 0,
        claimed: 0,
        owned: 0,
        skipped: 0,
        error: 0,
        done: 0
      };
    }

    resetCounters();

    function build() {
      if (panel && document.body.contains(panel)) return;

      panel = document.createElement('div');
      panel.id = 'df-progress-panel';

      panel.innerHTML = `
        <div id="df-progress-header">
          <span id="df-progress-title">Claim progress</span>
          <span>
            <button type="button" id="df-progress-clear" title="Clear list">🧹</button>
            <button type="button" id="df-progress-hide" title="Hide panel">✕</button>
          </span>
        </div>
        <div id="df-progress-bar-wrap"><div id="df-progress-bar"></div></div>
        <div id="df-progress-stats"></div>
        <ul id="df-progress-list"></ul>
      `;

      document.body.appendChild(panel);

      list = panel.querySelector('#df-progress-list');
      stats = panel.querySelector('#df-progress-stats');
      bar = panel.querySelector('#df-progress-bar');

      panel.querySelector('#df-progress-hide').addEventListener('click', () => {
        panel.classList.remove('df-visible');
      });

      panel.querySelector('#df-progress-clear').addEventListener('click', () => {
        clear();
      });

      renderStats();
    }

    function show() {
      build();
      panel.classList.add('df-visible');
    }

    function clear() {
      build();
      list.innerHTML = '';
      resetCounters();
      renderStats();
    }

    function renderStats() {
      if (!stats) return;

      stats.innerHTML = `
        <span>Total: <b>${counters.total}</b></span>
        <span style="color:#22c55e;">✅ ${counters.claimed}</span>
        <span style="color:#38bdf8;">📦 ${counters.owned}</span>
        <span style="color:#f59e0b;">⚠️ ${counters.skipped}</span>
        <span style="color:#ef4444;">❌ ${counters.error}</span>
      `;

      const percent = counters.total
        ? Math.round((counters.done / counters.total) * 100)
        : 0;

      bar.style.width = `${percent}%`;
    }

    function setHeader(text) {
      build();
      const title = panel.querySelector('#df-progress-title');
      if (title) title.textContent = text;
    }

    function addItem(url, initialStatus = 'pending', message = 'Queued') {
      show();

      const item = document.createElement('li');
      item.className = `df-progress-item df-status-${initialStatus}`;

      item.innerHTML = `
        <span class="df-progress-icon">${STATUS_META[initialStatus].icon}</span>
        <span class="df-progress-body">
          <a class="df-progress-name" target="_blank" rel="noopener noreferrer"></a>
          <span class="df-progress-msg"></span>
        </span>
      `;

      const link = item.querySelector('.df-progress-name');
      link.href = url;
      link.textContent = getGameTitle(url);
      link.title = url;

      item.querySelector('.df-progress-msg').textContent = message;

      list.appendChild(item);

      counters.total += 1;
      renderStats();

      let finished = false;

      return {
        url,
        setStatus(status, msg) {
          const meta = STATUS_META[status] || STATUS_META.pending;

          item.className = `df-progress-item df-status-${status}`;
          item.querySelector('.df-progress-icon').innerHTML = meta.icon;
          item.querySelector('.df-progress-msg').textContent = msg || meta.label;

          if (!finished && ['claimed', 'owned', 'skipped', 'error'].includes(status)) {
            finished = true;
            counters.done += 1;

            if (counters[status] !== undefined) counters[status] += 1;
          }

          renderStats();
        }
      };
    }

    return { show, clear, addItem, setHeader, build, get counters() { return counters; } };
  })();

  /* ------------------------------------------------------------------ */
  /* Peticiones HTTP                                                     */
  /* ------------------------------------------------------------------ */

  function httpRequest(options, attempt = 0) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        ...options,
        timeout: CONFIG.requestTimeout,
        onload: resolve,
        onerror: reject,
        ontimeout: reject,
        onabort: reject
      });
    }).catch(async (error) => {
      if (attempt + 1 >= CONFIG.maxAttempts) {
        return {
          status: 0,
          response: null,
          responseText: '',
          finalUrl: options.url,
          error
        };
      }

      await delay(CONFIG.retryDelay * (attempt + 1));
      return httpRequest(options, attempt + 1);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Lógica de reclamación                                               */
  /* ------------------------------------------------------------------ */

  async function submitClaimForm(action, token, referer) {
    if (!action) return { status: 'skipped', message: 'Claim form without action URL' };
    if (!token) return { status: 'skipped', message: 'Claim form without CSRF token' };

    let actionUrl;

    try {
      actionUrl = new URL(action, referer).href;
    } catch (error) {
      return { status: 'error', message: 'Invalid claim form URL' };
    }

    const formData = new URLSearchParams();
    formData.set('csrf_token', token);

    const data = await httpRequest({
      url: actionUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Referer: referer
      },
      data: formData.toString()
    });

    const finalUrl = String(data.finalUrl || actionUrl);

    if (/\/register(?:\/|\?|$)/i.test(finalUrl)) {
      return { status: 'error', message: 'Not logged in to itch.io' };
    }

    if (data.status !== 200 || !data.responseText) {
      return { status: 'error', message: `Claim request failed (${data.status})` };
    }

    if (isLinkedPage($(data.responseText))) {
      return { status: 'claimed', message: 'Key linked to your account' };
    }

    return { status: 'skipped', message: 'Claim sent, ownership not confirmed' };
  }

  async function openDownloadPage(downloadUrl, referer) {
    let resolvedUrl;

    try {
      resolvedUrl = new URL(downloadUrl, referer).href;
    } catch (error) {
      return { status: 'error', message: 'Invalid download URL' };
    }

    const data = await httpRequest({
      url: resolvedUrl,
      method: 'GET',
      headers: {
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: referer
      }
    });

    const finalUrl = String(data.finalUrl || resolvedUrl);

    if (/\/register(?:\/|\?|$)/i.test(finalUrl)) {
      return { status: 'error', message: 'Not logged in to itch.io' };
    }

    if (data.status !== 200 || !data.responseText) {
      return { status: 'error', message: `Download page failed (${data.status})` };
    }

    const html = $(data.responseText);

    if (isLinkedPage(html)) {
      return { status: 'claimed', message: 'Added to your library' };
    }

    const claimForm = html.find('form[action*="claim-key"]').first();

    if (claimForm.length > 0) {
      return submitClaimForm(
        claimForm.attr('action'),
        claimForm.find('input[name="csrf_token"]').first().val(),
        finalUrl
      );
    }

    const claimBtn = html
      .find(
        [
          'button.button:contains("Link")',
          'button.button:contains("Claim")',
          'button.button:contains("链接")',
          'button.button:contains("Vincular")',
          'button.button:contains("Reclamar")'
        ].join(',')
      )
      .first();

    const btnForm = claimBtn.closest('form');

    if (claimBtn.length > 0 && btnForm.length > 0) {
      return submitClaimForm(
        btnForm.attr('action'),
        btnForm.find('input[name="csrf_token"]').first().val(),
        finalUrl
      );
    }

    return { status: 'skipped', message: 'No claim form found on download page' };
  }

  async function requestDownloadUrl(gameBaseUrl, csrf_token, reward_id) {
    const formData = new URLSearchParams();
    formData.set('csrf_token', csrf_token);

    if (reward_id) formData.set('reward_id', reward_id);

    const data = await httpRequest({
      url: `${gameBaseUrl.replace(/\/+$/, '')}/download_url`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      data: formData.toString(),
      responseType: 'json'
    });

    let response = data.response;

    if ((!response || typeof response !== 'object') && data.responseText) {
      try {
        response = JSON.parse(data.responseText);
      } catch (error) {
        response = null;
      }
    }

    if (data.status === 200 && response?.url) {
      return openDownloadPage(response.url, gameBaseUrl);
    }

    return {
      status: 'error',
      message: response?.errors?.[0] || `download_url failed (${data.status})`
    };
  }

  /**
   * Procesa un único juego y devuelve { status, message }.
   */
  async function claimSingleGame(rawUrl, entry = null) {
    const gameUrl = normalizeItchUrl(rawUrl);

    if (!gameUrl) {
      entry?.setStatus('error', 'Invalid itch.io URL');
      return { status: 'error', message: 'Invalid itch.io URL' };
    }

    const cacheKey = getGameBaseUrl(gameUrl);

    if (processedGames.has(cacheKey)) {
      const cached = processedGames.get(cacheKey);
      entry?.setStatus(cached.status, `${cached.message} (cached)`);
      return cached;
    }

    const report = (result) => {
      processedGames.set(cacheKey, result);
      entry?.setStatus(result.status, result.message);
      consoleLog(`${cacheKey} → ${result.status}: ${result.message}`, result.status === 'error' ? 'error' : 'info');
      return result;
    };

    try {
      entry?.setStatus('working', 'Checking ownership…');

      const ownershipData = await httpRequest({ url: cacheKey, method: 'GET' });

      if (ownershipData.status !== 200) {
        return report({
          status: 'error',
          message: `Game page failed (${ownershipData.status})`
        });
      }

      if (String(ownershipData.responseText || '').includes('purchase_banner_inner')) {
        return report({ status: 'owned', message: 'Already in your library' });
      }

      entry?.setStatus('working', 'Opening checkout…');

      const purchaseUrl = getPurchaseUrl(cacheKey);
      const purchaseData = await httpRequest({ url: purchaseUrl, method: 'GET' });

      if (purchaseData.status !== 200) {
        return report({
          status: 'error',
          message: `Checkout failed (${purchaseData.status})`
        });
      }

      const html = $(purchaseData.responseText);

      if (!isFreeCheckout(html)) {
        return report({ status: 'skipped', message: 'Not free anymore' });
      }

      const csrf_token = html.find('[name="csrf_token"]').first().val();
      const reward_id = html.find('[name="reward_id"]').first().val();

      if (!csrf_token) {
        return report({ status: 'error', message: 'No CSRF token (log in again)' });
      }

      entry?.setStatus('working', 'Claiming…');

      const result = await requestDownloadUrl(cacheKey, csrf_token, reward_id);
      return report(result);
    } catch (error) {
      console.error('[Redeem itch.io]', error);
      return report({ status: 'error', message: String(error?.message || error) });
    }
  }

  /**
   * Extrae los juegos de un bundle.
   */
  async function expandBundle(bundleUrl) {
    const data = await httpRequest({ url: bundleUrl, method: 'GET' });

    if (data.status !== 200) return [];

    if (String(data.responseText || '').includes('not_active_notification')) {
      consoleLog(`Promotion ended: ${bundleUrl}`, 'warning');
      return [];
    }

    const games = $(data.responseText).find(
      '.game_grid_widget.promo_game_grid a.thumb_link.game_link'
    );

    const result = [];

    games.each((index, game) => {
      const gameUrl = normalizeItchUrl(
        $(game).attr('href'),
        data.finalUrl || bundleUrl
      );

      if (gameUrl && isItchGameUrl(gameUrl)) {
        result.push(getGameBaseUrl(gameUrl));
      }
    });

    return result.filter(Boolean);
  }

  /**
   * Reclama una lista de URLs en paralelo mostrándolo en el panel.
   */
  async function claimUrls(urls, headerText = 'Claim progress') {
    const unique = [...new Set(urls.filter(Boolean))];

    if (unique.length === 0) {
      notify('No claimable games found.', 'warning');
      return;
    }

    ProgressPanel.show();
    ProgressPanel.setHeader(`${headerText} (${unique.length})`);

    const before = { ...ProgressPanel.counters };
    const entries = unique.map((url) => ({ url, entry: ProgressPanel.addItem(url) }));

    await runPool(entries, CONFIG.concurrency, async ({ url, entry }) => {
      await claimSingleGame(url, entry);
    });

    const after = ProgressPanel.counters;

    notify(
      `
        <div style="text-align:left;font-size:0.9rem;line-height:1.6;">
          ✅ Claimed: <b>${after.claimed - before.claimed}</b><br>
          📦 Already owned: <b>${after.owned - before.owned}</b><br>
          ⚠️ Skipped: <b>${after.skipped - before.skipped}</b><br>
          ❌ Failed: <b>${after.error - before.error}</b>
        </div>
      `,
      (after.error - before.error) > 0 ? 'warning' : 'success',
      'Finished'
    );

    if (typeof checkItchGame === 'function') checkItchGame();
  }

  /**
   * Recolecta todos los enlaces itch.io de la página (juegos + bundles).
   */
  async function collectPageGameUrls() {
    const rawLinks = Array.from(
      document.querySelectorAll(
        'a[href*="itch.io"]:not(.itch-io-game-link-owned):not([href*="itch.io/b/"]):not([href*="itch.io/c/"])'
      )
    );

    const gameUrls = new Set();
    const bundleUrls = new Set();

    for (const link of rawLinks) {
      const url = normalizeItchUrl(
        link.dataset.itchHref || link.getAttribute('href'),
        window.location.href
      );

      if (!url) continue;

      if (isItchBundleUrl(url)) {
        bundleUrls.add(url);
      } else if (isItchGameUrl(url)) {
        gameUrls.add(getGameBaseUrl(url));
      }
    }

    if (bundleUrls.size > 0) {
      const expanded = await Promise.all([...bundleUrls].map(expandBundle));
      expanded.flat().forEach((url) => gameUrls.add(url));
    }

    return [...gameUrls];
  }

  async function processAllPageLinks() {
    ProgressPanel.show();
    ProgressPanel.setHeader('Scanning page…');

    const urls = await collectPageGameUrls();

    if (urls.length === 0) {
      ProgressPanel.setHeader('Claim progress');
      notify('No valid itch.io game links found on this page.', 'warning');
      return;
    }

    await claimUrls(urls, 'Claim progress');
  }

  /**
   * Punto de entrada público (elemento, URL o bundle).
   */
  async function redeemGame(elementOrUrl) {
    let rawUrl = '';

    if (typeof elementOrUrl === 'string') {
      rawUrl = elementOrUrl;
    } else if (elementOrUrl) {
      if ($(elementOrUrl).hasClass('itch-io-game-link-owned')) return;

      rawUrl =
        $(elementOrUrl).attr('data-itch-href') ||
        $(elementOrUrl).attr('href') ||
        '';
    }

    const itchUrl = normalizeItchUrl(rawUrl, window.location.href);

    if (!itchUrl) {
      notify('Invalid or unsupported itch.io URL.', 'error');
      return;
    }

    if (isItchBundleUrl(itchUrl)) {
      ProgressPanel.show();
      ProgressPanel.setHeader('Reading bundle…');

      const urls = await expandBundle(itchUrl);

      if (urls.length === 0) {
        ProgressPanel.setHeader('Claim progress');
        notify('No games found in this bundle (or the promotion ended).', 'warning');
        return;
      }

      await claimUrls(urls, 'Bundle claim');
      return;
    }

    if (isItchGameUrl(itchUrl)) {
      ProgressPanel.show();
      ProgressPanel.setHeader('Claim progress');

      const entry = ProgressPanel.addItem(getGameBaseUrl(itchUrl));
      const result = await claimSingleGame(itchUrl, entry);

      if (result.status === 'error') {
        notify(escapeHtml(result.message), 'error');
      }

      if (typeof checkItchGame === 'function') checkItchGame();
      return;
    }

    notify('The supplied URL is not a supported game or bundle.', 'warning');
  }

  unsafeWindow.redeemItchGame = redeemGame;

  /* ------------------------------------------------------------------ */
  /* Menú de Tampermonkey                                                */
  /* ------------------------------------------------------------------ */

  GM_registerMenuCommand('☕ Support My Work (Buy Me a Coffee)', () => {
    GM_openInTab('https://buymeacoffee.com/drowfear', { active: true });
  });

  GM_registerMenuCommand('❤️ Support My Work (Ko-fi)', () => {
    GM_openInTab('https://ko-fi.com/drowfear', { active: true });
  });

  GM_registerMenuCommand('⚡ Claim all itch.io links on page', async () => {
    await processAllPageLinks();
  });

  /* ------------------------------------------------------------------ */
  /* Comportamiento por página                                           */
  /* ------------------------------------------------------------------ */

  function closePage() {
    window.close();
  }

  /* Página de descarga: enlazar clave automáticamente */
  if (isItchDownloadUrl(currentUrl)) {
    $('button.button').each((index, element) => {
      if (/link|claim|链接|vincular|reclamar/i.test($(element).text())) {
        element.click();
      }
    });

    if (isLinkedPage($(document)) && CONFIG.closeWindow) {
      closePage();
    }
  }

  /* Página de compra / juego */
  const currentNormalizedUrl = normalizeItchUrl(currentUrl);

  if (
    currentNormalizedUrl &&
    /\/purchase\/?$/i.test(new URL(currentNormalizedUrl).pathname) &&
    /No thanks, just take me to the downloads|不用了，请带我去下载页面|No gracias, llévame a las descargas/i.test(
      $('a.direct_download_btn').text()
    )
  ) {
    $('a.direct_download_btn').get(0)?.click();
  } else if (
    isItchGameUrl(currentUrl) &&
    $('.purchase_banner_inner').length === 0 &&
    isFreeCheckout($(document))
  ) {
    const buyButton = $('.buy_btn').first();
    const purchaseHref = normalizeItchUrl(buyButton.attr('href'), window.location.href);

    if (buyButton.length > 0 && purchaseHref && $('.df-background-claim-button').length === 0) {
      const backgroundClaimButton = $('<a>', {
        href: '#',
        class: 'button df-background-claim-button df-redeem-link',
        target: '_self',
        title: 'Claim in background',
        text: 'Claim in Background'
      });

      backgroundClaimButton.attr('data-itch-href', purchaseHref);

      backgroundClaimButton.on('click', async (event) => {
        event.preventDefault();
        await redeemGame(purchaseHref);
      });

      buyButton.after(backgroundClaimButton);
    }
  }

  /* Bundles temporales */
  if (isItchBundleUrl(currentUrl) && $('#redeem-itch-io').length === 0) {
    const bundleButton = $('<button>', {
      id: 'redeem-itch-io',
      class: 'button',
      type: 'button',
      text: 'Claim in Background'
    });

    if ($('.promotion_buy_row .buy_game_btn').length > 0) {
      bundleButton.attr(
        'style',
        'font-size:18px;letter-spacing:0.025em;line-height:36px;height:40px;padding:0 20px;margin:0 16px'
      );

      $('.promotion_buy_row .buy_game_btn').after(bundleButton);
    } else {
      bundleButton.attr(
        'style',
        'font-size:18px;letter-spacing:0.025em;line-height:36px;padding:0 20px;margin:10px 30%;width:40%'
      );

      $('.countdown_row').prepend($('<div>', { style: 'width:100%;' }).append(bundleButton));
    }

    bundleButton.on('click', async () => {
      bundleButton.prop('disabled', true);

      try {
        const urls = $('.thumb_link.game_link')
          .toArray()
          .map((element) => normalizeItchUrl($(element).attr('href'), window.location.href))
          .filter((url) => url && isItchGameUrl(url))
          .map(getGameBaseUrl);

        await claimUrls(urls, 'Bundle claim');
      } finally {
        bundleButton.prop('disabled', false);
      }
    });
  }

  /* Sitios externos */
  const supportedExternalHosts = [
    'keylol.com',
    'www.steamgifts.com',
    'www.reddit.com',
    'new.isthereanydeal.com',
    'freegames.codes',
    'itchclaim.tmbpeter.com',
    'shaigrorb.github.io'
  ];

  function addRedeemBtn() {
    const links = document.querySelectorAll('a[href*="itch.io"]:not(.redeem-itch-game)');

    for (const originalLink of links) {
      const itchUrl = normalizeItchUrl(originalLink.getAttribute('href'), window.location.href);

      originalLink.classList.add('redeem-itch-game');

      if (!itchUrl) continue;

      const claimLink = document.createElement('a');
      claimLink.href = '#';
      claimLink.textContent = 'Claim';
      claimLink.classList.add('df-redeem-link');
      claimLink.dataset.itchHref = itchUrl;
      claimLink.target = '_self';

      if (window.location.hostname === 'freegames.codes') {
        claimLink.classList.add('details__buy');
        claimLink.style.setProperty('margin-top', '10px', 'important');
      } else if (window.location.hostname === 'shaigrorb.github.io') {
        claimLink.style.cssText = [
          'position:relative',
          'height:min-content',
          'right:39px',
          'background-color:#16a34a',
          'top:4px',
          'text-decoration-line:none',
          'color:white',
          'font-weight:bold',
          'border-radius:2px',
          'padding:5px',
          'font-size:13px'
        ].join(';');
      } else {
        claimLink.style.setProperty('margin-left', '10px', 'important');
      }

      claimLink.addEventListener('click', async (event) => {
        event.preventDefault();
        await redeemGame(itchUrl);
      });

      const positionElement =
        window.location.hostname === 'shaigrorb.github.io'
          ? originalLink.closest('.item-card')
          : originalLink;

      if (positionElement?.parentNode) {
        positionElement.insertAdjacentElement('afterend', claimLink);
      }
    }
  }

  if (supportedExternalHosts.includes(window.location.hostname)) {
    addRedeemBtn();

    let scheduled = false;

    const observer = new MutationObserver(() => {
      if (scheduled) return;

      scheduled = true;

      window.requestAnimationFrame(() => {
        scheduled = false;
        addRedeemBtn();
      });
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  /* ------------------------------------------------------------------ */
  /* Banner                                                              */
  /* ------------------------------------------------------------------ */

  function createStartupBanner() {
    if (
      document.getElementById('df-support-banner') ||
      sessionStorage.getItem('df_banner_closed') === 'true'
    ) {
      return;
    }

    const banner = document.createElement('div');
    banner.id = 'df-support-banner';

    banner.innerHTML = `
      <div style="font-weight:bold;margin-bottom:6px;font-size:13px;color:#ffffff;">
        🎮 Itch.io Auto-Redeem Active
      </div>

      <div style="font-size:11px;margin-bottom:8px;color:#a1a1aa;">
        Created by Drowfear
      </div>

      <button
        id="df-claim-all-btn"
        type="button"
        style="width:100%;background:#fa4056;color:#fff;border:none;padding:6px 10px;border-radius:6px;font-size:11px;font-weight:bold;cursor:pointer;margin-bottom:8px;display:flex;align-items:center;justify-content:center;gap:6px;"
      >
        <span id="df-btn-text">⚡ Claim All Links On Page</span>
      </button>

      <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:8px;font-size:10.5px;color:#a1a1aa;">
        <label for="df-speed-select">Speed:</label>
        <select
          id="df-speed-select"
          style="background:#27272a;color:#f4f4f5;border:1px solid #3f3f46;border-radius:4px;font-size:10.5px;padding:2px 4px;"
        >
          <option value="3">Safe (3)</option>
          <option value="6" selected>Fast (6)</option>
          <option value="10">Turbo (10)</option>
        </select>
        <button
          id="df-toggle-panel"
          type="button"
          style="background:#27272a;color:#f4f4f5;border:1px solid #3f3f46;border-radius:4px;font-size:10.5px;padding:2px 6px;cursor:pointer;"
        >
          📋 Log
        </button>
      </div>

      <div style="display:flex;gap:6px;justify-content:center;">
        <a href="https://buymeacoffee.com/drowfear" target="_blank" rel="noopener noreferrer"
          style="background:#FF813F;color:#fff;padding:4px 8px;border-radius:6px;text-decoration:none;font-size:11px;font-weight:bold;">☕ Coffee</a>
        <a href="https://ko-fi.com/drowfear" target="_blank" rel="noopener noreferrer"
          style="background:#FF5E5B;color:#fff;padding:4px 8px;border-radius:6px;text-decoration:none;font-size:11px;font-weight:bold;">❤️ Ko-fi</a>
      </div>

      <button
        id="df-close-banner"
        type="button"
        aria-label="Close support banner"
        title="Close"
        style="position:absolute;top:6px;right:8px;background:none;border:none;color:#71717a;cursor:pointer;font-size:14px;font-weight:bold;"
      >✕</button>
    `;

    const appendBanner = () => {
      if (!document.body || document.getElementById('df-support-banner')) return;

      document.body.appendChild(banner);
      ProgressPanel.build();

      banner.querySelector('#df-close-banner').addEventListener('click', () => {
        sessionStorage.setItem('df_banner_closed', 'true');
        banner.remove();
      });

      banner.querySelector('#df-speed-select').addEventListener('change', (event) => {
        CONFIG.concurrency = Number(event.target.value) || 6;
      });

      banner.querySelector('#df-toggle-panel').addEventListener('click', () => {
        const panel = document.getElementById('df-progress-panel');
        if (panel) panel.classList.toggle('df-visible');
      });

      const claimButton = banner.querySelector('#df-claim-all-btn');
      const buttonText = banner.querySelector('#df-btn-text');

      claimButton.addEventListener('click', async () => {
        claimButton.disabled = true;
        claimButton.style.opacity = '0.7';
        claimButton.style.cursor = 'not-allowed';
        buttonText.textContent = '⏳ Processing...';

        try {
          await processAllPageLinks();
        } catch (error) {
          console.error('[Redeem itch.io]', error);
          notify('An error occurred during extraction.', 'error');
        } finally {
          claimButton.disabled = false;
          claimButton.style.opacity = '1';
          claimButton.style.cursor = 'pointer';
          buttonText.textContent = '⚡ Claim All Links On Page';
        }
      });
    };

    if (document.body) {
      appendBanner();
    } else {
      window.addEventListener('DOMContentLoaded', appendBanner, { once: true });
    }
  }

  createStartupBanner();
}());
