// Arquivo signature-modal.js

// Variáveis globais para armazenar informações de assinatura
let signatureImage = null;
let currentSignaturePosition = null;
let currentPdfPage = null;

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

// Initialize fonts and signature functionality
document.addEventListener('DOMContentLoaded', function() {
    // Set up font selection
    const fontBtns = document.querySelectorAll('.font-btn');
    const fontPreview = document.getElementById('fontPreview');
    const fontFamilyInput = document.getElementById('fontFamily');

    // Initialize with the first font
    if (fontBtns.length > 0 && fontPreview) {
        const firstFont = fontBtns[0].getAttribute('data-font');
        fontPreview.style.fontFamily = firstFont;
        fontPreview.textContent = 'Sua assinatura será visualizada aqui';
        if (fontFamilyInput) {
            fontFamilyInput.value = firstFont;
        }
        fontBtns[0].classList.add('selected');
    }

    // Set up font button click handlers
    fontBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const font = this.getAttribute('data-font');
            // Update preview
            if (fontPreview) {
                fontPreview.style.fontFamily = font;
                // Keep the current text if it exists
                if (fontPreview.textContent === 'Prévia da Fonte' || 
                    fontPreview.textContent === 'Sua assinatura será visualizada aqui') {
                    fontPreview.textContent = 'Sua assinatura será visualizada aqui';
                }
            }

            // Update hidden input
            if (fontFamilyInput) {
                fontFamilyInput.value = font;
            }

            // Update selected state
            fontBtns.forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
        });
    });

    // Handle font preview update when text changes
    const signatureText = document.getElementById('signatureText');
    if (signatureText && fontPreview) {
        signatureText.addEventListener('input', function() {
            fontPreview.textContent = this.value || 'Sua assinatura será visualizada aqui';
        });
    }
});


// Função para aplicar assinatura ao documento
function applySignatureOrText() {
    try {
        const fontPreview = document.getElementById('fontPreview');
        const fontFamily = document.getElementById('fontFamily').value;

        if (!fontPreview) {
            console.error('Elemento de prévia de fonte não encontrado');
            alert('Erro: Elemento de prévia de fonte não encontrado');
            return;
        }

        // Criar imagem da assinatura a partir do texto usando HTML2Canvas
        html2canvas(fontPreview, {
            backgroundColor: 'rgba(0, 0, 0, 0)',
            scale: 2,
            logging: false
        }).then(canvas => {
            // Converter canvas para imagem
            const signatureImg = new Image();
            signatureImg.src = canvas.toDataURL('image/png');

            // Armazenar a imagem para uso posterior
            signatureImage = signatureImg.src;

            // Fechar o modal de assinatura
            hideModal('simpleModal');

            // Verificar se há um canvas de PDF para adicionar a assinatura
            const pdfPagesContainer = document.querySelector('.pdf-pages-container');

            if (pdfPagesContainer) {
                // Preparar a assinatura para aplicação no documento
                const signatureElement = document.createElement('div');
                signatureElement.className = 'signature-element';
                signatureElement.style.position = 'absolute';
                signatureElement.style.zIndex = '100';
                signatureElement.style.cursor = 'move';
                signatureElement.style.width = '200px';
                signatureElement.innerHTML = `<img src="${signatureImage}" style="width:100%; user-select:none;" draggable="false">`;

                // Tornar o container de assinaturas visível para interação
                const signaturesContainer = document.getElementById('signatures-container');
                if (signaturesContainer) {
                    signaturesContainer.style.pointerEvents = 'auto';
                    signaturesContainer.appendChild(signatureElement);

                    // Posicionar inicialmente no centro da visualização
                    const previewContainer = document.querySelector('.preview-container');
                    if (previewContainer) {
                        const rect = previewContainer.getBoundingClientRect();
                        signatureElement.style.left = (rect.width / 2 - 100) + 'px';
                        signatureElement.style.top = (rect.height / 2 - 50) + 'px';

                        // Fazer a assinatura arrastável
                        makeElementDraggable(signatureElement);
                    }
                } else {
                    console.error('Container de assinaturas não encontrado');
                    alert('Erro: Container de assinaturas não encontrado');
                }
            } else {
                // Para outros tipos de visualização que não são PDF
                console.log('Visualização não é um PDF, salvando assinatura para uso posterior');
                alert('Assinatura aplicada com sucesso!');
            }
        }).catch(error => {
            console.error('Erro ao criar assinatura:', error);
            alert('Erro ao criar assinatura. Por favor tente novamente.');
        });
    } catch (error) {
        console.error('Erro ao aplicar assinatura:', error);
        alert('Erro ao aplicar assinatura: ' + error.message);
    }
}

// Função para tornar um elemento arrastável
function makeElementDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    element.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // obter a posição do cursor no início
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // chamar função sempre que o cursor se mover
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calcular a nova posição do cursor
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // definir a nova posição do elemento
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        // parar de mover quando o botão do mouse for solto
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// Função de utilitário para esconder modais
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Adicionando o script html2canvas se não estiver presente
function loadHtml2Canvas() {
    if (!window.html2canvas) {
        const script = document.createElement('script');
        script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
        script.onload = function() {
            console.log('html2canvas carregado com sucesso');
        };
        script.onerror = function() {
            console.error('Falha ao carregar html2canvas');
        };
        document.head.appendChild(script);
    }
}

// Carregar html2canvas ao inicializar
loadHtml2Canvas();

// Inicializar a área de prévia de fonte (moved here for better organization)
function initFontPreview() {
    const fontPreview = document.getElementById('fontPreview');
    if (fontPreview) {
        // Define a fonte inicial
        fontPreview.style.fontFamily = currentFont;
        fontPreview.textContent = "Sua assinatura";
    }
}

// Inicializar os botões de fontes (moved here for better organization)
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

//Function to initialize global font variable (added)
let currentFont = 'Dancing Script';