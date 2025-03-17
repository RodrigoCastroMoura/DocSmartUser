/**
 * Sistema de Detecção e Assinatura de Documentos
 * 
 * Este código adiciona funcionalidade para:
 * 1. Detectar nomes de usuários em documentos PDF
 * 2. Identificar áreas para assinatura
 * 3. Permitir que usuários assinem digitalmente documentos
 * 4. Salvar o documento com a assinatura
 */

// Configurações globais
let pdfDoc = null;
let signatureAreas = [];
let currentUser = null;
let userSignature = null;
let currentScale = 1.0;

// Inicialização da biblioteca Tesseract para OCR
const { createWorker } = Tesseract;
let worker = null;

// Inicializar o trabalhador do Tesseract quando necessário
async function initTesseract() {
  if (!worker) {
    worker = createWorker({
      logger: m => console.log(m),
    });
    await worker.load();
    await worker.loadLanguage('por+eng');
    await worker.initialize('por+eng');
  }
  return worker;
}

// Carregar as informações do usuário atual
async function loadCurrentUser() {
  try {
    // Esta função seria substituída pela lógica real para obter o usuário atual
    // No seu sistema atual, você provavelmente já tem isso em session
    const userInfo = {
      id: document.getElementById('user_id')?.value || '',
      name: document.getElementById('name-user')?.value || '',
      cpf: document.getElementById('user_cpf')?.value || ''
    };
    
    currentUser = userInfo;
    console.log("Usuário atual carregado:", currentUser);
    return currentUser;
  } catch (error) {
    console.error("Erro ao carregar informações do usuário:", error);
    return null;
  }
}

// Função para processar o documento PDF e encontrar áreas de assinatura
async function processDocumentForSignature(pdfUrl) {
  try {
    // Carregar o documento PDF
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    pdfDoc = await loadingTask.promise;
    
    signatureAreas = [];
    const user = await loadCurrentUser();
    
    if (!user || !user.name) {
      throw new Error("Informações do usuário não disponíveis. Por favor, faça login.");
    }
    
    // Procurar por áreas de assinatura em cada página
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      await findSignatureAreas(page, pageNum, user);
    }
    
    return {
      success: true,
      totalSignatureAreas: signatureAreas.length,
      message: signatureAreas.length > 0 
        ? `Encontrado ${signatureAreas.length} áreas para assinatura.` 
        : "Nenhuma área de assinatura encontrada."
    };
  } catch (error) {
    console.error("Erro ao processar documento para assinatura:", error);
    return {
      success: false,
      message: error.message || "Erro ao processar o documento"
    };
  }
}

// Detectar áreas de assinatura em uma página do PDF
async function findSignatureAreas(page, pageNum, user) {
  try {
    // Obter o conteúdo de texto da página
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Renderizar a página para análise visual (OCR)
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    // Primeiro método: buscar por padrões de texto que indiquem áreas de assinatura
    let foundByText = await findSignatureAreasByText(textContent, pageNum, user, viewport);
    
    // Segundo método: usar OCR para verificar áreas que possam conter indicações de assinatura
    if (foundByText.length === 0) {
      foundByText = await findSignatureAreasByOCR(canvas, pageNum, user, viewport);
    }
    
    // Adicionar as áreas encontradas ao array global
    signatureAreas.push(...foundByText);
    
  } catch (error) {
    console.error(`Erro ao analisar a página ${pageNum}:`, error);
  }
}

