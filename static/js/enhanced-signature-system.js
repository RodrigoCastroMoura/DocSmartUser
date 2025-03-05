
/**
 * Sistema de Detecção e Assinatura de Documentos
 * 
 * Este código adiciona funcionalidade para:
 * 1. Detectar áreas para assinatura em documentos PDF
 * 2. Permitir que usuários assinem digitalmente documentos
 * 3. Salvar o documento com a assinatura
 */

// Configurações globais
let pdfDoc = null;
let signatureAreas = [];
let currentUser = null;
let userSignature = null;
let currentScale = 1.0;
let currentSignatureArea = null;
let signedAreas = [];
let documentUrl = null;

// Processar o documento para encontrar áreas de assinatura
async function processDocumentForSignature(url) {
  try {
    console.log("Processando documento para assinaturas:", url);
    documentUrl = url;
    
    // Obter informações do usuário da sessão ou use um padrão para testes
    const userInfo = {
      name: document.getElementById('name-user')?.value || 'Usuário',
      id: document.getElementById('user_id')?.value || '1'
    };
    
    // Obter o document_id da URL se possível
    let documentId = null;
    if (url) {
      const urlParts = url.split('/');
      documentId = urlParts[urlParts.length - 1];
    }
    
    // Chamar a API para encontrar áreas de assinatura
    const response = await fetch('/api/document/find-signature-areas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        document_url: url,
        user_info: userInfo,
        document_id: documentId
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao processar documento');
    }
    
    const data = await response.json();
    console.log("Áreas de assinatura encontradas:", data);
    
    if (data.success) {
      signatureAreas = data.signature_areas || [];
      
      // Renderizar as áreas de assinatura no documento
      renderSignatureAreasOnDocument(signatureAreas);
      
      return {
        success: true,
        message: data.message,
        totalSignatureAreas: signatureAreas.length
      };
    } else {
      return {
        success: false,
        message: data.error || 'Não foi possível encontrar áreas para assinatura'
      };
    }
  } catch (error) {
    console.error("Erro ao processar documento:", error);
    return {
      success: false,
      message: error.message || 'Erro ao processar documento para assinatura'
    };
  }
}

// Renderizar as áreas de assinatura no documento
function renderSignatureAreasOnDocument(areas) {
  if (!areas || areas.length === 0) return;
  
  console.log("Renderizando áreas de assinatura:", areas);
  
  // Encontrar o container de assinaturas ou criar um novo
  let signaturesContainer = document.getElementById('signatures-container');
  if (!signaturesContainer) {
    const pdfContainer = document.querySelector('.preview-container');
    if (!pdfContainer) {
      console.error('Container do PDF não encontrado');
      return;
    }
    
    signaturesContainer = document.createElement('div');
    signaturesContainer.id = 'signatures-container';
    signaturesContainer.style.position = 'absolute';
    signaturesContainer.style.top = '0';
    signaturesContainer.style.left = '0';
    signaturesContainer.style.width = '100%';
    signaturesContainer.style.height = '100%';
    signaturesContainer.style.pointerEvents = 'none';
    signaturesContainer.style.zIndex = '10';
    
    pdfContainer.appendChild(signaturesContainer);
  }
  
  // Limpar áreas existentes
  signaturesContainer.innerHTML = '';
  
  // Adicionar cada área de assinatura
  areas.forEach((area, index) => {
    const signatureArea = document.createElement('div');
    signatureArea.className = 'signature-area';
    signatureArea.style.position = 'absolute';
    signatureArea.style.left = `${area.x}px`;
    signatureArea.style.top = `${area.y}px`;
    signatureArea.style.width = `${area.width}px`;
    signatureArea.style.height = `${area.height}px`;
    signatureArea.style.pointerEvents = 'auto';
    signatureArea.dataset.index = index;
    signatureArea.dataset.pageNum = area.page_num;
    
    const signaturePrompt = document.createElement('div');
    signaturePrompt.className = 'signature-prompt';
    signaturePrompt.innerHTML = '<i class="fas fa-pen-fancy"></i><span>Assinar aqui</span>';
    
    signatureArea.appendChild(signaturePrompt);
    
    // Adicionar evento de clique para assinar
    signatureArea.addEventListener('click', () => {
      openSignatureModal(area, index);
    });
    
    signaturesContainer.appendChild(signatureArea);
  });
}

// Abrir o modal para assinatura
function openSignatureModal(area, index) {
  currentSignatureArea = { area, index };
  
  // Mostrar o modal
  const modal = document.getElementById('signatureModal');
  if (!modal) {
    console.error('Modal de assinatura não encontrado');
    return;
  }
  
  // Exibir o modal
  modal.style.display = 'flex';
  
  // Inicializar o canvas para assinatura
  initSignatureCanvas();
}

// Inicializar o canvas para desenho da assinatura
function initSignatureCanvas() {
  const canvas = document.getElementById('signatureCanvas');
  if (!canvas) {
    console.error('Canvas de assinatura não encontrado');
    return;
  }
  
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  
  // Configurar o contexto para desenho
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'black';
  
  function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    
    if (e.type === 'touchstart') {
      lastX = e.touches[0].clientX - rect.left;
      lastY = e.touches[0].clientY - rect.top;
    } else {
      lastX = e.clientX - rect.left;
      lastY = e.clientY - rect.top;
    }
  }
  
  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    let currentX, currentY;
    
    if (e.type === 'touchmove') {
      currentX = e.touches[0].clientX - rect.left;
      currentY = e.touches[0].clientY - rect.top;
    } else {
      currentX = e.clientX - rect.left;
      currentY = e.clientY - rect.top;
    }
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    
    lastX = currentX;
    lastY = currentY;
  }
  
  function stopDrawing() {
    isDrawing = false;
  }
  
  // Eventos de mouse
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);
  
  // Suporte para touch
  canvas.addEventListener('touchstart', startDrawing);
  canvas.addEventListener('touchmove', draw);
  canvas.addEventListener('touchend', stopDrawing);
}

