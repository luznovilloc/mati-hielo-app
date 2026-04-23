import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const [proveedores, setproveedores] = useState([])

  useEffect(() => {
    obtenerproveedores()
  }, [])

  async function obtenerproveedores() {
  const { data, error } = await supabase
    .from('proveedores')
    .select('*')

  console.log('DATA:', data)
  console.log('ERROR:', error)

  if (error) {
    console.log('Error:', error)
  } else {
    setproveedores(data)
  }

  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>proveedores</h1>

      {proveedores.length === 0 ? (
        <p>No hay datos o no tenés permisos</p>
      ) : (
        proveedores.map(p => (
          <div key={p.id}>
            {p.nombre} - {p.telefono}
          </div>
        ))
      )}
    </div>
  )
}

export default App
