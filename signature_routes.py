<<<<<<< HEAD
from flask import Blueprint, request, jsonify, current_app
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
=======
from flask import Blueprint, request, jsonify
>>>>>>> 80d37553feb96d164faf50d25836806d1b245929
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

signature_bp = Blueprint('signature', __name__)

@signature_bp.route('/api/document/find-signature-areas', methods=['POST'])
def find_signature_areas():
    """
    Detecta áreas para assinatura em um documento PDF
    """
    try:
        data = request.get_json()
        document_url = data.get('document_url')
        user_info = data.get('user_info')
        document_id = data.get('document_id')
        
        logger.info(f"Solicitação de detecção de assinatura para documento: {document_id}")
        
        # Em um sistema real, aqui você usaria uma biblioteca como PyPDF2 ou 
        # um serviço de AI para detectar áreas para assinatura no documento
        
        # Por enquanto, retornamos áreas simuladas
        signature_areas = [
            {
                "x": 100,
                "y": 150,
                "width": 200,
                "height": 50,
                "page_num": 1,
                "signature_text": "Assinatura do contratante"
            },
            {
                "x": 100,
                "y": 300,
                "width": 200,
                "height": 50,
                "page_num": 1,
                "signature_text": "Assinatura do responsável"
            }
        ]
        
        return jsonify({
            "success": True,
            "message": "Áreas de assinatura detectadas com sucesso",
            "signature_areas": signature_areas
        })
        
    except Exception as e:
        logger.error(f"Erro ao detectar áreas de assinatura: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Erro ao processar documento: {str(e)}"
        }), 500

@signature_bp.route('/api/document/apply-signatures', methods=['POST'])
def apply_signatures():
    """
    Aplica assinaturas ao documento
    """
    try:
        data = request.get_json()
        document_id = data.get('document_id')
        signatures = data.get('signatures', [])
        user_id = data.get('user_id')
        
        logger.info(f"Aplicando assinaturas ao documento {document_id} pelo usuário {user_id}")
        
        # Em um sistema real, aqui você aplicaria as assinaturas ao PDF
        # e salvaria a versão assinada
        
        return jsonify({
            "success": True,
            "message": "Assinaturas aplicadas com sucesso",
            "signed_document_url": f"https://example.com/documents/{document_id}/signed"
        })
        
    except Exception as e:
        logger.error(f"Erro ao aplicar assinaturas: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Erro ao aplicar assinaturas: {str(e)}"
        }), 500

<<<<<<< HEAD
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
=======
>>>>>>> 80d37553feb96d164faf50d25836806d1b245929
def init_app(app):
    """
    Inicializa as rotas de assinatura no app Flask
    """
    app.register_blueprint(signature_bp)
    logger.info("Rotas de assinatura inicializadas")