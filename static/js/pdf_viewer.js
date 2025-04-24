// Configurações iniciais
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let currentPdf = null;
let zoomLevel = 1.0;
let margins = { top: 20, right: 20, bottom: 20, left: 20 };
let signatureFields = [];
let rubricFields = [];
let isSignature = false;
let rectignature = null;
let findSignature = null;
let zoomSignature = false;
let pendingRubrics = [];
let signedPages = [];
let totalSignaturesRequired = 0;
let completedSignatures = 0;

// Inicializar o visualizador de PDF
async function initPdfViewer() {
    const container = document.getElementById('pdfViewerContainer');

    if (!container) {
        console.error('Container de visualização PDF não encontrado');
        return;
    }

    openPopup();

    showLoading(container);

    try {
        // Verificar se temos uma URL válida
        if (!pdfUrl) {
            throw new Error('URL do PDF não informada');
        }

        await loadPdf(pdfUrl);
        hideLoading(container);

        // Inicializar eventos responsivos
        handleResponsiveLayout();

        // Verificar concordância com termos
        const termsOverlay = document.getElementById('termsOverlay');
        if (termsOverlay) {
            const termsCheckbox = document.getElementById('termsCheckbox');
            const mobileTermsCheckbox = document.getElementById('mobileTermsCheckbox');

            // Se algum checkbox estiver marcado, esconder o overlay
            if ((termsCheckbox && termsCheckbox.checked) || 
                (mobileTermsCheckbox && mobileTermsCheckbox.checked)) {
                toggleTermsAgreement();
            }
        }

        closePopup();
        if(currentSignature == "None")
            showSimpleModal();
    } catch (error) {
        console.error('Error loading PDF:', error);
        container.innerHTML = `
            <div class="pdf-error">
                <i data-feather="alert-circle"></i>
                <p>Erro ao carregar o PDF: ${error.message}</p>
            </div>
        `;
        feather.replace();
        hideLoading(container);
        showNotification(`Erro ao carregar o PDF: ${error.message}`, 'error');
        closePopup();
    }
}

// Função para mostrar indicador de carregamento
function showLoading(container) {
    if (!container) return;
    // Verificar se já existe um indicador de carregamento
    if (container.querySelector('.pdf-loading')) return;

    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'pdf-loading';
    loadingIndicator.innerHTML = '<div class="loading-spinner"></div><p>Carregando PDF...</p>';
    container.appendChild(loadingIndicator);
}

// Função para esconder indicador de carregamento
function hideLoading(container) {
    if (!container) return;
    const loadingIndicator = container.querySelector('.pdf-loading');
    if (loadingIndicator) {
        container.removeChild(loadingIndicator);
    }
}

// Carregar o PDF
async function loadPdf(url) {
    if (!url) throw new Error('URL do PDF não especificada');

    const proxyUrl = `/proxy/storage/${url.replace('https://storage.googleapis.com/', '')}`;
    const loadingTask = pdfjsLib.getDocument(proxyUrl);
    currentPdf = await loadingTask.promise;

    await renderPdfPages();
}

// Renderizar páginas do PDF
async function renderPdfPages() {
    if (!currentPdf) return;

    const container = document.getElementById('pdfViewerContainer');

    // Limpar o container
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // Criar container para páginas
    const pagesContainer = document.createElement('div');
    pagesContainer.className = 'pdf-pages-container';
    container.appendChild(pagesContainer);

    // Inicializar contadores para assinaturas
    signatureFields = [];
    rubricFields = [];


    // Verificar se precisamos carregar posições de assinatura
    if (!needSignature) {
        await loadSignaturePositions(currentDocumentId);
    }

    // Renderizar cada página
    const totalPages = currentPdf.numPages;
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        // Criar container para esta página
        const pageContainer = document.createElement('div');
        pageContainer.className = 'pdf-page-wrapper';
        pageContainer.dataset.pageNumber = pageNum;
        pagesContainer.appendChild(pageContainer);

        // Criar canvas para a página
        const pageCanvas = document.createElement('canvas');
        pageCanvas.className = 'pdf-page-canvas';
        pageContainer.appendChild(pageCanvas);

        // Renderizar a página
        if (!needSignature) {
            await renderPdfPageWithSignature(pageNum, pageCanvas);
        } else {
            await renderPdfPage(pageNum, pageCanvas);
        }

        // Adicionar número da página se houver mais de uma
        if (totalPages > 1) {
            const pageNumberIndicator = document.createElement('div');
            pageNumberIndicator.className = 'pdf-page-number';
            pageNumberIndicator.textContent = `${pageNum} / ${totalPages}`;
            pageContainer.appendChild(pageNumberIndicator);
        }
    }

    // Configurar eventos de toque para dispositivos móveis
    setupMobilePdfGestures();
}

