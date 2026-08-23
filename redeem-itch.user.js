// ==UserScript==
// @name         Redeem itch.io (English)
// @namespace    Redeem-itch.io
// @version      1.7.3
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
// ==/UserScript==

/* global checkItchGame, MutationObserver, Swal */
/* eslint-disable camelcase */

(function () {
  'use strict';

  const closeWindow = true;
  const url = window.location.href;

  // Estilos CSS para el Banner (Arriba a la derecha) y SweetAlert2 Modern Dark Mode
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
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1) !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
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
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5) !important;
    }
    .swal2-title {
      color: #ffffff !important;
      font-weight: 700 !important;
      font-size: 1.25rem !important;
    }
    .swal2-content, .swal2-html-container {
      color: #e4e4e7 !important;
      font-size: 0.95rem !important;
    }
    .swal2-content a, .swal2-html-container a {
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
  `);

  // Comandos del menú de Tampermonkey
  GM_registerMenuCommand('☕ Support My Work (Buy Me a Coffee)', () => {
    GM_openInTab('https://buymeacoffee.com/drowfear', { active: true });
  });
  GM_registerMenuCommand('❤️ Support My Work (Ko-fi)', () => {
    GM_openInTab('https://ko-fi.com/drowfear', { active: true });
  });
  GM_registerMenuCommand('Extract All Itch Links', async () => {
    await processAllPageLinks();
  });

  /** ************************* Automatic Download Link Claiming ***************************/
  if (/^https?:\/\/[\w\W]{1,}\.itch\.io\/[\w]{1,}(-[\w]{1,}){0,}\/download\/[\w\W]{0,}/i.test(url)) {
    $('button.button').map((i, e) => {
      if (/link|claim|链接|vincular|reclamar/gim.test($(e).text())) e.click();
      return e;
    });
    if ((/This page is linked|此页面已链接到帐户|Esta página está vinculada/gim.test($('div.inner_column').text()) || $('a.button.download_btn[data-upload_id]').length > 0) && closeWindow === true) {
      closePage();
    }
  }

  /** ********************* Claim Free Itch.io Games ***************************/
  if (/^https?:\/\/.*?itch\.io\/.*?\/purchase(\?.*?)?$/.test(url) && /No thanks, just take me to the downloads|不用了，请带 me 去下载页面|No gracias, llévame a las descargas/i.test($('a.direct_download_btn').text())) {
    $('a.direct_download_btn')[0].click();
  } else if (
    $('.purchase_banner_inner').length === 0 &&
    (
      /0\.00/gim.test($('.button_message').eq(0).find('.dollars[itemprop]').text()) ||
      /0\.00/gim.test($('.money_input').attr('placeholder')) ||
      /自己出价|Name your own price|Pon tu propio precio/gim.test($('.button_message').eq(0).find('.buy_message').text())
    )
  ) {
    $('.buy_btn').after(`<a data-itch-href="${$('.buy_btn').attr('href')}" href="javascript:void(0)" onclick="redeemItchGame(this)" target="_self" class="button" one-link-mark="yes" title="Claim in background">Claim in Background</a>`);
  }

  /** ********************** Temporary Bundles *****************************/
  if (/https?:\/\/itch.io\/s\/[\d]{1,}\/[\w\W]{1,}/.test(url)) {
    if ($('.promotion_buy_row .buy_game_btn').length > 0) {
      $('.promotion_buy_row .buy_game_btn').after('<button id="redeem-itch-io" class="button" style="font-size:18px;letter-spacing:0.025em;line-height:36px;height:40px;padding:0 20px;margin:0 16px">Claim in Background</button>');
    } else {
      $('.countdown_row').prepend('<div style="width: 100%"><button id="redeem-itch-io" class="button" style="font-size:18px;letter-spacing:0.025em;line-height:36px;padding:0 20px;margin: 10px 30%;width: 40%;">Claim in Background</button></div>');
    }

    $('#redeem-itch-io').click(async () => {
      const gameLink = $('.thumb_link.game_link');
      for (const e of gameLink) {
        await redeemGame(e);
      }
      log('Bundle processing completed!', 'success');
    });
  }

  /** ********************** Claim from External Sites *****************************/
  if (['keylol.com', 'www.steamgifts.com', 'www.reddit.com', 'new.isthereanydeal.com', 'freegames.codes', 'itchclaim.tmbpeter.com', 'shaigrorb.github.io'].includes(window.location.hostname)) {
    addRedeemBtn();
    const observer = new MutationObserver(addRedeemBtn);
    observer.observe(document.documentElement, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true
    });
  }

  function addRedeemBtn() {
    for (const e of $('a[href*="itch.io"]:not(".redeem-itch-game")')) {
      const positionEle = window.location.hostname === 'shaigrorb.github.io' ? $(e).addClass('redeem-itch-game').parents('.item-card') : $(e).addClass('redeem-itch-game');
      positionEle.after(`<a ${
        window.location.hostname === 'freegames.codes' ? 'class="details__buy" ' : ''
      }
        data-itch-href="${$(e).attr('href')}"
        href="javascript:void(0);"
        onclick="redeemItchGame('${$(e).attr('href')}')"
        target="_self"
        style="${window.location.hostname === 'shaigrorb.github.io' ? 'position:relative;height:min-content;right:39px;background-color:#16a34a;top:4px;text-decoration-line:none;color:white;font-weight:bold;border-radius:2px;padding:5px;font-size:13px; ' : `margin-${window.location.hostname === 'freegames.codes' ? 'top' : 'left'}:10px !important;`}">Claim</a>`);
    }
  }

  unsafeWindow.redeemItchGame = redeemGame;

  function closePage() {
    window.close();
  }

  function log(msg, type = 'info') {
    if (typeof msg !== 'string') return console.log(msg);

    Swal[$('.swal2-container').length > 0 ? 'update' : 'fire']({
      title: type === 'success' ? 'Success!' : type === 'error' ? 'Error' : 'Notice',
      html: msg,
      icon: type,
      showConfirmButton: true,
      customClass: {
        title: 'break-all'
      }
    });

    let color = 'color:';
    switch (type) {
      case 'success': color += 'green'; break;
      case 'warning': color += 'blue'; break;
      case 'info': color += 'yellow'; break;
      case 'error': color += 'red'; break;
      default: color += 'black';
    }
    console.log(`%c[Redeem itch.io] ${msg}`, color);
  }

  async function processAllPageLinks() {
    // Retardo asíncrono para obligar al navegador a repintar el DOM/SweetAlert antes de escanear
    await new Promise((resolve) => setTimeout(resolve, 50));

    const rawLinks = $('a[href*="itch.io"]:not(".itch-io-game-link-owned"):not([href*="itch.io/b/"]):not([href*="itch.io/c/"])').toArray();

    if (rawLinks.length === 0) {
      log('No valid itch.io links found on this page.', 'warning');
      return;
    }

    let gamesLink = [];
    for (let i = 0; i < rawLinks.length; i++) {
      log(`Scanning link ${i + 1} of ${rawLinks.length}...`);
      const links = await getUrlLink(rawLinks[i]);
      gamesLink = [...gamesLink, ...links];
    }

    gamesLink = [...new Set(gamesLink)];

    if (gamesLink.length === 0) {
      log('No claimable games found in the extracted links.', 'warning');
      return;
    }

    for (const e of gamesLink) {
      await isOwn(e);
    }

    log('All games processed!', 'success');
  }

  async function getUrlLink(e) {
    let url = '';
    if ($(e).attr('data-itch-href')) {
      url = $(e).attr('data-itch-href');
    } else {
      if ($(e).hasClass('itch-io-game-link-owned')) return [];
      url = $(e).attr('href');
    }
    log(`Processing game/bundle link: <br/>${url}`);
    if (/https?:\/\/itch.io\/s\/[\d]+\/.+/.test(url)) {
      log(`Fetching bundle information...<br/>${url}`);
      const data = await httpRequest({ url, method: 'get' });

      if (data.status === 200) {
        if (data.responseText.includes('not_active_notification')) {
          log('Promotion has ended!', 'error');
          return [];
        }
        const gamesLink = [];
        const games = $(data.responseText).find('.game_grid_widget.promo_game_grid a.thumb_link.game_link');
        for (const g of games) {
          gamesLink.push(g.href.replace(/\/$/, ''));
        }
        return gamesLink;
      }
      log('Request error!', 'error');
      log(data);
      return [];
    } else if (/^https?:\/\/.+?\.itch\.io\/[^/]+?(\/purchase)?$/.test(url)) {
      return [url.replace('/purchase', '').replace(/\/$/, '')];
    }
    return [];
  }

  async function redeemGame(e) {
    let url = '';
    if (typeof e === 'string') {
      url = e;
    } else if ($(e).attr('data-itch-href')) {
      url = $(e).attr('data-itch-href');
    } else {
      if ($(e).hasClass('itch-io-game-link-owned')) return;
      url = $(e).attr('href');
    }
    log(`Current link: <br/>${url}`);
    if (/https?:\/\/itch.io\/s\/[\d]+\/.+/.test(url)) {
      log(`Fetching bundle information...<br/>${url}`);
      const data = await httpRequest({ url, method: 'get' });
      if (data.status === 200) {
        if (data.responseText.includes('not_active_notification')) {
          log('Promotion has ended!', 'error');
        } else {
          const games = $(data.responseText).find('.game_grid_widget.promo_game_grid a.thumb_link.game_link');
          for (const g of games) {
            await isOwn(g.href);
          }
          log('Finished processing bundle!', 'success');
        }
      } else {
        log('Request error!', 'error');
        log(data);
      }
    } else if (/^https?:\/\/.+?\.itch\.io\/[^/]+?(\/purchase)?$/.test(url)) {
      await isOwn(url.replace('/purchase', ''));
    } else if (/^https?:\/\/.+?\.itch\.io\/[^/]+?(\/purchase)\?reward_id=/.test(url)) {
      await isOwn(url);
    }
  }

  async function isOwn(url) {
    log(`Game link: <br/>${url}`);
    log(`Checking ownership...<br/>${url}`);
    const data = await httpRequest({ url, method: 'get' });
    if (data.status === 200) {
      if (data.responseText.includes('purchase_banner_inner')) {
        log('You already own this game!', 'success');
      } else {
        await purchase(url);
      }
    } else {
      log('Request error!', 'error');
      log(data);
    }
  }

  async function purchase(url) {
    try {
      log(`Loading checkout page...<br/>${url}`);
      const purchaseUrl = url.includes('/purchase') ? url : `${url}/purchase`;
      const data = await httpRequest({ url: purchaseUrl, method: 'get' });
      if (data.status === 200) {
        const html = $(data.responseText);
        if (/0\.00/gim.test(html.find('.button_message:first .dollars[itemprop]').text()) || /0\.00/gim.test(html.find('.money_input').attr('placeholder')) || /自己出价|Name your own price|Pon tu propio precio/gim.test(html.find('.button_message:first .buy_message').text())) {
          const csrf_token = html.find('[name="csrf_token"]').val();
          const reward_id = html.find('[name="reward_id"]').val();
          await download(purchaseUrl.replace(/\/purchase.*/, ''), csrf_token, reward_id);
        } else {
          log('Price is not $0.00, promotion may have ended!', 'error');
        }
      } else {
        log('Request error!', 'error');
        log(data);
      }
    } catch (error) {
      log('Request error!', 'error');
      log(error);
    }
  }

  async function download(url, csrf_token, reward_id) {
    log(`Requesting download page...<br/>${url}`);
    const data = await httpRequest({
      url: `${url}/download_url`,
      method: 'post',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      data: `csrf_token=${encodeURIComponent(csrf_token)}${reward_id ? (`&reward_id=${reward_id}`) : ''}`,
      responseType: 'json'
    });
    if (data.status === 200 && data.response && data.response.url) {
      await loadDownload(data.response.url, url);
    } else {
      log('Request error!', 'error');
      log(data);
    }
  }

  async function loadDownload(e, referer) {
    log('Loading download page...');
    const urlObj = new URL(e);
    const data = await httpRequest({
      url: urlObj.href,
      method: 'get',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        DNT: 1,
        Host: urlObj.hostname,
        Referer: referer,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });
    if (data.status === 200 && data.responseText) {
      const html = $(data.responseText);
      const claimBtn = html.find('button.button:contains("Link"),button.button:contains("Claim"),button.button:contains("链接"),button.button:contains("Vincular"),button.button:contains("Reclamar")');
      const form = html.find('form[action*="claim-key"]');
      if (/This page is linked|此页面已链接到帐户|Esta página está vinculada/gim.test(html.find('div.inner_column').text()) || html.find('a.button.download_btn[data-upload_id]').length > 0) {
        log('Successfully claimed!', 'success');
      } else if (form.length > 0) {
        const actionUrl = form.attr('action');
        const csrf_token = form.find('input[name="csrf_token"]').val();
        await claimame(actionUrl, csrf_token, urlObj.href);
      } else if (claimBtn.length > 0 && claimBtn.parents('form').length > 0) {
        const actionForm = claimBtn.parents('form');
        const actionUrl = actionForm.attr('action');
        const csrf_token = actionForm.find('input[name="csrf_token"]').val();
        await claimame(actionUrl, csrf_token, urlObj.href);
      } else if (data.finalUrl.includes('/register')) {
        log('Claim failed, please log in to itch.io first!', 'error');
      } else {
        log('Process completed with unknown result.', 'success');
      }
    } else {
      log('Request error!', 'error');
      log(data);
    }
    if (typeof checkItchGame === 'function') checkItchGame();
  }

  async function claimame(e, token, referer) {
    log('Claiming game...');
    const urlObj = new URL(e);
    const data = await httpRequest({
      url: urlObj.href,
      method: 'post',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: referer,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      },
      data: `csrf_token=${encodeURIComponent(token)}`
    });
    if (data.status === 200 && data.responseText) {
      const html = $(data.responseText);
      if (/This page is linked|此页面已链接到帐户|Esta página está vinculada/gim.test(html.find('div.inner_column').text()) || html.find('a.button.download_btn[data-upload_id]').length > 0) {
        log('Successfully claimed!', 'success');
      } else {
        log('Process completed with unknown result.', 'success');
      }
    } else if (data.finalUrl.includes('/register')) {
      log('Please log in first!', 'error');
      log(data);
    } else {
      log('Request error!', 'error');
      log(data);
    }
  }

  function httpRequest(option, i = 0) {
    return new Promise((resolve, reject) => {
      option.onload = (data) => resolve(data);
      option.onerror = reject;
      option.ontimeout = reject;
      option.onabort = reject;
      option.timeout = 30000;
      GM_xmlhttpRequest(option);
    }).then((data) => data)
      .catch(() => {
        if (i > 1) return {};
        return httpRequest(option, ++i);
      });
  }

  // Banner flotante superior permanente con feedback visual e icono de carga instantáneo
  function createStartupBanner() {
    if (document.getElementById('df-support-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'df-support-banner';
    banner.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 6px; font-size: 13px; color: #ffffff;">🎮 Itch.io Auto-Redeem Active</div>
      <div style="font-size: 11px; margin-bottom: 8px; color: #a1a1aa;">Created by Drowfear</div>
      <button id="df-claim-all-btn" style="width: 100%; background: #fa4056; color: #fff; border: none; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer; margin-bottom: 8px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px;">
        <span id="df-btn-text">⚡ Claim All Links On Page</span>
      </button>
      <div style="display: flex; gap: 6px; justify-content: center;">
        <a href="https://buymeacoffee.com/drowfear" target="_blank" style="background: #FF813F; color: #fff; padding: 4px 8px; border-radius: 6px; text-decoration: none; font-size: 11px; font-weight: bold;">☕ Coffee</a>
        <a href="https://ko-fi.com/drowfear" target="_blank" style="background: #FF5E5B; color: #fff; padding: 4px 8px; border-radius: 6px; text-decoration: none; font-size: 11px; font-weight: bold;">❤️ Ko-fi</a>
      </div>
      <button id="df-close-banner" style="position: absolute; top: 6px; right: 8px; background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px; font-weight: bold;">✕</button>
    `;

    document.body.appendChild(banner);

    document.getElementById('df-close-banner').onclick = function () {
      banner.remove();
    };

    const claimBtn = document.getElementById('df-claim-all-btn');
    const btnText = document.getElementById('df-btn-text');

    claimBtn.onclick = async function () {
      // 1. Deshabilitar el botón en el banner
      claimBtn.disabled = true;
      claimBtn.style.opacity = '0.7';
      claimBtn.style.cursor = 'not-allowed';
      btnText.innerHTML = '⏳ Processing...';

      // 2. Feedback visual INSTANTÁNEO
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
      } catch (err) {
        console.error(err);
        log('An error occurred during extraction.', 'error');
      } finally {
        // 3. Restaurar estado original del botón
        claimBtn.disabled = false;
        claimBtn.style.opacity = '1';
        claimBtn.style.cursor = 'pointer';
        btnText.innerHTML = '⚡ Claim All Links On Page';
      }
    };
  }

  createStartupBanner();
}());
