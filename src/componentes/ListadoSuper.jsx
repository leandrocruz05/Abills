import { useState, useMemo, useEffect, useRef } from 'react';
import { ShoppingCart, Package, BarChart3, TrendingDown, TrendingUp, Plus, Edit2, Trash2, Save, X, ArrowLeft, Settings, ShoppingBag, CheckCircle } from 'lucide-react';
import { 
    useProductos, 
    useStock, 
    useActualizarStock, 
    useAgregarProducto, 
    useEditarProducto,
    useEliminarProducto,
    usePrecios,
    useActualizarPrecios,
    useDescuentos,
    useAgregarDescuento,
    useEliminarDescuento,
    useEditarDescuento,
    useSesionEnCompra,
    useHistorialCompras,
    useAgregarCompraHistorial
} from '../hooks/useFirestore';

function ListadoSuper() {
    const [seccionActiva, setSeccionActiva] = useState('compras'); // compras, productos, datos, estadisticas
    
    // Hooks de Firebase
    const { productos, cargando: cargandoProductos } = useProductos();
    const { stock, cargando: cargandoStock } = useStock();
    const { actualizar: actualizarStock } = useActualizarStock();
    const { agregar: agregarProductoDB } = useAgregarProducto();
    const { editar: editarProductoDB } = useEditarProducto();
    const { eliminar: eliminarProductoDB } = useEliminarProducto();
    const { precios, cargando: cargandoPrecios } = usePrecios();
    const { actualizar: actualizarPrecios } = useActualizarPrecios();
    const { descuentos: descuentosDB, cargando: cargandoDescuentos } = useDescuentos();
    const { agregar: agregarDescuentoDB } = useAgregarDescuento();
    const { eliminar: eliminarDescuentoDB } = useEliminarDescuento();
    const { editar: editarDescuentoDB } = useEditarDescuento();
    const { historial: historialCompras } = useHistorialCompras();
    const { agregar: agregarCompraHistorial } = useAgregarCompraHistorial();
    
    const [mostrarModalProducto, setMostrarModalProducto] = useState(false);
    const [productoEditando, setProductoEditando] = useState(null);
    const [mostrarModalPrecio, setMostrarModalPrecio] = useState(false);
    const [precioEditando, setPrecioEditando] = useState(null);
    const [cargandoMasivo, setCargandoMasivo] = useState(false);
    
    // Calcular qué productos necesitan comprarse
    const productosAComprar = useMemo(() => {
        if (cargandoProductos || cargandoStock || cargandoPrecios) return [];
        
        return productos
            .map(producto => {
                const stockActual = stock[producto.id] || 0;
                const cantidadAComprar = producto.cantidadIdeal - stockActual;
                
                if (cantidadAComprar > 0) {
                    return {
                        ...producto,
                        stockActual,
                        cantidadAComprar,
                        precios: precios[producto.id] || {}
                    };
                }
                return null;
            })
            .filter(item => item !== null);
    }, [productos, stock, precios, cargandoProductos, cargandoStock, cargandoPrecios]);
    
    // Convertir descuentos de Firebase a formato de objeto por día
    const descuentosPorDia = useMemo(() => {
        const descMap = {
            lunes: { coto: 0, carrefour: 0, makro: 0, dia: 0 },
            martes: { coto: 0, carrefour: 0, makro: 0, dia: 0 },
            miercoles: { coto: 0, carrefour: 0, makro: 0, dia: 0 },
            jueves: { coto: 0, carrefour: 0, makro: 0, dia: 0 },
            viernes: { coto: 0, carrefour: 0, makro: 0, dia: 0 },
            sabado: { coto: 0, carrefour: 0, makro: 0, dia: 0 },
            domingo: { coto: 0, carrefour: 0, makro: 0, dia: 0 }
        };

        descuentosDB.forEach(desc => {
            if (descMap[desc.dia] && descMap[desc.dia][desc.supermercado] !== undefined) {
                // Si hay múltiples descuentos, tomar el mayor
                descMap[desc.dia][desc.supermercado] = Math.max(
                    descMap[desc.dia][desc.supermercado],
                    desc.porcentaje
                );
            }
        });

        return descMap;
    }, [descuentosDB]);
    
    // Calcular totales por supermercado
    const totalesPorSuper = useMemo(() => {
        const supermercados = ['coto', 'carrefour', 'makro', 'dia'];
        const totales = {};
        
        supermercados.forEach(superm => {
            let totalContado = 0;
            let totalCompra = 0;
            
            productosAComprar.forEach(producto => {
                const precio = producto.precios[superm];
                if (precio && precio.contado) {
                    totalContado += precio.contado * producto.cantidadAComprar;
                    // Para totalCompra usa oferta si existe, sino usa contado
                    const precioFinal = precio.oferta || precio.contado;
                    totalCompra += precioFinal * producto.cantidadAComprar;
                }
            });
            
            totales[superm] = {
                contado: totalContado,
                compra: totalCompra,
                conDescuento: {},
                productosSinOferta: [] // Para saber qué productos aplican descuento
            };
            
            // Calcular con descuentos por día
            // Descuento SOLO aplica a productos SIN oferta
            Object.keys(descuentosPorDia).forEach(dia => {
                const porcentajeDescuento = descuentosPorDia[dia][superm] || 0;
                
                // Buscar el tope del descuento en descuentosDB (usar el que coincide con el % máximo)
                const descuentoInfo = descuentosDB.find(
                    d => d.dia === dia && d.supermercado === superm && d.porcentaje === porcentajeDescuento
                );
                const topeDescuento = descuentoInfo?.tope || null;
                
                let totalConOferta = 0;
                let totalSinOferta = 0;
                
                // Separar productos con y sin oferta
                productosAComprar.forEach(producto => {
                    const precio = producto.precios[superm];
                    if (precio && precio.contado) {
                        if (precio.oferta) {
                            // Productos con oferta (no aplican descuento)
                            totalConOferta += precio.oferta * producto.cantidadAComprar;
                        } else {
                            // Productos sin oferta (aplican descuento)
                            totalSinOferta += precio.contado * producto.cantidadAComprar;
                        }
                    }
                });
                
                // Calcular descuento con tope
                let descuentoCalculado = totalSinOferta * (porcentajeDescuento / 100);
                let descuentoAplicado = descuentoCalculado;
                
                if (topeDescuento && descuentoCalculado > topeDescuento) {
                    descuentoAplicado = topeDescuento;
                }
                
                const totalConDescuento = totalConOferta + (totalSinOferta - descuentoAplicado);
                totales[superm].conDescuento[dia] = totalConDescuento;
            });
        });
        
        return totales;
    }, [productosAComprar, descuentosPorDia, descuentosDB]);
    
    const formatearMoneda = (monto) => {
        if (!monto) return '-';
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2
        }).format(monto);
    };

    const agregarProducto = async (nuevoProducto) => {
        const exito = await agregarProductoDB(nuevoProducto);
        if (exito) {
            // Inicializar stock en 0 para el nuevo producto
            // El ID será generado por Firebase
        }
    };

    const editarProducto = async (id, datosActualizados) => {
        await editarProductoDB(id, datosActualizados);
    };

    const eliminarProducto = async (id) => {
        if (window.confirm('¿Eliminar producto?')) {
            await eliminarProductoDB(id);
        }
    };

    const actualizarStockFirebase = async (productoId, cantidad) => {
        const nuevoStock = { ...stock, [productoId]: parseInt(cantidad) || 0 };
        await actualizarStock(nuevoStock);
    };

    const aplicarCompraAStock = async (itemsComprados) => {
        if (!itemsComprados || itemsComprados.length === 0) return;
        const nuevoStock = { ...stock };

        itemsComprados.forEach(({ id, cantidad }) => {
            const actual = parseInt(nuevoStock[id]) || 0;
            const comprada = parseInt(cantidad) || 0;
            nuevoStock[id] = Math.max(0, actual + comprada);
        });

        await actualizarStock(nuevoStock);
    };

    const actualizarPreciosFirebase = async (productoId, datosPrecio) => {
        await actualizarPrecios(productoId, datosPrecio);
    };

    const limpiarPreciosSuper = async (superKey) => {
        const nombreSuper = superKey.toUpperCase();
        if (!window.confirm(`¿Limpiar todos los precios de ${nombreSuper}? Esta acción eliminará sólo los precios de ese supermercado.`)) {
            return;
        }

        setCargandoMasivo(true);
        let exitosos = 0;
        let fallidos = 0;

        const productosConPrecios = Object.keys(precios);

        for (const productoId of productosConPrecios) {
            const preciosActuales = precios[productoId] || {};
            const preciosActualizados = {
                ...preciosActuales,
                [superKey]: { marca: '', contado: null, oferta: null }
            };

            const exito = await actualizarPrecios(productoId, preciosActualizados);
            if (exito) exitosos++;
            else fallidos++;
        }

        setCargandoMasivo(false);
        alert(`Precios de ${nombreSuper} limpiados:\n✅ ${exitosos} productos actualizados\n❌ ${fallidos} fallidos`);
    };

    const limpiarTodosLosPrecios = async () => {
        if (!window.confirm('¿Limpiar todos los precios? Esta acción eliminará los precios de todos los productos. Es útil después de realizar la compra.')) {
            return;
        }

        setCargandoMasivo(true);
        let exitosos = 0;
        let fallidos = 0;

        // Obtener todos los productos que tienen precios
        const productosConPrecios = Object.keys(precios);

        for (const productoId of productosConPrecios) {
            const preciosVacios = {
                coto: { marca: '', contado: null, oferta: null },
                carrefour: { marca: '', contado: null, oferta: null },
                makro: { marca: '', contado: null, oferta: null },
                dia: { marca: '', contado: null, oferta: null }
            };

            const exito = await actualizarPrecios(productoId, preciosVacios);
            if (exito) {
                exitosos++;
            } else {
                fallidos++;
            }
        }

        setCargandoMasivo(false);
        alert(`Precios limpiados:\n✅ ${exitosos} productos actualizados\n❌ ${fallidos} fallidos`);
    };

    const cargarProductosIniciales = async () => {
        if (!window.confirm('¿Cargar 73 productos iniciales? Esta acción agregará todos los productos de la lista.')) {
            return;
        }

        const productosIniciales = [
            { nombre: 'ACEITE', cantidadIdeal: 1, ean: '0' },
            { nombre: 'ACEITUNAS', cantidadIdeal: 1, ean: '0' },
            { nombre: 'ACETO', cantidadIdeal: 1, ean: '0' },
            { nombre: 'ACONDICIONADOR', cantidadIdeal: 2, ean: '0' },
            { nombre: 'ADOBO', cantidadIdeal: 1, ean: '0' },
            { nombre: 'AGRIDULCES', cantidadIdeal: 1, ean: '0' },
            { nombre: 'AGUA SABORIZADA', cantidadIdeal: 3, ean: '0' },
            { nombre: 'AJI MOLIDO', cantidadIdeal: 1, ean: '0' },
            { nombre: 'ARROZ YAMANI', cantidadIdeal: 2, ean: '0' },
            { nombre: 'ARVEJA', cantidadIdeal: 4, ean: '0' },
            { nombre: 'ATUN', cantidadIdeal: 1, ean: '0' },
            { nombre: 'AZUCAR', cantidadIdeal: 1, ean: '0' },
            { nombre: 'BIZCOCHITOS', cantidadIdeal: 1, ean: '0' },
            { nombre: 'CALDO', cantidadIdeal: 1, ean: '0' },
            { nombre: 'COND. ARROZ', cantidadIdeal: 1, ean: '0' },
            { nombre: 'COND. PIZZA', cantidadIdeal: 1, ean: '0' },
            { nombre: 'COTONETES', cantidadIdeal: 1, ean: '0' },
            { nombre: 'DULCE DE LECHE', cantidadIdeal: 1, ean: '0' },
            { nombre: 'FIDEOS CODITO', cantidadIdeal: 1, ean: '0' },
            { nombre: 'FIDEOS MOSTACHOL', cantidadIdeal: 2, ean: '0' },
            { nombre: 'FIDEOS SOPEROS', cantidadIdeal: 1, ean: '0' },
            { nombre: 'FIDEOS SPAGETTI', cantidadIdeal: 2, ean: '0' },
            { nombre: 'FIDEOS TIRABUZON', cantidadIdeal: 1, ean: '0' },
            { nombre: 'FRITOLIN', cantidadIdeal: 1, ean: '0' },
            { nombre: 'GALLETITAS SURTIDAS', cantidadIdeal: 1, ean: '0' },
            { nombre: 'GASEOSA', cantidadIdeal: 2, ean: '0' },
            { nombre: 'HARINA', cantidadIdeal: 1, ean: '0' },
            { nombre: 'KETCHUP', cantidadIdeal: 1, ean: '0' },
            { nombre: 'LECHE', cantidadIdeal: 3, ean: '0' },
            { nombre: 'LENTEJA', cantidadIdeal: 2, ean: '0' },
            { nombre: 'LYSOFORM', cantidadIdeal: 2, ean: '0' },
            { nombre: 'MANTECA', cantidadIdeal: 1, ean: '0' },
            { nombre: 'MAYONESA', cantidadIdeal: 1, ean: '0' },
            { nombre: 'MERMELADA', cantidadIdeal: 1, ean: '0' },
            { nombre: 'NUGGETS POLLO', cantidadIdeal: 1, ean: '0' },
            { nombre: 'OREGANO', cantidadIdeal: 1, ean: '0' },
            { nombre: 'PAN LACTAL BIMBO', cantidadIdeal: 1, ean: '0' },
            { nombre: 'PAN LACTAL LEAN', cantidadIdeal: 2, ean: '0' },
            { nombre: 'PAN RALLADO', cantidadIdeal: 1, ean: '0' },
            { nombre: 'PAPAS FRITAS', cantidadIdeal: 1, ean: '0' },
            { nombre: 'PAPEL HIGIENICO', cantidadIdeal: 4, ean: '0' },
            { nombre: 'PATE', cantidadIdeal: 1, ean: '0' },
            { nombre: 'PEREJIL', cantidadIdeal: 1, ean: '0' },
            { nombre: 'PICADILLO', cantidadIdeal: 1, ean: '0' },
            { nombre: 'PIMENTON', cantidadIdeal: 1, ean: '0' },
            { nombre: 'POLENTA', cantidadIdeal: 1, ean: '0' },
            { nombre: 'PURE DE PAPA', cantidadIdeal: 1, ean: '0' },
            { nombre: 'PURE DE TOMATE', cantidadIdeal: 6, ean: '0' },
            { nombre: 'QUESO CREMA', cantidadIdeal: 3, ean: '0' },
            { nombre: 'RAPIDITAS', cantidadIdeal: 1, ean: '0' },
            { nombre: 'ROLLO DE COCINA', cantidadIdeal: 4, ean: '0' },
            { nombre: 'SAL', cantidadIdeal: 1, ean: '0' },
            { nombre: 'SALCHICHAS', cantidadIdeal: 1, ean: '0' },
            { nombre: 'SALSA CESAR', cantidadIdeal: 2, ean: '0' },
            { nombre: 'SAVORA', cantidadIdeal: 1, ean: '0' },
            { nombre: 'SHAMPOO', cantidadIdeal: 2, ean: '0' },
            { nombre: 'TALCO', cantidadIdeal: 1, ean: '0' },
            { nombre: 'TAPA EMPANADA', cantidadIdeal: 1, ean: '0' },
            { nombre: 'TAPA TARTA', cantidadIdeal: 1, ean: '0' },
            { nombre: 'TE', cantidadIdeal: 1, ean: '0' },
            { nombre: 'TONICA', cantidadIdeal: 1, ean: '0' },
            { nombre: 'TOSTADAS', cantidadIdeal: 0, ean: '0' },
            { nombre: 'VAINILLAS', cantidadIdeal: 1, ean: '0' },
            { nombre: 'YERBA', cantidadIdeal: 1, ean: '0' },
            { nombre: 'YOGURT', cantidadIdeal: 3, ean: '0' }
        ];

        setCargandoMasivo(true);
        let exitosos = 0;
        let fallidos = 0;

        for (const producto of productosIniciales) {
            const exito = await agregarProductoDB(producto);
            if (exito) {
                exitosos++;
            } else {
                fallidos++;
            }
        }

        setCargandoMasivo(false);
        alert(`Carga completada:\n✅ ${exitosos} productos agregados\n❌ ${fallidos} fallidos`);
    };

    if (cargandoProductos || cargandoStock || cargandoPrecios || cargandoDescuentos) {
        return (
            <div className="listado-super-container">
                <div className="empty-state">
                    <ShoppingCart size={48} opacity={0.3} />
                    <p>Cargando datos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="listado-super-container">
            {/* Header */}
            <div className="super-header-superior">
                <button className="btn-volver" onClick={() => window.location.href = '/'}>
                    <ArrowLeft size={20} />
                </button>
                <h1 className="super-titulo-principal">
                    <ShoppingCart size={28} />
                    Super
                </h1>
            </div>

            {/* Pestañas */}
            <div className="super-tabs">
                <button 
                    className={`super-tab ${seccionActiva === 'compras' ? 'active' : ''}`}
                    onClick={() => setSeccionActiva('compras')}
                >
                    <ShoppingCart size={18} />
                    <span>Compras</span>
                </button>
                <button 
                    className={`super-tab ${seccionActiva === 'productos' ? 'active' : ''}`}
                    onClick={() => setSeccionActiva('productos')}
                >
                    <Package size={18} />
                    <span>Productos</span>
                </button>
                <button 
                    className={`super-tab ${seccionActiva === 'datos' ? 'active' : ''}`}
                    onClick={() => setSeccionActiva('datos')}
                >
                    <Settings size={18} />
                    <span>Datos</span>
                </button>
                <button 
                    className={`super-tab ${seccionActiva === 'estadisticas' ? 'active' : ''}`}
                    onClick={() => setSeccionActiva('estadisticas')}
                >
                    <BarChart3 size={18} />
                    <span>Estadísticas</span>
                </button>
                <button 
                    className={`super-tab ${seccionActiva === 'encompra' ? 'active' : ''}`}
                    onClick={() => setSeccionActiva('encompra')}
                >
                    <ShoppingBag size={18} />
                    <span>En Compra</span>
                </button>
            </div>

            {/* Sección: Compras */}
            {seccionActiva === 'compras' && (
                <SeccionCompras 
                    productosAComprar={productosAComprar}
                    totalesPorSuper={totalesPorSuper}
                    descuentos={descuentosPorDia}
                    descuentosDB={descuentosDB}
                    formatearMoneda={formatearMoneda}
                    abrirModalPrecio={(producto) => {
                        setPrecioEditando(producto);
                        setMostrarModalPrecio(true);
                    }}
                    limpiarPrecios={limpiarTodosLosPrecios}
                    limpiarPreciosSuper={limpiarPreciosSuper}
                    cargandoLimpieza={cargandoMasivo}
                />
            )}

            {/* Sección: Productos */}
            {seccionActiva === 'productos' && (
                <SeccionProductos 
                    productos={productos}
                    stock={stock}
                    actualizarStock={actualizarStockFirebase}
                    agregarProducto={() => {
                        setProductoEditando(null);
                        setMostrarModalProducto(true);
                    }}
                    editarProducto={(p) => {
                        setProductoEditando(p);
                        setMostrarModalProducto(true);
                    }}
                    eliminarProducto={eliminarProducto}
                    cargarProductosIniciales={cargarProductosIniciales}
                    cargandoMasivo={cargandoMasivo}
                />
            )}

            {/* Sección: Datos */}
            {seccionActiva === 'datos' && (
                <SeccionDatos 
                    descuentos={descuentosDB}
                    agregarDescuento={agregarDescuentoDB}
                    eliminarDescuento={eliminarDescuentoDB}
                    editarDescuento={editarDescuentoDB}
                />
            )}

            {/* Sección: Estadísticas */}
            {seccionActiva === 'estadisticas' && (
                <SeccionEstadisticas 
                    productosAComprar={productosAComprar}
                    totalesPorSuper={totalesPorSuper}
                    descuentos={descuentosPorDia}
                    descuentosDB={descuentosDB}
                    formatearMoneda={formatearMoneda}
                    historialCompras={historialCompras}
                />
            )}

            {/* Sección: En Compra */}
            {seccionActiva === 'encompra' && (
                <SeccionEnCompra
                    productosAComprar={productosAComprar}
                    totalesPorSuper={totalesPorSuper}
                    descuentos={descuentosPorDia}
                    descuentosDB={descuentosDB}
                    formatearMoneda={formatearMoneda}
                    actualizarPrecios={actualizarPrecios}
                    precios={precios}
                    aplicarCompraAStock={aplicarCompraAStock}
                    guardarCompraHistorial={agregarCompraHistorial}
                />
            )}

            {/* Modales */}
            {mostrarModalProducto && (
                <ModalProducto
                    producto={productoEditando}
                    cerrar={() => setMostrarModalProducto(false)}
                    guardar={(datos) => {
                        if (productoEditando) {
                            editarProducto(productoEditando.id, datos);
                        } else {
                            agregarProducto(datos);
                        }
                        setMostrarModalProducto(false);
                    }}
                />
            )}

            {mostrarModalPrecio && (
                <ModalPrecio
                    producto={precioEditando}
                    precios={precios[precioEditando?.id] || {}}
                    cerrar={() => setMostrarModalPrecio(false)}
                    guardar={(datosPrecio) => {
                        actualizarPreciosFirebase(precioEditando.id, datosPrecio);
                        setMostrarModalPrecio(false);
                    }}
                />
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN: COMPRAS
// ═══════════════════════════════════════════════════════════════════════════

function SeccionCompras({ productosAComprar, totalesPorSuper, descuentos, descuentosDB, formatearMoneda, abrirModalPrecio, limpiarPrecios, limpiarPreciosSuper, cargandoLimpieza }) {
    const supermercados = [
        { key: 'coto', nombre: 'COTO', color: '#1e40af' },
        { key: 'carrefour', nombre: 'CARREFOUR', color: '#7c2d12' },
        { key: 'makro', nombre: 'MAKRO', color: '#c2410c' },
        { key: 'dia', nombre: 'DIA', color: '#dc2626' }
    ];

    // Calcular la mejor opción (día, supermercado, método, total)
    const mejorOpcion = useMemo(() => {
        let mejor = null;
        let menorPrecio = Infinity;

        Object.keys(descuentos).forEach(dia => {
            supermercados.forEach(superm => {
                const total = totalesPorSuper[superm.key]?.conDescuento[dia] || 0;
                if (total > 0 && total < menorPrecio) {
                    // Buscar el método de pago para este día y supermercado (el que coincide con % máximo)
                    const descuentoInfo = descuentosDB.find(
                        d => d.dia === dia && d.supermercado === superm.key && d.porcentaje === (descuentos[dia][superm.key] || 0)
                    );
                    
                    menorPrecio = total;
                    mejor = {
                        dia: dia,
                        supermercado: superm.nombre,
                        metodo: descuentoInfo?.metodo || 'Cualquier método',
                        total: total,
                        descuento: descuentos[dia][superm.key] || 0
                    };
                }
            });
        });

        return mejor;
    }, [totalesPorSuper, descuentos, descuentosDB]);

    const diasCapitalized = {
        lunes: 'Lunes',
        martes: 'Martes',
        miercoles: 'Miércoles',
        jueves: 'Jueves',
        viernes: 'Viernes',
        sabado: 'Sábado',
        domingo: 'Domingo'
    };

    return (
        <div className="seccion-compras">
            <div className="compras-header">
                <h2 className="seccion-titulo">Comparador de Precios</h2>
                {productosAComprar.length > 0 && (
                    <button 
                        className="btn-limpiar-precios"
                        onClick={limpiarPrecios}
                        disabled={cargandoLimpieza}
                    >
                        <Trash2 size={18} />
                        {cargandoLimpieza ? 'Limpiando...' : 'Limpiar Precios'}
                    </button>
                )}
            </div>

            {productosAComprar.length === 0 ? (
                <div className="empty-state">
                    <ShoppingCart size={48} opacity={0.3} />
                    <p>¡Todo el stock está completo!</p>
                </div>
            ) : (
                <>
                    {/* Tabla de comparación */}
                    <div className="tabla-comparacion-container">
                        <table className="tabla-comparacion">
                            <thead>
                                <tr>
                                    <th className="col-producto">PRODUCTO</th>
                                    <th className="col-cantidad">CANT</th>
                                    {supermercados.map(superm => (
                                        <th key={superm.key} className={`col-super super-${superm.key}`} style={{ background: superm.color }}>
                                            <div className="col-super-header">
                                                <span>{superm.nombre}</span>
                                                <button
                                                    className="btn-limpiar-super"
                                                    title={`Limpiar precios de ${superm.nombre}`}
                                                    disabled={cargandoLimpieza}
                                                    onClick={e => { e.stopPropagation(); limpiarPreciosSuper(superm.key); }}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                                <tr className="subheader">
                                    <th colSpan="2"></th>
                                    {supermercados.map(superm => (
                                        <th key={superm.key}>
                                            <div className="super-subheader">
                                                <span>MARCA</span>
                                                <span>CONTADO</span>
                                                <span>OFERTA</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {productosAComprar.map(producto => (
                                    <tr key={producto.id} onClick={() => abrirModalPrecio(producto)}>
                                        <td className="col-producto">{producto.nombre}</td>
                                        <td className="col-cantidad">{producto.cantidadAComprar}</td>
                                        {supermercados.map(superm => {
                                            const precio = producto.precios[superm.key] || {};
                                            return (
                                                <td key={superm.key} className="col-precios">
                                                    <div className="precio-cell">
                                                        <span className="precio-marca">{precio.marca || '-'}</span>
                                                        <span className="precio-contado">{formatearMoneda(precio.contado)}</span>
                                                        <span className="precio-oferta">{formatearMoneda(precio.oferta)}</span>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totales */}
                    <div className="totales-container">
                        <h3>Totales Contado</h3>
                        <div className="totales-grid">
                            {supermercados.map(superm => (
                                <div key={superm.key} className="total-card">
                                    <span className="total-nombre">{superm.nombre}</span>
                                    <span className="total-monto">{formatearMoneda(totalesPorSuper[superm.key]?.contado || 0)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Total Compra (con ofertas) */}
                    <div className="totales-container">
                        <h3>Total Compra <small>(con ofertas aplicadas)</small></h3>
                        <div className="totales-grid">
                            {supermercados.map(superm => (
                                <div key={superm.key} className="total-card total-card-compra">
                                    <span className="total-nombre">{superm.nombre}</span>
                                    <span className="total-monto">{formatearMoneda(totalesPorSuper[superm.key]?.compra || 0)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Descuentos por día */}
                    <div className="descuentos-container">
                        <h3>Totales con Descuentos por Día</h3>
                        <div className="descuentos-tabla-container">
                            <table className="descuentos-tabla">
                                <thead>
                                    <tr>
                                        <th>DÍA</th>
                                        {supermercados.map(superm => (
                                            <th key={superm.key}>
                                                <div>{superm.nombre}</div>
                                                <small>({descuentos.lunes[superm.key]}%)</small>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(descuentos).map(dia => (
                                        <tr key={dia}>
                                            <td className="dia-nombre">{dia.toUpperCase()}</td>
                                            {supermercados.map(superm => {
                                                const descuento = descuentos[dia][superm.key];
                                                const total = totalesPorSuper[superm.key]?.conDescuento[dia] || 0;
                                                return (
                                                    <td key={superm.key} className={descuento > 0 ? 'con-descuento' : ''}>
                                                        <div className="total-con-desc">
                                                            <span>{formatearMoneda(total)}</span>
                                                            {descuento > 0 && <small className="desc-badge">{descuento}%</small>}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mejor Opción */}
                    {mejorOpcion && (
                        <div className="mejor-opcion-container">
                            <h3>💰 Mejor Opción de Compra</h3>
                            <div className="mejor-opcion-card">
                                <div className="mejor-opcion-info">
                                    <div className="info-item">
                                        <span className="info-label">Día:</span>
                                        <span className="info-value destacado">{diasCapitalized[mejorOpcion.dia]}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Supermercado:</span>
                                        <span className="info-value destacado">{mejorOpcion.supermercado}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Método de pago:</span>
                                        <span className="info-value">{mejorOpcion.metodo}</span>
                                    </div>
                                    {mejorOpcion.descuento > 0 && (
                                        <div className="info-item">
                                            <span className="info-label">Descuento:</span>
                                            <span className="info-value descuento-badge">{mejorOpcion.descuento}%</span>
                                        </div>
                                    )}
                                </div>
                                <div className="mejor-opcion-total">
                                    <span className="total-label">Total a pagar:</span>
                                    <span className="total-value">{formatearMoneda(mejorOpcion.total)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN: DATOS (Descuentos por día)
// ═══════════════════════════════════════════════════════════════════════════

function SeccionDatos({ descuentos, agregarDescuento, eliminarDescuento, editarDescuento }) {
    const [mostrarModal, setMostrarModal] = useState(false);
    const [descuentoEditando, setDescuentoEditando] = useState(null);

    const diasCapitalized = {
        lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
        jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo'
    };

    const supersOrden = [
        { key: 'coto', nombre: 'COTO' },
        { key: 'carrefour', nombre: 'CARREFOUR' },
        { key: 'makro', nombre: 'MAKRO' },
        { key: 'dia', nombre: 'DIA' }
    ];

    const formatearTopeSinCentavos = (monto) => new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(monto || 0);

    return (
        <div className="seccion-datos">
            <div className="seccion-header-con-boton">
                <div>
                    <h2 className="seccion-titulo">Descuentos</h2>
                    <p className="seccion-descripcion">
                        Gestiona los descuentos por día, supermercado y método de pago.
                    </p>
                </div>
                <button className="btn-agregar-producto" onClick={() => setMostrarModal(true)}>
                    <Plus size={18} />
                    Agregar Descuento
                </button>
            </div>

            {descuentos.length === 0 ? (
                <div className="empty-state">
                    <Settings size={48} opacity={0.3} />
                    <p>No hay descuentos configurados</p>
                    <p className="empty-subtitle">Agrega descuentos para calcular mejor tus compras</p>
                </div>
            ) : (
                <div className="descuentos-por-super">
                    {supersOrden.map(sup => {
                        const descSuper = descuentos
                            .filter(d => d.supermercado === sup.key)
                            .sort((a, b) => {
                                const diasOrden = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
                                return diasOrden.indexOf(a.dia) - diasOrden.indexOf(b.dia);
                            });

                        if (descSuper.length === 0) return null;

                        return (
                            <div key={sup.key} className="descuentos-super-grupo">
                                <h3 className="descuentos-super-titulo">{sup.nombre}</h3>
                                <div className="descuentos-lista descuentos-lista-super">
                                    {descSuper.map(desc => (
                                        <div key={desc.id} className="descuento-card">
                                            <div className="descuento-card-header">
                                                <div className="descuento-dia">{diasCapitalized[desc.dia]}</div>
                                                <div className="descuento-card-acciones">
                                                    <button
                                                        className="btn-accion-descuento btn-editar-desc"
                                                        onClick={() => setDescuentoEditando(desc)}
                                                    >
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button
                                                        className="btn-accion-descuento btn-eliminar-desc"
                                                        onClick={() => {
                                                            if (window.confirm('¿Eliminar este descuento?')) eliminarDescuento(desc.id);
                                                        }}
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="descuento-card-body">
                                                <div className="descuento-info-item">
                                                    <span className="info-label">Método:</span>
                                                    <span className="info-value">{desc.metodo}</span>
                                                </div>
                                                <div className="descuento-info-item">
                                                    <span className="info-label">Descuento:</span>
                                                    <span className="info-value destacado">{desc.porcentaje}%</span>
                                                </div>
                                                <div className="descuento-info-item">
                                                    <span className="info-label">Tope:</span>
                                                    <span className="info-value info-value-tope">{desc.tope ? formatearTopeSinCentavos(desc.tope) : 'Sin tope'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {mostrarModal && (
                <ModalDescuento
                    cerrar={() => setMostrarModal(false)}
                    guardar={(datos) => {
                        agregarDescuento(datos);
                        setMostrarModal(false);
                    }}
                />
            )}
            {descuentoEditando && (
                <ModalDescuento
                    descuentoInicial={descuentoEditando}
                    cerrar={() => setDescuentoEditando(null)}
                    guardar={(datos) => {
                        editarDescuento(descuentoEditando.id, datos);
                        setDescuentoEditando(null);
                    }}
                />
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN: PRODUCTOS
// ═══════════════════════════════════════════════════════════════════════════

function SeccionProductos({ productos, stock, actualizarStock, agregarProducto, editarProducto, eliminarProducto, cargarProductosIniciales, cargandoMasivo }) {
    return (
        <div className="seccion-productos">
            <div className="productos-header">
                <h2 className="seccion-titulo">Catálogo de Productos</h2>
                <div className="productos-header-acciones">
                    <button className="btn-agregar-producto" onClick={agregarProducto}>
                        <Plus size={18} />
                        Nuevo Producto
                    </button>
                    {productos.length === 0 && (
                        <button 
                            className="btn-cargar-masivo" 
                            onClick={cargarProductosIniciales}
                            disabled={cargandoMasivo}
                        >
                            <Package size={18} />
                            {cargandoMasivo ? 'Cargando...' : 'Cargar 73 Productos'}
                        </button>
                    )}
                </div>
            </div>

            <div className="productos-tabla-container">
                <table className="productos-tabla">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Ideal</th>
                            <th>Stock</th>
                            <th>Comprar</th>
                            <th>EAN</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productos.map(producto => {
                            const stockActual = stock[producto.id] || 0;
                            const comprar = Math.max(0, producto.cantidadIdeal - stockActual);
                            
                            return (
                                <tr key={producto.id}>
                                    <td className="producto-nombre">{producto.nombre}</td>
                                    <td className="producto-ideal">{producto.cantidadIdeal}</td>
                                    <td className="producto-stock">
                                        <input
                                            type="number"
                                            value={stockActual}
                                            onChange={(e) => actualizarStock(producto.id, e.target.value)}
                                            min="0"
                                            className="input-stock"
                                        />
                                    </td>
                                    <td className={`producto-comprar ${comprar > 0 ? 'necesita-compra' : ''}`}>
                                        {comprar}
                                    </td>
                                    <td className="producto-ean">{producto.ean}</td>
                                    <td className="producto-acciones">
                                        <div className="producto-acciones-inner">
                                            <button 
                                                className="btn-icono-producto"
                                                onClick={() => editarProducto(producto)}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                className="btn-icono-producto btn-eliminar"
                                                onClick={() => eliminarProducto(producto.id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN: ESTADÍSTICAS
// ═══════════════════════════════════════════════════════════════════════════

function SeccionEstadisticas({ productosAComprar, totalesPorSuper, descuentos, descuentosDB, formatearMoneda, historialCompras = [] }) {
    const [compraExpandida, setCompraExpandida] = useState(null);
    const historialOrdenado = useMemo(() => {
        return [...historialCompras].sort((a, b) => {
            const fechaA = new Date(a?.fecha || a?.creadaEn || 0).getTime();
            const fechaB = new Date(b?.fecha || b?.creadaEn || 0).getTime();
            return fechaB - fechaA;
        });
    }, [historialCompras]);
    const supermercados = [
        { key: 'coto', nombre: 'COTO' },
        { key: 'carrefour', nombre: 'CARREFOUR' },
        { key: 'makro', nombre: 'MAKRO' },
        { key: 'dia', nombre: 'DIA' }
    ];
    const diasOrden = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    
    // Calcular la mejor opción por supermercado (considerando el mejor día para cada uno)
    const mejorOpcionPorSuper = useMemo(() => {
        const opciones = [];
        
        supermercados.forEach(superm => {
            let mejorDia = null;
            let mejoresDias = [];
            let menorPrecio = Infinity;
            let mejorDescuento = 0;
            let mejorDescuentoInfo = null;
            
            diasOrden.forEach(dia => {
                const precio = totalesPorSuper[superm.key]?.conDescuento[dia] || 0;
                if (precio > 0 && precio < menorPrecio) {
                    menorPrecio = precio;
                    mejorDia = dia;
                    mejoresDias = [dia];
                    mejorDescuento = descuentos[dia][superm.key] || 0;
                    mejorDescuentoInfo = descuentosDB.find(
                        d => d.dia === dia && d.supermercado === superm.key
                    ) || null;
                } else if (precio > 0 && Math.abs(precio - menorPrecio) < 0.0001) {
                    const descuentoInfoEmpate = descuentosDB.find(
                        d => d.dia === dia && d.supermercado === superm.key
                    ) || null;
                    const metodoEmpate = descuentoInfoEmpate?.metodo || 'Cualquier método';
                    const topeEmpate = descuentoInfoEmpate?.tope || null;
                    const metodoActual = mejorDescuentoInfo?.metodo || 'Cualquier método';
                    const topeActual = mejorDescuentoInfo?.tope || null;

                    if (metodoEmpate === metodoActual && topeEmpate === topeActual) {
                        mejoresDias.push(dia);
                    }
                }
            });
            
            if (mejorDia) {
                const tope = mejorDescuentoInfo?.tope || null;
                // Calcular totales contado/oferta para este super
                let totalSinOferta = 0;
                let totalConOferta = 0;
                let totalContadoConOferta = 0;
                productosAComprar.forEach(prod => {
                    const p = prod.precios[superm.key];
                    if (!p || !p.contado) return;
                    if (p.oferta) {
                        totalConOferta += p.oferta * prod.cantidadAComprar;
                        totalContadoConOferta += p.contado * prod.cantidadAComprar;
                    } else {
                        totalSinOferta += p.contado * prod.cantidadAComprar;
                    }
                });
                const totalContado = totalSinOferta + totalContadoConOferta;
                const ahorroOferta = Math.max(0, totalContadoConOferta - totalConOferta);
                let descuentoCalculado = totalSinOferta * (mejorDescuento / 100);
                let descuentoAplicado = descuentoCalculado;
                if (tope && descuentoCalculado > tope) descuentoAplicado = tope;

                opciones.push({
                    supermercado: superm.nombre,
                    dia: mejorDia,
                    dias: mejoresDias,
                    total: menorPrecio,
                    contado: totalContado,
                    oferta: totalConOferta,
                    ahorroOferta,
                    descuentoAplicado,
                    descuento: mejorDescuento,
                    metodo: mejorDescuentoInfo?.metodo || 'Cualquier método',
                    tope
                });
            }
        });
        
        // Orden fijo: COTO, CARREFOUR, MAKRO, DIA
        const orden = ['COTO', 'CARREFOUR', 'MAKRO', 'DIA'];
        return opciones.sort((a, b) => orden.indexOf(a.supermercado) - orden.indexOf(b.supermercado));
    }, [totalesPorSuper, descuentos, descuentosDB, productosAComprar]);
    
    // Calcular compra mixta (el menor precio de cada producto considerando descuentos)
    const compraMixta = useMemo(() => {
        const supers = ['coto', 'carrefour', 'makro', 'dia'];
        const detalleCompra = {};
        let totalSinDescuento = 0;

        // Para cada producto, encontrar el supermercado más barato por precio RAW (oferta > contado, sin aplicar descuentos)
        productosAComprar.forEach(producto => {
            let menorPrecio = Infinity;
            let mejorSuper = null;
            let tieneOferta = false;

            supers.forEach(superm => {
                const precio = producto.precios[superm];
                if (!precio || !precio.contado) return;

                const precioFinal = (precio.oferta || precio.contado) * producto.cantidadAComprar;

                if (precioFinal < menorPrecio) {
                    menorPrecio = precioFinal;
                    mejorSuper = superm;
                    tieneOferta = !!precio.oferta;
                }
            });

            if (mejorSuper) {
                if (!detalleCompra[mejorSuper]) {
                    detalleCompra[mejorSuper] = { productos: [], total: 0, totalSinDescuento: 0 };
                }
                detalleCompra[mejorSuper].productos.push({
                    nombre: producto.nombre,
                    cantidad: producto.cantidadAComprar,
                    precio: menorPrecio,
                    tieneOferta
                });
                detalleCompra[mejorSuper].totalSinDescuento += menorPrecio;
                totalSinDescuento += menorPrecio;
            }
        });

        // Aplicar el mejor descuento disponible por supermercado (con tope)
        Object.keys(detalleCompra).forEach(superm => {
            let totalConOferta = 0;
            let totalSinOferta = 0;

            detalleCompra[superm].productos.forEach(prod => {
                if (prod.tieneOferta) {
                    totalConOferta += prod.precio;
                } else {
                    totalSinOferta += prod.precio;
                }
            });

            let mejorTotalFinal = Infinity;
            let mejorDescuento = 0;
            let mejorDia = null;
            let mejorTope = null;
            let mejorDescuentoAplicado = 0;

            Object.keys(descuentos).forEach(dia => {
                const porcentaje = descuentos[dia][superm] || 0;

                const descuentoInfo = descuentosDB.find(
                    d => d.dia === dia && d.supermercado === superm && d.porcentaje === porcentaje
                );
                const tope = descuentoInfo?.tope || null;

                let descuentoCalculado = totalSinOferta * (porcentaje / 100);
                let descuentoAplicado = descuentoCalculado;
                if (tope && descuentoCalculado > tope) descuentoAplicado = tope;

                const totalFinal = totalConOferta + (totalSinOferta - descuentoAplicado);

                if (totalFinal < mejorTotalFinal) {
                    mejorTotalFinal = totalFinal;
                    mejorDescuento = porcentaje;
                    mejorDia = dia;
                    mejorTope = tope;
                    mejorDescuentoAplicado = descuentoAplicado;
                }
            });

            if (mejorTotalFinal === Infinity) {
                mejorTotalFinal = totalConOferta + totalSinOferta;
            }

            detalleCompra[superm].total = mejorTotalFinal;
            detalleCompra[superm].descuento = mejorDescuento;
            detalleCompra[superm].dia = mejorDia;
            detalleCompra[superm].tope = mejorTope;
            detalleCompra[superm].totalContado = totalSinOferta;
            detalleCompra[superm].totalOferta = totalConOferta;
            detalleCompra[superm].descuentoAplicado = mejorDescuentoAplicado;
        });

        const totalConDescuento = Object.values(detalleCompra).reduce((sum, d) => sum + d.total, 0);
        // Ahorro = total descuentos aplicados en la compra mixta
        const ahorro = totalSinDescuento - totalConDescuento;

        // Mejor opción comprando TODO en un solo supermercado
        let mejorTotalSoloSuper = Infinity;
        let mejorSuperNombre = null;
        supers.forEach(superm => {
            Object.keys(descuentos).forEach(dia => {
                const total = totalesPorSuper[superm]?.conDescuento?.[dia];
                if (total && total < mejorTotalSoloSuper) {
                    mejorTotalSoloSuper = total;
                    mejorSuperNombre = superm;
                }
            });
        });

        return {
            detalle: detalleCompra,
            totalSinDescuento,
            totalConDescuento,
            ahorro,
            mejorSoloSuper: mejorTotalSoloSuper === Infinity ? null : mejorTotalSoloSuper,
            mejorSuperNombre
        };
    }, [productosAComprar, descuentos, descuentosDB, totalesPorSuper]);

    const diasCapitalized = {
        lunes: 'Lunes',
        martes: 'Martes',
        miercoles: 'Miércoles',
        jueves: 'Jueves',
        viernes: 'Viernes',
        sabado: 'Sábado',
        domingo: 'Domingo'
    };

    const formatearListaDias = (dias) => {
        if (!dias || dias.length === 0) return '-';
        return dias.map(d => diasCapitalized[d] || d).join(' o ');
    };

    const formatearTopeSinCentavos = (monto) => new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(monto || 0);

    return (
        <div className="seccion-estadisticas">
            <h2 className="seccion-titulo">Análisis de Compras</h2>
            <p className="seccion-descripcion">
                Cálculos basados en los descuentos configurados en la sección DATOS
            </p>

            <div className="stats-card">
                <h3>Últimas Compras</h3>
                <p className="stats-descripcion">Historial guardado al presionar Finalizar Compra</p>
                <div className="ultimas-compras-grid">
                    {historialOrdenado.length === 0 && (
                        <div className="no-data-message"><p>Aún no hay compras finalizadas</p></div>
                    )}
                    {historialOrdenado.slice(0, 6).map((compra, idx) => {
                        const compraId = compra.id || `hist_${idx}`;
                        const fecha = (compra.fecha || compra.creadaEn) ? new Date(compra.fecha || compra.creadaEn) : null;
                        const fechaTexto = fecha && !isNaN(fecha)
                            ? fecha.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : '-';
                        const expandida = compraExpandida === compraId;

                        return (
                            <div key={compraId} className="ultima-compra-card">
                                <div className="ultima-compra-header">
                                    <span className="ultima-super">{(compra.supermercado || '').toUpperCase()}</span>
                                    <span className="ultima-fecha">{fechaTexto}</span>
                                </div>
                                <div className="opcion-details">
                                    <div className="opcion-detail-item">
                                        <span className="detail-label">Contado:</span>
                                        <span className="detail-value">{formatearMoneda(compra.contado || 0)}</span>
                                    </div>
                                    <div className="opcion-detail-item">
                                        <span className="detail-label">Descuento:</span>
                                        <span className="detail-value" style={{ color: '#f87171' }}>-{formatearMoneda(compra.descuento || 0)}</span>
                                    </div>
                                    <div className="opcion-detail-item">
                                        <span className="detail-label">Ahorro oferta:</span>
                                        <span className="detail-value" style={{ color: '#60a5fa' }}>-{formatearMoneda(compra.ahorroOferta || 0)}</span>
                                    </div>
                                </div>
                                <div className="opcion-total">
                                    <span className="opcion-total-valor">{formatearMoneda(compra.total || 0)}</span>
                                </div>
                                <button
                                    className="btn-ver-compra"
                                    onClick={() => setCompraExpandida(expandida ? null : compraId)}
                                >
                                    {expandida ? 'Ocultar lista' : 'Ver lista'}
                                </button>
                                {expandida && (
                                    <div className="ultima-compra-lista">
                                        {(compra.items || []).map((item, idx) => (
                                            <div key={`${compraId}_${idx}`} className="ultima-item-row">
                                                <span className="ultima-item-nombre">{item.nombre}</span>
                                                <span>x{item.cantidad}</span>
                                                <span>{formatearMoneda(item.precioContado || 0)}</span>
                                                <span>{formatearMoneda(item.precioOferta || 0)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Mejor opción por supermercado */}
            <div className="stats-card">
                <h3>Mejor Opción por Supermercado</h3>
                <p className="stats-descripcion">Mejor día para comprar todo en cada supermercado</p>
                <div className="mejores-opciones-grid">
                    {mejorOpcionPorSuper.map(opcion => (
                        <div key={opcion.supermercado} className="opcion-super-card">
                            <div className="opcion-header">
                                <span className="opcion-super-nombre">{opcion.supermercado}</span>
                                {opcion.descuento > 0 && (
                                    <span className="opcion-descuento-badge">{opcion.descuento}%</span>
                                )}
                            </div>
                            <div className="opcion-details">
                                <div className="opcion-detail-item">
                                    <span className="detail-label">Mejor día:</span>
                                    <span className="detail-value">{formatearListaDias(opcion.dias || [opcion.dia])}</span>
                                </div>
                                <div className="opcion-detail-item">
                                    <span className="detail-label">Método:</span>
                                    <span className="detail-value">{opcion.metodo}</span>
                                </div>
                                <div className="opcion-detail-item">
                                    <span className="detail-label">Contado:</span>
                                    <span className="detail-value">{formatearMoneda(opcion.contado)}</span>
                                </div>
                                <div className="opcion-detail-item">
                                    <span className="detail-label">Descuento:</span>
                                    <span className="detail-value" style={{color:'#f87171'}}>-{formatearMoneda(opcion.descuentoAplicado)}</span>
                                </div>
                                <div className="opcion-detail-item">
                                    <span className="detail-label">Ahorro oferta:</span>
                                    <span className="detail-value" style={{color:'#60a5fa'}}>-{formatearMoneda(opcion.ahorroOferta || 0)}</span>
                                </div>
                                <div className="opcion-detail-item">
                                    <span className="detail-label">Tope:</span>
                                    <span className="detail-value tope-value">
                                        {opcion.tope ? formatearTopeSinCentavos(opcion.tope) : 'Sin tope'}
                                    </span>
                                </div>
                            </div>
                            <div className="opcion-total">
                                <span className="opcion-total-valor">{formatearMoneda(opcion.total)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Compra Mixta */}
            <div className="stats-card destacado">
                <h3>🎯 Compra Mixta (Menor Precio)</h3>
                <p className="stats-descripcion">Comprando cada producto donde es más barato (con descuentos de DATOS)</p>
                
                <div className="mixta-grid">
                {['coto', 'carrefour', 'makro', 'dia']
                  .filter(s => compraMixta.detalle[s])
                  .map(superm => { const data = compraMixta.detalle[superm]; return (
                    <div key={superm} className="compra-mixta-super">
                        <div className="mixta-header">
                            <span className="mixta-super-nombre">{superm.toUpperCase()}</span>
                            {data.dia && (
                                <span className="mixta-dia">{diasCapitalized[data.dia]}</span>
                            )}
                            {data.descuento > 0 && (
                                <span className="mixta-descuento">{data.descuento}%</span>
                            )}
                            {data.tope && (
                                <span className="mixta-tope">Tope: {formatearTopeSinCentavos(data.tope)}</span>
                            )}
                        </div>
                        <div className="mixta-detalle">
                            <div className="mixta-productos-count">
                                <span className="mixta-count">{data.productos.length} productos</span>
                            </div>
                            <div className="mixta-calculos">
                                <div className="mixta-calculo-item">
                                    <span className="calculo-label">Contado:</span>
                                    <span className="calculo-value">{formatearMoneda(data.totalContado || 0)}</span>
                                </div>
                                {data.descuentoAplicado > 0 && (
                                    <div className="mixta-calculo-item descuento">
                                        <span className="calculo-label">Descuento:</span>
                                        <span className="calculo-value">-{formatearMoneda(data.descuentoAplicado)}</span>
                                    </div>
                                )}
                                {data.totalOferta > 0 && (
                                    <div className="mixta-calculo-item oferta">
                                        <span className="calculo-label">Oferta:</span>
                                        <span className="calculo-value">{formatearMoneda(data.totalOferta)}</span>
                                    </div>
                                )}
                                <div className="mixta-calculo-item total">
                                    <span className="calculo-label">Total:</span>
                                    <span className="calculo-value-total">{formatearMoneda(data.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ); })}
                </div>
                
                <div className="compra-mixta-total">
                    <div className="mixta-total-row">
                        <span className="mixta-total-label">Total Mixto:</span>
                        <span className="mixta-total-value">{formatearMoneda(compraMixta.totalConDescuento)}</span>
                    </div>
                    {compraMixta.ahorro > 0 && (
                        <div className="mixta-ahorro">
                            <TrendingDown size={20} />
                            <span>Ahorro total por descuentos: {formatearMoneda(compraMixta.ahorro)}</span>
                        </div>
                    )}
                    {compraMixta.mejorSoloSuper !== null && (() => {
                        const diferencia = compraMixta.mejorSoloSuper - compraMixta.totalConDescuento;
                        const superNombre = compraMixta.mejorSuperNombre?.toUpperCase();
                        return diferencia > 0 ? (
                            <div className="mixta-comparacion mixta-comparacion-mejor">
                                <TrendingDown size={18} />
                                <span>Conviene compra mixta: ahorrás <strong>{formatearMoneda(diferencia)}</strong> vs comprar todo en {superNombre} ({formatearMoneda(compraMixta.mejorSoloSuper)})</span>
                            </div>
                        ) : diferencia < 0 ? (
                            <div className="mixta-comparacion mixta-comparacion-peor">
                                <TrendingUp size={18} />
                                <span>Conviene todo en <strong>{superNombre}</strong>: es <strong>{formatearMoneda(Math.abs(diferencia))}</strong> más barato ({formatearMoneda(compraMixta.mejorSoloSuper)}) que la compra mixta</span>
                            </div>
                        ) : (
                            <div className="mixta-comparacion">
                                <span>Equivalente a comprar todo en {superNombre}</span>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN: EN COMPRA
// ═══════════════════════════════════════════════════════════════════════════

function SeccionEnCompra({ productosAComprar, totalesPorSuper, descuentos, descuentosDB, formatearMoneda, actualizarPrecios, precios, aplicarCompraAStock, guardarCompraHistorial }) {
    const supermercados = [
        { key: 'coto', nombre: 'COTO' },
        { key: 'carrefour', nombre: 'CARREFOUR' },
        { key: 'makro', nombre: 'MAKRO' },
        { key: 'dia', nombre: 'DIA' }
    ];

    const [superSeleccionado, setSuperSeleccionado] = useState(null);
    const [carrito, setCarrito] = useState({});
    // Productos temporales (solo para esta sesión de compra)
    const [productosTemporales, setProductosTemporales] = useState([]);
    const [mostrarFormTemporal, setMostrarFormTemporal] = useState(false);
    const [nombreTemporal, setNombreTemporal] = useState('');
    const [precioTemporal, setPrecioTemporal] = useState('');
    const [cantidadTemporal, setCantidadTemporal] = useState('1');
    const [marcaTemporal, setMarcaTemporal] = useState('');
    const [resaltarNoComprados, setResaltarNoComprados] = useState(false);

    const { guardarSesion, cargarSesion, borrarSesion } = useSesionEnCompra();
    const sesionCargada = useRef(false);

    // Cargar sesión al montar
    useEffect(() => {
        if (sesionCargada.current) return;
        sesionCargada.current = true;
        cargarSesion().then(sesion => {
            if (sesion?.superSeleccionado) setSuperSeleccionado(sesion.superSeleccionado);
            if (sesion?.carrito) setCarrito(sesion.carrito);
            if (sesion?.productosTemporales) setProductosTemporales(sesion.productosTemporales);
        });
    }, []);

    // Persistir en Firestore cada vez que cambia el carrito/super/temporales
    const persistirRef = useRef(null);
    useEffect(() => {
        if (!sesionCargada.current) return;
        if (persistirRef.current) clearTimeout(persistirRef.current);
        persistirRef.current = setTimeout(() => {
            guardarSesion({ superSeleccionado, carrito, productosTemporales });
        }, 800);
        return () => clearTimeout(persistirRef.current);
    }, [superSeleccionado, carrito, productosTemporales]);

    const diasCapitalized = {
        lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
        jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo'
    };

    const formatearTopeSinCentavos = (monto) => new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(monto || 0);

    // Cuando se selecciona un supermercado, inicializar carrito SOLO si no hay sesión guardada para ese super
    const seleccionarSuper = (superKey) => {
        if (superSeleccionado === superKey) return; // ya estaba seleccionado
        setSuperSeleccionado(superKey);
        const nuevoCarrito = {};
        productosAComprar.forEach(prod => {
            const precio = prod.precios[superKey] || {};
            nuevoCarrito[prod.id] = {
                nombre: prod.nombre,
                marca: prod.precios[superKey]?.marca || '',
                cantidad: prod.cantidadAComprar,
                precio: precio.contado || 0,
                precioOferta: precio.oferta || 0,
                listo: false
            };
        });
        // Reinsertar temporales en el nuevo carrito
        setProductosTemporales([]);
        setCarrito(nuevoCarrito);
    };

    const agregarProductoTemporal = () => {
        if (!nombreTemporal.trim() || !precioTemporal) return;
        const id = `temp_${Date.now()}`;
        const nuevo = {
            id,
            nombre: nombreTemporal.trim(),
            marca: marcaTemporal.trim(),
            cantidad: parseInt(cantidadTemporal) || 1,
            precio: parseFloat(precioTemporal) || 0,
            precioOferta: 0,
            listo: false,
            temporal: true
        };
        setProductosTemporales(prev => [...prev, nuevo]);
        setCarrito(prev => ({ ...prev, [id]: nuevo }));
        setNombreTemporal('');
        setPrecioTemporal('');
        setCantidadTemporal('1');
        setMarcaTemporal('');
        setMostrarFormTemporal(false);
    };

    const eliminarProductoTemporal = (id) => {
        setProductosTemporales(prev => prev.filter(p => p.id !== id));
        setCarrito(prev => { const sig = { ...prev }; delete sig[id]; return sig; });
    };

    const finalizarCompra = async () => {
        // Resaltar no comprados antes de confirmar
        setResaltarNoComprados(true);
        const noComprados = Object.values(carrito).filter(i => !i.listo && !i.temporal);
        const msg = noComprados.length > 0
            ? `Hay ${noComprados.length} producto(s) sin marcar (en rojo).\n¿Finalizar y actualizar precios de los comprados?`
            : '¿Finalizar compra y actualizar precios en Firestore?';
        if (!window.confirm(msg)) {
            setResaltarNoComprados(false);
            return;
        }

        const itemsComprados = Object.entries(carrito)
            .filter(([, item]) => item.listo && !item.temporal)
            .map(([id, item]) => ({ id, cantidad: item.cantidad }));

        const detalleCompra = Object.entries(carrito)
            .filter(([, item]) => item.listo)
            .map(([id, item]) => ({
                id,
                nombre: item.nombre,
                marca: item.marca || '',
                cantidad: Number(item.cantidad) || 0,
                precioContado: Number(item.precio) || 0,
                precioOferta: Number(item.precioOferta) || 0,
                subtotal: ((Number(item.precioOferta) || 0) > 0 ? Number(item.precioOferta) : Number(item.precio)) * (Number(item.cantidad) || 0)
            }));

        // Actualizar stock en PRODUCTOS según lo comprado
        if (aplicarCompraAStock && itemsComprados.length > 0) {
            await aplicarCompraAStock(itemsComprados);
        }

        // Actualizar precios solo de los items marcados como comprados (no temporales)
        if (actualizarPrecios && superSeleccionado) {
            for (const [id, item] of Object.entries(carrito)) {
                if (!item.listo || item.temporal) continue;
                const preciosActuales = precios?.[id] || {};
                const preciosActualizados = {
                    ...preciosActuales,
                    [superSeleccionado]: {
                        marca: item.marca || preciosActuales[superSeleccionado]?.marca || '',
                        contado: item.precio || null,
                        oferta: item.precioOferta || null
                    }
                };
                await actualizarPrecios(id, preciosActualizados);
            }
        }

        if (guardarCompraHistorial) {
            const guardadoHistorialOk = await guardarCompraHistorial({
                fecha: new Date().toISOString(),
                supermercado: superSeleccionado,
                contado: totalesCarrito.contado || 0,
                descuento: totalesCarrito.descuento || 0,
                ahorroOferta: totalesCarrito.ahorroOferta || 0,
                total: totalesCarrito.conDesc || 0,
                items: detalleCompra
            });

            if (!guardadoHistorialOk) {
                alert('No se pudo guardar el historial de compra. No se limpió la compra actual para que no pierdas datos.');
                return;
            }
        }

        await borrarSesion();
        setSuperSeleccionado(null);
        setCarrito({});
        setProductosTemporales([]);
        setResaltarNoComprados(false);
    };

    // Mejor descuento disponible para el super seleccionado
    const mejorDescuentoInfo = useMemo(() => {
        if (!superSeleccionado) return null;
        const diasOrden = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        let mejorDia = null;
        let mejoresDias = [];
        let mejorPorcentaje = 0;
        let mejorTope = null;
        let mejorMetodo = null;
        let mejorTotal = Infinity;

        diasOrden.forEach(dia => {
            const total = totalesPorSuper[superSeleccionado]?.conDescuento?.[dia];
            if (total && total < mejorTotal) {
                mejorTotal = total;
                mejorDia = dia;
                mejoresDias = [dia];
                mejorPorcentaje = descuentos[dia][superSeleccionado] || 0;
                const info = descuentosDB.find(d => d.dia === dia && d.supermercado === superSeleccionado && d.porcentaje === mejorPorcentaje);
                mejorTope = info?.tope || null;
                mejorMetodo = info?.metodo || null;
            } else if (total && Math.abs(total - mejorTotal) < 0.0001) {
                const porcentajeEmpate = descuentos[dia][superSeleccionado] || 0;
                const infoEmpate = descuentosDB.find(d => d.dia === dia && d.supermercado === superSeleccionado && d.porcentaje === porcentajeEmpate);
                const metodoEmpate = infoEmpate?.metodo || null;
                const topeEmpate = infoEmpate?.tope || null;
                if (metodoEmpate === mejorMetodo && topeEmpate === mejorTope) {
                    mejoresDias.push(dia);
                }
            }
        });
        return { dia: mejorDia, dias: mejoresDias, porcentaje: mejorPorcentaje, tope: mejorTope, metodo: mejorMetodo };
    }, [superSeleccionado, descuentos, descuentosDB, totalesPorSuper]);

    const formatearListaDias = (dias) => {
        if (!dias || dias.length === 0) return '-';
        return dias.map(d => diasCapitalized[d] || d).join(' o ');
    };

    const itemsCarritoOrdenados = useMemo(() => {
        return Object.entries(carrito).sort(([, a], [, b]) => {
            const tempA = a.temporal ? 1 : 0;
            const tempB = b.temporal ? 1 : 0;
            if (tempA !== tempB) return tempA - tempB;
            return (a.nombre || '').localeCompare((b.nombre || ''), 'es', { sensitivity: 'base' });
        });
    }, [carrito]);

    // Calcular totales en tiempo real desde el carrito (solo items tildados)
    const totalesCarrito = useMemo(() => {
        if (!superSeleccionado || Object.keys(carrito).length === 0) return { sinDesc: 0, descuento: 0, conDesc: 0, oferta: 0, contado: 0 };
        let totalContadoGeneral = 0;
        let totalContadoDescontable = 0;
        let totalOfertaPagada = 0;
        let ahorroOferta = 0;

        Object.values(carrito).forEach(item => {
            if (!item.listo) return;

            const cantidad = Number(item.cantidad) || 0;
            const precioContado = Number(item.precio) || 0;
            const precioOferta = Number(item.precioOferta) || 0;
            const usaOferta = precioOferta > 0;

            totalContadoGeneral += precioContado * cantidad;

            if (usaOferta) {
                totalOfertaPagada += precioOferta * cantidad;
                ahorroOferta += (precioContado - precioOferta) * cantidad;
            } else {
                totalContadoDescontable += precioContado * cantidad;
            }
        });

        const porcentaje = mejorDescuentoInfo?.porcentaje || 0;
        const tope = mejorDescuentoInfo?.tope || null;
        let descuentoCalculado = totalContadoDescontable * (porcentaje / 100);
        if (tope && descuentoCalculado > tope) descuentoCalculado = tope;

        return {
            sinDesc: totalContadoGeneral,
            descuento: descuentoCalculado,
            oferta: totalOfertaPagada,
            contado: totalContadoGeneral,
            ahorroOferta: Math.max(0, ahorroOferta),
            conDesc: totalContadoGeneral - Math.max(0, ahorroOferta) - descuentoCalculado
        };
    }, [carrito, superSeleccionado, mejorDescuentoInfo]);

    const toggleListo = (id) => {
        setCarrito(prev => ({ ...prev, [id]: { ...prev[id], listo: !prev[id].listo } }));
    };

    const actualizarCantidad = (id, val) => {
        const n = parseInt(val) || 0;
        if (n < 0) return;
        setCarrito(prev => ({ ...prev, [id]: { ...prev[id], cantidad: n } }));
    };

    const actualizarPrecio = (id, val) => {
        const n = parseFloat(val) || 0;
        setCarrito(prev => ({ ...prev, [id]: { ...prev[id], precio: n } }));
    };

    const actualizarPrecioOferta = (id, val) => {
        const n = parseFloat(val) || 0;
        setCarrito(prev => ({ ...prev, [id]: { ...prev[id], precioOferta: n } }));
    };

    return (
        <div className="seccion-encompra">
            <h2 className="seccion-titulo">En Compra</h2>
            <p className="seccion-descripcion">Seleccioná el supermercado y ajustá precios o cantidades en tiempo real.</p>

            {/* Selección de supermercado */}
            <div className="encompra-seleccion-grid">
                {supermercados.map(sup => {
                    const mejorDia = (() => {
                        let d = null; let min = Infinity;
                        Object.keys(descuentos).forEach(dia => {
                            const t = totalesPorSuper[sup.key]?.conDescuento?.[dia];
                            if (t && t < min) { min = t; d = dia; }
                        });
                        return d;
                    })();
                    const descPct = mejorDia ? (descuentos[mejorDia][sup.key] || 0) : 0;
                    const totalMejor = mejorDia ? (totalesPorSuper[sup.key]?.conDescuento?.[mejorDia] || 0) : 0;
                    const activo = superSeleccionado === sup.key;
                    return (
                        <div
                            key={sup.key}
                            className={`encompra-super-card ${activo ? 'activo' : ''}`}
                            onClick={() => seleccionarSuper(sup.key)}
                        >
                            <div className="encompra-super-check">{activo ? '✓' : ''}</div>
                            <div className="encompra-super-nombre">{sup.nombre}</div>
                            {descPct > 0 && <div className="encompra-super-desc">{descPct}% {mejorDia && `· ${diasCapitalized[mejorDia]}`}</div>}
                            {totalMejor > 0 && <div className="encompra-super-total">{formatearMoneda(totalMejor)}</div>}
                        </div>
                    );
                })}
            </div>

            {superSeleccionado && (
                <>
                    {/* Info del descuento activo */}
                    {mejorDescuentoInfo?.porcentaje > 0 && (
                        <div className="encompra-descuento-banner">
                            <span>Descuento activo: <strong>{mejorDescuentoInfo.porcentaje}%</strong></span>
                            {mejorDescuentoInfo.dia && <span>· Mejor día: <strong>{formatearListaDias(mejorDescuentoInfo.dias || [mejorDescuentoInfo.dia])}</strong></span>}
                            {mejorDescuentoInfo.metodo && <span>· Método: <strong>{mejorDescuentoInfo.metodo}</strong></span>}
                            {mejorDescuentoInfo.tope && <span>· Tope: <strong>{formatearTopeSinCentavos(mejorDescuentoInfo.tope)}</strong></span>}
                        </div>
                    )}

                    <div className="encompra-grid-bloque">
                    {/* Tabla de productos editable */}
                    <div className="encompra-tabla-container">
                        <table className="encompra-tabla">
                            <thead>
                                <tr>
                                    <th className="encompra-th-check">✓</th>
                                    <th>PRODUCTO</th>
                                    <th>CANT</th>
                                    <th>PRECIO UNIT.</th>
                                    <th>PRECIO OFER.</th>
                                    <th>SUBTOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {itemsCarritoOrdenados.map(([id, item]) => (
                                    <tr key={id} className={[
                                        (item.precioOferta || 0) > 0 ? 'fila-oferta' : '',
                                        item.listo ? 'fila-listo' : '',
                                        resaltarNoComprados && !item.listo ? 'fila-no-comprado' : ''
                                    ].filter(Boolean).join(' ')}>
                                        <td className="encompra-td-check">
                                            <input
                                                type="checkbox"
                                                checked={item.listo}
                                                onChange={() => toggleListo(id)}
                                                className="encompra-check"
                                            />
                                        </td>
                                        <td className="encompra-nombre">
                                            <div className="encompra-nombre-inner">
                                                <span className="encompra-nombre-texto">{item.nombre}</span>
                                                {item.marca && <span className="encompra-marca-texto">{item.marca}</span>}
                                            </div>
                                            {item.temporal && (
                                                <button className="btn-del-temporal" onClick={() => eliminarProductoTemporal(id)} title="Quitar">
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.cantidad}
                                                onFocus={e => e.target.select()}
                                                onChange={e => actualizarCantidad(id, e.target.value)}
                                                className="encompra-input"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.precio}
                                                onFocus={e => e.target.select()}
                                                onChange={e => actualizarPrecio(id, e.target.value)}
                                                className="encompra-input encompra-input-precio"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.precioOferta}
                                                onFocus={e => e.target.select()}
                                                onChange={e => actualizarPrecioOferta(id, e.target.value)}
                                                className="encompra-input encompra-input-precio encompra-input-ofer"
                                            />
                                        </td>
                                        <td className="encompra-subtotal">
                                            {formatearMoneda(((item.precioOferta || 0) > 0 ? item.precioOferta : item.precio) * item.cantidad)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Botón agregar ítem ocasional - debajo del último producto */}
                        {mostrarFormTemporal ? (
                            <div className="encompra-form-temporal">
                                <h4>Agregar ítem ocasional</h4>
                                <div className="encompra-form-temporal-row">
                                    <input
                                        type="text"
                                        placeholder="Nombre del producto"
                                        value={nombreTemporal}
                                        onChange={e => setNombreTemporal(e.target.value)}
                                        className="encompra-input-temporal"
                                        autoFocus
                                    />
                                    <input
                                        type="text"
                                        placeholder="Marca (opcional)"
                                        value={marcaTemporal}
                                        onChange={e => setMarcaTemporal(e.target.value)}
                                        className="encompra-input-temporal"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Cant."
                                        value={cantidadTemporal}
                                        min="1"
                                        onFocus={e => e.target.select()}
                                        onChange={e => setCantidadTemporal(e.target.value)}
                                        className="encompra-input-temporal encompra-input-temporal-sm"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Precio"
                                        value={precioTemporal}
                                        min="0"
                                        step="0.01"
                                        onFocus={e => e.target.select()}
                                        onChange={e => setPrecioTemporal(e.target.value)}
                                        className="encompra-input-temporal encompra-input-temporal-sm"
                                    />
                                </div>
                                <div className="encompra-form-temporal-btns">
                                    <button className="btn-cancelar-tarea" onClick={() => setMostrarFormTemporal(false)}>Cancelar</button>
                                    <button className="btn-guardar-tarea" onClick={agregarProductoTemporal}>
                                        <Plus size={16} /> Agregar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button className="btn-agregar-temporal" onClick={() => setMostrarFormTemporal(true)}>
                                <Plus size={16} /> Agregar ítem ocasional
                            </button>
                        )}
                    </div>{/* fin encompra-tabla-container */}

                    {/* Resumen total */}
                    <div className="encompra-resumen">
                        <div className="encompra-resumen-fila">
                            <span>Contado:</span>
                            <span>{formatearMoneda(totalesCarrito.contado)}</span>
                        </div>
                        {totalesCarrito.descuento > 0 && (
                            <div className="encompra-resumen-fila encompra-descuento-fila">
                                <span>Descuento ({mejorDescuentoInfo?.porcentaje}%):</span>
                                <span>-{formatearMoneda(totalesCarrito.descuento)}</span>
                            </div>
                        )}
                        {totalesCarrito.oferta > 0 && (
                            <div className="encompra-resumen-fila encompra-oferta-fila">
                                <span>Oferta:</span>
                                <span>{formatearMoneda(totalesCarrito.oferta)}</span>
                            </div>
                        )}
                        <div className="encompra-resumen-fila encompra-total-fila">
                            <span>TOTAL A PAGAR:</span>
                            <span>{formatearMoneda(totalesCarrito.conDesc)}</span>
                        </div>
                        {mejorDescuentoInfo?.tope && (
                            <div className="encompra-progreso-container">
                                <span className="encompra-tope-info">
                                    Tope de descuento: {formatearTopeSinCentavos(mejorDescuentoInfo.tope)}
                                    {totalesCarrito.descuento >= mejorDescuentoInfo.tope && (
                                        <span className="encompra-tope-alcanzado"> ⚠️ Tope alcanzado</span>
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                    </div>

                    {/* Botón Finalizar Compra */}
                    <button className="btn-finalizar-compra" onClick={finalizarCompra}>
                        <CheckCircle size={18} /> Finalizar Compra
                    </button>
                </>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODALES
// ═══════════════════════════════════════════════════════════════════════════

function ModalProducto({ producto, cerrar, guardar }) {
    const [nombre, setNombre] = useState(producto?.nombre || '');
    const [ean, setEan] = useState(producto?.ean || '');
    const [cantidadIdeal, setCantidadIdeal] = useState(producto?.cantidadIdeal?.toString() || '');

    const manejarGuardar = () => {
        if (!nombre.trim() || !cantidadIdeal) {
            alert('Completa todos los campos');
            return;
        }
        guardar({ nombre: nombre.trim(), ean: ean.trim(), cantidadIdeal: parseInt(cantidadIdeal) });
    };

    return (
        <>
            <div className="modal-overlay-tarea" onClick={cerrar} />
            <div className="modal-tarea">
                <div className="modal-tarea-header">
                    <h2>{producto ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                    <button className="btn-cerrar-modal" onClick={cerrar}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-tarea-contenido">
                    <div className="form-group">
                        <label>Nombre del Producto</label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej: ACEITE"
                            className="input-tarea"
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label>Código EAN</label>
                        <input
                            type="text"
                            value={ean}
                            onChange={(e) => setEan(e.target.value)}
                            placeholder="7790315001234"
                            className="input-tarea"
                        />
                    </div>

                    <div className="form-group">
                        <label>Cantidad Ideal</label>
                        <input
                            type="number"
                            value={cantidadIdeal}
                            onChange={(e) => setCantidadIdeal(e.target.value)}
                            min="1"
                            className="input-tarea"
                        />
                    </div>
                </div>

                <div className="modal-tarea-footer">
                    <button className="btn-cancelar-tarea" onClick={cerrar}>Cancelar</button>
                    <button className="btn-guardar-tarea" onClick={manejarGuardar}>
                        <Save size={20} />
                        Guardar
                    </button>
                </div>
            </div>
        </>
    );
}

function ModalPrecio({ producto, precios, cerrar, guardar }) {
    const supermercados = ['coto', 'carrefour', 'makro', 'dia'];

    const [datosPrecio, setDatosPrecio] = useState({
        coto: { 
            marca: precios.coto?.marca || '', 
            contado: precios.coto?.contado || '', 
            oferta: precios.coto?.oferta || '' 
        },
        carrefour: { 
            marca: precios.carrefour?.marca || '', 
            contado: precios.carrefour?.contado || '', 
            oferta: precios.carrefour?.oferta || '' 
        },
        makro: { 
            marca: precios.makro?.marca || '', 
            contado: precios.makro?.contado || '', 
            oferta: precios.makro?.oferta || '' 
        },
        dia: { 
            marca: precios.dia?.marca || '', 
            contado: precios.dia?.contado || '', 
            oferta: precios.dia?.oferta || '' 
        }
    });

    const actualizarPrecio = (superm, campo, valor) => {
        setDatosPrecio({
            ...datosPrecio,
            [superm]: {
                ...datosPrecio[superm],
                [campo]: campo === 'marca' ? valor : (valor ? parseFloat(String(valor).replace(',', '.')) : null)
            }
        });
    };

    const formatearCampoDecimal = (valor) => {
        if (valor === null || valor === undefined || valor === '') return '';
        return String(valor).replace('.', ',');
    };

    const esOriginal = (superm) => {
        const marca = (datosPrecio[superm]?.marca || '').trim().toLowerCase().replace(/[()]/g, '').trim();
        return marca !== '' && !supermercados.includes(marca);
    };

    const mejorFuenteParaCopiar = (superDestino) => {
        let mejor = null;
        supermercados.forEach(superOrigen => {
            if (superOrigen === superDestino) return;
            const precioOrigen = datosPrecio[superOrigen]?.contado;
            if (!precioOrigen || Number(precioOrigen) <= 0) return;
            if (!esOriginal(superOrigen)) return; // ignorar los que fueron auto-copiados
            if (!mejor || Number(precioOrigen) > Number(mejor.contado)) {
                mejor = { contado: precioOrigen, origen: superOrigen };
            }
        });
        return mejor;
    };

    const limpiarTodo = () => {
        const vacios = {};
        supermercados.forEach(s => { vacios[s] = { marca: '', contado: '', oferta: '' }; });
        setDatosPrecio(vacios);
    };

    const copiarDesdeOtroSuper = (superDestino) => {
        const mejor = mejorFuenteParaCopiar(superDestino);
        if (!mejor) return;
        setDatosPrecio(prev => ({
            ...prev,
            [superDestino]: {
                ...prev[superDestino],
                contado: mejor.contado,
                marca: `(${mejor.origen.toUpperCase()})`
            }
        }));
    };

    const manejarGuardar = () => {
        guardar(datosPrecio);
    };

    return (
        <>
            <div className="modal-overlay-tarea" onClick={cerrar} />
            <div className="modal-tarea modal-precio">
                <div className="modal-tarea-header">
                    <div className="modal-precio-info">
                        <h2 className="modal-precio-titulo">
                            {producto?.nombre}
                            {producto?.cantidadAComprar > 0 && (
                                <span className="modal-precio-cantidad">Cant: {producto.cantidadAComprar}</span>
                            )}
                            <button
                                type="button"
                                className="btn-limpiar-super"
                                onClick={limpiarTodo}
                                title="Limpiar todos los precios"
                            >
                                <Trash2 size={13} />
                            </button>
                        </h2>
                        <p className="modal-precio-ean">EAN: {producto?.ean || 'Sin código'}</p>
                    </div>
                    <button className="btn-cerrar-modal" onClick={cerrar}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-tarea-contenido">
                    <div className="precios-grid">
                        {supermercados.map(superm => {
                            const sinPrecio = !datosPrecio[superm].contado || Number(datosPrecio[superm].contado) <= 0;
                            const fuente = sinPrecio ? mejorFuenteParaCopiar(superm) : null;
                            return (
                            <div key={superm} className="precio-super-card">
                                <div className="precio-super-header">
                                    <span>{superm.toUpperCase()}</span>
                                    {fuente && (
                                        <button
                                            type="button"
                                            className="btn-copiar-mayor-contado"
                                            onClick={() => copiarDesdeOtroSuper(superm)}
                                            title={`Copia precio de ${fuente.origen.toUpperCase()}`}
                                        >
                                            No hay
                                        </button>
                                    )}
                                </div>
                                <div className="precio-super-inputs">
                                    <div className="precio-input-wrapper">
                                        <label>Marca</label>
                                        <input
                                            type="text"
                                            value={datosPrecio[superm].marca || ''}
                                            onChange={(e) => actualizarPrecio(superm, 'marca', e.target.value)}
                                            placeholder=""
                                            className="input-precio"
                                        />
                                    </div>
                                    <div className="precio-input-wrapper">
                                        <label>Contado</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={formatearCampoDecimal(datosPrecio[superm].contado)}
                                            onChange={(e) => actualizarPrecio(superm, 'contado', e.target.value)}
                                            placeholder="0"
                                            className="input-precio"
                                        />
                                    </div>
                                    <div className="precio-input-wrapper">
                                        <label>Oferta</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={formatearCampoDecimal(datosPrecio[superm].oferta)}
                                            onChange={(e) => actualizarPrecio(superm, 'oferta', e.target.value)}
                                            placeholder="0"
                                            className="input-precio"
                                        />
                                    </div>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>

                <div className="modal-tarea-footer">
                    <button className="btn-cancelar-tarea" onClick={cerrar}>Cancelar</button>
                    <button className="btn-guardar-tarea" onClick={manejarGuardar}>
                        <Save size={20} />
                        Guardar
                    </button>
                </div>
            </div>
        </>
    );
}

// Modal para agregar descuentos
function ModalDescuento({ cerrar, guardar, descuentoInicial = null }) {
    const [dia, setDia] = useState(descuentoInicial?.dia || 'lunes');
    const [supermercado, setSupermercado] = useState(descuentoInicial?.supermercado || 'coto');
    const [metodo, setMetodo] = useState(descuentoInicial?.metodo || '');
    const [porcentaje, setPorcentaje] = useState(descuentoInicial?.porcentaje?.toString() || '');
    const [tope, setTope] = useState(descuentoInicial?.tope?.toString() || '');

    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const supermercados = ['coto', 'carrefour', 'makro', 'dia'];

    const diasCapitalized = {
        lunes: 'Lunes',
        martes: 'Martes',
        miercoles: 'Miércoles',
        jueves: 'Jueves',
        viernes: 'Viernes',
        sabado: 'Sábado',
        domingo: 'Domingo'
    };

    const manejarGuardar = () => {
        if (!metodo.trim() || !porcentaje) {
            alert('Completa al menos el método y el porcentaje');
            return;
        }

        guardar({
            dia,
            supermercado,
            metodo: metodo.trim(),
            porcentaje: parseFloat(porcentaje),
            tope: tope ? parseFloat(tope) : null
        });
    };

    return (
        <>
            <div className="modal-overlay-tarea" onClick={cerrar} />
            <div className="modal-tarea">
                <div className="modal-tarea-header">
                    <h2>{descuentoInicial ? 'Editar Descuento' : 'Agregar Descuento'}</h2>
                    <button className="btn-cerrar-modal" onClick={cerrar}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-tarea-contenido">
                    <div className="form-group">
                        <label>Día de la Semana</label>
                        <select
                            value={dia}
                            onChange={(e) => setDia(e.target.value)}
                            className="input-tarea"
                        >
                            {dias.map(d => (
                                <option key={d} value={d}>{diasCapitalized[d]}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Supermercado</label>
                        <select
                            value={supermercado}
                            onChange={(e) => setSupermercado(e.target.value)}
                            className="input-tarea"
                        >
                            {supermercados.map(s => (
                                <option key={s} value={s}>{s.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Método de Pago / Tarjeta</label>
                        <input
                            type="text"
                            value={metodo}
                            onChange={(e) => setMetodo(e.target.value)}
                            placeholder="Ej: Visa Débito, Mastercard, Efectivo"
                            className="input-tarea"
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label>Porcentaje de Descuento (%)</label>
                        <input
                            type="number"
                            value={porcentaje}
                            onChange={(e) => setPorcentaje(e.target.value)}
                            placeholder="15"
                            min="0"
                            max="100"
                            step="0.01"
                            className="input-tarea"
                        />
                    </div>

                    <div className="form-group">
                        <label>Tope de Descuento (opcional)</label>
                        <input
                            type="number"
                            value={tope}
                            onChange={(e) => setTope(e.target.value)}
                            placeholder="Ej: 5000"
                            min="0"
                            className="input-tarea"
                        />
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

export default ListadoSuper;
