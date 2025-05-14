let currentPage = 1;
const perPage = 9;
let totalPages = 1;
let itemToDelete = null;
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
let currentPdf = null;
let zoomLevel = 1.0;
var margins = { top: 20, right: 20, bottom: 20, left: 20 };
var signatureFields = [];
var rubricFields = []; // Array para armazenar os campos de rubrica
var findSignature = null;
var rectignature = null;
var isIgnature = false;
let currentDocumentId;
var zoomSignature = false;
var pendingRubrics = []; // Array para controlar quais páginas precisam de rubrica
var signedPages = []; // Array para controlar quais páginas já foram assinadas/rubricadas
var totalSignaturesRequired = 0; // Total de assinaturas/rubricas requeridas
var completedSignatures = 0; // Contador de assinaturas/rubricas completadas


async function loadFilterOptions() {
    const contentDiv = document.getElementById('documentsContent');
    showLoading(contentDiv);

    const resetSelect = (selectId, placeholder) => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = `<option value="">${placeholder}</option>`;
            select.disabled = false;
        }
    };

    try {
        // Load departments
        const deptResponse = await fetch('/api/departments');
        if (!deptResponse.ok) {
            const errorData = await deptResponse.json();
            throw new Error(errorData.error || 'Failed to load departments');
        }
        const departments = await deptResponse.json();
        if (!Array.isArray(departments)) {
            throw new Error('Invalid departments data format');
        }
        populateFilterSelect('filterDepartment', departments);
        populateFilterSelect('documentDepartment', departments);

        // Load users
        const userResponse = await fetch('/api/users');
        if (!userResponse.ok) {
            const errorData = await userResponse.json();
            throw new Error(errorData.error || 'Failed to load users');
        }
        const userData = await userResponse.json();
        if (!userData.users || !Array.isArray(userData.users)) {
            throw new Error('Invalid users data format');
        }
        populateFilterSelect('filterUser', userData.users);
        populateFilterSelect('documentUser', userData.users);

        // Reset category and document type filters
        resetSelect('filterCategory', 'Categories');
        resetSelect('filterDocumentType', 'Types');
        resetSelect('documentCategory', 'Select Category');
        resetSelect('documentType', 'Select Document Type');

    } catch (error) {
        console.error('Error loading filter options:', error);
        showNotification(error.message || 'Failed to load filter options. Please try again.', 'error');

        // Reset all filters to a safe state with error indication
        const filterIds = {
            'filterDepartment': 'Departments',
            'documentDepartment': 'Department',
            'filterCategory': 'Categories',
            'documentCategory': 'Category',
            'filterDocumentType': 'Document Types',
            'documentType': 'Document Type',
            'filterUser': 'Users',
            'documentUser': 'User'
        };

        Object.entries(filterIds).forEach(([id, label]) => {
            resetSelect(id, `${label} (Error loading)`);
        });
    } finally {
        hideLoading(contentDiv);
    }
}

function populateFilterSelect(selectId, items) {
    const select = document.getElementById(selectId);
    if (!select || !Array.isArray(items)) return;

    const currentValue = select.value;
    select.innerHTML = '';

    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = selectId.includes('filter') ? 'All' : 'Select';
    defaultOption.textContent += ' ' + (selectId.includes('User') ? 'Users' : 
                                    selectId.includes('Department') ? 'Departments' : 
                                    selectId.includes('Category') ? 'Categories' : 
                                    'Types');
    select.appendChild(defaultOption);

    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name;
        select.appendChild(option);
    });

    if (currentValue) select.value = currentValue;
}

async function applyFilters() {
    const filters = {
        document_type_id: document_type_id,
        user_cpf: document.getElementById('user-cpf-filter').value
    };

    // Ensure document_type_id is never empty
    if (!filters.document_type_id) {
        filters.document_type_id = document_type_id;
    }

    // Store filters in URL params
    const params = new URLSearchParams(filters);

    // Reload documents with filters
    await loadDocuments(1, filters);
}

async function applyFiltersDepartment(departmentId) {
    const categorySelect = document.getElementById('filterCategory');
    const typeSelect = document.getElementById('filterDocumentType');

    categorySelect.innerHTML = '<option value="">Loading categories...</option>';
    categorySelect.disabled = true;
    typeSelect.innerHTML = '<option value="">Types</option>';
    typeSelect.disabled = true;

    try {
        if (!departmentId) {
            categorySelect.innerHTML = '<option value="">Categories</option>';
            typeSelect.innerHTML = '<option value="">Types</option>';
            await applyFilters();
            return;
        }
        await applyFilters();
        const response = await fetch(`/api/categories/departments/${departmentId}/categories`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to load categories');
        }
        const data = await response.json();

        if (!data.categories || !Array.isArray(data.categories)) {
            throw new Error('Invalid categories data format');
        }

        categorySelect.innerHTML = `
            <option value="">All Categories</option>
            ${data.categories.map(cat => `
                <option value="${cat.id}">${cat.name}</option>
            `).join('')}`;
    } catch (error) {
        console.error('Error loading categories:', error);
        showNotification(error.message, 'error');
        categorySelect.innerHTML = '<option value="">Error loading categories</option>';
    } finally {
        categorySelect.disabled = false;
        typeSelect.disabled = false;
    }
}

async function applyFiltersCategory(categoryId) {
    const typeSelect = document.getElementById('filterDocumentType');
    typeSelect.innerHTML = '<option value="">Loading document types...</option>';
    typeSelect.disabled = true;

    try {
        if (!categoryId) {
            typeSelect.innerHTML = '<option value="">Types</option>';
            await applyFilters();
            return;
        }
        await applyFilters();
        const response = await fetch(`/api/document_types/categories/${categoryId}/types`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to load document types');
        }
        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error('Invalid document types data format');
        }

        typeSelect.innerHTML = `
            <option value="">All Document Types</option>
            ${data.map(type => 
                `<option value="${type.id}">${type.name}</option>`
            ).join('')}`;
    } catch (error) {
        console.error('Error loading document types:', error);
        showNotification(error.message, 'error');
        typeSelect.innerHTML = '<option value="">Error loading document types</option>';
    } finally {
        typeSelect.disabled = false;
    }
}

