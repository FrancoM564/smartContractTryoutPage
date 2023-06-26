const crypto = require("crypto-js");
import { create } from "ipfs-http-client";

export async function getImageUrlDataFromWatermakedBlob(audioBlob) {
  const audioBytes = await getArrayBufferFromReader(audioBlob);

  const imageSize = 32 * 32;

  // Crear un nuevo arreglo de bytes para almacenar la imagen extraída
  const imageBytes = new Uint8Array(imageSize);

  // Recorrer los bits menos significativos del archivo de audio y almacenarlos en el arreglo de bytes de la imagen
  for (let i = 0; i < imageSize; i++) {
    imageBytes[i] = audioBytes[i] & 1;
  }

  // Crear una imagen a partir del arreglo de bytes extraído
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext("2d");
  const imageData = context.createImageData(canvas.width, canvas.height);

  // Asignar los valores de los bytes extraídos a los datos de la imagen
  for (let i = 0; i < imageSize; i++) {
    imageData.data[i * 4] = imageBytes[i] * 255; // Componente R
    imageData.data[i * 4 + 1] = imageBytes[i] * 255; // Componente G
    imageData.data[i * 4 + 2] = imageBytes[i] * 255; // Componente B
    imageData.data[i * 4 + 3] = 255; // Componente A (opacidad)
  }

  // Mostrar la imagen extraída en la página
  context.putImageData(imageData, 0, 0);

  return canvas;
}

export async function getImageBitArray(audioBlob) {
  return new Promise(async (resolve, _) => {
    const audioBytes = await getArrayBufferFromReader(audioBlob);

    const imageSize = 32 * 32;

    // Crear un nuevo arreglo de bytes para almacenar la imagen extraída
    const imageBytes = new Uint8Array(imageSize);

    // Recorrer los bits menos significativos del archivo de audio y almacenarlos en el arreglo de bytes de la imagen
    for (let i = 0; i < imageSize; i++) {
      imageBytes[i] = audioBytes[i] & 1;
    }

    resolve(imageBytes);
  });
}

//no borrar
export async function getBlobFromDataString(dataURL) {
  const responseURL = await fetch(dataURL);

  const blob = await responseURL.blob();

  return blob;
}

//no borrar
export async function downloadFromIPFS(locationHash) {
  let client = await createIPFSClient();

  const resp = await client.cat(locationHash);

  let finalContent = [];

  for await (const chunk of resp) {
    finalContent = [...finalContent, ...chunk];
  }

  const encryptedStr = Buffer.from(finalContent).toString();

  return encryptedStr;
}

export async function downloadFromIPFSRaw(locationHash) {
  return new Promise(async (resolve, reject) => {
    let client = await createIPFSClient();

    const resp = await client.cat(locationHash);

    let finalContent = [];

    for await (const chunk of resp) {
      finalContent = [...finalContent, ...chunk];
    }

    resolve(finalContent);
  });
}

//no borrar
export async function uploadImageToIPFS(watermarkImage) {
  return new Promise(async (resolve, _) => {
    let buffer = await getArrayBufferFromReader(watermarkImage);

    let send = new Buffer.from(buffer);
    const image = new Blob([send], { type: watermarkImage.type });
    let client = await createIPFSClient();

    try {
      let x = await client.add(image);

      resolve(x.path);
    } catch (error) {
      console.log(error);

      resolve(null);
    }
  });
}

//no borrar
export async function uploadToIPFS(dataString) {
  //Devuelve el hash(dirección del archivo en IPFS)
  let testBuffer = new Buffer.from(dataString);

  let client = await createIPFSClient();

  console.log("Cliente creado, envio pendiente");

  let x;

  try {
    x = await client.add(testBuffer);
  } catch (error) {
    console.log(error);
  }

  if (x) {
    console.log("Envio terminado");
    return x.path;
  }
  return null;
}

//no borrar
export const createIPFSClient = async () => {
  const ipfs = await create({
    host: "localhost",
    port: 5001,
  });

  return ipfs;
};

//no borrar
export async function decryptAes(encryptedStr, key) {
  const decrypted = crypto.AES.decrypt(encryptedStr, key);

  var str = decrypted.toString(crypto.enc.Utf8);
  return str;
}

//no borrar
export async function applyAesEncryption(audioBlob, key) {
  //Devuelve un string encriptado

  const audioDataUrl = await getDataUrlFromReader(audioBlob);

  //console.log("Audio data: ",audioDataUrl)

  const encryptedStr = await encryptDataUrl(audioDataUrl, key);

  return encryptedStr;
}

async function arrayBufferToBytesArray(audioFile) {
  const audioArrayBuffer = await getArrayBufferFromReader(audioFile);

  return new Uint8Array(audioArrayBuffer);
}