// Buscar por padrões de texto que indiquem áreas de assinatura
async function findSignatureAreasByText(textContent, pageNum, user, viewport) {
  const signatureKeywords = [
    'assinar', 'assinatura', 'assinado', 'firma', 'certificado',
    'sign', 'signature', 'signed', 'assinante', 'contratante'
  ];
  
  // Expressões que podem indicar uma área de assinatura com o nome do usuário
  const userNameRegexPatterns = [
    new RegExp(`${user.name}\\s*(:|assinatura|assinar|assinado)`, 'i'),
    new RegExp(`(assinatura|assinar|assinado)\\s*:?\\s*${user.name}`, 'i'),
    new RegExp(`${user.name.split(' ')[0]}\\s*(:|assinatura|assinar|assinado)`, 'i'),
    // Nome sem acentos para melhorar a detecção
    new RegExp(`${removeAccents(user.name)}\\s*(:|assinatura|assinar|assinado)`, 'i')
  ];
  
  const foundAreas = [];
  const items = textContent.items;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const text = item.str.toLowerCase();
    
    // Verificar se o texto corresponde a um dos padrões de assinatura
    const isSignatureArea = signatureKeywords.some(keyword => text.includes(keyword.toLowerCase())) ||
      userNameRegexPatterns.some(pattern => pattern.test(item.str));
    
    if (isSignatureArea) {
      // Encontramos uma possível área de assinatura
      const area = {
        pageNum,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width || 150, // Largura padrão se não disponível
        height: item.height || 50, // Altura padrão se não disponível
        text: item.str,
        type: 'text'
      };
      
      // Ajustar coordenadas para que a assinatura fique próxima, mas não sobreposta ao texto
      area.y -= 10; // Mover um pouco para cima para não cobrir o texto
      
      foundAreas.push(area);
      console.log(`Área de assinatura encontrada na página ${pageNum}:`, area);
    }
  }
  
  // Se não encontramos áreas específicas, vamos buscar por linhas que possam ser para assinatura
  if (foundAreas.length === 0) {
    return findSignatureLinesByText(textContent, pageNum, user, viewport);
  }
  
  return foundAreas;
}

// Encontrar linhas que possam ser para assinatura
function findSignatureLinesByText(textContent, pageNum, user, viewport) {
  const signatureLinePatterns = [
    /_{5,}/,              // Linha de underscore (_______)
    /\-{5,}/,             // Linha de hífen (-------)
    /assinatura.{0,20}$/i // Palavra "assinatura" no final de uma linha
  ];
  
  const foundAreas = [];
  const items = textContent.items;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    // Verificar se o texto corresponde a um dos padrões de linha para assinatura
    const isSignatureLine = signatureLinePatterns.some(pattern => pattern.test(item.str));
    
    if (isSignatureLine) {
      // Encontramos uma possível linha para assinatura
      const area = {
        pageNum,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width || 200, // Largura padrão se não disponível
        height: item.height || 50, // Altura padrão se não disponível
        text: item.str,
        type: 'line'
      };
      
      foundAreas.push(area);
      console.log(`Linha de assinatura encontrada na página ${pageNum}:`, area);
    }
  }
  
  return foundAreas;
}

// Usar OCR para detectar áreas de assinatura
async function findSignatureAreasByOCR(canvas, pageNum, user, viewport) {
  try {
    const worker = await initTesseract();
    
    // Usar OCR para extrair texto da imagem da página
    const { data } = await worker.recognize(canvas);
    
    const signatureKeywords = [
      'assinar', 'assinatura', 'assinado', 'firma', 'certificado',
      'sign', 'signature', 'signed', 'assinante', 'contratante'
    ];
    
    const foundAreas = [];
    
    // Processar os blocos de texto reconhecidos pelo OCR
    for (const block of data.blocks) {
      for (const paragraph of block.paragraphs) {
        const text = paragraph.text.toLowerCase();
        
        // Verificar se o texto contém palavras-chave de assinatura ou o nome do usuário
        const containsSignatureKeyword = signatureKeywords.some(keyword => text.includes(keyword.toLowerCase()));
        const containsUserName = user.name && text.includes(user.name.toLowerCase());
        
        if (containsSignatureKeyword || containsUserName) {
          // Encontramos uma possível área de assinatura
          const { x0, y0, x1, y1 } = paragraph.bbox;
          
          const area = {
            pageNum,
            x: x0,
            y: viewport.height - y1, // Converter coordenadas para o sistema do PDF
            width: x1 - x0,
            height: y1 - y0,
            text: paragraph.text,
            type: 'ocr'
          };
          
          // Ajustar coordenadas para que a assinatura fique abaixo do texto
          area.y -= 30; 
          
          foundAreas.push(area);
          console.log(`Área de assinatura (OCR) encontrada na página ${pageNum}:`, area);
        }
      }
    }
    
    // Se ainda não encontramos áreas, vamos verificar por linhas horizontais que podem ser para assinatura
    if (foundAreas.length === 0) {
      const lines = await detectHorizontalLines(canvas);
      
      for (const line of lines) {
        const area = {
          pageNum,
          x: line.x,
          y: viewport.height - line.y - line.height, // Converter coordenadas
          width: line.width,
          height: 50, // Altura padrão para a área de assinatura
          text: 'Linha detectada',
          type: 'line-detection'
        };
        
        // Ajustar a posição da assinatura para ficar acima da linha
        area.y += 20;
        
        foundAreas.push(area);
        console.log(`Linha horizontal para assinatura detectada na página ${pageNum}:`, area);
      }
    }
    
    return foundAreas;
  } catch (error) {
    console.error(`Erro no OCR na página ${pageNum}:`, error);
    return [];
  }
}