function getFileIcon(filename) {
    if (!filename) return 'file';

    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
        case 'pdf': return 'file-text';
        case 'doc': case 'docx': return 'file-text';
        case 'xls': case 'xlsx': return 'file';
        case 'ppt': case 'pptx': return 'file';
        case 'txt': return 'file-text';
        case 'jpg': case 'jpeg': case 'png': case 'gif': case 'bmp': return 'image';
        case 'zip': case 'rar': case '7z': case 'tar': case 'gz': return 'archive';
        case 'mp3': case 'wav': case 'ogg': return 'music';
        case 'mp4': case 'avi': case 'mov': return 'video';
        default: return 'file';
    }
}

setupFormValidation('addDocumentForm', {
    'documentTitle': [
        ValidationRules.required,
        ValidationRules.minLength(3),
        ValidationRules.maxLength(100)
    ],
    'documentDepartment': [ValidationRules.required],
    'documentCategory': [ValidationRules.required],
    'documentType': [ValidationRules.required],
    'documentUser': [ValidationRules.required],
    'documentFile': [ValidationRules.required]
});

async function loadDocumentTypes(categoryId) {
    const typeSelect = document.getElementById('documentType');
    typeSelect.innerHTML = '<option value="">Loading document types...</option>';
    typeSelect.disabled = true;

    try {
        if (!categoryId) {
            typeSelect.innerHTML = '<option value="">Select Document Type</option>';
            return;
        }

        const response = await fetch(`/api/document_types/categories/${categoryId}/types`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to load document types');
        }
        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error('Invalid document types data format');
        }

        typeSelect.innerHTML = `
            <option value="">Select Document Type</option>
            ${data.map(type => 
                `<option value="${type.id}">${type.name}</option>`
            ).join('')}`;
    } catch (error) {
        console.error('Error loading document types:', error);
        showNotification(error.message, 'error');
        typeSelect.innerHTML = '<option value="">Error loading document types</option>';
    } finally {
        typeSelect.disabled = false;
    }
}

async function loadDepartmentCategories(departmentId) {
    const categorySelect = document.getElementById('documentCategory');
    const typeSelect = document.getElementById('documentType');

    categorySelect.innerHTML = '<option value="">Loading categories...</option>';
    categorySelect.disabled = true;
    typeSelect.innerHTML = '<option value="">Select Document Type</option>';
    typeSelect.disabled = true;

    try {
        if (!departmentId) {
            categorySelect.innerHTML = '<option value="">Select Category</option>';
            return;
        }

        const response = await fetch(`/api/categories/departments/${departmentId}/categories`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to load categories');
        }
        const data = await response.json();

        if (!data.categories || !Array.isArray(data.categories)) {
            throw new Error('Invalid categories data format');
        }

        categorySelect.innerHTML = `
            <option value="">Select Category</option>
            ${data.categories.map(cat => `
                <option value="${cat.id}">${cat.name}</option>`
            ).join('')}`;
    } catch (error) {
        console.error('Error loading categories:', error);
        showNotification(error.message, 'error');
        categorySelect.innerHTML = '<option value="">Error loading categories</option>';
    } finally {
        categorySelect.disabled = false;
        typeSelect.disabled = false;
    }
}

