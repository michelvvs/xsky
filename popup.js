document.addEventListener('DOMContentLoaded', () => {
  // --- Controle de Abas ---
  const tabPost = document.getElementById('tabPost');
  const tabX = document.getElementById('tabX');
  const tabBsky = document.getElementById('tabBsky');
  
  const viewPost = document.getElementById('viewPost');
  const viewX = document.getElementById('viewX');
  const viewBsky = document.getElementById('viewBsky');
  
  const xLoader = document.getElementById('xLoader');
  const bskyLoader = document.getElementById('bskyLoader');
  const reloadXBtn = document.getElementById('reloadXBtn');
  const reloadBskyBtn = document.getElementById('reloadBskyBtn');
  const xList = document.getElementById('xNotifsList');
  const bskyList = document.getElementById('bskyNotifsList');

  let xRequested = false;
  let bskyRequested = false;

  function renderNotifs(listEl, dataArr, isX) {
      if (!dataArr || dataArr.length === 0) {
          listEl.innerHTML = '<p class="loading-text">Nenhuma notificação encontrada.</p>';
          return;
      }
      
      listEl.innerHTML = '';
      dataArr.forEach(text => {
          const div = document.createElement('div');
          div.className = 'notif-item';
          if (!isX) div.classList.add('bsky');
          
          // Adiciona destaque especial para respostas
          const lower = text.toLowerCase();
          if (lower.includes('respondeu') || lower.includes('replied')) {
              div.classList.add('reply');
          }
          
          // Tratando HTML seguro caso venha da nossa API interna
          div.innerHTML = `<div class="author">${text}</div>`;
          listEl.appendChild(div);
      });
  }

  // Monitora alterações no storage
  chrome.storage.onChanged.addListener((changes, namespace) => {
      if (changes.xNotifsData && changes.xNotifsData.newValue) {
          renderNotifs(xList, changes.xNotifsData.newValue, true);
          xLoader.style.display = 'none'; // Esconde o loader quando os dados chegam
      }
      if (changes.bskyNotifsData && changes.bskyNotifsData.newValue) {
          renderNotifs(bskyList, changes.bskyNotifsData.newValue, false);
          bskyLoader.style.display = 'none'; // Esconde o loader quando os dados chegam
      }
  });

  // Tenta carregar o que já está salvo assim que abrir a aba
  chrome.storage.local.get(['xNotifsData', 'bskyNotifsData'], (result) => {
      if (result.xNotifsData) renderNotifs(xList, result.xNotifsData, true);
      if (result.bskyNotifsData) renderNotifs(bskyList, result.bskyNotifsData, false);
  });

  function hideAll() {
    tabPost.classList.remove('active');
    tabX.classList.remove('active');
    tabBsky.classList.remove('active');
    viewPost.style.display = 'none';
    viewX.style.display = 'none';
    viewBsky.style.display = 'none';
  }

  tabPost.addEventListener('click', () => {
    hideAll();
    tabPost.classList.add('active');
    viewPost.style.display = 'block';
  });

  function fetchX() {
      xLoader.style.display = 'inline';
      chrome.storage.local.remove(['xNotifsData']);
      chrome.windows.create({
          url: 'https://x.com/notifications',
          focused: false,
          type: 'popup',
          width: 800,
          height: 600
      }, (win) => {
          setTimeout(() => { 
             if (win) chrome.windows.remove(win.id).catch(()=>{}); 
             xLoader.style.display = 'none'; 
          }, 10000);
      });
  }

  function fetchBsky() {
      bskyLoader.style.display = 'inline';
      chrome.storage.local.remove(['bskyNotifsData']);
      chrome.windows.create({
          url: 'https://bsky.app/notifications',
          focused: false,
          type: 'popup',
          width: 800,
          height: 600
      }, (win) => {
          setTimeout(() => { 
             if (win) chrome.windows.remove(win.id).catch(()=>{}); 
             bskyLoader.style.display = 'none'; 
          }, 10000);
      });
  }

  tabX.addEventListener('click', () => {
    hideAll();
    tabX.classList.add('active');
    viewX.style.display = 'block';
    
    if (!xRequested) {
        xRequested = true;
        fetchX();
    }
  });

  tabBsky.addEventListener('click', () => {
    hideAll();
    tabBsky.classList.add('active');
    viewBsky.style.display = 'block';
    
    if (!bskyRequested) {
        bskyRequested = true;
        fetchBsky();
    }
  });

  reloadXBtn.addEventListener('click', fetchX);
  reloadBskyBtn.addEventListener('click', fetchBsky);

  // --- Lógica de Postagem ---
  const postBtn = document.getElementById('postBtn');
  const postText = document.getElementById('postText');
  const statusDiv = document.getElementById('status');
  const imageInput = document.getElementById('imageInput');
  const imageBtn = document.getElementById('imageBtn');
  const imagePreview = document.getElementById('imagePreview');
  let imageData = null;

  imageBtn.addEventListener('click', () => imageInput.click());

  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        imageData = event.target.result;
        imagePreview.src = imageData;
        imagePreview.style.display = 'block';
        imageBtn.innerText = '🖼️ Trocar Imagem';
      };
      reader.readAsDataURL(file);
    }
  });

  postText.addEventListener('paste', (e) => {
    const items = (e.clipboardData || window.clipboardData).items;
    for (let item of items) {
      if (item.type.indexOf('image/') === 0) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            imageData = event.target.result;
            imagePreview.src = imageData;
            imagePreview.style.display = 'block';
            imageBtn.innerText = '🖼️ Trocar Imagem';
          };
          reader.readAsDataURL(file);
        }
      }
    }
  });

  postBtn.addEventListener('click', () => {
    const text = postText.value;
    if (!text.trim() && !imageData) {
      statusDiv.style.color = '#e0245e';
      statusDiv.innerText = 'Digite algo ou adicione uma imagem!';
      return;
    }

    postBtn.disabled = true;
    statusDiv.style.color = '#17bf63';
    statusDiv.innerText = 'Iniciando postagem nas abas...';
    
    chrome.storage.local.set({ postImage: imageData }, () => {
      chrome.runtime.sendMessage({ action: 'post', text: text }, (response) => {
        if (chrome.runtime.lastError) {
          statusDiv.style.color = '#e0245e';
          statusDiv.innerText = 'Erro ao enviar mensagem.';
          postBtn.disabled = false;
          return;
        }
        statusDiv.innerText = 'Abas abertas! O post será feito em instantes.';
        setTimeout(() => window.close(), 3000);
      });
    });
  });
});
