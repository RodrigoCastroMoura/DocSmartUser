// Preview da fonte em tempo real
const fontPreview = document.getElementById('fontPreview');
const signatureText = document.getElementById('signatureText');
const fontFamily = document.getElementById('fontFamily');

function updateFontPreview() {
    const selectedFont = fontFamily.value;
    const previewText = signatureText.value || 'Prévia da Fonte';
    fontPreview.style.fontFamily = selectedFont;
    fontPreview.textContent = previewText;
    signatureText.style.fontFamily = selectedFont;
}

fontFamily.addEventListener('change', updateFontPreview);
signatureText.addEventListener('input', updateFontPreview);

// Inicializar preview
document.addEventListener('DOMContentLoaded', () => {
    updateFontPreview();
});

// Gerenciamento do modal e seleção de opção
document.querySelectorAll('.signature-option').forEach(option => {
    option.addEventListener('click', function() {
        const optionType = this.dataset.option;
        const modal = bootstrap.Modal.getInstance(document.getElementById('chooseSignatureModal'));
        modal.hide();

        // Ocultar todas as seções
        document.querySelectorAll('.signature-section').forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById('resultArea').style.display = 'none';

        // Mostrar a seção selecionada
        if (optionType === 'draw') {
            document.getElementById('drawingArea').style.display = 'block';
            setTimeout(() => document.getElementById('drawingArea').classList.add('active'), 50);
        } else {
            document.getElementById('textArea').style.display = 'block';
            setTimeout(() => document.getElementById('textArea').classList.add('active'), 50);
        }
    });
});

// Botões para voltar à seleção
document.getElementById('changeOption').addEventListener('click', () => {
    document.getElementById('drawingArea').style.display = 'none';
    document.getElementById('resultArea').style.display = 'none';
    const modal = new bootstrap.Modal(document.getElementById('chooseSignatureModal'));
    modal.show();
});

document.getElementById('changeOptionText').addEventListener('click', () => {
    document.getElementById('textArea').style.display = 'none';
    document.getElementById('resultArea').style.display = 'none';
    const modal = new bootstrap.Modal(document.getElementById('chooseSignatureModal'));
    modal.show();
});


// Drawing signature functionality
const canvas = document.getElementById('signatureCanvas');
const ctx = canvas.getContext('2d');
let isDrawing = false;

// Set up drawing style
ctx.lineWidth = 3;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.strokeStyle = '#000000';

// Drawing event listeners
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

// Touch support for mobile devices
canvas.addEventListener('touchstart', handleTouch);
canvas.addEventListener('touchmove', handleTouch);
canvas.addEventListener('touchend', stopDrawing);

function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.beginPath();
    ctx.moveTo(
        (e.clientX - rect.left) * scaleX,
        (e.clientY - rect.top) * scaleY
    );
}

function draw(e) {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.lineTo(
        (e.clientX - rect.left) * scaleX,
        (e.clientY - rect.top) * scaleY
    );
    ctx.stroke();
}

function stopDrawing() {
    isDrawing = false;
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(
        e.type === 'touchstart' ? 'mousedown' : 'mousemove',
        {
            clientX: touch.clientX,
            clientY: touch.clientY
        }
    );
    canvas.dispatchEvent(mouseEvent);
}

// Clear canvas button
document.getElementById('clearCanvas').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// Generate PNG from drawing
document.getElementById('generatePNG').addEventListener('click', () => {
    const dataURL = canvas.toDataURL('image/png');
    displayResult(dataURL, 'assinatura-desenhada.png');
});

// Generate PNG from text
document.getElementById('generateTextPNG').addEventListener('click', () => {
    const text = document.getElementById('signatureText').value;
    const fontFamily = document.getElementById('fontFamily').value;
    const fontSize = document.getElementById('fontSize').value;
    const fontColor = document.getElementById('fontColor').value;

    if (!text) {
        alert('Por favor, digite seu nome');
        return;
    }

    // Create a temporary canvas for the text
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    // Set font properties
    const font = `${fontSize}px "${fontFamily}"`;
    tempCtx.font = font;

    // Measure text width to set canvas size
    const textMetrics = tempCtx.measureText(text);
    const textWidth = Math.ceil(textMetrics.width);
    const textHeight = Math.ceil(parseInt(fontSize) * 1.5);

    // Set canvas dimensions with padding
    tempCanvas.width = textWidth + 40;
    tempCanvas.height = textHeight + 20;

    // Clear canvas and redraw with the proper font
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.font = font;
    tempCtx.fillStyle = fontColor;
    tempCtx.textBaseline = 'middle';

    // Draw text centered
    tempCtx.fillText(text, 20, tempCanvas.height / 2);

    // Convert to PNG
    const dataURL = tempCanvas.toDataURL('image/png');
    displayResult(dataURL, 'assinatura-texto.png');
});

// Display the resulting PNG
function displayResult(dataURL, filename) {
    const resultArea = document.getElementById('resultArea');
    resultArea.style.display = 'block';

    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `<img src="${dataURL}" alt="Assinatura em PNG" class="img-fluid">`;

    const downloadDiv = document.getElementById('download-container');
    downloadDiv.innerHTML = `
        <p class="text-muted">Clique com o botão direito na imagem e selecione "Salvar imagem como" ou use este botão:</p>
        <a href="${dataURL}" download="${filename}" class="btn btn-success">
            <i class="bi bi-download"></i> Baixar Assinatura PNG
        </a>
    `;
}