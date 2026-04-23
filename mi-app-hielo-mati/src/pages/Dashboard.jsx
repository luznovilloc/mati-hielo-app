import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS, today } from '../lib/helpers'
import { format, startOfWeek, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

export default function Dashboard() {
  const [period, setPeriod] = useState('day')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [period])

  const getRange = () => {
    const t = today()
    if (period === 'day') return { from: t, to: t }
    if (period === 'week') return { from: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: t }
    return { from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: t }
  }

  const loadData = async () => {
    setLoading(true)
    const { from, to } = getRange()

    const [entregas, cobros, retiros, pagos, jornadas, clientesRes, provRes] = await Promise.all([
      supabase.from('entregas').select('*, clientes(precio_bolsa_chica, precio_bolsa_grande)').gte('fecha', from).lte('fecha', to),
      supabase.from('cobros_clientes').select('monto').gte('fecha', from).lte('fecha', to),
      supabase.from('retiros_proveedor').select('*, proveedores(precio_bolsa_chica, precio_bolsa_grande)').gte('fecha', from).lte('fecha', to),
      supabase.from('pagos_proveedor').select('monto').gte('fecha', from).lte('fecha', to),
      supabase.from('jornadas_empleado').select('monto_pagado').gte('fecha', from).lte('fecha', to),
      // deuda clientes total
      supabase.from('entregas').select('*, clientes(precio_bolsa_chica, precio_bolsa_grande)').eq('pagado', false),
      // deuda proveedor total
      supabase.from('retiros_proveedor').select('*, proveedores(precio_bolsa_chica, precio_bolsa_grande)'),
    ])

    // Ventas del período
    let ventasPeriodo = 0
    let bolsasChicasEntregadas = 0
    let bolsasGrandesEntregadas = 0
    for (const e of entregas.data || []) {
      const pc = e.clientes?.precio_bolsa_chica || 0
      const pg = e.clientes?.precio_bolsa_grande || 0
      ventasPeriodo += (e.bolsas_chicas * pc) + (e.bolsas_grandes * pg)
      bolsasChicasEntregadas += e.bolsas_chicas || 0
      bolsasGrandesEntregadas += e.bolsas_grandes || 0
    }

    // Cobros del período
    const cobradoPeriodo = (cobros.data || []).reduce((s, c) => s + Number(c.monto), 0)

    // Costo proveedor del período
    let costoPeriodo = 0
    let bolsasChicasRetiro = 0
    let bolsasGrandesRetiro = 0
    for (const r of retiros.data || []) {
      const pc = r.proveedores?.precio_bolsa_chica || 0
      const pg = r.proveedores?.precio_bolsa_grande || 0
      const netas_chicas = (r.bolsas_chicas || 0) - (r.devueltas_chicas || 0)
      const netas_grandes = (r.bolsas_grandes || 0) - (r.devueltas_grandes || 0)
      costoPeriodo += (netas_chicas * pc) + (netas_grandes * pg)
      bolsasChicasRetiro += netas_chicas
      bolsasGrandesRetiro += netas_grandes
    }

    const pagadoProveedor = (pagos.data || []).reduce((s, p) => s + Number(p.monto), 0)
    const pagadoEmpleado = (jornadas.data || []).reduce((s, j) => s + Number(j.monto_pagado), 0)
    const ganancia = ventasPeriodo - costoPeriodo - pagadoEmpleado

    // Deuda total clientes
    let deudaClientes = 0
    for (const e of clientesRes.data || []) {
      const pc = e.clientes?.precio_bolsa_chica || 0
      const pg = e.clientes?.precio_bolsa_grande || 0
      deudaClientes += (e.bolsas_chicas * pc) + (e.bolsas_grandes * pg)
    }

    // Deuda total proveedor
    let totalRetiros = 0
    let totalPagosAcc = 0
    for (const r of provRes.data || []) {
      const pc = r.proveedores?.precio_bolsa_chica || 0
      const pg = r.proveedores?.precio_bolsa_grande || 0
      const netas_chicas = (r.bolsas_chicas || 0) - (r.devueltas_chicas || 0)
      const netas_grandes = (r.bolsas_grandes || 0) - (r.devueltas_grandes || 0)
      totalRetiros += (netas_chicas * pc) + (netas_grandes * pg)
    }
    const allPagos = await supabase.from('pagos_proveedor').select('monto')
    totalPagosAcc = (allPagos.data || []).reduce((s, p) => s + Number(p.monto), 0)
    const deudaProveedor = totalRetiros - totalPagosAcc

    setData({
      ventasPeriodo, cobradoPeriodo, costoPeriodo, pagadoProveedor,
      pagadoEmpleado, ganancia, deudaClientes, deudaProveedor,
      bolsasChicasEntregadas, bolsasGrandesEntregadas,
      bolsasChicasRetiro, bolsasGrandesRetiro,
    })
    setLoading(false)
  }

  const periodLabel = { day: 'Hoy', week: 'Esta semana', month: 'Este mes' }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-700 text-white">Resumen</h1>
        <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
          {['day', 'week', 'month'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-lg text-xs font-body transition-all ${period === p ? 'bg-ice-500 text-white' : 'text-slate-400'}`}
            >
              {p === 'day' ? 'Hoy' : p === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Cargando...</div>
      ) : (
        <>
          {/* Ganancia destacada */}
          <div className="card border-ice-700/50 bg-gradient-to-br from-ice-900/30 to-slate-900">
            <p className="label">Ganancia — {periodLabel[period]}</p>
            <p className={`font-display text-3xl font-800 ${data.ganancia >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatARS(data.ganancia)}
            </p>
            <p className="text-slate-500 text-xs mt-1">Ventas {formatARS(data.ventasPeriodo)} · Costo {formatARS(data.costoPeriodo)} · Empleado {formatARS(data.pagadoEmpleado)}</p>
          </div>

          {/* Bolsas del período */}
          <div className="card">
            <p className="label mb-3">Bolsas — {periodLabel[period]}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800 rounded-xl p-3">
                <p className="text-slate-400 text-xs mb-1">Entregadas a clientes</p>
                <p className="font-display font-700 text-white">{data.bolsasChicasEntregadas} <span className="text-slate-400 text-sm font-body">chicas</span></p>
                <p className="font-display font-700 text-white">{data.bolsasGrandesEntregadas} <span className="text-slate-400 text-sm font-body">grandes</span></p>
              </div>
              <div className="bg-slate-800 rounded-xl p-3">
                <p className="text-slate-400 text-xs mb-1">Retiradas del proveedor</p>
                <p className="font-display font-700 text-white">{data.bolsasChicasRetiro} <span className="text-slate-400 text-sm font-body">chicas</span></p>
                <p className="font-display font-700 text-white">{data.bolsasGrandesRetiro} <span className="text-slate-400 text-sm font-body">grandes</span></p>
              </div>
            </div>
          </div>

          {/* Deudas totales */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card">
              <p className="label">Te deben clientes</p>
              <p className="font-display text-xl font-700 text-amber-400">{formatARS(data.deudaClientes)}</p>
            </div>
            <div className="card">
              <p className="label">Le debés al proveedor</p>
              <p className="font-display text-xl font-700 text-red-400">{formatARS(data.deudaProveedor)}</p>
            </div>
          </div>

          {/* Cobros y pagos del período */}
          <div className="card space-y-3">
            <p className="label">Movimientos — {periodLabel[period]}</p>
            <div className="flex justify-between items-center">
              <span className="text-slate-300 text-sm">Cobrado a clientes</span>
              <span className="text-emerald-400 font-display font-600">{formatARS(data.cobradoPeriodo)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300 text-sm">Pagado al proveedor</span>
              <span className="text-red-400 font-display font-600">{formatARS(data.pagadoProveedor)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300 text-sm">Pagado al empleado</span>
              <span className="text-red-400 font-display font-600">{formatARS(data.pagadoEmpleado)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
