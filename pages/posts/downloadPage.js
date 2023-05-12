import 'bootstrap/dist/css/bootstrap.css'
const helper = require('../../helpers/functions')
import { saveAs } from 'file-saver';



export default function dowloadPage() {

  let key = "llavesupersecret"

  const onButtonDownloadPressed = async () =>{

    let params = new URLSearchParams(location.search);

    console.log("Descargando archivo")

    let encryptedStr = await helper.downloadFromIPFS(params.get('hashPrueba'))

    console.log("Desencriptando archivo")

    let decryptStr = await helper.decryptAes(encryptedStr,key)

    console.log("Reconstruyendo archivo")

    let fileBlob = await helper.getBlobFromDataString(decryptStr)
    
    console.log("guardando")

    let imageDataUrl = await helper.getImageUrlDataFromWatermakedBlob(fileBlob)

    console.log(imageDataUrl)

    const img = document.getElementById('divImagen')

    img.append(imageDataUrl)

    saveAs(fileBlob)

  }


  return (
    <>
      <div className='container text-center'>
        <h1 className='p-3'>Archivo por reproducir</h1>
        <div className='row'>

        <div className='col'>

          <h2>Boton para descargar el audio</h2>

          <button type="button" class="btn btn-primary" id='buttonDownload' onClick={onButtonDownloadPressed}>Descargar</button>

        </div>

        <div className='col' id='divImagen'>

          <h2>Imagen extraida</h2>

          <img id='imagenExtraida'/>

        </div>

      </div>
      </div>
      
    </>
  );
}