// Renderizar uma página do PDF normal
async function renderPdfPage(pageNumber, canvas) {
    try {
        const page = await currentPdf.getPage(pageNumber);
        const context = canvas.getContext('2d');

        // Calcular viewport com base no zoom
        const viewport = page.getViewport({ scale: zoomLevel });

        // Configurar dimensões do canvas
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        // Renderizar PDF no contexto do canvas
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        await page.render(renderContext).promise;
    } catch (error) {
        console.error(`Error rendering PDF page ${pageNumber}:`, error);
        const errorMsg = document.createElement('div');
        errorMsg.className = 'pdf-page-error';
        errorMsg.textContent = `Erro ao carregar página ${pageNumber}`;
        canvas.parentNode.appendChild(errorMsg);
    }
}

// Renderizar página do PDF com campos de assinatura
async function renderPdfPageWithSignature(pageNumber, canvas) {
    try {
        const page = await currentPdf.getPage(pageNumber);
        const context = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: zoomLevel });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };           

        await page.render(renderContext).promise;

        // Se a página já foi assinada, mostrar assinatura/rubrica
        if(signedPages.includes(pageNumber)){
            const { width: pageWidth, height: pageHeight } = viewport;

            if (findSignature && findSignature.resultados[pageNumber-1] && 
                findSignature.resultados[pageNumber-1].has_signature) {
                rectignature = findSignature.resultados[pageNumber-1].rect;

                const [x0, y0] = viewport.convertToViewportPoint(rectignature.x0, rectignature.y0);
                const [x1, y1] = viewport.convertToViewportPoint(rectignature.x1, rectignature.y1);

                const field = {
                    x: x0,
                    y: (viewport.height - y1) - 6,
                    width: x1 - x0,
                    height: (y1 - y0) - 10,
                    type: 'signature',
                    pageNumber: pageNumber
                };

                field.x = Math.max(margins.left, Math.min(field.x, pageWidth - field.width - margins.right));
                field.y = Math.max(margins.top, Math.min(field.y, pageHeight - field.height - margins.bottom));

                signatureFields.push(field);

                // Colocar a assinatura
                placeSignature(null, canvas, field);
            } else if (findSignature && findSignature.resultados[pageNumber-1] && 
                      !findSignature.resultados[pageNumber-1].has_signature) {
                // Colocar rubrica
                const rubrectangle = findSignature.resultados[pageNumber-1].rect;
                const [rx0, ry0] = viewport.convertToViewportPoint(rubrectangle.x0, rubrectangle.y0);
                const [rx1, ry1] = viewport.convertToViewportPoint(rubrectangle.x1, rubrectangle.y1);

                const field = {
                    x: rx0,
                    y: (viewport.height - ry1) - 6,
                    width: rx1 - rx0,
                    height: (ry1 - ry0) - 10,
                    type: 'rubric',
                    pageNumber: pageNumber
                };

                field.x = Math.max(margins.left, Math.min(field.x, pageWidth - field.width - margins.right));
                field.y = Math.max(margins.top, Math.min(field.y, pageHeight - field.height - margins.bottom));

                rubricFields.push(field);

                placeRubric(null, canvas, field);
            }
        } else {
            // Detectar campos de assinatura/rubrica
            await detectSignatureFields((pageNumber - 1), canvas, viewport);
        }

        // Adicionar evento de clique para áreas de assinatura e rubrica
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Verificar se clicou em área de assinatura
            const signatureField = signatureFields.find(field => 
                field.pageNumber === pageNumber &&
                field.type === "signature" 
            );

            if (signatureField && currentSignature) {
                // Colocar assinatura
                placeSignature(e, canvas, signatureField);

                // Marcar página como assinada
                if (!signedPages.includes(pageNumber)) {
                    signedPages.push(pageNumber);
                    completedSignatures++;
                }

                checkSignatureCompletion();

                // Avançar para próxima página
                scrollToNextPage(pageNumber);

                return;
            }

            // Verificar se clicou em área de rubrica
            const rubricField = rubricFields.find(field => 
                field.pageNumber === pageNumber &&
                 field.type == "rubric"             
            );

            if (rubricField && currentRubrica) {
                // Colocar rubrica
                placeRubric(e, canvas, rubricField);

                // Marcar página como rubricada
                if (!signedPages.includes(pageNumber)) {
                    signedPages.push(pageNumber);
                    completedSignatures++;
                }

                checkSignatureCompletion();

                // Avançar para próxima página
                scrollToNextPage(pageNumber);
            }
        });
    } catch (error) {
        console.error(`Error rendering PDF page ${pageNumber}:`, error);
        const errorMsg = document.createElement('div');
        errorMsg.className = 'pdf-page-error';
        errorMsg.textContent = `Erro ao carregar página ${pageNumber}`;
        canvas.parentNode.appendChild(errorMsg);
    }
}

