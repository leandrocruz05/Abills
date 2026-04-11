import { X, Edit2, Trash2, Check } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contextos/AuthContext';
import { useCategorias, useGestionarCategorias } from '../hooks/useFirestore';
import { ICONOS_CATEGORIA_DISPONIBLES } from '../config/categoriasConfig';
import IconoCategoria from './IconoCategoria';

const COLORES_DISPONIBLES = [
    { nombre: 'Gris', valor: '#6b7280' },
    { nombre: 'Rojo', valor: '#ef4444' },
    { nombre: 'Naranja', valor: '#f59e0b' },
    { nombre: 'Amarillo', valor: '#eab308' },
    { nombre: 'Verde', valor: '#22c55e' },
    { nombre: 'Cian', valor: '#06b6d4' },
    { nombre: 'Azul', valor: '#3b82f6' },
    { nombre: 'Púrpura', valor: '#a855f7' },
    { nombre: 'Rosa', valor: '#ec4899' },
];

export default function ModalAdministrarCategorias({ mostrar, cerrar, tipo }) {
    const { usuarioActual } = useAuth();
    const { categorias, cargando } = useCategorias(usuarioActual?.uid, tipo);
    const { editarCategoria, eliminarCategoria, guardando } = useGestionarCategorias();
    
    const [categoriaEditando, setCategoriaEditando] = useState(null);
    const [nombreTemp, setNombreTemp] = useState('');
    const [colorTemp, setColorTemp] = useState('');
    const [iconoTemp, setIconoTemp] = useState('ajuste');
    const [categoriaEliminar, setCategoriaEliminar] = useState(null);

    if (!mostrar) return null;

    const iniciarEdicion = (categoria) => {
        setCategoriaEditando(categoria.id);
        setNombreTemp(categoria.nombre);
        setColorTemp(categoria.color);
        setIconoTemp(categoria.icono || categoria.tipo || 'ajuste');
    };

    const cancelarEdicion = () => {
        setCategoriaEditando(null);
        setNombreTemp('');
        setColorTemp('');
        setIconoTemp('ajuste');
    };

    const confirmarEdicion = async () => {
        if (!nombreTemp.trim()) {
            alert('El nombre no puede estar vacío');
            return;
        }

        const exito = await editarCategoria(usuarioActual?.uid, tipo, categoriaEditando, {
            nombre: nombreTemp.trim(),
            color: colorTemp,
            icono: iconoTemp,
            // Compatibilidad con render legado.
            tipo: iconoTemp,
            tipoMovimiento: tipo,
        });

        if (exito) {
            cancelarEdicion();
        } else {
            alert('Error al editar la categoría');
        }
    };

    const confirmarEliminacion = async () => {
        const exito = await eliminarCategoria(usuarioActual?.uid, tipo, categoriaEliminar);
        
        if (exito) {
            setCategoriaEliminar(null);
        } else {
            alert('Error al eliminar la categoría');
        }
    };

    return (
        <div className="modal-overlay modal-overlay-gestion" onClick={cerrar}>
            <div className="modal-contenido modal-movimiento modal-gestion-categorias" onClick={(e) => e.stopPropagation()}>
                <div className="modal-encabezado">
                    <h2 className="modal-titulo">Administrar Categorías</h2>
                    <button className="modal-boton-cerrar" onClick={cerrar}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-cuerpo">
                    {cargando ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            Cargando categorías...
                        </div>
                    ) : categorias.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.6)' }}>
                            No hay categorías personalizadas aún
                        </div>
                    ) : (
                        <div className="lista-categorias-admin">
                            {categorias.map((categoria) => (
                                <div key={categoria.id} className="categoria-admin-item">
                                    {categoriaEditando === categoria.id ? (
                                        // Modo edición
                                        <div className="categoria-edicion">
                                            <div className="categoria-edicion-form">
                                                <div className="form-grupo">
                                                    <label>Nombre</label>
                                                    <input
                                                        type="text"
                                                        value={nombreTemp}
                                                        onChange={(e) => setNombreTemp(e.target.value)}
                                                        className="input-categoria-nombre"
                                                        maxLength={30}
                                                        autoFocus
                                                    />
                                                </div>
                                                
                                                <div className="form-grupo">
                                                    <label>Color</label>
                                                    <div className="selector-colores">
                                                        {COLORES_DISPONIBLES.map((col) => (
                                                            <button
                                                                key={col.valor}
                                                                className={`color-opcion ${colorTemp === col.valor ? 'activo' : ''}`}
                                                                style={{ backgroundColor: col.valor }}
                                                                onClick={() => setColorTemp(col.valor)}
                                                                title={col.nombre}
                                                            >
                                                                {colorTemp === col.valor && <Check size={16} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="form-grupo">
                                                    <label>Icono</label>
                                                    <div className="selector-iconos">
                                                        {ICONOS_CATEGORIA_DISPONIBLES.map((item) => (
                                                            <button
                                                                key={item.id}
                                                                className={`icono-opcion ${iconoTemp === item.id ? 'activo' : ''}`}
                                                                onClick={() => setIconoTemp(item.id)}
                                                                title={item.nombre}
                                                            >
                                                                <IconoCategoria tipo={item.id} />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="categoria-edicion-acciones">
                                                    <button
                                                        className="btn-secundario"
                                                        onClick={cancelarEdicion}
                                                        disabled={guardando}
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        className="btn-primario"
                                                        onClick={confirmarEdicion}
                                                        disabled={guardando}
                                                    >
                                                        {guardando ? (
                                                            <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                                                <circle cx="12" cy="12" r="10" opacity="0.25" />
                                                                <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round" />
                                                            </svg>
                                                        ) : 'Guardar'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        // Modo normal
                                        <>
                                            <div className="categoria-admin-info">
                                                <div
                                                    className="categoria-admin-color"
                                                    style={{ backgroundColor: categoria.color }}
                                                >
                                                    <IconoCategoria tipo={categoria.icono || categoria.tipo} />
                                                </div>
                                                <span className="categoria-admin-nombre">{categoria.nombre}</span>
                                            </div>
                                            
                                            <div className="categoria-admin-acciones">
                                                <button
                                                    className="btn-icono"
                                                    onClick={() => iniciarEdicion(categoria)}
                                                    title="Editar"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    className="btn-icono btn-eliminar"
                                                    onClick={() => setCategoriaEliminar(categoria.id)}
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal de confirmación de eliminación */}
                {categoriaEliminar && (
                    <div className="confirmacion-overlay">
                        <div className="confirmacion-dialogo">
                            <h3>¿Eliminar categoría?</h3>
                            <p>Esta acción no se puede deshacer.</p>
                            <div className="confirmacion-acciones">
                                <button
                                    className="btn-secundario"
                                    onClick={() => setCategoriaEliminar(null)}
                                    disabled={guardando}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn-peligro"
                                    onClick={confirmarEliminacion}
                                    disabled={guardando}
                                >
                                    {guardando ? 'Eliminando...' : 'Eliminar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
