class BrickBreakerGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 게임 상태
        this.gameState = 'stopped'; // 'stopped', 'playing', 'paused', 'gameOver'
        
        // 게임 객체들 (동적 크기 조정을 위해 기본값 설정)
        this.defaultBallRadius = 4;
        this.defaultPaddleWidth = 150; // 더 길게 조정
        this.defaultPaddleHeight = 8;
        this.defaultSpeed = 3;
        
        this.paddle = {
            x: this.canvas.width / 2 - this.defaultPaddleWidth / 2,
            y: this.canvas.height - 25,
            width: this.defaultPaddleWidth,
            height: this.defaultPaddleHeight,
            speed: 8
        };
        
        this.ball = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            radius: this.defaultBallRadius,
            dx: this.defaultSpeed,
            dy: -this.defaultSpeed,
            speed: this.defaultSpeed
        };
        
        this.bricks = [];
        this.particles = [];
        
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
            if (this.currentImageFile) {
                this.processImageFile(this.currentImageFile);
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
                
                if (isEdgeBlock && pixelColor) {
                    // 테두리 블록: 짙은 회색으로 변경
                    const brick = {
                        x: col * brickWidth + startX,
                        y: row * brickHeight + startY,
                        width: brickWidth - 1,
                        height: brickHeight - 1,
                        status: 1,
                        color: '#404040', // 짙은 회색
                        pixelType: 'border', // 테두리 블록임을 표시
                        originalPixel: pixelColor,
                        isIndestructible: true // 테두리 블록은 깨지지 않음
                    };
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
                    const brick = {
                        x: col * brickWidth + startX,
                        y: row * brickHeight + startY,
                        width: brickWidth - 1,
                        height: brickHeight - 1,
                        status: 1,
                        color: pixelColor.color, // 원본 색상 유지
                        pixelType: 'user', // 사용자 이미지 픽셀임을 표시
                        originalPixel: pixelColor,
                        isIndestructible: false // 내부 블록은 깨질 수 있음
                    };
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

    updateGameElementSizes(brickSize) {
        // 벽돌 크기에 따라 동적으로 게임 요소 크기 조정
        const scaleFactor = Math.max(0.3, Math.min(1.0, brickSize / 20)); // 기준 벽돌 크기 20px
        
        // 공 크기: 벽돌 크기의 25-35%, 최소 2px, 최대 8px
        const newBallRadius = Math.max(2, Math.min(8, brickSize * 0.3));
        
        // 패들 크기: 공 크기에 비례, 더 길게 조정
        const paddleWidthMultiplier = Math.max(20, Math.min(40, newBallRadius * 20)); // 더 길게
        const newPaddleWidth = paddleWidthMultiplier;
        const newPaddleHeight = Math.max(4, Math.min(12, newBallRadius * 1.5));
        
        // 속도: 크기가 작을수록 약간 빠르게 (게임 밸런스)
        const speedMultiplier = Math.max(0.7, Math.min(1.5, 1.2 - scaleFactor * 0.5));
        const newSpeed = this.defaultSpeed * speedMultiplier;
        
        // 게임 요소 업데이트
        this.ball.radius = newBallRadius;
        this.ball.speed = newSpeed;
        
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
        const oldPaddleX = this.paddle.x + this.paddle.width / 2;
        this.paddle.width = newPaddleWidth;
        this.paddle.height = newPaddleHeight;
        this.paddle.x = oldPaddleX - this.paddle.width / 2;
        
        // 패들이 화면 밖으로 나가지 않도록 조정
        this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.paddle.width, this.paddle.x));
        
        console.log(`🎮 동적 크기 조정: 벽돌=${brickSize.toFixed(1)}px, 공=${newBallRadius}px, 패들=${newPaddleWidth}x${newPaddleHeight}px, 속도=${newSpeed.toFixed(1)}`);
    }

    resetToDefaultSizes() {
        // 기본 크기로 게임 요소 리셋
        this.ball.radius = this.defaultBallRadius;
        this.ball.speed = this.defaultSpeed;
        
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
        const oldPaddleX = this.paddle.x + this.paddle.width / 2;
        this.paddle.width = this.defaultPaddleWidth;
        this.paddle.height = this.defaultPaddleHeight;
        this.paddle.x = oldPaddleX - this.paddle.width / 2;
        
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
                this.paddle.x = mouseX - this.paddle.width / 2;
                
                // 패들이 캔버스 밖으로 나가지 않도록 제한
                this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.paddle.width, this.paddle.x));
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
            [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0]
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
                    const brick = {
                        x: col * (brickWidth + brickPadding) + startX,
                        y: row * (brickHeight + brickPadding) + startY,
                        width: brickWidth,
                        height: brickHeight,
                        status: 1,
                        color: nyanColors[colorIndex],
                        pixelType: colorIndex // 픽셀 타입 저장
                    };
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
            if (brick.status === 1) {
                lowestY = Math.max(lowestY, brick.y + brick.height);
            }
        }
        return lowestY;
    }

    async updateVideoBasedOnBallPosition() {
        if (!this.videosEnabled) return;
        
        const lowestBrickY = this.getLowestBrickY();
        
        // 공이 가장 아래 블록보다 위에 있으면 chipychipy, 아래에 있으면 huh
        if (this.ball.y < lowestBrickY) {
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
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        // 현재 설정된 속도를 사용 (동적 크기 조정에 의해 변경된 속도)
        this.ball.dx = (Math.random() > 0.5 ? 1 : -1) * this.ball.speed;
        this.ball.dy = -this.ball.speed;
    }

    update() {
        // 항상 공의 위치에 따라 비디오 업데이트 (게임이 진행 중일 때만)
        if (this.gameState === 'playing') {
            this.updateVideoBasedOnBallPosition();
        }
        
        if (this.gameState !== 'playing') return;

        // 공 이동
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;

        // 벽 충돌 감지
        if (this.ball.x + this.ball.radius > this.canvas.width || this.ball.x - this.ball.radius < 0) {
            this.ball.dx = -this.ball.dx;
        }
        if (this.ball.y - this.ball.radius < 0) {
            this.ball.dy = -this.ball.dy;
        }

        // 공이 바닥에 떨어졌을 때
        if (this.ball.y + this.ball.radius > this.canvas.height) {
            this.gameOver();
            return;
        }

        // 패들과 공 충돌 감지
        if (this.ball.y + this.ball.radius > this.paddle.y &&
            this.ball.x > this.paddle.x &&
            this.ball.x < this.paddle.x + this.paddle.width) {
            
            // 패들의 어느 부분에 맞았는지에 따라 각도 조정
            const hitPos = (this.ball.x - this.paddle.x) / this.paddle.width;
            const angle = (hitPos - 0.5) * Math.PI / 3; // -60도 ~ 60도
            
            this.ball.dx = Math.sin(angle) * this.ball.speed;
            this.ball.dy = -Math.cos(angle) * this.ball.speed;
        }

        // 벽돌과 공 충돌 감지
        for (let brick of this.bricks) {
            if (brick.status === 1) {
                if (this.ball.x > brick.x &&
                    this.ball.x < brick.x + brick.width &&
                    this.ball.y > brick.y &&
                    this.ball.y < brick.y + brick.height) {
                    
                    this.ball.dy = -this.ball.dy;
                    
                    // 깨지지 않는 블록이 아닌 경우에만 파괴
                    if (!brick.isIndestructible) {
                        brick.status = 0;
                        // 파티클 효과 생성
                        this.createParticles(brick.x + brick.width/2, brick.y + brick.height/2, brick.color);
                    } else {
                        // 깨지지 않는 블록에 부딪혔을 때 특별한 효과
                        this.createIndestructibleParticles(brick.x + brick.width/2, brick.y + brick.height/2);
                    }
                }
            }
        }

        // 깨질 수 있는 모든 벽돌을 깨면 다시 시작 (테두리 블록 제외)
        const destructibleBricks = this.bricks.filter(brick => !brick.isIndestructible && brick.pixelType !== 'border');
        if (destructibleBricks.length > 0 && destructibleBricks.every(brick => brick.status === 0)) {
            this.createBricks();
            this.resetBall();
        }

        // 파티클 업데이트
        this.updateParticles();
    }

    createParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                dx: (Math.random() - 0.5) * 6,
                dy: (Math.random() - 0.5) * 6,
                life: 30,
                maxLife: 30,
                color: color,
                type: 'normal'
            });
        }
    }

    createIndestructibleParticles(x, y) {
        for (let i = 0; i < 6; i++) {
            this.particles.push({
                x: x,
                y: y,
                dx: (Math.random() - 0.5) * 4,
                dy: (Math.random() - 0.5) * 4,
                life: 20,
                maxLife: 20,
                color: '#FFD700', // 금색 반짝임
                type: 'indestructible'
            });
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.dx;
            particle.y += particle.dy;
            particle.life--;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
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

        // 공 그리기
        const gradient2 = this.ctx.createRadialGradient(this.ball.x, this.ball.y, 0, this.ball.x, this.ball.y, this.ball.radius);
        gradient2.addColorStop(0, '#FFE66D');
        gradient2.addColorStop(1, '#FF6B6B');
        this.ctx.fillStyle = gradient2;
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // 벽돌 그리기
        for (let brick of this.bricks) {
            if (brick.status === 1) {
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

        // 파티클 그리기
        for (let particle of this.particles) {
            const alpha = particle.life / particle.maxLife;
            
            if (particle.type === 'indestructible') {
                // 깨지지 않는 블록 파티클: 반짝이는 효과
                this.ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
                this.ctx.fillRect(particle.x - 1, particle.y - 1, 5, 5);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
                this.ctx.fillRect(particle.x, particle.y, 3, 3);
            } else {
                // 일반 파티클
                this.ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
                this.ctx.fillRect(particle.x, particle.y, 3, 3);
            }
        }

        // 게임 상태 텍스트
        if (this.gameState === 'stopped') {
            this.drawCenterText('🎮 벽돌깨기 게임 🎮', 32, '#FFE66D', -50);
            this.drawCenterText('스페이스바를 눌러 시작하세요!', 24, '#4ECDC4', 0);
            this.drawCenterText('마우스로 패들을 조작하세요', 18, '#96CEB4', 30);
            this.drawCenterText('(화면을 클릭해도 시작됩니다)', 14, '#DDA0DD', 60);
        } else if (this.gameState === 'paused') {
            this.drawCenterText('일시정지', 36, '#FFE66D');
            this.drawCenterText('스페이스바로 재개', 18, '#FFE66D', 40);
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