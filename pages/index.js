
import 'bootstrap/dist/css/bootstrap.css'
import { useState } from 'react';
const helper = require('../helpers/functions.js')
import { redirect } from 'next/navigation';

export default function Home() {

  const [file,setFile] = useState(null)
  const [watermarkImage,setWatermarkImage] = useState(null)
  let key = "llavesupersecret"

 const onButtonPressed = async () => {
    if (file == null || watermarkImage == null){
      console.log("No hay archivo cargado")
      return
    }
    console.log("Empieza proceso de subida")
    publishProcess()
  }

  const publishProcess = async () =>{

    console.log("Aplicando marca de agua")

    const watermarkedAudio = await helper.getWatermarkedAudio(file,watermarkImage)

    console.log(watermarkedAudio)

    console.log("Aplicando encriptacion")

    const encryptedStr = await helper.applyAesEncryption(watermarkedAudio,key)

    console.log(encryptedStr)

    console.log("Subiendo a IPFS")

    const fileHashAddress = await helper.uploadToIPFS(encryptedStr)

    console.log(fileHashAddress)

    if (fileHashAddress == null){
      console.log("Error en carga a ipfs")
      return
    }

    window.location = `/posts/downloadPage?hashPrueba=${fileHashAddress}`

    //Colocar logica para conectar con contrato inteligente aqui
    //deploySmartContract(fileHashAddress)
    //para demo enviar a la pagina de descarga
  } 


  const onFileSelectorChange = (target) => {
    if (target.files) {
      const audioFile = target.files[0]
      console.log(audioFile.type)
      setFile(audioFile)
    }
  }

  const onFileSelectorChange2 = async (target) => {
    if (target.files) {
      const imageFile = target.files[0]
      const img = document.getElementById('imagePreview')
      img.src = await helper.getDataUrlFromReader(imageFile)
      setWatermarkImage(imageFile)
    }
  }

  return (
    <div className='container text-center'>
      <h1 className='fw-bold fs-1 '>
        Prueba de subida de archivos
      </h1>

      <div className='row container'>

        <div className='col container p-5'>
          <label for="formFileLg" class="form-label">Carga audio</label>
          <input class="form-control form-control-sm" id="audioFormFile" type="file" onChange={({target})=>{onFileSelectorChange(target)}}></input>

          <div className='p-3'>
          <button type="button" class="btn btn-primary" id='buttonDownload' onClick={onButtonPressed}>Subir</button>
          </div>

        </div>

        <div className='col container p-5'>

      <label for="formFileLg" class="form-label">Carga imagen para marca</label>
          <input class="form-control form-control-sm" id="imageFormFile" type="file" onChange={({target})=>{onFileSelectorChange2(target)}}/>

          {watermarkImage != null && <h2 className='p-3'>Imagen de marca de agua</h2>}
          <div className='p-5'>
            <img id='imagePreview'/>
          </div>

      </div>
      </div>
    </div>
  )
}
