import { ContractPromise } from "@polkadot/api-contract";
import BN from "bn.js";
import "bootstrap/dist/css/bootstrap.css";
const helper = require("../../helpers/functions");
const keyHelper = require("../../helpers/serverKeyAgreement");
import { useState, useEffect } from "react";
const { ApiPromise, WsProvider, Keyring } = require("@polkadot/api");
import { saveAs } from "file-saver";
import { getEncriptionKey } from "../../helpers/serverRetriveKeys";
import { index } from "mathjs";

export default function downloadPage() {
  const [api, setApi] = useState();
  const [keyring, setKeyring] = useState();
  const [demoAccount, setDemoAccount] = useState();
  const [downloadTextState, setDownloadTextState] = useState(
    "Esperando descarga...."
  );
  var tiempoCompra = 29;
  const [indexContract, setIndex] = useState(24);
  let downloadAdress = "";
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setup();
  }, []);

  const setup = async () => {
    const provider = new WsProvider("ws://127.0.0.1:9944");
    const api = await ApiPromise.create({ provider });

    const keyring = new Keyring({ type: "sr25519" });

    setApi(api);
    setKeyring(keyring);
    const Bob = keyring.addFromUri("//Bob", { name: "Bob default" });

    setDemoAccount(Bob);

    console.log("Cuenta configurada como bob");
    console.log(Bob);

    const [chain, nodeName, nodeVersion] = await Promise.all([
      api.rpc.system.chain(),
      api.rpc.system.name(),
      api.rpc.system.version(),
    ]);

    console.log(
      `You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`
    );
  };

  const onButtonBuyPressed = async () => {
    if (downloading) {
      return;
    }

    setDownloading(true);

    downloadAdress = await keyHelper.getContractAddress(indexContract);

    //let params = new URLSearchParams(location.search);

    var timeStartBuy = performance.now();

    let isBought = await buySong(downloadAdress);

    tiempoCompra = performance.now() - timeStartBuy;

    console.log(tiempoCompra);

    if (isBought) {
      console.log("Ya has comprado este archivo");
      setIndex(indexContract + 1);
      console.log("nuevo indice: ", indexContract);
      return;
    }

    console.log("Archivo comprado");

    await onButtonDownloadPressed();
  };

  const onButtonDownloadPressed = async () => {
    let params = new URLSearchParams(location.search);

    setDownloadTextState("Obteniendo informacion de smart contract");

    var timeStartGetInfo = performance.now();

    let contractInfo = await querySongAddress(downloadAdress);

    var timeCompleteGetInfo = performance.now() - timeStartGetInfo;

    if (contractInfo.ok == "No has comprado este archivo") {
      setDownloadTextState("El usuario no ha comprado este archivo");
      return;
    }

    setDownloadTextState("Descargando archivo");

    let encryptedStr = await helper.downloadFromIPFS(contractInfo.ok);

    //Colocar forma de obtener llave del servidor de proteccion1631

    const key = await getEncriptionKey(downloadAdress);

    console.log(key);

    var timeStartDecryption = performance.now();
    var memoryDecryption = performance.memory.usedJSHeapSize;

    let decryptStr = await helper.decryptAes(encryptedStr, key);

    var timeCompleteDecryption = performance.now() - timeStartDecryption;
    var memoryDecryptionFinal = (
      (performance.memory.usedJSHeapSize - memoryDecryption) /
      1048576
    ).toFixed(2);

    setDownloadTextState("Reconstruyendo archivo");

    let fileBlob = await helper.getBlobFromDataString(decryptStr);

    //console.log(fileBlob)

    setDownloadTextState("Guardando");

    //console.log(imageDataUrl);

    let filename = await querySongName(downloadAdress);

    //console.log(filename)

    var name = filename.ok;

    saveAs(fileBlob, `${name}`, { type: "audio/mp3" });

    console.log(
      "Tiempo compra: ",
      tiempoCompra,
      "ms\nTiempo obtener info: ",
      timeCompleteGetInfo,
      "ms\nTiempo desencriptacion: ",
      timeCompleteDecryption,
      "ms\nConsumo de memoria desencriptacion: ",
      memoryDecryptionFinal,
      "MB"
    );

    helper.saveOnCSVDowloadValues(
      name,
      tiempoCompra,
      timeCompleteGetInfo,
      timeCompleteDecryption,
      memoryDecryptionFinal
    );

    setDownloading(false);
    setIndex(indexContract + 1);
    console.log("nuevo indice: ", indexContract);
  };

  const querySongAddress = async (contractAddress) => {
    return new Promise(async (resolve, _) => {
      console.log(contractAddress);

      const contract = await getContract(contractAddress);

      const gasLimit = api.registry.createType("WeightV2", {
        refTime: new BN("100000000000"),
        proofSize: new BN("10000000000"),
      });

      const options = { storageDepositLimit: null, gasLimit: gasLimit };

      const { output } = await contract.query.recoverHashAddress(
        demoAccount.address,
        options
      );

      resolve(output.toJSON());
    });
  };

  const querySongPrice = async (contractAddress) => {
    return new Promise(async (resolve, _) => {
      const contract = await getContract(contractAddress);

      const gasLimit = api.registry.createType("WeightV2", {
        refTime: new BN("100000000000"),
        proofSize: new BN("10000000000"),
      });

      const options = { storageDepositLimit: null, gasLimit: gasLimit };

      const { output } = await contract.query.recoverSongPrice(
        demoAccount.address,
        options
      );

      resolve(output.toJSON());
    });
  };

  const querySongName = async (contractAddress) => {
    return new Promise(async (resolve, _) => {
      const contract = await getContract(contractAddress);

      const gasLimit = api.registry.createType("WeightV2", {
        refTime: new BN("100000000000"),
        proofSize: new BN("10000000000"),
      });

      const options = { storageDepositLimit: null, gasLimit: gasLimit };

      const { output } = await contract.query.recoverSongName(
        demoAccount.address,
        options
      );

      resolve(output.toJSON());
    });
  };

  const buySong = async (contractAddress) => {
    return new Promise(async (resolve, _) => {
      const metadataResponse = await fetch(
        "http://localhost:3000/metadata.json"
      );
      const metadata = await metadataResponse.json();

      const contract = new ContractPromise(api, metadata, contractAddress);

      const gasLimit = api.registry.createType("WeightV2", {
        refTime: new BN("100000000000"),
        proofSize: new BN("10000000000"),
      });

      var price = await querySongPrice(contractAddress);

      console.log(price);

      price = price.ok + price.ok / 10 + price.ok / 10;

      console.log(BigInt(price));

      const options = {
        storageDepositLimit: null,
        gasLimit: gasLimit,
        value: BigInt(price),
      };

      await contract.tx.buySong(options).signAndSend(demoAccount, (result) => {
        if (result.isCompleted) {
          if (result.dispatchError) {
            console.log(result.dispatchError);
            resolve(true);
          }
          resolve(false);
        }
      });
    });
  };

  const getContract = async (contractAddress) => {
    return new Promise(async (resolve, _) => {
      const metadataResponse = await fetch(
        "http://localhost:3000/metadata.json"
      );
      const metadata = await metadataResponse.json();

      const gasLimit = api.registry.createType("WeightV2", {
        refTime: new BN("100000000000"),
        proofSize: new BN("10000000000"),
      });

      const contract = new ContractPromise(api, metadata, contractAddress);

      resolve(contract);
    });
  };

  return (
    <>
      <div className="container text-center">
        <h1 className="p-3">Archivo por reproducir</h1>
        <div className="row">
          <div className="col">
            <div>
              <h2>Boton para comprar el audio</h2>

              <button
                type="button"
                class="btn btn-danger"
                id="buttonDownload"
                onClick={onButtonBuyPressed}
              >
                Comprar
              </button>
            </div>
          </div>

          <div className="col" id="divImagen">
            <h2>Boton para descargar el audio</h2>

            <button
              type="button"
              class="btn btn-primary"
              id="buttonDownload"
              onClick={onButtonDownloadPressed}
            >
              Descargar
            </button>
          </div>
        </div>
        <h2>{downloadTextState}</h2>
      </div>
    </>
  );
}
