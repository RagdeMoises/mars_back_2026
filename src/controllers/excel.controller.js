const axios = require('axios');
const xlsx = require('xlsx'); // Mantenemos xlsx solo para enviarCorreo
const pool = require('../config/database');
const express = require('express');
const nodemailer = require('nodemailer');

// URL de la API de Google Apps Script
const GOOGLE_API_URL = 'https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLjdwdUlpVRJkQIyAWxMt73XXRLob2EDydik9Wi13Pa77C5HUfMyq4Ri-GIgfK-_GEyBFm-53V2L4VzIK1ceDdP86AJWwgzcH3QE4BERiTnLajZIFb-QpzgAv1I51L9TqYekWiCvq6uPDAgflP7JgF0XFWcGFARnHEXcrdqM5epu80FuIs69QXsEJKbGDnIuDCzgHtdgWoLUw_bCxakn91YC1tcMvvPhazTzei4J81cIVO1zGIWfZW3uOAV_LiSM3KwGvE9eo_CxYTH035LnZY87XWk9Vx22rdGR5cP8&lib=MARJ3-rf-gxuPI0cvVl5kdFLD6i7dHDUc';

/**
 * Obtiene productos desde la API de Google Apps Script
 * @returns {Array} Array de productos formateados
 */
const fetchProductsFromAPI = async () => {
    try {
        console.log('Obteniendo productos desde la API de Google...');
        const response = await axios.get(GOOGLE_API_URL, {
            timeout: 30000, // 30 segundos timeout
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.data && response.data.status === 'ok' && Array.isArray(response.data.data)) {
            console.log(`Se obtuvieron ${response.data.count} productos de la API`);

            // Mapear los datos de la API al formato que espera la base de datos
            const products = response.data.data.map(item => ({
                barra: item['Código Barras'] || '',
                sku: item['Código'] || '',
                id: item['Id'] || null,
                titulo: item['Nombre'] || '',
                stock: parseFloat(item['Stock']) || 0,
                precio_costo: parseFloat(item['Costo Interno']) || 0,
                precio_minorista: parseFloat(item['Precio Final']) || 0,
                precio_especial: parseFloat(item['Precio']) || 0,
                precio_mayorista: parseFloat(item['Precio Mayorista']) || 0,
                categoria: item['Id Rubro'] || '',
                proveedor: '', // No existe en la API
                ubicacion: '', // No existe en la API
                AD: item['Estado'] === 'Activo' ? 1 : 0 // Convertir estado a número
            }));

            return products;
        } else {
            throw new Error('Formato de respuesta inválido de la API');
        }
    } catch (err) {
        console.error('Error al obtener datos de la API:', err.message);
        if (err.response) {
            console.error('Respuesta del servidor:', err.response.status);
            console.error('Datos:', err.response.data);
        }
        throw err;
    }
};

const getProducts = async (req, res) => {
    try {
        const result = await fetchProductsFromAPI();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// const renderExcelForm = (req, res) => {
//     res.render('index');
// };
const saveToDatabase = async (products) => {
    try {
        // Limpiar la tabla antes de insertar nuevos datos (opcional)
        await pool.query('TRUNCATE TABLE productos RESTART IDENTITY');

        // Insertar productos en lote
        for (const product of products) {
            //console.log(product)
            await pool.query(
                `INSERT INTO productos (
                    barra, sku, titulo, stock, precio_costo, 
                    precio_minorista, precio_especial, precio_mayorista, 
                    categoria, proveedor, ubicacion,estatus
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,$12)`,
                [
                    product.barra,
                    product.sku,
                    product.titulo,
                    product.stock,
                    product.precio_costo,
                    product.precio_minorista,
                    product.precio_especial,
                    product.precio_mayorista,
                    product.categoria,
                    product.proveedor,
                    product.ubicacion,
                    product.AD
                ]
            );
        }
    } catch (err) {
        console.error('Error al guardar en la base de datos:', err);
        throw err;
    }
};

const uploadExcel = async (req, res) => {
    try {
        console.log('Iniciando sincronización de productos desde la API...');
        const result = await fetchProductsFromAPI();
        await saveToDatabase(result);
        console.log('Sincronización completada exitosamente');
        res.json({
            success: true,
            message: 'Productos sincronizados correctamente',
            count: result.length
        });
    } catch (err) {
        console.error('Error en la sincronización:', err.message);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

const renderExcelForm = (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sincronización de Productos - Tiendas MARS</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .container {
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    padding: 40px;
                    max-width: 600px;
                    width: 100%;
                }
                h1 {
                    color: #333;
                    margin-bottom: 10px;
                    font-size: 28px;
                }
                .subtitle {
                    color: #666;
                    margin-bottom: 30px;
                    font-size: 14px;
                }
                .info-box {
                    background: #f8f9fa;
                    border-left: 4px solid #667eea;
                    padding: 15px;
                    margin-bottom: 25px;
                    border-radius: 5px;
                }
                .info-box p {
                    color: #555;
                    line-height: 1.6;
                    margin-bottom: 10px;
                }
                .info-box p:last-child { margin-bottom: 0; }
                .sync-button {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    font-size: 16px;
                    border-radius: 10px;
                    cursor: pointer;
                    width: 100%;
                    font-weight: bold;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .sync-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
                }
                .sync-button:active {
                    transform: translateY(0);
                }
                .sync-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                #status {
                    margin-top: 20px;
                    padding: 15px;
                    border-radius: 8px;
                    display: none;
                }
                .success {
                    background: #d4edda;
                    border: 1px solid #c3e6cb;
                    color: #155724;
                }
                .error {
                    background: #f8d7da;
                    border: 1px solid #f5c6cb;
                    color: #721c24;
                }
                .loading {
                    background: #d1ecf1;
                    border: 1px solid #bee5eb;
                    color: #0c5460;
                }
                .spinner {
                    display: inline-block;
                    width: 14px;
                    height: 14px;
                    border: 2px solid rgba(255,255,255,.3);
                    border-radius: 50%;
                    border-top-color: white;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🔄 Sincronización de Productos</h1>
                <p class="subtitle">Tiendas MARS - Sistema de Gestión</p>
                
                <div class="info-box">
                    <p><strong>ℹ️ Información:</strong></p>
                    <p>Este sistema sincroniza automáticamente los productos desde Google Sheets a la base de datos.</p>
                    <p><strong>Fuente:</strong> Google Apps Script API</p>
                    <p><strong>Productos disponibles:</strong> ~2,144</p>
                </div>
                
                <button class="sync-button" onclick="syncProducts()">
                    <span id="button-text">Sincronizar Productos</span>
                </button>
                
                <div id="status"></div>
            </div>
            
            <script>
                async function syncProducts() {
                    const button = document.querySelector('.sync-button');
                    const statusDiv = document.getElementById('status');
                    const buttonText = document.getElementById('button-text');
                    
                    button.disabled = true;
                    buttonText.innerHTML = '<span class="spinner"></span> Sincronizando...';
                    statusDiv.style.display = 'block';
                    statusDiv.className = 'loading';
                    statusDiv.textContent = '⏳ Obteniendo datos de la API...';
                    
                    try {
                        const response = await fetch('/data/upload', {
                            method: 'POST'
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            statusDiv.className = 'success';
                            statusDiv.innerHTML = \`
                                <strong>✅ Sincronización exitosa!</strong><br>
                                Se sincronizaron \${data.count} productos correctamente.
                            \`;
                        } else {
                            throw new Error(data.error || 'Error desconocido');
                        }
                    } catch (error) {
                        statusDiv.className = 'error';
                        statusDiv.innerHTML = \`
                            <strong>❌ Error en la sincronización</strong><br>
                            \${error.message}
                        \`;
                    } finally {
                        button.disabled = false;
                        buttonText.textContent = 'Sincronizar Productos';
                    }
                }
            </script>
        </body>
        </html>
    `);
};

// Agregar esto en excel.controller.js
const getPaginatedProducts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            category = '',
            min_price = 0,
            max_price = 150000,
            sortBy = 'id',
            productTypes = ''
        } = req.query;

        //console.log(req.query);

        const offset = (page - 1) * limit;

        // Construir la parte WHERE de la consulta
        let whereConditions = ['(titulo ILIKE $1 OR sku ILIKE $1 OR barra ILIKE $1)'];
        const queryParams = [`%${search}%`];

        // Agregar filtro de categoría si existe
        if (category) {
            whereConditions.push('categoria = $' + (queryParams.length + 1));
            queryParams.push(category);
        }

        // Agregar filtro de rango de precios
        whereConditions.push('precio_minorista BETWEEN $' + (queryParams.length + 1) + ' AND $' + (queryParams.length + 2));
        queryParams.push(min_price, max_price);

        // Agregar filtro de tipo de producto si existe
        // if (productTypes) {

        //     whereConditions.push('estatus in ( $' + (queryParams.length + 1)+')');
        //     queryParams.push(productTypes);
        // }
        if (productTypes && typeof productTypes === 'string') {
            const productTypesArray = productTypes.split(',').map(p => p.trim());
            const placeholders = productTypesArray.map((_, i) => '$' + (queryParams.length + i + 1));
            whereConditions.push(`estatus IN (${placeholders.join(', ')})`);
            queryParams.push(...productTypesArray);
        }

        // Agregar filtro de stock si se solicita
        if (req.query.hideNoStock === 'true') {
            whereConditions.push('stock > 0');
        }


        //console.log(whereConditions)

        // Construir la consulta SQL
        let query = `
                SELECT * FROM productos
                WHERE ${whereConditions.join(' AND ')}
                ORDER BY ${getSortClause(sortBy)}
                LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
            `;
        //console.log(query)

        let countQuery = `
                SELECT COUNT(*) FROM productos
                WHERE ${whereConditions.join(' AND ')}
            `;

        // Agregar parámetros de paginación
        queryParams.push(limit, offset);

        // Ejecutar ambas consultas en paralelo
        const [productsResult, countResult] = await Promise.all([
            pool.query(query, queryParams),
            pool.query(countQuery, queryParams.slice(0, -2)) // Excluir limit y offset
        ]);

        const totalItems = parseInt(countResult.rows[0].count);
        //console.log(countQuery)
        const totalPages = Math.ceil(totalItems / limit);

        res.json({
            data: productsResult.rows,
            pagination: {
                totalItems,
                totalPages,
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit),
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Función auxiliar para construir el ORDER BY
function getSortClause(sortBy) {
    //console.log(sortBy)
    switch (sortBy) {
        case 'price-asc':
            return 'precio_minorista ASC';
        case 'price-desc':
            return 'precio_minorista DESC';
        case 'name-asc':
            return 'titulo ASC';
        case 'name-desc':
            return 'titulo DESC';
        case 'newest':
            return 'id DESC';
        default:
            return `CASE
                WHEN estatus = 1 THEN 0
                WHEN estatus = 2 THEN 1
                ELSE 2
            END ASC`;
    }
}


const enviarCorreo = async (req, res) => {
    const { email, cartItems } = req.body;
    //console.log(req.body)

    // Generar Excel
    const worksheet = xlsx.utils.json_to_sheet(cartItems);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Carrito");
    const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Configurar transporte de correo
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: "edgararc13@gmail.com",
            pass: "ldpm ogab lgjk jnqa",
        },
        tls: {
            rejectUnauthorized: false, // ⚠️ Solo para pruebas
        },
    });

    const mailOptions = {
        from: "edgararc13@gmail.com",
        to: email,
        cc: 'edgararc13@gmail.com', // destinatario en copia
        subject: 'Tu carrito de compras',
        text: 'Buen dia adjunto encontrarás los productos de tu pedido, gracias por preferirnos, Tiendas MARS',
        attachments: [{
            filename: 'carrito.xlsx',
            content: excelBuffer,
        }],
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Correo enviado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al enviar el correo' });
    }
}
const getCategorias = async (req, res) => {

    try {
        const query = `
      SELECT categoria 
      FROM productos 
      GROUP BY categoria 
      ORDER BY categoria ASC
    `;
        const { rows } = await pool.query(query);
        //console.log(rows)
        res.json(rows.map(r => r.categoria)); // Solo enviamos el array de categorías
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ error: 'Error al obtener categorías' });
    }
};

const getNovedades = async (req, res) => {

    try {
        const query = `
      SELECT * 
      FROM productos 
	  where estatus = 1
      ORDER BY id desc
	  limit 4
    `;
        const { rows } = await pool.query(query);
        //console.log(rows)
        res.json(rows); // Solo enviamos el array de categorías
    } catch (error) {
        console.error('Error al obtener novedades:', error);
        res.status(500).json({ error: 'Error al obtener novedades' });
    }
};

const getOfertas = async (req, res) => {

    try {
        const query = `
      SELECT * 
      FROM productos 
	  where estatus = 2
      ORDER BY id desc
	  limit 4
    `;
        const { rows } = await pool.query(query);
        //console.log(rows)
        res.json(rows); // Solo enviamos el array de categorías
    } catch (error) {
        console.error('Error al obtener novedades:', error);
        res.status(500).json({ error: 'Error al obtener novedades' });
    }
};



module.exports = {
    getProducts,
    renderExcelForm,
    uploadExcel,
    getPaginatedProducts,
    enviarCorreo,
    getCategorias,
    getNovedades,
    getOfertas
};