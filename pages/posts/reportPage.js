import 'bootstrap/dist/css/bootstrap.css'
const functionsHelper = require('../../helpers/functions')
import { ContractPromise } from '@polkadot/api-contract';
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api')
import { useState, useEffect } from "react";
import BN from "bn.js"
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

            const imageBytes = await functionsHelper.getImageBitArray(audioFile)

            const imageUrl = await getImageDataUrl(imageBytes)

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
    
            compare(imageToCompare,imageToCompare,options, (err,data)=>{
                if (err){
                    console.log(err)
                }else{
                    if (data.misMatchPercentage > 5){
                        resolve(false)
                    }else{
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

            const metadataResponse = await fetch('http://localhost:3000/metadataReport.json');

            const metadata = await metadataResponse.json();

            const contract = new ContractPromise(api, metadata, reportAddress)
            const gasLimit = api.registry.createType("WeightV2", {
                refTime: new BN("100000000000"),
                proofSize: new BN("10000000000"),
            });

            const options = {storageDepositLimit : null, gasLimit :gasLimit}

            try {
                

                const result = await contract.query.payReporterAndOwner(
                    demoAccount.address,
                    options,
                    10000n,
                    "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
                )

                console.log(result)

                //resolve(output.toJSON())

            } catch (e) {

                console.log(e)

                //resolve(null)
            }
        })
    }

    const doOnButtonReportPressed = async () =>{
        const reportAddress = document.getElementById('reportedAddress').value

        const responseContract = await giveRewardToReporterAndOwner(reportAddress)
    
        console.log(responseContract)
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