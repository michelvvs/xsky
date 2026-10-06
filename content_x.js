// content_x.js
// Injetado pelo background (chrome.scripting) na aba do X aberta pela extensão,
// independente da URL final — o X é SPA e reescreve /intent/tweet para outras rotas.
if (!window.__xskyXStarted) {
    window.__xskyXStarted = true;

    const NETWORK = 'X (Twitter)';
    let attempts = 0;
    let imagePasted = false;
    let isPasting = false;
    let finished = false;

    function report(status, message) {
        if (finished) return;
        finished = true;
        chrome.runtime.sendMessage({ action: 'postResult', network: NETWORK, status, message });
    }

    function progress(label) {
        if (!finished) chrome.runtime.sendMessage({ action: 'progress', network: 'x', label });
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

    function findTweetButton() {
        return document.querySelector('[data-testid="tweetButton"]') ||
               document.querySelector('[data-testid="tweetButtonInline"]');
    }

    function findTextArea() {
        return document.querySelector('[data-testid="tweetTextarea_0"]') ||
               document.querySelector('.public-DraftEditor-content');
    }

    function isLoginPage() {
        const path = window.location.pathname;
        return path.startsWith('/login') || path.startsWith('/i/flow/login') || path.startsWith('/i/jf/onboarding');
    }

    // Depois do clique, confirma que o post saiu: o compositor some/esvazia ou o X mostra o toast.
    function waitForConfirmation() {
        let checks = 0;
        const check = () => {
            checks++;
            const button = findTweetButton();
            const textArea = findTextArea();
            const toast = document.querySelector('[data-testid="toast"]');
            const composerGone = !button || !textArea;
            const composerEmpty = textArea && !textArea.innerText.trim() && !document.querySelector('[data-testid="attachments"]');

            if (toast || composerGone || composerEmpty) {
                report('success');
                return;
            }
            if (checks > 40) { // ~20s
                report('error', 'O X não confirmou o envio do post.');
                return;
            }
            setTimeout(check, 500);
        };
        setTimeout(check, 1000);
    }

    function attemptPostX() {
        attempts++;
        if (attempts === 1) progress('Carregando o compositor...');
        if (isLoginPage()) {
            report('error', 'Você não está logado no X.');
            return;
        }
        if (attempts > 120) { // ~60s
            report('error', 'Nenhum botão de postar encontrado.');
            return;
        }

        const tweetButton = findTweetButton();
        const textArea = findTextArea();

        if (tweetButton && textArea) {
            if (!imagePasted && !isPasting) {
                isPasting = true;
                chrome.storage.local.get(['postImage'], (result) => {
                    if (result.postImage) {
                        progress('Anexando imagem...');
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

            // Botão desabilitado = texto ainda não carregou ou imagem ainda subindo
            if (tweetButton.getAttribute('aria-disabled') === 'true' || tweetButton.disabled) {
                setTimeout(attemptPostX, 500);
                return;
            }

            progress('Publicando...');
            tweetButton.click();
            progress('Confirmando envio...');
            waitForConfirmation();
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
