let timeoutId = null;

// --- Toast de progresso ---
// Um único toast, atualizado a cada etapa, exibido na aba ativa de cada janela normal
// e reposicionado quando o usuário troca de aba ou navega.
let progress = null; // { x: {state, label}, bsky: {state, label}, done }
let renderedTabs = new Set();
let hideTimeoutId = null;
const progressReady = chrome.storage.session.get(['xskyProgress']).then((r) => {
  progress = r.xskyProgress || null;
});

// Roda dentro da página: precisa ser autocontida.
function renderProgressToast(state) {
  const HOST_ID = 'xsky-progress-toast';
  let host = document.getElementById(HOST_ID);
  if (!state) {
    if (host) host.remove();
    return;
  }
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    host.attachShadow({ mode: 'open' });
    (document.body || document.documentElement).appendChild(host);
  }
  // Montado via DOM (sem innerHTML) para funcionar em sites com Trusted Types
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const icons = { waiting: '○', success: '✓', error: '✕' };
  const row = (name, item) => {
    const r = el('div', `row ${item.state}`);
    const icon = el('span', 'icon', icons[item.state]);
    if (item.state === 'active') icon.appendChild(el('span', 'spinner'));
    r.append(icon, el('span', 'name', name), el('span', 'label', item.label));
    return r;
  };

  const style = el('style', null, `
    :host { all: initial; }
    .box { position: fixed; bottom: 20px; right: 20px; z-index: 2147483647; min-width: 260px; max-width: 340px;
           background: #15202b; color: #e7e9ea; border-radius: 12px; padding: 12px 14px;
           font: 13px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           box-shadow: 0 8px 24px rgba(0,0,0,.35); }
    .title { font-weight: 700; margin-bottom: 8px; display: flex; justify-content: space-between; }
    .close { cursor: pointer; opacity: .6; border: 0; background: none; color: inherit; font: inherit; padding: 0 2px; }
    .close:hover { opacity: 1; }
    .row { display: flex; align-items: flex-start; gap: 8px; padding: 3px 0; }
    .icon { width: 16px; flex: none; text-align: center; font-weight: 700; }
    .name { font-weight: 600; flex: none; width: 64px; }
    .label { color: #8b98a5; }
    .waiting .icon { color: #8b98a5; }
    .success .icon, .success .label { color: #17bf63; }
    .error .icon, .error .label { color: #f4212e; }
    .spinner { display: inline-block; width: 10px; height: 10px; border: 2px solid #1d9bf0;
               border-right-color: transparent; border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }`);

  const close = el('button', 'close', '✕');
  close.title = 'Fechar';
  close.addEventListener('click', () => host.remove());
  const title = el('div', 'title');
  title.append(el('span', null, 'XSky Poster'), close);
  const box = el('div', 'box');
  box.append(title, row('X', state.x), row('Bluesky', state.bsky));
  host.shadowRoot.replaceChildren(style, box);

  clearTimeout(window.__xskyToastHide);
  if (state.done) window.__xskyToastHide = setTimeout(() => host.remove(), 6000);
}

function renderOnTab(tabId) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: renderProgressToast,
    args: [progress]
  }).then(() => {
    if (progress) renderedTabs.add(tabId); else renderedTabs.delete(tabId);
  }).catch(() => {}); // Páginas chrome://, Web Store etc. não aceitam injeção
}

async function broadcastProgress() {
  await progressReady;
  const tabs = await chrome.tabs.query({ active: true, windowType: 'normal' });
  const targets = new Set(tabs.map(t => t.id));
  // Remove o toast de abas que deixaram de ser as ativas
  for (const tabId of renderedTabs) {
    if (!targets.has(tabId)) {
      renderedTabs.delete(tabId);
      chrome.scripting.executeScript({ target: { tabId }, func: renderProgressToast, args: [null] }).catch(() => {});
    }
  }
  for (const tabId of targets) renderOnTab(tabId);
}

function startProgress() {
  clearTimeout(hideTimeoutId);
  progress = {
    x: { state: 'active', label: 'Abrindo o X...' },
    bsky: { state: 'waiting', label: 'Aguardando o X' },
    done: false
  };
  chrome.storage.session.set({ xskyProgress: progress });
  broadcastProgress();
}

