// Arquivo signature-modal.js

// Verificar se já existe um canvas de assinatura modal e inicializá-lo
let modalSignatureCanvas;
let modalSignatureContext;
let docTitle = 'DocSmartSignature by';


// Função para gerar assinatura baseada em texto com fonte específica
function generateTextSignature(text, font) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Ajustar o tamanho do canvas com base no tamanho do texto
    const baseWidth = 320; 
    const textLength = text.length + 3;
    canvas.width = Math.max(baseWidth, textLength * 30);
    canvas.height = 90;

    // Limpar o canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Configurar composição para garantir transparência
    ctx.globalCompositeOperation = 'source-over';

    let fontSize = 78; // Alterado de 60 para 80
    if (textLength > 15) {
        fontSize = Math.max(48, 80 - (textLength - 15) * 0.4); // Também aumentei o valor mínimo
    }

    ctx.font = `${fontSize}px "${font}"`;
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Desenhar o texto
    ctx.fillText(text, canvas.width/2, canvas.height -40);

    // Retornar a imagem como URL de dados
    return canvas.toDataURL('image/png', 1.0);
}

// Função para gerar a imagem da rubrica
function generateRubricImage(text, font) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Ajustar o tamanho do canvas com base no tamanho do texto
    const baseWidth = 200; // Menor que a assinatura
    const textLength = text.length;
    canvas.width = Math.max(baseWidth, textLength * 25);
    canvas.height = 80;

    // Limpar o canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Configurar composição para garantir transparência
    ctx.globalCompositeOperation = 'source-over';

    let fontSize = 58; // Um pouco menor que a assinatura
    if (textLength > 3) {
        fontSize = Math.max(40, 58 - (textLength - 3) * 2); // Ajustar tamanho para textos mais longos
    }

    ctx.font = `${fontSize}px "${font}"`;
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Desenhar o texto
    ctx.fillText(text, canvas.width/2, canvas.height/2);

    // Retornar a imagem como URL de dados
    return canvas.toDataURL('image/png', 1.0);
}

// Função para gerar assinatura baseada em texto com fonte específica
function generateTextSignatureDoc(text, font) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Ajustar o tamanho do canvas com base no tamanho do texto
    const baseWidth = 320; 
    const textLength = text.length + 3;
    canvas.width = Math.max(baseWidth, textLength * 30);
    canvas.height = 111;

    // Limpar o canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Configurar composição para garantir transparência
    ctx.globalCompositeOperation = 'source-over';

    let fontSize = 80; // Alterado de 60 para 80
    if (textLength > 15) {
        fontSize = Math.max(48, 80 - (textLength - 15) * 0.4); // Também aumentei o valor mínimo
    }

    // Texto "DocSmartSignatureBy"
    ctx.fillStyle = '#0033A0';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`${docTitle}:`, 26, 15);

    ctx.font = `${fontSize}px "${font}"`;
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Desenhar o texto
    ctx.fillText(text, canvas.width/2, canvas.height -57);

    // Identificador abaixo da linha
    ctx.font = '20px Courier New';
    ctx.fillStyle = '#666';
    ctx.fillText(id_doc, canvas.width - canvas.height -100, 106);


    // Retornar a imagem como URL de dados
    return canvas.toDataURL('image/png', 1.0);
}

// Função para gerar a imagem da rubrica
function generateRubricImageDoc(text, font) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Ajustar o tamanho do canvas com base no tamanho do texto
    const baseWidth = 200; // Menor que a assinatura
    const textLength = text.length;
    canvas.width = Math.max(baseWidth, textLength * 25);
    canvas.height = 80;

    // Limpar o canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Configurar composição para garantir transparência
    ctx.globalCompositeOperation = 'source-over';

    let fontSize = 60; // Um pouco menor que a assinatura
    if (textLength > 3) {
        fontSize = Math.max(40, 58 - (textLength - 3) * 2); // Ajustar tamanho para textos mais longos
    }

    // Texto "DocSmartSignatureBy"
    ctx.fillStyle = '#0033A0';
    ctx.font = 'bold 10px Arial';
    ctx.fillText(`${docTitle}:`, 26, 15);

    ctx.font = `${fontSize}px "${font}"`;
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Desenhar o texto
    ctx.fillText(text, 80, (canvas.height/2) + 5 );

    // Identificador abaixo da linha
    ctx.font = '8px Courier New';
    ctx.fillStyle = '#666';
    ctx.fillText(id_doc, canvas.width/2, 75);

    // Retornar a imagem como URL de dados
    return canvas.toDataURL('image/png', 1.0);
}