//no borrar
function integerToBitArray(integer) {
  var bitArray = [];
  for (var i = 7; i >= 0; i--) {
    var bit = (integer >> i) & 1;
    bitArray.push(bit);
  }
  return bitArray;
}

function int16ToBits(numero) {
  let es_negativo = false;
  if (numero < 0) {
    es_negativo = true;
    numero = Math.abs(numero);
  }

  let bits = numero.toString(2).padStart(16, "0");
  let arreglo_bits = [];

  if (es_negativo) {
    arreglo_bits.push(1);
  }

  for (let i = 0; i < bits.length; i++) {
    arreglo_bits.push(Number(bits[i]));
  }

  return arreglo_bits;
}

//no borrar
function bitArrayToInteger(bitArray) {
  var integer = 0;
  for (var i = 0; i < bitArray.length; i++) {
    integer = (integer << 1) | bitArray[i];
  }
  return integer;
}

function getSamples(audioBytes) {
  // Create a new array to store the samples.
  const samples = new Int16Array(audioBytes.length / 2);

  // Iterate through the audio bytes, two bytes at a time.
  for (let i = 0; i < audioBytes.length; i += 2) {
    // Convert the two bytes into a 16-bit integer.
    const sample = audioBytes[i] | (audioBytes[i + 1] << 8);

    // Store the 16-bit integer in the samples array.
    samples[i / 2] = sample;
  }

  // Return the samples array.
  return samples;
}

//no borrar
export async function getImageDataUrlFromWatermarkedAudio(watermarkedAudio) {
  return await extraerImagenDeAudio(watermarkedAudio);
}

export function getImageByteArrayFromWatermarkedAudio(watermarkedAudioBlob) {
  return new Promise(async (resolve, reject) => {
    var indexOfAudioBytesArray = 0;
    var audioByteArray = getSamples(
      await arrayBufferToBytesArray(watermarkedAudioBlob)
    );
    var imageArrayBytes = [];

    for (let index = 0; index < 4096; index++) {
      var bitsOfByteOfImage = [];

      for (let indexBit = 0; indexBit < 8; indexBit++) {
        const bitsOfAudioByteToExtractFrom = int16ToBits(
          audioByteArray[indexOfAudioBytesArray]
        );

        const bitIndexToExtract = 15;

        const nextSampleToReplaceIndex = 1;

        bitsOfByteOfImage.push(bitsOfAudioByteToExtractFrom[bitIndexToExtract]);

        indexOfAudioBytesArray += nextSampleToReplaceIndex;
      }

      const byteFromArrayOfBits = bitArrayToInteger(bitsOfByteOfImage);

      imageArrayBytes.push(byteFromArrayOfBits);
    }

    const finalImageByteArray = new Uint8ClampedArray(imageArrayBytes);

    resolve(finalImageByteArray);
  });
}

export const transformPixelDataToImageUrl = (pixelData) => {
  const canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  canvas.width = 32;
  canvas.height = 32;
  var imageData = ctx.createImageData(32, 32);
  var data = imageData.data;

  for (var i = 0; i < pixelData.length; i++) {
    data[i] = pixelData[i];
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
};

//no borrar
export function getDataUrlFromReader(blobOrFile) {
  return new Promise((resolve, _) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blobOrFile);
  });
}

//no borrar
export function getArrayBufferFromReader(blobOrFile) {
  return new Promise((resolve, _) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsArrayBuffer(blobOrFile);
  });
}

export function getImageInfo(imageDataUrl) {
  return new Promise((resolve, _) => {
    const img = document.createElement("img");
    img.src = imageDataUrl;
    img.onload = () => {
      const cvs = document.createElement("canvas");
      const ctx = cvs.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const imageData = {
        pixelArray: ctx.getImageData(0, 0, 32, 32).data,
        height: 32,
        width: 32,
      };

      resolve(imageData);
    };
  });
}

export function embedWatermark(audioArrayBuffer, imageInfo) {
  return new Promise((resolve, _) => {
    const imageSize = imageInfo.height * imageInfo.width;

    const audioBytes = new Uint8Array(audioArrayBuffer);

    for (let i = 0; i < imageSize; i++) {
      const imageBit = (imageInfo.pixelArray[i] & 1) === 1 ? 1 : 0;

      audioBytes[i] = (audioBytes[i] & 0xfe) | imageBit;
    }

    const watermarkedAudio = new Blob([audioBytes], { type: "audio/mpeg" });

    resolve(watermarkedAudio);
  });
}

//no borrar
const encryptDataUrl = async (dataUrl, key) => {
  let ct = crypto.AES.encrypt(dataUrl, key).toString();

  return ct;
};