async function createDocument(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');       
    if (!validateForm(form)) {
        return;
    }
    showLoading(submitButton);
    const formData = new FormData(form);
    try {
        const response = await fetch('/api/documents', {
            method: 'POST',
            body: formData
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create document');
        }
        hideModal('addDocumentModal');
        form.reset();
        document.getElementById('user_id').value =''
        const filters = {
            document_type_id: document_type_id,
        };
        await loadDocuments(currentPage,filters);
        showNotification('Document created successfully', 'success');
    } catch (error) {
        console.error('Error creating document:', error);
        showNotification(error.message, 'error');
    } finally {
        hideLoading(submitButton);
    }
}

function showDeleteConfirmation(id) {
    itemToDelete = id;
    showModal('deleteConfirmModal');
    feather.replace();
}

async function confirmDelete() {
    if (!itemToDelete) return;

    const id = itemToDelete;
    hideModal('deleteConfirmModal');
    const card = document.querySelector(`.document-card[data-id="${id}"]`);
    showLoading(card);

    try {
        const response = await fetch(`/api/documents/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete document');
        }
        const filters = {
            document_type_id: document_type_id,
            user_cpf: document.getElementById('user-cpf-filter').value
        };
        await loadDocuments(currentPage,filters);
        showNotification('Document deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting document:', error);
        showNotification(error.message, 'error');
    } finally {
        hideLoading(card);
        itemToDelete = null;
    }
}

async function loadDocuments(page = 1, filters = {}) {
    const contentDiv = document.getElementById('documentsContent');
    showLoading(contentDiv);

    try {
        // Always include document_type_id in filters if not already present
        if (!filters.document_type_id) {
            filters.document_type_id = document_type_id;
        }

        const params = new URLSearchParams({
            page: page,
            per_page: perPage,
            ...filters
        });

        const response = await fetch(`/api/documents?${params}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to load documents');
        }

        const data = await response.json();
        if (!data || !Array.isArray(data.documents)) {
            throw new Error('Invalid response format');
        }

        currentPage = page;
        totalPages = data.total_pages || 1;

        const gridHTML = data.documents.length === 0 ? `
            <div class="documents-grid">
                <div class="no-data">
                    <i data-feather="inbox"></i>
                    <p>No documents found</p>
                </div>
            </div>` : `
            <div class="documents-grid">
                ${data.documents.map(doc => `
                    <div class="document-card" data-id="${doc.id}">
                        <div class="document-header">
                            <i data-feather="${getFileIcon(doc.name)}"></i>
                            <div class="document-title">
                                <h3>${doc.titulo || 'Unknown Type'}</h3>
                            </div>
                        </div>
                        <div class="document-info">
                            <div class="user-info">
        
                                <div class="user-details">
                                    <p class="user-name">${doc.user_name || 'Unknown User'}</p>
                                    <p class="user-cpf">${doc.user_cpf || 'No CPF'}</p>
                                </div>
                            </div>
                            <div class="document-meta">
                                <p><i data-feather="calendar"></i> ${new Date(doc.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div class="document-actions">
                             ${doc.flow > 1 ? (!doc.signature ? `
                                <button class="action-btn success" onclick="signatureDocument('${doc.url}', '${doc.name}','${doc.id}','${doc.flow === 2 ? '' : doc.flow_user.length > 1 ? doc.flow_user.find(item => item.user_id === doc.user_id && item.signature === false)?.id : ''}')">
                                <i data-feather="edit"></i>
                               </button>
                            ` : `
                               <button class="action-btn" onclick="previewDocument('${doc.url}', '${doc.name}','${doc.id}')">
                                <i data-feather="eye"></i>
                               </button>
                            `) : `
                               <button class="action-btn" onclick="previewDocument('${doc.url}', '${doc.name}','${doc.id}')">
                                <i data-feather="eye"></i>
                               </button>
                            `}
                           
                            <button class="action-btn" onclick="downloadDocument('${doc.url}', '${doc.id}')">
                                <i data-feather="download"></i>
                            </button>
                             ${doc.created_by == id_doc ? `
                                <button class="action-btn danger" onclick="deleteDocument('${doc.id}')">
                                  <i data-feather="trash-2"></i>
                                </button>
                            ` : `
                                <button class="action-btn danger" disabled>
                                  <i data-feather="trash-2"></i>
                                </button>
                            `}
                        </div>
                    </div>
                `).join('')}
            </div>`;

        contentDiv.innerHTML = gridHTML + `
            <div class="pagination-controls">
                <button class="action-btn" onclick="changePage(currentPage - 1)" id="prevPage" ${currentPage <= 1 ? 'disabled' : ''}>
                    <i data-feather="chevron-left"></i> Previous
                </button>
                <span id="pageInfo">Page ${currentPage} of ${totalPages}</span>
                <button class="action-btn" onclick="changePage(currentPage + 1)" id="nextPage" ${currentPage >= totalPages ? 'disabled' : ''}>
                    Next <i data-feather="chevron-right"></i>
                </button>
            </div>`;

        feather.replace();
        updatePaginationControls();
    } catch (error) {
        console.error('Error loading documents:', error);
        contentDiv.innerHTML = `
            <div class="documents-grid">
                <div class="no-data error">
                    <i data-feather="alert-circle"></i>
                    <p>${error.message || 'Error loading documents. Please try again.'}</p>
                </div>
            </div>`;
        feather.replace();
        showNotification(error.message || 'Failed to load documents', 'error');
    } finally {
        hideLoading(contentDiv);
    }
}

async function searchUser() {
    try {

        openPopup();
        if(document.getElementById(`user_cpf`).value == ''){
            closePopup();
            showNotification('Enter with CPF', 'error');
            return;
        } 

        const params = new URLSearchParams({
            cpf: document.getElementById(`user_cpf`).value,
        });

        const response = await fetch(`/api/users?${params}`);
        if (!response.ok) {
            closePopup();
            showNotification('User not found', 'error');
            document.getElementById('name-user').value = '';
            document.getElementById('user_id').value ='';
            return;
        }
        const data = await response.json();
        usuario = data['users'][0]

        if(!usuario){
            closePopup();
            showNotification('User not found', 'error');
            document.getElementById('name-user').value = '';
            document.getElementById('user_id').value ='';
            return;
        }

        document.getElementById('name-user').value = usuario['name'];
        document.getElementById('user_id').value = usuario['id'];
        closePopup();
    } catch (error) {
        console.error('Error loading documents:', error);
        showNotification(error.message || 'Failed to load users', 'error');

    } finally {
        closePopup();
    }
}

function updatePaginationControls() {
    document.getElementById('prevPage').disabled = currentPage <= 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
}

function changePage(newPage) {
    if (newPage >= 1 && newPage <= totalPages) {
        const urlParams = new URLSearchParams(window.location.search);
        const filters = {
            department_id: urlParams.get('department_id') || '',
            category_id: urlParams.get('category_id') || '',
            document_type_id: document_type_id, // Always use the current document_type_id

        };

        // Clean empty filters
        Object.keys(filters).forEach(key => {
            if (filters[key] === '') {
                delete filters[key];
            }
        });

        loadDocuments(newPage, filters);
    }
}

function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showAddDocumentModal() {
    document.getElementById('addDocumentForm').reset();
    showModal('addDocumentModal');
}

function deleteDocument(id) {
    showDeleteConfirmation(id);
}

async function downloadDocument(url, id) {
    if (!url) {
        showNotification('Document URL is not available', 'error');
        return;
    }

    try {
        // Track download count
        await fetch(`/api/documents/${id}/download-count`, {
            method: 'POST',
            headers: get_auth_headers()
        });
        window.open(url, '_blank');
    } catch (error) {
        consoleerror('Error downloading document:', error);
        showNotification('Failed to download document', 'error');
    }
}

function get_auth_headers() {
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
}

async function previewDocument(url, filename, id) {
    openPopup();
    const previewTitle = document.getElementById('previewTitle');
    const previewContainer = document.querySelector('.preview-container');
    const zoomLevelSpan = document.getElementById('zoomLevel');
    const mobileTermsContainers = document.getElementsByClassName('mobile-terms-container');
    const termsOverlay = document.getElementById('termsOverlay');
    const termsCheckboxContainer = document.getElementById('termsCheckboxContainer');
    document.getElementById('saveSignedDocBtn').disabled = true;
    zoomSignature = false;
    // Reset zoom level
    zoomLevel = 1.0;
    zoomLevelSpan.textContent = `${(zoomLevel * 100).toFixed(0)}%`;

    if (mobileTermsContainers.length > 0) {
        mobileTermsContainers[0].style.setProperty('display', 'none', 'important');
    }

    // Mostrar o overlay de termos
    if (termsOverlay) {
        termsOverlay.style.setProperty('display', 'none', 'important');
    }

    if(termsCheckboxContainer){
        termsCheckboxContainer.style.setProperty('display', 'none', 'important');
    }


    // Clear previous content from preview container
    while (previewContainer.firstChild) {
        previewContainer.removeChild(previewContainer.firstChild);
    }
    
    previewTitle.textContent = filename;
    const fileType = filename.split('.').pop().toLowerCase();

    try {
        if (fileType === 'pdf') {
            // Create PDF viewer container
            const pdfViewerContainer = document.createElement('div');
            pdfViewerContainer.className = 'pdf-viewer-container';
            previewContainer.appendChild(pdfViewerContainer);
            
            // Show loading indicator
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'pdf-loading';
            loadingIndicator.innerHTML = '<div class="loading-spinner"></div><p>Loading PDF...</p>';
            pdfViewerContainer.appendChild(loadingIndicator);
            
            // Load the PDF
            const proxyUrl = `/proxy/storage/${url.replace('https://storage.googleapis.com/', '')}`;
            const loadingTask = pdfjsLib.getDocument(proxyUrl);
            currentPdf = await loadingTask.promise;
            
            // Remove loading indicator
            pdfViewerContainer.removeChild(loadingIndicator);
            
            // Render all pages in the viewer
            await renderPdfPages(pdfViewerContainer);
            
        } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileType)) {
            // Create image container
            const imgContainer = document.createElement('div');
            imgContainer.className = 'image-container';
            previewContainer.appendChild(imgContainer);
            
            // Create the image element
            const imageElement = document.createElement('img');
            imageElement.className = 'preview-image';
            imageElement.alt = 'Image Preview';
            imageElement.src = url;
            imgContainer.appendChild(imageElement);
            
            // Add zoom support for images
            imageElement.style.transform = `scale(${zoomLevel})`;
            imageElement.style.transformOrigin = 'center center';
            
        } else {
            // Handle other document types
            const docContainer = document.createElement('div');
            docContainer.className = 'document-container';
            previewContainer.appendChild(docContainer);
            
            const iframeElement = document.createElement('iframe');
            iframeElement.className = 'document-iframe';
            iframeElement.src = url;
            docContainer.appendChild(iframeElement);
        }

        try {
            await fetch(`/api/documents/${id}/view-count`, {
                method: 'POST',
                headers: get_auth_headers()
            });
        } catch (error) {
            console.error('Error tracking view count:', error);
        }
    
        showModal('previewModal');
        closePopup();
    } catch (error) {
        console.error('Error previewing document:', error);
        showNotification('Failed to preview document', 'error');
        closePopup();
    }
}


async function renderPdfPages(container) {
    if (!currentPdf) return;
    
    const totalPages = currentPdf.numPages;
    
    // Create main pages container
    const pagesContainer = document.createElement('div');
    pagesContainer.className = 'pdf-pages-container';
    container.appendChild(pagesContainer);
    
    // Render each page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        // Create container for this page
        const pageContainer = document.createElement('div');
        pageContainer.className = 'pdf-page-wrapper';
        pageContainer.dataset.pageNumber = pageNum;
        pagesContainer.appendChild(pageContainer);
        
        // Create canvas for the page
        const pageCanvas = document.createElement('canvas');
        pageCanvas.className = 'pdf-page-canvas';
        pageContainer.appendChild(pageCanvas);
        
        // Render the page content
        await renderPdfPage(pageNum, pageCanvas);
    }
}