// Limpar o canvas de assinatura
function clearSignatureCanvas() {
  const canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Carregar assinatura salva (se disponível)
function loadSavedSignature() {
  // Aqui você poderia carregar uma assinatura previamente salva
  // Por enquanto, apenas exibimos uma mensagem
  showNotification('Função de carregar assinatura será implementada em breve', 'info');
}

// Aplicar a assinatura no documento
async function applySignature() {
  if (!currentSignatureArea) {
    showNotification('Nenhuma área de assinatura selecionada', 'error');
    return;
  }
  
  try {
    // Obter a imagem da assinatura do canvas
    const canvas = document.getElementById('signatureCanvas');
    if (!canvas) {
      throw new Error('Canvas de assinatura não encontrado');
    }
    
    // Verificar se o canvas tem conteúdo (assinatura)
    const ctx = canvas.getContext('2d');
    const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const hasSignature = Array.from(pixelData).some((pixel, index) => {
      // Verificar pixels que não são brancos (255,255,255)
      return index % 4 !== 3 && pixel !== 255;
    });
    
    if (!hasSignature) {
      showNotification('Por favor, desenhe sua assinatura antes de aplicar', 'warning');
      return;
    }
    
    const signatureImageBase64 = canvas.toDataURL('image/png');
    
    // Obter o document_id da URL se possível
    let documentId = null;
    if (documentUrl) {
      const urlParts = documentUrl.split('/');
      documentId = urlParts[urlParts.length - 1];
    }
    
    if (!documentId) {
      showNotification('ID do documento não encontrado', 'error');
      return;
    }
    
    // Preparar os dados da assinatura
    const signatureData = {
      ...currentSignatureArea.area,
      signature_image: signatureImageBase64
    };
    
    // Adicionar à lista de assinaturas aplicadas
    signedAreas.push(currentSignatureArea.index);
    
    // Atualizar a aparência da área de assinatura
    updateSignedArea(currentSignatureArea.index);
    
    // Enviar a assinatura para a API
    const response = await fetch('/api/document/apply-signatures', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        document_id: documentId,
        signatures: [signatureData],
        user_id: document.getElementById('user_id')?.value || '1'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao aplicar assinatura');
    }
    
    const data = await response.json();
    
    // Fechar o modal
    document.getElementById('signatureModal').style.display = 'none';
    
    // Exibir mensagem de sucesso
    showNotification(data.message || 'Assinatura aplicada com sucesso', 'success');
    
  } catch (error) {
    console.error('Erro ao aplicar assinatura:', error);
    showNotification(error.message || 'Erro ao aplicar assinatura', 'error');
  }
}

// Atualizar a aparência da área após assinada
function updateSignedArea(index) {
  const area = document.querySelector(`.signature-area[data-index="${index}"]`);
  if (!area) return;
  
  area.classList.add('signed');
  
  const prompt = area.querySelector('.signature-prompt');
  if (prompt) {
    prompt.innerHTML = '<i class="fas fa-check"></i><span>Assinado</span>';
  }
  
  // Desabilitar clique na área já assinada
  area.style.pointerEvents = 'none';
}

// Download do documento assinado
function downloadSignedDocument(signedDocumentUrl) {
  if (!signedDocumentUrl) {
    showNotification('URL do documento assinado não disponível', 'error');
    return;
  }
  
  // Criar link temporário para download
  const a = document.createElement('a');
  a.href = signedDocumentUrl;
  a.download = 'documento_assinado.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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
  signatureModal.style.display = 'none';
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
      
      <div class="modal-actions">
        <button type="button" class="action-btn" onclick="document.getElementById('signatureModal').style.display='none'">
          Cancelar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(signatureModal);
}

// Inicializar o sistema de assinatura quando um documento é aberto
async function initSignatureSystem(documentUrl) {
  try {
    console.log("Inicializando sistema de assinatura para:", documentUrl);
    
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

// Inicializar o sistema quando o documento for carregado
document.addEventListener('DOMContentLoaded', function() {
  // Injetar o CSS necessário
  injectSignatureStyles();

  // Adicionar os elementos HTML necessários
  injectSignatureHTML();

  // Verificar quando um documento é visualizado
  const previewButtons = document.querySelectorAll('.document-actions .action-btn');
  
  previewButtons.forEach(button => {
    if (button.innerHTML.includes('eye')) {
      const originalOnclick = button.onclick;
      button.onclick = async function(e) {
        // Chamar o comportamento original primeiro
        if (originalOnclick) originalOnclick.call(this, e);

        // Depois, inicializar nosso sistema de assinatura
        setTimeout(async () => {
          // Obter a URL do documento
          const previewModalFrame = document.querySelector('#documentPreview');

          if (previewModalFrame && previewModalFrame.src) {
            await initSignatureSystem(previewModalFrame.src);
          } else {
            console.log('Elemento de preview não encontrado ou sem src');
          }
        }, 1000); // Pequeno delay para garantir que o modal seja aberto
      };
    }
  });
});

// Função helper para mostrar notificações
function showNotification(message, type = 'info') {
  if (typeof window.showNotification === 'function') {
    window.showNotification(message, type);
  } else {
    alert(message);
  }
}
