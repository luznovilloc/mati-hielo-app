import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatARS, formatDate, today } from '../lib/helpers'
import Modal from '../components/Modal'
import Confirm from '../components/Confirm'

const MEDIOS_PAGO = ['Efectivo', 'Transferencia', 'Mercado Pago', 'Débito', 'Crédito', 'Otro']

export default function ClienteDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cliente, setCliente] = useState(null)
  const [entregas, setEntregas] = useState([])
  const [cobros, setCobros] = useState([])
  const [tab, setTab] = useState('entregas')
  const [showEntrega, setShowEntrega] = useState(false)
  const [showCobro, setShowCobro] = useState(false)
  const [editingEntrega, setEditingEntrega] = useState(null)
  const [editingCobro, setEditingCobro] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [entregaForm, setEntregaForm] = useState({ fecha: today(), bolsas_chicas: 0, bolsas_grandes: 0, pagado: false, medio_pago: '' })
  const [cobroForm, setCobroForm] = useState({ fecha: today(), monto: '', medio_pago: '' })

  useEffect(() => { load() }, [id])

  const load = async () => {
    const [cli, ent, cob] = await Promise.all([
      supabase.from('clientes').select('*').eq('id', id).single(),
      supabase.from('entregas').select('*').eq('cliente_id', id).order('fecha', { ascending: false }),
      supabase.from('cobros_clientes').select('*').eq('cliente_id', id).order('fecha', { ascending: false }),
    ])
    setCliente(cli.data)
    setEntregas(ent.data || [])
    setCobros(cob.data || [])
  }

  const calcMontoEntrega = (e, c) => {
    const pc = c?.precio_bolsa_chica || 0
    const pg = c?.precio_bolsa_grande || 0
    return (e.bolsas_chicas * pc) + (e.bolsas_grandes * pg)
  }

  // Deuda total
  const totalEntregas = entregas.reduce((s, e) => s + calcMontoEntrega(e, cliente), 0)
  const totalEntregasPagadasDirecto = entregas.filter(e => e.pagado).reduce((s, e) => s + calcMontoEntrega(e, cliente), 0)
  const totalCobros = cobros.reduce((s, c) => s + Number(c.monto), 0)
  const deuda = totalEntregas - totalEntregasPagadasDirecto - totalCobros

  const saveEntrega = async () => {
    const data = { ...entregaForm, cliente_id: id }
    if (editingEntrega) {
      await supabase.from('entregas').update(data).eq('id', editingEntrega.id)
    } else {
      await supabase.from('entregas').insert(data)
    }
    setShowEntrega(false)
    setEditingEntrega(null)
    load()
  }

  const saveCobro = async () => {
    if (!cobroForm.monto) return
    const data = { ...cobroForm, cliente_id: id }
    if (editingCobro) {
      await supabase.from('cobros_clientes').update(data).eq('id', editingCobro.id)
    } else {
      await supabase.from('cobros_clientes').insert(data)
    }
    setShowCobro(false)
    setEditingCobro(null)
    load()
  }

  const deleteItem = async () => {
    if (confirm.type === 'entrega') await supabase.from('entregas').delete().eq('id', confirm.id)
    else await supabase.from('cobros_clientes').delete().eq('id', confirm.id)
    setConfirm(null)
    load()
  }

  const openEditEntrega = (e) => {
    setEditingEntrega(e)
    setEntregaForm({ fecha: e.fecha, bolsas_chicas: e.bolsas_chicas, bolsas_grandes: e.bolsas_grandes, pagado: e.pagado, medio_pago: e.medio_pago || '' })
    setShowEntrega(true)
  }

  const openEditCobro = (c) => {
    setEditingCobro(c)
    setCobroForm({ fecha: c.fecha, monto: c.monto, medio_pago: c.medio_pago || '' })
    setShowCobro(true)
  }

  const openNewEntrega = () => {
    setEditingEntrega(null)
    setEntregaForm({ fecha: today(), bolsas_chicas: 0, bolsas_grandes: 0, pagado: false, medio_pago: '' })
    setShowEntrega(true)
  }

  const openNewCobro = () => {
    setEditingCobro(null)
    setCobroForm({ fecha: today(), monto: '', medio_pago: '' })
    setShowCobro(true)
  }

  if (!cliente) return <div className="text-center py-12 text-slate-500">Cargando...</div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <button onClick={() => navigate('/clientes')} className="text-slate-500 text-sm hover:text-slate-300 transition-colors mb-2">← Volver</button>
        <h1 className="font-display text-2xl font-700 text-white">{cliente.nombre}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
          {cliente.telefono && <p className="text-slate-400 text-sm">📞 {cliente.telefono}</p>}
          {cliente.direccion && <p className="text-slate-400 text-sm">📍 {cliente.direccion}</p>}
        </div>
        <p className="text-slate-500 text-xs mt-1">
          Precio chica: {formatARS(cliente.precio_bolsa_chica)} · Grande: {formatARS(cliente.precio_bolsa_grande)}
        </p>
      </div>

      {/* Deuda card */}
      <div className={`card border ${deuda > 0 ? 'border-amber-700/50 bg-amber-900/10' : 'border-emerald-700/50 bg-emerald-900/10'}`}>
        <p className="label">Saldo pendiente</p>
        <p className={`font-display text-3xl font-800 ${deuda > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{formatARS(deuda)}</p>
        <p className="text-slate-500 text-xs mt-1">
          Total entregas {formatARS(totalEntregas)} · Cobrado {formatARS(totalEntregasPagadasDirecto + totalCobros)}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
        <button onClick={() => setTab('entregas')} className={`flex-1 py-2 rounded-lg text-sm font-body transition-all ${tab === 'entregas' ? 'bg-ice-500 text-white' : 'text-slate-400'}`}>
          Entregas ({entregas.length})
        </button>
        <button onClick={() => setTab('cobros')} className={`flex-1 py-2 rounded-lg text-sm font-body transition-all ${tab === 'cobros' ? 'bg-ice-500 text-white' : 'text-slate-400'}`}>
          Cobros ({cobros.length})
        </button>
      </div>

      {tab === 'entregas' && (
        <div className="space-y-3">
          <button onClick={openNewEntrega} className="btn-primary w-full">+ Registrar entrega</button>
          {entregas.length === 0 ? (
            <div className="card text-center py-6 text-slate-500">Sin entregas registradas</div>
          ) : entregas.map(e => {
            const monto = calcMontoEntrega(e, cliente)
            return (
              <div key={e.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-body font-500">{formatDate(e.fecha)}</p>
                      {e.pagado
                        ? <span className="badge-green">Pagado{e.medio_pago ? ` · ${e.medio_pago}` : ''}</span>
                        : <span className="badge-red">Pendiente</span>
                      }
                    </div>
                    <p className="text-slate-400 text-sm mt-1">
                      {e.bolsas_chicas > 0 && `${e.bolsas_chicas} chicas`}
                      {e.bolsas_chicas > 0 && e.bolsas_grandes > 0 && ' · '}
                      {e.bolsas_grandes > 0 && `${e.bolsas_grandes} grandes`}
                    </p>
                    <p className="text-ice-400 font-display font-600 mt-1">{formatARS(monto)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditEntrega(e)} className="text-slate-400 hover:text-ice-400 transition-colors">✏️</button>
                    <button onClick={() => setConfirm({ id: e.id, type: 'entrega' })} className="text-slate-400 hover:text-red-400 transition-colors">🗑️</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'cobros' && (
        <div className="space-y-3">
          <button onClick={openNewCobro} className="btn-primary w-full">+ Registrar cobro</button>
          {cobros.length === 0 ? (
            <div className="card text-center py-6 text-slate-500">Sin cobros registrados</div>
          ) : cobros.map(c => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-body font-500">{formatDate(c.fecha)}</p>
                  <p className="text-emerald-400 font-display font-600 text-lg">{formatARS(c.monto)}</p>
                  {c.medio_pago && <p className="text-slate-400 text-sm">{c.medio_pago}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditCobro(c)} className="text-slate-400 hover:text-ice-400 transition-colors">✏️</button>
                  <button onClick={() => setConfirm({ id: c.id, type: 'cobro' })} className="text-slate-400 hover:text-red-400 transition-colors">🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal entrega */}
      {showEntrega && (
        <Modal title={editingEntrega ? 'Editar entrega' : 'Nueva entrega'} onClose={() => setShowEntrega(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Fecha</label>
              <input className="input" type="date" value={entregaForm.fecha} onChange={e => setEntregaForm({ ...entregaForm, fecha: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Bolsas chicas</label>
                <input className="input" type="number" min="0" value={entregaForm.bolsas_chicas} onChange={e => setEntregaForm({ ...entregaForm, bolsas_chicas: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Bolsas grandes</label>
                <input className="input" type="number" min="0" value={entregaForm.bolsas_grandes} onChange={e => setEntregaForm({ ...entregaForm, bolsas_grandes: Number(e.target.value) })} />
              </div>
            </div>
            {/* Preview monto */}
            <div className="bg-slate-800 rounded-xl p-3">
              <p className="text-slate-400 text-xs">Monto</p>
              <p className="text-ice-400 font-display font-600">
                {formatARS((entregaForm.bolsas_chicas * cliente.precio_bolsa_chica) + (entregaForm.bolsas_grandes * cliente.precio_bolsa_grande))}
              </p>
            </div>
            {/* Pagado */}
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={entregaForm.pagado}
                  onChange={e => setEntregaForm({ ...entregaForm, pagado: e.target.checked })}
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ice-500"></div>
              </label>
              <span className="text-slate-300 text-sm">Pagó en el momento</span>
            </div>
            {entregaForm.pagado && (
              <div>
                <label className="label">Medio de pago</label>
                <select className="input" value={entregaForm.medio_pago} onChange={e => setEntregaForm({ ...entregaForm, medio_pago: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {MEDIOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowEntrega(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={saveEntrega} className="btn-primary flex-1">Guardar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal cobro */}
      {showCobro && (
        <Modal title={editingCobro ? 'Editar cobro' : 'Registrar cobro'} onClose={() => setShowCobro(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Fecha</label>
              <input className="input" type="date" value={cobroForm.fecha} onChange={e => setCobroForm({ ...cobroForm, fecha: e.target.value })} />
            </div>
            <div>
              <label className="label">Monto ($)</label>
              <input className="input" type="number" value={cobroForm.monto} onChange={e => setCobroForm({ ...cobroForm, monto: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label className="label">Medio de pago</label>
              <select className="input" value={cobroForm.medio_pago} onChange={e => setCobroForm({ ...cobroForm, medio_pago: e.target.value })}>
                <option value="">Seleccionar...</option>
                {MEDIOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCobro(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={saveCobro} className="btn-primary flex-1">Guardar</button>
            </div>
          </div>
        </Modal>
      )}

      {confirm && (
        <Confirm
          message={`¿Eliminar esta ${confirm.type === 'entrega' ? 'entrega' : 'cobro'}?`}
          onConfirm={deleteItem}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