async function setProgress(network, state, label) {
  await progressReady;
  if (!progress) return;
  progress[network] = { state, label };
  const isFinal = (s) => s === 'success' || s === 'error';
  progress.done = isFinal(progress.x.state) && isFinal(progress.bsky.state);
  chrome.storage.session.set({ xskyProgress: progress });
  broadcastProgress();

  if (progress.done) {
    clearTimeout(hideTimeoutId);
    hideTimeoutId = setTimeout(() => {
      progress = null;
      chrome.storage.session.remove('xskyProgress');
      broadcastProgress();
    }, 6000);
  }
}

function networkKey(network) {
  return network.includes('X') ? 'x' : 'bsky';
}

chrome.tabs.onActivated.addListener(() => {
  if (progress) broadcastProgress();
});

// Injeta o script do X pela aba (e não por URL no manifest): o X é SPA e reescreve
// /intent/tweet para /intent/post, /compose/post etc., o que impedia o content script de rodar.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (progress && tab.active) broadcastProgress(); // A navegação apaga o toast da página
  chrome.storage.session.get(['xTabId'], (result) => {
    if (result.xTabId !== tabId) return;
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['content_x.js']
    }).catch(e => console.log('Não foi possível injetar o script do X', e));
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'post') {
    const text = encodeURIComponent(request.text);
    const xUrl = `https://x.com/intent/tweet?text=${text}&xsky=1`;
    const bskyUrl = `https://bsky.app/intent/compose?text=${text}&xsky=1`;
    
    startProgress();
    
    chrome.storage.local.get(['postImage'], (result) => {
      const isFocused = !!result.postImage; // Sem imagem = Sem foco (invisível)!
      
      chrome.storage.local.set({ pendingBsky: bskyUrl, pendingFocus: isFocused }, () => {
        chrome.windows.create({
          url: xUrl,
          type: 'popup',
          focused: isFocused,
          width: 600,
          height: 600
        }, (win) => {
          const xTabId = win && win.tabs && win.tabs[0] ? win.tabs[0].id : null;
          chrome.storage.session.set({ xTabId });

          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            setProgress('x', 'error', 'Tempo esgotado');
            chrome.storage.session.remove('xTabId');
            if (xTabId) chrome.tabs.remove(xTabId).catch(()=>{});
            openPendingBsky();
          }, 90000); // 90 segundos (o content script desiste em ~60s + ~20s de confirmação)
        });
      });
    });

    sendResponse({ success: true });
    return true;
  } else if (request.action === 'postResult') {
    const network = request.network;
    const status = request.status;
    
    if (status === 'success') {
      setProgress(networkKey(network), 'success', 'Postado!');
    } else {
      setProgress(networkKey(network), 'error', request.message || 'Erro desconhecido');
    }
    
    if (network.includes('X')) {
      chrome.storage.session.remove('xTabId');
    } else if (timeoutId) {
      clearTimeout(timeoutId); // Bluesky terminou: cancela o timeout de 5min
      timeoutId = null;
    }

    if (sender.tab) {
      if (!request.dontClose) {
        chrome.tabs.remove(sender.tab.id).catch(()=>{}); // Fecha imediatamente
      } else {
        // Fecha a janela/aba após 8 segundos para garantir que o upload termine em segundo plano
        setTimeout(() => {
          chrome.tabs.remove(sender.tab.id).catch(()=>{});
        }, 8000);
      }
    }
    
    if (network.includes('X')) {
      openPendingBsky(); // Chama o Bluesky após o X
    }
  } else if (request.action === 'progress') {
    setProgress(request.network, 'active', request.label);
  } else if (request.action === 'closeNotifTab') {
    if (sender.tab) {
        chrome.tabs.remove(sender.tab.id).catch(()=>{});
    }
  }
});

function openPendingBsky() {
  chrome.storage.local.get(['pendingBsky', 'pendingFocus'], (result) => {
     if (result.pendingBsky) {
         const isFocused = result.pendingFocus !== undefined ? result.pendingFocus : true;
         chrome.storage.local.remove('pendingBsky'); // Evita abrir o Bluesky duas vezes (timeout + resultado)
         setProgress('bsky', 'active', 'Abrindo o Bluesky...');
         
         chrome.windows.create({
             url: result.pendingBsky,
             type: 'popup',
             focused: isFocused,
             width: 600,
             height: 600
         }, (win) => {
             if (timeoutId) clearTimeout(timeoutId);
             timeoutId = setTimeout(() => {
                setProgress('bsky', 'error', 'Tempo esgotado (5min)');
                if (win && win.tabs && win.tabs[0]) {
                   chrome.tabs.remove(win.tabs[0].id).catch(()=>{});
                }
             }, 300000);
         });
     }
  });
}
