// 🚀 SpatialGrid 클래스 제거 - 단순한 충돌 감지로 변경

// 🚀 게임 객체 기본 클래스
class GameObject {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.active = true;
    }
    
    // 충돌 영역 반환 (AABB - Axis-Aligned Bounding Box)
    getBounds() {
        return {
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height,
            centerX: this.x + this.width / 2,
            centerY: this.y + this.height / 2
        };
    }
    
    // 다른 GameObject와의 충돌 감지
    intersects(other) {
        const thisBounds = this.getBounds();
        const otherBounds = other.getBounds();
        
        return thisBounds.left < otherBounds.right &&
               thisBounds.right > otherBounds.left &&
               thisBounds.top < otherBounds.bottom &&
               thisBounds.bottom > otherBounds.top;
    }
    
    // 점과의 충돌 감지
    containsPoint(x, y) {
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }
}

// 🚀 공 클래스
class Ball extends GameObject {
    constructor(x, y, radius, speed) {
        super(x - radius, y - radius, radius * 2, radius * 2);
        this.radius = radius;
        this.speed = speed;
        this.dx = speed;
        this.dy = -speed;
        this.originalX = x;
        this.originalY = y;
    }
    
    // 공의 중심 좌표
    get centerX() { return this.x + this.radius; }
    get centerY() { return this.y + this.radius; }
    
    set centerX(value) { this.x = value - this.radius; }
    set centerY(value) { this.y = value - this.radius; }
    
    // 원형 충돌 영역 반환
    getBounds() {
        return {
            centerX: this.centerX,
            centerY: this.centerY,
            radius: this.radius,
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height
        };
    }
    
    // 사각형과의 충돌 감지 (개선된 원-사각형 충돌)
    intersectsRect(rect) {
        const bounds = this.getBounds();
        const rectBounds = rect.getBounds();
        
        // 가장 가까운 점 찾기
        const closestX = Math.max(rectBounds.left, Math.min(bounds.centerX, rectBounds.right));
        const closestY = Math.max(rectBounds.top, Math.min(bounds.centerY, rectBounds.bottom));
        
        // 거리 계산
        const dx = bounds.centerX - closestX;
        const dy = bounds.centerY - closestY;
        
        return (dx * dx + dy * dy) <= (bounds.radius * bounds.radius);
    }
    
    // 공 이동
    move() {
        this.centerX += this.dx;
        this.centerY += this.dy;
    }
    
    // 벽 반사
    bounceWalls(canvasWidth, canvasHeight) {
        if (this.centerX + this.radius > canvasWidth || this.centerX - this.radius < 0) {
            this.dx = -this.dx;
        }
        if (this.centerY - this.radius < 0) {
            this.dy = -this.dy;
        }
    }
    
    // 패들 반사 (각도 조정 포함)
    bounceOffPaddle(paddle) {
        const paddleBounds = paddle.getBounds();
        const hitPos = (this.centerX - paddleBounds.left) / paddle.width;
        const angle = (hitPos - 0.5) * Math.PI / 3; // -60도 ~ 60도
        
        this.dx = Math.sin(angle) * this.speed;
        this.dy = -Math.cos(angle) * this.speed;
        
        // 공을 패들 위로 밀어내어 중복 충돌 방지
        this.centerY = paddleBounds.top - this.radius;
    }
    
    // 벽돌과의 충돌 처리
    bounceOffBrick(brick) {
        const bounds = this.getBounds();
        const brickBounds = brick.getBounds();
        
        const ballCenterX = bounds.centerX;
        const ballCenterY = bounds.centerY;
        const brickCenterX = brickBounds.centerX;
        const brickCenterY = brickBounds.centerY;
        
        const deltaX = ballCenterX - brickCenterX;
        const deltaY = ballCenterY - brickCenterY;
        
        // 겹친 영역 계산
        const overlapX = (bounds.radius + brick.width / 2) - Math.abs(deltaX);
        const overlapY = (bounds.radius + brick.height / 2) - Math.abs(deltaY);
        
        // 더 작은 겹침이 충돌 방향을 결정
        if (overlapX < overlapY) {
            // 좌우 충돌
            this.dx = -this.dx;
            // 공을 벽돌에서 밀어내기
            if (deltaX > 0) {
                this.centerX = brickBounds.right + bounds.radius;
            } else {
                this.centerX = brickBounds.left - bounds.radius;
            }
        } else {
            // 상하 충돌
            this.dy = -this.dy;
            // 공을 벽돌에서 밀어내기
            if (deltaY > 0) {
                this.centerY = brickBounds.bottom + bounds.radius;
            } else {
                this.centerY = brickBounds.top - bounds.radius;
            }
        }
    }
    
    // 화면 밖으로 나갔는지 확인
    isOutOfBounds(canvasHeight) {
        return this.centerY + this.radius > canvasHeight;
    }
    
    // 공 복제 (같은 위치에서 다른 방향으로)
    clone(angle) {
        const newBall = new Ball(this.centerX, this.centerY, this.radius, this.speed);
        newBall.dx = Math.cos(angle) * this.speed;
        newBall.dy = Math.sin(angle) * this.speed;
        return newBall;
    }
}

// 🚀 패들 클래스
class Paddle extends GameObject {
    constructor(x, y, width, height, speed) {
        super(x, y, width, height);
        this.speed = speed;
    }
    
    // 패들 이동 (화면 경계 체크 포함)
    moveTo(x, canvasWidth) {
        this.x = Math.max(0, Math.min(canvasWidth - this.width, x - this.width / 2));
    }
    
    // 공과의 충돌 감지
    intersectsBall(ball) {
        const ballBounds = ball.getBounds();
        const paddleBounds = this.getBounds();
        
        return ballBounds.centerY + ballBounds.radius > paddleBounds.top &&
               ballBounds.centerX > paddleBounds.left &&
               ballBounds.centerX < paddleBounds.right;
    }
}

// 🚀 벽돌 클래스
class Brick extends GameObject {
    constructor(x, y, width, height, color, pixelType = null, isIndestructible = false) {
        super(x, y, width, height);
        this.color = color;
        this.pixelType = pixelType;
        this.isIndestructible = isIndestructible;
        this.status = 1; // 1: 활성, 0: 파괴됨
        this.originalPixel = null;
    }
    
    // 벽돌 파괴
    destroy() {
        if (!this.isIndestructible) {
            this.status = 0;
            this.active = false;
            return true;
        }
        return false;
    }
    
    // 벽돌이 활성 상태인지 확인
    isActive() {
        return this.status === 1 && this.active;
    }
    
    // 공과의 충돌 감지
    intersectsBall(ball) {
        if (!this.isActive()) return false;
        return ball.intersectsRect(this);
    }
}

