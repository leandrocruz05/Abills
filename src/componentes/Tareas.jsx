import { useState } from 'react';
import { CheckSquare, Plus, Edit2, Trash2, X, Circle, CheckCircle2, Calendar, ArrowLeft, Save, FolderPlus, Settings } from 'lucide-react';

function Tareas() {
    // Estado de vistas y categorías
    const [vistaActiva, setVistaActiva] = useState('tareas'); // 'tareas' o 'planificador'
    const [categoriaActiva, setCategoriaActiva] = useState('ambos');
    
    // Estado de secciones personalizables
    const [secciones, setSecciones] = useState([
        { id: 's1', nombre: 'GENERALES', orden: 1 },
        { id: 's2', nombre: 'PROYECTOS', orden: 2 },
        { id: 's3', nombre: 'JUNTA', orden: 3 },
        { id: 's4', nombre: 'TRABAJO', orden: 4 }
    ]);
    const [mostrarModalSecciones, setMostrarModalSecciones] = useState(false);
    const [menuSeccionAbierto, setMenuSeccionAbierto] = useState(null);
    const [editandoSeccion, setEditandoSeccion] = useState(null);
    const [nombreTemporal, setNombreTemporal] = useState('');
    
    // Estado de tareas (luego se conectará a Firebase)
    const [tareas, setTareas] = useState([
        { id: '1', titulo: 'Revisar presupuesto mensual', descripcion: 'Revisar ingresos y gastos del mes', completada: false, prioridad: 'alta', categoria: 'ambos', seccion: 'GENERALES' },
        { id: '2', titulo: 'Hacer compras del super', descripcion: 'Comprar lista semanal', completada: false, prioridad: 'media', categoria: 'lean', seccion: null },
        { id: '3', titulo: 'Pagar servicios', descripcion: 'Luz, agua, internet', completada: true, prioridad: 'alta', categoria: 'agus', seccion: null },
        { id: '4', titulo: 'Organizar documentos', descripcion: 'Archivar papeles importantes', completada: false, prioridad: 'baja', categoria: 'ambos', seccion: 'JUNTA' }
    ]);
    
    // Estado del planificador semanal (independiente de tareas)
    const [eventosSemanales, setEventosSemanales] = useState([
        { id: 'e1', dia: 'lunes', hora: '17:00', actividad: 'Salida', persona: '👩🏼‍⚖️' },
        { id: 'e2', dia: 'lunes', hora: '17:40', actividad: 'Visita', persona: '🧑🏽‍💻' },
        { id: 'e3', dia: 'lunes', hora: '21:00', actividad: 'Fulbo', persona: '🧑🏽‍💻' },
        { id: 'e4', dia: 'martes', hora: '17:00', actividad: 'Salida', persona: '👩🏼‍⚖️' },
        { id: 'e5', dia: 'martes', hora: '17:00', actividad: 'Material U3', persona: '🧑🏽‍💻' },
        { id: 'e6', dia: 'martes', hora: '19:00', actividad: 'Clase', persona: '🧑🏽‍💻' },
        { id: 'e7', dia: 'martes', hora: '19:30', actividad: 'Natación', persona: '👩🏼‍⚖️' }
    ]);
    
    const [mostrarModalTarea, setMostrarModalTarea] = useState(false);
    const [tareaEditando, setTareaEditando] = useState(null);
    const [filtro, setFiltro] = useState('todas'); // todas, pendientes, completadas
    const [mostrarMenuNueva, setMostrarMenuNueva] = useState(false);
    
    // Filtrar tareas por categoría y estado
    const tareasFiltradas = tareas.filter(tarea => {
        // Filtro por categoría (estricto: solo la categoría seleccionada)
        const pasaCategoria = tarea.categoria === categoriaActiva;
        
        // Filtro por estado
        let pasaFiltro = true;
        if (filtro === 'pendientes') pasaFiltro = !tarea.completada;
        if (filtro === 'completadas') pasaFiltro = tarea.completada;
        
        return pasaCategoria && pasaFiltro;
    });
    
    // Estadísticas por categoría
    const tareasPorCategoria = tareas.filter(t => t.categoria === categoriaActiva);
    
    const estadisticas = {
        total: tareasPorCategoria.length,
        completadas: tareasPorCategoria.filter(t => t.completada).length,
        pendientes: tareasPorCategoria.filter(t => !t.completada).length
    };
    
    const toggleCompletada = (tareaId) => {
        setTareas(tareas.map(t => 
            t.id === tareaId ? { ...t, completada: !t.completada } : t
        ));
    };
    
    const agregarTarea = (nuevaTarea) => {
        setTareas([...tareas, { 
            ...nuevaTarea, 
            id: Date.now().toString(), 
            completada: false,
            categoria: categoriaActiva
        }]);
    };
    
    const editarTarea = (id, datosActualizados) => {
        setTareas(tareas.map(t => t.id === id ? { ...t, ...datosActualizados } : t));
    };
    
    const eliminarTarea = (id) => {
        if (window.confirm('¿Estás seguro de eliminar esta tarea?')) {
            setTareas(tareas.filter(t => t.id !== id));
        }
    };
    
    const abrirModalNuevaTarea = () => {
        setTareaEditando(null);
        setMostrarModalTarea(true);
    };
    
    const abrirModalEditarTarea = (tarea) => {
        setTareaEditando(tarea);
        setMostrarModalTarea(true);
    };

    return (
        <div className="tareas-container">
            {/* Header con navegación */}
            <div className="tareas-header-superior">
                <button className="btn-volver" onClick={() => window.location.href = '/'}>
                    <ArrowLeft size={20} />
                </button>
                <h1 className="tareas-titulo-principal">
                    <CheckSquare size={28} />
                    Tareas
                </h1>
            </div>

            {/* Tabs de Categorías */}
            <div className="categorias-tabs">
                <button 
                    className={`categoria-tab ${categoriaActiva === 'ambos' ? 'active' : ''}`}
                    onClick={() => setCategoriaActiva('ambos')}
                >
                    Ambos
                </button>
                <button 
                    className={`categoria-tab ${categoriaActiva === 'lean' ? 'active' : ''}`}
                    onClick={() => setCategoriaActiva('lean')}
                >
                    Lean
                </button>
                <button 
                    className={`categoria-tab ${categoriaActiva === 'agus' ? 'active' : ''}`}
                    onClick={() => setCategoriaActiva('agus')}
                >
                    Agus
                </button>
            </div>

            {/* Tabs de Vistas */}
            <div className="vistas-tabs">
                <button 
                    className={`vista-tab ${vistaActiva === 'tareas' ? 'active' : ''}`}
                    onClick={() => setVistaActiva('tareas')}
                >
                    <CheckSquare size={18} />
                    Tareas
                </button>
                <button 
                    className={`vista-tab ${vistaActiva === 'planificador' ? 'active' : ''}`}
                    onClick={() => setVistaActiva('planificador')}
                >
                    <Calendar size={18} />
                    Planificador
                </button>
            </div>

            {/* Vista de Tareas */}
            {vistaActiva === 'tareas' && (
                <>
                    {/* Header con filtros y botón agregar */}
                    <div className="tareas-header-unificado">
                        {/* Filtros */}
                        <div className="tareas-filtros-inline">
                            <button 
                                className={`filtro-btn ${filtro === 'todas' ? 'active' : ''}`}
                                onClick={() => setFiltro('todas')}
                            >
                                Todas
                            </button>
                            <button 
                                className={`filtro-btn ${filtro === 'pendientes' ? 'active' : ''}`}
                                onClick={() => setFiltro('pendientes')}
                            >
                                Pendientes
                            </button>
                            <button 
                                className={`filtro-btn ${filtro === 'completadas' ? 'active' : ''}`}
                                onClick={() => setFiltro('completadas')}
                            >
                                Completadas
                            </button>
                        </div>

                        {/* Botón Nueva con menú desplegable */}
                        <div className="btn-nueva-container">
                            <button 
                                className="btn-agregar-tarea" 
                                onClick={() => setMostrarMenuNueva(!mostrarMenuNueva)}
                            >
                                <Plus size={18} />
                                Nueva
                            </button>
                            
                            {mostrarMenuNueva && (
                                <>
                                    <div 
                                        className="menu-overlay" 
                                        onClick={() => setMostrarMenuNueva(false)}
                                    />
                                    <div className="menu-nueva">
                                        <button 
                                            className="menu-nueva-item"
                                            onClick={() => {
                                                abrirModalNuevaTarea();
                                                setMostrarMenuNueva(false);
                                            }}
                                        >
                                            <CheckSquare size={16} />
                                            Nueva Tarea
                                        </button>
                                        {categoriaActiva === 'ambos' && (
                                            <button 
                                                className="menu-nueva-item"
                                                onClick={() => {
                                                    const maxOrden = secciones.length > 0 
                                                        ? Math.max(...secciones.map(s => s.orden)) 
                                                        : 0;
                                                    const nuevaSeccion = {
                                                        id: Date.now().toString(),
                                                        nombre: 'NUEVA SECCIÓN',
                                                        orden: maxOrden + 1
                                                    };
                                                    setSecciones([...secciones, nuevaSeccion]);
                                                    setEditandoSeccion(nuevaSeccion.id);
                                                    setNombreTemporal('NUEVA SECCIÓN');
                                                    setMostrarMenuNueva(false);
                                                }}
                                            >
                                                <Settings size={16} />
                                                Nueva Sección
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Lista de Tareas */}
                    <div className="tareas-lista">
                        {tareasFiltradas.length === 0 ? (
                            <div className="empty-state">
                                <CheckSquare size={48} opacity={0.3} />
                                <p>No hay tareas {filtro === 'todas' ? '' : filtro}</p>
                            </div>
                        ) : (
                            <>
                                {/* Si es categoría 'ambos', agrupar por sección en cards */}
                                {categoriaActiva === 'ambos' ? (
                                    <>
                                        <div className="secciones-grid">
                                            {secciones
                                                .sort((a, b) => a.orden - b.orden)
                                                .map(seccion => {
                                                    const tareasPorSeccion = tareasFiltradas.filter(t => t.seccion === seccion.nombre);
                                                    
                                                    return (
                                                        <div key={seccion.id} className="seccion-card">
                                                            <div className="seccion-card-header">
                                                                {editandoSeccion === seccion.id ? (
                                                                    <input
                                                                        type="text"
                                                                        value={nombreTemporal}
                                                                        onChange={(e) => setNombreTemporal(e.target.value.toUpperCase())}
                                                                        onBlur={() => {
                                                                            if (nombreTemporal.trim()) {
                                                                                setSecciones(secciones.map(s => 
                                                                                    s.id === seccion.id ? { ...s, nombre: nombreTemporal.trim() } : s
                                                                                ));
                                                                            }
                                                                            setEditandoSeccion(null);
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                e.target.blur();
                                                                            }
                                                                        }}
                                                                        className="input-editar-seccion"
                                                                        autoFocus
                                                                    />
                                                                ) : (
                                                                    <h3 className="seccion-card-titulo">{seccion.nombre}</h3>
                                                                )}
                                                                <div className="seccion-card-actions">
                                                                    <span className="seccion-count">{tareasPorSeccion.length}</span>
                                                                    <div className="btn-menu-seccion-container">
                                                                        <button 
                                                                            className="btn-menu-seccion"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setMenuSeccionAbierto(menuSeccionAbierto === seccion.id ? null : seccion.id);
                                                                            }}
                                                                        >
                                                                            <Settings size={16} />
                                                                        </button>
                                                                        {menuSeccionAbierto === seccion.id && (
                                                                            <>
                                                                                <div 
                                                                                    className="menu-overlay" 
                                                                                    onClick={() => setMenuSeccionAbierto(null)}
                                                                                />
                                                                                <div className="menu-seccion-opciones">
                                                                                    <button
                                                                                        className="menu-seccion-item"
                                                                                        onClick={() => {
                                                                                            setEditandoSeccion(seccion.id);
                                                                                            setNombreTemporal(seccion.nombre);
                                                                                            setMenuSeccionAbierto(null);
                                                                                        }}
                                                                                    >
                                                                                        <Edit2 size={14} />
                                                                                        Editar
                                                                                    </button>
                                                                                    <button
                                                                                        className="menu-seccion-item menu-seccion-item-eliminar"
                                                                                        onClick={() => {
                                                                                            if (window.confirm(`¿Eliminar la sección "${seccion.nombre}"? Las tareas asociadas quedarán sin sección.`)) {
                                                                                                setSecciones(secciones.filter(s => s.id !== seccion.id));
                                                                                                setTareas(tareas.map(t => 
                                                                                                    t.seccion === seccion.nombre ? { ...t, seccion: null } : t
                                                                                                ));
                                                                                            }
                                                                                            setMenuSeccionAbierto(null);
                                                                                        }}
                                                                                    >
                                                                                        <Trash2 size={14} />
                                                                                        Borrar
                                                                                    </button>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="seccion-card-tareas">
                                                                {tareasPorSeccion.length === 0 ? (
                                                                    <p className="seccion-vacia">Sin tareas</p>
                                                                ) : (
                                                                    tareasPorSeccion.map(tarea => (
                                                                        <TareaItem 
                                                                            key={tarea.id}
                                                                            tarea={tarea}
                                                                            toggleCompletada={toggleCompletada}
                                                                            abrirModalEditarTarea={abrirModalEditarTarea}
                                                                            eliminarTarea={eliminarTarea}
                                                                            compacto={true}
                                                                        />
                                                                    ))
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </>
                                ) : (
                                    /* Si es lean o agus, mostrar lista simple */
                                    tareasFiltradas.map(tarea => (
                                        <TareaItem 
                                            key={tarea.id}
                                            tarea={tarea}
                                            toggleCompletada={toggleCompletada}
                                            abrirModalEditarTarea={abrirModalEditarTarea}
                                            eliminarTarea={eliminarTarea}
                                        />
                                    ))
                                )}
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Vista de Planificador */}
            {vistaActiva === 'planificador' && (
                <PlanificadorSemanal 
                    eventos={eventosSemanales}
                    setEventos={setEventosSemanales}
                    categoriaActiva={categoriaActiva}
                />
            )}

            {/* Modal Tarea */}
            {mostrarModalTarea && (
                <ModalTarea
                    tarea={tareaEditando}
                    categoriaActual={categoriaActiva}
                    secciones={secciones}
                    cerrar={() => setMostrarModalTarea(false)}
                    guardar={(datosTarea) => {
                        if (tareaEditando) {
                            editarTarea(tareaEditando.id, datosTarea);
                        } else {
                            agregarTarea(datosTarea);
                        }
                        setMostrarModalTarea(false);
                    }}
                />
            )}
        </div>
    );
}

// Componente para renderizar una tarea individual
function TareaItem({ tarea, toggleCompletada, abrirModalEditarTarea, eliminarTarea, compacto = false }) {
    return (
        <div className={`tarea-item ${tarea.completada ? 'completada' : ''} ${compacto ? 'tarea-item-compacto' : ''}`}>
            <button 
                className="tarea-checkbox"
                onClick={() => toggleCompletada(tarea.id)}
            >
                {tarea.completada ? (
                    <CheckCircle2 size={24} className="icono-check" />
                ) : (
                    <Circle size={24} className="icono-circle" />
                )}
            </button>
            
            <div className="tarea-contenido">
                <h3 className="tarea-titulo">{tarea.titulo}</h3>
                <div className="tarea-meta">
                    <span className={`tarea-prioridad prioridad-${tarea.prioridad}`}>
                        {tarea.prioridad}
                    </span>
                    {tarea.descripcion && (
                        <span className="tarea-descripcion">
                            {tarea.descripcion}
                        </span>
                    )}
                </div>
            </div>
            
            <div className="tarea-acciones">
                <button 
                    className="btn-icono-tarea"
                    onClick={() => abrirModalEditarTarea(tarea)}
                >
                    <Edit2 size={16} />
                </button>
                <button 
                    className="btn-icono-tarea btn-eliminar"
                    onClick={() => eliminarTarea(tarea.id)}
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
}

// Componente Planificador Semanal
function PlanificadorSemanal({ eventos, setEventos, categoriaActiva }) {
    const [mostrarModalEvento, setMostrarModalEvento] = useState(false);
    const [eventoEditando, setEventoEditando] = useState(null);
    
    const diasSemana = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
    
    // Mapeo de emojis por persona
    const emojisPersonas = {
        '👩🏼‍⚖️': 'Agus',
        '🧑🏽‍💻': 'Lean',
        '👩🏻‍🤝‍👨🏽': 'Ambos'
    };
    
    // Filtrar eventos según categoría activa
    const eventosFiltrados = eventos.filter(evento => {
        if (categoriaActiva === 'ambos') return true;
        if (categoriaActiva === 'lean') return evento.persona === '🧑🏽‍💻' || evento.persona === '👩🏻‍🤝‍👨🏽';
        if (categoriaActiva === 'agus') return evento.persona === '👩🏼‍⚖️' || evento.persona === '👩🏻‍🤝‍👨🏽';
        return true;
    });

    const eventosPorDia = (dia) => {
        return eventosFiltrados
            .filter(e => e.dia === dia)
            .sort((a, b) => a.hora.localeCompare(b.hora));
    };

    const agregarEvento = (nuevoEvento) => {
        setEventos([...eventos, { ...nuevoEvento, id: `e${Date.now()}` }]);
    };

    const editarEvento = (id, datosActualizados) => {
        setEventos(eventos.map(e => e.id === id ? { ...e, ...datosActualizados } : e));
    };

    const eliminarEvento = (id) => {
        if (window.confirm('¿Eliminar este evento?')) {
            setEventos(eventos.filter(e => e.id !== id));
        }
    };

    return (
        <div className="planificador-container">
            <div className="planificador-header">
                <h2 className="planificador-titulo">Planificador Semanal</h2>
                <button 
                    className="btn-agregar-evento"
                    onClick={() => {
                        setEventoEditando(null);
                        setMostrarModalEvento(true);
                    }}
                >
                    <Plus size={18} />
                    Nuevo Evento
                </button>
            </div>
            
            <div className="planificador-dias">
                {diasSemana.map(dia => {
                    const eventosDia = eventosPorDia(dia);
                    
                    return (
                        <div key={dia} className="planificador-dia">
                            <div className="dia-header-planificador">
                                <h3>{dia.charAt(0).toUpperCase() + dia.slice(1)}</h3>
                            </div>
                            
                            <div className="dia-eventos">
                                {eventosDia.length === 0 ? (
                                    <p className="sin-eventos">Sin eventos</p>
                                ) : (
                                    eventosDia.map(evento => (
                                        <div key={evento.id} className="evento-item">
                                            <div className="evento-info">
                                                <span className="evento-emoji">{evento.persona}</span>
                                                <span className="evento-hora">{evento.hora}</span>
                                                <span className="evento-actividad">{evento.actividad}</span>
                                            </div>
                                            <div className="evento-acciones">
                                                <button 
                                                    className="btn-icono-evento"
                                                    onClick={() => {
                                                        setEventoEditando(evento);
                                                        setMostrarModalEvento(true);
                                                    }}
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button 
                                                    className="btn-icono-evento btn-eliminar"
                                                    onClick={() => eliminarEvento(evento.id)}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal para agregar/editar eventos */}
            {mostrarModalEvento && (
                <ModalEvento
                    evento={eventoEditando}
                    cerrar={() => setMostrarModalEvento(false)}
                    guardar={(datosEvento) => {
                        if (eventoEditando) {
                            editarEvento(eventoEditando.id, datosEvento);
                        } else {
                            agregarEvento(datosEvento);
                        }
                        setMostrarModalEvento(false);
                    }}
                />
            )}
        </div>
    );
}

// Modal para eventos del planificador
function ModalEvento({ evento, cerrar, guardar }) {
    const [dia, setDia] = useState(evento?.dia || 'lunes');
    const [hora, setHora] = useState(evento?.hora || '');
    const [actividad, setActividad] = useState(evento?.actividad || '');
    const [persona, setPersona] = useState(evento?.persona || '👩🏼‍⚖️');

    const diasSemana = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

    const manejarGuardar = () => {
        if (!actividad.trim() || !hora) {
            alert('Por favor completa todos los campos');
            return;
        }

        guardar({ dia, hora, actividad: actividad.trim(), persona });
    };

    return (
        <>
            <div className="modal-overlay-tarea" onClick={cerrar} />
            <div className="modal-tarea">
                <div className="modal-tarea-header">
                    <h2>{evento ? 'Editar Evento' : 'Nuevo Evento'}</h2>
                    <button className="btn-cerrar-modal" onClick={cerrar}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-tarea-contenido">
                    <div className="form-group">
                        <label>Día</label>
                        <select
                            value={dia}
                            onChange={(e) => setDia(e.target.value)}
                            className="input-tarea"
                        >
                            {diasSemana.map(d => (
                                <option key={d} value={d}>
                                    {d.charAt(0).toUpperCase() + d.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Hora</label>
                        <input
                            type="time"
                            value={hora}
                            onChange={(e) => setHora(e.target.value)}
                            className="input-tarea"
                        />
                    </div>

                    <div className="form-group">
                        <label>Actividad</label>
                        <input
                            type="text"
                            value={actividad}
                            onChange={(e) => setActividad(e.target.value)}
                            placeholder="Ej: Salida, Fulbo, Natación"
                            className="input-tarea"
                        />
                    </div>

                    <div className="form-group">
                        <label>Persona</label>
                        <div className="personas-grid">
                            <button
                                type="button"
                                className={`persona-btn ${persona === '👩🏼‍⚖️' ? 'selected' : ''}`}
                                onClick={() => setPersona('👩🏼‍⚖️')}
                            >
                                👩🏼‍⚖️ Agus
                            </button>
                            <button
                                type="button"
                                className={`persona-btn ${persona === '🧑🏽‍💻' ? 'selected' : ''}`}
                                onClick={() => setPersona('🧑🏽‍💻')}
                            >
                                🧑🏽‍💻 Lean
                            </button>
                            <button
                                type="button"
                                className={`persona-btn ${persona === '👩🏻‍❤️‍👨🏽' ? 'selected' : ''}`}
                                onClick={() => setPersona('👩🏻‍❤️‍👨🏽')}
                            >
                                👩🏻‍❤️‍👨🏽 Ambos
                            </button>
                        </div>
                    </div>
                </div>

                <div className="modal-tarea-footer">
                    <button className="btn-cancelar-tarea" onClick={cerrar}>
                        Cancelar
                    </button>
                    <button className="btn-guardar-tarea" onClick={manejarGuardar}>
                        <Save size={20} />
                        Guardar
                    </button>
                </div>
            </div>
        </>
    );
}

// Modal para agregar/editar tareas
function ModalTarea({ tarea, categoriaActual, secciones, cerrar, guardar }) {
    const [titulo, setTitulo] = useState(tarea?.titulo || '');
    const [descripcion, setDescripcion] = useState(tarea?.descripcion || '');
    const [prioridad, setPrioridad] = useState(tarea?.prioridad || 'media');
    const [categoria, setCategoria] = useState(tarea?.categoria || categoriaActual);
    const [seccion, setSeccion] = useState(tarea?.seccion || secciones[0]?.nombre || 'GENERALES');

    const manejarGuardar = () => {
        if (!titulo.trim()) {
            alert('Por favor ingresa un título');
            return;
        }

        guardar({
            titulo: titulo.trim(),
            descripcion: descripcion.trim(),
            prioridad,
            categoria,
            seccion: categoria === 'ambos' ? seccion : null
        });
    };

    return (
        <>
            <div className="modal-overlay-tarea" onClick={cerrar} />
            <div className="modal-tarea">
                <div className="modal-tarea-header">
                    <h2>{tarea ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
                    <button className="btn-cerrar-modal" onClick={cerrar}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-tarea-contenido">
                    <div className="form-group">
                        <label>Título de la Tarea</label>
                        <input
                            type="text"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            placeholder="Ej: Revisar presupuesto mensual"
                            className="input-tarea"
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label>Descripción</label>
                        <textarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Descripción opcional de la tarea"
                            className="input-tarea textarea-tarea"
                            rows={3}
                        />
                    </div>

                    <div className="form-group">
                        <label>Prioridad</label>
                        <div className="prioridades-grid">
                            {['baja', 'media', 'alta'].map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    className={`prioridad-btn prioridad-${p} ${prioridad === p ? 'selected' : ''}`}
                                    onClick={() => setPrioridad(p)}
                                >
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Categoría</label>
                        <div className="categorias-grid">
                            {[
                                { value: 'ambos', label: 'Ambos' },
                                { value: 'lean', label: 'Lean' },
                                { value: 'agus', label: 'Agus' }
                            ].map(cat => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    className={`categoria-btn categoria-${cat.value} ${categoria === cat.value ? 'selected' : ''}`}
                                    onClick={() => setCategoria(cat.value)}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Mostrar selector de sección solo si categoria === 'ambos' */}
                    {categoria === 'ambos' && (
                        <div className="form-group">
                            <label>Sección</label>
                            <div className="secciones-selector">
                                {secciones.sort((a, b) => a.orden - b.orden).map(s => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        className={`seccion-btn ${seccion === s.nombre ? 'selected' : ''}`}
                                        onClick={() => setSeccion(s.nombre)}
                                    >
                                        {s.nombre}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-tarea-footer">
                    <button className="btn-cancelar-tarea" onClick={cerrar}>
                        Cancelar
                    </button>
                    <button className="btn-guardar-tarea" onClick={manejarGuardar}>
                        <Save size={20} />
                        Guardar
                    </button>
                </div>
            </div>
        </>
    );
}

// Modal para gestionar secciones
function ModalSecciones({ secciones, setSecciones, cerrar }) {
    const [seccionesLocal, setSeccionesLocal] = useState([...secciones]);
    const [nuevaSeccion, setNuevaSeccion] = useState('');
    const [editando, setEditando] = useState(null);

    const agregarSeccion = () => {
        if (!nuevaSeccion.trim()) {
            alert('Ingresa un nombre para la sección');
            return;
        }

        const maxOrden = seccionesLocal.length > 0 
            ? Math.max(...seccionesLocal.map(s => s.orden)) 
            : 0;

        setSeccionesLocal([
            ...seccionesLocal,
            {
                id: Date.now().toString(),
                nombre: nuevaSeccion.trim().toUpperCase(),
                orden: maxOrden + 1
            }
        ]);
        setNuevaSeccion('');
    };

    const eliminarSeccion = (id) => {
        if (window.confirm('¿Eliminar esta sección? Las tareas asociadas quedarán sin sección.')) {
            setSeccionesLocal(seccionesLocal.filter(s => s.id !== id));
        }
    };

    const editarSeccion = (id, nuevoNombre) => {
        if (!nuevoNombre.trim()) return;
        setSeccionesLocal(seccionesLocal.map(s => 
            s.id === id ? { ...s, nombre: nuevoNombre.trim().toUpperCase() } : s
        ));
        setEditando(null);
    };

    const moverSeccion = (id, direccion) => {
        const index = seccionesLocal.findIndex(s => s.id === id);
        if (index === -1) return;

        const nuevasSeccion = [...seccionesLocal];
        if (direccion === 'arriba' && index > 0) {
            [nuevasSeccion[index], nuevasSeccion[index - 1]] = [nuevasSeccion[index - 1], nuevasSeccion[index]];
        } else if (direccion === 'abajo' && index < nuevasSeccion.length - 1) {
            [nuevasSeccion[index], nuevasSeccion[index + 1]] = [nuevasSeccion[index + 1], nuevasSeccion[index]];
        }

        // Reordenar
        const reordenadas = nuevasSeccion.map((s, i) => ({ ...s, orden: i + 1 }));
        setSeccionesLocal(reordenadas);
    };

    const guardarCambios = () => {
        setSecciones(seccionesLocal);
        cerrar();
    };

    return (
        <>
            <div className="modal-overlay-tarea" onClick={cerrar} />
            <div className="modal-tarea modal-secciones">
                <div className="modal-tarea-header">
                    <h2>Gestionar Secciones</h2>
                    <button className="btn-cerrar-modal" onClick={cerrar}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-tarea-contenido">
                    {/* Agregar nueva sección */}
                    <div className="form-group">
                        <label>Agregar Nueva Sección</label>
                        <div className="input-con-boton">
                            <input
                                type="text"
                                value={nuevaSeccion}
                                onChange={(e) => setNuevaSeccion(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && agregarSeccion()}
                                placeholder="Ej: PROYECTOS"
                                className="input-tarea"
                            />
                            <button 
                                className="btn-agregar-seccion"
                                onClick={agregarSeccion}
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Lista de secciones */}
                    <div className="secciones-lista">
                        <label>Secciones Actuales</label>
                        {seccionesLocal.length === 0 ? (
                            <p className="empty-state-small">No hay secciones creadas</p>
                        ) : (
                            seccionesLocal
                                .sort((a, b) => a.orden - b.orden)
                                .map((seccion, index) => (
                                    <div key={seccion.id} className="seccion-item">
                                        {editando === seccion.id ? (
                                            <input
                                                type="text"
                                                defaultValue={seccion.nombre}
                                                onBlur={(e) => editarSeccion(seccion.id, e.target.value)}
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                        editarSeccion(seccion.id, e.target.value);
                                                    }
                                                }}
                                                autoFocus
                                                className="input-editar-seccion"
                                            />
                                        ) : (
                                            <span className="seccion-nombre">{seccion.nombre}</span>
                                        )}

                                        <div className="seccion-acciones">
                                            <button
                                                className="btn-icono-seccion"
                                                onClick={() => moverSeccion(seccion.id, 'arriba')}
                                                disabled={index === 0}
                                            >
                                                ↑
                                            </button>
                                            <button
                                                className="btn-icono-seccion"
                                                onClick={() => moverSeccion(seccion.id, 'abajo')}
                                                disabled={index === seccionesLocal.length - 1}
                                            >
                                                ↓
                                            </button>
                                            <button
                                                className="btn-icono-seccion"
                                                onClick={() => setEditando(seccion.id)}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                className="btn-icono-seccion btn-eliminar"
                                                onClick={() => eliminarSeccion(seccion.id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </div>

                <div className="modal-tarea-footer">
                    <button className="btn-cancelar-tarea" onClick={cerrar}>
                        Cancelar
                    </button>
                    <button className="btn-guardar-tarea" onClick={guardarCambios}>
                        <Save size={20} />
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </>
    );
}

export default Tareas;
