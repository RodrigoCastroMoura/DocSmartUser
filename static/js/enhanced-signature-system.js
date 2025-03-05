/**
 * Sistema de Detecção e Assinatura de Documentos
 * 
 * Este código adiciona funcionalidade para:
 * 1. Detectar áreas para assinatura em documentos PDF usando OCR
 * 2. Permitir que usuários assinem digitalmente documentos
 * 3. Adicionar rubricas em páginas sem assinaturas
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
let documentUrl = null;

// OCR para detecção de áreas de assinatura
async function detectSignatureAreasByOCR(pdfUrl, searchNames = ['Contratante', 'Responsável']) {
  try {
      console.log("Iniciando OCR para detectar assinaturas para:", searchNames);
      
      // Carregar o PDF usando pdf.js
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      
      // Áreas detectadas
      const detectedAreas = [];
      
      // Escala para ajustar ao zoom de 160%
      const zoomScale = 1.6;
      
      // Processar cada página
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          // Obter todos os textos da página
          const textItems = textContent.items;
          
          // PRIMEIRA ESTRATÉGIA: Buscar pelo nome exato passado pelo usuário
          for (const searchName of searchNames) {
              const searchNameLower = searchName.toLowerCase();
              
              for (let i = 0; i < textItems.length; i++) {
                  const item = textItems[i];
                  const text = item.str.toLowerCase();
                  
                  // Verificar se o texto contém o nome buscado
                  if (text.includes(searchNameLower)) {
                      
                      console.log(`Encontrado nome "${searchName}" na página ${pageNum}: "${item.str}"`);
                      
                      // Coordenadas do nome encontrado
                      const nameX = item.transform[4];
                      const nameY = item.transform[5];
                      
                      const rightText = item.str;

                      if (rightText.includes("_") || rightText.includes("-") || 
                          rightText.match(/^\s+$/) || rightText.length > 10) {
                          
                          foundSpaceToRight = true;
                          console.log(`Encontrado espaço para assinatura à direita de "${searchName}"`);
                          
                          detectedAreas.push({
                              x: rightItem.transform[4] * zoomScale,
                              y: rightItem.transform[5] * zoomScale - 30, // Ligeiramente acima da linha
                              width: 300,
                              height: 50,
                              page_num: pageNum,
                              signature_text: `Assinatura do ${searchName}`,
                              searchName: searchName,
                              detection: "à direita do nome"
                          });
                          
                          break;
                      }
                      
                      // 2. Se não encontrou à direita, procurar ACIMA do nome
                      if (!foundSpaceToRight) {
                          let foundSpaceAbove = false;
                          const aboveThreshold = nameY + 50; // Considerar até 50 pontos acima
                          
                          for (let j = 0; j < textItems.length; j++) {
                              const aboveItem = textItems[j];
                              // Se está aproximadamente na mesma coluna e acima
                              if (Math.abs(aboveItem.transform[4] - nameX) < 100 && 
                                  aboveItem.transform[5] > nameY && 
                                  aboveItem.transform[5] < aboveThreshold) {
                                  
                                  // Se encontrou um texto que parece ser uma linha de assinatura
                                  const aboveText = aboveItem.str;
                                  if (aboveText.includes("_") || aboveText.includes("-") || 
                                      aboveText.match(/^\s+$/) || aboveText.length > 10) {
                                      
                                      foundSpaceAbove = true;
                                      console.log(`Encontrado espaço para assinatura acima de "${searchName}"`);
                                      
                                      detectedAreas.push({
                                          x: aboveItem.transform[4] * zoomScale,
                                          y: aboveItem.transform[5] * zoomScale - 30, // Ligeiramente acima da linha
                                          width: 300,
                                          height: 50,
                                          page_num: pageNum,
                                          signature_text: `Assinatura do ${searchName}`,
                                          searchName: searchName,
                                          detection: "acima do nome"
                                      });
                                      
                                      break;
                                  }
                              }
                          }
                          
                          // 3. Se não encontrou nem à direita nem acima, criar área próxima ao nome
                          if (!foundSpaceAbove) {
                              console.log(`Não encontrado espaço específico, criando área próxima ao nome "${searchName}"`);
                              
                              detectedAreas.push({
                                  x: (nameX + 50) * zoomScale, // Um pouco à direita do nome
                                  y: nameY * zoomScale - 40, // Um pouco acima do nome
                                  width: 300,
                                  height: 50,
                                  page_num: pageNum,
                                  signature_text: `Assinatura do ${searchName}`,
                                  searchName: searchName,
                                  detection: "próximo ao nome"
                              });
                          }
                      }
                  }
              }
          }
      }
      
      // QUARTA ESTRATÉGIA: Verificar se existe botão "Assinar" no documento
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const items = textContent.items;
          
          for (let i = 0; i < items.length; i++) {
              const item = items[i];
              const text = item.str.toLowerCase();
              
              if (text === "assinar" || text === "assinatura" || text === "assine aqui") {
                  console.log(`Encontrado botão "Assinar" na página ${pageNum}`);
                  
                  // Para cada nome, criar uma área próxima ao botão
                  for (const searchName of searchNames) {
                      // Verificar se já existe uma área para este nome nesta página
                      const existingArea = detectedAreas.find(area => 
                          area.page_num === pageNum && 
                          area.searchName === searchName
                      );
                      
                      if (!existingArea) {
                          detectedAreas.push({
                              x: (item.transform[4] - 100) * zoomScale, // Posicionar à esquerda do botão
                              y: item.transform[5] * zoomScale - 30,     // Um pouco acima
                              width: 300,
                              height: 50,
                              page_num: pageNum,
                              signature_text: `Assinatura do ${searchName}`,
                              searchName: searchName,
                              detection: "próximo ao botão assinar"
                          });
                      }
                  }
              }
          }
      }
      
      // Se nenhuma área foi encontrada, usar coordenadas específicas para o documento mostrado
      if (detectedAreas.length === 0) {
          console.log("Nenhuma área de assinatura detectada. Usando coordenadas específicas para o zoom de 160%");
          
          for (const searchName of searchNames) {
              if (searchName.toLowerCase().includes('contratante')) {
                  detectedAreas.push({
                      x: 850,  // Ajustado para zoom de 160%
                      y: 350,  // Ajustado para zoom de 160% 
                      width: 300,
                      height: 50,
                      page_num: 1,
                      signature_text: `Assinatura do Contratante`,
                      searchName: 'Contratante',
                      detection: "coordenadas padrão"
                  });
              } else if (searchName.toLowerCase().includes('responsável')) {
                  detectedAreas.push({
                      x: 850,  // Ajustado para zoom de 160%
                      y: 750,  // Ajustado para zoom de 160%
                      width: 300,
                      height: 50,
                      page_num: 1,
                      signature_text: `Assinatura do Responsável`,
                      searchName: 'Responsável',
                      detection: "coordenadas padrão"
                  });
              } else {
                  // Para outros nomes não específicos
                  detectedAreas.push({
                      x: 850,  // Ajustado para zoom de 160%
                      y: 350,  // Ajustado para zoom de 160%
                      width: 300,
                      height: 50,
                      page_num: 1,
                      signature_text: `Assinatura do ${searchName}`,
                      searchName: searchName,
                      detection: "coordenadas padrão genérico"
                  });
              }
          }
      }
      
      console.log(`OCR concluído. Encontradas ${detectedAreas.length} possíveis áreas de assinatura.`);
      return detectedAreas;
  } catch (error) {
      console.error("Erro ao executar OCR para detectar assinaturas:", error);
      return [];
  }
}

// Adicionar áreas para rubrica nas páginas sem assinatura
async function addRubricAreasToPages(pdfUrl, existingSignatureAreas) {
    try {
        console.log("Adicionando áreas para rubrica nas páginas sem assinatura...");
        
        // Carregar o PDF usando pdf.js
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        
        const totalPages = pdf.numPages;
        console.log(`Total de páginas no documento: ${totalPages}`);
        
        // Identificar quais páginas já têm áreas de assinatura
        const pagesWithSignatures = new Set();
        existingSignatureAreas.forEach(area => {
            pagesWithSignatures.add(area.page_num);
        });
        
        console.log(`Páginas com assinaturas: ${Array.from(pagesWithSignatures).join(', ')}`);
        
        // Áreas para rubrica
        const rubricAreas = [];
        
        // Para cada página sem assinatura, adicionar uma área de rubrica
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            if (!pagesWithSignatures.has(pageNum)) {
                console.log(`Adicionando rubrica para página ${pageNum}`);
                
                rubricAreas.push({
                    x: 50, // No canto superior direito
                    y: 50,
                    width: 100,
                    height: 40,
                    page_num: pageNum,
                    signature_text: "Rubricar página",
                    is_rubric: true  // Marcador para identificar que é uma rubrica
                });
            }
        }
        
        console.log(`Adicionadas ${rubricAreas.length} áreas para rubrica.`);
        return rubricAreas;
    } catch (error) {
        console.error("Erro ao adicionar áreas para rubrica:", error);
        return [];
    }
}

async function processDocumentForSignature(url, searchTerms) {
    try {
        console.log("Processando documento para assinaturas:", url);
        documentUrl = url;
        
        // Verificar se temos uma URL válida
        if (!url) {
            console.error("URL do documento não fornecida");
            return {
                success: false,
                message: 'URL do documento não fornecida'
            };
        }
        
        // Garantir que searchTerms é um array
        if (!searchTerms) {
            searchTerms = ['assinatura', 'contratante', 'responsável'];
        } else if (typeof searchTerms === 'string') {
            searchTerms = searchTerms.split(',').map(term => term.trim());
        }
        
        console.log("Termos de busca para assinaturas:", searchTerms);
        
        // Detectar áreas de assinatura usando OCR
        const detectedAreas = await detectSignatureAreasByOCR(url, searchTerms);
        
        if (detectedAreas.length > 0) {
            signatureAreas = detectedAreas;
            return {
                success: true,
                message: `Áreas de assinatura detectadas por OCR`,
                totalSignatureAreas: signatureAreas.length
            };
        }
        
        // Se não encontramos nada específico, usar posições genéricas
        console.log("OCR não encontrou áreas específicas. Usando posições genéricas.");
        
        const genericAreas = [
            { 
                x: 97, 
                y: 535, 
                width: 224, 
                height: 40, 
                page_num: 1,
                signature_text: "Área de Assinatura 1" 
            },
            { 
                x: 97, 
                y: 680, 
                width: 224, 
                height: 40, 
                page_num: 1,
                signature_text: "Área de Assinatura 2" 
            }
        ];
        
        signatureAreas = genericAreas;
        
        return {
            success: true,
            message: "Não foram encontradas áreas específicas. Usando posições genéricas para demonstração.",
            totalSignatureAreas: signatureAreas.length
        };
        
    } catch (error) {
        console.error("Erro ao processar documento:", error);
        return {
            success: false,
            message: error.message || 'Erro ao processar documento para assinatura'
        };
    }
}

// No arquivo: static/js/enhanced-signature-system.js
// Ajuste a função renderSignatureAreasOnDocument para considerar o zoom atual
function renderSignatureAreasOnDocument(areas) {
  if (!areas || areas.length === 0) {
      console.log("Nenhuma área de assinatura para renderizar");
      return;
  }
  
  console.log("Renderizando áreas de assinatura:", areas);
  
  // Remover áreas existentes primeiro
  const existingAreas = document.querySelectorAll('.signature-area');
  existingAreas.forEach(area => area.remove());
  
  // Agrupar áreas por número de página
  const areasByPage = {};
  areas.forEach(area => {
      const pageNum = area.page_num || 1;
      if (!areasByPage[pageNum]) {
          areasByPage[pageNum] = [];
      }
      areasByPage[pageNum].push(area);
  });
  
  // Para cada página do PDF, adicionar suas áreas de assinatura
  Object.keys(areasByPage).forEach(pageNum => {
      // Encontrar o elemento da página do PDF
      const pageElement = document.querySelector(`.pdf-page-wrapper[data-page-number="${pageNum}"]`);
      if (!pageElement) {
          console.error(`Elemento da página ${pageNum} não encontrado`);
          return;
      }
      
      // Criar ou obter o container de assinaturas para esta página
      let pageSignaturesContainer = pageElement.querySelector('.page-signatures-container');
      if (!pageSignaturesContainer) {
          pageSignaturesContainer = document.createElement('div');
          pageSignaturesContainer.className = 'page-signatures-container';
          pageSignaturesContainer.style.position = 'absolute';
          pageSignaturesContainer.style.top = '0';
          pageSignaturesContainer.style.left = '0';
          pageSignaturesContainer.style.width = '100%';
          pageSignaturesContainer.style.height = '100%';
          pageSignaturesContainer.style.pointerEvents = 'none';
          pageSignaturesContainer.style.zIndex = '10';
          pageElement.appendChild(pageSignaturesContainer);
      } else {
          pageSignaturesContainer.innerHTML = ''; // Limpar assinaturas existentes
      }
      
      // Adicionar cada área de assinatura para esta página
      areasByPage[pageNum].forEach((area, index) => {
          // Mapear coordenadas do PDF para o canvas
          const mappedCoords = mapPdfToCanvasCoordinates(area, pageElement, currentScale || 1.6);
          
          const signatureArea = document.createElement('div');
          signatureArea.className = 'signature-area';
          
          // Usar o estilo DocuSign
          signatureArea.classList.add('docusign-style');
          
          // Posicionamento relativo à página com coordenadas mapeadas
          signatureArea.style.position = 'absolute';
          signatureArea.style.left = `${mappedCoords.x}px`;
          signatureArea.style.top = `${mappedCoords.y}px`;
          signatureArea.style.width = `${mappedCoords.width}px`;
          signatureArea.style.height = `${mappedCoords.height}px`;
          signatureArea.style.pointerEvents = 'auto';
          signatureArea.dataset.index = areas.indexOf(area); // Índice global
          signatureArea.dataset.pageNum = pageNum;
          signatureArea.dataset.searchName = area.searchName || '';
          
          // Adicionar informação de debug para facilitar ajustes
          if (area.detection) {
              signatureArea.dataset.detection = area.detection;
              console.log(`Área ${index} detectada por: ${area.detection}`);
          }
          
          // Conteúdo da área de assinatura - estilo DocuSign
          const signaturePrompt = document.createElement('div');
          signaturePrompt.className = 'signature-prompt';
          signaturePrompt.innerHTML = '<i class="fas fa-pen"></i><span>Assinar</span>';
          
          signatureArea.appendChild(signaturePrompt);
          
          // Adicionar evento de clique para assinar
          signatureArea.addEventListener('click', () => {
              openSignatureModal(area, areas.indexOf(area));
          });
          
          pageSignaturesContainer.appendChild(signatureArea);
          
          console.log(`Área de assinatura ${index} para "${area.searchName}" renderizada na página ${pageNum} em x:${mappedCoords.x}, y:${mappedCoords.y} (original: x:${area.x}, y:${area.y})`);
      });
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
    
    // Atualizar título do modal
    const modalTitle = modal.querySelector('h3');
    if (modalTitle) {
        if (area.is_rubric) {
            modalTitle.textContent = 'Rubricar Página';
        } else {
            modalTitle.textContent = 'Assinatura Digital';
        }
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
      if (area.dataset.isRubric === 'true') {
          prompt.innerHTML = '<i class="fas fa-check-circle"></i><span>Rubricado</span>';
      } else {
          prompt.innerHTML = '<i class="fas fa-check-circle"></i><span>Assinado</span>';
      }
  }
  
  // Adicionar um estilo visual de assinado, semelhante ao DocuSign
  const signedOverlay = document.createElement('div');
  signedOverlay.className = 'signed-overlay';
  signedOverlay.style.position = 'absolute';
  signedOverlay.style.top = '0';
  signedOverlay.style.left = '0';
  signedOverlay.style.width = '100%';
  signedOverlay.style.height = '100%';
  signedOverlay.style.backgroundColor = 'rgba(34, 197, 94, 0.05)';
  signedOverlay.style.borderRadius = '3px';
  
  // Adicionar um ícone de verificação no canto
  const checkIcon = document.createElement('div');
  checkIcon.className = 'check-icon';
  checkIcon.innerHTML = '<i class="fas fa-check"></i>';
  checkIcon.style.position = 'absolute';
  checkIcon.style.top = '5px';
  checkIcon.style.left = '5px';
  checkIcon.style.color = '#22c55e';
  checkIcon.style.fontSize = '16px';
  
  area.appendChild(signedOverlay);
  area.appendChild(checkIcon);
  
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
// No arquivo: static/js/enhanced-signature-system.js
// Modifique a função injectSignatureStyles para melhorar a visibilidade das áreas de assinatura

function injectSignatureStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
      .pdf-page-wrapper {
          position: relative;
          margin-bottom: 20px;
      }
      
      .page-signatures-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 10;
      }
      
      .signature-area {
          border: 2px solid #0b57d0;
          background-color: rgba(224, 242, 254, 0.6);
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: auto;
          transition: all 0.2s ease;
          box-shadow: 0 0 8px rgba(11, 87, 208, 0.5);
      }

      .signature-area:hover {
          background-color: rgba(224, 242, 254, 0.8);
          box-shadow: 0 0 12px rgba(11, 87, 208, 0.7);
      }
      
      .signature-prompt {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0b57d0;
          font-size: 1rem;
          font-weight: bold;
          gap: 8px;
      }

      .signature-prompt i {
          font-size: 1.2rem;
      }
      
      .signature-area.signed {
          background-color: rgba(237, 247, 237, 0.5);
          border-color: #0f9d58;
          box-shadow: 0 0 8px rgba(15, 157, 88, 0.5);
      }
      
      .signature-area.signed .signature-prompt {
          color: #0f9d58;
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

// Sistema de notificação, caso a função global não esteja disponível
function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        alert(message);
    }
}

// Inicializar o sistema quando o documento for carregado
document.addEventListener('DOMContentLoaded', function() {
    // Injetar o CSS necessário
    injectSignatureStyles();

    // Adicionar os elementos HTML necessários
    injectSignatureHTML();
});

// No arquivo: static/js/enhanced-signature-system.js
// Modificar a função initSignatureSystem para melhor manipular os resultados da detecção
async function initSignatureSystem(documentUrl, searchNames) {
  try {
      console.log("Inicializando sistema de assinatura para:", documentUrl);
      
      if (!documentUrl) {
          console.error("URL do documento não fornecida");
          return;
      }
      
      if (!searchNames || searchNames.length === 0) {
          searchNames = ['Contratante']; // Default
      }
      
      console.log("Buscando assinaturas para:", searchNames);
      
      // Detectar áreas de assinatura usando OCR
      const detectedAreas = await detectSignatureAreasByOCR(documentUrl, searchNames);
      
      if (detectedAreas.length > 0) {
          signatureAreas = detectedAreas;
          console.log(`Encontradas ${detectedAreas.length} áreas de assinatura para ${searchNames.join(', ')}`);
          showNotification(`Encontrada(s) ${detectedAreas.length} área(s) para assinatura de ${searchNames.join(', ')}`, 'success');
          
          // Render after a short delay to ensure the PDF is fully rendered
          setTimeout(() => {
              renderSignatureAreasOnDocument(signatureAreas);
          }, 500);
      } else {
          console.log(`Nenhuma área de assinatura encontrada pelo OCR para ${searchNames.join(', ')}. Tentando análise específica...`);
          
          // Se OCR falhar, tentar método específico para este tipo de documento
          const specificAreas = await analyzeSpecificContractForSignatures(documentUrl, searchNames);
          
          if (specificAreas && specificAreas.length > 0) {
              signatureAreas = specificAreas;
              console.log(`Análise específica encontrou ${specificAreas.length} áreas para ${searchNames.join(', ')}`);
              showNotification(`Encontrada(s) ${specificAreas.length} área(s) para assinatura de ${searchNames.join(', ')}`, 'success');
              
              setTimeout(() => {
                  renderSignatureAreasOnDocument(signatureAreas);
              }, 500);
          } else {
              // Último recurso: usar posições padrão
              console.log(`Nenhum método de detecção funcionou. Usando posições padrão para ${searchNames.join(', ')}`);
              const defaultAreas = createDefaultSignatureAreas(searchNames);
              signatureAreas = defaultAreas;
              
              showNotification(`Usando posições padrão para assinatura de ${searchNames.join(', ')}`, 'info');
              
              setTimeout(() => {
                  renderSignatureAreasOnDocument(signatureAreas);
              }, 500);
          }
      }
  } catch (error) {
      console.error('Erro ao inicializar sistema de assinatura:', error);
      showNotification('Erro ao inicializar sistema de assinatura: ' + error.message, 'error');
  }
}

async function analyzeSpecificContractForSignatures(pdfUrl, searchNames) {
  try {
      console.log("Analisando documento específico para áreas de assinatura...");
      
      // Carregar o PDF usando pdf.js
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      
      const foundAreas = [];
      const zoomScale = 1.6; // Para ajustar ao zoom de 160%
      
      // Para cada página do PDF
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          console.log(`Analisando página ${pageNum}...`);
          const page = await pdf.getPage(pageNum);
          
          // 1. Procurar pelo botão "Assinar" - um indicador comum em documentos que precisam de assinatura
          const textContent = await page.getTextContent();
          const items = textContent.items;
          
          // Procurar por texto "Assinar" ou similar
          for (let i = 0; i < items.length; i++) {
              const item = items[i];
              const text = item.str.toLowerCase();
              
              if (text.includes("assinar") || text.includes("assinatura") || text === "assine aqui") {
                  console.log(`Encontrado texto de assinatura "${item.str}" na página ${pageNum}`);
                  
                  // Obter as coordenadas ajustadas para o zoom
                  const x = item.transform[4] * zoomScale;
                  const y = item.transform[5] * zoomScale;
                  
                  // Para cada nome de busca, criar uma área próxima ao botão "Assinar"
                  for (const searchName of searchNames) {
                      foundAreas.push({
                          x: x - 50, // Ajustar posição para ficar perto do botão
                          y: y - 10,
                          width: 300,
                          height: 50,
                          page_num: pageNum,
                          signature_text: `Assinatura do ${searchName}`,
                          searchName: searchName
                      });
                      
                      console.log(`Adicionada área de assinatura para ${searchName} perto de "${item.str}" em x:${x}, y:${y}`);
                  }
              }
          }
          
          // 2. Procurar por linhas longas (underscores) que geralmente indicam áreas de assinatura
          for (let i = 0; i < items.length; i++) {
              const item = items[i];
              const text = item.str;
              
              // Verificar se o texto parece uma linha para assinatura (muitos "_" ou "-")
              if ((text.includes("_") && text.length > 10) || 
                  (text.includes("-") && text.length > 10) ||
                  (text.match(/^\s+$/) && item.width > 100)) {
                  
                  console.log(`Encontrada possível linha de assinatura na página ${pageNum}`);
                  
                  const x = item.transform[4] * zoomScale;
                  const y = item.transform[5] * zoomScale;
                  
                  // Verificar se já existe uma área próxima a esta
                  const existingArea = foundAreas.find(area => 
                      area.page_num === pageNum && 
                      Math.abs(area.x - x) < 100 && 
                      Math.abs(area.y - y) < 100
                  );
                  
                  if (!existingArea) {
                      // Para cada nome de busca, criar uma área na linha
                      for (const searchName of searchNames) {
                          foundAreas.push({
                              x: x,
                              y: y - 30, // Posicionar acima da linha
                              width: 300,
                              height: 50,
                              page_num: pageNum,
                              signature_text: `Assinatura do ${searchName}`,
                              searchName: searchName
                          });
                          
                          console.log(`Adicionada área de assinatura para ${searchName} em linha de assinatura x:${x}, y:${y}`);
                      }
                  }
              }
          }
          
          // 3. Análise especial para a estrutura mostrada nas imagens
          // Se as imagens mostram um botão "Assinar" no canto inferior direito, tentar detectar
          const viewPort = page.getViewport({ scale: 1.0 });
          const pageWidth = viewPort.width * zoomScale;
          const pageHeight = viewPort.height * zoomScale;
          
          // Verificar se há elementos próximos ao canto inferior direito
          let hasLowerRightButton = false;
          
          for (let i = 0; i < items.length; i++) {
              const item = items[i];
              const x = item.transform[4] * zoomScale;
              const y = item.transform[5] * zoomScale;
              
              // Verificar se está no quadrante inferior direito
              if (x > pageWidth * 0.7 && y > pageHeight * 0.7) {
                  const text = item.str.toLowerCase();
                  if (text.includes("assinar") || text === "assine" || text === "assinatura") {
                      hasLowerRightButton = true;
                      console.log(`Detectado botão de assinatura no canto inferior direito da página ${pageNum}`);
                      
                      // Para cada nome de busca, criar uma área próxima ao botão
                      for (const searchName of searchNames) {
                          foundAreas.push({
                              x: x - 100, // Ajustar posição para ficar à esquerda do botão
                              y: y,
                              width: 300,
                              height: 50,
                              page_num: pageNum,
                              signature_text: `Assinatura do ${searchName}`,
                              searchName: searchName
                          });
                          
                          console.log(`Adicionada área de assinatura para ${searchName} próxima ao botão x:${x}, y:${y}`);
                      }
                  }
              }
          }
          
          // Se não encontrou o botão mas é a única página, adicionar área padrão
          if (!hasLowerRightButton && foundAreas.length === 0 && pdf.numPages === 1) {
              // Se for um documento de uma página sem detecção, usar coordenadas baseadas na estrutura observada
              console.log("Utilizando heurística para documento de uma página");
              
              // Coordenadas calibradas para o botão "Assinar" no canto inferior direito
              for (const searchName of searchNames) {
                  foundAreas.push({
                      x: pageWidth * 0.8, // 80% da largura da página 
                      y: pageHeight * 0.8, // 80% da altura da página
                      width: 300,
                      height: 50,
                      page_num: pageNum,
                      signature_text: `Assinatura do ${searchName}`,
                      searchName: searchName
                  });
                  
                  console.log(`Adicionada área padrão para ${searchName} na página ${pageNum}`);
              }
          }
      }
      
      return foundAreas;
      
  } catch (error) {
      console.error("Erro ao analisar estrutura específica do contrato:", error);
      return [];
  }
}

// Adicionar nova função para posições específicas mais confiáveis
function addSpecificContractSignatureAreas(searchNames) {
  // Coordenadas específicas para este contrato no zoom de 160%
  const areas = [];
  
  for (const searchName of searchNames) {
      if (searchName.toLowerCase().includes('contratante')) {
          areas.push({
              x: 850,  // Posição calibrada para o botão "Assinar" no zoom de 160%
              y: 350,
              width: 300,
              height: 50,
              page_num: 1,
              signature_text: "Assinatura do Contratante",
              searchName: "Contratante"
          });
      } else if (searchName.toLowerCase().includes('responsável')) {
          areas.push({
              x: 850,
              y: 750,
              width: 300,
              height: 50,
              page_num: 1,
              signature_text: "Assinatura do Responsável",
              searchName: "Responsável"
          });
      }
  }
  
  return areas;
}

function addSpecificContractSignatureAreas() {
  // Coordenadas específicas para este contrato
  return [
      {
          x: 98, // Coordenadas precisas para o campo do contratante baseadas na imagem
          y: 353,
          width: 260,
          height: 40,
          page_num: 1,
          signature_text: "Assinatura do Contratante",
          is_field: true
      },
      {
          x: 98, // Coordenadas precisas para o campo do responsável baseadas na imagem
          y: 500,
          width: 260,
          height: 40,
          page_num: 1,
          signature_text: "Assinatura do Responsável",
          is_field: true
      }
  ];
}

function createDefaultSignatureAreas(searchNames) {
  // Criar áreas padrão para quando nenhum método de detecção funcionar
  const defaultAreas = [];
  
  for (const searchName of searchNames) {
      defaultAreas.push({
          x: 850,  // Posição padrão para zoom de 160%
          y: 350,
          width: 300,
          height: 50,
          page_num: 1,
          signature_text: `Assinatura do ${searchName}`,
          searchName: searchName
      });
  }
  
  console.log("Criadas áreas de assinatura padrão como último recurso");
  return defaultAreas;
}

// Função para mapear coordenadas do PDF para o canvas HTML
function mapPdfToCanvasCoordinates(pdfCoords, pageElement, zoomScale = 1.6) {
  try {
    // Obter as dimensões do canvas da página
    const canvas = pageElement.querySelector('.pdf-page-canvas');
    if (!canvas) {
      console.error("Canvas não encontrado para mapeamento de coordenadas");
      return pdfCoords; // Retornar coordenadas originais se não conseguir mapear
    }
    
    // Obter o retângulo do canvas em relação à página
    const canvasRect = canvas.getBoundingClientRect();
    const pageRect = pageElement.getBoundingClientRect();
    
    // Calcular os deslocamentos
    const offsetX = (canvasRect.left - pageRect.left);
    const offsetY = (canvasRect.top - pageRect.top);
    
    // Aplicar o mapeamento
    return {
      x: (pdfCoords.x + offsetX),
      y: (pdfCoords.y + offsetY),
      width: pdfCoords.width,
      height: pdfCoords.height
    };
  } catch (error) {
    console.error("Erro ao mapear coordenadas:", error);
    return pdfCoords; // Retornar coordenadas originais em caso de erro
  }
}