// Carregar posições de assinatura a partir da API
async function loadSignaturePositions(documentId) {
    try {
        if (findSignature === null) {
            const params = new URLSearchParams({ find: find });
            const response = await fetch(`/api/pdf-analyzer/${documentId}?${params.toString()}`, {
                method: 'GET',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error);
            } 
            const responseText = await response.text();
            try {
                findSignature = JSON.parse(responseText);
            } catch (jsonError) {
                console.error('Erro ao analisar JSON:', jsonError);
                console.error('Resposta recebida:', responseText.substring(0, 200) + '...');
                throw new Error('A resposta do servidor não é um JSON válido');
            }

            // Contar quantas assinaturas e rubricas são necessárias
            const totalPages = currentPdf.numPages;
            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                let pageHasSignatureField = false;
                let pageHasRubricField = false;

                // Verificar se há área de assinatura na página
                if (findSignature && findSignature.resultados && findSignature.resultados[pageNum-1] && 
                    findSignature.resultados[pageNum-1].has_signature) {
                    totalSignaturesRequired++;
                    pageHasSignatureField = true;
                }

                // Verificar se há área de rubrica definida na API
                if (findSignature && findSignature.resultados && findSignature.resultados[pageNum-1] && 
                    !findSignature.resultados[pageNum-1].has_signature) {
                    totalSignaturesRequired++;
                    pageHasRubricField = true;
                }

                // Se não há nem assinatura nem rubrica, adicionar à lista de pendências
                if (!pageHasSignatureField && !pageHasRubricField) {
                    pendingRubrics.push(pageNum);
                    totalSignaturesRequired++;
                }
            }
        }
    } catch (error) {
        console.error('Error loading signature positions:', error);
        // Verifica se você está autenticado
        if (document.body.innerHTML.includes('login') || document.body.innerHTML.includes('Login')) {
            showNotification('Você precisa estar autenticado para acessar este recurso', 'error');
        } else {
            showNotification(error.message, 'error');
        }
    }
}

