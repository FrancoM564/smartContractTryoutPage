const math = require('mathjs')
const crypto = require('crypto');
const BigIntBuffer = require('bigint-buffer');

export async function getKey(publicKey,privateKey,doWithAgreedKey){
    const socket = new WebSocket('ws://localhost:8006');

    socket.onopen = async function() {
      console.log('Conexión establecida con el servidor');

      const action = {
        action:"sendPublicKey",
      }
  
      socket.send(JSON.stringify(action))
    }

    socket.onmessage = async (event) =>{
        const data = event.data

        const message = await processData(data,socket,privateKey,publicKey,doWithAgreedKey)

        socket.send(message)
    }

    socket.onclose = (e) =>{
        console.log("Cierre hecho")
    }
}
async function processData(data,socket,privateKey,publicKey,doWithAgreedKey){

    data = JSON.parse(data)

    switch (data.event){
        case "computedOfferServer":

            const computedClientValue = await computeOffer(privateKey,data.p,data.g)

            console.log(data)

            const message = {
                action:"sendClientPk",
                client_pk:publicKey,
                computedValue:computedClientValue,
            }

            const sharedKey = math.mod(math.pow(data.computedKey,privateKey),data.p)
        
            console.log(sharedKey)

            const llave_buffer = BigIntBuffer.toBufferBE(BigInt(sharedKey), 16);
            const hash_object = crypto.createHash('sha256');
            hash_object.update(llave_buffer);
            const llave_string = hash_object.digest('hex').slice(0, 16);
            
            doWithAgreedKey(llave_string)

            return JSON.stringify(message)
            
        default:

            socket.close()

            console.log("deberia cerrarse")
    }

}

export function getRandomInt(max) {
    return new Promise((resolve, _) => {
        const value = Math.floor(Math.random() * max)
        resolve(value)
    });
  }

function computeOffer(a,p,g){
    return new Promise((resolve, _) => {
        const ga = math.pow(g,a)
        const offer =  math.mod(ga,p)
        resolve(offer)
    })
}