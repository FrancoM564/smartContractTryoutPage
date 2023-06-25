import BN from "bn.js"
import 'bootstrap/dist/css/bootstrap.css'
import { useState, useEffect, useContext } from 'react'
const helper = require('../helpers/functions.js')
const conect = require('../helpers/serverKeyAgreement.js')
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api')
import { CodePromise, ContractPromise } from '@polkadot/api-contract'
import { saveAs } from "file-saver"

export default function Home() {

  const [file, setFile] = useState(null)
  const [watermarkImageBytesArray, setWatermarkImageBytesArray] = useState(null)
  const [watermarkImageFile, setwatermarkImageFile] = useState(null)
  const [api, setApi] = useState()
  const [keyring, setKeyring] = useState()
  const publicKey = 0
  const [secretKey, setSecretKey ] = useState(0)
  const [titletext,setTitle] = useState("Prueba de subida de archivos")
  const [buy,setBuy] = useState("")
  const [report,setReport] = useState("")
  const [songTitle,setSongTitle] = useState("")

  useEffect(() => {
    setup()
  }, [])

  const setup = async () => {

    const value = await conect.getRandomInt(15)
    setSecretKey(value)

    const provider = new WsProvider('ws://127.0.0.1:9944');
    const api = await ApiPromise.create({ provider });

    const keyring = new Keyring({ type: 'sr25519' });

    setApi(api)
    setKeyring(keyring)

    const [chain, nodeName, nodeVersion] = await Promise.all([
      api.rpc.system.chain(),
      api.rpc.system.name(),
      api.rpc.system.version()
    ]);

    console.log(`You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`);
  }

  const onButtonPressed = async () => {
     if (file == null || watermarkImageBytesArray == null){
       console.log("No hay archivo cargado")
       return
     }

    conect.getKey(publicKey,secretKey,(key) => {
      setTitle("Empieza proceso de subida")
      console.time("Tiempo subida:")
      publishProcess(key)
    })
    
  }

  async function instantiateContractCode(tx, account) {
    return new Promise((resolve, _) => {
      tx.signAndSend(
        account,
        (result) => {

          if (result.contract) {
            console.log(result)
            resolve(result.contract.address)

          }
        }
      )
    })
  }

  async function setReportContract(tx, account) {
    return new Promise((resolve, _) => {
      tx.signAndSend(
        account,
        (result) => {

          if (result.isCompleted) {
            resolve(result)

          }
        }
      )
    })
  }

  const publishProcess = async (key) => {

    setTitle("Aplicando marca de agua")

    const watermarkedAudio = await helper.ocultarImagenEnAudio(file, watermarkImageFile)

    setTitle("Audio con marca",watermarkedAudio)

    setTitle("Aplicando encriptacion")

    const encryptedStr = await helper.applyAesEncryption(watermarkedAudio, key)

    setTitle(encryptedStr)
    
    setTitle("Subiendo a IPFS la cancion")

    const fileHashAddress = await helper.uploadToIPFS(encryptedStr)

    setTitle("Subiendo imagen a IPFS")

    const imageHashAddress = await helper.uploadImageToIPFS(watermarkImageFile)

    if (fileHashAddress == null || imageHashAddress == null) {
      console.log("Error en carga a ipfs")
      return
    }

    setTitle("Creando Smart Contract de Venta")
    console.time("Tiempo respuesta creacion smartContracts:")

    const {buyAddress,reportAddress} = await deploySmartContract(fileHashAddress,imageHashAddress)

    console.log(buyAddress,reportAddress)

    console.timeEnd("Tiempo respuesta creacion smartContracts:")

    setBuy(buyAddress)

    setReport(reportAddress)
    setTitle("Puede pasar a descargar")

    console.timeEnd("Tiempo subida:")

    await conect.saveContractAddressToCode(buyAddress,reportAddress,key)


    

  }

  const deploySmartContract = async (fileHashAddress,imageHashAddress) =>{ 

    return new Promise( async (resolve,_) =>{

      const metadataResponse = await fetch('http://localhost:3000/metadata.json');
      const codeResponse = await fetch('http://localhost:3000/code.wasm');
  
      const metadata = await metadataResponse.json();
      var code = await codeResponse.arrayBuffer();
  
      const wasm = new Uint8Array(code)
  
      const contract = new CodePromise(api, metadata, wasm)
      const gasLimit = api.registry.createType("WeightV2", {
        refTime: new BN("100000000000"),
        proofSize: new BN("10000000000"),
      });
      const storageDepositLimit = null
      const alicePair = keyring.addFromUri('//Alice', { name: 'Alice default' })

      console.log("Usando cuenta de Alice")
  
      var tx = contract.tx.newPublish({ gasLimit, storageDepositLimit}, songTitle, 10n, fileHashAddress, imageHashAddress)

      let buyAddress = await instantiateContractCode(tx, alicePair)

      let reportAddress = await deployReportContract(buyAddress,alicePair)

      let x = await setNewReportAddress(reportAddress,buyAddress,alicePair)
  
      resolve({
        reportAddress: reportAddress,
        buyAddress:buyAddress,
      })
    })

  }

  const setNewReportAddress = async(reportAddress,buyAddress,owner) =>{
    return new Promise(async (resolve,_) =>{

      const metadataResponse = await fetch('http://localhost:3000/metadata.json');
      const codeResponse = await fetch('http://localhost:3000/code.wasm');

      const metadata = await metadataResponse.json();
      var code = await codeResponse.arrayBuffer();

      const wasm = new Uint8Array(code)
      
      const contract = new ContractPromise(api,metadata,buyAddress)
      const gasLimit = api.registry.createType("WeightV2", {
        refTime: new BN("100000000000"),
        proofSize: new BN("10000000000"),
      });
      const storageDepositLimit = null

      var tx = contract.tx.setReportContract(
       {gasLimit, storageDepositLimit}
       ,reportAddress )

       const x = await setReportContract(tx,owner)

       resolve(x)

    })
  }

  const deployReportContract = async(buyContractAddress,owner) =>{
    return new Promise ( async (resolve,_) => {

      const metadataResponse = await fetch('http://localhost:3000/metadataReport.json');
      const codeResponse = await fetch('http://localhost:3000/codeReport.wasm');

      const metadata = await metadataResponse.json();
      var code = await codeResponse.arrayBuffer();

      const wasm = new Uint8Array(code)

      const contract = new CodePromise(api,metadata,wasm)
      const gasLimit = api.registry.createType("WeightV2", {
        refTime: new BN("100000000000"),
        proofSize: new BN("10000000000"),
      });
      const storageDepositLimit = null

      var tx = contract.tx.new({gasLimit,storageDepositLimit},owner.address,buyContractAddress,songTitle)

      //console.log(owner)

      let contracAddress = await instantiateContractCode(tx,owner)

      //console.log(contracAddress)

      resolve(contracAddress)
    })
  }


  const onFileSelectorChange = (target) => {
    if (target.files) {
      const audioFile = target.files[0]
      console.log(audioFile.type)
      setFile(audioFile)
      setSongTitle(audioFile.name)
    }
  }

  const onFileSelectorChange2 = async (target) => {
    if (target.files) {
      const imageFile = target.files[0]

      const reader = new FileReader()

      reader.onload = (e) =>{

        const img = new Image()

        img.src = e.target.result

        img.onload = () =>{
          const width = img.width
          const height = img.height
          if (width === 32 && height === 32){
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            canvas.width = width
            canvas.height = height
            ctx.drawImage(img,0,0,width,height)
            const imageData = ctx.getImageData(0,0,width,height)
            const pixelData = imageData.data
            console.log(pixelData)
            console.log('Numero de bytes: ',pixelData.length)
            const imgDiv = document.getElementById('imagePreview')
            imgDiv.src = canvas.toDataURL()
            setWatermarkImageBytesArray(pixelData)
            setwatermarkImageFile(imageFile)
          }else{
            console.log("No es de 32x32")
          }
        }

      }

      reader.readAsDataURL(imageFile)
    }
  }
 

  return (
    <div className='container text-center'>
      <h1 className='fw-bold fs-1 '>
        {titletext}
      </h1>

      <div className='row container'>

        <div className='col container p-5'>
          <label for="formFileLg" class="form-label">Carga audio</label>
          <input class="form-control form-control-sm" id="audioFormFile" type="file" onChange={({ target }) => { onFileSelectorChange(target) }}></input>

          <div className='p-3'>
            <button type="button" class="btn btn-primary" id='buttonDownload' onClick={onButtonPressed}>Subir</button>
          </div>

        </div>

        <div className='col container p-5'>

          <label for="formFileLg" class="form-label">Carga imagen para marca</label>
          <input class="form-control form-control-sm" id="imageFormFile" type="file" onChange={({ target }) => { onFileSelectorChange2(target) }} />

          {watermarkImageBytesArray != null && <h2 className='p-3'>Imagen de marca de agua</h2>}
          <div className='p-5'>
            <img id='imagePreview' />
          </div>

          <div className='p-3'>
            <button type="button" class="btn btn-primary" id='buttonDownload' onClick={() =>{
              window.location = `/posts/downloadPage?hashPrueba=${buy}&reportePrueba=${report}`
            }}>Moverse</button>
          </div>

        </div>
      </div>
    </div>
  )
}
