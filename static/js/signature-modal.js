
// Inicializar variáveis e elementos
let activeTab = 'signature-tab';
let modalSignatureCanvas, modalSignatureCtx;
let isDrawing = false;
let lastX = 0, lastY = 0;

// Função para alternar entre as abas
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    document.querySelector(`.tab-btn[onclick="switchTab('${tabId}')"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
    
    activeTab = tabId;
    
    // Se alternar para a aba de assinatura, inicializar o canvas
    if (tabId === 'signature-tab' && !modalSignatureCtx) {
        initModalSignatureCanvas();
    }
    
    // Adicionar evento para o preview da fonte
    if (tabId === 'text-tab') {
        updateFontPreview();
    }
}

// Inicializar canvas de assinatura no modal
function initModalSignatureCanvas() {
    modalSignatureCanvas = document.getElementById('modalSignatureCanvas');
    if (!modalSignatureCanvas) return;
    
    modalSignatureCtx = modalSignatureCanvas.getContext('2d');
    
    // Configurar o estilo do traço
    modalSignatureCtx.strokeStyle = 'black';
    modalSignatureCtx.lineWidth = 2;
    modalSignatureCtx.lineCap = 'round';
    modalSignatureCtx.lineJoin = 'round';
    
    // Adicionar eventos de mouse e toque
    modalSignatureCanvas.addEventListener('mousedown', startDrawing);
    modalSignatureCanvas.addEventListener('mousemove', draw);
    modalSignatureCanvas.addEventListener('mouseup', stopDrawing);
    modalSignatureCanvas.addEventListener('mouseout', stopDrawing);
    
    // Suporte para toque em dispositivos móveis
    modalSignatureCanvas.addEventListener('touchstart', startDrawingTouch);
    modalSignatureCanvas.addEventListener('touchmove', drawTouch);
    modalSignatureCanvas.addEventListener('touchend', stopDrawing);
}

// Função para limpar o canvas
function clearModalCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Funções de desenho com mouse
function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
}

function draw(e) {
    if (!isDrawing) return;
    
    modalSignatureCtx.beginPath();
    modalSignatureCtx.moveTo(lastX, lastY);
    modalSignatureCtx.lineTo(e.offsetX, e.offsetY);
    modalSignatureCtx.stroke();
    
    [lastX, lastY] = [e.offsetX, e.offsetY];
}

// Funções de desenho com toque
function startDrawingTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = modalSignatureCanvas.getBoundingClientRect();
    lastX = touch.clientX - rect.left;
    lastY = touch.clientY - rect.top;
    isDrawing = true;
}

function drawTouch(e) {
    e.preventDefault();
    if (!isDrawing) return;
    
    const touch = e.touches[0];
    const rect = modalSignatureCanvas.getBoundingClientRect();
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;
    
    modalSignatureCtx.beginPath();
    modalSignatureCtx.moveTo(lastX, lastY);
    modalSignatureCtx.lineTo(currentX, currentY);
    modalSignatureCtx.stroke();
    
    lastX = currentX;
    lastY = currentY;
}

function stopDrawing() {
    isDrawing = false;
}

// Preview da fonte em tempo real
function updateFontPreview() {
    const fontPreview = document.getElementById('fontPreview');
    const signatureText = document.getElementById('signatureText');
    const fontFamily = document.getElementById('fontFamily');
    
    if (!fontPreview || !signatureText || !fontFamily) return;
    
    const selectedFont = fontFamily.value;
    const previewText = signatureText.value || 'Prévia da Fonte';
    
    fontPreview.style.fontFamily = selectedFont;
    fontPreview.textContent = previewText;
    signatureText.style.fontFamily = selectedFont;
}

// Carregar uma assinatura salva
function loadSavedSignature() {
    // Implementação futura para carregar assinaturas salvas
    alert('Funcionalidade para carregar assinaturas salvas será implementada em breve.');
}

// Aplicar a assinatura ou texto ao documento
function applySignatureOrText() {
    if (activeTab === 'signature-tab') {
        // Obter a imagem da assinatura do canvas
        const signatureImage = modalSignatureCanvas.toDataURL('image/png');
        // Implementar a lógica para aplicar a assinatura ao documento
        console.log('Assinatura aplicada:', signatureImage);
    } else if (activeTab === 'text-tab') {
        const text = document.getElementById('signatureText').value;
        const font = document.getElementById('fontFamily').value;
        
        if (!text) {
            alert('Por favor, digite um texto para a assinatura.');
            return;
        }
        
        // Implementar a lógica para aplicar o texto como assinatura
        console.log('Texto aplicado:', text, 'Fonte:', font);
    }
    
    // Fechar o modal após aplicar
    hideModal('simpleModal');
}

// Inicializar quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Adicionar evento para atualizar o preview da fonte
    const fontFamily = document.getElementById('fontFamily');
    const signatureText = document.getElementById('signatureText');
    
    if (fontFamily) {
        fontFamily.addEventListener('change', updateFontPreview);
    }
    
    if (signatureText) {
        signatureText.addEventListener('input', updateFontPreview);
    }
});