// Detectar linhas horizontais na imagem que possam ser para assinatura
async function detectHorizontalLines(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;
  
  const lines = [];
  const minLineLength = width * 0.2; // A linha deve ser pelo menos 20% da largura da página
  
  // Percorrer cada linha da imagem
  for (let y = 0; y < height; y++) {
    let currentLineStart = -1;
    let currentLineLength = 0;
    
    // Percorrer cada pixel na linha horizontal
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      // Verificar se o pixel é escuro (possível linha)
      const isDark = r < 100 && g < 100 && b < 100;
      
      if (isDark) {
        if (currentLineStart === -1) {
          currentLineStart = x;
        }
        currentLineLength++;
      } else if (currentLineStart !== -1) {
        // Fim da linha
        if (currentLineLength >= minLineLength) {
          lines.push({
            x: currentLineStart,
            y: y,
            width: currentLineLength,
            height: 2
          });
        }
        currentLineStart = -1;
        currentLineLength = 0;
      }
    }
    
    // Verificar se a linha termina no final da página
    if (currentLineStart !== -1 && currentLineLength >= minLineLength) {
      lines.push({
        x: currentLineStart,
        y: y,
        width: currentLineLength,
        height: 2
      });
    }
  }
  
  return lines;
}

// Renderizar as áreas de assinatura no documento
function renderSignatureAreas(pageNum) {
  const signaturesContainer = document.getElementById('signatures-container');
  if (!signaturesContainer) return;
  
  // Limpar áreas existentes
  signaturesContainer.innerHTML = '';
  
  // Filtrar áreas para a página atual
  const areas = signatureAreas.filter(area => area.pageNum === pageNum);
  
  // Adicionar novas áreas
  areas.forEach((area, index) => {
    const signatureBox = document.createElement('div');
    signatureBox.className = 'signature-area';
    signatureBox.id = `signature-area-${pageNum}-${index}`;
    signatureBox.dataset.pageNum = pageNum;
    signatureBox.dataset.index = index;
    
    // Aplicar posicionamento baseado nas coordenadas do PDF
    const scale = currentScale;
    signatureBox.style.position = 'absolute';
    signatureBox.style.left = `${area.x * scale}px`;
    signatureBox.style.top = `${area.y * scale}px`;
    signatureBox.style.width = `${area.width * scale}px`;
    signatureBox.style.height = `${area.height * scale}px`;
    
    // Estilizar a área de assinatura
    signatureBox.innerHTML = `
      <div class="signature-prompt">
        <i class="fa fa-pen"></i>
        <span>Clique para assinar</span>
      </div>
    `;
    
    // Adicionar evento para abrir o modal de assinatura
    signatureBox.addEventListener('click', () => openSignatureModal(pageNum, index));
    
    signaturesContainer.appendChild(signatureBox);
  });
}

