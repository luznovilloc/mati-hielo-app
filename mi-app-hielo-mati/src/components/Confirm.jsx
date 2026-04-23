import Modal from './Modal'

export default function Confirm({ message, onConfirm, onCancel }) {
  return (
    <Modal title="Confirmar" onClose={onCancel}>
      <p className="text-slate-300 mb-6">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-secondary flex-1">Cancelar</button>
        <button onClick={onConfirm} className="btn-danger flex-1">Eliminar</button>
      </div>
    </Modal>
  )
}
