
// Arquivo signature-modal.js para gerenciamento de assinaturas digitais

// Variáveis globais do sistema
let modalSignatureCanvas;
let modalSignatureContext;
let currentSelectedFont = 'Dancing Script';
let activeSignatureField = null;
let currentSignature = null;
let signatureFields = [];
let margins = { top: 20, right: 20, bottom: 20, left: 20 };

// Estilos de assinatura predefinidos
const signatureStyles = {
    cursive: {
        fontFamily: 'Dancing Script',
        fontSize: '48px',
        color: '#000000'
    },
    formal: {
        fontFamily: 'Great Vibes',
        fontSize: '48px',
        color: '#000000'
    },
    casual: {
        fontFamily: 'Pacifico',
        fontSize: '48px',
        color: '#000000'
    }
};

// Função para mostrar notificações
function showNotification(message, type) {
    // Verificar se a função já existe no escopo global
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        // Função de fallback se não existir no escopo global
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            </div>
            <div class="notification-content">
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(notification);
        
        // Remover após 3 segundos
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Função para atualizar a prévia da assinatura baseada no texto inserido
function updateSignaturePreview() {
    const signatureText = document.getElementById('signatureText').value || 'Sua assinatura';
    const fontPreview = document.getElementById('fontPreview');
    
    if (fontPreview) {
        fontPreview.textContent = signatureText;
        fontPreview.style.fontFamily = currentSelectedFont;
    }
}

// Função para carregar uma assinatura salva
function loadSavedSignature() {
    console.log("Load saved signature functionality to be implemented");
}

// Função para exibir o modal de assinatura
function showSimpleModal() {
    document.getElementById('simpleModal').style.display = 'block';
    
    // Inicializar a primeira fonte como selecionada se nenhuma estiver selecionada
    if (!document.querySelector('.font-btn.selected')) {
        const firstFontBtn = document.querySelector('.font-btn');
        if (firstFontBtn) {
            firstFontBtn.classList.add('selected');
            currentSelectedFont = firstFontBtn.dataset.font;
            document.getElementById('fontFamily').value = currentSelectedFont;
        }
    }
    
    updateSignaturePreview();
    feather.replace();
}

// Função para esconder o modal
function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Função para aplicar a assinatura ou texto selecionado
function applySignatureOrText() {
    const signatureText = document.getElementById('signatureText').value;
    const fontFamily = document.getElementById('fontFamily').value;

    if (!signatureText) {
        showNotification('Por favor, digite sua assinatura', 'error');
        return;
    }

    // Criar uma imagem da assinatura usando canvas
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    // Configurar estilo de texto
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.font = `48px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Desenhar o texto da assinatura
    ctx.fillText(signatureText, canvas.width / 2, canvas.height / 2);

    // Converter o canvas para uma URL de dados de imagem
    const signatureImg = canvas.toDataURL('image/png');

    // Armazenar a assinatura atual
    currentSignature = signatureImg;

    // Fechar o modal
    hideModal('simpleModal');

    // Aplicar a assinatura no campo ativo
    if (activeSignatureField) {
        placeSignature(activeSignatureField.event, activeSignatureField.canvas, activeSignatureField.field);
        showNotification('Assinatura aplicada com sucesso!', 'success');
    } else {
        // Se não houver campo ativo, vamos aplicar a assinatura no primeiro campo disponível
        applySignatureToFirstField();
    }
}

// Função para aplicar a assinatura no primeiro campo disponível
function applySignatureToFirstField() {
    if (signatureFields.length > 0 && currentSignature) {
        const firstField = signatureFields[0];
        const canvas = document.querySelector('.pdf-page-canvas');
        
        if (canvas) {
            placeSignature(null, canvas, firstField);
            showNotification('Assinatura aplicada no primeiro campo disponível', 'success');
        }
    } else {
        showNotification('Não foi possível encontrar um campo para assinatura', 'error');
    }
}

// Função para colocar a assinatura no campo
function placeSignature(event, canvas, field) {
    if (!currentSignature) {
        showNotification('Por favor, primeiro crie uma assinatura', 'warning');
        showSimpleModal();
        return;
    }

    const img = new Image();
    img.onload = () => {
        const ctx = canvas.getContext('2d');

        // Calcular dimensões para manter a proporção
        const aspectRatio = img.width / img.height;
        const height = Math.min(field.height * 0.8, field.width / aspectRatio);
        const width = height * aspectRatio;

        // Limpar a área do campo antes de desenhar
        ctx.clearRect(field.x, field.y, field.width, field.height);

        // Desenhar a assinatura centralizada no campo
        ctx.drawImage(img,
            field.x + (field.width - width) / 2,
            field.y + (field.height - height) / 2,
            width,
            height
        );

        showNotification('Assinatura aplicada com sucesso!', 'success');
        
        // Marcar o campo como assinado
        field.signed = true;
    };

    img.src = currentSignature;
}

// Função para detectar os campos de assinatura em um PDF
function detectSignatureFields(textContent, page, canvas, viewport) {
    const ctx = canvas.getContext('2d');
    const keywords = ['assinatura', 'assinar', 'signature', 'sign', 'firma', 'rubrica'];

    // Obter as dimensões da página
    const { width: pageWidth, height: pageHeight } = viewport;

    // Adicionar pelo menos um campo de assinatura padrão se nenhum for encontrado
    let foundSignatureField = false;

    for (const item of textContent.items) {
        const text = item.str.toLowerCase();
        if (keywords.some(keyword => text.includes(keyword))) {
            // Obter coordenadas originais do PDF
            const pdfX = item.transform[4];
            const pdfY = item.transform[5];

            // Converter coordenadas do PDF para coordenadas do canvas
            const [x, y] = viewport.convertToViewportPoint(pdfX, pdfY);

            // Ajustar a coordenada y para o sistema de coordenadas do PDF (origem no canto inferior esquerdo)
            const adjustedY = y - 50; // Ajustado para ficar abaixo do texto

            // Criar indicador de campo de assinatura
            const field = {
                x: x - 100, // Centralizar em relação ao texto
                y: adjustedY,
                width: 200,
                height: 80,
                pdfX: pdfX,
                pdfY: pdfY,
                signed: false
            };

            // Garantir que o campo esteja dentro dos limites da página
            field.x = Math.max(margins.left, Math.min(field.x, pageWidth - field.width - margins.right));
            field.y = Math.max(margins.top, Math.min(field.y, pageHeight - field.height - margins.bottom));

            signatureFields.push(field);
            foundSignatureField = true;

            // Desenhar indicador de campo de assinatura
            ctx.save();
            ctx.strokeStyle = '#2196F3';
            ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]);

            // Desenhar retângulo com posição ajustada
            ctx.strokeRect(field.x, field.y, field.width, field.height);
            ctx.fillRect(field.x, field.y, field.width, field.height);

            // Adicionar ícone de assinatura e texto
            ctx.fillStyle = '#2196F3';
            ctx.font = '24px Arial';
            ctx.fillText('✒️', field.x + 10, field.y + 35);

            ctx.font = '14px Arial';
            ctx.fillStyle = '#666';
            ctx.fillText('Clique para assinar', field.x + 40, field.y + 35);

            ctx.restore();
        }
    }

    // Se nenhum campo for encontrado, adicionar um campo padrão
    if (!foundSignatureField) {
        const field = {
            x: pageWidth - 220,
            y: pageHeight - 100,
            width: 200,
            height: 80,
            pdfX: pageWidth - 220,
            pdfY: pageHeight - 100,
            signed: false
        };

        signatureFields.push(field);

        // Desenhar indicador de campo de assinatura
        ctx.save();
        ctx.strokeStyle = '#2196F3';
        ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);

        // Desenhar retângulo com posição ajustada
        ctx.strokeRect(field.x, field.y, field.width, field.height);
        ctx.fillRect(field.x, field.y, field.width, field.height);

        // Adicionar ícone de assinatura e texto
        ctx.fillStyle = '#2196F3';
        ctx.font = '24px Arial';
        ctx.fillText('✒️', field.x + 10, field.y + 35);

        ctx.font = '14px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText('Clique para assinar', field.x + 40, field.y + 35);

        ctx.restore();
    }
}

// Função para encontrar o campo clicado
function findClickedField(x, y) {
    return signatureFields.find(field =>
        x >= field.x && x <= field.x + field.width &&
        y >= field.y && y <= field.y + field.height
    );
}

// Iniciar eventos quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
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

    // Atualizar preview ao digitar
    const signatureTextInput = document.getElementById('signatureText');
    if (signatureTextInput) {
        signatureTextInput.addEventListener('input', updateSignaturePreview);
    }

    // Inicializar preview
    updateSignaturePreview();

    // Adicionar listeners para o canvas do PDF
    const pdfCanvas = document.getElementById('pdfCanvas');
    if (pdfCanvas) {
        pdfCanvas.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const field = findClickedField(x, y);
            if (field) {
                activeSignatureField = {
                    event: e,
                    canvas: this,
                    field: field
                };
                showSimpleModal();
            }
        });
    }
});
