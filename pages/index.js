import Head from 'next/head';
import styles from '../styles/Home.module.css';
import 'bootstrap/dist/css/bootstrap.css'
import { useRef, useState } from 'react';
const crypto = require("crypto-js")
import { create } from 'ipfs-http-client'
import * as fs from 'fs';

export default function Home() {

  const [showDownload,setShowDownload] = useState(false)
  const [file,setFile] = useState(null)
  const [fileHashLocation, setfileHashLocation] = useState(null)
  let key = "llavesupersecret"

  const createIPFSClient = async () =>{
    const ipfs = await create(
      {
        host:"localhost",
        port:5001,
      }
    )

    return ipfs
  }

 const onButtonPressed = async () => {
    if (file == null){
      console.log("No hay archivo cargado")
      return
    }
    console.log("Empieza proceso de subida")
     let fr = new FileReader()
     fr.readAsDataURL(file)
    fr.onloadend = () =>{
      console.log(fr.result)
      manageOnLoadEndFR(fr.result)
    }
  }

  const manageOnLoadEndFR = async (result) =>{
    

    let encriptedFile = await callEncrypt(result.replace("data:audio/mpeg;base64,", ""))
    let hash = await addFileToIPFS(encriptedFile)
    setfileHashLocation(hash)
    setShowDownload(true)
  }

  const callEncrypt = async (fileReaderResult) => {
    //const wordArray = crypto.lib.WordArray.create(fileReaderResult)
    // const str = crypto.enc.Hex.stringify(wordArray)

    console.log(fileReaderResult)

    let ct = crypto.AES.encrypt(fileReaderResult, key).toString()

    console.log(ct)

    return ct
  }

  const addFileToIPFS = async (encodedStr) =>{

    let testBuffer = new Buffer.from(encodedStr)
    let client = await createIPFSClient()

    console.log("cliente creado, envio pendiente")

    let result = await client.add(testBuffer)
    console.log("envio terminado")
    if (result){
      return result.path
    }
    return null
  }

  const onButtonDownloadPressed = async () =>{

    let encryptedStr = await ipfsDownload(fileHashLocation)

    let strUrl = decrypt(encryptedStr)

    saveFile(strUrl)
  }

  const ipfsDownload = async (hash) =>{
    console.log(hash)

    let client = await createIPFSClient()

    const resp = await client.cat(hash)

    let finalContent = []

    for await (const chunk of resp) {
      finalContent = [...finalContent, ...chunk]
    }

    const encryptedStr = Buffer.from(finalContent).toString()

    return encryptedStr
  }

  const decrypt = (encryptedStr) =>{

    console.log(encryptedStr)

    const decrypted = crypto.AES.decrypt(encryptedStr,key)

    console.log(decrypted)

    var str = decrypted.toString(crypto.enc.Utf8)

    console.log(str)

    return str
  }

  const saveFile = async (dataURL) =>{

    dataURL = "data:audio/mpeg;base64,"+dataURL

    console.log(dataURL)

    const fs = require('file-saver')
    // var arrayBuffer = new Uint8Array(byteArray)
    // var blob = new Blob([arrayBuffer])//,{type:"audio/mpeg"})

    const responseURL = await fetch(dataURL)
    
    const blob = await responseURL.blob()

    console.log(blob)
    fs.saveAs(blob,"filename.mp3")
  }

  function wordToByteArray(word, length) {
    var ba = [],
      i,
      xFF = 0xFF;
    if (length > 0)
      ba.push(word >>> 24);
    if (length > 1)
      ba.push((word >>> 16) & xFF);
    if (length > 2)
      ba.push((word >>> 8) & xFF);
    if (length > 3)
      ba.push(word & xFF);
  
    return ba;
  }

  function wordArrayToByteArray(wordArray, length) {
    if (wordArray.hasOwnProperty("sigBytes") && wordArray.hasOwnProperty("words")) {
      length = wordArray.sigBytes;
      wordArray = wordArray.words;
    }
  
    var result = [],
      bytes,
      i = 0;
    while (length > 0) {
      bytes = wordToByteArray(wordArray[i], Math.min(4, length));
      length -= bytes.length;
      result.push(bytes);
      i++;
    }
    return [].concat.apply([], result);
  }

  const onFileSelectorChange = (target) => {
    if (target.files) {
      const file = target.files[0]
      console.log(file.type)
      setFile(file)
    }
  }

  return (
    <div className='container'>
      <h1 className='fw-bold fs-1 text-center'>
        Prueba de subida de archivos
      </h1>

      <div className='p-3'>
        {showDownload ? 
        (<div>
          <h1>Archivo por descargar</h1>
        </div>) : 
        (<div>
          <label for="formFileLg" class="form-label">Large file input example</label>
          <input class="form-control form-control-sm" id="formFile" type="file"
          onChange={({target})=>{
            onFileSelectorChange(target)
          }}></input>
        </div>)

        }
      </div>
      <div className='row'>
        <div className='col'>
        </div>
        <div className='col text-center' >
          {
            showDownload ? (
            <button type="button" 
                    class="btn btn-danger" 
                    id='buttonUpload' 
                    onClick={onButtonDownloadPressed}>Descargar
                    </button>)
                    :
            (<button type="button" 
                      class="btn btn-primary" 
                      id='buttonDownload' 
                      onClick={onButtonPressed}>Subir
                      </button>)
          }
        </div>
        <div className='col'>
        </div>
      </div>
    </div>

  )

  
}
