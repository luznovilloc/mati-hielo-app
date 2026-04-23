import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatARS, formatDate, today } from '../lib/helpers'
import Modal from '../components/Modal'
import Confirm from '../components/Confirm'

export default function ProveedorDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [proveedor, setProveedor] = useState(null)
  const [retiros, setRetiros] = useState([])
  const [pagos, setPagos] = useState([])
  const [tab, setTab] = useState('retiros')
  const [showRetiro, setShowRetiro] = useState(false)
  const [showPago, setShowPago] = useState(false)
  const [editingRetiro, setEditingRetiro] = useState(null)
  const [editingPago, setEditingPago] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [retiroForm, setRetiroForm] = useState({ fecha: today(), bolsas_chicas: 0, bolsas_grandes: 0, devueltas_chicas: 0, devueltas_grandes: 0 })
  const [pagoForm, setPagoForm] = useState({ fecha: today(), monto: '', nota: '' })

  useEffect(() => { load() }, [id])

  const load = async () => {
    const [prov, ret, pag] = await Promise.all([
      supabase.from('proveedores').select('*').eq('id', id).single(),
      supabase.from('retiros_proveedor').select('*').eq('proveedor_id', id).order('fecha', { ascending: false }),
      supabase.from('pagos_proveedor').select('*').eq('proveedor_id', id).order('fecha', { ascending: false }),
    ])
    setProveedor(prov.data)
    setRetiros(ret.data || [])
    setPagos(pag.data || [])
  }

  // Calcular deuda
  const totalRetiros = retiros.reduce((s, r) => {
    const pc = proveedor?.precio_bolsa_chica || 0
    const pg = proveedor?.precio_bolsa_grande || 0
    return s + ((r.bolsas_chicas - r.devueltas_chicas) * pc) + ((r.bolsas_grandes - r.devueltas_grandes) * pg)
  }, 0)
  const totalPagos = pagos.reduce((s, p) => s + Number(p.monto), 0)
  const deuda = totalRetiros - totalPagos

  const saveRetiro = async () => {
    const data = { ...retiroForm, proveedor_id: id }
    if (editingRetiro) {
      await supabase.from('retiros_proveedor').update(data).eq('id', editingRetiro.id)
    } else {
      await supabase.from('retiros_proveedor').insert(data)
    }
    setShowRetiro(false)
    setEditingRetiro(null)
    load()
  }

  const savePago = async () => {
    if (!pagoForm.monto) return
    const data = { ...pagoForm, proveedor_id: id }
    if (editingPago) {
      await supabase.from('pagos_proveedor').update(data).eq('id', editingPago.id)
    } else {
      await supabase.from('pagos_proveedor').insert(data)
    }
    setShowPago(false)
    setEditingPago(null)
    load()
  }

  const deleteItem = async () => {
    if (confirm.type === 'retiro') await supabase.from('retiros_proveedor').delete().eq('id', confirm.id)
    else await supabase.from('pagos_proveedor').delete().eq('id', confirm.id)
    setConfirm(null)
    load()
  }

  const openEditRetiro = (r) => {
    setEditingRetiro(r)
    setRetiroForm({ fecha: r.fecha, bolsas_chicas: r.bolsas_chicas, bolsas_grandes: r.bolsas_grandes, devueltas_chicas: r.devueltas_chicas, devueltas_grandes: r.devueltas_grandes })
    setShowRetiro(true)
  }

  const openEditPago = (p) => {
    setEditingPago(p)
    setPagoForm({ fecha: p.fecha, monto: p.monto, nota: p.nota || '' })
    setShowPago(true)
  }

  const openNewRetiro = () => {
    setEditingRetiro(null)
    setRetiroForm({ fecha: today(), bolsas_chicas: 0, bolsas_grandes: 0, devueltas_chicas: 0, devueltas_grandes: 0 })
    setShowRetiro(true)
  }

  const openNewPago = () => {
    setEditingPago(null)
    setPagoForm({ fecha: today(), monto: '', nota: '' })
    setShowPago(true)
  }

  if (!proveedor) return <div className="text-center py-12 text-slate-500">Cargando...</div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <button onClick={() => navigate('/proveedores')} className="text-slate-500 text-sm hover:text-slate-300 transition-colors mb-2">← Volver</button>
        <h1 className="font-display text-2xl font-700 text-white">{proveedor.nombre}</h1>
        <p className="text-slate-400 text-sm">Chica: {formatARS(proveedor.precio_bolsa_chica)} · Grande: {formatARS(proveedor.precio_bolsa_grande)}</p>
      </div>

      {/* Deuda card */}
      <div className={`card border ${deuda > 0 ? 'border-red-700/50 bg-red-900/10' : 'border-emerald-700/50 bg-emerald-900/10'}`}>
        <p className="label">Deuda actual</p>
        <p className={`font-display text-3xl font-800 ${deuda > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatARS(deuda)}</p>
        <p className="text-slate-500 text-xs mt-1">Total retiros {formatARS(totalRetiros)} · Pagado {formatARS(totalPagos)}</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
        <button onClick={() => setTab('retiros')} className={`flex-1 py-2 rounded-lg text-sm font-body transition-all ${tab === 'retiros' ? 'bg-ice-500 text-white' : 'text-slate-400'}`}>
          Retiros ({retiros.length})
        </button>
        <button onClick={() => setTab('pagos')} className={`flex-1 py-2 rounded-lg text-sm font-body transition-all ${tab === 'pagos' ? 'bg-ice-500 text-white' : 'text-slate-400'}`}>
          Pagos ({pagos.length})
        </button>
      </div>

      {/* Tab content */}
      {tab === 'retiros' && (
        <div className="space-y-3">
          <button onClick={openNewRetiro} className="btn-primary w-full">+ Registrar retiro</button>
          {retiros.length === 0 ? (
            <div className="card text-center py-6 text-slate-500">Sin retiros registrados</div>
          ) : retiros.map(r => {
            const netas_chicas = r.bolsas_chicas - r.devueltas_chicas
            const netas_grandes = r.bolsas_grandes - r.devueltas_grandes
            const costo = (netas_chicas * proveedor.precio_bolsa_chica) + (netas_grandes * proveedor.precio_bolsa_grande)
            return (
              <div key={r.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-body font-500">{formatDate(r.fecha)}</p>
                    <p className="text-slate-400 text-sm mt-1">
                      Chicas: {r.bolsas_chicas} retiradas, {r.devueltas_chicas} devueltas → <span className="text-white">{netas_chicas} netas</span>
                    </p>
                    <p className="text-slate-400 text-sm">
                      Grandes: {r.bolsas_grandes} retiradas, {r.devueltas_grandes} devueltas → <span className="text-white">{netas_grandes} netas</span>
                    </p>
                    <p className="text-ice-400 text-sm font-display font-600 mt-1">{formatARS(costo)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditRetiro(r)} className="text-slate-400 hover:text-ice-400 transition-colors">✏️</button>
                    <button onClick={() => setConfirm({ id: r.id, type: 'retiro' })} className="text-slate-400 hover:text-red-400 transition-colors">🗑️</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'pagos' && (
        <div className="space-y-3">
          <button onClick={openNewPago} className="btn-primary w-full">+ Registrar pago</button>
          {pagos.length === 0 ? (
            <div className="card text-center py-6 text-slate-500">Sin pagos registrados</div>
          ) : pagos.map(p => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-body font-500">{formatDate(p.fecha)}</p>
                  <p className="text-emerald-400 font-display font-600 text-lg">{formatARS(p.monto)}</p>
                  {p.nota && <p className="text-slate-400 text-sm">{p.nota}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditPago(p)} className="text-slate-400 hover:text-ice-400 transition-colors">✏️</button>
                  <button onClick={() => setConfirm({ id: p.id, type: 'pago' })} className="text-slate-400 hover:text-red-400 transition-colors">🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal retiro */}
      {showRetiro && (
        <Modal title={editingRetiro ? 'Editar retiro' : 'Nuevo retiro'} onClose={() => setShowRetiro(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Fecha</label>
              <input className="input" type="date" value={retiroForm.fecha} onChange={e => setRetiroForm({ ...retiroForm, fecha: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Bolsas chicas retiradas</label>
                <input className="input" type="number" min="0" value={retiroForm.bolsas_chicas} onChange={e => setRetiroForm({ ...retiroForm, bolsas_chicas: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Chicas devueltas</label>
                <input className="input" type="number" min="0" value={retiroForm.devueltas_chicas} onChange={e => setRetiroForm({ ...retiroForm, devueltas_chicas: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Bolsas grandes retiradas</label>
                <input className="input" type="number" min="0" value={retiroForm.bolsas_grandes} onChange={e => setRetiroForm({ ...retiroForm, bolsas_grandes: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Grandes devueltas</label>
                <input className="input" type="number" min="0" value={retiroForm.devueltas_grandes} onChange={e => setRetiroForm({ ...retiroForm, devueltas_grandes: Number(e.target.value) })} />
              </div>
            </div>
            {/* Preview costo */}
            <div className="bg-slate-800 rounded-xl p-3">
              <p className="text-slate-400 text-xs">Costo estimado</p>
              <p className="text-ice-400 font-display font-600">
                {formatARS(
                  ((retiroForm.bolsas_chicas - retiroForm.devueltas_chicas) * proveedor.precio_bolsa_chica) +
                  ((retiroForm.bolsas_grandes - retiroForm.devueltas_grandes) * proveedor.precio_bolsa_grande)
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowRetiro(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={saveRetiro} className="btn-primary flex-1">Guardar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal pago */}
      {showPago && (
        <Modal title={editingPago ? 'Editar pago' : 'Registrar pago'} onClose={() => setShowPago(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Fecha</label>
              <input className="input" type="date" value={pagoForm.fecha} onChange={e => setPagoForm({ ...pagoForm, fecha: e.target.value })} />
            </div>
            <div>
              <label className="label">Monto ($)</label>
              <input className="input" type="number" value={pagoForm.monto} onChange={e => setPagoForm({ ...pagoForm, monto: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label className="label">Nota (opcional)</label>
              <input className="input" value={pagoForm.nota} onChange={e => setPagoForm({ ...pagoForm, nota: e.target.value })} placeholder="Ej: transferencia, efectivo..." />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPago(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={savePago} className="btn-primary flex-1">Guardar</button>
            </div>
          </div>
        </Modal>
      )}

      {confirm && (
        <Confirm
          message={`¿Eliminar este ${confirm.type === 'retiro' ? 'retiro' : 'pago'}?`}
          onConfirm={deleteItem}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
