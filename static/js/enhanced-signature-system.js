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
let currentSignatureArea = null;
let signedAreas = [];
let currentDocumentUrl = '';

// Inicialização da biblioteca Tesseract para OCR (removido, pois o novo sistema usa API)
//const { createWorker } = Tesseract;
//let worker = null;

// Inicializar o trabalhador do Tesseract quando necessário (removido)
//async function initTesseract() { ... }

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

// Função para processar o documento PDF e encontrar áreas de assinatura (substituída)
async function processDocumentForSignature(documentUrl) {
  try {
    currentDocumentUrl = documentUrl;

    // Obter informações do usuário atual da sessão
    const userInfo = {
      name: document.querySelector('.user-info .name')?.textContent || 'Usuário',
      id: document.getElementById('userId')?.value || sessionStorage.getItem('user_id')
    };

    // Chamar a API para processar o documento
    const response = await fetch('/api/document/find-signature-areas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_url: documentUrl,
        user_info: userInfo
      })
    });

    if (!response.ok) {
      throw new Error('Falha ao processar o documento para assinatura');
    }

    const data = await response.json();

    if (data.success) {
      // Renderizar as áreas de assinatura no documento
      renderSignatureAreas(data.signature_areas);

      return {
        success: true,
        signatureAreas: data.signature_areas,
        totalSignatureAreas: data.total_areas,
        message: data.message
      };
    } else {
      return {
        success: false,
        message: data.error || 'Erro ao processar áreas de assinatura'
      };
    }
  } catch (error) {
    console.error('Erro ao processar documento:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Renderizar áreas de assinatura no documento (substituída)
function renderSignatureAreas(areas) {
  const signaturesContainer = document.getElementById('signatures-container');
  if (!signaturesContainer) return;

  // Limpar áreas existentes
  signaturesContainer.innerHTML = '';

  // Calcular o tamanho do container PDF
  const pdfContainer = document.querySelector('.preview-container');
  const viewerWidth = pdfContainer?.offsetWidth || 800;
  const viewerHeight = pdfContainer?.offsetHeight || 1000;

  // Renderizar cada área de assinatura
  areas.forEach((area, index) => {
    const signatureArea = document.createElement('div');
    signatureArea.className = 'signature-area';
    signatureArea.dataset.pageNum = area.page_num;
    signatureArea.dataset.areaIndex = index;
    signatureArea.dataset.isInitials = area.is_initials ? 'true' : 'false';

    // Posicionar a área de assinatura corretamente
    signatureArea.style.position = 'absolute';
    signatureArea.style.left = `${(area.x / viewerWidth) * 100}%`;
    signatureArea.style.top = `${(area.y / viewerHeight) * 100}%`;
    signatureArea.style.width = `${(area.width / viewerWidth) * 100}%`;
    signatureArea.style.height = `${(area.height / viewerHeight) * 100}%`;

    // Conteúdo da área de assinatura
    const signaturePrompt = document.createElement('div');
    signaturePrompt.className = 'signature-prompt';
    signaturePrompt.innerHTML = area.is_initials ? 
      '<i class="fas fa-signature"></i><span>Rubrica</span>' : 
      '<i class="fas fa-signature"></i><span>Assinar aqui</span>';

    signatureArea.appendChild(signaturePrompt);

    // Adicionar evento de clique para assinar
    signatureArea.addEventListener('click', () => {
      openSignatureModal(area, index);
    });

    signaturesContainer.appendChild(signatureArea);
  });
}

// Detectar áreas de assinatura em uma página do PDF (removido)
//async function findSignatureAreas(page, pageNum, user) { ... }

// Buscar por padrões de texto que indiquem áreas de assinatura (removido)
//async function findSignatureAreasByText(textContent, pageNum, user, viewport) { ... }

// Encontrar linhas que possam ser para assinatura (removido)
//function findSignatureLinesByText(textContent, pageNum, user, viewport) { ... }

// Usar OCR para detectar áreas de assinatura (removido)
//async function findSignatureAreasByOCR(canvas, pageNum, user, viewport) { ... }

// Detectar linhas horizontais na imagem que possam ser para assinatura (removido)
//async function detectHorizontalLines(canvas) { ... }


// Abrir modal de assinatura (modificado)
function openSignatureModal(area, index) {
  currentSignatureArea = { area, index };

  // Inicializar o canvas de assinatura
  const canvas = document.getElementById('signatureCanvas');
  const signatureModal = document.getElementById('signatureModal');

  if (canvas && signatureModal) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Inicializar o canvas para desenho
    initSignatureCanvas();

    // Mostrar o modal
    signatureModal.style.display = 'block';
  } else {
    console.error('Elementos do modal de assinatura não encontrados');
  }
}

// Inicializar o canvas para captura de assinatura (modificado)
function initSignatureCanvas() {
  const canvas = document.getElementById('signatureCanvas');
  const ctx = canvas.getContext('2d');
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;

  // Configurar estilos
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000';

  // Funções de desenho
  function startDrawing(e) {
    isDrawing = true;
    const pos = getPosition(e);
    lastX = pos.x;
    lastY = pos.y;
  }

  function draw(e) {
    if (!isDrawing) return;
    const pos = getPosition(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastX = pos.x;
    lastY = pos.y;
  }

  function stopDrawing() {
    isDrawing = false;
  }

  function getPosition(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches && e.touches[0]) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
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

// Renderizar as áreas de assinatura no documento (removido, substituído pela nova função)
//function renderSignatureAreas(pageNum) { ... }

// Abrir o modal para assinatura (modificado)
//function openSignatureModal(pageNum, areaIndex) { ... }

// Aplicar a assinatura ao documento (modificado)
function applySignature() {
  if (!currentSignatureArea) return;

  const canvas = document.getElementById('signatureCanvas');
  const signatureImage = canvas.toDataURL('image/png');

  // Opcional: salvar assinatura para uso futuro
  localStorage.setItem('userSignature', signatureImage);

  // Atualizar área de assinatura visual
  const signatureElement = document.querySelector(`.signature-area[data-area-index="${currentSignatureArea.index}"]`);
  if (signatureElement) {
    signatureElement.innerHTML = '';
    signatureElement.classList.add('signed');

    const img = document.createElement('img');
    img.src = signatureImage;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';

    signatureElement.appendChild(img);

    // Adicionar à lista de áreas assinadas
    signedAreas.push({
      page_num: currentSignatureArea.area.page_num,
      x: currentSignatureArea.area.x,
      y: currentSignatureArea.area.y,
      width: currentSignatureArea.area.width,
      height: currentSignatureArea.area.height,
      signature_image: signatureImage
    });

    // Ativar botão para salvar documento assinado
    const saveButton = document.getElementById('saveSignedDocumentBtn');
    if (saveButton) {
      saveButton.disabled = false;
    } else {
      // Criar botão se não existir
      addSaveSignedDocumentButton();
    }
  }

  // Fechar o modal
  const signatureModal = document.getElementById('signatureModal');
  if (signatureModal) {
    signatureModal.style.display = 'none';
  }

  currentSignatureArea = null;
  showNotification('Assinatura aplicada com sucesso!', 'success');
}

// Limpar o canvas de assinatura (modificado)
function clearSignatureCanvas() {
  const canvas = document.getElementById('signatureCanvas');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Carregar uma assinatura existente (mantido)
function loadSavedSignature() {
  const savedSignature = localStorage.getItem('userSignature');
  if (savedSignature) {
    const canvas = document.getElementById('signatureCanvas');
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.onload = function() {
      ctx.drawImage(img, 0, 0);
    };
    img.src = savedSignature;
  } else {
    showNotification('Nenhuma assinatura salva encontrada', 'info');
  }
}

// Adicionar botão para salvar documento assinado
function addSaveSignedDocumentButton() {
  const actionsContainer = document.querySelector('.document-actions');
  if (!actionsContainer) return;

  // Verificar se o botão já existe
  if (document.getElementById('saveSignedDocumentBtn')) return;

  const saveButton = document.createElement('button');
  saveButton.id = 'saveSignedDocumentBtn';
  saveButton.className = 'action-btn primary';
  saveButton.innerHTML = '<i class="fas fa-save"></i> Salvar Documento Assinado';
  saveButton.onclick = saveSignedDocument;

  actionsContainer.appendChild(saveButton);
}


// Salvar o documento com as assinaturas (novo)
async function saveSignedDocument() {
  try {
    if (signedAreas.length === 0) {
      showNotification('Nenhuma assinatura aplicada ao documento', 'error');
      return;
    }

    // Extrair ID do documento da URL
    const documentId = currentDocumentUrl.split('/').pop();

    // Enviar assinaturas para o servidor
    const response = await fetch('/api/document/apply-signatures', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_id: documentId,
        signatures: signedAreas
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Falha ao salvar documento assinado');
    }

    const result = await response.json();

    if (result.success) {
      showNotification(result.message, 'success');
      // Opcional: redirecionar ou mostrar link para documento assinado
      if (result.signed_document_url) {
        // Criar link para download do documento assinado
        const documentActionsContainer = document.querySelector('.document-actions');

        const downloadLink = document.createElement('a');
        downloadLink.href = result.signed_document_url;
        downloadLink.className = 'action-btn success';
        downloadLink.innerHTML = '<i class="fas fa-download"></i> Download Documento Assinado';
        downloadLink.download = 'documento_assinado.pdf';

        documentActionsContainer.appendChild(downloadLink);
      }
    } else {
      throw new Error(result.message || 'Operação não concluída');
    }
  } catch (error) {
    console.error('Erro ao salvar documento assinado:', error);
    showNotification(error.message, 'error');
  }
}

// Exibir uma notificação ao usuário (mantido)
function showNotification(message, type) {
  if (typeof window.showNotification === 'function') {
    window.showNotification(message, type);
  } else {
    alert(message);
  }
}

// Remover acentos de strings (mantido)
function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Inicializar o sistema quando o documento for carregado (modificado)
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

// Inicializar o sistema de assinatura quando um documento é aberto (modificado)
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
      } else {
        console.error('Container PDF não encontrado');
      }
    } else {
      showNotification(result.message || 'Não foram encontradas áreas para assinatura', 'info');
    }
  } catch (error) {
    console.error('Erro ao inicializar sistema de assinatura:', error);
    showNotification('Erro ao inicializar sistema de assinatura: ' + error.message, 'error');
  }
}

// Adicionar controles de assinatura à interface (modificado)
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

// Injetar o CSS necessário para o sistema de assinatura (mantido)
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

// Injetar o HTML necessário para o sistema de assinatura (mantido)
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
          <i class="fas fa-eraser"></i> Limpar
        </button>
        <button type="button" class="action-btn" onclick="loadSavedSignature()">
          <i class="fas fa-upload"></i> Carregar Assinatura
        </button>
        <button type="button" class="action-btn primary" onclick="applySignature()">
          <i class="fas fa-check"></i> Aplicar Assinatura
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(signatureModal);
}