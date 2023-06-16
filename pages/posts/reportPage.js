import 'bootstrap/dist/css/bootstrap.css'
const functionsHelper = require('../../helpers/functions')
import { ContractPromise } from '@polkadot/api-contract';
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api')
import { useState, useEffect } from "react";
import BN from "bn.js"
import { re } from 'mathjs';
const compare = require('resemblejs').compare


export default function reportPage() {

    const [fileToReport, setFileToReport] = useState()
    const [api, setApi] = useState(null)
    const [demoAccount, setDemoAccount] = useState()
    const [imageToCompare, setImageToCompare] = useState()
    const [imageExtracted, setImageExtracted] = useState()
    const [keyring, setKeyring] = useState()
    const [comparisonResult, setComparisonResult] = useState("Esperando")
    const [imageAddress, setImageAddress] = useState()
    const [showUpload, setShowUpload] = useState(false)
    const [showReportButton, setShowReportButton] = useState(false)

    useEffect(() => {
        setup()
    }, [])

    const getImageAddressOnIPFS = async (imageAddress) => {
        return new Promise(async (resolve, _) => {
            const metadataResponse = await fetch('http://localhost:3000/metadataReport.json');

            const metadata = await metadataResponse.json();

            const contract = new ContractPromise(api, metadata, imageAddress)
            const gasLimit = api.registry.createType("WeightV2", {
                refTime: new BN("100000000000"),
                proofSize: new BN("10000000000"),
            });

            const options = {storageDepositLimit : null, gasLimit :gasLimit}

            try {
                
                const {output} = await contract.query.recoverImage(
                    demoAccount.address,
                    options
                )

                resolve(output.toJSON())

            } catch (e) {

                console.log(e)

                resolve(null)
            }
        })
    }

    const setup = async () => {

        const provider = new WsProvider('ws://127.0.0.1:9944');
        const api = await ApiPromise.create({ provider });

        const keyring = new Keyring({ type: 'sr25519' });

        setApi(api)
        setKeyring(keyring)

        const eve = keyring.addFromUri('//Eve', { name: 'Eve default' })
        setDemoAccount(eve)

        console.log("Cuenta configurada como eve")
        console.log(eve)

        const [chain, nodeName, nodeVersion] = await Promise.all([
            api.rpc.system.chain(),
            api.rpc.system.name(),
            api.rpc.system.version()
        ]);

        console.log(`You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`);
    }

    const onFileSelectorChange = async (target) => {
        if (target.files) {
            const audioFile = target.files[0]
            console.log(audioFile.type)

            const imageUrl = await functionsHelper.getImageDataUrlFromWatermarkedAudio(audioFile)

            //Cambiar a imagen extraida una vez se logre el marcaje de agua
            setImageExtracted(imageUrl)

            const areSameImages = await compareImages()

            console.log(areSameImages)
            
            if(areSameImages){
                setShowReportButton(areSameImages)
            }else{
                console.log("No es la misma marca de agua")
            }
        }
    }

    const compareImages = async() =>{

        return new Promise((resolve, _) => {
            const options = {
                returnEarlyThreshold: 5
            };
    
            compare(imageToCompare,imageExtracted,options, (err,data)=>{
                if (err){
                    console.log(err)
                }else{

                    console.log(data.misMatchPercentage)

                    if (data.misMatchPercentage > 5){
                        setComparisonResult("No son iguales")
                        resolve(false)
                    }else{
                        setComparisonResult("Son iguales")
                        resolve(true)
                    }
                }
            })
        })
    }

    const doOnButtonPressedSearch = async() =>{
        
        if (api == null){
            console.log("No se ha conectado a un nodo")
            return
        }

        const contractAddressInput = document.getElementById("contractAddress").value

        const imageIPFSaddress = await getImageAddressOnIPFS(contractAddressInput)

        if(imageIPFSaddress == null){
            console.log("No existe esta dirección")
            return
        }

        const imageRaw = await functionsHelper.downloadFromIPFSRaw(imageIPFSaddress.ok)

        const imageDataUrl = await getImageDataUrl(imageRaw)

        console.log(imageDataUrl)

        setImageToCompare(imageDataUrl)

        setShowUpload(true)
    }

    const giveRewardToReporterAndOwner = async(reportAddress) =>{
        return new Promise(async(resolve, reject) => {

            const contractAddressInput = document.getElementById("contractAddress").value

            const metadataResponse = await fetch('http://localhost:3000/metadataReport.json');

            const metadata = await metadataResponse.json();

            const contract = new ContractPromise(api, metadata, contractAddressInput)
            const gasLimit = api.registry.createType("WeightV2", {
                refTime: new BN("100000000000"),
                proofSize: new BN("100000000000"),
            });

            const options = {storageDepositLimit : null, gasLimit :gasLimit}

            const tx = contract.tx.payReporterAndOwner(
                options,
                1000000000000000n,
                reportAddress
            )

            try {
                
                tx.signAndSend(
                    demoAccount,
                    (result) =>{
                        if(result.isCompleted){
                            if(result.dispatchError){
                                console.log(result.dispatchError)
                            }else{
                                console.log(result)
                                console.log("Transferencias completadas")
                            }
                            
                        }
                    }
                )

                //resolve(output.toJSON())

            } catch (e) {

                console.log(e)

                //resolve(null)
            }
        })
    }

    const doOnButtonReportPressed = async () =>{
        const reportAddress = document.getElementById('reportedAddress').value

        console.log(reportAddress)

        const responseContract = await giveRewardToReporterAndOwner(reportAddress)
    
        //console.log(responseContract)
    }

    const getImageDataUrl = async (imageRawArray) =>{

        return new Promise((resolve, reject) => {

            let buffer = new Buffer.from(imageRawArray)

            const image = new Blob([buffer],{type: "image/png"})

            const dataurl = URL.createObjectURL(image)

            resolve(dataurl)
        })

        
    }

    return (
        <>
            <div>
                <div>
                    <h1 className="text-center pt-4 ">Reportar un evento</h1>
                </div>

                <div className='text-center p-3'>
                    <div>
                        <label for="contractAddress" className='text-center p-3'>Dirección del contrato</label>
                        <input type="text" name="contractAddress" id="contractAddress" style={{width: 700}}/>
                    </div>
                    <button className='btn btn-success' onClick={doOnButtonPressedSearch}>Buscar</button>

                </div>

                {!showUpload ? <div></div> :
                    <div>
                        <div >
                            <div className='container p-5'>
                                <label for="formFileLg" class="form-label">Carga audio</label>
                                <input class="form-control form-control-sm" id="audioFormFile" type="file" onChange={({ target }) => { onFileSelectorChange(target) }}></input>
                                                            </div>

                        </div>
                        <div className='row'>
                            <div className='col'>
                                <h2 className='text-center pt4'>Imagen a comparar</h2>
                                <div id='divImageToCompare' className='text-center'>
                                    <img src={imageToCompare} id='imageToCompare'></img>
                                </div>
                            </div>
                            <div className='col'>
                                <h2 className='text-center pt4'>Imagen extraida</h2>
                                <div id='divExtractedImage' className='text-center'>
                                    <img src={imageExtracted} id='imageExtracted'></img>
                                </div>
                            </div>


                        </div>

                        <div className='text-center p-5'>
                            <h4>Resultado: {comparisonResult}</h4>
                            {showReportButton ? <div>

                                <label for="reportedAddress" className='text-center p-3'>Cuenta a reportar</label>
                                <input type="text" name="reportedAddress" id="reportedAddress" style={{width: 700}}/>
                                <button className='btn btn-danger' onClick={doOnButtonReportPressed}>Reportar</button>

                            </div> : 
                            <div>
                            </div>}
                        </div>
                    </div>
                }
            </div>

        </>
    )



}