// Detectar campos de assinatura e rubrica
async function detectSignatureFields(pageNumber, canvas, viewport) {
    const ctx = canvas.getContext('2d');
    const { width: pageWidth, height: pageHeight } = viewport;

    if (findSignature != null) {
        // Verificar se esta página tem campo de assinatura
        if (findSignature.resultados[pageNumber].has_signature == true) {
            rectignature = findSignature.resultados[pageNumber].rect;
            const [x0, y0] = viewport.convertToViewportPoint(rectignature.x0, rectignature.y0);
            const [x1, y1] = viewport.convertToViewportPoint(rectignature.x1, rectignature.y1);

            const field = {
                x: x0,
                y: (viewport.height - y1) - 6,
                width: x1 - x0,
                height: (y1 - y0) - 10,
                type: 'signature',
                pageNumber: pageNumber + 1
            };

            field.x = Math.max(margins.left, Math.min(field.x, pageWidth - field.width - margins.right));
            field.y = Math.max(margins.top, Math.min(field.y, pageHeight - field.height - margins.bottom));

            signatureFields.push(field);

            ctx.save();
            ctx.strokeStyle = '#2196F3';
            ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]);
            ctx.strokeRect(field.x, field.y, field.width, field.height);
            ctx.fillRect(field.x, field.y, field.width, field.height);
            ctx.fillStyle = '#2196F3';
            const iconFontSize = 10 * zoomLevel;
            const textFontSize = 8 * zoomLevel;
            ctx.font = `${iconFontSize}px Arial`;
            ctx.fillText('✒️', field.x + 25, field.y + (field.height / 2));
            ctx.font = `${textFontSize}px Arial`;
            ctx.fillStyle = '#666';
            ctx.fillText('Clique para assinar', (field.x) + 50, field.y + (field.height / 2));
            ctx.restore();
        } else {
            // Esta página não tem campo de assinatura, verificar se há rubrica
            if (!findSignature.resultados[pageNumber].has_signature) {
                const rubrectangle = findSignature.resultados[pageNumber].rect;
                const [rx0, ry0] = viewport.convertToViewportPoint(rubrectangle.x0, rubrectangle.y0);
                const [rx1, ry1] = viewport.convertToViewportPoint(rubrectangle.x1, rubrectangle.y1);

                const field = {
                    x: rx0,
                    y: (viewport.height - ry1) - 6,
                    width: rx1 - rx0,
                    height: (ry1 - ry0) - 10,
                    type: 'rubric',
                    pageNumber: pageNumber + 1
                };

                field.x = Math.max(margins.left, Math.min(field.x, pageWidth - field.width - margins.right));
                field.y = Math.max(margins.top, Math.min(field.y, pageHeight - field.height - margins.bottom));

                rubricFields.push(field);

                ctx.save();
                ctx.strokeStyle = '#4CAF50'; // Verde para diferenciar da assinatura
                ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 3]);
                ctx.strokeRect(field.x, field.y, field.width, field.height);
                ctx.fillRect(field.x, field.y, field.width, field.height);
                ctx.fillStyle = '#4CAF50';
                const iconFontSize = 10 * zoomLevel;
                const textFontSize = 8 * zoomLevel;
                ctx.font = `${iconFontSize}px Arial`;
                ctx.fillText('✓', field.x + 10, field.y + (field.height / 2));
                ctx.font = `${textFontSize}px Arial`;
                ctx.fillStyle = '#666';
                ctx.fillText('Clique para rubricar', field.x + 25, field.y + (field.height / 2));
                ctx.restore();
            } else if (pendingRubrics.includes(pageNumber + 1)) {
                // Posicionar rubrica no canto superior direito como fallback
                const rubricWidth = 80 * zoomLevel;
                const rubricHeight = 40 * zoomLevel;

                const field = {
                    x: pageWidth - rubricWidth - margins.right,
                    y: margins.top,
                    width: rubricWidth,
                    height: rubricHeight,
                    type: 'rubric',
                    pageNumber: pageNumber + 1
                };

                rubricFields.push(field);

                ctx.save();
                ctx.strokeStyle = '#4CAF50';
                ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 3]);
                ctx.strokeRect(field.x, field.y, field.width, field.height);
                ctx.fillRect(field.x, field.y, field.width, field.height);
                ctx.fillStyle = '#4CAF50';
                const iconFontSize = 10 * zoomLevel;
                const textFontSize = 8 * zoomLevel;
                ctx.font = `${iconFontSize}px Arial`;
                ctx.fillText('✓', field.x + 10, field.y + (field.height / 2));
                ctx.font = `${textFontSize}px Arial`;
                ctx.fillStyle = '#666';
                ctx.fillText('Clique para rubricar', field.x + 25, field.y + (field.height / 2));
                ctx.restore();
            }
        }
    }
}


// Função para salvar o documento assinado e redirecionar para página de sucesso
async function saveSignedDocument(documentId) {
    try {
        openPopup(); // Mostra o indicador de carregamento

        // Enviar os dados de assinatura para o servidor
        const response = await fetch(`/api/pdf-analyzer/${documentId}`, {
            method: 'POST',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao salvar documento assinado');
        }

        const result = await response.json();

        // Redirecionar para a página de sucesso
        window.location.href = `/signature-success`;

    } catch (error) {
        closePopup();
        showNotification(error.message, 'error');
    }
}

// Função para colocar a assinatura no canvas
async function placeSignature(event, canvas, field) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(field.x, field.y, field.width, field.height);
    const img = new Image();
    img.src = currentSignature;
    img.onload = () => {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Calcular proporção
        const imgRatio = img.width / img.height;

        // Definir tamanho máximo relativo ao campo
        const maxWidth = field.width * 1.0;
        const maxHeight = field.height * 0.9;

        let drawWidth, drawHeight;

        // Calcular dimensões mantendo proporção
        if (imgRatio > 1) {
            // Imagem é mais larga que alta
            drawWidth = Math.min(maxWidth, field.width);
            drawHeight = drawWidth / imgRatio;

            // Se altura é muito grande, redimensionar
            if (drawHeight > maxHeight) {
                drawHeight = maxHeight;
                drawWidth = drawHeight * imgRatio;
            }
        } else {
            // Imagem é mais alta que larga ou quadrada
            drawHeight = Math.min(maxHeight, field.height);
            drawWidth = drawHeight * imgRatio;

            // Se largura é muito grande, redimensionar
            if (drawWidth > maxWidth) {
                drawWidth = maxWidth;
                drawHeight = drawWidth / imgRatio;
            }
        }

        // Centralizar imagem no campo
        const offsetX = field.x + (field.width - drawWidth) / 2;
        const offsetY = field.y + (field.height - drawHeight) / 2;

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        isSignature = true;
    };
}