// Abrir o modal para assinatura
function openSignatureModal(pageNum, areaIndex) {
  const modal = document.getElementById('signatureModal');
  if (!modal) return;
  
  // Configurar o modal
  const currentArea = signatureAreas.find(
    area => area.pageNum === pageNum && signatureAreas.indexOf(area) === areaIndex
  );
  
  if (!currentArea) {
    console.error('Área de assinatura não encontrada');
    return;
  }
  
  // Preencher informações no modal
  document.getElementById('signatureCurrentPage').textContent = pageNum;
  document.getElementById('signatureCurrentIndex').textContent = areaIndex;
  
  // Limpar o canvas de assinatura
  const canvas = document.getElementById('signatureCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Exibir o modal
  modal.style.display = 'block';
  
  // Inicializar o canvas de assinatura
  initSignatureCanvas();
}

// Inicializar o canvas para captura de assinatura
function initSignatureCanvas() {
  const canvas = document.getElementById('signatureCanvas');
  const ctx = canvas.getContext('2d');
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  
  // Configurar estilos
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000000';
  
  // Funções de desenho
  function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = getCoordinates(e);
  }
  
  function draw(e) {
    if (!isDrawing) return;
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    
    const [currentX, currentY] = getCoordinates(e);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    
    [lastX, lastY] = [currentX, currentY];
  }
  
  function stopDrawing() {
    isDrawing = false;
  }
  
  function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    
    if (e.type.includes('touch')) {
      return [
        e.touches[0].clientX - rect.left,
        e.touches[0].clientY - rect.top
      ];
    } else {
      return [
        e.clientX - rect.left,
        e.clientY - rect.top
      ];
    }
  }
  
  // Adicionar eventos
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);
  
  // Suporte para touch
  canvas.addEventListener('touchstart', startDrawing);
  canvas.addEventListener('touchmove', draw);
  canvas.addEventListener('touchend', stopDrawing);
}

// Aplicar a assinatura ao documento
function applySignature() {
  const canvas = document.getElementById('signatureCanvas');
  const signaturePageNum = parseInt(document.getElementById('signatureCurrentPage').textContent);
  const signatureAreaIndex = parseInt(document.getElementById('signatureCurrentIndex').textContent);
  
  // Capturar a imagem da assinatura
  const signatureImage = canvas.toDataURL('image/png');
  userSignature = signatureImage;
  
  // Encontrar a área de assinatura
  const area = signatureAreas.find(
    (a, index) => a.pageNum === signaturePageNum && index === signatureAreaIndex
  );
  
  if (!area) {
    console.error('Área de assinatura não encontrada');
    return;
  }
  
  // Atualizar visualmente a área de assinatura
  const signatureBox = document.getElementById(`signature-area-${signaturePageNum}-${signatureAreaIndex}`);
  if (signatureBox) {
    signatureBox.innerHTML = `<img src="${signatureImage}" alt="Assinatura" style="width: 100%; height: 100%; object-fit: contain;">`;
    signatureBox.classList.add('signed');
  }
  
  // Fechar o modal
  document.getElementById('signatureModal').style.display = 'none';
  
  // Adicionar a assinatura ao array
  area.signed = true;
  area.signatureImage = signatureImage;
  
  // Verificar se todas as áreas foram assinadas
  const allSigned = signatureAreas.every(area => area.signed);
  if (allSigned) {
    document.getElementById('saveSignedDocumentBtn').disabled = false;
  }
}

