//deberia hallarse con el contrato inteligente

export async function getEncriptionKey(contract_address) {
  return new Promise((resolve, _) => {
    const socket = new WebSocket("ws://localhost:8006");

    socket.onopen = async function () {
      console.log("Conexión establecida con el servidor");

      const action = {
        action: "sendEncriptionKey",
        contract_address: contract_address,
      };

      socket.send(JSON.stringify(action));
    };

    socket.onmessage = async (event) => {
      var data = event.data;

      data = JSON.parse(data);

      switch (data.event) {
        case "serverEncriptionKey":
          socket.close();
          resolve(data.key[0]);

        case "notFound":
          socket.close();
          resolve("No se ha encontrado el archivo");
      }
    };

    socket.onclose = (e) => {
      console.log("Cierre hecho");
    };
  });
}
