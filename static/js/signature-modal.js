// Arquivo signature-modal.js

// Verificar se já existe um canvas de assinatura modal e inicializá-lo
let modalSignatureCanvas;
let modalSignatureContext;
let docTitle = 'DocSmartSignature by';


// Função para gerar assinatura baseada em texto com fonte específica
function generateTextSignature(text, fontFamily) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Tamanho do canvas dependendo do comprimento do texto
    const textLength = text.length;
    const width = Math.max(300, textLength * 20);
    const height = 120;

    canvas.width = width;
    canvas.height = height;

    // Fundo transparente
    ctx.clearRect(0, 0, width, height);

    // Configurações de texto
    const fontSize = textLength > 15 ? Math.max(48 - (textLength - 15) * 1.5, 30) : 48;
    ctx.font = `${fontSize}px "${fontFamily}", cursive`;
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Desenhar o texto centralizado
    ctx.fillText(text, width / 2, height / 2);

    return canvas.toDataURL('image/png');
}

// Função para gerar a imagem da rubrica
function generateRubricImage(text, fontFamily) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Tamanho do canvas 
    const width = 200;
    const height = 80;

    canvas.width = width;
    canvas.height = height;

    // Fundo transparente
    ctx.clearRect(0, 0, width, height);

    // Configurações de texto para rubrica
    const textLength = text.length;
    const fontSize = textLength > 3 ? Math.max(46 - (textLength - 3) * 3, 28) : 46;
    ctx.font = `${fontSize}px "${fontFamily}", cursive`;
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Desenhar o texto centralizado
    ctx.fillText(text, width / 2, height / 2);

    return canvas.toDataURL('image/png');
}

// Função para gerar imagem da assinatura com texto para o documento
function generateTextSignatureDoc(text, fontFamily) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Tamanho do canvas dependendo do comprimento do texto
    const textLength = text.length;
    const width = Math.max(300, textLength * 20);
    const height = 120;

    canvas.width = width;
    canvas.height = height;

    // Fundo transparente
    ctx.clearRect(0, 0, width, height);

    // Configurações de texto
    const fontSize = textLength > 15 ? Math.max(48 - (textLength - 15) * 1.5, 30) : 48;
    ctx.font = `${fontSize}px "${fontFamily}", cursive`;
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Desenhar o texto centralizado
    ctx.fillText(text, width / 2, height / 2);

    return canvas.toDataURL('image/png');
}

// Função para gerar imagem da rubrica com texto para o documento
function generateRubricImageDoc(text, fontFamily) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Tamanho do canvas para documento
    const width = 200;
    const height = 80;

    canvas.width = width;
    canvas.height = height;

    // Fundo transparente
    ctx.clearRect(0, 0, width, height);

    // Configurações de texto para rubrica
    const textLength = text.length;
    const fontSize = textLength > 3 ? Math.max(46 - (textLength - 3) * 3, 28) : 46;
    ctx.font = `${fontSize}px "${fontFamily}", cursive`;
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Desenhar o texto centralizado
    ctx.fillText(text, width / 2, height / 2);

    return canvas.toDataURL('image/png');
}

// Inicializar os botões de fonte e atualizar previews
function initializeFontButtons() {
    document.querySelectorAll('.font-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remover seleção anterior
            document.querySelectorAll('.font-btn').forEach(b => b.classList.remove('selected'));

            // Selecionar a nova fonte
            this.classList.add('selected');

            // Atualizar a fonte atual
            currentSelectedFont = this.dataset.font;
            document.getElementById('fontFamily').value = currentSelectedFont;

            // Atualizar os previews
            updateSignaturePreview();
            updateRubricPreview();
        });
    });
}

// Função para atualizar a prévia da assinatura
function updateSignaturePreview() {
    const signatureText = document.getElementById('signatureText').value || 'Prévia da Assinatura';
    const fontFamily = document.getElementById('fontFamily').value;
    const fontPreview = document.getElementById('fontPreview');

    // Definir a fonte selecionada
    fontPreview.style.fontFamily = fontFamily;
    fontPreview.textContent = signatureText;

    // Atualizar o tamanho da fonte dinamicamente com base no tamanho do texto
    const baseSize = 40; // Tamanho base da fonte
    const textLength = signatureText.length;
    let fontSize = baseSize;

    // Ajuste de tamanho baseado na quantidade de caracteres
    if (textLength > 15) {
        fontSize = baseSize - (textLength - 15) * 1.5;
        fontSize = Math.max(fontSize, 24); // Não deixar menor que 24px
    }

    fontPreview.style.fontSize = `${fontSize}px`;

    // Também atualiza o campo de entrada
    document.getElementById('signatureText').style.fontFamily = fontFamily;
}

// Função para atualizar a prévia da rubrica
function updateRubricPreview() {
    const rubricText = document.getElementById('rubricText').value || 'Rubrica';
    const fontFamily = document.getElementById('fontFamily').value;
    const rubricPreview = document.getElementById('rubricPreview');

    // Definir a fonte selecionada
    rubricPreview.style.fontFamily = fontFamily;
    rubricPreview.textContent = rubricText;

    // Usar fonte um pouco maior para a rubrica para melhor visualização
    const baseSize = 32; // Tamanho base um pouco menor que a assinatura
    const textLength = rubricText.length;
    let fontSize = baseSize;

    // Ajuste de tamanho baseado na quantidade de caracteres
    if (textLength > 3) {
        fontSize = baseSize - (textLength - 3) * 2;
        fontSize = Math.max(fontSize, 22); // Não deixar menor que 22px
    }

    rubricPreview.style.fontSize = `${fontSize}px`;
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


// Função inicializados quando o modal é exibido
function showSimpleModal() {
    document.getElementById('simpleModal').style.display = 'block';
    feather.replace();

    // Preencher os campos corretamente
    const signatureTextField = document.getElementById('signatureText');
    const rubricTextField = document.getElementById('rubricText');

    // Garantir valores iniciais para os campos caso estejam vazios
    if (signatureTextField && !signatureTextField.value) {
        signatureTextField.value = signatureTextField.getAttribute('value') || '';
    }

    if (rubricTextField && !rubricTextField.value) {
        rubricTextField.value = rubricTextField.getAttribute('value') || '';
    }

    // Reinicializar os botões de fonte quando o modal é exibido
    setTimeout(() => {
        initializeFontButtons();

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
    }, 100);
}

// Inicializar quando o documento carregar
document.addEventListener('DOMContentLoaded', function() {
    // Eventos para os campos de texto
    const signatureText = document.getElementById('signatureText');
    const rubricText = document.getElementById('rubricText');

    if (signatureText) {
        signatureText.addEventListener('input', updateSignaturePreview);
    }

    if (rubricText) {
        rubricText.addEventListener('input', updateRubricPreview);
    }

    // Definir um valor inicial para a rubrica baseado no nome se disponível
    if (signatureText && signatureText.value && rubricText) {
        const nameParts = signatureText.value.trim().split(' ');
        if (nameParts.length >= 2) {
            // Iniciais do primeiro e último nome
            rubricText.value = nameParts[0].charAt(0) + nameParts[nameParts.length-1].charAt(0);
        } else if (nameParts.length === 1) {
            // Primeiros dois caracteres do nome
            rubricText.value = nameParts[0].substring(0, Math.min(2, nameParts[0].length));
        }
        updateRubricPreview();
    }
});