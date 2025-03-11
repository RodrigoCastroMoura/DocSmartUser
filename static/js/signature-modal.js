// Arquivo signature-modal.js

// Verificar se já existe um canvas de assinatura modal e inicializá-lo
let modalSignatureCanvas;
let modalSignatureContext;
let currentSelectedFont = 'Dancing Script';

// Estilos de assinatura predefinidos
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
}

// Função para gerar SVG de assinatura
function generateSignatureSVG(name, style) {
    const signatureStyle = signatureStyles[style] || signatureStyles.cursive;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    // Calculate width based on text length
    const width = Math.max(300, name.length * 25);
    const height = 100;

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");

    // Create text element for signature
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", width/2);
    text.setAttribute("y", height/2);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", signatureStyle.color);
    text.setAttribute("style", `
        font-family: ${signatureStyle.fontFamily};
        font-size: ${signatureStyle.fontSize};
        transform: skewX(${signatureStyle.skewAngle}deg);
    `);
    text.textContent = name;

    svg.appendChild(text);
    return svg;
}

// Função para gerar assinatura baseada em texto com fonte específica
function generateTextSignature(text, font) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Ajustar o tamanho do canvas com base no tamanho do texto
    const baseWidth = 400;
    const textLength = text.length;
    canvas.width = Math.max(baseWidth, textLength * 30);
    canvas.height = 150;

    // Limpar o canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Configurações de fonte
    let fontSize = 60;
    if (textLength > 15) {
        fontSize = Math.max(36, 60 - (textLength - 15) * 1.5);
    }

    ctx.font = `${fontSize}px "${font}"`;
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Desenhar o texto
    ctx.fillText(text, canvas.width/2, canvas.height/2);

    // Retornar a imagem como URL de dados
    return canvas.toDataURL('image/png');
}

// Atualizar preview de assinatura baseado no texto e fonte
function updateSignaturePreview() {
    const signatureText = document.getElementById('signatureText').value || 'Prévia da Fonte';
    const fontFamily = document.getElementById('fontFamily').value;
    const fontPreview = document.getElementById('fontPreview');

    // Definir a fonte selecionada
    fontPreview.style.fontFamily = fontFamily;
    fontPreview.textContent = signatureText;

    // Atualizar o tamanho da fonte dinamicamente com base no tamanho do texto
    const baseSize = 60; // Tamanho base da fonte
    const textLength = signatureText.length;
    let fontSize = baseSize;

    // Ajuste de tamanho baseado na quantidade de caracteres
    if (textLength > 15) {
        fontSize = baseSize - (textLength - 15) * 1.5;
        fontSize = Math.max(fontSize, 36); // Não deixar menor que 36px
    }

    fontPreview.style.fontSize = `${fontSize}px`;

    // Também atualiza o campo de entrada
    document.getElementById('signatureText').style.fontFamily = fontFamily;
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

// Aplicar a assinatura ou texto selecionado ao documento
function applySignatureOrText() {
    const signatureText = document.getElementById('signatureText').value;
    const fontFamily = document.getElementById('fontFamily').value;
    
    if (!signatureText) {
        alert("Por favor, digite sua assinatura.");
        return;
    }
    
    // Criar elemento de assinatura
    const signatureElement = document.createElement('div');
    signatureElement.style.position = 'absolute';
    signatureElement.style.fontFamily = fontFamily;
    signatureElement.style.fontSize = '36px';
    signatureElement.style.color = '#000';
    signatureElement.style.padding = '10px';
    signatureElement.style.pointerEvents = 'none';
    signatureElement.innerHTML = signatureText;
    
    // Adicionar a assinatura ao container de assinaturas
    const signaturesContainer = document.getElementById('signatures-container');
    signaturesContainer.appendChild(signatureElement);
    
    // Posicionar a assinatura - se não houver campo específico, colocar no centro do container
    if (typeof currentField !== 'undefined' && currentField) {
        // Usar o campo detectado se existir
        signatureElement.style.left = currentField.x + 'px';
        signatureElement.style.top = currentField.y + 'px';
    } else {
        // Caso contrário, posicionar no centro do container de visualização
        const previewContainer = document.querySelector('.preview-container');
        if (previewContainer) {
            const pdfCanvas = document.querySelector('#pdfCanvas');
            if (pdfCanvas) {
                // Posicionar no centro do canvas PDF
                signatureElement.style.left = (pdfCanvas.offsetWidth / 2 - 100) + 'px';
                signatureElement.style.top = (pdfCanvas.offsetHeight / 2 - 25) + 'px';
            } else {
                // Fallback: centro do container
                signatureElement.style.left = '50%';
                signatureElement.style.top = '50%';
                signatureElement.style.transform = 'translate(-50%, -50%)';
            }
        }
    }
    
    // Permitir que o container receba eventos do mouse
    signaturesContainer.style.pointerEvents = 'auto';
    
    // Fechar o modal
    hideModal('simpleModal');
}

// Iniciar eventos quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Adicionar evento para os botões de fonte
    document.querySelectorAll('.font-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remover seleção anterior
            document.querySelectorAll('.font-btn').forEach(b => b.classList.remove('selected'));

            // Selecionar a nova fonte
            this.classList.add('selected');

            // Atualizar a fonte atual
            currentSelectedFont = this.dataset.font;
            document.getElementById('fontFamily').value = currentSelectedFont;

            // Atualizar o preview
            updateSignaturePreview();
        });
    });

    // Variável global para armazenar o campo atual de assinatura
let currentField = null;

// Adicionar evento para o campo de texto
    const signatureText = document.getElementById('signatureText');
    if (signatureText) {
        signatureText.addEventListener('input', updateSignaturePreview);
    }

    // Inicializar com a primeira fonte selecionada
    const firstFontBtn = document.querySelector('.font-btn');
    if (firstFontBtn) {
        firstFontBtn.classList.add('selected');
        currentSelectedFont = firstFontBtn.dataset.font;
        document.getElementById('fontFamily').value = currentSelectedFont;
    }

    // Inicializar o preview
    updateSignaturePreview();
});