// Função para colocar a rubrica no canvas
async function placeRubric(event, canvas, field) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(field.x, field.y, field.width, field.height);
    const img = new Image();
    img.src = currentRubrica;
    img.onload = () => {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Calcular proporção
        const imgRatio = img.width / img.height;

        // Definir tamanho máximo relativo ao campo
        const maxWidth = field.width * 0.9;
        const maxHeight = field.height * 0.9;

        let drawWidth, drawHeight;

        // Calcular dimensões mantendo proporção
        if (imgRatio > 1) {
            // Imagem é mais larga que alta
            drawWidth = Math.min(maxWidth, field.width);
            drawHeight = drawWidth / imgRatio;

            // Se altura é muito grande, redimensionar
            if (drawHeight > maxHeight) {
                drawHeight = maxHeight;
                drawWidth = drawHeight * imgRatio;
            }
        } else {
            // Imagem é mais alta que larga ou quadrada
            drawHeight = Math.min(maxHeight, field.height);
            drawWidth = drawHeight * imgRatio;

            // Se largura é muito grande, redimensionar
            if (drawWidth > maxWidth) {
                drawWidth = maxWidth;
                drawHeight = drawWidth / imgRatio;
            }
        }

        // Centralizar imagem no campo
        const offsetX = field.x + (field.width - drawWidth) / 2;
        const offsetY = field.y + (field.height - drawHeight) / 2;

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    };
}

// Função para avançar para a próxima página depois de assinar/rubricar
function scrollToNextPage(currentPageNumber) {
    // Encontrar a próxima página que precisa de assinatura ou rubrica
    let nextPage = null;

    // Verificar páginas pendentes
    for (let i = 0; i < currentPdf.numPages; i++) {
        const pageNum = ((currentPageNumber) % currentPdf.numPages) + 1;

        if (!signedPages.includes(pageNum)) {
            nextPage = pageNum;
            break;
        }
    }

    if (nextPage) {
        // Rolar para a próxima página
        const pagesContainer = document.querySelector('.pdf-pages-container');
        const nextPageElement = document.querySelector(`.pdf-page-wrapper[data-page-number="${nextPage}"]`);

        if (pagesContainer && nextPageElement) {
            pagesContainer.scrollTo({
                top: nextPageElement.offsetTop,
                behavior: 'smooth'
            });
        }
    }
}

// Verificar se todas as assinaturas e rubricas foram concluídas
function checkSignatureCompletion() {
    if (completedSignatures >= totalSignaturesRequired) {
        document.getElementById('saveSignedDocBtn').disabled = false;
    }
}

// Função para ajustar o zoom
async function adjustZoom(delta) {
    const oldZoom = zoomLevel;
    zoomLevel += delta;
    zoomLevel = Math.max(0.2, Math.min(3, zoomLevel));
    if (oldZoom === zoomLevel) return;

    const zoomLevelSpan = document.getElementById('zoomLevel');
    zoomLevelSpan.textContent = `${(zoomLevel * 100).toFixed(0)}%`;

    // Lembrar a posição de scroll atual
    const pagesContainer = document.querySelector('.pdf-pages-container');
    const scrollRatio = pagesContainer ? pagesContainer.scrollTop / pagesContainer.scrollHeight : 0;

    // Renderizar novamente com novo zoom
    await renderPdfPages();

    // Restaurar a posição de scroll
    const newPagesContainer = document.querySelector('.pdf-pages-container');
    if (newPagesContainer) {
        setTimeout(() => {
            newPagesContainer.scrollTop = scrollRatio * newPagesContainer.scrollHeight;
        }, 50);
    }
}

