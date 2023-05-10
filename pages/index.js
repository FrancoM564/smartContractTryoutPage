import Head from 'next/head';
import styles from '../styles/Home.module.css';
import 'bootstrap/dist/css/bootstrap.css'

import { useRef, useState } from 'react';


export default function Home() {

  const [file,setFile] = useState(null)


  return (
    <div className='container'>
      <h1 className='fw-bold fs-1 text-center'>
        Prueba de subida de archivos
      </h1>

      <div className='p-3'>
          <label for="formFileLg" class="form-label">Large file input example</label>
          <input class="form-control form-control-sm" id="formFile" type="file"
          onChange={({target})=>{
            if (target.files) {
              const file = target.files[0]
              setFile(file)
            }
          }}></input>
      </div>
      <div className='row'>
        <div className='col'>
        </div>
        <div className='col text-center' >
          <button type="button" class="btn btn-primary" id='buttonUpload'>Subir</button>
        </div>
        <div className='col'>
        </div>
      </div>

      <div>
      {file ? (<div><a>{File.call.length}</a>
      <a>Presente</a></div>) : <div></div>}
      </div>
      
    </div>

  )
}
