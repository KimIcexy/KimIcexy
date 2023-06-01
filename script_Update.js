// Kích thước canvas tối đa
const maxHeight = 600, maxWidth = 800;
var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');
var img = context.getImageData(0, 0, canvas.width, canvas.height);
// Ảnh gốc
var orgImg = null;
// Lịch sử chỉnh sửa (dùng để undo - hoàn tác)
var editHis = [];
// Lịch sử hoàn tác (dùng để redo - lặp lại)
var undoHis = [];

// CÁC NÚT ĐIỀU KHIỂN
{
    // Tải ảnh lên
    var uploadBtn = document.getElementById('uploadBtn');
    uploadBtn.addEventListener('change', function (e) {
        var file = e.target.files[0];
        var reader = new FileReader();

        reader.onload = function (event) {
            let img = new Image();
            img.onload = function () {
                var width = img.width;
                var height = img.height;

                // Tính toán kích thước mới dựa trên maxWidth và maxHeight
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                // Vẽ ảnh lên canvas
                canvas.width = width;
                canvas.height = height;
                context.drawImage(img, 0, 0, width, height);
                canvas.style.display = "block";

                // Đặt trạng thái gốc cho ảnh
                orgImg = context.getImageData(0, 0, canvas.width, canvas.height);
                editHis = [orgImg];
                redoHis = [];
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // Tải ảnh về máy
    var downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.addEventListener("click", function () {
        const dataURL = canvas.toDataURL();
        const a = document.createElement("a");
        a.href = dataURL;
        const orgName = uploadBtn.files[0].name;
        var splitName = orgName.split('.');
        const editName = splitName[0] + "-edited." + splitName[1];
        a.download = editName;
        a.click();
    });

    // Hoàn tác
    var undoBtn = document.getElementById('undoBtn');
    undoBtn.addEventListener('click', function () {
        if (editHis.length > 1) {
            var currImg = editHis.pop();
            undoHis.push(currImg);
            var prevImg = editHis[editHis.length - 1];
            context.putImageData(prevImg, 0, 0);
        }
    });

    // Lặp lại
    var redoBtn = document.getElementById('redoBtn');
    redoBtn.addEventListener('click', function () {
        if (undoHis.length != 0) {
            var nextImg = undoHis.pop();
            editHis.push(nextImg);
            context.putImageData(nextImg, 0, 0);
        }
    });

    // Khôi phục gốc
    var resetBtn = document.getElementById('resetBtn');
    resetBtn.addEventListener('click', function () {
        if (editHis.length > 1) {
            context.putImageData(orgImg, 0, 0);
            editHis = [orgImg];
            undoHis = [];
        }
    });
}

// CÁC NÚT CHỨC NĂNG
{
    // Làm trơn
    {
        var blurSlider = document.getElementById('blurSlider');
        blurSlider.addEventListener('change', function () {
            context.filter = `blur(${blurSlider.value}px)`;
            context.drawImage(canvas, 0, 0);
            editHis.push(canvas.getImageData(0, 0, canvas.width, canvas.height));
        });
    }


    // Làm xám
    {
        function GrayScale(data, width, height) {
            const grayscale = new Uint8ClampedArray(width * height * 4);
            for (let i = 0; i < data.length; i += 4) {
                avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                for (let k = 0; k < 3; k++)
                    grayscale[i + k] = avg;
                grayscale[i + 3] = 255;
            }
            return grayscale;
        }
        var grayBtn = document.getElementById('grayBtn');
        grayBtn.addEventListener('click', function () {
            img = context.getImageData(0, 0, canvas.width, canvas.height);
            var gray = GrayScale(img.data, img.width, img.height);
            var grayImgData = new ImageData(gray, canvas.width, canvas.height);
            context.putImageData(grayImgData, 0, 0);
            editHis.push(grayImgData);
        });
    }


    // Phát hiện biên cạnh
    {
        function DetectEdges(img_data) {
            const data = img_data.data;
            const width = img_data.width;
            const height = img_data.height;

            // Chuyển sang ảnh xám
            const gray = GrayScale(data, width, height);

            // Áp dụng bộ lọc Sobel để phát hiện biên cạnh
            const result = new Uint8ClampedArray(width * height * 4);
            const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
            const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
            const step_y = width * 4;

            for (let x = 1; x < width - 1; x++) {
                for (let y = 1; y < height - 1; y++) {
                    let sumX = 0;
                    let sumY = 0;
                    // Nhân tích chập với bộ lọc
                    for (let kx = -1; kx <= 1; kx++) {
                        for (let ky = -1; ky <= 1; ky++) {
                            const row = y + ky;
                            const col = x + kx;
                            let idx = row * step_y + col * 4;
                            sumX += gray[idx] * sobelX[(kx + 1) * 3 + ky + 1];
                            sumY += gray[idx] * sobelY[(kx + 1) * 3 + ky + 1];
                        }
                    }
                    // Lưu kết quả vào result
                    const magnitude = Math.sqrt(sumX * sumX + sumY * sumY);
                    let idx = y * step_y + x * 4;
                    for (let k = 0; k < 3; k++)
                        result[idx + k] = magnitude;
                    result[idx + 3] = 255;
                }
            }
            return result;
        }
        var edgeBtn = document.getElementById('edgeBtn');
        edgeBtn.addEventListener("click", function () {
            img = context.getImageData(0, 0, canvas.width, canvas.height);
            var edgeImageData = new ImageData(DetectEdges(img), canvas.width, canvas.height);
            context.putImageData(edgeImageData, 0, 0);
            editHis.push(edgeImageData);
        });
    }


    // Chiếu sáng
    {
        var lightSlider = document.getElementById('lightSlider');
        lightSlider.addEventListener('change', function () {
            img = context.getImageData(0, 0, canvas.width, canvas.height);
            var data = img.data;
            var value = Number(lightSlider.value);

            for (let i = 0; i < img.data.length; i += 4) {
                for (let k = 0; k < 3; k++)
                    data[i + k] += value;
            }
            var resImgData = new ImageData(img.data, canvas.width, canvas.height);
            context.putImageData(resImgData, 0, 0);
            editHis.push(resImgData);
        });

    }

    // Tương phản
    {
        var contrastSlider = document.getElementById('contrastSlider');
        contrastSlider.addEventListener('change', function () {
            img = context.getImageData(0, 0, canvas.width, canvas.height);
            var data = img.data;
            var value = Number(contrastSlider.value);

            for (let i = 0; i < img.data.length; i += 4) {
                for (let k = 0; k < 3; k++)
                    data[i + k] *= value;
            }
            var resImgData = new ImageData(img.data, canvas.width, canvas.height);
            context.putImageData(resImgData, 0, 0);
            editHis.push(resImgData);
        });
    }


    // Xoay
    {
        function RotateImage(degrees) {
            var radians = degrees * Math.PI / 180;

            // Tạo một canvas tạm thời để chứa ảnh đã xoay
            var tempCanvas = document.createElement("canvas");
            var tempContext = tempCanvas.getContext("2d");
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;

            // Di chuyển tâm canvas về giữa --> xoay ảnh xung quanh tâm
            tempContext.translate(canvas.width / 2, canvas.height / 2);
            tempContext.rotate(radians);

            // Di chuyển tâm canvas trở lại vị trí ban đầu
            tempContext.translate(-canvas.width / 2, -canvas.height / 2);

            // Vẽ ảnh gốc lên canvas tạm
            tempContext.drawImage(canvas, 0, 0);

            // Xóa nội dung trên canvas cũ
            context.clearRect(0, 0, canvas.width, canvas.height);

            // Vẽ ảnh đã xoay từ canvas tạm lên canvas gốc
            context.drawImage(tempCanvas, 0, 0);
        }

        // Bắt sự kiện khi nhấn vào nút "Xoay ảnh"
        var rotateBtn = document.getElementById("rotateBtn");
        rotateBtn.addEventListener("click", function () {
            var degrees = prompt("Nhập góc xoay (độ):");
            if (degrees) {
                RotateImage(parseFloat(degrees));
            }
        });
    }


    // Vẽ
    {
        var drawBtn = document.getElementById("drawBtn");
        var isDrawing = false;

        // Bắt sự kiện khi nhấn vào nút "Nét vẽ"
        drawBtn.addEventListener("click", function () {
            // Bắt sự kiện khi nhấn chuột trái trên canvas
            canvas.addEventListener("mousedown", function (e) {
                if (e.button === 0) { // Kiểm tra nút chuột nhấn là chuột trái
                    isDrawing = true;
                    startDrawing();
                }
            });
        });

        // Bắt sự kiện khi di chuyển chuột trên canvas
        canvas.addEventListener("mousemove", function (e) {
            if (isDrawing) { // Kiểm tra nếu đang giữ chuột trái
                draw(e);
            }
        });

        // Bắt sự kiện khi thả chuột trái khỏi canvas
        canvas.addEventListener("mouseup", function (e) {
            if (e.button === 0) { // Kiểm tra nút chuột nhả là chuột trái
                isDrawing = false;
                stopDrawing();
            }
        });

        // Bắt sự kiện khi di chuột ra khỏi canvas
        canvas.addEventListener("mouseout", function (e) {
            if (e.button === 0) { // Kiểm tra nút chuột nhấn là chuột trái
                isDrawing = false;
                stopDrawing();
            }
        });


        function startDrawing(e) {
            if (!isDrawing) return;
            context.beginPath();
            context.moveTo(e.pageX - canvas.offsetLeft, e.pageY - canvas.offsetTop);
        }

        function draw(e) {
            if (!isDrawing) return;
            context.lineTo(e.pageX - canvas.offsetLeft, e.pageY - canvas.offsetTop);
            context.stroke();
        }

        function stopDrawing() {
            isDrawing = false;
            editHis.push(context.getImageData(0, 0, canvas.width, canvas.height));
        }
    }


    {
        var textElements = [];
        var selectedTextIndex = -1;
        var isDragging = false;
        var isResizing = false;
        var resizeIndex = -1;
        var prevX;
        var prevY;
        var textScale = 1;
        var prevImgData;
    
        function drawTextElements() {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.putImageData(prevImgData, 0, 0);
    
            textElements.forEach(function (textElement, index) {
                context.font = textElement.fontSize * textScale + 'px Arial';
                context.fillStyle = textElement.color;
                context.fillText(textElement.text, textElement.x, textElement.y);
    
                if (index === selectedTextIndex) {
                    context.strokeStyle = 'red';
                    context.lineWidth = 2;
                    context.strokeRect(
                        textElement.x,
                        textElement.y - textElement.fontSize * textScale,
                        context.measureText(textElement.text).width,
                        textElement.fontSize * textScale
                    );
                }
            });
        }
    
        function addText() {
            var text = document.getElementById('text').value;
            var textColor = document.getElementById('textColor').value;
            var fontSize = parseInt(document.getElementById('fontSize').value);
    
            var textElement = {
                text: text,
                color: textColor,
                fontSize: fontSize,
                x: canvas.width / 2,
                y: canvas.height / 2
            };
    
            textElements.push(textElement);
            drawTextElements();
            if (text != '')
                editHis.push(context.getImageData(0, 0, canvas.width, canvas.height));
        }
    
        function deleteText() {
            if (selectedTextIndex !== -1) {
                textElements.splice(selectedTextIndex, 1);
                selectedTextIndex = -1;
                drawTextElements();
            }
        }
    
        function updateTextScale() {
            textScale = parseFloat(document.getElementById('fontSize').value) / 20;
            drawTextElements();
        }
    
        function clearSelection() {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.putImageData(prevImgData, 0, 0);
            drawTextElements();
        }
    
        function handleText() {
            prevImgData = context.getImageData(0, 0, canvas.width, canvas.height);
            addText();
    
            canvas.addEventListener('mousedown', function (e) {
                var x = e.offsetX;
                var y = e.offsetY;
    
                isDragging = false;
                isResizing = false;
                resizeIndex = -1;
    
                isInsideText = false; // Reset trạng thái
    
                // Kiểm tra xem chuột có nằm trong vùng chữ không
                textElements.forEach(function (textElement, index) {
                    var textWidth = context.measureText(textElement.text).width;
                    var textHeight = textElement.fontSize * textScale;
                    if (
                        x >= textElement.x &&
                        x <= textElement.x + textWidth &&
                        y >= textElement.y - textHeight &&
                        y <= textElement.y
                    ) {
                        selectedTextIndex = index;
                        isDragging = true;
                        startX = x;
                        startY = y;
                        isInsideText = true;
                    }
                });
    
                if (!isInsideText) {
                    selectedTextIndex = -1;
                    clearSelection();
                }
    
                drawTextElements();
            });
    
            canvas.addEventListener('mousemove', function (e) {
                var x = e.offsetX;
                var y = e.offsetY;
    
                if (isDragging) {
                    var deltaX = x - startX;
                    var deltaY = y - startY;
    
                    // Kiểm tra nếu văn bản đã di chuyển đi
                    if (deltaX !== 0 || deltaY !== 0) {
                        // Xóa chữ tại vị trí ban đầu
                        context.clearRect(
                            textElements[selectedTextIndex].x,
                            textElements[selectedTextIndex].y - textElements[selectedTextIndex].fontSize * textScale,
                            context.measureText(textElements[selectedTextIndex].text).width,
                            textElements[selectedTextIndex].fontSize * textScale
                        );
                    }
    
                    textElements[selectedTextIndex].x += deltaX;
                    textElements[selectedTextIndex].y += deltaY;
    
                    startX = x;
                    startY = y;
    
                    clearSelection();
                    drawTextElements();
                }
            });
  
  
    
            canvas.addEventListener('mouseup', function () {
                isDragging = false;
            });
    
            canvas.addEventListener('mouseleave', function () {
                isDragging = false;
            });
        }
    }
    
    
               

    

    // Đối xứng
    function FlipImage() {
        var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        var flippedData = context.createImageData(imageData);

        for (var y = 0; y < canvas.height; y++) {
            for (var x = 0; x < canvas.width; x++) {
                var sourceIndex = (y * canvas.width + x) * 4;
                var targetIndex = (y * canvas.width + (canvas.width - x - 1)) * 4;

                flippedData.data[targetIndex] = imageData.data[sourceIndex];
                flippedData.data[targetIndex + 1] = imageData.data[sourceIndex + 1];
                flippedData.data[targetIndex + 2] = imageData.data[sourceIndex + 2];
                flippedData.data[targetIndex + 3] = imageData.data[sourceIndex + 3];
            }
        }

        context.putImageData(flippedData, 0, 0);
    }
    var flipBtn = document.getElementById("flipBtn");
    flipBtn.addEventListener("click", function () {
        FlipImage();
    });




// Crop ảnh
// Khung cắt ảnh
//Crop ảnh
// Vị trí khung cắt
var cropRect = { x: 0, y: 0, width: 0, height: 0 };
var isCropping = false;
var cropRectVisible = false;

var cropBtn = document.getElementById('cropBtn');
cropBtn.addEventListener('click', function () {
    isCropping = !isCropping;
    if (isCropping) {
        cropBtn.innerHTML = "Hủy cắt ảnh";
        canvas.style.cursor = "crosshair";
    } else {
        cropBtn.innerHTML = "Cắt ảnh";
        canvas.style.cursor = "default";
        // Cắt ảnh theo khung
        if (cropRect.width > 0 && cropRect.height > 0) {
            var croppedCanvas = document.createElement('canvas');
            var croppedContext = croppedCanvas.getContext('2d');
            croppedCanvas.width = cropRect.width;
            croppedCanvas.height = cropRect.height;
            croppedContext.drawImage(canvas, cropRect.x, cropRect.y, cropRect.width, cropRect.height, 0, 0, cropRect.width, cropRect.height);
            context.clearRect(0, 0, canvas.width, canvas.height); // Xóa ảnh gốc trên canvas
            canvas.width = cropRect.width;
            canvas.height = cropRect.height;
            context.drawImage(croppedCanvas, 0, 0);
            orgImg = context.getImageData(0, 0, canvas.width, canvas.height);
            editHis = [orgImg];
            undoHis = [];
            cropRect = { x: 0, y: 0, width: 0, height: 0 };
        }
    }
});

var isMouseMoving = false;
var tempImg = null;

canvas.addEventListener('mousedown', function (e) {
    if (isCropping) {
        cropRect.x = e.clientX - canvas.getBoundingClientRect().left;
        cropRect.y = e.clientY - canvas.getBoundingClientRect().top;
        var startX = cropRect.x;
        var startY = cropRect.y;
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseup', onMouseUp);
        
        cropRectVisible = true;

        tempImg = new Image();
        tempImg.src = canvas.toDataURL(); // Lưu ảnh gốc vào biến tạm

        isMouseMoving = true;
    }
});

function clearCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
}

function onMouseMove(e) {
    if (isMouseMoving) {
        var currentX = e.clientX - canvas.getBoundingClientRect().left;
        var currentY = e.clientY - canvas.getBoundingClientRect().top;
        cropRect.width = currentX - cropRect.x;
        cropRect.height = currentY - cropRect.y;

        clearCanvas(); // Xóa canvas

        context.strokeStyle = 'red';
        context.lineWidth = 2;
        context.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
    }
}
function onMouseMove(e) {
    if (isMouseMoving) {
        var currentX = e.clientX - canvas.getBoundingClientRect().left;
        var currentY = e.clientY - canvas.getBoundingClientRect().top;
        cropRect.width = currentX - cropRect.x;
        cropRect.height = currentY - cropRect.y;

        clearCanvas(); // Xóa canvas

        context.drawImage(tempImg, 0, 0); // Vẽ lại ảnh gốc từ biến tạm

        context.strokeStyle = 'red';
        context.lineWidth = 2;
        context.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
    }
}

function onMouseUp(e) {
    if (cropRectVisible) {
        var currentX = e.clientX - canvas.getBoundingClientRect().left;
        var currentY = e.clientY - canvas.getBoundingClientRect().top;
        cropRect.width = currentX - cropRect.x;
        cropRect.height = currentY - cropRect.y;

        clearCanvas(); // Xóa canvas

        context.drawImage(tempImg, 0, 0); // Vẽ lại ảnh gốc từ biến tạm

        var centerX = cropRect.x + cropRect.width / 2;
        var centerY = cropRect.y + cropRect.height / 2;
        cropRect.x = centerX - cropRect.width / 2;
        cropRect.y = centerY - cropRect.height / 2;

        context.strokeStyle = 'red';
        context.lineWidth = 2;
        context.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
        
        // Cắt ảnh theo khung
        if (cropRect.width > 0 && cropRect.height > 0) {
            var croppedCanvas = document.createElement('canvas');
            var croppedContext = croppedCanvas.getContext('2d');
            croppedCanvas.width = cropRect.width;
            croppedCanvas.height = cropRect.height;
            croppedContext.drawImage(tempImg, cropRect.x, cropRect.y, cropRect.width, cropRect.height, 0, 0, cropRect.width, cropRect.height);
            
            clearCanvas(); // Xóa canvas
            var canvasCenterX = canvas.width / 2 - cropRect.width / 2;
            var canvasCenterY = canvas.height / 2 - cropRect.height / 2;
            context.drawImage(croppedCanvas, canvasCenterX, canvasCenterY);
        }

        canvas.removeEventListener('mousemove', onMouseMove);
        canvas.removeEventListener('mouseup', onMouseUp);
        
        cropRectVisible = false;
        isMouseMoving = false;
    }
}






}