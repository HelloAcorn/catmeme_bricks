from flask import Flask, render_template, request, jsonify
import os
import base64
from PIL import Image
import io
import json

app = Flask(__name__)

# 파일 업로드 설정
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB 최대 파일 크기

def pixelize_image(image_data, grid_size=16):
    """이미지를 그리드 크기로 픽셀화하는 함수"""
    try:
        # base64 데이터에서 이미지 생성
        image_bytes = base64.b64decode(image_data.split(',')[1])
        image = Image.open(io.BytesIO(image_bytes))
        
        # 이미지를 RGBA 모드로 변환
        image = image.convert('RGBA')
        
        # 그리드 크기로 리사이즈 (픽셀화)
        small_image = image.resize((grid_size, grid_size), Image.Resampling.NEAREST)
        
        # 픽셀 데이터 추출
        pixels = []
        for y in range(grid_size):
            row = []
            for x in range(grid_size):
                r, g, b, a = small_image.getpixel((x, y))
                
                # 투명한 픽셀이거나 거의 투명한 픽셀은 0으로 처리
                if a < 128:
                    row.append(None)
                else:
                    # RGB 값을 hex 색상으로 변환
                    hex_color = f"#{r:02x}{g:02x}{b:02x}"
                    row.append({
                        'color': hex_color,
                        'r': r,
                        'g': g,
                        'b': b,
                        'a': a
                    })
            pixels.append(row)
        
        return pixels
        
    except Exception as e:
        print(f"이미지 픽셀화 오류: {e}")
        return None

@app.route('/')
def index():
    """메인 페이지 - 벽돌깨기 게임"""
    return render_template('index.html')

@app.route('/upload_image', methods=['POST'])
def upload_image():
    """이미지 업로드 및 픽셀화 처리"""
    try:
        data = request.get_json()
        image_data = data.get('image')
        grid_size = data.get('grid_size', 16)  # 기본값 16x16
        
        if not image_data:
            return jsonify({'error': '이미지 데이터가 없습니다.'}), 400
        
        # 이미지 픽셀화
        pixel_data = pixelize_image(image_data, grid_size)
        
        if pixel_data is None:
            return jsonify({'error': '이미지 처리 중 오류가 발생했습니다.'}), 500
        
        return jsonify({
            'success': True,
            'pixel_data': pixel_data,
            'grid_size': grid_size
        })
        
    except Exception as e:
        print(f"업로드 처리 오류: {e}")
        return jsonify({'error': '서버 오류가 발생했습니다.'}), 500

if __name__ == '__main__':
    # 개발 환경에서 실행
    app.run(debug=True, host='0.0.0.0', port=5000) 