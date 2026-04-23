setTimeout(() => {
    let items = [];
    const cells = document.querySelectorAll('[data-testid="cellInnerDiv"]');
    
    // Usamos um Set para evitar ler a mesma notificação duplicada caso o X redesenhe a tela
    const seen = new Set();
    
    for (let i = 0; i < cells.length && items.length < 10; i++) {
        let rawText = cells[i].innerText.trim();
        
        // Ignora menus e coisas curtas
        if (rawText && rawText.length > 5 && !rawText.includes('Discover new lists')) {
            const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            if (lines.length >= 1) {
                // Junta os pedaços: A primeira linha é o destaque, o restante fica cinza e menor.
                const formatted = lines.join('<br><span style="color:#8899a6; font-size:12px;">') + '</span>'.repeat(lines.length > 1 ? lines.length - 1 : 0);
                
                if (!seen.has(formatted)) {
                    seen.add(formatted);
                    items.push(formatted);
                }
            }
        }
    }
    
    chrome.storage.local.set({ xNotifsData: items }, () => {
        chrome.runtime.sendMessage({ action: 'closeNotifTab' });
    });
}, 4000);
