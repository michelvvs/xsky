// content_x.js
if (window.location.href.includes('xsky=1')) {
    let attempts = 0;
    let imagePasted = false;
    let isPasting = false;
    let clickListenerAdded = false;
    
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
    
    function attemptPostX() {
        attempts++;
        if (attempts > 300) { // Timeout de segurança maior
            chrome.runtime.sendMessage({ action: 'postResult', network: 'X (Twitter)', status: 'error', message: 'Nenhum botão de postar encontrado.' });
            return;
        }
        
        const tweetButton = document.querySelector('[data-testid="tweetButton"]');
        const textArea = document.querySelector('.public-DraftEditor-content') || document.querySelector('[data-testid="tweetTextarea_0"]');
        
        if (tweetButton && textArea) {
            if (tweetButton.getAttribute('aria-disabled') === 'true' || tweetButton.disabled) {
                setTimeout(attemptPostX, 500);
                return;
            }

            if (!imagePasted && !isPasting) {
                isPasting = true;
                chrome.storage.local.get(['postImage'], (result) => {
                    if (result.postImage) {
                        const file = base64ToFile(result.postImage, 'image.png');
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        
                        const pasteEvent = new ClipboardEvent("paste", {
                            clipboardData: dataTransfer,
                            bubbles: true,
                            cancelable: true
                        });
                        
                        textArea.focus();
                        textArea.dispatchEvent(pasteEvent);
                        
                        imagePasted = true;
                        setTimeout(attemptPostX, 2500);
                    } else {
                        imagePasted = true; 
                        attemptPostX();
                    }
                });
                return; 
            }

            if (!imagePasted) return; 

            // Avisa o background para abrir o Bluesky e NÃO fechar esta aba do X
            chrome.runtime.sendMessage({ action: 'postResult', network: 'X (Twitter)', status: 'success', dontClose: true });
            
            // Clica automaticamente no X, o próprio X fecha a janela quando o upload terminar
            setTimeout(() => {
                tweetButton.click();
            }, 500);
            
        } else {
            setTimeout(attemptPostX, 500);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attemptPostX);
    } else {
        attemptPostX();
    }
}
