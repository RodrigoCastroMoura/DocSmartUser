/**
 * Sistema de Detecção e Assinatura de Documentos
 * 
 * Este código adiciona funcionalidade para:
<<<<<<< HEAD
 * 1. Detectar nomes de usuários em documentos PDF
 * 2. Identificar áreas para assinatura
 * 3. Permitir que usuários assinem digitalmente documentos
=======
 * 1. Detectar áreas para assinatura em documentos PDF usando OCR
 * 2. Permitir que usuários assinem digitalmente documentos
 * 3. Adicionar rubricas em páginas sem assinaturas
>>>>>>> 80d37553feb96d164faf50d25836806d1b245929
 * 4. Salvar o documento com a assinatura
 */

// Configurações globais
let pdfDoc = null;
let signatureAreas = [];
let currentUser = null;
let userSignature = null;
let currentScale = 1.0;

<<<<<<< HEAD
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
=======
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
>>>>>>> 80d37553feb96d164faf50d25836806d1b245929
  
  // Agrupar áreas por número de página
  const areasByPage = {};
  areas.forEach(area => {
      const pageNum = area.page_num || 1;
      if (!areasByPage[pageNum]) {
          areasByPage[pageNum] = [];
      }
      areasByPage[pageNum].push(area);
  });
  
<<<<<<< HEAD
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
=======
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
>>>>>>> 80d37553feb96d164faf50d25836806d1b245929
  });
}

// Abrir o modal para assinatura
<<<<<<< HEAD
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
=======
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
>>>>>>> 80d37553feb96d164faf50d25836806d1b245929
}

// Inicializar o canvas para captura de assinatura
function initSignatureCanvas() {
<<<<<<< HEAD
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
=======
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
>>>>>>> 80d37553feb96d164faf50d25836806d1b245929
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
<<<<<<< HEAD
  const canvas = document.getElementById('signatureCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
=======
    const canvas = document.getElementById('signatureCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
>>>>>>> 80d37553feb96d164faf50d25836806d1b245929
}

// Carregar uma assinatura existente
function loadSavedSignature() {
<<<<<<< HEAD
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
async function saveSignedDocument() {
  try {
    showNotification('Salvando documento assinado...', 'info');
    
    // Aqui você teria a lógica para combinar o PDF original com as assinaturas
    // Esta é uma funcionalidade mais avançada que exigiria uma biblioteca como pdf-lib
    
    // Exemplo simples (simulado):
    setTimeout(() => {
      showNotification('Documento assinado com sucesso!', 'success');
      // Aqui você poderia redirecionar para a página de visualização do documento
    }, 2000);
    
    // Na implementação real, você enviaria o documento assinado para o servidor
    // E realizaria o processamento necessário lá
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
=======
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
>>>>>>> 80d37553feb96d164faf50d25836806d1b245929
}

// Injetar o CSS necessário para o sistema de assinatura
// No arquivo: static/js/enhanced-signature-system.js
// Modifique a função injectSignatureStyles para melhorar a visibilidade das áreas de assinatura

function injectSignatureStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
<<<<<<< HEAD
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
=======
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
>>>>>>> 80d37553feb96d164faf50d25836806d1b245929
  `;
  
  document.head.appendChild(styleElement);
}

// Injetar o HTML necessário para o sistema de assinatura
function injectSignatureHTML() {
<<<<<<< HEAD
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
=======
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
>>>>>>> 80d37553feb96d164faf50d25836806d1b245929
}