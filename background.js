let timeoutId = null;

// Função para mostrar notificação injetando um Toast na aba ativa do usuário
function showToast(message, isError = false) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (msg, err) => {
          const toast = document.createElement('div');
          toast.innerText = msg;
          toast.style.position = 'fixed';
          toast.style.bottom = '20px';
          toast.style.right = '20px';
          toast.style.backgroundColor = err ? '#f4212e' : '#17bf63';
          toast.style.color = 'white';
          toast.style.padding = '12px 20px';
          toast.style.borderRadius = '8px';
          toast.style.fontFamily = 'sans-serif';
          toast.style.fontWeight = 'bold';
          toast.style.zIndex = '999999';
          toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 4000);
        },
        args: [message, isError]
      }).catch(e => console.log('Não foi possível injetar toast', e));
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'post') {
    const text = encodeURIComponent(request.text);
    const xUrl = `https://x.com/intent/tweet?text=${text}&xsky=1`;
    const bskyUrl = `https://bsky.app/intent/compose?text=${text}&xsky=1`;
    
    showToast('XSky: Iniciando postagens automáticas...');
    
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
          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            showToast('XSky: X (Twitter) demorou. Passando pro Bluesky...', true);
            if (win && win.tabs && win.tabs[0]) {
               chrome.tabs.remove(win.tabs[0].id).catch(()=>{});
            }
            openPendingBsky();
          }, 30000); // 30 segundos
        });
      });
    });

    sendResponse({ success: true });
    return true;
  } else if (request.action === 'postResult') {
    const network = request.network;
    const status = request.status;
    
    if (status === 'success') {
      showToast(`XSky: ✅ Postado no ${network}!`);
    } else {
      showToast(`XSky: ❌ Erro no ${network}: ${request.message}`, true);
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
         
         chrome.windows.create({
             url: result.pendingBsky,
             type: 'popup',
             focused: isFocused,
             width: 600,
             height: 600
         }, (win) => {
             chrome.storage.local.remove('pendingBsky');
             
             if (timeoutId) clearTimeout(timeoutId);
             timeoutId = setTimeout(() => {
                showToast('XSky: ❌ Bluesky tempo esgotado (5min).', true);
                if (win && win.tabs && win.tabs[0]) {
                   chrome.tabs.remove(win.tabs[0].id).catch(()=>{});
                }
             }, 300000);
         });
     }
  });
}