async function renderPdfPage(pageNumber, canvas) {
    try {
        const page = await currentPdf.getPage(pageNumber);
        const context = canvas.getContext('2d');
        
        // Calculate viewport based on zoom level
        const viewport = page.getViewport({ scale: zoomLevel });
        
        // Set canvas dimensions to match viewport
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        
        // Render PDF page into canvas context
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Add subtle page number indicator at the bottom
        if (currentPdf.numPages > 1) {
            const pageNumberIndicator = document.createElement('div');
            pageNumberIndicator.className = 'pdf-page-number';
            pageNumberIndicator.textContent = `${pageNumber} / ${currentPdf.numPages}`;
            canvas.parentNode.appendChild(pageNumberIndicator);
        }
        
    } catch (error) {
        console.error(`Error rendering PDF page ${pageNumber}:`, error);
        const errorMsg = document.createElement('div');
        errorMsg.className = 'pdf-page-error';
        errorMsg.textContent = `Error loading page ${pageNumber}`;
        canvas.parentNode.appendChild(errorMsg);
    }
}


async function signatureDocument(url, filename, id, find = '') {
    openPopup();

    // Track view count
    try {
        await fetch(`/api/documents/${id}/view-count`, {
            method: 'POST',
            headers: get_auth_headers()
        });
    } catch (error) {
        console.error('Error tracking view count:', error);
    }

    const previewTitle = document.getElementById('previewTitle');
    const previewContainer = document.querySelector('.preview-container');
    const zoomLevelSpan = document.getElementById('zoomLevel');
    const termsCheckbox = document.getElementById('termsCheckbox');
    const mobileTermsContainers = document.getElementsByClassName('mobile-terms-container');
    const termsOverlay = document.getElementById('termsOverlay');
    const termsCheckboxContainer = document.getElementById('termsCheckboxContainer');
    
    // Resetar contadores de assinatura
    completedSignatures = 0;
    totalSignaturesRequired = 0;
    pendingRubrics = [];
    signedPages = [];
    
    if(isMobileDevice()) {
        if (mobileTermsContainers.length > 0) {
            mobileTermsContainers[0].style.setProperty('display', 'flex', 'important');
        }
        
        if(termsCheckboxContainer){
            termsCheckboxContainer.style.setProperty('display', 'none', 'important');
        }
    } else {
        if(termsCheckboxContainer){
            termsCheckboxContainer.style.setProperty('display', 'flex', 'important');
        }

        if (mobileTermsContainers.length > 0) {
            mobileTermsContainers[0].style.setProperty('display', 'none', 'important');
        }
    }

    zoomSignature = true;
    currentPdf = null;
    findSignature = null;
    rectignature = null;
    isIgnature = false;
    currentDocumentId = id;
    zoomLevel = getInitialZoomLevel();
    zoomLevelSpan.textContent = `${(zoomLevel * 100).toFixed(0)}%`;
    
    while (previewContainer.firstChild) {
        previewContainer.removeChild(previewContainer.firstChild);
    }
    
    previewTitle.textContent = filename;
    const fileType = filename.split('.').pop().toLowerCase();
    
    try {
        if (fileType === 'pdf') {
            document.getElementById('previewTitle').style.display = 'block';
            document.getElementById('previewTitle').disabled = true;
            document.getElementById('saveSignedDocBtn').disabled = true;
            
            const pdfViewerContainer = document.createElement('div');
            pdfViewerContainer.className = 'pdf-viewer-container';
            previewContainer.appendChild(pdfViewerContainer);
            
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'pdf-loading';
            loadingIndicator.innerHTML = '<div class="loading-spinner"></div><p>Loading PDF...</p>';
            pdfViewerContainer.appendChild(loadingIndicator);
            
            const proxyUrl = `/proxy/storage/${url.replace('https://storage.googleapis.com/', '')}`;
            const loadingTask = pdfjsLib.getDocument(proxyUrl);
            currentPdf = await loadingTask.promise;
            pdfViewerContainer.removeChild(loadingIndicator);
            
            await renderPdfPagesSignature(pdfViewerContainer, id, find);
            document.getElementById("openSimpleModalBtn").style.display = 'block';
        } 

        // Mostrar o overlay de termos
        if (termsOverlay) {
            termsOverlay.style.setProperty('display', 'flex', 'important');
        }
        
        // Resetar o estado da caixa de seleção
        if (termsCheckbox) {
            termsCheckbox.checked = false;
        }
        
        closePopup();
        showModal('previewModal');
    } catch (error) {
        console.error('Error previewing document:', error);
        showNotification('Failed to preview document', 'error');
        closePopup();
    }

    if(currentSignature == "None")
        showSimpleModal();
}

