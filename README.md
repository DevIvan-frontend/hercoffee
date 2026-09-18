# Her Coffee · Landing page

Sitio estático (HTML + CSS + JS, sin build) para **Her Coffee**, cafetería y postres en La Paz, B.C.S.

## Estructura

```
index.html          Página completa (secciones: hero, nosotros, menú, galería, reserva, visítanos, footer)
css/styles.css      Estilos: paleta naranja / madera pulida / crema, chispas dibujadas a mano, animaciones, responsivo
js/data.js          TEXTOS (es/en), MENÚ y GALERÍA  ←  edita aquí precios, textos y fotos
js/main.js          Interacciones: idioma, menú, lightbox con zoom, WhatsApp, estado abierto/cerrado, mapa
assets/img/         Imágenes optimizadas (WebP), logo con fondo transparente, favicon, og.jpg
images/ · Menu/     Fotos y menú originales (no se usan directamente; se conservan como fuente)
```

## Cómo verlo

Abre `index.html` en el navegador o sirve la carpeta con cualquier servidor estático, por ejemplo:

```bash
python -m http.server 5173
```

y entra a <http://localhost:5173>.

## Dónde está publicado

- Repositorio: <https://github.com/DevIvan-frontend/hercoffee>
- Sitio en vivo (GitHub Pages, rama `main`): <https://devivan-frontend.github.io/hercoffee/>

Cada `git push` a `main` vuelve a publicar el sitio en uno o dos minutos. Si más adelante se usa un dominio propio
(p. ej. `hercoffee.com.mx`), configúralo en *Settings → Pages → Custom domain* y actualiza `og:image` y `og:url` en `index.html`.
También puede subirse la carpeta tal cual a Netlify, Vercel o cPanel; no necesita compilarse.

## Idioma

La página detecta el idioma del dispositivo (`navigator.language`): si empieza por `es` muestra español;
cualquier otro idioma muestra inglés. El visitante puede cambiarlo con el selector ES/EN y la elección se recuerda.

## Editar contenido

Todo el contenido editable está en `js/data.js`:

- **Textos de la interfaz** → `HC_I18N.es` y `HC_I18N.en` (misma clave en ambos idiomas).
- **Menú** → `HC_MENU`. Cada categoría tiene `items`:
  - Bebidas con temperatura y tamaño: `hot: [12oz, 16oz]`, `iced: [12oz, 16oz]` (`null` = no disponible).
  - Tamaño único: `single: { size: '4 oz', price: 55 }`.
  - Precio único: `price: 110`; `price: null` muestra “pregunta el precio”.
  - `v` = sabores/variantes (chips); `d` = descripción; `star: true` marca el platillo con una chispa.
- **Galería** → `HC_GALLERY`. Cada foto necesita `assets/img/gallery/<id>.webp` (grande) y
  `assets/img/thumbs/<id>.webp` (miniatura). `size` puede ser `tall`, `wide` o vacío; el orden actual está
  pensado para que la cuadrícula se llene sin huecos.

Otros datos fijos (dirección, horario, WhatsApp, coordenadas, redes) están en `index.html` y al inicio de `js/main.js`.

- Bloque **“De temporada”** (pumpkin spice): está en `index.html` marcado con un comentario; elimínalo o cámbialo cuando termine la temporada.
- La calificación **“4.5 en Google”** del hero es un texto fijo (`hero.rating` en `data.js`).

## Pendientes detectados en el menú impreso

- **Espresso doble (2 oz) — $30**: así aparece en la foto del menú, más barato que el espresso sencillo ($38). Probable error de la fuente.
- **Soda italiana**: el precio no se ve en la foto; está como “pregunta el precio” hasta que se capture.

## Créditos técnicos

- Tipografías: Fraunces, Nunito y Caveat (Google Fonts).
- Mapa: [Leaflet](https://leafletjs.com) + teselas de © OpenStreetMap (si no cargan, se muestra un enlace a Google Maps).
- Reservas: enlace `wa.me` con mensaje prellenado; no requiere servidor.