// Função para imprimir o documento
function printDocument() {
    const printWindow = window.open('', '_blank');
    const pdfUrl = `/proxy/storage/${pdfUrl.replace('https://storage.googleapis.com/', '')}`;

    printWindow.document.write(`
        <html>
        <head>
            <title>Impressão de Documento</title>
            <style>
                body { margin: 0; }
                iframe { width: 100%; height: 100vh; border: none; }
            </style>
        </head>
        <body>
            <iframe src="${pdfUrl}" onload="this.contentWindow.print();"></iframe>
        </body>
        </html>
    `);

    printWindow.document.close();
}


// Esconder modal
function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Alternar concordância com os termos
function toggleTermsAgreement() {
    const overlay = document.getElementById('termsOverlay');
    const checkbox = document.getElementById('termsCheckbox');
    const mobileCheckbox = document.getElementById('mobileTermsCheckbox');

    // Sincronizar a caixa de seleção móvel com a desktop
    if (checkbox && mobileCheckbox) {
        if (checkbox.checked !== undefined) mobileCheckbox.checked = checkbox.checked;
        else if (mobileCheckbox.checked !== undefined) checkbox.checked = mobileCheckbox.checked;
    }

    // Atualizar overlay
    const isChecked = (checkbox && checkbox.checked) || (mobileCheckbox && mobileCheckbox.checked);

    if (isChecked) {
        if (overlay) {
            // Esconder o overlay com fade out
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
            setTimeout(() => {
                if (overlay) overlay.style.display = 'none';
            }, 300); // Duração da transição
        }

        // Habilitar botões
        const signBtn = document.getElementById('openSimpleModalBtn');
        const saveBtn = document.getElementById('saveSignedDocBtn');
        if (signBtn) signBtn.removeAttribute('disabled');
        if (saveBtn && completedSignatures >= totalSignaturesRequired) {
            saveBtn.removeAttribute('disabled');
        }
    } else {
        if (overlay) {
            // Mostrar o overlay
            overlay.style.display = 'flex';
            overlay.style.pointerEvents = 'auto';
            // Pequeno delay para garantir que o display:flex seja aplicado antes da transição
            setTimeout(() => {
                if (overlay) overlay.style.opacity = '1';
            }, 10);
        }

        // Desabilitar botões
        const signBtn = document.getElementById('openSimpleModalBtn');
        const saveBtn = document.getElementById('saveSignedDocBtn');
        if (signBtn) signBtn.setAttribute('disabled', 'disabled');
        if (saveBtn) saveBtn.setAttribute('disabled', 'disabled');
    }

    // Verificar se é mobile e ajustar layout
    handleResponsiveLayout();
}

// Função para sincronizar as caixas de seleção (mobile e desktop)
function syncCheckboxes(sourceCheckbox, targetCheckboxId) {
    const targetCheckbox = document.getElementById(targetCheckboxId);
    if (targetCheckbox) {
        targetCheckbox.checked = sourceCheckbox.checked;
        toggleTermsAgreement();
    }
}

// Configurar eventos de toque para PDF em dispositivos móveis
function setupMobilePdfGestures() {
    const container = document.querySelector('.pdf-pages-container');
    if (!container) return;

    let touchStartY = 0;
    let touchStartDistance = 0;
    let lastTapTime = 0;

    // Handle pinch zoom
    container.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2) {
            touchStartDistance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
        }
        if (e.touches.length === 1) {
            touchStartY = e.touches[0].pageY;

            // Detectar duplo toque para zoom
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTapTime;
            if (tapLength < 300 && tapLength > 0) {
                e.preventDefault();
                // Alternar entre zoom padrão e zoom ampliado
                if (zoomLevel <= 1.0) {
                    adjustZoom(0.8); // Aumentar zoom
                } else {
                    zoomLevel = getInitialZoomLevel();
                    const zoomLevelSpan = document.getElementById('zoomLevel');
                    if (zoomLevelSpan) {
                        zoomLevelSpan.textContent = `${(zoomLevel * 100).toFixed(0)}%`;
                    }
                    renderPdfPages(); // Renderizar novamente
                }
            }
            lastTapTime = currentTime;
        }
    });

    container.addEventListener('touchmove', function(e) {
        // Pinch to zoom
        if (e.touches.length === 2) {
            e.preventDefault(); // Prevent default scrolling

            const currentDistance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );

            if (touchStartDistance > 0) {
                const distanceDiff = currentDistance - touchStartDistance;
                if (Math.abs(distanceDiff) > 10) { // Minimum threshold to prevent accidental zooms
                    const zoomDelta = distanceDiff > 0 ? 0.1 : -0.1;
                    adjustZoom(zoomDelta);
                    touchStartDistance = currentDistance;
                }
            }
        }
    });

    // Adicionar tratamento para tap na área de assinatura
    const signaturesContainer = document.getElementById('signatures-container');
    if (signaturesContainer) {
        signaturesContainer.addEventListener('touchstart', function(e) {
            // Permitir eventos de toque passarem para as assinaturas
            signaturesContainer.style.pointerEvents = 'auto';
        });

        signaturesContainer.addEventListener('touchend', function(e) {
            // Reverter para não interceptar eventos após o toque
            setTimeout(() => {
                signaturesContainer.style.pointerEvents = 'none';
            }, 300);
        });
    }
}