async function renderPdfPagesSignature(container, id, find) {
    if (!currentPdf) return;
    const totalPages = currentPdf.numPages;    
    const pagesContainer = document.createElement('div');
    pagesContainer.className = 'pdf-pages-container';
    container.appendChild(pagesContainer);
    signatureFields = [];
    rubricFields = [];
    totalSignaturesRequired  = 0;
    
    try {
        if(findSignature == null){
            const params = new URLSearchParams({ find: find });
            const response = await fetch(`/api/pdf-analyzer/${id}?${params.toString()}`, {
                method: 'GET',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error);
            } 
            findSignature = await response.json();  
        }    
    } catch (error) {
        showNotification(error.message, 'error');
    } 
    
    // Verificar se há assinaturas e rubricas necessárias
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        let pageHasSignatureField = false;
        let pageHasRubricField = false;
        
        // Verificamos se há área de assinatura na página
        if (findSignature && findSignature.resultados[pageNum-1] && 
            findSignature.resultados[pageNum-1].has_signature) {
            totalSignaturesRequired++;
            pageHasSignatureField = true;
        }
        
        // Verificamos se há área de rubrica definida na API
        if (findSignature && findSignature.resultados[pageNum-1] && 
            !findSignature.resultados[pageNum-1].has_signature) {
            totalSignaturesRequired++;
            pageHasRubricField = true;
        }
        
        // Se não há nem assinatura nem rubrica vinda da API, adicionamos à lista de pendências
        if (!pageHasSignatureField && !pageHasRubricField) {
            pendingRubrics.push(pageNum);
            totalSignaturesRequired++;
        }
    }
    
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const pageContainer = document.createElement('div');
        pageContainer.className = 'pdf-page-wrapper';
        pageContainer.dataset.pageNumber = pageNum;
        pagesContainer.appendChild(pageContainer);
        
        const pageCanvas = document.createElement('canvas');
        pageCanvas.className = 'pdf-page-canvas';
        pageContainer.appendChild(pageCanvas);
        
        await renderPdfPageSignature(pageNum, pageCanvas);
    }
}

