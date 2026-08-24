// ==UserScript==
// @name         Redeem itch.io (English)
// @namespace    Redeem-itch.io
// @version      2.0.0 Final
// @description  Automatically claim free game keys and claimable links on itch.io and external deal sites
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

  const closeWindow = true;
  const currentUrl = window.location.href;

  GM_addStyle(`
    #df-support-banner {
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      z-index: 999999 !important;
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
      min-width: 230px !important;
      border: 2px solid #fa4056 !important;
    }

    #df-support-banner a:hover {
      opacity: 0.85;
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

    .swal2-icon.swal2-info {
      border-color: #38bdf8 !important;
      color: #38bdf8 !important;
    }

    .swal2-icon.swal2-success {
      border-color: #22c55e !important;
      color: #22c55e !important;
    }

    .swal2-icon.swal2-error {
      border-color: #ef4444 !important;
      color: #ef4444 !important;
    }

    .swal2-icon.swal2-warning {
      border-color: #f59e0b !important;
      color: #f59e0b !important;
    }

    .df-redeem-link {
      cursor: pointer;
    }
  `);

  GM_registerMenuCommand('☕ Support My Work (Buy Me a Coffee)', () => {
    GM_openInTab('https://buymeacoffee.com/drowfear', { active: true });
  });

  GM_registerMenuCommand('❤️ Support My Work (Ko-fi)', () => {
    GM_openInTab('https://ko-fi.com/drowfear', { active: true });
  });

  GM_registerMenuCommand('Extract All Itch Links', async () => {
    await processAllPageLinks();
  });

  /**
   * Escapa texto antes de introducirlo en el HTML de SweetAlert.
   */
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Convierte y valida una URL de itch.io.
   */
  function normalizeItchUrl(value, base = window.location.href) {
    if (!value) return null;

    try {
      const parsedUrl = new URL(String(value).trim(), base);

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return null;
      }

      const hostname = parsedUrl.hostname.toLowerCase();

      if (hostname !== 'itch.io' && !hostname.endsWith('.itch.io')) {
        return null;
      }

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

    if (hostname === 'itch.io' || hostname === 'www.itch.io') {
      return false;
    }

    return /^\/[^/]+(?:\/purchase)?\/?$/i.test(parsedUrl.pathname);
  }

  function isItchDownloadUrl(value) {
    const normalizedUrl = normalizeItchUrl(value);
    if (!normalizedUrl) return false;

    const parsedUrl = new URL(normalizedUrl);
    const hostname = parsedUrl.hostname.toLowerCase();

    return (
      hostname.endsWith('.itch.io') &&
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

    if (/\/purchase\/?$/i.test(parsedUrl.pathname)) {
      return parsedUrl.href;
    }

    parsedUrl.pathname = `${parsedUrl.pathname.replace(/\/+$/, '')}/purchase`;
    parsedUrl.search = '';
    parsedUrl.hash = '';

    return parsedUrl.href;
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

  /**
   * Automatic download-link claiming.
   */
  if (isItchDownloadUrl(currentUrl)) {
    $('button.button').each((index, element) => {
      const buttonText = $(element).text();

      if (/link|claim|链接|vincular|reclamar/i.test(buttonText)) {
        element.click();
      }
    });

    const pageIsLinked =
      /This page is linked|此页面已链接到帐户|Esta página está vinculada/i.test(
        $('div.inner_column').text()
      );

    const downloadIsAvailable =
      $('a.button.download_btn[data-upload_id]').length > 0;

    if ((pageIsLinked || downloadIsAvailable) && closeWindow) {
      closePage();
    }
  }

  /**
   * Claim free itch.io games.
   */
  const currentNormalizedUrl = normalizeItchUrl(currentUrl);

  if (
    currentNormalizedUrl &&
    /\/purchase\/?$/i.test(new URL(currentNormalizedUrl).pathname) &&
    /No thanks, just take me to the downloads|不用了，请带我去下载页面|No gracias, llévame a las descargas/i.test(
      $('a.direct_download_btn').text()
    )
  ) {
    const directDownloadButton = $('a.direct_download_btn').get(0);

    if (directDownloadButton) {
      directDownloadButton.click();
    }
  } else if (
    isItchGameUrl(currentUrl) &&
    $('.purchase_banner_inner').length === 0 &&
    isFreeCheckout($(document))
  ) {
    const buyButton = $('.buy_btn').first();
    const purchaseHref = normalizeItchUrl(
      buyButton.attr('href'),
      window.location.href
    );

    if (
      buyButton.length > 0 &&
      purchaseHref &&
      $('.df-background-claim-button').length === 0
    ) {
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

  /**
   * Temporary bundles.
   */
  if (isItchBundleUrl(currentUrl)) {
    if ($('#redeem-itch-io').length === 0) {
      const bundleButton = $(
        '<button>',
        {
          id: 'redeem-itch-io',
          class: 'button',
          type: 'button',
          text: 'Claim in Background'
        }
      );

      if ($('.promotion_buy_row .buy_game_btn').length > 0) {
        bundleButton.attr(
          'style',
          [
            'font-size:18px',
            'letter-spacing:0.025em',
            'line-height:36px',
            'height:40px',
            'padding:0 20px',
            'margin:0 16px'
          ].join(';')
        );

        $('.promotion_buy_row .buy_game_btn').after(bundleButton);
      } else {
        bundleButton.attr(
          'style',
          [
            'font-size:18px',
            'letter-spacing:0.025em',
            'line-height:36px',
            'padding:0 20px',
            'margin:10px 30%',
            'width:40%'
          ].join(';')
        );

        const buttonContainer = $('<div>', {
          style: 'width:100%;'
        }).append(bundleButton);

        $('.countdown_row').prepend(buttonContainer);
      }

      bundleButton.on('click', async () => {
        const gameLinks = $('.thumb_link.game_link').toArray();

        bundleButton.prop('disabled', true);

        try {
          for (const gameLink of gameLinks) {
            await redeemGame(gameLink);
          }

          log('Bundle processing completed!', 'success');
        } finally {
          bundleButton.prop('disabled', false);
        }
      });
    }
  }

  /**
   * Claim links from external sites.
   */
  const supportedExternalHosts = [
    'keylol.com',
    'www.steamgifts.com',
    'www.reddit.com',
    'new.isthereanydeal.com',
    'freegames.codes',
    'itchclaim.tmbpeter.com',
    'shaigrorb.github.io'
  ];

  if (supportedExternalHosts.includes(window.location.hostname)) {
    addRedeemBtn();

    const observer = new MutationObserver(() => {
      addRedeemBtn();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function addRedeemBtn() {
    const links = document.querySelectorAll(
      'a[href*="itch.io"]:not(.redeem-itch-game)'
    );

    for (const originalLink of links) {
      const itchUrl = normalizeItchUrl(
        originalLink.getAttribute('href'),
        window.location.href
      );

      originalLink.classList.add('redeem-itch-game');

      if (!itchUrl) {
        continue;
      }

      const claimLink = document.createElement('a');
      claimLink.href = '#';
      claimLink.textContent = 'Claim';
      claimLink.classList.add('df-redeem-link');
      claimLink.dataset.itchHref = itchUrl;
      claimLink.target = '_self';

      if (window.location.hostname === 'freegames.codes') {
        claimLink.classList.add('details__buy');
      }

      if (window.location.hostname === 'shaigrorb.github.io') {
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
      } else if (window.location.hostname === 'freegames.codes') {
        claimLink.style.setProperty('margin-top', '10px', 'important');
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

  unsafeWindow.redeemItchGame = redeemGame;

  function closePage() {
    window.close();
  }

  function log(message, type = 'info') {
    if (typeof message !== 'string') {
      console.log('[Redeem itch.io]', message);
      return;
    }

    const validTypes = ['success', 'error', 'warning', 'info'];
    const normalizedType = validTypes.includes(type) ? type : 'info';

    const titles = {
      success: 'Success!',
      error: 'Error',
      warning: 'Warning',
      info: 'Notice'
    };

    const alertOptions = {
      title: titles[normalizedType],
      html: message,
      icon: normalizedType,
      showConfirmButton: true,
      customClass: {
        title: 'break-all'
      }
    };

    if ($('.swal2-container').length > 0 && Swal.isVisible()) {
      Swal.hideLoading();
      Swal.update(alertOptions);
    } else {
      Swal.fire(alertOptions);
    }

    const colors = {
      success: 'green',
      warning: 'orange',
      info: '#38bdf8',
      error: 'red'
    };

    console.log(
      `%c[Redeem itch.io] ${message.replace(/<br\s*\/?>/gi, ' ')}`,
      `color:${colors[normalizedType]}`
    );
  }

  async function processAllPageLinks() {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 50);
    });

    const rawLinks = $(
      [
        'a[href*="itch.io"]',
        ':not(.itch-io-game-link-owned)',
        ':not([href*="itch.io/b/"])',
        ':not([href*="itch.io/c/"])'
      ].join('')
    ).toArray();

    if (rawLinks.length === 0) {
      log('No valid itch.io links found on this page.', 'warning');
      return;
    }

    let gameLinks = [];

    for (let index = 0; index < rawLinks.length; index += 1) {
      log(`Scanning link ${index + 1} of ${rawLinks.length}...`);

      const extractedLinks = await getUrlLink(rawLinks[index]);
      gameLinks.push(...extractedLinks);
    }

    gameLinks = [...new Set(gameLinks)];

    if (gameLinks.length === 0) {
      log('No claimable games found in the extracted links.', 'warning');
      return;
    }

    for (const gameLink of gameLinks) {
      await isOwn(gameLink);
    }

    log('All games processed!', 'success');
  }

  async function getUrlLink(element) {
    if ($(element).hasClass('itch-io-game-link-owned')) {
      return [];
    }

    const rawUrl =
      $(element).attr('data-itch-href') ||
      $(element).attr('href');

    const itchUrl = normalizeItchUrl(rawUrl, window.location.href);

    if (!itchUrl) {
      return [];
    }

    log(
      `Processing game/bundle link:<br>${escapeHtml(itchUrl)}`
    );

    if (isItchBundleUrl(itchUrl)) {
      log(
        `Fetching bundle information...<br>${escapeHtml(itchUrl)}`
      );

      const data = await httpRequest({
        url: itchUrl,
        method: 'GET'
      });

      if (data.status !== 200) {
        log('Request error!', 'error');
        log(data);
        return [];
      }

      if (String(data.responseText || '').includes('not_active_notification')) {
        log('Promotion has ended!', 'error');
        return [];
      }

      const extractedGameLinks = [];
      const games = $(data.responseText).find(
        '.game_grid_widget.promo_game_grid a.thumb_link.game_link'
      );

      for (const game of games) {
        const gameUrl = normalizeItchUrl(
          $(game).attr('href'),
          data.finalUrl || itchUrl
        );

        if (gameUrl && isItchGameUrl(gameUrl)) {
          extractedGameLinks.push(
            getGameBaseUrl(gameUrl)
          );
        }
      }

      return extractedGameLinks.filter(Boolean);
    }

    if (isItchGameUrl(itchUrl)) {
      const gameBaseUrl = getGameBaseUrl(itchUrl);
      return gameBaseUrl ? [gameBaseUrl] : [];
    }

    return [];
  }

  async function redeemGame(elementOrUrl) {
    let rawUrl = '';

    if (typeof elementOrUrl === 'string') {
      rawUrl = elementOrUrl;
    } else if (elementOrUrl) {
      if ($(elementOrUrl).hasClass('itch-io-game-link-owned')) {
        return;
      }

      rawUrl =
        $(elementOrUrl).attr('data-itch-href') ||
        $(elementOrUrl).attr('href') ||
        '';
    }

    const itchUrl = normalizeItchUrl(rawUrl, window.location.href);

    if (!itchUrl) {
      log('Invalid or unsupported itch.io URL.', 'error');
      return;
    }

    log(`Current link:<br>${escapeHtml(itchUrl)}`);

    if (isItchBundleUrl(itchUrl)) {
      log(
        `Fetching bundle information...<br>${escapeHtml(itchUrl)}`
      );

      const data = await httpRequest({
        url: itchUrl,
        method: 'GET'
      });

      if (data.status !== 200) {
        log('Request error!', 'error');
        log(data);
        return;
      }

      if (String(data.responseText || '').includes('not_active_notification')) {
        log('Promotion has ended!', 'error');
        return;
      }

      const games = $(data.responseText).find(
        '.game_grid_widget.promo_game_grid a.thumb_link.game_link'
      );

      for (const game of games) {
        const gameUrl = normalizeItchUrl(
          $(game).attr('href'),
          data.finalUrl || itchUrl
        );

        if (gameUrl) {
          await isOwn(gameUrl);
        }
      }

      log('Finished processing bundle!', 'success');
      return;
    }

    if (isItchGameUrl(itchUrl)) {
      await isOwn(itchUrl);
      return;
    }

    log('The supplied URL is not a supported game or bundle.', 'warning');
  }

  async function isOwn(url) {
    const itchUrl = normalizeItchUrl(url);

    if (!itchUrl) {
      log('Invalid itch.io game URL.', 'error');
      return;
    }

    log(`Game link:<br>${escapeHtml(itchUrl)}`);
    log(`Checking ownership...<br>${escapeHtml(itchUrl)}`);

    const data = await httpRequest({
      url: itchUrl,
      method: 'GET'
    });

    if (data.status !== 200) {
      log('Request error!', 'error');
      log(data);
      return;
    }

    const responseText = String(data.responseText || '');

    if (responseText.includes('purchase_banner_inner')) {
      log('You already own this game!', 'success');
      return;
    }

    await purchase(itchUrl);
  }

  async function purchase(url) {
    try {
      const purchaseUrl = getPurchaseUrl(url);

      if (!purchaseUrl) {
        log('Could not build the checkout URL.', 'error');
        return;
      }

      log(
        `Loading checkout page...<br>${escapeHtml(purchaseUrl)}`
      );

      const data = await httpRequest({
        url: purchaseUrl,
        method: 'GET'
      });

      if (data.status !== 200) {
        log('Request error!', 'error');
        log(data);
        return;
      }

      const html = $(data.responseText);

      if (!isFreeCheckout(html)) {
        log(
          'Price is not $0.00, or the promotion may have ended!',
          'error'
        );
        return;
      }

      const csrf_token = html.find('[name="csrf_token"]').first().val();
      const reward_id = html.find('[name="reward_id"]').first().val();
      const gameBaseUrl = getGameBaseUrl(purchaseUrl);

      if (!csrf_token) {
        log(
          'The checkout page did not provide a CSRF token. You may need to log in again.',
          'error'
        );
        return;
      }

      if (!gameBaseUrl) {
        log('Could not determine the game URL.', 'error');
        return;
      }

      await download(gameBaseUrl, csrf_token, reward_id);
    } catch (error) {
      log('Request error!', 'error');
      log(error);
    }
  }

  async function download(url, csrf_token, reward_id) {
    if (!csrf_token) {
      log('Missing CSRF token.', 'error');
      return;
    }

    log(
      `Requesting download page...<br>${escapeHtml(url)}`
    );

    const formData = new URLSearchParams();
    formData.set('csrf_token', csrf_token);

    if (reward_id) {
      formData.set('reward_id', reward_id);
    }

    const data = await httpRequest({
      url: `${url.replace(/\/+$/, '')}/download_url`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      data: formData.toString(),
      responseType: 'json'
    });

    let response = data.response;

    if (
      (!response || typeof response !== 'object') &&
      data.responseText
    ) {
      try {
        response = JSON.parse(data.responseText);
      } catch (error) {
        response = null;
      }
    }

    if (data.status === 200 && response?.url) {
      await loadDownload(response.url, url);
      return;
    }

    log('Request error!', 'error');
    log(data);
  }

  async function loadDownload(downloadUrl, referer) {
    let resolvedUrl;

    try {
      resolvedUrl = new URL(downloadUrl, referer).href;
    } catch (error) {
      log('Invalid download URL returned by itch.io.', 'error');
      return;
    }

    log('Loading download page...');

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
      log('Claim failed. Please log in to itch.io first!', 'error');
      return;
    }

    if (data.status !== 200 || !data.responseText) {
      log('Request error!', 'error');
      log(data);
      return;
    }

    const html = $(data.responseText);

    const claimBtn = html.find(
      [
        'button.button:contains("Link")',
        'button.button:contains("Claim")',
        'button.button:contains("链接")',
        'button.button:contains("Vincular")',
        'button.button:contains("Reclamar")'
      ].join(',')
    );

    const claimForm = html.find('form[action*="claim-key"]').first();

    const alreadyLinked =
      /This page is linked|此页面已链接到帐户|Esta página está vinculada/i.test(
        html.find('div.inner_column').text()
      );

    const downloadAvailable =
      html.find('a.button.download_btn[data-upload_id]').length > 0;

    if (alreadyLinked || downloadAvailable) {
      log('Successfully claimed!', 'success');
    } else if (claimForm.length > 0) {
      const actionUrl = claimForm.attr('action');
      const csrf_token = claimForm
        .find('input[name="csrf_token"]')
        .first()
        .val();

      await claimGame(actionUrl, csrf_token, finalUrl);
    } else if (
      claimBtn.length > 0 &&
      claimBtn.first().closest('form').length > 0
    ) {
      const actionForm = claimBtn.first().closest('form');
      const actionUrl = actionForm.attr('action');
      const csrf_token = actionForm
        .find('input[name="csrf_token"]')
        .first()
        .val();

      await claimGame(actionUrl, csrf_token, finalUrl);
    } else {
      log(
        'The download page loaded, but no claim form or ownership confirmation was found.',
        'warning'
      );
    }

    if (typeof checkItchGame === 'function') {
      checkItchGame();
    }
  }

  async function claimGame(action, token, referer) {
    if (!action) {
      log('The claim form did not provide an action URL.', 'error');
      return;
    }

    if (!token) {
      log('The claim form did not provide a CSRF token.', 'error');
      return;
    }

    let actionUrl;

    try {
      actionUrl = new URL(action, referer).href;
    } catch (error) {
      log('The claim form returned an invalid URL.', 'error');
      return;
    }

    log('Claiming game...');

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
      log('Please log in to itch.io first!', 'error');
      return;
    }

    if (data.status !== 200 || !data.responseText) {
      log('Request error!', 'error');
      log(data);
      return;
    }

    const html = $(data.responseText);

    const linked =
      /This page is linked|此页面已链接到帐户|Esta página está vinculada/i.test(
        html.find('div.inner_column').text()
      );

    const downloadAvailable =
      html.find('a.button.download_btn[data-upload_id]').length > 0;

    if (linked || downloadAvailable) {
      log('Successfully claimed!', 'success');
    } else {
      log(
        'The claim request completed, but ownership could not be confirmed.',
        'warning'
      );
    }
  }

  function httpRequest(options, attempt = 0) {
    const maxAttempts = 3;

    return new Promise((resolve, reject) => {
      const requestOptions = {
        ...options,
        timeout: 30000,
        onload: resolve,
        onerror: reject,
        ontimeout: reject,
        onabort: reject
      };

      GM_xmlhttpRequest(requestOptions);
    }).catch(async (error) => {
      if (attempt + 1 >= maxAttempts) {
        return {
          status: 0,
          response: null,
          responseText: '',
          finalUrl: options.url,
          error
        };
      }

      await new Promise((resolve) => {
        window.setTimeout(resolve, 500 * (attempt + 1));
      });

      return httpRequest(options, attempt + 1);
    });
  }

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
        style="
          width:100%;
          background:#fa4056;
          color:#fff;
          border:none;
          padding:6px 10px;
          border-radius:6px;
          font-size:11px;
          font-weight:bold;
          cursor:pointer;
          margin-bottom:8px;
          transition:all 0.2s;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:6px;
        "
      >
        <span id="df-btn-text">⚡ Claim All Links On Page</span>
      </button>

      <div style="display:flex;gap:6px;justify-content:center;">
        <a
          href="https://buymeacoffee.com/drowfear"
          target="_blank"
          rel="noopener noreferrer"
          style="
            background:#FF813F;
            color:#fff;
            padding:4px 8px;
            border-radius:6px;
            text-decoration:none;
            font-size:11px;
            font-weight:bold;
          "
        >
          ☕ Coffee
        </a>

        <a
          href="https://ko-fi.com/drowfear"
          target="_blank"
          rel="noopener noreferrer"
          style="
            background:#FF5E5B;
            color:#fff;
            padding:4px 8px;
            border-radius:6px;
            text-decoration:none;
            font-size:11px;
            font-weight:bold;
          "
        >
          ❤️ Ko-fi
        </a>
      </div>

      <button
        id="df-close-banner"
        type="button"
        aria-label="Close support banner"
        title="Close"
        style="
          position:absolute;
          top:6px;
          right:8px;
          background:none;
          border:none;
          color:#71717a;
          cursor:pointer;
          font-size:14px;
          font-weight:bold;
        "
      >
        ✕
      </button>
    `;

    const appendBanner = () => {
      if (!document.body || document.getElementById('df-support-banner')) {
        return;
      }

      document.body.appendChild(banner);

      const closeButton = banner.querySelector('#df-close-banner');
      const claimButton = banner.querySelector('#df-claim-all-btn');
      const buttonText = banner.querySelector('#df-btn-text');

      closeButton.addEventListener('click', () => {
        sessionStorage.setItem('df_banner_closed', 'true');
        banner.remove();
      });

      claimButton.addEventListener('click', async () => {
        claimButton.disabled = true;
        claimButton.style.opacity = '0.7';
        claimButton.style.cursor = 'not-allowed';
        buttonText.textContent = '⏳ Processing...';

        Swal.fire({
          title: 'Scanning Page...',
          html: 'Searching for valid itch.io links and processing claims.',
          icon: 'info',
          allowOutsideClick: false,
          showConfirmButton: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        try {
          await processAllPageLinks();
        } catch (error) {
          console.error('[Redeem itch.io]', error);
          log('An error occurred during extraction.', 'error');
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
      window.addEventListener('DOMContentLoaded', appendBanner, {
        once: true
      });
    }
  }

  createStartupBanner();
}());