// Atualizar preview de assinatura baseado no texto e fonte
function updateSignaturePreview() {
    const signatureText = document.getElementById('signatureText').value || 'Prévia da Assinatura';
    const fontFamily = document.getElementById('fontFamily').value;
    const fontPreview = document.getElementById('fontPreview');

    // Definir a fonte selecionada
    fontPreview.style.fontFamily = fontFamily;
    fontPreview.textContent = signatureText;

    // Ajuste mais preciso baseado no comprimento do texto e na fonte
    let baseSize = 36; // Tamanho inicial
    const textLength = signatureText.length;

    // Ajustes específicos para fontes que são naturalmente mais largas
    if (fontFamily === 'Great Vibes' || fontFamily === 'Mr De Haviland' || fontFamily === 'Tangerine') {
        baseSize = 34;
    }

    // Escala progressiva baseada no comprimento do texto
    let fontSize = baseSize;
    if (textLength > 12) {
        fontSize = baseSize - Math.min(16, (textLength - 12) * 0.9);
    }
    if (textLength > 20) {
        fontSize = fontSize - Math.min(8, (textLength - 20) * 0.7);
    }

    // Garantir tamanho mínimo da fonte
    fontSize = Math.max(fontSize, 25);

    // Aplicar a fonte ajustada
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

// Função para adicionar eventos aos botões de fonte
function initializeFontButtons() {
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

            // Atualizar rubrica também
            updateRubricPreview();
        });
    });
}

// Função para atualizar a visualização da rubrica
function updateRubricPreview() {
    const rubricText = document.getElementById('rubricText').value || 'Rubrica';
    const fontFamily = document.getElementById('fontFamily').value;
    const rubricPreview = document.getElementById('rubricPreview');

    // Definir a fonte selecionada
    rubricPreview.style.fontFamily = fontFamily;
    rubricPreview.textContent = rubricText;
}

// Iniciar eventos quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    initializeFontButtons();

    // Adicionar evento para o campo de texto da assinatura
    const signatureText = document.getElementById('signatureText');
    if (signatureText) {
        signatureText.addEventListener('input', updateSignaturePreview);
    }

    // Adicionar evento para o campo de texto da rubrica
    const rubricText = document.getElementById('rubricText');
    if (rubricText) {
        rubricText.addEventListener('input', updateRubricPreview);
    }

    // Inicializar com a fonte selecionada
    const selectedFontBtn = document.querySelector(`.font-btn[data-font="${currentSelectedFont}"]`);
    if (selectedFontBtn) {
        selectedFontBtn.classList.add('selected');
        document.getElementById('fontFamily').value = currentSelectedFont;
    }

    // Inicializar os previews
    updateSignaturePreview();
    updateRubricPreview();
});

// Garantir que os botões de fonte sejam inicializados quando o modal é exibido
function showSimpleModal() {
    document.getElementById('simpleModal').style.display = 'block';
    feather.replace();

    // Reinicializar os botões de fonte quando o modal é exibido
    setTimeout(initializeFontButtons, 100);

    // Garantir que a fonte correta esteja selecionada
    const selectedFontBtn = document.querySelector(`.font-btn[data-font="${currentSelectedFont}"]`);
    if (selectedFontBtn) {
        document.querySelectorAll('.font-btn').forEach(b => b.classList.remove('selected'));
        selectedFontBtn.classList.add('selected');
        document.getElementById('fontFamily').value = currentSelectedFont;
    }

    // Atualizar previews
    updateSignaturePreview();
    updateRubricPreview();
}