async function renderPdfPageSignature(pageNumber, canvas) {
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
                
                field.x = Math.max(this.margins.left, Math.min(field.x, pageWidth - field.width - this.margins.right));
                field.y = Math.max(this.margins.top, Math.min(field.y, pageHeight - field.height - this.margins.bottom));
                
                this.signatureFields.push(field);
                
                // Se a página já foi assinada
                if (signedPages.includes(pageNumber)) {
                    this.placeSignature(null, canvas, field);
                }
            } else{

                const rubrectangle = findSignature.resultados[pageNumber-1].rect;
                const [rx0, ry0] = viewport.convertToViewportPoint(rubrectangle.x0, rubrectangle.y0);
                const [rx1, ry1] = viewport.convertToViewportPoint(rubrectangle.x1, rubrectangle.y1);
                
                const field = {
                    x: rx0,
                    y: (viewport.height - ry1) - 6,
                    width: rx1 - rx0,
                    height:  (ry1 - ry0) - 10,
                    type: 'rubric',
                    pageNumber: pageNumber
                };
                
                field.x = Math.max(this.margins.left, Math.min(field.x, pageWidth - field.width - this.margins.right));
                field.y = Math.max(this.margins.top, Math.min(field.y, pageHeight - field.height - this.margins.bottom));
                
                this.rubricFields.push(field);

                 // Verificar se esta página tem uma área de rubrica
                if (signedPages.includes(pageNumber)) {
                    this.placeRubric(null, canvas, field);
                }
            }

        }else{
            await this.detectSignatureFields((pageNumber - 1), canvas, viewport);
        }
        
        // Adicionar eventos de clique para assinatura e rubrica
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Verificar se clicou em uma área de assinatura
            const signatureField = this.signatureFields.find(field => 
                field.pageNumber === pageNumber &&
                field.type == "signature"
            );
            
            if (signatureField && currentSignature) {
                // Colocar assinatura
                this.placeSignature(e, canvas, signatureField);
                
                // Marcar página como assinada
                if (!signedPages.includes(pageNumber)) {
                    signedPages.push(pageNumber);
                    completedSignatures++;
                }
                
                checkSignatureCompletion();
                
                // Avançar para a próxima página
                scrollToNextPage(pageNumber);
                
                return;
            }
            
            // Verificar se clicou em uma área de rubrica
            const rubricField = this.rubricFields.find(field => 
                field.pageNumber === pageNumber &&
                 field.type == "rubric"             
            );
            
            if (rubricField && currentRubrica) {
                // Colocar rubrica
                this.placeRubric(e, canvas, rubricField);
                
                // Marcar página como rubricada
                if (!signedPages.includes(pageNumber)) {
                    signedPages.push(pageNumber);
                    completedSignatures++;
                }
                
                checkSignatureCompletion();
                
                // Avançar para a próxima página
                scrollToNextPage(pageNumber);
            }
        });
        
        if (currentPdf.numPages > 1) {
            const pageNumberIndicator = document.createElement('div');
            pageNumberIndicator.className = 'pdf-page-number';
            pageNumberIndicator.textContent = `${pageNumber} / ${currentPdf.numPages}`;
            canvas.parentNode.appendChild(pageNumberIndicator);
        }

    } catch (error) {
        console.error(`Error rendering PDF page ${pageNumber}:`, error);
        const errorMsg = document.createElement('div');
        errorMsg.className = 'pdf-page-error';
        errorMsg.textContent = `Error loading page ${pageNumber}`;
        canvas.parentNode.appendChild(errorMsg);
    }
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

async function detectSignatureFields(pageNumber, canvas, viewport) {
    const ctx = canvas.getContext('2d');
    const { width: pageWidth, height: pageHeight } = viewport;
    
    if (findSignature != null) {
        // Verificar se esta página tem campo de assinatura
        if(findSignature.resultados[pageNumber].has_signature == true){
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
            
            field.x = Math.max(this.margins.left, Math.min(field.x, pageWidth - field.width - this.margins.right));
            field.y = Math.max(this.margins.top, Math.min(field.y, pageHeight - field.height - this.margins.bottom));
            
            this.signatureFields.push(field);
            
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
        } else {
            // Esta página não tem campo de assinatura, então precisamos verificar se há rubrica
            // Verificamos se a API forneceu posicionamento de rubrica para esta página
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
                
                field.x = Math.max(this.margins.left, Math.min(field.x, pageWidth - field.width - this.margins.right));
                field.y = Math.max(this.margins.top, Math.min(field.y, pageHeight - field.height - this.margins.bottom));
                
                this.rubricFields.push(field);
                
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
                ctx.fillText('rubricar', field.x + 25, field.y + (field.height / 2));
                ctx.restore();
            } else {
                // Se não há posicionamento de rubrica vindo da API, verificamos se devemos adicionar rubrica
                // no canto superior direito da página
                if (pendingRubrics.includes(pageNumber + 1)) {
                    // Posicionar a rubrica no canto superior direito da página como fallback
                    const rubricWidth = 80 * zoomLevel;
                    const rubricHeight = 40 * zoomLevel;
                    
                    const field = {
                        x: pageWidth - rubricWidth - this.margins.right,
                        y: this.margins.top,
                        width: rubricWidth,
                        height: rubricHeight,
                        type: 'rubric',
                        pageNumber: pageNumber + 1
                    };
                    
                    this.rubricFields.push(field);
                    
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
                }
            }
        }
    }
}

function findClickedField(x, y) {
    // Verifica se clicou em um campo de assinatura
    const signatureField = this.signatureFields.find(field => 
        x >= field.x && x <= (field.x + field.width) &&
        y >= field.y && y <= (field.y + field.height)
    );
    
    if (signatureField) return signatureField;
    
    // Verifica se clicou em um campo de rubrica
    const rubricField = this.rubricFields.find(field => 
        x >= field.x && x <= (field.x + field.width) &&
        y >= field.y && y <= (field.y + field.height)
    );
    
    return rubricField;
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

async function placeSignature(event, canvas, field) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(field.x, field.y, field.width, field.height);
    const img = new Image();
    img.src = currentSignature;
    img.onload = () => {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Calculate aspect ratio
        const imgRatio = img.width / img.height;

        // Set maximum size relative to field
        const maxWidth = field.width * 1.0; // 90% of field width
        const maxHeight = field.height * 0.9; // 80% of field height

        let drawWidth, drawHeight;

        // Calculate dimensions while maintaining aspect ratio
        if (imgRatio > 1) {
            // Image is wider than tall
            drawWidth = Math.min(maxWidth, field.width);
            drawHeight = drawWidth / imgRatio;

            // If height is too large, scale down
            if (drawHeight > maxHeight) {
                drawHeight = maxHeight;
                drawWidth = drawHeight * imgRatio;
            }
        } else {
            // Image is taller than wide or square
            drawHeight = Math.min(maxHeight, field.height);
            drawWidth = drawHeight * imgRatio;

            // If width is too large, scale down
            if (drawWidth > maxWidth) {
                drawWidth = maxWidth;
                drawHeight = drawWidth / imgRatio;
            }
        }

        // Center the image in the field
        const offsetX = field.x + (field.width - drawWidth) / 2;
        const offsetY = field.y + (field.height - drawHeight) / 2;

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        isIgnature = true;
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

        // Calculate aspect ratio
        const imgRatio = img.width / img.height;

        // Set maximum size relative to field
        const maxWidth = field.width * 0.9;
        const maxHeight = field.height * 0.9;

        let drawWidth, drawHeight;

        // Calculate dimensions while maintaining aspect ratio
        if (imgRatio > 1) {
            // Image is wider than tall
            drawWidth = Math.min(maxWidth, field.width);
            drawHeight = drawWidth / imgRatio;

            // If height is too large, scale down
            if (drawHeight > maxHeight) {
                drawHeight = maxHeight;
                drawWidth = drawHeight * imgRatio;
            }
        } else {
            // Image is taller than wide or square
            drawHeight = Math.min(maxHeight, field.height);
            drawWidth = drawHeight * imgRatio;

            // If width is too large, scale down
            if (drawWidth > maxWidth) {
                drawWidth = maxWidth;
                drawHeight = drawWidth / imgRatio;
            }
        }

        // Center the image in the field
        const offsetX = field.x + (field.width - drawWidth) / 2;
        const offsetY = field.y + (field.height - drawHeight) / 2;

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    };
}

