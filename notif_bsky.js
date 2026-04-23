setTimeout(() => {
    let items = [];
    
    // Pega todos os links ou elementos clicáveis
    const cells = document.querySelectorAll('div[role="link"], a[role="link"], a[href^="/profile/"]');
    
    // Usamos um Set para evitar que o mesmo bloco seja lido duas vezes
    const seen = new Set();
    
    for (let i = 0; i < cells.length && items.length < 10; i++) {
        let rawText = cells[i].innerText.trim();
        
        if (rawText && rawText.length > 10) {
            const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            // Uma notificação real tem pelo menos 2 linhas (Autor + Ação)
            // Se for só 1 linha (ex: só o @arroba), nós ignoramos pois é um "pedaço" fatiado
            if (lines.length >= 2 && !lines.includes('Notificações') && !lines.includes('Menções')) {
                // Junta os pedaços
                const formatted = lines.join('<br><span style="color:#8899a6; font-size:12px;">') + '</span>'.repeat(lines.length - 1);
                
                if (!seen.has(formatted)) {
                    seen.add(formatted);
                    items.push(formatted);
                }
            }
        }
    }
    
    chrome.storage.local.set({ bskyNotifsData: items }, () => {
        chrome.runtime.sendMessage({ action: 'closeNotifTab' });
    });
}, 4000);
