import { ContractPromise } from '@polkadot/api-contract';
import BN from "bn.js"
import 'bootstrap/dist/css/bootstrap.css'
const helper = require('../../helpers/functions')
import { useState, useEffect } from 'react'
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api')
import { saveAs } from 'file-saver';
import { getEncriptionKey } from '../../helpers/serverRetriveKeys';




export default function dowloadPage() {

  const [api, setApi] = useState()
  const [keyring, setKeyring] = useState()
  const [demoAccount,setDemoAccount] = useState()
  let keyT = "llavesupersecret"

  useEffect(() => {
    setup()
  }, [])

  const setup = async () => {
    const provider = new WsProvider('ws://127.0.0.1:9944');
    const api = await ApiPromise.create({ provider });

    const keyring = new Keyring({ type: 'sr25519' });

    setApi(api)
    setKeyring(keyring)

    /*api.query.system.events((events) => {
      console.log(`\nReceived ${events.length} events:`);
  
      console.log(events)
    })*/

    const Bob = keyring.addFromUri('//Bob', { name: 'Bob default' })

    setDemoAccount(Bob)

    const [chain, nodeName, nodeVersion] = await Promise.all([
      api.rpc.system.chain(),
      api.rpc.system.name(),
      api.rpc.system.version()
    ]);

    console.log(`You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`);
  }

  const onButtonBuyPressed = async()=>{

    let params = new URLSearchParams(location.search);

    let isBought = await buySong(params.get('hashPrueba'))

    if (isBought){
      console.log("Ya has comprado este archivo")
      return
    }

    console.log("Archivo comprado")
  }

  const onButtonDownloadPressed = async () =>{

    const key = await getEncriptionKey()

    if (key == "No se ha encontrado el archivo"){
      console.log(key)
      return
    }

    console.log(key)

    let params = new URLSearchParams(location.search);

    console.log("Obteniendo informacion de smart contract")

    let contractInfo = await querySongAddress(params.get('hashPrueba'))

    if (contractInfo.ok == "No has comprado este archivo"){
      console.log("El usuario no ha comprado este archivo")
      return
    }

    console.log("Descargando archivo")

    let encryptedStr = await helper.downloadFromIPFS(contractInfo.ok)

    //Colocar forma de obtener llave del servidor de proteccion

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

  const querySongAddress = async(contractAddress) =>{
    return new Promise(async (resolve,_) =>{

      const contract = await getContract(contractAddress)

      const gasLimit = api.registry.createType("WeightV2", {
        refTime: new BN("100000000000"),
        proofSize: new BN("10000000000"),
      });

      const options = {storageDepositLimit : null, gasLimit :gasLimit}

      const {output} = await contract.query.recoverHashAddress(
        demoAccount.address,
        options
      )

      resolve(output.toJSON())

    })
  }

  const querySongPrice = async(contractAddress) =>{
    return new Promise(async (resolve,_) =>{

      const contract = await getContract(contractAddress)

      const gasLimit = api.registry.createType("WeightV2", {
        refTime: new BN("100000000000"),
        proofSize: new BN("10000000000"),
      });

      const options = {storageDepositLimit : null, gasLimit :gasLimit}

      const {output} = await contract.query.recoverSongPrice(
        demoAccount.address,
        options
      )

      resolve(output.toJSON())

    })
  }

  const buySong = async(contractAddress) =>{
    return new Promise(async (resolve,_)=>{

      const metadataResponse = await fetch('http://localhost:3000/metadata.json');
      const metadata = await metadataResponse.json();

      const contract = new ContractPromise(api,metadata,contractAddress)

      const gasLimit = api.registry.createType("WeightV2", {
        refTime: new BN("100000000000"),
        proofSize: new BN("10000000000"),
      });

      var price = await querySongPrice(contractAddress)

      price = price.ok + price.ok/10 + price.ok/10

      console.log(price)

      const options = {storageDepositLimit : null, gasLimit :gasLimit,value:15}

      await contract.tx.buySong(
        options,
      ).signAndSend(
        demoAccount,
        (result) =>{
            if (result.isCompleted){
              if (result.dispatchError){
                console.log(result.dispatchError)
                resolve(true)
              }
              resolve(false)
          }
        }
      )

    })
  }

  const getContract = async(contractAddress)=>{
    return new Promise(async (resolve, _) => {

      const metadataResponse = await fetch('http://localhost:3000/metadata.json');
      const metadata = await metadataResponse.json();

      const gasLimit = api.registry.createType("WeightV2", {
        refTime: new BN("100000000000"),
        proofSize: new BN("10000000000"),
      });

      const options = {storageDepositLimit : null, gasLimit :gasLimit}

      const contract = new ContractPromise(api,metadata,contractAddress)

      resolve(contract)
    })
  }

  return (
    <>
      <div className='container text-center'>
        <h1 className='p-3'>Archivo por reproducir</h1>
        <div className='row'>

        <div className='col'>

          <div>
          <h2>Boton para comprar el audio</h2>

          <button type="button" class="btn btn-danger" id='buttonDownload' onClick={onButtonBuyPressed}>Comprar</button>
          </div>
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
