import 'bootstrap/dist/css/bootstrap.css'
const functionsHelper = require('../../helpers/functions')
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api')
import { useState, useEffect } from "react";

export default function reportPage() {

    const [fileToReport, setFileToReport] = useState()
    const [api, setApi] = useState()
    const [imageToCompare, setImageToCompare] = useState()
    const [imageExtractedCanvas, setImageExtractedCanvas] = useState()
    const [keyring, setKeyring] = useState()
    const [result, setResult] = useState("Esperando")

    useEffect(() => {
        setup()
    }, [])

    const getImageAddressOnIPFS = async (imageAddress) => {
        return new Promise( async (resolve, _) => {
            const metadataResponse = await fetch('http://localhost:3000/metadataReport.json');
            const codeResponse = await fetch('http://localhost:3000/codeReport.wasm');

            const metadata = await metadataResponse.json();
            var code = await codeResponse.arrayBuffer();

            const wasm = new Uint8Array(code)

            const contract = new CodePromise(api, metadata, wasm)
            const gasLimit = api.registry.createType("WeightV2", {
                refTime: new BN("100000000000"),
                proofSize: new BN("10000000000"),
            });
            const storageDepositLimit = null
        })
    }

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

    const onButtonPressed = () => {

    }

    const onFileSelectorChange = async (target) => {
        if (target.files) {
            const audioFile = target.files[0]
            console.log(audioFile.type)

            const imageCanvas = await functionsHelper.getImageUrlDataFromWatermakedBlob(audioFile)

            const extractedImageDiv = document.getElementById('divExtractedImage')

            extractedImageDiv.append(imageCanvas)

            setImageExtractedCanvas(imageCanvas)

            //setFileToReport(audioFile)
        }
    }

    return (
        <>
            <div>
                <div>
                    <h1 className="text-center pt-4 ">Reportar un evento</h1>
                </div>

                <div >
                    <div className='container p-5'>
                        <label for="formFileLg" class="form-label">Carga audio</label>
                        <input class="form-control form-control-sm" id="audioFormFile" type="file" onChange={({ target }) => { onFileSelectorChange(target) }}></input>

                        <div className='p-3'>
                            <button type="button" class="btn btn-primary" id='buttonDownload' onClick={onButtonPressed}>Subir</button>
                        </div>

                    </div>

                </div>
                <div className='row'>
                    <div className='col'>
                        <h2 className='text-center pt4'>Imagen a comparar</h2>
                        <div>
                            {imageToCompare ? <img src={imageToCompare}></img> : <div></div>}
                        </div>
                    </div>
                    <div className='col'>
                        <h2 className='text-center pt4'>Imagen extraida</h2>
                        <div id='divExtractedImage' className='text-center'>
                        </div>
                    </div>


                </div>

                <div className='text-center p-5'>
                    <h4>Resultado: {result}</h4>
                </div>
            </div>

        </>
    )



}