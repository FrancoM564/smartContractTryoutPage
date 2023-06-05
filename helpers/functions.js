const crypto = require("crypto-js");
import { create } from "ipfs-http-client";
import { equalText, index } from "mathjs";

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

export async function getBlobFromDataString(dataURL) {
  const responseURL = await fetch(dataURL);

  const blob = await responseURL.blob();

  return blob;
}

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

export async function uploadImageToIPFS(watermarkImage) {
  return new Promise(async (resolve, _) => {
    let buffer = await getArrayBufferFromReader(watermarkImage);

    console.log(buffer);

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

export const createIPFSClient = async () => {
  const ipfs = await create({
    host: "localhost",
    port: 5001,
  });

  return ipfs;
};

export async function decryptAes(encryptedStr, key) {
  const decrypted = crypto.AES.decrypt(encryptedStr, key);

  console.log(decrypted);

  var str = decrypted.toString(crypto.enc.Utf8);
  return str;
}

export async function applyAesEncryption(audioBlob, key) {
  //Devuelve un string encriptado

  const audioDataUrl = await getDataUrlFromReader(audioBlob);

  const encryptedStr = await encryptDataUrl(audioDataUrl, key);

  return encryptedStr;
}

async function arrayBufferToBytesArray(audioFile) {
  const audioArrayBuffer = await getArrayBufferFromReader(audioFile);

  return new Uint8Array(audioArrayBuffer);
}

function calcBitIndexToReplace(bitArray) {
  if (bitArray[0] == 1) {
    return 7;
  }

  if (bitArray[1] == 1) {
    return 7;
  }

  return 7;
}

function calcNextSampleToReplace(bitArray){
    if (bitArray[0] == 1){
        if (bitArray[1] == 1){
            if (bitArray[2] == 1){
                return 8
            }else{
                return 7
            }
        }else{
            if (bitArray[2] == 1){
                return 6
            }else{
                return 5
            }
        }
    }else{
        if (bitArray[1] == 1){
            if (bitArray[2] == 1){
                return 4
            }else{
                return 3
            }
        }else{
            if (bitArray[2] == 1){
                return 2
            }else{
                return 1
            }
        }
    }
}

function integerToBitArray(integer) {
  var bitArray = [];
  for (var i = 7; i >= 0; i--) {
    var bit = (integer >> i) & 1;
    bitArray.push(bit);
  }
  return bitArray;
}

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

function makeWatermarkedAudio(imageByteArray, audioByteArray) {
  return new Promise((resolve, reject) => {
    var indexOfMusicArray = 0;

    let arrayToWorkOn = audioByteArray;

    for (
      let imageByteIndex = 0;
      imageByteIndex < imageByteArray.length;
      imageByteIndex++
    ) {
      const imageByteBits = integerToBitArray(imageByteArray[imageByteIndex]);

      for (
        let imageByteBitIndex = 0;
        imageByteBitIndex < imageByteBits.length;
        imageByteBitIndex++
      ) {
        const actualImagebit = imageByteBits[imageByteBitIndex];

        const bitsOfByteFromAudio = integerToBitArray(
          audioByteArray[indexOfMusicArray]
        );

        const bitToReplaceIndex = calcBitIndexToReplace(bitsOfByteFromAudio);

        const nextSampleToReplaceIndex = calcNextSampleToReplace(bitsOfByteFromAudio)

        bitsOfByteFromAudio[bitToReplaceIndex] = actualImagebit;

        const newByteToIntroduceToAudioArray =
          bitArrayToInteger(bitsOfByteFromAudio);

        arrayToWorkOn[indexOfMusicArray] = newByteToIntroduceToAudioArray;

        indexOfMusicArray += nextSampleToReplaceIndex;
      }
    }

    resolve(arrayToWorkOn);
  });
}

export async function getImageDataUrlFromWatermarkedAudio(watermarkedAudio){
  const dataArrayOfImagePixels = await getImageByteArrayFromWatermarkedAudio(watermarkedAudio)

  return transformPixelDataToImageUrl(dataArrayOfImagePixels)
}

export function getImageByteArrayFromWatermarkedAudio(watermarkedAudioBlob){
    return new Promise(async (resolve, reject) => {

        var indexOfAudioBytesArray = 0
        var audioByteArray = await arrayBufferToBytesArray(watermarkedAudioBlob)
        var imageArrayBytes = []

        for (let index = 0; index < 4096; index++) {
            
            var bitsOfByteOfImage = []

            for (let indexBit = 0; indexBit < 8; indexBit++){

                const bitsOfAudioByteToExtractFrom = integerToBitArray(audioByteArray[indexOfAudioBytesArray])

                const bitIndexToExtract = calcBitIndexToReplace(bitsOfAudioByteToExtractFrom)

                const nextSampleToReplaceIndex = calcNextSampleToReplace(bitsOfAudioByteToExtractFrom)

                bitsOfByteOfImage.push(bitsOfAudioByteToExtractFrom[bitIndexToExtract])

                indexOfAudioBytesArray += nextSampleToReplaceIndex

            }

            const byteFromArrayOfBits = bitArrayToInteger(bitsOfByteOfImage)

            imageArrayBytes.push(byteFromArrayOfBits)

        }

        const finalImageByteArray = new Uint8ClampedArray(imageArrayBytes)

        resolve(finalImageByteArray)
    })
}

export const transformPixelDataToImageUrl = (pixelData) =>{
    const canvas = document.createElement('canvas')
    var ctx = canvas.getContext('2d')
    canvas.width = 32
    canvas.height = 32
    var imageData = ctx.createImageData(32,32)
    var data = imageData.data

    for (var i = 0; i<pixelData.length; i++){
      data[i] = pixelData[i]
    }

    ctx.putImageData(imageData,0,0)
    return canvas.toDataURL()
  }

export async function getWatermarkedAudio(audioFile, watermarkImageByteArray) {
  //Debe devolver un audio en formato Blob

  console.log(audioFile);

  console.log(watermarkImageByteArray);

  const audioArrayBuffer = await getArrayBufferFromReader(audioFile)

  const audioFileInBytes = await arrayBufferToBytesArray(audioFile);

  if (audioFileInBytes.length < watermarkImageByteArray.length * 9) {
    console.log("Muy poca duración de archivo");
    return;
  }

  console.log("Audio sin procesar: ", audioFileInBytes);

  var temp = getSamples(audioFileInBytes)

  console.log("Muestras de audio en enteros: ",temp)

  

  console.log("Muestras alteradas: ",temp)

  const audioWithWatermarkInBytes = await makeWatermarkedAudio(
    watermarkImageByteArray,
    audioFileInBytes
  );

  //console.log("Audio con marca de agua: ", audioWithWatermarkInBytes);

  const watermarkedAudioBlob = getBlobFromInt16Array(temp)//new Blob([audioWithWatermarkInBytes],{type:"audio/mp3"})

  return watermarkedAudioBlob;
}

function getBlobFromInt16Array(int16Array) {
  // Create a new array to store the bytes.
  const bytes = new Uint8Array(int16Array.length * 2);

  // Iterate through the integer array, two bytes at a time.
  for (let i = 0; i < int16Array.length; i++) {
    // Convert the two bytes into a byte.
    const byte = int16Array[i] & 0xFF;

    // Store the byte in the bytes array.
    bytes[i * 2] = byte;
    bytes[i * 2 + 1] = (int16Array[i] >> 8) & 0xFF;
  }

  // Create a new blob from the bytes array.
  return new Blob([bytes],{type:"audio/mp3"});
}


export function getDataUrlFromReader(blobOrFile) {
  return new Promise((resolve, _) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blobOrFile);
  });
}

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

const encryptDataUrl = async (dataUrl, key) => {
  let ct = crypto.AES.encrypt(dataUrl, key).toString();

  return ct;
};