// Verificar se é dispositivo móvel
function isMobileDevice() {
    return window.innerWidth <= 768;
}

// Mostrar notificação
function showNotification(message, type = 'info') {
    // Remover notificações antigas
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => {
        document.body.removeChild(notif);
    });

    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i data-feather="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i data-feather="x"></i>
        </button>
    `;

    document.body.appendChild(notification);

    // Inicializar ícones Feather
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    // Auto remover após 5 segundos
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);

    console.log(`[${type}] ${message}`);
}

// Abrir e fechar popup de carregamento
function openPopup(message = 'Processando...') {
    // Remover qualquer popup existente primeiro
    closePopup();

    const popup = document.createElement('div');
    popup.className = 'loading-popup';
    popup.innerHTML = `
        <div class="loading-spinner"></div>
        <p>${message}</p>
    `;
    document.body.appendChild(popup);
    document.body.style.overflow = 'hidden';
}

function closePopup() {
    const popup = document.querySelector('.loading-popup');
    if (popup) {
        // Aplicar animação de fade-out
        popup.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(popup)) {
                document.body.removeChild(popup);
                document.body.style.overflow = '';
            }
        }, 300);
    }
}

// Adicionar estilos necessários ao carregar a página
document.addEventListener('DOMContentLoaded', function() {
    // Adicionar estilos para popup de carregamento e notificações
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .loading-popup {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        }

        .loading-popup p {
            color: white;
            margin-top: 15px;
        }

        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-primary);
            border-left: 4px solid var(--accent-color);
            padding: 12px 15px;
            border-radius: 5px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: opacity 0.3s, transform 0.3s;
        }

        .notification.error {
            border-left-color: #f44336;
        }

        .notification.success {
            border-left-color: #4caf50;
        }

        .notification.warning {
            border-left-color: #ff9800;
        }

        .notification-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .notification-close {
            background: none;
            border: none;
            cursor: pointer;
            color: var(--text-secondary);
        }

        .notification.fade-out {
            opacity: 0;
            transform: translateX(30px);
        }
    `;
    document.head.appendChild(styleElement);

    // Inicializar layout responsivo
    handleResponsiveLayout();

    // Inicializar ícones Feather
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    // Configurar eventos de toque para dispositivos móveis
    setupMobilePdfGestures();
});

