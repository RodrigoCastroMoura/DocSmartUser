from flask import Blueprint, request, jsonify, current_app, session
from werkzeug.utils import secure_filename
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image
import pytesseract
import base64
import json
import os
import io
import time
from datetime import datetime
from functools import wraps
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Criar Blueprint para as rotas de assinatura
signatures_bp = Blueprint('signatures', __name__)

# Middleware para verificar autenticação
def verify_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'access_token' not in session:
            return jsonify({'error': 'Não autorizado'}), 401
        return f(*args, **kwargs)
    return decorated_function

# Rota para processar áreas de assinatura
@signatures_bp.route('/api/document/find-signature-areas', methods=['POST'])
@verify_auth
def find_signature_areas():
    """Encontra possíveis áreas de assinatura em um documento PDF."""
    try:
        data = request.json
        document_url = data.get('document_url')
        user_info = data.get('user_info')
        
        if not document_url or not user_info:
            return jsonify({'error': 'URL do documento e informações do usuário são obrigatórias'}), 400
        
        # Processar URL para obter o caminho do arquivo
        if document_url.startswith('/proxy/storage/'):
            document_path = document_url.replace('/proxy/storage/', '')
        else:
            # Extrair o ID do documento da URL
            doc_id = document_url.split('/')[-1]
            document_path = os.path.join(current_app.config['UPLOAD_FOLDER'], f"document_{doc_id}.pdf")
        
        if not os.path.exists(document_path):
            return jsonify({'error': 'Documento não encontrado'}), 404
        
        # Analisar o documento para áreas de assinatura
        signature_areas = process_document_for_signature_areas(document_path, user_info)
        
        return jsonify({
            'success': True,
            'signature_areas': signature_areas,
            'total_areas': len(signature_areas),
            'message': f'Encontradas {len(signature_areas)} áreas para assinatura'
        })
        
    except Exception as e:
        logger.error(f"Erro ao processar áreas de assinatura: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Rota para aplicar assinaturas ao documento
@signatures_bp.route('/api/document/apply-signatures', methods=['POST'])
@verify_auth
def apply_signatures():
    """Aplica assinaturas digitais ao documento PDF."""
    try:
        # Verificar se o documento e as assinaturas foram enviados
        if 'document_id' not in request.json or 'signatures' not in request.json:
            return jsonify({'error': 'ID do documento e assinaturas são obrigatórios'}), 400
        
        document_id = request.json['document_id']
        signatures_data = request.json['signatures']
        user_id = request.json.get('user_id', session.get('user_id'))
        
        if not document_id or not signatures_data or not user_id:
            return jsonify({'error': 'Dados incompletos'}), 400
        
        # Obter o caminho do documento
        document_path = os.path.join(current_app.config['UPLOAD_FOLDER'], f"document_{document_id}.pdf")
        if not os.path.exists(document_path):
            return jsonify({'error': 'Documento não encontrado'}), 404
        
        # Criar diretório para documentos assinados se não existir
        signed_docs_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'signed_documents')
        os.makedirs(signed_docs_dir, exist_ok=True)
        
        # Nome único para o arquivo assinado
        timestamp = int(time.time())
        signed_filename = f"signed_{document_id}_{user_id}_{timestamp}.pdf"
        signed_path = os.path.join(signed_docs_dir, signed_filename)
        
        # Processar o documento e aplicar as assinaturas
        result = process_signatures(document_path, signatures_data, signed_path)
        
        if result['success']:
            # Registrar a assinatura no banco de dados
            register_signed_document(
                user_id=user_id,
                document_id=document_id,
                signed_document=signed_filename,
                signature_count=len(signatures_data),
                ip_address=request.remote_addr
            )
            
            return jsonify({
                'success': True,
                'message': 'Documento assinado com sucesso',
                'signed_document_url': f"/signed_documents/{signed_filename}"
            })
        else:
            return jsonify({'error': result['message']}), 500
        
    except Exception as e:
        logger.error(f"Erro ao aplicar assinaturas: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Funções auxiliares

def process_document_for_signature_areas(document_path, user_info):
    """
    Processa um documento PDF para encontrar possíveis áreas de assinatura.
    """
    signature_areas = []
    
    try:
        # Abrir o arquivo PDF
        with open(document_path, 'rb') as file:
            pdf = PdfReader(file)
            
            # Para cada página do PDF
            for page_num in range(len(pdf.pages)):
                page = pdf.pages[page_num]
                
                # Extrair texto da página
                text = page.extract_text()
                
                # Palavras-chave que podem indicar áreas de assinatura
                signature_keywords = ['assinar', 'assinatura', 'assinado', 'firma', 'certificado', 
                                     'contratante', 'responsável', 'testemunha']
                
                # Dividir o nome do usuário para busca
                user_name_parts = user_info['name'].lower().split()
                
                lines = text.split('\n')
                for i, line in enumerate(lines):
                    line_lower = line.lower()
                    
                    # Verificar se a linha contém palavras-chave de assinatura
                    contains_signature_keyword = any(keyword in line_lower for keyword in signature_keywords)
                    
                    # Verificar se a linha contém partes do nome do usuário
                    contains_user_name = any(part in line_lower for part in user_name_parts)
                    
                    # Verificar se a linha contém underscores, traços ou pontos (possíveis linhas)
                    contains_line_indicator = '____' in line or '----' in line or '....' in line
                    
                    if contains_signature_keyword or contains_user_name or contains_line_indicator:
                        # Estimar posição vertical baseada na posição da linha no texto
                        mediabox = page.mediabox
                        width = float(mediabox.width)
                        height = float(mediabox.height)
                        
                        # Estimar Y baseado na posição da linha no texto
                        y_ratio = 1.0 - (i / max(len(lines), 1))
                        y_position = height * y_ratio
                        
                        # Adicionar área de assinatura
                        signature_areas.append({
                            'page_num': page_num,
                            'x': width * 0.1,  # 10% da largura
                            'y': y_position,
                            'width': width * 0.3,  # 30% da largura
                            'height': height * 0.05,  # 5% da altura
                            'text': line
                        })
            
            # Adicionar áreas de rubrica em todas as páginas sem assinatura
            pages_with_signatures = set(area['page_num'] for area in signature_areas)
            for page_num in range(len(pdf.pages)):
                if page_num not in pages_with_signatures:
                    page = pdf.pages[page_num]
                    mediabox = page.mediabox
                    width = float(mediabox.width)
                    height = float(mediabox.height)
                    
                    # Adicionar área de rubrica no canto inferior direito
                    signature_areas.append({
                        'page_num': page_num,
                        'x': width * 0.8,  # 80% da largura (canto direito)
                        'y': height * 0.9,  # 90% da altura (parte inferior)
                        'width': width * 0.15,  # 15% da largura
                        'height': height * 0.07,  # 7% da altura
                        'text': 'Rubrica',
                        'is_initials': True
                    })
        
        return signature_areas
    
    except Exception as e:
        logger.error(f"Erro ao processar documento para áreas de assinatura: {str(e)}")
        return []

def process_signatures(document_path, signatures_data, output_path):
    """
    Processa o documento PDF e aplica as assinaturas nas áreas especificadas.
    """
    try:
        # Ler o PDF original
        pdf_reader = PdfReader(document_path)
        pdf_writer = PdfWriter()
        
        # Organizar assinaturas por página
        signatures_by_page = {}
        for sig in signatures_data:
            page_num = int(sig['page_num'])
            if page_num not in signatures_by_page:
                signatures_by_page[page_num] = []
            signatures_by_page[page_num].append(sig)
        
        # Processar cada página
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            
            # Se não há assinaturas para esta página, adicionar sem modificação
            if page_num not in signatures_by_page:
                pdf_writer.add_page(page)
                continue
            
            # Criar um buffer para desenhar as assinaturas
            packet = io.BytesIO()
            can = canvas.Canvas(packet, pagesize=(page.mediabox.width, page.mediabox.height))
            
            # Adicionar cada assinatura à página
            for sig in signatures_by_page[page_num]:
                # Decodificar a imagem da assinatura de base64
                sig_img_data = sig['signature_image'].split(',')[1]
                sig_img_bytes = base64.b64decode(sig_img_data)
                
                # Criar objeto de imagem
                img = ImageReader(io.BytesIO(sig_img_bytes))
                
                # Desenhar a assinatura no canvas
                can.drawImage(
                    img, 
                    float(sig['x']), 
                    float(sig['y']), 
                    width=float(sig['width']), 
                    height=float(sig['height']),
                    mask='auto'
                )
            
            can.save()
            
            # Mover para o início do buffer
            packet.seek(0)
            overlay = PdfReader(packet)
            
            # Mesclar a página original com a overlay
            page.merge_page(overlay.pages[0])
            
            # Adicionar a página modificada ao PDF de saída
            pdf_writer.add_page(page)
        
        # Salvar o PDF com assinaturas
        with open(output_path, 'wb') as output_file:
            pdf_writer.write(output_file)
        
        return {'success': True, 'message': 'Assinaturas aplicadas com sucesso'}
    
    except Exception as e:
        logger.error(f"Erro ao processar assinaturas: {str(e)}")
        return {'success': False, 'message': str(e)}

def register_signed_document(user_id, document_id, signed_document, signature_count, ip_address):
    """
    Registra o documento assinado para fins de auditoria.
    
    Nota: Em uma implementação real, você usaria seu ORM ou conexão de banco de dados.
    Esta é uma implementação simplificada para demonstração.
    """
    signed_doc = {
        'user_id': user_id,
        'document_id': document_id,
        'signed_document': signed_document,
        'signature_count': signature_count,
        'ip_address': ip_address,
        'timestamp': datetime.now().isoformat()
    }
    
    # Exemplo de log (substitua pelo seu método de persistência)
    logger.info(f"Documento assinado registrado: {json.dumps(signed_doc)}")
    
    # Na implementação real, você salvaria no banco de dados:
    # db.session.add(SignedDocument(**signed_doc))
    # db.session.commit()
    
    return True

# Registrar o blueprint no app principal
def init_app(app):
    app.register_blueprint(signatures_bp)