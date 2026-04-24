import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS, formatDate, today } from '../lib/helpers'
import { format, startOfMonth } from 'date-fns'
import Modal from '../components/Modal'
import Confirm from '../components/Confirm'

export default function Empleado() {
  const [jornadas, setJornadas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ fecha: today(), monto_pagado: '' })
  const [mesActual] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('jornadas_empleado').select('*').order('fecha', { ascending: false })
    setJornadas(data || [])
    setLoading(false)
  }

  const totalMes = jornadas
    .filter(j => j.fecha >= mesActual)
    .reduce((s, j) => s + Number(j.monto_pagado), 0)

  const totalHistorico = jornadas.reduce((s, j) => s + Number(j.monto_pagado), 0)

  const save = async () => {
    if (!form.monto_pagado) return
    if (editing) {
      await supabase.from('jornadas_empleado').update(form).eq('id', editing.id)
    } else {
      await supabase.from('jornadas_empleado').insert(form)
    }
    setShowForm(false)
    setEditing(null)
    load()
  }

  const openEdit = (j) => {
    setEditing(j)
    setForm({ fecha: j.fecha, monto_pagado: j.monto_pagado })
    setShowForm(true)
  }

  const openNew = () => {
    setEditing(null)
    setForm({ fecha: today(), monto_pagado: '' })
    setShowForm(true)
  }

  const remove = async (id) => {
    await supabase.from('jornadas_empleado').delete().eq('id', id)
    setConfirm(null)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-700 text-white">Empleado</h1>
        <button onClick={openNew} className="btn-primary">+ Registrar jornada</button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="label">Este mes</p>
          <p className="font-display text-xl font-700 text-ice-400">{formatARS(totalMes)}</p>
        </div>
        <div className="card">
          <p className="label">Histórico total</p>
          <p className="font-display text-xl font-700 text-slate-300">{formatARS(totalHistorico)}</p>
        </div>
      </div>

      {/* Lista jornadas */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Cargando...</div>
      ) : jornadas.length === 0 ? (
        <div className="card text-center py-8 text-slate-500">Sin jornadas registradas.</div>
      ) : (
        <div className="space-y-3">
          {jornadas.map(j => (
            <div key={j.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-body font-500">{formatDate(j.fecha)}</p>
                  <p className="text-emerald-400 font-display font-600 text-lg">{formatARS(j.monto_pagado)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(j)} className="text-slate-400 hover:text-ice-400 transition-colors">✏️</button>
                  <button onClick={() => setConfirm(j.id)} className="text-slate-400 hover:text-red-400 transition-colors">🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Editar jornada' : 'Registrar jornada'} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Fecha</label>
              <input className="input" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
            </div>
            <div>
              <label className="label">Monto pagado ($)</label>
              <input className="input" type="number" value={form.monto_pagado} onChange={e => setForm({ ...form, monto_pagado: e.target.value })} placeholder="0" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={save} className="btn-primary flex-1">Guardar</button>
            </div>
          </div>
        </Modal>
      )}

      {confirm && (
        <Confirm
          message="¿Eliminar esta jornada?"
          onConfirm={() => remove(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
