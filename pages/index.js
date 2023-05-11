import Head from 'next/head';
import styles from '../styles/Home.module.css';
import 'bootstrap/dist/css/bootstrap.css'
import { useRef, useState } from 'react';
const crypto = require("crypto-js")
const IPFS = require('ipfs-mini')

export default function Home() {

  const [file,setFile] = useState(null)
  const [encryptedFile, setEncryptedFile] = useState(null)
  const [decryptedFile, setDecryptedFile] = useState(null)
  const client = new IPFS({host: 'ipfs.infura.io',port:5001,protocol:'https'})
  let key = "llavesupersecreta123"

 const onButtonPressed = async () => {
    if (file == null){
      console.log("No hay archivo cargado")
      return
    }
    let fr = new FileReader()
    fr.readAsArrayBuffer(file)
    fr.onloadend = () =>{
      manageOnLoadEndFR(fr.result)
    }
  }

  const callEncrypt = async (argument) => {
    const wordArray = crypto.lib.WordArray.create(argument)
    const str = crypto.enc.Hex.stringify(wordArray)
    let ct = crypto.AES.encrypt(str, key)
    let ctstr = ct.toString()
    return ctstr
  }

  const manageOnLoadEndFR = async (result) =>{
      console.log(result)
      let encriptedFile = await callEncrypt(result)
      console.log(encriptedFile)
      let hash = await addFileToIPFS(encriptedFile)
      console.log(hash)

  }

  const addFileToIPFS = async (encodedStr) =>{

    let testBuffer = new Buffer.from(encodedStr)
    console.log(testBuffer)
    console.log(client)
    client.add(testBuffer, (error, file) => {
      if (error){
        console.log(error)
      }

      return(file)
    })

  }





  return (
    <div className='container'>
      <h1 className='fw-bold fs-1 text-center'>
        Prueba de subida de archivos
      </h1>

      <div className='p-3'>
          <label for="formFileLg" class="form-label">Large file input example</label>
          <input class="form-control form-control-sm" id="formFile" type="file"
          onChange={({target})=>{
            if (target.files) {
              const file = target.files[0]
              setFile(file)
            }
          }}></input>
      </div>
      <div className='row'>
        <div className='col'>
        </div>
        <div className='col text-center' >
          <button type="button" class="btn btn-primary" id='buttonUpload' onClick={onButtonPressed}>Subir</button>
        </div>
        <div className='col'>
        </div>
      </div>

      <div>
      {file ? (<div><a>{File.call.length}</a>
      <a>Presente</a></div>) : <div></div>}
      </div>
      
    </div>

  )

  
}
