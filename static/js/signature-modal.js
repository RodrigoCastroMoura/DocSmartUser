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
    
    // Ajustar tamanho do canvas com base no tamanho do texto
    const fontSize = 64; // Tamanho aumentado da fonte
    ctx.font = `${fontSize}px ${font}`;
    const textWidth = ctx.measureText(text).width;
    
    canvas.width = Math.max(500, textWidth + 100); // Garantir largura mínima de 500px
    canvas.height = 180; // Aumentar altura para acomodar fontes maiores
    
    // Limpar canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Configurar fonte e desenhar o texto
    ctx.font = `${fontSize}px ${font}`;
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width/2, canvas.height/2);
    
    return canvas.toDataURL();
}

// Atualizar preview de assinatura baseado no texto e fonte
function updateSignaturePreview() {
    const signatureText = document.getElementById('signatureText').value || 'Prévia da Fonte';
    const fontPreview = document.getElementById('fontPreview');
    
    // Define a fonte selecionada
    fontPreview.style.fontFamily = currentSelectedFont;
    fontPreview.textContent = signatureText;
    
    // Atualiza o tamanho da fonte dinamicamente com base no tamanho do texto
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
    document.getElementById('signatureText').style.fontFamily = currentSelectedFont;
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
});ed");ed");
}

function applySignatureOrText() {
    // Implementar a lógica para aplicar o texto de assinatura no documento
    console.log("Apply signature text functionality to be implemented");

    // Fechar o modal após aplicar
    hideModal('simpleModal');
}

// Inicializar quando o modal for aberto
document.addEventListener('DOMContentLoaded', () => {
    const openSimpleModalBtn = document.getElementById('openSimpleModalBtn');
    if (openSimpleModalBtn) {
        openSimpleModalBtn.addEventListener('click', () => {
            // Inicializar quando o modal for aberto
            setTimeout(() => {
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