let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
const attendanceLog = document.getElementById('attendance-log');

// Lista de patentes conocidas y sus dueños
const patentesRegistradas = {
    "FS KF 23": "Juan",
    "X": "Garcia"
};

// Inicializar la cámara
(async () => {
    try {
        let stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;

        video.addEventListener('loadedmetadata', () => {
            console.log('Video cargado, comenzando detecciones...');
            detectPatente(); // Comenzar detección de patentes
        });
    } catch (error) {
        console.error("Error al acceder a la cámara: ", error);
    }
})();

// Cargar modelo Haar Cascade
async function loadCascade() {
    let classifier = new cv.CascadeClassifier();
    let xmlUrl = 'models/haarcascade_russian_plate_number.xml'; // Ruta del modelo Haar Cascade

    // Cargar el archivo XML del modelo Haar Cascade
    try {
        let response = await fetch(xmlUrl);
        let data = await response.text();
        let fileData = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            fileData[i] = data.charCodeAt(i);
        }
        let modelFile = new cv.FS_createDataFile('/', 'haarcascade_russian_plate_number.xml', fileData, true, false);
        classifier.load('haarcascade_russian_plate_number.xml'); // Cargar el modelo en el clasificador
        console.log("Modelo Haar Cascade cargado correctamente");
        return classifier;
    } catch (error) {
        console.error("Error al cargar el modelo Haar Cascade: ", error);
    }
}

// Detección de patentes utilizando OpenCV
async function detectPatente() {
    let classifier = await loadCascade();

    setInterval(() => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        let src = cv.imread(canvas);
        let gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

        let plates = new cv.RectVector();
        classifier.detectMultiScale(gray, plates);

        for (let i = 0; i < plates.size(); i++) {
            let plate = plates.get(i);
            let roi = src.roi(plate);

            // Dibujar el rectángulo alrededor de la patente detectada
            cv.rectangle(src, new cv.Point(plate.x, plate.y), new cv.Point(plate.x + plate.width, plate.y + plate.height), [0, 255, 0, 255], 2);
            ctx.putImageData(new ImageData(new Uint8ClampedArray(src.data), src.cols, src.rows), 0, 0);

            // Extraer la patente detectada y usar Tesseract.js para reconocer el texto
            recognizeText(roi);
        }

        // Liberar memoria
        src.delete();
        gray.delete();
        plates.delete();
    }, 3000); // Cada 3 segundos
}

// Reconocer el texto de la patente usando Tesseract.js
function recognizeText(plateImage) {
    const dataUrl = canvas.toDataURL('image/png');

    Tesseract.recognize(
        dataUrl,
        'eng',
        { logger: (m) => console.log(m) }
    ).then(({ data: { text } }) => {
        console.log('Texto detectado:', text.trim());
        verificarPatente(text.trim());
    }).catch(err => {
        console.error('Error en el reconocimiento de patentes:', err);
    });
}

// Verificar si la patente detectada está registrada
function verificarPatente(patenteDetectada) {
    const patenteFormateada = patenteDetectada.replace(/\s/g, '').toUpperCase(); // Eliminar espacios y convertir a mayúsculas
    if (patentesRegistradas[patenteFormateada]) {
        registrarAsistencia(patenteFormateada, patentesRegistradas[patenteFormateada]);
    } else {
        console.log(`Patente ${patenteFormateada} no reconocida.`);
    }
}

// Registrar asistencia
function registrarAsistencia(patente, dueño) {
    const now = new Date();
    const timeString = now.toLocaleTimeString();

    const logEntry = document.createElement('p');
    logEntry.textContent = `${timeString}: Patente ${patente} reconocida. Dueño: ${dueño}. Asistencia registrada.`;
    attendanceLog.appendChild(logEntry);

    console.log(`Patente ${patente} registrada para ${dueño}.`);
}
