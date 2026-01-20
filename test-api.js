const axios = require('axios');

const GOOGLE_API_URL = 'https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLjdwdUlpVRJkQIyAWxMt73XXRLob2EDydik9Wi13Pa77C5HUfMyq4Ri-GIgfK-_GEyBFm-53V2L4VzIK1ceDdP86AJWwgzcH3QE4BERiTnLajZIFb-QpzgAv1I51L9TqYekWiCvq6uPDAgflP7JgF0XFWcGFARnHEXcrdqM5epu80FuIs69QXsEJKbGDnIuDCzgHtdgWoLUw_bCxakn91YC1tcMvvPhazTzei4J81cIVO1zGIWfZW3uOAV_LiSM3KwGvE9eo_CxYTH035LnZY87XWk9Vx22rdGR5cP8&lib=MARJ3-rf-gxuPI0cvVl5kdFLD6i7dHDUc';

async function testAPIConnection() {
    console.log('🔍 Probando conexión con la API de Google Apps Script...\n');

    try {
        const startTime = Date.now();

        const response = await axios.get(GOOGLE_API_URL, {
            timeout: 30000,
            headers: {
                'Accept': 'application/json'
            }
        });

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        console.log('✅ Conexión exitosa!');
        console.log(`⏱️  Tiempo de respuesta: ${duration}s\n`);

        // Verificar estructura de la respuesta
        if (response.data && response.data.status === 'ok') {
            console.log('📊 Información de la respuesta:');
            console.log(`   - Status: ${response.data.status}`);
            console.log(`   - Total de productos: ${response.data.count}`);
            console.log(`   - Productos recibidos: ${response.data.data.length}\n`);

            // Mostrar el primer producto como ejemplo
            if (response.data.data.length > 0) {
                const firstProduct = response.data.data[0];
                console.log('📦 Ejemplo de producto (primero):');
                console.log('   Campos disponibles:', Object.keys(firstProduct).join(', '));
                console.log('\n   Valores:');
                console.log(`   - ID: ${firstProduct.Id}`);
                console.log(`   - Nombre: ${firstProduct.Nombre}`);
                console.log(`   - Código: ${firstProduct.Código}`);
                console.log(`   - Código Barras: ${firstProduct['Código Barras']}`);
                console.log(`   - Stock: ${firstProduct.Stock}`);
                console.log(`   - Precio Final: $${firstProduct['Precio Final']}`);
                console.log(`   - Estado: ${firstProduct.Estado}\n`);
            }

            // Estadísticas básicas
            const activeProducts = response.data.data.filter(p => p.Estado === 'Activo').length;
            const productsWithStock = response.data.data.filter(p => parseFloat(p.Stock) > 0).length;

            console.log('📈 Estadísticas:');
            console.log(`   - Productos activos: ${activeProducts}`);
            console.log(`   - Productos con stock: ${productsWithStock}`);
            console.log(`   - Productos sin stock: ${response.data.data.length - productsWithStock}\n`);

            console.log('✨ La API está funcionando correctamente!');

        } else {
            console.error('❌ Formato de respuesta inesperado');
            console.error('Respuesta recibida:', JSON.stringify(response.data).substring(0, 200));
        }

    } catch (error) {
        console.error('❌ Error al conectar con la API:\n');

        if (error.response) {
            console.error(`   - Status HTTP: ${error.response.status}`);
            console.error(`   - Mensaje: ${error.response.statusText}`);
            console.error(`   - Datos: ${JSON.stringify(error.response.data).substring(0, 200)}`);
        } else if (error.request) {
            console.error('   - No se recibió respuesta del servidor');
            console.error('   - Verifica tu conexión a internet');
        } else {
            console.error(`   - Error: ${error.message}`);
        }

        if (error.code === 'ECONNABORTED') {
            console.error('   - La petición excedió el timeout de 30 segundos');
        }

        process.exit(1);
    }
}

// Ejecutar la prueba
testAPIConnection();
