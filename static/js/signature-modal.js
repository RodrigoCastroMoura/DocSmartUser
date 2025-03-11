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


// Signature text handling
let currentFont = 'Dancing Script';
let currentTextContent = '';
let selectedSignatureData = null;
let currentPdfPageElement = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize font buttons
    const fontButtons = document.querySelectorAll('.font-btn');
    fontButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const fontFamily = this.getAttribute('data-font');
            document.getElementById('fontFamily').value = fontFamily;

            // Update selected button styling
            fontButtons.forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');

            // Update preview
            updateFontPreview();
        });
    });

    // Initialize text input
    const signatureText = document.getElementById('signatureText');
    if (signatureText) {
        signatureText.addEventListener('input', updateFontPreview);
    }

    // Select Dancing Script as default
    const defaultFontBtn = document.querySelector('.font-btn[data-font="Dancing Script"]');
    if (defaultFontBtn) {
        defaultFontBtn.classList.add('selected');
    }

    // Inicializar preview
    updateFontPreview();
});

function updateFontPreview() {
    const signatureText = document.getElementById('signatureText').value;
    const fontFamily = document.getElementById('fontFamily').value;
    const fontPreview = document.getElementById('fontPreview');

    if (fontPreview) {
        fontPreview.style.fontFamily = fontFamily;
        fontPreview.textContent = signatureText || 'Prévia da Assinatura';

        // Armazenar valores atuais
        currentFont = fontFamily;
        currentTextContent = signatureText;
    }
}

function applySignatureOrText() {
    const signatureText = document.getElementById('signatureText').value;
    const fontFamily = document.getElementById('fontFamily').value;

    if (!signatureText) {
        showNotification('Por favor, digite o texto da assinatura', 'warning');
        return;
    }

    // Create the signature image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size
    canvas.width = 400;
    canvas.height = 150;

    // Set background
    ctx.fillStyle = 'rgba(255, 255, 255, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Configure text style
    ctx.fillStyle = 'black';
    ctx.font = `bold 40px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add text to canvas
    ctx.fillText(signatureText, canvas.width / 2, canvas.height / 2);

    // Convert canvas to image data URL
    const signatureDataUrl = canvas.toDataURL('image/png');

    // Armazenar a assinatura gerada
    selectedSignatureData = signatureDataUrl;

    // Fechar o modal de assinatura
    hideModal('simpleModal');

    // Mostrar notificação para instruir o usuário a clicar onde deseja aplicar a assinatura
    showNotification('Assinatura preparada. Agora clique na área onde deseja assinar.', 'success');

    // Habilitar o container de assinatura para receber cliques
    const signaturesContainer = document.getElementById('signatures-container');
    if (signaturesContainer) {
        signaturesContainer.style.pointerEvents = 'auto';
        signaturesContainer.style.cursor = 'pointer';

        // Adicionar listener de evento ao container para detecção de cliques
        signaturesContainer.onclick = handleSignatureClick;
    }

    // Habilitar cliques no canvas PDF
    const pdfPages = document.querySelectorAll('.pdf-page-canvas');
    pdfPages.forEach(canvas => {
        canvas.style.cursor = 'pointer';
        canvas.addEventListener('click', handleCanvasClick);
    });
}

function handleCanvasClick(e) {
    // Só procede se tiver uma assinatura selecionada
    if (!selectedSignatureData) {
        showNotification('Por favor, selecione uma assinatura primeiro', 'warning');
        return;
    }

    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Aplicar a assinatura no local clicado
    applySignatureToCanvas(canvas, x, y);
}

function handleSignatureClick(e) {
    // Apenas procede se houver uma assinatura selecionada
    if (!selectedSignatureData) {
        showNotification('Por favor, selecione uma assinatura primeiro', 'warning');
        return;
    }

    // Verificar se clicou em um campo de assinatura
    const field = findClickedField(e.offsetX, e.offsetY);
    if (field) {
        // Obter o canvas da página PDF atual
        const pdfCanvas = document.querySelector(`.pdf-page-canvas[data-page-number="${field.pageNumber}"]`) || 
                         document.querySelector('.pdf-page-canvas');

        if (pdfCanvas) {
            // Aplicar a assinatura ao campo
            applySignatureToField(pdfCanvas, field);
        }
    } else {
        // Clicar em uma posição livre
        const pdfCanvas = document.querySelector('.pdf-page-canvas');
        if (pdfCanvas) {
            // Converter coordenadas do container para o canvas
            const canvasRect = pdfCanvas.getBoundingClientRect();
            const containerRect = e.target.getBoundingClientRect();

            const x = e.clientX - canvasRect.left;
            const y = e.clientY - canvasRect.top;

            // Aplicar assinatura diretamente nas coordenadas
            applySignatureToCanvas(pdfCanvas, x, y);
        }
    }
}

function applySignatureToField(canvas, field) {
    const ctx = canvas.getContext('2d');

    // Limpar a área do campo
    ctx.clearRect(field.x, field.y, field.width, field.height);

    // Criar uma imagem com a assinatura
    const img = new Image();
    img.onload = function() {
        // Calcular dimensões preservando a proporção
        const aspectRatio = img.width / img.height;
        const height = Math.min(field.height * 0.8, field.width / aspectRatio);
        const width = height * aspectRatio;

        // Desenhar a assinatura centralizada no campo
        ctx.drawImage(img, 
            field.x + (field.width - width) / 2,
            field.y + (field.height - height) / 2,
            width,
            height
        );

        // Marcar o campo como assinado
        field.signed = true;

        showNotification('Assinatura aplicada com sucesso!', 'success');

        // Resetar estado após aplicar
        resetSignatureState();
    };
    img.src = selectedSignatureData;
}

function applySignatureToCanvas(canvas, x, y) {
    const ctx = canvas.getContext('2d');

    // Criar uma imagem com a assinatura
    const img = new Image();
    img.onload = function() {
        // Definir tamanho padrão para a assinatura
        const width = 200;
        const height = (width * img.height) / img.width;

        // Centralizar a assinatura no ponto clicado
        const startX = x - (width / 2);
        const startY = y - (height / 2);

        // Desenhar a assinatura
        ctx.drawImage(img, startX, startY, width, height);

        showNotification('Assinatura aplicada com sucesso!', 'success');

        // Resetar estado após aplicar
        resetSignatureState();
    };
    img.src = selectedSignatureData;
}

function resetSignatureState() {
    // Limpar a assinatura selecionada
    selectedSignatureData = null;

    // Remover os eventos de clique e restaurar o cursor
    const signaturesContainer = document.getElementById('signatures-container');
    if (signaturesContainer) {
        signaturesContainer.style.pointerEvents = 'none';
        signaturesContainer.style.cursor = 'default';
        signaturesContainer.onclick = null;
    }

    // Restaurar os canvas de PDF
    const pdfPages = document.querySelectorAll('.pdf-page-canvas');
    pdfPages.forEach(canvas => {
        canvas.style.cursor = 'default';
        canvas.removeEventListener('click', handleCanvasClick);
    });
}

function findClickedField(x, y) {
    // Verifica se há campos de assinatura e se algum foi clicado
    if (typeof signatureFields !== 'undefined' && Array.isArray(signatureFields)) {
        return signatureFields.find(field => 
            x >= field.x && x <= field.x + field.width &&
            y >= field.y && y <= field.y + field.height
        );
    }
    return null;
}

// Função auxiliar para mostrar notificações
function showNotification(message, type) {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        alert(message);
    }
}