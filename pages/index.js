import BN from "bn.js"
import 'bootstrap/dist/css/bootstrap.css'
import { useState, useEffect } from 'react'
const helper = require('../helpers/functions.js')
const nacl = require('tweetnacl')
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api')
import { CodePromise } from '@polkadot/api-contract'

export default function Home() {

  const [file, setFile] = useState(null)
  const [watermarkImage, setWatermarkImage] = useState(null)
  const [api, setApi] = useState()
  const [keyring, setKeyring] = useState()
  const keys = nacl.box.keyPair()
  const publicKey = keys.publicKey
  const secretKey = keys.secretKey

  useEffect(() => {
    setup()
  }, [])

  let key = "llavesupersecret"

  const setup = async () => {
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
    // getKey((key) => {
    //   console.log(key)
    // })
    if (file == null || watermarkImage == null){
      console.log("No hay archivo cargado")
      return
    }
    console.log("Empieza proceso de subida")
    publishProcess()
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

  const publishProcess = async () => {

    console.log("Aplicando marca de agua")

    const watermarkedAudio = await helper.getWatermarkedAudio(file, watermarkImage)

    console.log(watermarkedAudio)

    console.log("Aplicando encriptacion")

    const encryptedStr = await helper.applyAesEncryption(watermarkedAudio, key)

    console.log(encryptedStr)

    console.log("Subiendo a IPFS")

    const fileHashAddress = await helper.uploadToIPFS(encryptedStr)

    console.log(fileHashAddress)

    if (fileHashAddress == null) {
      console.log("Error en carga a ipfs")
      return
    }

    console.log("Creando Smart Contract")

    const contractAddress = await deploySmartContract(fileHashAddress)

    console.log("Pasando a descarga")

    window.location = `/posts/downloadPage?hashPrueba=${contractAddress}`

  }

  const deploySmartContract = async (fileHashAddress) =>{ 

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
      const salt = new Uint8Array()
      const alicePair = keyring.addFromUri('//Alice', { name: 'Alice default' })
  
      var tx = contract.tx.newPublish({ gasLimit, storageDepositLimit, proofSize: 9000n }, "La bebe", 10n, fileHashAddress, "QmZ2Fg6zDt8p7SLsuVAL2spGAAY2rPp7JShAY3Xk6Ndt8o")
  
      let address = await instantiateContractCode(tx, alicePair)
  
      resolve(address.toString())
  
      /*const readContract = new ContractPromise(api, metadata, address);
  
      const { gasRequired, storageDeposit, result, output } = await readContract.query.recoverSongPrice(
        alicePair.address,
        {
          gasLimit,
          storageDepositLimit,
        }
      );
  
      console.log(output.toJSON());
  
      // the gas consumed for contract execution
      console.log(gasRequired.toHuman());
  
      console.log(storageDeposit.toHuman())*/
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
      const img = document.getElementById('imagePreview')
      img.src = await helper.getDataUrlFromReader(imageFile)
      setWatermarkImage(imageFile)
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

          {watermarkImage != null && <h2 className='p-3'>Imagen de marca de agua</h2>}
          <div className='p-5'>
            <img id='imagePreview' />
          </div>

        </div>
      </div>
    </div>
  )
}