//no borrar
export function ocultarImagenEnAudio(audioFile, imagenFile) {
  return new Promise((resolve, reject) => {
    const imagenReader = new FileReader();
    imagenReader.onload = function (e) {
      const imagenArrayBuffer = e.target.result;

      const audioReader = new FileReader();
      audioReader.onload = function (e) {
        const audioArrayBuffer = e.target.result;

        const imagenDataView = new DataView(imagenArrayBuffer);
        const audioDataView = new DataView(audioArrayBuffer);

        const imagenSize = imagenDataView.byteLength;

        const audioSize = audioDataView.byteLength;

        console.log(imagenSize);

        console.log("audio size: ", audioSize);

        // Asegurarse de que la imagen se ajuste dentro del audio
        if (imagenSize * 8 * 9 > audioSize) {
          console.log(
            "La imagen es demasiado grande para ocultarla en el audio."
          );
          return;
        }

        // Ocultar los bits de la imagen en los bits menos significativos del audio
        let audioIndex = 0;

        for (let imagenIndex = 0; imagenIndex < imagenSize; imagenIndex++) {
          let imagenByte = imagenDataView.getUint8(imagenIndex);

          const imagenByteInBits = integerToBitArray(imagenByte);

          for (let bit = 0; bit < 8; bit++) {
            let audioByte = audioDataView.getUint8(audioIndex);

            let audioByteInBits = integerToBitArray(audioByte);

            audioByteInBits[7] = imagenByteInBits[bit];

            audioByte = bitArrayToInteger(audioByteInBits);
            // Guardar el byte de audio modificado
            audioDataView.setUint8(audioIndex, audioByte);

            audioIndex += 2;
            var memoryUsed = performance.memory.usedJSHeapSize;
          }
        }

        // Guardar el archivo de audio modificado
        const audioBlob = new Blob([audioDataView], { type: "audio/mp3" });
        resolve({
          watermarkedAudio: audioBlob,
          memoryAfterWatermark: memoryUsed,
        });
      };
      audioReader.readAsArrayBuffer(audioFile);
    };
    imagenReader.readAsArrayBuffer(imagenFile);
  });
}

//no borrar
export function extraerImagenDeAudio(audioFile) {
  return new Promise((resolve, reject) => {
    const audioReader = new FileReader();
    audioReader.onload = function (e) {
      const audioArrayBuffer = e.target.result;
      const audioDataView = new DataView(audioArrayBuffer);

      let imagenBytes = [];

      let audioIndex = 0;

      for (let byteImage = 0; byteImage < 1361; byteImage++) {
        var imageByteArray = [];

        for (let bit = 0; bit < 8; bit++) {
          var audioByte = audioDataView.getUint8(audioIndex);

          var audioByteArray = integerToBitArray(audioByte);

          imageByteArray.push(audioByteArray[7]);

          audioIndex += 2;
        }

        imagenBytes.push(bitArrayToInteger(imageByteArray));
      }

      // Convertir los bytes de imagen en un búfer y crear una URL para descargarlo
      const imagenArrayBuffer = new Uint8Array(imagenBytes).buffer;
      const imagenBlob = new Blob([imagenArrayBuffer], { type: "image/png" });
      const utl = URL.createObjectURL(imagenBlob);
      resolve(utl);
    };
    audioReader.readAsArrayBuffer(audioFile);
  });
}

export function saveOnCSVLoadValues(
  nombreArchivo,
  tiempoEncriptacion,
  tiempoMarcaAgua,
  tiempoContratos,
  memoriaMarcaAgua,
  memoriaEncriptacion
) {
  const data = {
    nombreArchivo: nombreArchivo,
    tiempoEncriptacion: tiempoEncriptacion,
    tiempoContratos: tiempoContratos,
    tiempoMarcaAgua: tiempoMarcaAgua,
    memoriaMarcaAgua: memoriaMarcaAgua,
    memoriaEncriptacion: memoriaEncriptacion,
  };

  fetch("http://localhost:3000/guardarCarga", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.text())
    .then((message) => {
      console.log(message); // Mensaje de respuesta del backend
      // Aquí puedes realizar cualquier acción adicional después de enviar los datos
    })
    .catch((error) => {
      console.error("Error al enviar los datos:", error);
      // Aquí puedes manejar el error de acuerdo a tus necesidades
    });
}

export function saveOnCSVDowloadValues(
  nombreArchivo,
  tiempoCompra,
  tiempoObtenerInformacion,
  tiempoDesencriptacion,
  memoriaDesencriptacion
) {
  const data = {
    nombreArchivo,
    tiempoCompra,
    tiempoObtenerInformacion,
    tiempoDesencriptacion,
    memoriaDesencriptacion,
  };

  fetch("http://localhost:3000/guardarDescarga", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.text())
    .then((message) => {
      console.log(message); // Mensaje de respuesta del backend
      // Aquí puedes realizar cualquier acción adicional después de enviar los datos
    })
    .catch((error) => {
      console.error("Error al enviar los datos:", error);
      // Aquí puedes manejar el error de acuerdo a tus necesidades
    });
}

export function obtenerNumeroAleatorio() {
  return Math.floor(Math.random() * 16);
}
