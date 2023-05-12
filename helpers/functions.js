const crypto = require("crypto-js")
import { create } from 'ipfs-http-client'
import { getDataUrlFromArr, getImgFromArr } from 'array-to-image';

export async function getImageUrlDataFromWatermakedBlob(audioBlob){

    const audioBytes = await getArrayBufferFromReader(audioBlob)

    const imageSize = 32*32

    // Crear un nuevo arreglo de bytes para almacenar la imagen extraída
    const imageBytes = new Uint8Array(imageSize);
  
    // Recorrer los bits menos significativos del archivo de audio y almacenarlos en el arreglo de bytes de la imagen
    for (let i = 0; i < imageSize; i++) {
      imageBytes[i] = audioBytes[i] & 1;
    }

    // Crear una imagen a partir del arreglo de bytes extraído
    const canvas = document.createElement("canvas");
    canvas.width = 32
    canvas.height = 32
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
    

    return canvas
}

export async function getBlobFromDataString(dataURL){

    const responseURL = await fetch(dataURL)
    
    const blob = await responseURL.blob()

    return blob

}

export async function downloadFromIPFS(locationHash){

    let client = await createIPFSClient()

    const resp = await client.cat(locationHash)

    let finalContent = []

    for await (const chunk of resp) {
      finalContent = [...finalContent, ...chunk]
    }

    const encryptedStr = Buffer.from(finalContent).toString()

    return encryptedStr
}

export async function uploadToIPFS(dataString){
    //Devuelve el hash(dirección del archivo en IPFS)
    let testBuffer = new Buffer.from(dataString)

    let client = await createIPFSClient()

    console.log("Cliente creado, envio pendiente")

    let result = await client.add(testBuffer)

    console.log("Envio terminado")
    if (result){
      return result.path
    }
    return null

}

export const createIPFSClient = async () =>{
    const ipfs = await create(
      {
        host:"localhost",
        port:5001,
      }
    )

    return ipfs
  }

export async function decryptAes(encryptedStr,key){

    const decrypted = crypto.AES.decrypt(encryptedStr,key)

    var str = decrypted.toString(crypto.enc.Utf8)
    return str
}

export async function applyAesEncryption(audioBlob, key){

    //Devuelve un string encriptado

    const audioDataUrl = await getDataUrlFromReader(audioBlob)

    const encryptedStr = await encryptDataUrl(audioDataUrl,key)

    return encryptedStr
}

export async function getWatermarkedAudio(audioFile,watermarkImage){
    //Debe devolver un audio en formato Blob

    const watermarkImageDataUrl = await getDataUrlFromReader(watermarkImage)

    const imageInfo = await getImageInfo(watermarkImageDataUrl)

    const audioArrayBuffer = await getArrayBufferFromReader(audioFile)

    const watermarkedAudioBlob = await embedWatermark(audioArrayBuffer,imageInfo)

    return watermarkedAudioBlob

}

export function getDataUrlFromReader(blobOrFile){
    return new Promise((resolve,_)=>{
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.readAsDataURL(blobOrFile)
    })
}

export function getArrayBufferFromReader(blobOrFile){
    return new Promise((resolve,_)=>{
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.readAsArrayBuffer(blobOrFile)
    })
}

export function getImageInfo(imageDataUrl){

    return new Promise((resolve,_) => {
        const img = document.createElement('img')
        img.src = imageDataUrl
        img.onload = () =>{
            const cvs = document.createElement("canvas");
            const ctx = cvs.getContext("2d");
            ctx.drawImage(img, 0, 0);

            const imageData = {
                pixelArray: ctx.getImageData(0, 0, img.width, img.height).data,
                height: img.height,
                width: img.width
            }

            resolve(imageData)
        }
    })
}

export function embedWatermark(audioArrayBuffer, imageInfo){
    return new Promise((resolve,_)=>{
        const imageSize = imageInfo.height * imageInfo.width * 4

        const audioBytes = new Uint8Array(audioArrayBuffer)

        for (let i = 0; i<imageSize; i++){
            const imageBit = (imageInfo.pixelArray[i] & 1) === 1 ? 1 : 0;

            audioBytes[i] = (audioBytes[i] & 0xFE) | imageBit;
        }

        const watermarkedAudio= new Blob([audioBytes],{ type: "audio/mpeg" })

        resolve(watermarkedAudio)
    })
}

const encryptDataUrl = async (dataUrl,key) => {

    let ct = crypto.AES.encrypt(dataUrl, key).toString()

    return ct
  }
  

