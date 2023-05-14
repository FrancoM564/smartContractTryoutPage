const nacl = require('tweetnacl')
const crypto = require('crypto')


export async function getKey(doWithAgreedKey){
    const socket = new WebSocket('ws://localhost:8006');

    const keys = nacl.box.keyPair()
    const publicKey = keys.publicKey
    const secretKey = keys.secretKey

    console.log(publicKey)
    console.log(secretKey)
    console.log(new TextDecoder().decode(publicKey))

    window.localStorage.setItem('pk',new TextDecoder().decode(publicKey))
    window.localStorage.setItem('sk',new TextDecoder().decode(secretKey))

    socket.onopen = async function() {
      console.log('Conexión establecida con el servidor');

      const action = {
        action:"sendPublicKey"
      }
  
      socket.send(JSON.stringify(action))
    }

    socket.onmessage = async (event) =>{
        const data = event.data

        const message = await processData(data,publicKey,socket)

        socket.send(message)
    }

    socket.onclose = (e) =>{
        doWithAgreedKey()
        console.log("Cierre hecho")
    }
}

export async function getSessionKey(){
    const values = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

    var key = ""
    
    for (let i = 0; i <618;i++){
        key += values.charAt(Math.floor(Math.random() * values.length))
    }

    return key
}

async function processData(data,socket){

    data = JSON.parse(data)

    switch (data.event){
        case "publicKeyMessage":

        const keys = nacl.box.keyPair()
        const publicKey = keys.publicKey
        const secretKey = keys.secretKey

            var pk = window.localStorage.setItem('serverKey', data.public_key)
            pk = new TextEncoder().encode(pk)

            console.log(pk)

            const message = {
                action:"sentClientPk",
                client_pk:publicKey
            }

            return JSON.stringify(message)
            
        default:
            console.log("deberia cerrarse")
    }

}