async function getSignaturePosition() {
    return this.signaturePosition;
}

async function adjustZoom(delta) {
    const oldZoom = zoomLevel;
    zoomLevel += delta;
    zoomLevel = Math.max(0.2, Math.min(3, zoomLevel));
    if (oldZoom === zoomLevel) return;
    const zoomLevelSpan = document.getElementById('zoomLevel');
    zoomLevelSpan.textContent = `${(zoomLevel * 100).toFixed(0)}%`;
    const previewContainer = document.querySelector('.preview-container');
    const pdfContainer = document.querySelector('.pdf-viewer-container');
    const imageElement = document.querySelector('.preview-image');
    if (pdfContainer && currentPdf) {
        const scrollContainer = document.querySelector('.pdf-pages-container');
        const scrollRatio = scrollContainer.scrollTop / scrollContainer.scrollHeight;
        const pagesContainer = document.querySelector('.pdf-pages-container');
        if (pagesContainer) {
            pdfContainer.removeChild(pagesContainer);
        }
        if(!zoomSignature)
            await renderPdfPages(pdfContainer);
        else
            await renderPdfPagesSignature(pdfContainer);
        const newScrollContainer = document.querySelector('.pdf-pages-container');
        setTimeout(() => {
            newScrollContainer.scrollTop = scrollRatio * newScrollContainer.scrollHeight;
        }, 50);
    } else if (imageElement) {
        imageElement.style.transform = `scale(${zoomLevel})`;
        imageElement.style.transformOrigin = 'center center';
    }
}


async function saveSignedDocument(documentId) {
try {
    openPopup();
    const response = await fetch(`/api/pdf-analyzer/${documentId}`, {
        method: 'POST',
    });

    if (!response.ok) {
        throw new Error('Failed to save signed document');
    }

    showNotification('Documento assinado salvo com sucesso!', 'success');
    closePopup();
    hideModal('previewModal');
    await loadDocuments(currentPage); 

} catch (error) {
    console.error('Erro ao salvar documento assinado:', error);
    showNotification('Erro ao salvar o documento assinado: ' + error.message, 'error');
    closePopup();
}
}

