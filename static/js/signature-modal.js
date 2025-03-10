// Arquivo signature-modal.js

// Variáveis globais
let currentFont = 'Dancing Script';
let fontPreview = null;

// Estilos de assinatura predefinidos (mantidos para compatibilidade, embora não usados na nova implementação)
const signatureStyles = {
    cursive: {
        fontFamily: 'Dancing Script',
        fontSize: '48px',
        color: '#000000',
        skewAngle: -10
    },
    formal: {
        fontFamily: 'Great Vibes',
        fontSize: '48px',
        color: '#000000',
        skewAngle: -5
    },
    casual: {
        fontFamily: 'Pacifico',
        fontSize: '48px',
        color: '#000000',
        skewAngle: 0
    }
};

// Função para alternar entre as abas (mantida sem alterações)
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
}


// Função para limpar o canvas modal (mantida sem alterações)
function clearModalCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    const context = canvas.getContext('2d');
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
}

// Carregar assinatura salva (mantida sem alterações)
function loadSavedSignature() {
    // Implementar a lógica para carregar uma assinatura salva
    console.log("Load saved signature functionality to be implemented");
}

// Inicializar quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar previsualizador de fonte
    initFontPreview();

    // Adicionar listeners aos botões de fonte
    initFontButtons();
});

// Inicializar a área de prévia de fonte
function initFontPreview() {
    fontPreview = document.getElementById('fontPreview');
    if (fontPreview) {
        // Define a fonte inicial
        fontPreview.style.fontFamily = currentFont;
        fontPreview.textContent = "Sua assinatura";
    }
}

// Inicializar os botões de fontes
function initFontButtons() {
    document.querySelectorAll('.font-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remover seleção anterior
            document.querySelectorAll('.font-btn').forEach(el => {
                el.classList.remove('selected');
            });

            // Adicionar seleção ao botão clicado
            this.classList.add('selected');

            // Atualizar fonte selecionada
            const selectedFont = this.getAttribute('data-font');
            document.getElementById('fontFamily').value = selectedFont;
            currentFont = selectedFont;

            // Atualizar preview
            if (fontPreview) {
                fontPreview.style.fontFamily = selectedFont;
            }
        });
    });

    // Selecionar o primeiro botão por padrão
    const firstButton = document.querySelector('.font-btn');
    if (firstButton) {
        firstButton.classList.add('selected');
    }
}

// Função para aplicar a assinatura ao documento
function applySignatureOrText() {
    // Obter o container de assinaturas
    const signaturesContainer = document.getElementById('signatures-container');
    if (!signaturesContainer) {
        console.error('Container de assinaturas não encontrado');
        return;
    }

    // Obter a pré-visualização do PDF
    const pdfCanvas = document.getElementById('pdfCanvas');
    if (!pdfCanvas) {
        console.error('Canvas do PDF não encontrado');
        return;
    }

    // Criar elemento para assinatura
    const signatureElement = document.createElement('div');
    signatureElement.className = 'signature-element';
    signatureElement.style.position = 'absolute';

    // Obter a fonte selecionada
    const fontFamily = document.getElementById('fontFamily').value;

    // Criar a imagem de assinatura baseada no texto e fonte
    const signatureText = document.getElementById('fontPreview').textContent;

    // Configurar o estilo da assinatura
    signatureElement.style.fontFamily = fontFamily;
    signatureElement.style.fontSize = '36px';
    signatureElement.style.color = 'black';
    signatureElement.style.background = 'transparent';
    signatureElement.style.padding = '10px';
    signatureElement.style.zIndex = '20';
    signatureElement.style.pointerEvents = 'auto';
    signatureElement.style.cursor = 'move';
    signatureElement.style.userSelect = 'none';
    signatureElement.textContent = signatureText;

    // Posicionar no meio da tela inicialmente
    const pdfRect = pdfCanvas.getBoundingClientRect();
    signatureElement.style.left = (pdfRect.width / 2 - 150) + 'px';
    signatureElement.style.top = (pdfRect.height / 2 - 50) + 'px';

    // Adicionar a assinatura ao container
    signaturesContainer.appendChild(signatureElement);

    // Tornar a assinatura arrastável
    makeElementDraggable(signatureElement);

    // Fechar o modal
    hideModal('simpleModal');
}


// Função para tornar um elemento arrastável
function makeElementDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    element.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // Obter posição inicial do cursor
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // Chamar função sempre que o cursor se mover
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // Calcular nova posição
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // Definir nova posição do elemento
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        // Parar de mover quando soltar o mouse
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// Função para abrir modal simples
function showSimpleModal() {
    document.getElementById('simpleModal').style.display = 'block';
    fontPreview = document.getElementById('fontPreview');
    if (fontPreview) {
        fontPreview.style.fontFamily = currentFont;
    }
    initFontButtons();
}

// Função para adicionar a assinatura ao documento (removida pois a lógica está integrada em applySignatureOrText)
//function addSignatureToDocument(signatureImage) { ... }

// Função para armazenar os dados da assinatura (mantida sem alterações)
function storeSignatureData(signatureElement) {
    // Aqui você pode implementar a lógica para armazenar a posição e outros dados da assinatura
    // para processar posteriormente (enviar para o servidor, aplicar ao PDF, etc.)
    console.log('Assinatura posicionada em:', {
        x: signatureElement.offsetLeft,
        y: signatureElement.offsetTop,
        width: signatureElement.offsetWidth,
        height: signatureElement.offsetHeight
    });
}

// Função para esconder o modal (assumida como existente em outro arquivo)
function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}