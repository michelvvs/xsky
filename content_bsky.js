// content_bsky.js
if (window.location.href.includes('xsky=1')) {
    let attempts = 0;
    let imagePasted = false;
    let isPasting = false;
    
    function progress(label) {
        chrome.runtime.sendMessage({ action: 'progress', network: 'bsky', label });
    }

    function base64ToFile(base64, filename) {
        const arr = base64.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    }

    async function attemptPostBsky() {
        attempts++;
        if (attempts === 1) progress('Carregando o compositor...');
        if (attempts > 30) {
            chrome.runtime.sendMessage({ action: 'postResult', network: 'Bluesky', status: 'error', message: 'Tempo limite excedido para carregar.' });
            return; 
        }
        
        const publishButton = document.querySelector('[data-testid="composerPublishBtn"]');
        
        if (publishButton) {
            // Interface carregou, significa que o usuário está logado.
            if (!imagePasted && !isPasting) {
                isPasting = true;
                chrome.storage.local.get(['postImage'], async (result) => {
                    if (result.postImage) {
                        progress('Anexando imagem...');
                        try {
                            // 1. Converte Imagem
                            const arr = result.postImage.split(',');
                            const mime = arr[0].match(/:(.*?);/)[1];
                            const bstr = atob(arr[1]);
                            let n = bstr.length;
                            const u8arr = new Uint8Array(n);
                            while (n--) u8arr[n] = bstr.charCodeAt(n);
                            const file = new File([u8arr], 'image.png', { type: mime });
                            
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(file);
                            
                            // Adiciona listener para fechar só quando o usuário clicar em postar manualmente
                            if (!window.bskyClickListenerAdded) {
                                document.addEventListener('click', (e) => {
                                    const btn = e.target.closest('[data-testid="composerPublishBtn"]');
                                    if (btn && !btn.disabled) {
                                        progress('Publicando...');
                                        setTimeout(() => {
                                            chrome.runtime.sendMessage({ action: 'postResult', network: 'Bluesky', status: 'success', dontClose: true });
                                        }, 1000);
                                    }
                                });
                                window.bskyClickListenerAdded = true;
                            }
                            
                            // Tenta injetar a imagem via Paste visual
                            const pasteEvent = new ClipboardEvent("paste", { clipboardData: dataTransfer, bubbles: true, cancelable: true });
                            const editable = document.querySelector('.ProseMirror[contenteditable="true"]') ||
                                             document.querySelector('[contenteditable="true"]');
                            editable.focus();
                            editable.dispatchEvent(pasteEvent);
                            
                            imagePasted = true;
                            progress('Aguardando seu clique em "Postar"');
                            // Aguarda o clique manual do usuário
                            return; 
                            
                        } catch (err) {
                            console.error("XSky Erro Manual:", err);
                        }
                    } else {
                        // Sem imagem: Posta 100% automático
                        imagePasted = true; // Flag para não repetir
                        progress('Publicando...');
                        publishButton.click();
                        
                        setTimeout(() => {
                            // Aqui deixamos a aba fechar (não passa dontClose) pois é só texto e vai rápido
                            chrome.runtime.sendMessage({ action: 'postResult', network: 'Bluesky', status: 'success' });
                        }, 3000);
                    }
                });
                return;
            }
        } else {
            setTimeout(attemptPostBsky, 500);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attemptPostBsky);
    } else {
        attemptPostBsky();
    }
}