document.addEventListener('DOMContentLoaded', () => {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        /* Container styling */
        .preview-container {
            position: relative;
            background-color: var(--bg-tertiary);
            display: flex;
            justify-content: center;
            overflow: hidden;
            width: 100%;
            height: calc(100vh - 120px);
        }

        /* PDF viewer styling */
        .pdf-viewer-container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .pdf-pages-container {
            width: 100%;
            height: 100%;
            overflow-y: auto;
            overflow-x: auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px 0;
        }

        .pdf-page-wrapper {
            margin-bottom: 20px;
            background-color: white;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            position: relative;
            display: flex;
            justify-content: center;
        }

        .pdf-page-canvas {
            display: block;
        }

        .pdf-page-number {
            position: absolute;
            bottom: -20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.5);
            color: white;
            padding: 2px 10px;
            border-radius: 10px;
            font-size: 12px;
            opacity: 0.7;
        }

        .pdf-page-error {
            padding: 20px;
            background-color: #ffeeee;
            color: #cc0000;
            text-align: center;
            border: 1px solid #cc0000;
            margin: 20px;
        }

        /* Loading indicator */
        .pdf-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            width: 100%;
        }

        .loading-spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid var(--accent-color);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin-bottom: 15px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Image container */
        .image-container {
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: auto;
            width: 100%;
            height: 100%;
            background-color: var(--bg-primary);
        }

        .preview-image {
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
            transition: transform 0.2s ease;
            transform-origin: center center;
        }

        /* Document container */
        .document-container {
            width: 100%;
            height: 100%;
            overflow: auto;
        }

        .document-iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
    `;

document.head.appendChild(styleElement);
});

function isMobileDevice() {
    return (window.innerWidth <= 768);
}

function getInitialZoomLevel() {
    // For mobile devices, start with smaller zoom to fit width
    if (isMobileDevice()) {
        return 1.0; // Smaller initial zoom for mobile
    } else {
        return 1.8; // Your original desktop zoom
    }
}

function setupMobilePdfGestures() {
    const container = document.querySelector('.pdf-pages-container');
    if (!container) return;
    
    let touchStartY = 0;
    let touchStartDistance = 0;
    
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
}

function updatePreviewModalStructure() {
    const previewModal = document.getElementById('previewModal');
    if (!previewModal) return;

    const previewContainer = previewModal.querySelector('.preview-container');
    if (!previewContainer) return;
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    if (modalId === 'previewModal') {
        currentPdf = null;
    }
}

function showSimpleModal() {
    document.getElementById('simpleModal').style.display = 'block';
    feather.replace();
}

document.addEventListener('DOMContentLoaded', () => {
    loadDocuments();

});

document.addEventListener('DOMContentLoaded', () => {

const previewModal = document.getElementById('previewModal');

if (previewModal) {
    previewModal.addEventListener('shown', function() {
        setupMobilePdfGestures();
    });
}
});

function toggleTermsAgreement() {
    const checkbox = document.getElementById('termsCheckbox');
    const mobileCheckbox = document.getElementById('mobileTermsCheckbox');
    const overlay = document.getElementById('termsOverlay');
    
    // Sincronizar a caixa de seleção móvel com a desktop
    if (mobileCheckbox) {
        mobileCheckbox.checked = checkbox.checked;
    }
    
    if (!overlay) {
        console.error('Elemento do overlay de termos não encontrado');
        return;
    }
    
    if (checkbox.checked) {
        // Esconder o overlay com fade out
        overlay.style.opacity = '0';
        // Desativar pointer-events para garantir que o usuário possa interagir com o documento
        overlay.style.pointerEvents = 'none';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300); // Duração da transição
    } else {
        // Mostrar o overlay
        overlay.style.display = 'flex';
        overlay.style.pointerEvents = 'auto';
        // Pequeno delay para garantir que o display:flex seja aplicado antes da transição
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 10);
    }
}

// Função para sincronizar as caixas de seleção (mobile e desktop)
function syncCheckboxes(sourceCheckbox, targetCheckboxId) {
    const targetCheckbox = document.getElementById(targetCheckboxId);
    if (targetCheckbox) {
        targetCheckbox.checked = sourceCheckbox.checked;
        toggleTermsAgreement();
    }
}

// Função para detectar quando a tela muda de tamanho e ajustar elementos
function handleResponsiveLayout() {
    const isMobile = window.innerWidth <= 768;
    const previewContainer = document.querySelector('.preview-container');
    const mobileTermsContainers = document.getElementsByClassName('mobile-terms-container');
    const termsOverlay = document.getElementById('termsOverlay');
    if (previewContainer) {
        if (isMobile) {
            // Ajusta a altura para considerar a faixa de termos em mobile
            previewContainer.style.height = 'calc(100vh - 120px - 40px)';
            if (mobileTermsContainers.length > 0) {
                mobileTermsContainers[0].style.setProperty('display', 'flex', 'important');
            }
        } else {
            // Restaura a altura original em desktop
            previewContainer.style.height = 'calc(100vh - 120px)';
            if (mobileTermsContainers.length > 0) {
                mobileTermsContainers[0].style.setProperty('display', 'none', 'important');
            }
        }
    }
}

// Adicionar event listener para redimensionamento da janela
window.addEventListener('resize', handleResponsiveLayout);

// Inicializar o layout responsivo quando o documento carregar
document.addEventListener('DOMContentLoaded', function() {
    handleResponsiveLayout();
    
    // Outros inicializadores aqui...
});

// Função para atualizar o preview da rubrica
function updateRubricPreview() {
    const rubricText = document.getElementById('rubricText').value || 'Rubrica';
    const fontFamily = document.getElementById('fontFamily').value;
    const rubricPreview = document.getElementById('rubricPreview');

    // Definir a fonte selecionada
    rubricPreview.style.fontFamily = fontFamily;
    rubricPreview.textContent = rubricText;

    // Usar fonte um pouco maior para a rubrica para melhor visualização
    const baseSize = 33; // Tamanho base um pouco menor que a assinatura
    const textLength = rubricText.length;
    let fontSize = baseSize;

    // Ajuste de tamanho baseado na quantidade de caracteres
    if (textLength > 3) {
        fontSize = baseSize - (textLength - 3) * 2;
        fontSize = Math.max(fontSize, 30); // Não deixar menor que 30px
    }

    rubricPreview.style.fontSize = `${fontSize}px`;
}

// Modificar a função updateSignaturePreview existente para também chamar updateRubricPreview
function updateSignaturePreview() {
    const signatureText = document.getElementById('signatureText').value || 'Prévia da Assinatura';
    const fontFamily = document.getElementById('fontFamily').value;
    const fontPreview = document.getElementById('fontPreview');

    // Definir a fonte selecionada
    fontPreview.style.fontFamily = fontFamily;
    fontPreview.textContent = signatureText;

    // Atualizar o tamanho da fonte dinamicamente com base no tamanho do texto
    const baseSize = 30; // Tamanho base da fonte
    const textLength = signatureText.length;
    let fontSize = baseSize;

    // Ajuste de tamanho baseado na quantidade de caracteres
    if (textLength > 15) {
        fontSize = baseSize - (textLength - 15) * 1.5;
        fontSize = Math.max(fontSize, 26); // Não deixar menor que 36px
    }

    fontPreview.style.fontSize = `${fontSize}px`;

    // Também atualiza o campo de entrada
    document.getElementById('signatureText').style.fontFamily = fontFamily;
    
    // Atualizar também a rubrica
    updateRubricPreview();
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

// Adicionar evento para o campo de rubrica quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Adicionar evento para os botões de fonte (existente no seu código)
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
        });
    });

    // Adicionar evento para o campo de texto da rubrica
    const rubricText = document.getElementById('rubricText');
    if (rubricText) {
        rubricText.addEventListener('input', updateRubricPreview);
    }

    // Inicializar os previews
    updateSignaturePreview();
    updateRubricPreview();
    
    // Definir um valor inicial para a rubrica baseado no nome (iniciais)
    const signatureText = document.getElementById('signatureText').value;
    if (signatureText && rubricText) {
        // Pegar as iniciais ou primeiros caracteres
        let initialValue = "";
        const nameParts = signatureText.trim().split(' ');
        if (nameParts.length >= 2) {
            // Iniciais do primeiro e último nome
            initialValue = nameParts[0].charAt(0) + nameParts[nameParts.length-1].charAt(0);
        } else if (nameParts.length === 1) {
            // Primeiros dois caracteres do nome
            initialValue = nameParts[0].substring(0, Math.min(2, nameParts[0].length));
        }
        rubricText.value = initialValue;
        updateRubricPreview();
    }
});