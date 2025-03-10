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
        alert('Por favor, digite o texto da assinatura');
        return;
    }
    
    // Criar uma imagem a partir do preview
    const fontPreview = document.getElementById('fontPreview');
    
    // Criar um canvas temporário para gerar a imagem
    const tempCanvas = document.createElement('canvas');
    const context = tempCanvas.getContext('2d');
    
    // Configurar o tamanho do canvas baseado no tamanho do texto
    tempCanvas.width = fontPreview.offsetWidth;
    tempCanvas.height = fontPreview.offsetHeight;
    
    // Configurar o estilo do canvas para corresponder ao preview
    context.fillStyle = 'white';
    context.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    context.font = window.getComputedStyle(fontPreview).font;
    context.fillStyle = 'black';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Desenhar o texto no canvas
    context.fillText(signatureText, tempCanvas.width/2, tempCanvas.height/2);
    
    // Converter o canvas para uma imagem
    const signatureImage = tempCanvas.toDataURL('image/png');
    
    // Adicionar a assinatura ao documento
    addSignatureToDocument(signatureImage);
    
    // Fechar o modal
    hideModal('simpleModal');
}

// Função para adicionar a assinatura ao documento
function addSignatureToDocument(signatureImage) {
    const signaturesContainer = document.getElementById('signatures-container');
    
    if (!signaturesContainer) {
        console.error('Container de assinaturas não encontrado');
        return;
    }
    
    // Criar um elemento de imagem para a assinatura
    const signatureElement = document.createElement('img');
    signatureElement.src = signatureImage;
    signatureElement.className = 'signature-element';
    signatureElement.style.position = 'absolute';
    
    // Posicionamento padrão - no centro do container
    signatureElement.style.top = '50%';
    signatureElement.style.left = '50%';
    signatureElement.style.transform = 'translate(-50%, -50%)';
    signatureElement.style.maxWidth = '30%';
    signatureElement.style.zIndex = '100';
    signatureElement.style.pointerEvents = 'auto';
    signatureElement.style.cursor = 'move';
    
    // Adicionar a assinatura ao container
    signaturesContainer.appendChild(signatureElement);
    
    // Tornar a assinatura arrastável
    makeElementDraggable(signatureElement);
    
    // Armazenar a assinatura para processamento posterior
    storeSignatureData(signatureElement);
}

// Função para tornar um elemento arrastável
function makeElementDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    element.onmousedown = dragMouseDown;
    
    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // Obter a posição do cursor no início
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // Chamar a função sempre que o cursor se mover
        document.onmousemove = elementDrag;
    }
    
    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // Calcular a nova posição do cursor
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // Definir a nova posição do elemento
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
        // Remover o transform que poderia interferir
        element.style.transform = 'none';
    }
    
    function closeDragElement() {
        // Parar de mover quando o mouse for solto
        document.onmouseup = null;
        document.onmousemove = null;
        // Atualizar os dados da assinatura
        storeSignatureData(element);
    }
}

// Função para armazenar os dados da assinatura para processamento posterior
function storeSignatureData(signatureElement) {
    // Aqui você pode implementar a lógica para armazenar a posição e outros dados da assinatura
    // para processar posteriormente (enviar para o servidor, aplicar ao PDF, etc.)
    console.log('Assinatura posicionada em:', {
        x: signatureElement.offsetLeft,
        y: signatureElement.offsetTop,
        width: signatureElement.offsetWidth,
        height: signatureElement.offsetHeight
    });
}nado ao documento
function applySignatureOrText() {
    const signatureText = document.getElementById('signatureText').value;
    if (!signatureText) {
        alert('Por favor, digite o texto da assinatura');
        return;
    }

    // Gerar a assinatura como imagem
    const signatureImg = generateTextSignature(signatureText, currentSelectedFont);

    // Aqui você pode implementar a lógica para adicionar a assinatura ao PDF
    console.log('Assinatura aplicada:', signatureImg);

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