// 🚀 아이템 클래스
class Item extends GameObject {
    constructor(x, y, radius, type, color) {
        super(x - radius, y - radius, radius * 2, radius * 2);
        this.radius = radius;
        this.type = type;
        this.color = color;
        this.dy = 1.5; // 떨어지는 속도
        this.glowIntensity = 0;
    }
    
    // 아이템의 중심 좌표
    get centerX() { return this.x + this.radius; }
    get centerY() { return this.y + this.radius; }
    
    set centerX(value) { this.x = value - this.radius; }
    set centerY(value) { this.y = value - this.radius; }
    
    // 원형 충돌 영역 반환
    getBounds() {
        return {
            centerX: this.centerX,
            centerY: this.centerY,
            radius: this.radius,
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height
        };
    }
    
    // 아이템 이동
    move() {
        this.centerY += this.dy;
        this.glowIntensity = (Math.sin(Date.now() * 0.01) + 1) * 0.5;
    }
    
    // 화면 밖으로 나갔는지 확인
    isOutOfBounds(canvasHeight) {
        return this.centerY > canvasHeight + this.radius;
    }
    
    // 패들과의 충돌 감지
    intersectsPaddle(paddle) {
        const itemBounds = this.getBounds();
        const paddleBounds = paddle.getBounds();
        
        return itemBounds.centerX + itemBounds.radius > paddleBounds.left &&
               itemBounds.centerX - itemBounds.radius < paddleBounds.right &&
               itemBounds.centerY + itemBounds.radius > paddleBounds.top &&
               itemBounds.centerY - itemBounds.radius < paddleBounds.bottom;
    }
}

// 🚀 충돌 감지 전용 클래스
class CollisionDetector {
    static detectBallWallCollision(ball, canvasWidth, canvasHeight) {
        ball.bounceWalls(canvasWidth, canvasHeight);
    }
    
    static detectBallPaddleCollision(ball, paddle) {
        if (paddle.intersectsBall(ball)) {
            ball.bounceOffPaddle(paddle);
            return true;
        }
        return false;
    }
    
    static detectBallBrickCollision(ball, brick) {
        if (brick.intersectsBall(ball)) {
            ball.bounceOffBrick(brick);
            return brick.destroy(); // 벽돌이 파괴되었는지 반환
        }
        return false;
    }
    
    static detectItemPaddleCollision(item, paddle) {
        return item.intersectsPaddle(paddle);
    }
}

// 🚀 파티클 클래스
class Particle {
    constructor(x, y, dx, dy, life, color, type = 'normal') {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.type = type;
    }
    
    update() {
        this.x += this.dx;
        this.y += this.dy;
        this.life--;
    }
    
    isAlive() {
        return this.life > 0;
    }
    
    getAlpha() {
        return this.life / this.maxLife;
    }
}

class BrickBreakerGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 게임 상수
        this.MAX_BALLS = 150; // 최대 공 개수 제한
        
        // 게임 상태
        this.gameState = 'stopped'; // 'stopped', 'playing', 'paused', 'gameOver'
        
        // 게임 객체들 (동적 크기 조정을 위해 기본값 설정)
        this.defaultBallRadius = 4;
        this.defaultPaddleWidth = 300; 
        this.defaultPaddleHeight = 16; 
        this.defaultSpeed = 3;
        
        // 🚀 게임 객체들을 클래스 인스턴스로 변경
        this.paddle = new Paddle(
            this.canvas.width / 2 - this.defaultPaddleWidth / 2,
            this.canvas.height - 25,
            this.defaultPaddleWidth,
            this.defaultPaddleHeight,
            8
        );
        
        this.ball = new Ball(
            this.canvas.width / 2,
            this.canvas.height / 2,
            this.defaultBallRadius,
            this.defaultSpeed
        );
        
        this.bricks = [];
        this.particles = [];
        
        // 🚀 아이템 시스템
        this.items = [];
        this.balls = [this.ball]; // 여러 공 관리를 위한 배열
        
        // 이미지 처리 관련
        this.currentPixelData = null;
        this.previewCanvas = document.getElementById('previewCanvas');
        this.previewCtx = this.previewCanvas.getContext('2d');
        
        // 밈 비디오 요소들
        this.chipychipyVideo = document.getElementById('chipychipyVideo');
        this.huhVideo = document.getElementById('huhVideo');
        this.currentVideo = 'chipychipy'; // 현재 재생 중인 비디오
        this.videosEnabled = false; // 비디오 재생 가능 여부
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
        this.setupImageUpload();
        
        // 초기 벽돌 생성
        this.createBricks();
        
        // 초기 비디오 설정
        this.setupInitialVideo();
        
        // 게임 루프 시작
        this.gameLoop();
    }

    setupImageUpload() {
        const imageUpload = document.getElementById('imageUpload');
        const gridSizeSelect = document.getElementById('gridSize');
        const resetBtn = document.getElementById('resetToDefault');
        
        // 이미지 업로드 이벤트
        imageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.processImageFile(file);
            }
        });
        
        // 그리드 크기 변경 이벤트
        gridSizeSelect.addEventListener('change', (e) => {
            const newGridSize = parseInt(e.target.value);
            
            if (this.currentImageFile) {
                // 이미지 파일이 있으면 새로운 그리드 크기로 다시 처리
                this.processImageFile(this.currentImageFile);
            } else if (this.currentPixelData) {
                // 픽셀 데이터가 있지만 파일이 없는 경우 (업로드된 이미지)
                const imageUpload = document.getElementById('imageUpload');
                if (imageUpload.files[0]) {
                    this.processImageFile(imageUpload.files[0]);
                }
            } else {
                // 이미지가 업로드되지 않은 상태: 그리드 크기에 따라 게임 요소 크기 조정
                this.handleGridSizeChangeWithoutImage(newGridSize);
            }
        });
        
        // 기본 패턴으로 리셋
        resetBtn.addEventListener('click', () => {
            this.currentPixelData = null;
            this.currentImageFile = null;
            this.createBricks();
            this.clearPreview();
            imageUpload.value = '';
            
            // 기본 크기로 게임 요소 리셋
            this.resetToDefaultSizes();
        });
    }

    processImageFile(file) {
        this.currentImageFile = file;
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const gridSize = parseInt(document.getElementById('gridSize').value);
            this.uploadImageToServer(e.target.result, gridSize);
        };
        
        reader.readAsDataURL(file);
    }

    async uploadImageToServer(imageData, gridSize) {
        const loadingModal = document.getElementById('loadingModal');
        loadingModal.style.display = 'block';
        
        try {
            const response = await fetch('/upload_image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: imageData,
                    grid_size: gridSize
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentPixelData = result.pixel_data;
                this.createBricksFromPixels(result.pixel_data);
                this.drawPixelPreview(result.pixel_data);
            } else {
                alert('이미지 처리 실패: ' + result.error);
            }
        } catch (error) {
            console.error('업로드 오류:', error);
            alert('서버 연결 오류가 발생했습니다.');
        } finally {
            loadingModal.style.display = 'none';
        }
    }

    createBricksFromPixels(pixelData) {
        this.bricks = [];
        
        const gridSize = pixelData.length;
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // 벽돌이 들어갈 영역 계산 (새로운 캔버스 비율에 맞게 조정)
        const gameAreaHeight = canvasHeight * 0.6; // 세로가 더 길어졌으므로 비율 조정
        const maxBrickSize = Math.min(canvasWidth * 0.8 / gridSize, gameAreaHeight / gridSize);
        const brickWidth = maxBrickSize;
        const brickHeight = maxBrickSize;
        
        // 중앙 정렬을 위한 시작점 계산
        const totalWidth = gridSize * brickWidth;
        const totalHeight = gridSize * brickHeight;
        const startX = (canvasWidth - totalWidth) / 2;
        const startY = 50; // 상단 여백
        
        // 1단계: 먼저 테두리 블록들을 생성 (테두리에 픽셀이 있는 경우에만)
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const isEdgeBlock = (row === 0 || row === gridSize - 1 || col === 0 || col === gridSize - 1);
                const pixelColor = pixelData[row][col];
                
                // 가장 아래 중간 블록들을 제외 (공이 들어갈 틈을 만들기 위해)
                // 그리드 크기에 따라 틈의 크기를 조정
                let gapSize = 1; // 기본값
                if (gridSize === 32) {
                    gapSize = 2; // 32x32일 때 2칸
                } else if (gridSize === 64) {
                    gapSize = 4; // 64x64일 때 4칸
                }
                
                const centerCol = Math.floor(gridSize / 2);
                const halfGap = Math.floor(gapSize / 2);
                const gapStart = centerCol - halfGap;
                const gapEnd = centerCol + halfGap + (gapSize % 2) - 1;
                
                const isBottomGap = (row === gridSize - 1 && col >= gapStart && col <= gapEnd);
                
                if (isEdgeBlock && pixelColor && !isBottomGap) {
                    // 테두리 블록: 짙은 회색으로 변경
                    const brick = new Brick(
                        col * brickWidth + startX,
                        row * brickHeight + startY,
                        brickWidth - 1,
                        brickHeight - 1,
                        '#404040', // 짙은 회색
                        'border', // 테두리 블록임을 표시
                        true // 테두리 블록은 깨지지 않음
                    );
                    brick.originalPixel = pixelColor;
                    this.bricks.push(brick);
                }
            }
        }
        
        // 2단계: 테두리가 아닌 내부 블록들을 생성
        for (let row = 1; row < gridSize - 1; row++) {
            for (let col = 1; col < gridSize - 1; col++) {
                const pixelColor = pixelData[row][col];
                
                // null이 아닌 픽셀만 내부 벽돌로 생성
                if (pixelColor) {
                    const brick = new Brick(
                        col * brickWidth + startX,
                        row * brickHeight + startY,
                        brickWidth - 1,
                        brickHeight - 1,
                        pixelColor.color, // 원본 색상 유지
                        'user', // 사용자 이미지 픽셀임을 표시
                        false // 내부 블록은 깨질 수 있음
                    );
                    brick.originalPixel = pixelColor;
                    this.bricks.push(brick);
                }
            }
        }
        
        // 벽돌 생성 후 게임 요소 크기 동적 조정
        this.updateGameElementSizes(brickWidth);
    }

    drawPixelPreview(pixelData) {
        const gridSize = pixelData.length;
        const cellSize = this.previewCanvas.width / gridSize;
        
        // 캔버스 클리어
        this.previewCtx.fillStyle = '#f8f9fa';
        this.previewCtx.fillRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        
        // 픽셀 그리기
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const pixelColor = pixelData[row][col];
                
                if (pixelColor) {
                    this.previewCtx.fillStyle = pixelColor.color;
                    this.previewCtx.fillRect(
                        col * cellSize,
                        row * cellSize,
                        cellSize,
                        cellSize
                    );
                }
                
                // 격자 그리기
                this.previewCtx.strokeStyle = '#ddd';
                this.previewCtx.lineWidth = 1;
                this.previewCtx.strokeRect(
                    col * cellSize,
                    row * cellSize,
                    cellSize,
                    cellSize
                );
            }
        }
    }

    clearPreview() {
        this.previewCtx.fillStyle = '#f8f9fa';
        this.previewCtx.fillRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        
        // 안내 텍스트 그리기
        this.previewCtx.fillStyle = '#666';
        this.previewCtx.font = '14px Arial';
        this.previewCtx.textAlign = 'center';
        this.previewCtx.fillText('이미지 미리보기', this.previewCanvas.width / 2, this.previewCanvas.height / 2);
    }

    handleGridSizeChangeWithoutImage(gridSize) {
        // 이미지가 없을 때 그리드 크기 변경 처리
        // 기본 냥캣 패턴을 유지하되, 게임 요소들의 크기를 조정
        
        try {
            // 현재 게임 상태 확인
            const wasPlaying = this.gameState === 'playing';
            
            // 게임 일시 정지 (크기 조정 중)
            if (wasPlaying) {
                this.gameState = 'paused';
            }
            
            // 그리드 크기에 따른 적절한 벽돌 크기 계산
            let brickWidth, brickHeight, cellSize;
            
            switch(gridSize) {
                case 8:
                    brickWidth = 35;
                    brickHeight = 25;
                    cellSize = 80; // 큰 벽돌용
                    break;
                case 16:
                    brickWidth = 20;
                    brickHeight = 15;
                    cellSize = 60; // 기본 크기
                    break;
                case 32:
                    brickWidth = 12;
                    brickHeight = 9;
                    cellSize = 40; // 작은 벽돌용
                    break;
                case 64:
                    brickWidth = 8;
                    brickHeight = 6;
                    cellSize = 30; // 매우 작은 벽돌용
                    break;
                default:
                    brickWidth = 20;
                    brickHeight = 15;
                    cellSize = 60;
            }
            
            // 게임 요소 크기 업데이트
            this.updateGameElementSizes(brickWidth);
            
            // 기본 벽돌 패턴 재생성
            this.createDefaultBricks();
            
            // 공 위치 리셋 (크기가 변경되었으므로)
            this.resetBall();
            
            // 게임 상태 복원
            if (wasPlaying) {
                this.gameState = 'playing';
            }
            
            // 프리뷰 캔버스 클리어 (이미지가 없으므로)
            this.clearPreview();
            
            console.log(`✅ 그리드 크기 ${gridSize}x${gridSize}로 게임 요소 크기 조정 완료`);
            
        } catch (error) {
            console.error('그리드 크기 변경 중 오류 발생:', error);
            
            // 오류 발생 시 기본값으로 복원
            this.resetToDefaultSizes();
            this.createDefaultBricks();
            this.resetBall();
            
            // 사용자에게 알림 (선택사항)
            // alert('그리드 크기 변경 중 오류가 발생했습니다. 기본 설정으로 복원됩니다.');
        }
    }

    // 🚀 색상 인덱스를 실제 색상으로 변환하는 메소드 추가
    getColorFromIndex(colorIndex) {
        // 냥캣 색상 팔레트
        const nyanColors = {
            0: null, // 빈 공간
            1: '#000000', // 검은색 테두리
            2: '#FFB6C1', // 분홍색 팝타르트 베이스
            3: '#FF69B4', // 진한 분홍색 팝타르트 도트
            4: '#808080', // 회색 고양이 머리/몸
            5: '#FFFFFF', // 흰색 (눈 흰자)
            6: '#000000', // 검은색 (눈동자)
            7: '#FF1493', // 분홍색 (볼)
            8: '#8B4513', // 갈색 (입)
            9: '#FF0000', // 빨간색 무지개
            10: '#FF8C00', // 주황색 무지개
            11: '#FFD700', // 노란색 무지개
            12: '#32CD32', // 초록색 무지개
            13: '#00BFFF', // 하늘색 무지개
            14: '#8A2BE2', // 보라색 무지개
        };
        return nyanColors[colorIndex] || '#FFFFFF';
    }

    updateGameElementSizes(brickSize) {
        // 벽돌 크기에 따라 동적으로 게임 요소 크기 조정
        const scaleFactor = Math.max(0.3, Math.min(1.0, brickSize / 20)); // 기준 벽돌 크기 20px
        
        // 공 크기: 벽돌 크기의 25-35%, 최소 2px, 최대 8px
        const newBallRadius = Math.max(2, Math.min(8, brickSize * 0.3));
        
        // 패들 크기: 공 크기에 비례, 2배로 더 길게 조정
        const paddleWidthMultiplier = Math.max(40, Math.min(80, newBallRadius * 40)); // 2배로 증가
        const newPaddleWidth = paddleWidthMultiplier;
        const newPaddleHeight = Math.max(8, Math.min(24, newBallRadius * 3)); // 높이도 2배
        
        // 🚀 향상된 속도 계산: 공의 크기에 비례하여 시각적 속도감을 일정하게 유지
        const radiusRatio = newBallRadius / this.defaultBallRadius; // 기본 공 크기 대비 비율
        
        // 시각적 속도 = 실제 속도 × 공의 크기 비율
        // 큰 공일수록 더 빠르게 움직여야 같은 속도감을 유지
        const visualSpeedMultiplier = Math.pow(radiusRatio, 0.8); // 지수를 0.8로 조정하여 과도하지 않게
        
        // 추가 밸런스 조정: 너무 작거나 큰 경우 제한
        const balancedMultiplier = Math.max(0.5, Math.min(2.0, visualSpeedMultiplier));
        
        const newSpeed = this.defaultSpeed * balancedMultiplier;
        
        // 게임 요소 업데이트
        this.ball.radius = newBallRadius;
        this.ball.speed = newSpeed;
        this.ball.width = newBallRadius * 2;
        this.ball.height = newBallRadius * 2;
        
        // 현재 공이 움직이고 있다면 속도도 조정
        if (this.gameState === 'playing') {
            const currentDirection = {
                x: Math.sign(this.ball.dx),
                y: Math.sign(this.ball.dy)
            };
            this.ball.dx = currentDirection.x * newSpeed;
            this.ball.dy = currentDirection.y * newSpeed;
        }
        
        // 패들 크기 조정 (위치는 중앙 유지)
        const oldPaddleCenterX = this.paddle.x + this.paddle.width / 2;
        this.paddle.width = newPaddleWidth;
        this.paddle.height = newPaddleHeight;
        this.paddle.x = oldPaddleCenterX - this.paddle.width / 2;
        
        // 패들이 화면 밖으로 나가지 않도록 조정
        this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.paddle.width, this.paddle.x));
        
        console.log(`🎮 동적 크기 조정: 벽돌=${brickSize.toFixed(1)}px, 공=${newBallRadius}px (×${radiusRatio.toFixed(2)}), 패들=${newPaddleWidth}x${newPaddleHeight}px, 속도=${newSpeed.toFixed(2)} (×${balancedMultiplier.toFixed(2)})`);
        console.log(`⚡ 시각적 속도감 최적화: 기본속도=${this.defaultSpeed} → 조정속도=${newSpeed.toFixed(2)} (공 크기에 비례)`);
    }

    resetToDefaultSizes() {
        // 기본 크기로 게임 요소 리셋
        this.ball.radius = this.defaultBallRadius;
        this.ball.speed = this.defaultSpeed;
        this.ball.width = this.defaultBallRadius * 2;
        this.ball.height = this.defaultBallRadius * 2;
        
        // 현재 공이 움직이고 있다면 속도도 기본값으로 조정
        if (this.gameState === 'playing') {
            const currentDirection = {
                x: Math.sign(this.ball.dx),
                y: Math.sign(this.ball.dy)
            };
            this.ball.dx = currentDirection.x * this.defaultSpeed;
            this.ball.dy = currentDirection.y * this.defaultSpeed;
        }
        
        // 패들 크기 기본값으로 리셋 (위치는 중앙 유지)
        const oldPaddleCenterX = this.paddle.x + this.paddle.width / 2;
        this.paddle.width = this.defaultPaddleWidth;
        this.paddle.height = this.defaultPaddleHeight;
        this.paddle.x = oldPaddleCenterX - this.paddle.width / 2;
        
        // 패들이 화면 밖으로 나가지 않도록 조정
        this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.paddle.width, this.paddle.x));
        
        console.log(`🔄 기본 크기로 리셋: 공=${this.defaultBallRadius}px, 패들=${this.defaultPaddleWidth}x${this.defaultPaddleHeight}px, 속도=${this.defaultSpeed}`);
    }

    setupInitialVideo() {
        // 초기에는 chipychipy 비디오를 보여주되 일시정지 상태
        this.chipychipyVideo.style.display = 'block';
        this.huhVideo.style.display = 'none';
        this.chipychipyVideo.pause();
        this.huhVideo.pause();
        
        // 미리보기 캔버스 초기화
        this.clearPreview();
    }

    async enableVideos() {
        if (this.videosEnabled) return;
        
        try {
            // 비디오 재생 시작
            await this.chipychipyVideo.play();
            await this.huhVideo.play();
            this.videosEnabled = true;
            console.log('비디오 재생이 활성화되었습니다! 🔊');
        } catch (error) {
            console.log('비디오 자동재생이 차단되었습니다. 사용자 상호작용이 필요합니다.');
            this.videosEnabled = false;
        }
    }

    setupEventListeners() {
        // 마우스 이동으로 패들 조작
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.gameState === 'playing') {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                this.paddle.moveTo(mouseX, this.canvas.width);
            }
        });

        // 터치 이벤트 (모바일 지원)
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.gameState === 'playing') {
                const rect = this.canvas.getBoundingClientRect();
                const touch = e.touches[0];
                const touchX = touch.clientX - rect.left;
                this.paddle.moveTo(touchX, this.canvas.width);
            }
        });

        // 키보드 이벤트
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                
                if (this.gameState === 'stopped') {
                    // 게임 시작
                    this.startGame();
                } else if (this.gameState === 'gameOver') {
                    // 게임 재시작
                    this.resetGame();
                } else {
                    // 일시정지/재개
                    this.togglePause();
                }
            }
        });

        // 캔버스 클릭으로도 게임 시작 또는 비디오 활성화
        this.canvas.addEventListener('click', () => {
            if (this.gameState === 'stopped') {
                this.startGame();
            } else if (!this.videosEnabled) {
                this.enableVideos();
            }
        });

        // 캔버스 터치 이벤트 (모바일)
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.gameState === 'stopped') {
                this.startGame();
            } else if (!this.videosEnabled) {
                this.enableVideos();
            }
        });

        // 재시작 버튼 이벤트
        const restartButton = document.getElementById('restartButton');
        if (restartButton) {
            restartButton.addEventListener('click', () => {
                this.resetGame();
            });
        }
    }

    async startGame() {
        // 비디오 활성화
        await this.enableVideos();
        
        // 게임 시작
        this.gameState = 'playing';
        this.resetBall();
    }

    createBricks() {
        // 사용자 이미지가 있으면 그것을 사용, 없으면 기본 패턴 사용
        if (this.currentPixelData) {
            this.createBricksFromPixels(this.currentPixelData);
        } else {
            this.createDefaultBricks();
        }
    }



    createDefaultBricks() {
        this.bricks = [];
        
        // 냥캣 픽셀아트 패턴 (제공된 이미지 참고)
        // 0 = 빈공간, 1-12 = 다른 색상의 벽돌
        const nyanCatPattern = [
            [0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0],
            [0,0,0,0,1,1,2,2,2,2,2,2,2,2,2,2,1,1,0,0,0,0],
            [0,0,0,1,2,2,2,3,2,3,2,2,2,3,2,3,2,2,1,0,0,0],
            [0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0],
            [0,1,2,2,2,3,2,2,3,2,2,2,3,2,2,3,2,2,2,2,1,0],
            [1,4,4,4,4,4,4,4,2,2,2,2,2,4,4,4,4,4,4,4,4,1],
            [1,4,5,5,4,6,6,4,2,7,2,2,7,4,5,5,4,6,6,4,4,1],
            [1,4,5,5,4,6,6,4,2,2,8,8,2,4,5,5,4,6,6,4,4,1],
            [1,4,4,4,4,4,4,4,2,2,2,2,2,4,4,4,4,4,4,4,4,1],
            [0,1,4,4,4,4,4,4,2,2,2,2,2,4,4,4,4,4,4,4,1,0],
            [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
            [0,0,0,0,1,9,9,9,9,9,9,9,9,9,9,9,9,9,1,0,0,0],
            [0,0,0,0,1,10,10,10,10,10,10,10,10,10,10,10,10,10,1,0,0,0],
            [0,0,0,0,1,11,11,11,11,11,11,11,11,11,11,11,11,11,1,0,0,0],
            [0,0,0,0,1,12,12,12,12,12,12,12,12,12,12,12,12,12,1,0,0,0],
            [0,0,0,0,1,13,13,13,13,13,13,13,13,13,13,13,13,13,1,0,0,0],
            [0,0,0,0,1,14,14,14,14,14,14,14,14,14,14,14,14,14,1,0,0,0],
            [0,0,0,0,0,1,1,1,1,0,0,0,1,1,1,1,1,1,1,0,0,0]
        ];
        
        // 냥캣 색상 팔레트 (실제 냥캣 이미지 참고)
        const nyanColors = {
            0: null, // 빈 공간
            1: '#000000', // 검은색 테두리
            2: '#FFB6C1', // 분홍색 팝타르트 베이스
            3: '#FF69B4', // 진한 분홍색 팝타르트 도트
            4: '#808080', // 회색 고양이 머리/몸
            5: '#FFFFFF', // 흰색 (눈 흰자)
            6: '#000000', // 검은색 (눈동자)
            7: '#FF1493', // 분홍색 (볼)
            8: '#8B4513', // 갈색 (입)
            9: '#FF0000', // 빨간색 무지개
            10: '#FF8C00', // 주황색 무지개
            11: '#FFD700', // 노란색 무지개
            12: '#32CD32', // 초록색 무지개
            13: '#00BFFF', // 하늘색 무지개
            14: '#8A2BE2', // 보라색 무지개
        };
        
        const brickWidth = 20;   // 더 작게 조정
        const brickHeight = 15;  // 더 작게 조정
        const brickPadding = 1;  // 간격을 좁혀서 더 조밀하게
        
        // 중앙 정렬을 위한 시작점 계산
        const totalPatternWidth = (nyanCatPattern[0].length) * (brickWidth + brickPadding);
        const startX = (this.canvas.width - totalPatternWidth) / 2;
        const startY = 50;       // 상단 여백
        
        for (let row = 0; row < nyanCatPattern.length; row++) {
            for (let col = 0; col < nyanCatPattern[row].length; col++) {
                const colorIndex = nyanCatPattern[row][col];
                
                // 빈 공간이 아닌 경우에만 벽돌 생성
                if (colorIndex !== 0) {
                    const brick = new Brick(
                        col * (brickWidth + brickPadding) + startX,
                        row * (brickHeight + brickPadding) + startY,
                        brickWidth,
                        brickHeight,
                        nyanColors[colorIndex],
                        colorIndex,
                        colorIndex === 1 // 검은색 테두리만 깨지지 않음
                    );
                    this.bricks.push(brick);
                }
            }
        }
        
        // 기본 벽돌 생성 후에도 게임 요소 크기 조정 (기본 크기 기준)
        this.updateGameElementSizes(brickWidth);
    }

    getLowestBrickY() {
        let lowestY = 0;
        for (let brick of this.bricks) {
            if (brick.isActive()) {
                lowestY = Math.max(lowestY, brick.y + brick.height);
            }
        }
        return lowestY;
    }

    async updateVideoBasedOnBallPosition() {
        if (!this.videosEnabled) return;
        
        const lowestBrickY = this.getLowestBrickY();
        
        // 공이 가장 아래 블록보다 위에 있으면 chipychipy, 아래에 있으면 huh
        if (this.ball.centerY < lowestBrickY) {
            if (this.currentVideo !== 'chipychipy') {
                this.currentVideo = 'chipychipy';
                this.huhVideo.pause();
                this.chipychipyVideo.style.display = 'block';
                this.huhVideo.style.display = 'none';
                try {
                    await this.chipychipyVideo.play();
                } catch (error) {
                    console.log('chipychipy 비디오 재생 실패:', error);
                }
            }
        } else {
            if (this.currentVideo !== 'huh') {
                this.currentVideo = 'huh';
                this.chipychipyVideo.pause();
                this.chipychipyVideo.style.display = 'none';
                this.huhVideo.style.display = 'block';
                try {
                    await this.huhVideo.play();
                } catch (error) {
                    console.log('huh 비디오 재생 실패:', error);
                }
            }
        }
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            // 일시정지 시 비디오도 일시정지
            this.chipychipyVideo.pause();
            this.huhVideo.pause();
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            // 재개 시 현재 비디오 다시 재생
            if (this.videosEnabled) {
                if (this.currentVideo === 'chipychipy') {
                    this.chipychipyVideo.play().catch(console.error);
                } else {
                    this.huhVideo.play().catch(console.error);
                }
            }
        }
    }

    resetGame() {
        this.gameState = 'playing';
        this.resetBall();
        this.createBricks();
        this.particles = [];
        
        // 🚀 아이템 시스템 초기화
        this.items = [];
        this.balls = [this.ball]; // 공 하나로 다시 시작
        
        this.hideGameOverModal();
        
        // 비디오를 초기 상태로 리셋
        this.currentVideo = 'chipychipy';
        this.chipychipyVideo.style.display = 'block';
        this.huhVideo.style.display = 'none';
        
        // 비디오 재개
        if (this.videosEnabled) {
            this.chipychipyVideo.play().catch(console.error);
        }
    }

    resetBall() {
        this.ball.centerX = this.canvas.width / 2;
        this.ball.centerY = this.canvas.height - 50; // 하단으로 시작점 변경
        // 현재 설정된 속도를 사용 (크기에 따라 조정된 속도)
        this.ball.dx = (Math.random() > 0.5 ? 1 : -1) * this.ball.speed;
        this.ball.dy = -this.ball.speed;
        
        console.log(`⚽ 공 리셋: 위치=(${this.ball.centerX.toFixed(0)}, ${this.ball.centerY.toFixed(0)}), 속도=${this.ball.speed.toFixed(1)}, 방향=(${this.ball.dx.toFixed(1)}, ${this.ball.dy.toFixed(1)})`);
    }

    update() {
        // 항상 공의 위치에 따라 비디오 업데이트 (게임이 진행 중일 때만)
        if (this.gameState === 'playing') {
            this.updateVideoBasedOnBallPosition();
        }
        
        if (this.gameState !== 'playing') return;

        // 🚀 모든 공들을 업데이트
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const ball = this.balls[i];
            
            // 공 이동
            ball.move();

            // 벽 충돌 감지
            CollisionDetector.detectBallWallCollision(ball, this.canvas.width, this.canvas.height);

            // 공이 바닥에 떨어졌을 때
            if (ball.isOutOfBounds(this.canvas.height)) {
                this.balls.splice(i, 1); // 해당 공 제거
                
                // 모든 공이 떨어지면 게임 오버
                if (this.balls.length === 0) {
                    this.gameOver();
                    return;
                }
                continue;
            }

            // 패들과 공 충돌 감지
            CollisionDetector.detectBallPaddleCollision(ball, this.paddle);
        }

        // 메인 공 업데이트 (첫 번째 공이 메인 공)
        if (this.balls.length > 0) {
            this.ball = this.balls[0];
        }

        // 🚀 모든 공들에 대해 단순하고 확실한 벽돌 충돌 감지
        for (let ball of this.balls) {
            // 모든 활성 벽돌에 대해 충돌 검사 (확실하고 안전한 방법)
            for (let brick of this.bricks) {
                if (brick.isActive() && brick.intersectsBall(ball)) {
                    // 충돌 발생! 공을 튕겨보내기
                    ball.bounceOffBrick(brick);
                    
                    // 벽돌이 깨질 수 있는지 확인
                    if (brick.destroy()) {
                        // 벽돌이 파괴됨 - 파티클 효과와 아이템 생성
                        this.createParticles(brick.x + brick.width/2, brick.y + brick.height/2, brick.color);
                        this.createX3Item(brick.x + brick.width/2, brick.y + brick.height/2);
                    } else {
                        // 깨지지 않는 블록 - 특별한 파티클 효과
                        this.createIndestructibleParticles(brick.x + brick.width/2, brick.y + brick.height/2);
                    }
                    
                    // 하나의 벽돌과 충돌하면 다른 벽돌들은 확인하지 않음 (성능 최적화)
                    break;
                }
            }
        }

        // 깨질 수 있는 모든 벽돌을 깨면 게임 승리 (테두리 블록 제외)
        const destructibleBricks = this.bricks.filter(brick => !brick.isIndestructible && brick.pixelType !== 'border');
        if (destructibleBricks.length > 0 && destructibleBricks.every(brick => !brick.isActive())) {
            this.gameWin();
            return;
        }

        // 파티클 업데이트
        this.updateParticles();
        
        // 🚀 아이템 업데이트
        this.updateItems();
    }

    createParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push(new Particle(
                x,
                y,
                (Math.random() - 0.5) * 6,
                (Math.random() - 0.5) * 6,
                30,
                color,
                'normal'
            ));
        }
    }

    createIndestructibleParticles(x, y) {
        for (let i = 0; i < 6; i++) {
            this.particles.push(new Particle(
                x,
                y,
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 4,
                20,
                '#FFD700', // 금색 반짝임
                'indestructible'
            ));
        }
    }

    // 🚀 x3 아이템 생성 (30% 확률)
    createX3Item(x, y) {
        if (Math.random() < 0.3) { // 30% 확률
            this.items.push(new Item(
                x,
                y,
                8,
                'x3',
                '#00FF00' // 초록색
            ));
            console.log('🎁 x3 아이템 생성!');
        }
    }

    // 🚀 공 복제 함수 (최대 50개 제한)
    multiplyBalls() {
        if (this.balls.length >= this.MAX_BALLS) {
            console.log(`⚽ 공 복제 취소: 이미 최대 개수(${this.MAX_BALLS}개)에 도달했습니다.`);
            return;
        }
        
        const currentBalls = [...this.balls]; // 현재 공들의 복사본
        const newBalls = [];
        
        for (let ball of currentBalls) {
            // 원본 공은 유지하고 2개를 추가해서 총 3배가 되도록
            for (let i = 0; i < 2; i++) {
                // 최대 개수를 초과하지 않도록 체크
                if (this.balls.length + newBalls.length >= this.MAX_BALLS) {
                    console.log(`⚽ 공 복제 중단: 최대 개수(${this.MAX_BALLS}개) 도달`);
                    break;
                }
                
                const angle = (Math.PI * 2 / 3) * (i + 1); // 120도씩 분산
                const speed = ball.speed || this.ball.speed;
                
                newBalls.push(ball.clone(angle));
            }
            
            // 외부 루프에서도 최대 개수 체크
            if (this.balls.length + newBalls.length >= this.MAX_BALLS) {
                break;
            }
        }
        
        this.balls.push(...newBalls);
        console.log(`⚽ 공 복제 완료! ${currentBalls.length}개 → ${this.balls.length}개 (최대: ${this.MAX_BALLS}개)`);
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update();
            
            if (!particle.isAlive()) {
                this.particles.splice(i, 1);
            }
        }
    }

    // 🚀 아이템 업데이트
    updateItems() {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            
            if (!item.active) continue;
            
            // 아이템이 아래로 떨어짐
            item.move();
            
            // 화면 밖으로 나가면 제거
            if (item.isOutOfBounds(this.canvas.height)) {
                this.items.splice(i, 1);
                continue;
            }
            
            // 패들과 충돌 감지
            if (item.type === 'x3' && CollisionDetector.detectItemPaddleCollision(item, this.paddle)) {
                // x3 아이템 획득!
                this.multiplyBalls();
                item.active = false;
                this.items.splice(i, 1);
                
                // 획득 효과
                this.createItemCollectEffect(item.centerX, item.centerY);
            }
        }
    }



    // 🚀 아이템 획득 효과
    createItemCollectEffect(x, y) {
        for (let i = 0; i < 12; i++) {
            this.particles.push(new Particle(
                x,
                y,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
                40,
                '#00FF00',
                'item_collect'
            ));
        }
    }

    draw() {
        // 캔버스 클리어
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 패들 그리기
        const gradient1 = this.ctx.createLinearGradient(0, this.paddle.y, 0, this.paddle.y + this.paddle.height);
        gradient1.addColorStop(0, '#4ECDC4');
        gradient1.addColorStop(1, '#44A08D');
        this.ctx.fillStyle = gradient1;
        this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);

        // 🚀 모든 공들 그리기
        for (let ball of this.balls) {
            const gradient2 = this.ctx.createRadialGradient(ball.centerX, ball.centerY, 0, ball.centerX, ball.centerY, ball.radius);
            gradient2.addColorStop(0, '#FFE66D');
            gradient2.addColorStop(1, '#FF6B6B');
            this.ctx.fillStyle = gradient2;
            this.ctx.beginPath();
            this.ctx.arc(ball.centerX, ball.centerY, ball.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // 벽돌 그리기
        for (let brick of this.bricks) {
            if (brick.isActive()) {
                // 깨지지 않는 블록이면 특별한 색상 효과 추가
                if (brick.isIndestructible) {
                    // 금속 느낌의 그라데이션 배경
                    const gradient = this.ctx.createLinearGradient(brick.x, brick.y, brick.x + brick.width, brick.y + brick.height);
                    gradient.addColorStop(0, this.lightenColor(brick.color, 0.4));
                    gradient.addColorStop(0.5, brick.color);
                    gradient.addColorStop(1, this.darkenColor(brick.color, 0.4));
                    this.ctx.fillStyle = gradient;
                } else {
                    // 일반 색상
                    this.ctx.fillStyle = brick.color;
                }
                this.ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
                
                // 사용자 이미지 픽셀인지 기본 패턴인지에 따라 다른 효과 적용
                if (brick.pixelType === 'border') {
                    // 테두리 블록: 특별한 금속 효과
                    const intensity = 0.6; // 더 강한 효과
                    
                    const highlightSize = Math.max(1, Math.floor(brick.width * 0.15));
                    const shadowSize = Math.max(1, Math.floor(brick.width * 0.15));
                    
                    // 상단과 좌측에 밝은 하이라이트 (더 밝게)
                    this.ctx.fillStyle = this.lightenColor(brick.color, intensity);
                    this.ctx.fillRect(brick.x, brick.y, brick.width, highlightSize);
                    this.ctx.fillRect(brick.x, brick.y, highlightSize, brick.height);
                    
                    // 하단과 우측에 어두운 그림자 (더 어둡게)
                    this.ctx.fillStyle = this.darkenColor(brick.color, intensity);
                    this.ctx.fillRect(brick.x, brick.y + brick.height - shadowSize, brick.width, shadowSize);
                    this.ctx.fillRect(brick.x + brick.width - shadowSize, brick.y, shadowSize, brick.height);
                    
                    // 금속 느낌의 반짝임 추가
                    this.ctx.fillStyle = 'rgba(200, 200, 200, 0.4)'; // 은색 반짝임
                    const sparkleSize = Math.max(2, Math.floor(brick.width * 0.2));
                    this.ctx.fillRect(brick.x + sparkleSize, brick.y + sparkleSize, sparkleSize, sparkleSize);
                    this.ctx.fillRect(brick.x + brick.width - sparkleSize * 2, brick.y + brick.height - sparkleSize * 2, sparkleSize, sparkleSize);
                } else if (brick.pixelType === 'user') {
                    // 사용자 이미지 픽셀: 간단한 3D 효과
                    const highlightSize = Math.max(1, Math.floor(brick.width * 0.1));
                    const shadowSize = Math.max(1, Math.floor(brick.width * 0.1));
                    
                    // 깨지지 않는 블록이면 더 강한 효과
                    const intensity = brick.isIndestructible ? 0.5 : 0.3;
                    
                    // 상단과 좌측에 밝은 하이라이트
                    this.ctx.fillStyle = this.lightenColor(brick.color, intensity);
                    this.ctx.fillRect(brick.x, brick.y, brick.width, highlightSize);
                    this.ctx.fillRect(brick.x, brick.y, highlightSize, brick.height);
                    
                    // 하단과 우측에 어두운 그림자
                    this.ctx.fillStyle = this.darkenColor(brick.color, intensity);
                    this.ctx.fillRect(brick.x, brick.y + brick.height - shadowSize, brick.width, shadowSize);
                    this.ctx.fillRect(brick.x + brick.width - shadowSize, brick.y, shadowSize, brick.height);
                    
                    // 깨지지 않는 블록에 금속 느낌의 반짝임 추가
                    if (brick.isIndestructible) {
                        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)'; // 금색 반짝임
                        const sparkleSize = Math.max(2, Math.floor(brick.width * 0.15));
                        this.ctx.fillRect(brick.x + sparkleSize, brick.y + sparkleSize, sparkleSize, sparkleSize);
                        this.ctx.fillRect(brick.x + brick.width - sparkleSize * 2, brick.y + brick.height - sparkleSize * 2, sparkleSize, sparkleSize);
                    }
                } else {
                    // 기본 냥캣 패턴: 기존 특별 효과들
                    if (brick.pixelType !== 1 && brick.pixelType !== 6) { // 검은색이 아닌 경우
                        // 상단과 좌측에 밝은 하이라이트
                        this.ctx.fillStyle = this.lightenColor(brick.color, 0.2);
                        this.ctx.fillRect(brick.x, brick.y, brick.width, 2); // 상단
                        this.ctx.fillRect(brick.x, brick.y, 2, brick.height); // 좌측
                        
                        // 하단과 우측에 어두운 그림자
                        this.ctx.fillStyle = this.darkenColor(brick.color, 0.2);
                        this.ctx.fillRect(brick.x, brick.y + brick.height - 2, brick.width, 2); // 하단
                        this.ctx.fillRect(brick.x + brick.width - 2, brick.y, 2, brick.height); // 우측
                    }
                    
                    // 특별한 벽돌들에 추가 효과
                    if (brick.pixelType === 5) { // 눈 흰자에 반짝임 효과
                        this.ctx.fillStyle = '#FFFFFF';
                        this.ctx.fillRect(brick.x + brick.width - 6, brick.y + 2, 3, 3);
                    } else if (brick.pixelType === 7) { // 볼에 하이라이트
                        this.ctx.fillStyle = '#FFB6D9';
                        this.ctx.fillRect(brick.x + 2, brick.y + 2, 4, 4);
                    } else if (brick.pixelType === 3) { // 팝타르트 도트에 광택
                        this.ctx.fillStyle = '#FFCCCB';
                        this.ctx.fillRect(brick.x + 1, brick.y + 1, 3, 3);
                    } else if (brick.pixelType >= 9 && brick.pixelType <= 14) { // 무지개에 반짝임
                        if (Math.random() < 0.3) { // 30% 확률로 반짝임
                            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                            this.ctx.fillRect(brick.x + 2, brick.y + 2, 4, 4);
                        }
                    }
                }
                
                // 픽셀아트 느낌의 테두리 (블록 타입에 따라 다르게)
                if (brick.pixelType === 'border') {
                    this.ctx.strokeStyle = '#202020'; // 더 짙은 회색 테두리
                    this.ctx.lineWidth = 2;
                } else if (brick.isIndestructible) {
                    this.ctx.strokeStyle = '#FFD700'; // 금색 테두리
                    this.ctx.lineWidth = 2;
                } else {
                    this.ctx.strokeStyle = '#000000';
                    this.ctx.lineWidth = 1;
                }
                this.ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
            }
        }

        // 🚀 아이템들 그리기
        for (let item of this.items) {
            if (!item.active) continue;
            
            if (item.type === 'x3') {
                // x3 아이템 글로우 효과
                const glowAlpha = 0.3 + item.glowIntensity * 0.4;
                
                // 외부 글로우
                const glowGradient = this.ctx.createRadialGradient(
                    item.centerX, item.centerY, 0,
                    item.centerX, item.centerY, item.radius * 2
                );
                glowGradient.addColorStop(0, `rgba(0, 255, 0, ${glowAlpha})`);
                glowGradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
                this.ctx.fillStyle = glowGradient;
                this.ctx.beginPath();
                this.ctx.arc(item.centerX, item.centerY, item.radius * 2, 0, Math.PI * 2);
                this.ctx.fill();
                
                // 아이템 본체
                this.ctx.fillStyle = item.color;
                this.ctx.beginPath();
                this.ctx.arc(item.centerX, item.centerY, item.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // x3 텍스트
                this.ctx.fillStyle = 'white';
                this.ctx.font = 'bold 10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('x3', item.centerX, item.centerY + 3);
            }
        }

        // 파티클 그리기
        for (let particle of this.particles) {
            const alpha = particle.getAlpha();
            
            if (particle.type === 'indestructible') {
                // 깨지지 않는 블록 파티클: 반짝이는 효과
                this.ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
                this.ctx.fillRect(particle.x - 1, particle.y - 1, 5, 5);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
                this.ctx.fillRect(particle.x, particle.y, 3, 3);
            } else if (particle.type === 'item_collect') {
                // 아이템 획득 파티클: 더 큰 초록색 반짝임
                this.ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`;
                this.ctx.fillRect(particle.x - 2, particle.y - 2, 6, 6);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
                this.ctx.fillRect(particle.x - 1, particle.y - 1, 4, 4);
            } else {
                // 일반 파티클
                this.ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
                this.ctx.fillRect(particle.x, particle.y, 3, 3);
            }
        }

        // 게임 상태 텍스트
        if (this.gameState === 'stopped') {
            this.drawCenterText('🎮 벽돌깨기 게임 🎮', 32, '#FFE66D', -50);
            this.drawCenterText('화면을 클릭하여 시작하세요!', 24, '#4ECDC4', 0);
            this.drawCenterText('마우스나 터치로 패들을 조작하세요', 18, '#96CEB4', 30);
        } else if (this.gameState === 'paused') {
            this.drawCenterText('일시정지', 36, '#FFE66D');
            this.drawCenterText('화면을 클릭하여 재개', 18, '#FFE66D', 40);
        }
        
        // 게임 플레이 중 공 개수 표시
        if (this.gameState === 'playing') {
            this.ctx.fillStyle = '#FFE66D';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`공: ${this.balls.length}/${this.MAX_BALLS}`, 10, 30);
        }
    }

    drawCenterText(text, fontSize, color, offsetY = 0) {
        this.ctx.font = `${fontSize}px Arial`;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2 + offsetY);
    }

    gameOver() {
        this.gameState = 'gameOver';
        // 게임오버 시 비디오 일시정지
        this.chipychipyVideo.pause();
        this.huhVideo.pause();
        document.getElementById('gameOverTitle').textContent = '게임 오버!';
        document.getElementById('gameOverModal').style.display = 'block';
    }

    gameWin() {
        this.gameState = 'gameWin';
        // 게임 승리 시 비디오 일시정지
        this.chipychipyVideo.pause();
        this.huhVideo.pause();
        document.getElementById('gameOverTitle').textContent = '성공!';
        document.getElementById('gameOverModal').style.display = 'block';
    }

    hideGameOverModal() {
        document.getElementById('gameOverModal').style.display = 'none';
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    lightenColor(color, amount) {
        // hex 색상을 RGB로 변환
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // 밝게 만들기
        const newR = Math.min(255, Math.floor(r + (255 - r) * amount));
        const newG = Math.min(255, Math.floor(g + (255 - g) * amount));
        const newB = Math.min(255, Math.floor(b + (255 - b) * amount));
        
        return `rgb(${newR},${newG},${newB})`;
    }

    darkenColor(color, amount) {
        // hex 색상을 RGB로 변환
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // 어둡게 만들기
        const newR = Math.max(0, Math.floor(r * (1 - amount)));
        const newG = Math.max(0, Math.floor(g * (1 - amount)));
        const newB = Math.max(0, Math.floor(b * (1 - amount)));
        
        return `rgb(${newR},${newG},${newB})`;
    }
}

// 게임 시작
document.addEventListener('DOMContentLoaded', () => {
    new BrickBreakerGame();
}); 