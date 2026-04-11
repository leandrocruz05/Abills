import { X, Check } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contextos/AuthContext';
import { useGestionarCategorias } from '../hooks/useFirestore';
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

export default function ModalNuevaCategoria({ mostrar, cerrar, tipo }) {
    const { usuarioActual } = useAuth();
    const { agregarCategoria, guardando } = useGestionarCategorias();
    
    const [nombre, setNombre] = useState('');
    const [color, setColor] = useState(COLORES_DISPONIBLES[0].valor);
    const [icono, setIcono] = useState('ajuste');

    if (!mostrar) return null;

    const limpiarFormulario = () => {
        setNombre('');
        setColor(COLORES_DISPONIBLES[0].valor);
        setIcono('ajuste');
    };

    const manejarCerrar = () => {
        limpiarFormulario();
        cerrar();
    };

    const manejarCrear = async () => {
        if (!nombre.trim()) {
            alert('Por favor ingresa un nombre para la categoría');
            return;
        }

        const nuevaCategoria = {
            nombre: nombre.trim(),
            color: color,
            icono,
            // Compatibilidad con render legado.
            tipo: icono,
            tipoMovimiento: tipo,
        };

        const exito = await agregarCategoria(usuarioActual?.uid, tipo, nuevaCategoria);
        
        if (exito) {
            limpiarFormulario();
            cerrar();
        } else {
            alert('Error al crear la categoría');
        }
    };

    return (
        <div className="modal-overlay modal-overlay-gestion" onClick={manejarCerrar}>
            <div className="modal-contenido modal-nueva-categoria" onClick={(e) => e.stopPropagation()}>
                <div className="modal-encabezado">
                    <h2 className="modal-titulo">Nueva Categoría</h2>
                    <button className="modal-boton-cerrar" onClick={manejarCerrar}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-cuerpo">
                    <div className="form-grupo">
                        <label>Nombre de la categoría</label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className="input-categoria-nombre"
                            placeholder="Ej: Supermercado, Ropa, Extras..."
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
                                    className={`color-opcion ${color === col.valor ? 'activo' : ''}`}
                                    style={{ backgroundColor: col.valor }}
                                    onClick={() => setColor(col.valor)}
                                    title={col.nombre}
                                >
                                    {color === col.valor && <Check size={16} />}
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
                                    className={`icono-opcion ${icono === item.id ? 'activo' : ''}`}
                                    onClick={() => setIcono(item.id)}
                                    title={item.nombre}
                                >
                                    <IconoCategoria tipo={item.id} />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="preview-categoria">
                        <label>Vista previa</label>
                        <div className="categoria-preview-item">
                            <div
                                className="categoria-preview-color"
                                style={{ backgroundColor: color }}
                            >
                                <IconoCategoria tipo={icono} />
                            </div>
                            <span className="categoria-preview-nombre">
                                {nombre.trim() || 'Nombre de la categoría'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="modal-pie">
                    <button
                        className="btn-secundario"
                        onClick={manejarCerrar}
                        disabled={guardando}
                    >
                        Cancelar
                    </button>
                    <button
                        className="btn-primario"
                        onClick={manejarCrear}
                        disabled={guardando || !nombre.trim()}
                    >
                        {guardando ? (
                            <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                <circle cx="12" cy="12" r="10" opacity="0.25" />
                                <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round" />
                            </svg>
                        ) : 'Crear'}
                    </button>
                </div>
            </div>
        </div>
    );
}