// Limpar o canvas de assinatura
function clearSignatureCanvas() {
  const canvas = document.getElementById('signatureCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Carregar uma assinatura existente
function loadSavedSignature() {
  // Esta função poderia carregar uma assinatura salva previamente
  // Por exemplo, de um banco de dados ou localStorage
  const savedSignature = localStorage.getItem('userSignature');
  if (savedSignature) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.getElementById('signatureCanvas');
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = savedSignature;
  } else {
    showNotification('Nenhuma assinatura salva encontrada', 'info');
  }
}

// Salvar o documento com as assinaturas
async function saveSignedDocument(documentId) {
    try {
        showNotification('Salvando documento assinado...', 'info');
        
        // Get the canvas with the signed PDF
        const canvas = document.querySelector('.pdf-page-canvas');
        if (!canvas) {
            throw new Error('Canvas not found');
        }

        // Convert canvas to blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'application/pdf'));
        
        // Create form data
        const formData = new FormData();
        formData.append('file', blob, 'signed_document.pdf');

        // Get the access token from session
        const token = await getAccessToken(); // Você precisa implementar esta função

        const response = await fetch(`/api/documents/${documentId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to save signed document');
        }

        showNotification('Documento assinado salvo com sucesso!', 'success');
        hideModal('previewModal');
        loadDocuments(); // Reload the documents list
    } catch (error) {
        console.error('Erro ao salvar documento assinado:', error);
        showNotification('Erro ao salvar o documento assinado', 'error');
    }
    try {
        showNotification('Salvando documento assinado...', 'info');

        // Get the canvas with the signed PDF
        const canvas = document.querySelector('canvas');
        const imageData = canvas.toDataURL('image/png');
        
        // Create the request body with the signed document data
        const requestBody = {
            document_id: documentId,
            signatures: [{
                page_num: 0,
                signature_image: imageData,
                x: rectignature.x0,
                y: rectignature.y0,
                width: rectignature.x1 - rectignature.x0,
                height: rectignature.y1 - rectignature.y0
            }]
        };

        // Send the signed document to the server
        const response = await fetch('/api/document/apply-signatures', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao salvar documento');
        }

        const result = await response.json();
        showNotification('Documento assinado com sucesso!', 'success');
        
        // Fechar o modal e atualizar a lista de documentos
        hideModal('previewModal');
        await loadDocuments(currentPage);

    } catch (error) {
    console.error('Erro ao salvar documento assinado:', error);
    showNotification('Erro ao salvar o documento assinado', 'error');
  }
}

// Exibir uma notificação ao usuário
function showNotification(message, type) {
  // Esta função depende da sua implementação de notificações
  // Exemplo compatível com seu sistema:
  if (typeof window.showNotification === 'function') {
    window.showNotification(message, type);
  } else {
    alert(message);
  }
}

// Remover acentos de strings
function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Inicializar o sistema quando o documento for carregado
document.addEventListener('DOMContentLoaded', function() {
  // Injetar o CSS necessário
  injectSignatureStyles();
  
  // Adicionar os elementos HTML necessários
  injectSignatureHTML();
  
  // Verificar quando um documento é visualizado
  const previewButton = document.querySelectorAll('.document-actions .action-btn');
  previewButton.forEach(button => {
    if (button.innerHTML.includes('eye')) {
      const originalOnclick = button.onclick;
      button.onclick = async function(e) {
        // Chamar o comportamento original primeiro
        if (originalOnclick) originalOnclick.call(this, e);
        
        // Depois, inicializar nosso sistema de assinatura
        setTimeout(async () => {
          // Obter a URL do documento
          const previewModalImg = document.querySelector('#imagePreview');
          const previewModalPdf = document.querySelector('#documentPreview');
          
          if (previewModalPdf && previewModalPdf.src) {
            initSignatureSystem(previewModalPdf.src);
          } else if (previewModalImg && previewModalImg.src) {
            showNotification('Assinatura não disponível para este tipo de documento', 'info');
          }
        }, 1000); // Pequeno delay para garantir que o modal seja aberto
      };
    }
  });
});

// Inicializar o sistema de assinatura quando um documento é aberto
async function initSignatureSystem(documentUrl) {
  try {
    // Processar o documento para encontrar áreas de assinatura
    const result = await processDocumentForSignature(documentUrl);
    
    if (result.success && result.totalSignatureAreas > 0) {
      showNotification(result.message, 'success');
      
      // Encontrar o container onde o PDF é renderizado
      const pdfContainer = document.querySelector('.preview-container');
      
      if (pdfContainer) {
        // Criar um container para as áreas de assinatura
        let signaturesContainer = document.getElementById('signatures-container');
        if (!signaturesContainer) {
          signaturesContainer = document.createElement('div');
          signaturesContainer.id = 'signatures-container';
          signaturesContainer.style.position = 'absolute';
          signaturesContainer.style.top = '0';
          signaturesContainer.style.left = '0';
          signaturesContainer.style.width = '100%';
          signaturesContainer.style.height = '100%';
          signaturesContainer.style.pointerEvents = 'none';
          
          // As áreas de assinatura precisam ter pointer-events habilitado
          signaturesContainer.style.zIndex = '10';
          
          pdfContainer.appendChild(signaturesContainer);
        }
        
        // Renderizar as áreas de assinatura para a página atual
        renderSignatureAreas(1); // Começar com a página 1
        
        // Adicionar botão para salvar o documento assinado
        addSignatureControls(pdfContainer);
      }
    } else {
      showNotification(result.message, 'info');
    }
  } catch (error) {
    console.error('Erro ao inicializar sistema de assinatura:', error);
    showNotification('Erro ao inicializar sistema de assinatura', 'error');
  }
}

// Adicionar controles de assinatura à interface
function addSignatureControls(container) {
  // Verificar se os controles já existem
  if (document.getElementById('signature-controls')) return;
  
  const controls = document.createElement('div');
  controls.id = 'signature-controls';
  controls.className = 'signature-controls';
  controls.innerHTML = `
    <button id="saveSignedDocumentBtn" class="action-btn primary" disabled>
      <i class="fa fa-save"></i> Salvar Documento Assinado
    </button>
  `;
  
  // Adicionar ao container apropriado
  const previewControls = document.querySelector('.preview-controls');
  if (previewControls) {
    previewControls.appendChild(controls);
  } else {
    container.appendChild(controls);
  }
  
  // Adicionar evento ao botão
  document.getElementById('saveSignedDocumentBtn').addEventListener('click', saveSignedDocument);
}

// Injetar o CSS necessário para o sistema de assinatura
function injectSignatureStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .signature-area {
      border: 2px dashed #3b82f6;
      background-color: rgba(59, 130, 246, 0.1);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      transition: all 0.2s ease;
    }
    
    .signature-area:hover {
      background-color: rgba(59, 130, 246, 0.2);
      border-color: #2563eb;
    }
    
    .signature-area.signed {
      border: 2px solid #22c55e;
      background-color: rgba(34, 197, 94, 0.1);
    }
    
    .signature-prompt {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #3b82f6;
      font-size: 0.875rem;
    }
    
    .signature-prompt i {
      font-size: 1.25rem;
      margin-bottom: 0.25rem;
    }
    
    .signature-controls {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }
    
    #signatureModal {
      z-index: 2000;
    }
    
    .signature-modal-content {
      max-width: 600px;
      width: 90%;
    }
    
    #signatureCanvas {
      width: 100%;
      height: 200px;
      border: 1px solid var(--border-color);
      background-color: white;
      margin-bottom: 1rem;
    }
    
    .signature-actions {
      display: flex;
      justify-content: space-between;
      margin-top: 1rem;
    }
  `;
  
  document.head.appendChild(styleElement);
}

// Injetar o HTML necessário para o sistema de assinatura
function injectSignatureHTML() {
  const signatureModal = document.createElement('div');
  signatureModal.id = 'signatureModal';
  signatureModal.className = 'modal';
  signatureModal.innerHTML = `
    <div class="modal-content signature-modal-content">
      <h3>Assinatura Digital</h3>
      <p>Desenhe sua assinatura no campo abaixo:</p>
      
      <canvas id="signatureCanvas" width="600" height="200"></canvas>
      
      <div class="signature-actions">
        <button type="button" class="action-btn" onclick="clearSignatureCanvas()">
          <i class="fa fa-eraser"></i> Limpar
        </button>
        <button type="button" class="action-btn" onclick="loadSavedSignature()">
          <i class="fa fa-upload"></i> Carregar Assinatura
        </button>
        <button type="button" class="action-btn primary" onclick="applySignature()">
          <i class="fa fa-check"></i> Aplicar Assinatura
        </button>
      </div>
      
      <input type="hidden" id="signatureCurrentPage" value="1">
      <input type="hidden" id="signatureCurrentIndex" value="0">
    </div>
  `;
  
  document.body.appendChild(signatureModal);
}