// Função para detectar quando a tela muda de tamanho e ajustar elementos
function handleResponsiveLayout() {
    const isMobile = window.innerWidth <= 768;
    const previewContainer = document.querySelector('.preview-container');
    const mobileTermsContainer = document.querySelector('.mobile-terms-container');
    const termsCheckboxContainer = document.querySelector('.terms-checkbox-container');
    const previewControlsGroup = document.querySelector('.preview-controls-group');
    const zoomControls = document.querySelector('.zoom-controls');
    
    if (previewContainer) {
        if (isMobile) {
            // Ajusta a altura para considerar a faixa de termos em mobile
            previewContainer.style.height = 'calc(100vh - 120px - 40px)';
            if (mobileTermsContainer) {
                mobileTermsContainer.style.setProperty('display', 'flex', 'important');
            }
            if (termsCheckboxContainer) {
                termsCheckboxContainer.style.setProperty('display', 'none', 'important');
            }
            
            // Ajustar controles para mobile
            if (previewControlsGroup) {
                previewControlsGroup.style.width = '100%';
                previewControlsGroup.style.justifyContent = 'center';
            }
            
            if (zoomControls) {
                zoomControls.style.gap = '4px';
            }
            
            // Ajustar tamanho dos botões
            document.querySelectorAll('.preview-controls-group .action-btn').forEach(btn => {
                btn.style.minWidth = '40px';
                btn.style.minHeight = '40px';
                btn.style.padding = '8px';
                btn.style.display = 'flex';
                btn.style.alignItems = 'center';
                btn.style.justifyContent = 'center';
            });
            
            // Ajustar tamanho do texto do zoom
            const zoomLevel = document.getElementById('zoomLevel');
            if (zoomLevel) {
                zoomLevel.style.fontSize = '0.75rem';
                zoomLevel.style.minWidth = '36px';
            }
        } else {
            // Restaura a altura original em desktop
            previewContainer.style.height = 'calc(100vh - 120px)';
            if (mobileTermsContainer) {
                mobileTermsContainer.style.setProperty('display', 'none', 'important');
            }
            if (termsCheckboxContainer) {
                termsCheckboxContainer.style.setProperty('display', 'flex', 'important');
            }
            
            // Restaurar estilos dos controles para desktop
            if (previewControlsGroup) {
                previewControlsGroup.style.width = '';
                previewControlsGroup.style.justifyContent = '';
            }
            
            if (zoomControls) {
                zoomControls.style.gap = '';
            }
            
            // Restaurar tamanho dos botões
            document.querySelectorAll('.preview-controls-group .action-btn').forEach(btn => {
                btn.style.minWidth = '';
                btn.style.minHeight = '';
                btn.style.padding = '';
                btn.style.display = '';
                btn.style.alignItems = '';
                btn.style.justifyContent = '';
            });
            
            // Restaurar tamanho do texto do zoom
            const zoomLevel = document.getElementById('zoomLevel');
            if (zoomLevel) {
                zoomLevel.style.fontSize = '';
                zoomLevel.style.minWidth = '';
            }
        }
    }
    
    // Ajustar modal
    const simpleModal = document.getElementById('simpleModal');
    if (simpleModal) {
        const modalContent = simpleModal.querySelector('.modal-content');
        if (modalContent && isMobile) {
            modalContent.style.width = '95%';
            modalContent.style.maxWidth = '95%';
            modalContent.style.margin = '5% auto';
        } else if (modalContent) {
            modalContent.style.width = '';
            modalContent.style.maxWidth = '';
            modalContent.style.margin = '';
        }
    }
}

// Modificar a função applySignatureOrText para incluir a rubrica
function applySignatureOrText() {
    const signatureText = document.getElementById('signatureText').value;
    const rubricText = document.getElementById('rubricText').value;

    // Gerar a assinatura como imagem
    const signatureImg = generateTextSignature(signatureText, currentSelectedFont);

    // Gerar a rubrica como imagem
    const rubricImg = generateRubricImage(rubricText, currentSelectedFont);

    // Gerar a assinatura como imagem
    const signatureImgDoc = generateTextSignatureDoc(signatureText, currentSelectedFont);

    // Gerar a rubrica como imagem
    const rubricImgDoC = generateRubricImageDoc(rubricText, currentSelectedFont);


    // Fechar o modal
    hideModal('simpleModal');

    // Armazenar tanto a assinatura quanto a rubrica
    currentRubrica = rubricImg;
    addSignature(signatureImg, rubricImg, signatureImgDoc, rubricImgDoC);
}

async function addSignature(signatureData, rubricImg, signatureDataDoc, rubricImgDoc) {
    currentSignature = signatureData;
    currentRubric = rubricImg;
    try {
        if(signatureData != null){
            const response = await fetch(`/api/signature`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    signature : currentSignature,
                    rubric : currentRubric,
                    signatureDoc : signatureDataDoc,
                    rubricDoc : rubricImgDoc,
                    type_font : currentSelectedFont
                })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create signature');
            } 
        }    
    } catch (error) {
        console.error('Error creating signature:', error);
        showNotification(error.message, 'error');
    } 
}

// Adicionar event listener para redimensionamento da janela
window.addEventListener('resize', handleResponsiveLayout);

function getInitialZoomLevel() {
    // For mobile devices, start with smaller zoom to fit width
    if (isMobileDevice()) {
        return 0.8; // Smaller initial zoom for mobile
    } else {
        return 1.8; // Your original desktop zoom
    }
}