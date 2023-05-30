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
  const [api, setApi] = useState()
  const [keyring, setKeyring] = useState()
  const publicKey = 0
  const [secretKey, setSecretKey ] = useState(0)

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
      console.log("Empieza proceso de subida")
      publishProcess(key)
    })
    
  }

  async function instantiateContractCode(tx, account) {
    return new Promise((resolve, _) => {
      tx.signAndSend(
        account,
        (result) => {

          if (result.contract) {
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

    console.log("Aplicando marca de agua")

    const watermarkedAudio = await helper.getWatermarkedAudio(file, watermarkImageBytesArray)

    console.log(watermarkedAudio)
    
    console.log("Aplicando encriptacion")

    const encryptedStr = await helper.applyAesEncryption(watermarkedAudio, key)

    console.log(encryptedStr)

    console.log("Subiendo a IPFS la cancion")

    const fileHashAddress = await helper.uploadToIPFS(encryptedStr)

    console.log("Subiendo imagen a IPFS")

    const imageHashAddress = await helper.uploadImageToIPFS(watermarkImage)

    if (fileHashAddress == null || imageHashAddress == null) {
      console.log("Error en carga a ipfs")
      return
    }

    console.log("Creando Smart Contract de Venta")

    const {buyAddress,reportAddress} = await deploySmartContract(fileHashAddress,imageHashAddress)

    console.log("Pasando a descarga")

    window.location = `/posts/downloadPage?hashPrueba=${buyAddress}&reportePrueba=${reportAddress}`

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
  
      var tx = contract.tx.newPublish({ gasLimit, storageDepositLimit}, "Welcome to the jungle", 1000000000000000n, fileHashAddress, imageHashAddress)

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

      var tx = contract.tx.new({gasLimit,storageDepositLimit},owner.address,buyContractAddress,"La bebe")

      console.log(owner)

      let contracAddress = await instantiateContractCode(tx,owner)

      console.log(contracAddress)

      resolve(contracAddress)
    })
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
          }else{
            console.log("No es de 32x32")
          }
        }

      }

      reader.readAsDataURL(imageFile)
    }
  }
  /*
   async function getKey(doWithAgreedKey) {
     const socket = new WebSocket('ws://localhost:8006');
 
     socket.onopen = async function () {
       console.log('Conexión establecida con el servidor');
 
       const action = {
         action: "sendPublicKey"
       }
 
       socket.send(JSON.stringify(action))
     }
 
     socket.onmessage = async (event) => {
       const data = event.data
 
       const message = await processData(data, publicKey, socket)
 
       socket.send(message)
     }
 
     socket.onclose = (e) => {
       doWithAgreedKey()
       console.log("Cierre hecho")
     }
   }
 
   async function getSessionKey() {
     const values = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
 
     var key = ""
 
     for (let i = 0; i < 618; i++) {
       key += values.charAt(Math.floor(Math.random() * values.length))
     }
 
     return key
   }
 
   async function processData(data, socket) {
 
     data = JSON.parse(data)
 
     switch (data.event) {
       case "publicKeyMessage":
 
         const message = {
           action: "sentClientPk",
           client_pk: publicKey
         }
 
         return JSON.stringify(message)
 
       default:
         console.log("deberia cerrarse")
     }
 
   }*/

  return (
    <div className='container text-center'>
      <h1 className='fw-bold fs-1 '>
        Prueba de subida de archivos
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

        </div>
      </div>
    </div>
  )
}
