// Arquivo signature-modal.js

// Verificar se já existe um canvas de assinatura modal e inicializá-lo
let modalSignatureCanvas;
let modalSignatureContext;

// Função para alternar entre as abas
function switchTab(tabId) {
    // Esconder todas as abas
    document.querySelectorAll('.tab-pane').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remover classe active de todos os botões de abas
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Mostrar a aba selecionada
    document.getElementById(tabId).classList.add('active');

    // Adicionar classe active ao botão clicado
    event.currentTarget.classList.add('active');

    // Se a aba de assinatura estiver ativa, inicializar o canvas
    if (tabId === 'signature-tab') {
        setTimeout(() => {
            initModalSignatureCanvas();
        }, 100);
    }
}

function initModalSignatureCanvas() {
    modalSignatureCanvas = document.getElementById('modalSignatureCanvas');
    if (modalSignatureCanvas) {
        modalSignatureContext = modalSignatureCanvas.getContext('2d');
        modalSignatureContext.lineWidth = 2;
        modalSignatureContext.strokeStyle = "#000000";
        modalSignatureContext.fillStyle = "#FFFFFF";
        modalSignatureContext.fillRect(0, 0, modalSignatureCanvas.width, modalSignatureCanvas.height);

        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;

        modalSignatureCanvas.addEventListener('mousedown', (e) => {
            isDrawing = true;
            const rect = modalSignatureCanvas.getBoundingClientRect();
            lastX = e.clientX - rect.left;
            lastY = e.clientY - rect.top;
        });

        modalSignatureCanvas.addEventListener('mousemove', (e) => {
            if (!isDrawing) return;
            const rect = modalSignatureCanvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;

            modalSignatureContext.beginPath();
            modalSignatureContext.moveTo(lastX, lastY);
            modalSignatureContext.lineTo(currentX, currentY);
            modalSignatureContext.stroke();

            lastX = currentX;
            lastY = currentY;
        });

        modalSignatureCanvas.addEventListener('mouseup', () => {
            isDrawing = false;
        });

        modalSignatureCanvas.addEventListener('mouseout', () => {
            isDrawing = false;
        });

        // Touch events for mobile devices
        modalSignatureCanvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const rect = modalSignatureCanvas.getBoundingClientRect();
            const touch = e.touches[0];
            lastX = touch.clientX - rect.left;
            lastY = touch.clientY - rect.top;
            isDrawing = true;
        });

        modalSignatureCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!isDrawing) return;
            const rect = modalSignatureCanvas.getBoundingClientRect();
            const touch = e.touches[0];
            const currentX = touch.clientX - rect.left;
            const currentY = touch.clientY - rect.top;

            modalSignatureContext.beginPath();
            modalSignatureContext.moveTo(lastX, lastY);
            modalSignatureContext.lineTo(currentX, currentY);
            modalSignatureContext.stroke();

            lastX = currentX;
            lastY = currentY;
        });

        modalSignatureCanvas.addEventListener('touchend', () => {
            isDrawing = false;
        });

        console.log("Modal signature canvas initialized");
    }
}

function clearModalCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    const context = canvas.getContext('2d');
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
}

// Carregar assinatura salva
function loadSavedSignature() {
    // Implementar a lógica para carregar uma assinatura salva
    console.log("Load saved signature functionality to be implemented");
}

function applySignatureOrText() {
    // Implementar a lógica para aplicar a assinatura ou texto no documento
    console.log("Apply signature functionality to be implemented");

    // Fechar o modal após aplicar
    hideModal('simpleModal');
}

// Inicializar o canvas quando o modal for aberto
document.addEventListener('DOMContentLoaded', () => {
    const openSimpleModalBtn = document.getElementById('openSimpleModalBtn');
    if (openSimpleModalBtn) {
        openSimpleModalBtn.addEventListener('click', () => {
            // Inicializar o canvas quando o modal for aberto
            setTimeout(() => {
                initModalSignatureCanvas();
                // Inicializa o preview de fonte
                initFontPreview();
            }, 100);
        });
    }
});

// Preview da fonte em tempo real
function initFontPreview() {
    const fontPreview = document.getElementById('fontPreview');
    const signatureText = document.getElementById('signatureText');
    const fontFamily = document.getElementById('fontFamily');
    const fontButtons = document.querySelectorAll('.font-btn');
    
    if (!fontPreview || !signatureText || !fontFamily) return;
    
    // Função para atualizar a prévia da fonte
    function updateFontPreview() {
        const selectedFont = fontFamily.value;
        const previewText = signatureText.value || 'Prévia da Fonte';
        fontPreview.style.fontFamily = selectedFont;
        fontPreview.textContent = previewText;
        signatureText.style.fontFamily = selectedFont;
        
        // Atualizar botões selecionados
        fontButtons.forEach(btn => {
            if (btn.dataset.font === selectedFont) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }
    
    // Configurar os botões de fonte
    fontButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const font = btn.dataset.font;
            fontFamily.value = font;
            updateFontPreview();
        });
    });
    
    // Executar uma vez para inicializar
    updateFontPreview();
    
    // Adicionar event listener para o campo de texto
    signatureText.addEventListener('input', updateFontPreview);
    
    // Selecionar o primeiro botão por padrão
    if (fontButtons.length > 0) {
        fontButtons[0].classList.add('selected');
    }
    
    console.log("Font preview initialized with buttons");
}

// Função para alternar entre abas
function switchTab(tabId) {
    // Remover classe active de todas as abas
    document.querySelectorAll('.tab-pane').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Adicionar classe active à aba selecionada
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`.tab-btn[onclick="switchTab('${tabId}')"]`).classList.add('active');
}