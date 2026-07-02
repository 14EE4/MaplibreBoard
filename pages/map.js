import { useEffect } from 'react'
import Head from 'next/head'

function waitForMaplibre(timeout = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    function check() {
      if (typeof window !== 'undefined' && window.maplibregl) return resolve(window.maplibregl)
      if (Date.now() - start > timeout) return reject(new Error('maplibre not available'))
      setTimeout(check, 50)
    }
    check()
  })
}

export default function MapPage() {
  useEffect(() => {
    let map = null
    let mounted = true

    waitForMaplibre(8000).then((maplibregl) => {
      if (!mounted) return
      try {
        // restore saved view state (center, zoom) from localStorage
        let savedState = null
        try { savedState = JSON.parse(localStorage.getItem('rasterMap2-state')) } catch (e) { savedState = null }
        const initCenter = savedState && Array.isArray(savedState.center) ? savedState.center : [0, 0]
        const initZoom = savedState && typeof savedState.zoom === 'number' ? savedState.zoom : 0

        // createMap supports modes: 'osm' (OpenStreetMap raster), 'sat' (satellite raster), 'globe' (globe projection)
        function createMap(mode) {
          if (map) try { map.remove() } catch (e) {}
          const baseOpts = {
            container: 'map',
            center: initCenter,
            zoom: initZoom
          }
          if (mode === 'sat') {
            // Esri World Imagery (satellite) tiles
            map = new maplibregl.Map(Object.assign({}, baseOpts, {
              style: {
                version: 8,
                sources: {
                  'raster-tiles-sat': {
                    type: 'raster',
                    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                    tileSize: 256
                  }
                },
                layers: [{ id: 'sat-tiles', type: 'raster', source: 'raster-tiles-sat', attribution: 'Tiles © Esri' }]
              }
            }))
          } else if (mode === 'globe') {
            // Globe projection using MapLibre demo globe style
            // See: https://demotiles.maplibre.org/globe.json
            map = new maplibregl.Map(Object.assign({}, baseOpts, {
              projection: 'globe',
              style: 'https://demotiles.maplibre.org/globe.json'
            }))
          } else {
            // default: OpenStreetMap raster
            map = new maplibregl.Map(Object.assign({}, baseOpts, {
              style: {
                version: 8,
                sources: {
                  'raster-tiles': {
                    type: 'raster',
                    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    minzoom: 0,
                    maxzoom: 19
                  }
                },
                layers: [{ id: 'simple-tiles', type: 'raster', source: 'raster-tiles', attribution: '© OpenStreetMap contributors' }]
              }
            }))
          }
        }

        // read saved mode or default to osm
        let savedMode = null
        try { const s = JSON.parse(localStorage.getItem('rasterMap2-state')); if (s && s.mode) savedMode = s.mode } catch (e) { savedMode = null }
        const currentMode = savedMode || 'osm'
        createMap(currentMode)
        // attach handlers (sets cursor, handlers) after map creation
        try { attachMapHandlers() } catch (e) { console.warn('attachMapHandlers failed', e) }

        const GRID_SOURCE = 'geo-grid-source'
        const GRID_LAYER = 'geo-grid-layer'
        const BOARD_SOURCE = 'boards-grid-source'
        const BOARD_LAYER = 'boards-grid-layer'

        let gridState = { enabled: false, sizeDeg: 5 }

        function buildGridGeoJSON(sizeDeg, bounds) {
          const west = bounds.getWest()
          const east = bounds.getEast()
          const south = bounds.getSouth()
          const north = bounds.getNorth()

          function normalizeLng(l) { while (l < -180) l += 360; while (l > 180) l -= 360; return l }
          let w = normalizeLng(west)
          let e = normalizeLng(east)

          const lonStart = Math.floor(w / sizeDeg) * sizeDeg
          const lonEnd = Math.ceil((e + (e < w ? 360 : 0)) / sizeDeg) * sizeDeg
          const latStart = Math.floor(south / sizeDeg) * sizeDeg
          const latEnd = Math.ceil(north / sizeDeg) * sizeDeg

          const features = []
          for (let lon = lonStart; lon <= lonEnd; lon += sizeDeg) {
            const lonNorm = normalizeLng(lon)
            features.push({ type: 'Feature', properties: { type: 'v', lon: lonNorm }, geometry: { type: 'LineString', coordinates: [[lonNorm, -90], [lonNorm, 90]] } })
          }
          for (let lat = latStart; lat <= latEnd; lat += sizeDeg) {
            const latClamped = Math.max(-90, Math.min(90, lat))
            features.push({ type: 'Feature', properties: { type: 'h', lat: latClamped }, geometry: { type: 'LineString', coordinates: [[-180, latClamped], [180, latClamped]] } })
          }
          return { type: 'FeatureCollection', features }
        }

        function ensureGridLayer() {
          if (!map.getSource(GRID_SOURCE)) {
            map.addSource(GRID_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
            map.addLayer({ id: GRID_LAYER, type: 'line', source: GRID_SOURCE, layout: {}, paint: { 'line-color': '#ff0000', 'line-width': 1, 'line-opacity': 0.6 } })
          }
        }

        function updateGrid() {
          if (!gridState.enabled) {
            if (map.getLayer(GRID_LAYER)) map.setLayoutProperty(GRID_LAYER, 'visibility', 'none')
            return
          }
          ensureGridLayer()
          if (map.getLayer(GRID_LAYER)) map.setLayoutProperty(GRID_LAYER, 'visibility', 'visible')
          const bounds = map.getBounds()
          const data = buildGridGeoJSON(gridState.sizeDeg, bounds)
          const src = map.getSource(GRID_SOURCE)
          try { src.setData(data) } catch (e) { /* ignore if not ready */ }
        }

        function buildBoardsGeoJSON(boards, sizeDeg) {
          const features = []
          boards.forEach(b => {
              const gx = (b.grid_x != null) ? b.grid_x : b.x
              const gy = (b.grid_y != null) ? b.grid_y : b.y
              if (gx == null || gy == null) return
              const west = gx * sizeDeg - 180
              const south = gy * sizeDeg - 90
              const east = west + sizeDeg
              const north = south + sizeDeg
              const coords = [[west, south], [east, south], [east, north], [west, north], [west, south]]
              const posts = (b.posts_count != null) ? b.posts_count : (b.count != null ? b.count : 0)
              features.push({ type: 'Feature', properties: { posts_count: posts, grid_x: gx, grid_y: gy }, geometry: { type: 'Polygon', coordinates: [coords] } })
            })
          return { type: 'FeatureCollection', features }
        }

        function ensureBoardsLayer() {
          if (!map.getSource(BOARD_SOURCE)) {
            map.addSource(BOARD_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
            map.addLayer({ id: BOARD_LAYER, type: 'fill', source: BOARD_SOURCE, layout: {}, paint: { 'fill-color': ['interpolate', ['linear'], ['get', 'posts_count'], 0, '#2b83ba', 5, '#66c2a5', 20, '#fee08b', 50, '#fdae61', 100, '#d73027'], 'fill-opacity': 0.45 } })
            map.addLayer({ id: BOARD_LAYER + '-outline', type: 'line', source: BOARD_SOURCE, paint: { 'line-color': '#000000', 'line-width': 0.5, 'line-opacity': 0.2 } })
          }
        }

        function updateBoardsOverlay() {
          ensureBoardsLayer()
          fetch('/api/boards')
            .then(r => r.ok ? r.json() : [])
            .then(function(boards) {
              const data = buildBoardsGeoJSON(Array.isArray(boards) ? boards : [], gridState.sizeDeg)
              const src = map.getSource(BOARD_SOURCE)
              try { src.setData(data) } catch (e) { console.warn('set boards data failed', e) }
            }).catch(function(err){ console.warn('load boards failed', err) })
        }

        // Attach common map event handlers (call after each map creation)
        function attachMapHandlers() {
          try { map.getCanvas().style.cursor = 'crosshair' } catch (e) { console.warn('cursor set failed', e) }

          map.on('load', function(){ ensureGridLayer(); updateGrid(); ensureBoardsLayer(); updateBoardsOverlay(); })

          map.on('moveend', function(){
            try {
              const c = map.getCenter(); const z = map.getZoom();
              // preserve mode if present
              const st = JSON.parse(localStorage.getItem('rasterMap2-state')||'{}'); st.center = [c.lng, c.lat]; st.zoom = z; localStorage.setItem('rasterMap2-state', JSON.stringify(st))
            } catch (e) {}
            updateGrid(); updateBoardsOverlay();
          })

          map.on('zoomend', function(){
            try { const c = map.getCenter(); const z = map.getZoom(); const st = JSON.parse(localStorage.getItem('rasterMap2-state')||'{}'); st.center = [c.lng, c.lat]; st.zoom = z; localStorage.setItem('rasterMap2-state', JSON.stringify(st)) } catch(e){}
            updateGrid()
          })

          map.on('click', function(e){
            try {
              // 경도 정규화 적용 (-180 ~ 180도 범위로 고정)
              let lng = e.lngLat.lng
              while (lng < -180) lng += 360
              while (lng > 180) lng -= 360

              // 위도 정규화 및 클램핑 (-90 ~ 90도 범위로 고정)
              let lat = Math.max(-90, Math.min(90, e.lngLat.lat))

              const size = gridState.sizeDeg
              const maxGridX = Math.round(360 / size) // 5도 기준 72
              const maxGridY = Math.round(180 / size) // 5도 기준 36

              // gridX 계산 및 순환 범주 보정 (0 ~ maxGridX-1)
              let gridX = Math.floor((lng + 180) / size)
              gridX = (gridX % maxGridX + maxGridX) % maxGridX

              // gridY 계산 및 한계 범위 제한 (0 ~ maxGridY-1)
              let gridY = Math.floor((lat + 90) / size)
              gridY = Math.max(0, Math.min(maxGridY - 1, gridY))

              // 즉시 해당 격자 보드 페이지로 이동 (보드 생성은 보드 페이지 내에서 직접 처리)
              window.location.href = '/board?grid_x=' + encodeURIComponent(gridX) + '&grid_y=' + encodeURIComponent(gridY)
            } catch (err) { console.error('grid click handler failed', err) }
          })
        }

        // UI control
        const gridControl = document.createElement('div')
        gridControl.className = 'map-grid-control'

        // 🏠 Home Button Group 추가
        const homeGroup = document.createElement('div')
        homeGroup.className = 'control-group'
        const homeBtn = document.createElement('button')
        homeBtn.innerHTML = '🏠'
        homeBtn.title = 'Home'
        homeBtn.className = 'btn btn-secondary btn-sm'
        homeBtn.style.padding = '4px 10px'
        homeBtn.style.fontSize = '12px'
        homeBtn.style.borderRadius = '6px'
        homeBtn.style.cursor = 'pointer'
        homeBtn.style.display = 'flex'
        homeBtn.style.alignItems = 'center'
        homeBtn.style.gap = '4px'
        homeBtn.addEventListener('click', function() { window.location.href = '/' })
        homeGroup.appendChild(homeBtn)
        gridControl.appendChild(homeGroup)

        const toggleGroup = document.createElement('div')
        toggleGroup.className = 'control-group'
        const toggle = document.createElement('input'); toggle.type = 'checkbox'; toggle.checked = gridState.enabled; toggle.id = 'gridToggle'
        const label = document.createElement('label'); label.htmlFor = 'gridToggle'; label.textContent = 'Grid'
        toggleGroup.appendChild(toggle)
        toggleGroup.appendChild(label)

        const sizeGroup = document.createElement('div')
        sizeGroup.className = 'control-group'
        const sizeLabel = document.createElement('span'); sizeLabel.textContent = '🌐'; sizeLabel.title = 'Grid Size'
        const sizeSelect = document.createElement('select')
        const sizes = [0.25, 0.5, 1, 2, 5, 10, 20]
        sizes.forEach(function(s){ const opt = document.createElement('option'); opt.value = s; opt.text = s + '°'; if (s===gridState.sizeDeg) opt.selected = true; sizeSelect.appendChild(opt); })
        sizeSelect.value = gridState.sizeDeg
        sizeSelect.disabled = true
        sizeGroup.appendChild(sizeLabel)
        sizeGroup.appendChild(sizeSelect)

        const modeGroup = document.createElement('div')
        modeGroup.className = 'control-group'
        const modeLabel = document.createElement('span'); modeLabel.textContent = '🗺️'; modeLabel.title = 'Change Map'
        const modeSelect = document.createElement('select')
        ;['osm','sat','globe'].forEach(function(m){ const o = document.createElement('option'); o.value = m; o.text = (m==='osm'?'OpenStreetMap':m==='sat'?'Satellite':'Globe (vector)'); modeSelect.appendChild(o) })
        try { if (currentMode) modeSelect.value = currentMode } catch(e){}
        modeGroup.appendChild(modeLabel)
        modeGroup.appendChild(modeSelect)

        gridControl.appendChild(toggleGroup)
        gridControl.appendChild(sizeGroup)
        gridControl.appendChild(modeGroup)

        // append to map container
        const mapContainer = document.getElementById('map-container') || document.body
        mapContainer.appendChild(gridControl)

        toggle.addEventListener('change', function(){ gridState.enabled = !!toggle.checked; updateGrid(); })
        sizeSelect.addEventListener('change', function(){ gridState.sizeDeg = parseFloat(sizeSelect.value) || 5; updateGrid(); })
        modeSelect.addEventListener('change', function(){ try { const m = modeSelect.value; // persist
          const st = JSON.parse(localStorage.getItem('rasterMap2-state')||'{}'); st.mode = m; localStorage.setItem('rasterMap2-state', JSON.stringify(st)); createMap(m); try { attachMapHandlers() } catch(e) { console.warn('attachMapHandlers after mode change failed', e) } } catch(e){ console.warn('mode change failed', e) } })

        // Event handlers are attached inside `attachMapHandlers()` to avoid duplicates.

      } catch (err) { console.error('map init failed', err) }
    }).catch((err)=>{ console.warn('maplibre not ready', err) })

    return () => { mounted = false; try { if (map) map.remove() } catch(e){} }
  }, [])

  return (
    <>
      <Head>
        <title>Board Map</title>
        <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5.11.0/dist/maplibre-gl.css" />
        <script src="https://unpkg.com/maplibre-gl@5.11.0/dist/maplibre-gl.js"></script>
        <style>{`html, body, #map, #map-container { height: 100%; margin: 0; padding: 0; }
          .popup-input textarea { width: 220px; height: 80px; }
          .popup-input button { margin-right: 6px; }
          .popup-note p { margin: 6px 0 0 0; }
          .popup-meta { font-size: 11px; color: #666; margin-top:6px; }

          .map-grid-control {
            position: absolute;
            top: 16px;
            right: 16px;
            background: rgba(17, 24, 39, 0.85);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 8px 16px;
            border-radius: 12px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            color: #f3f4f6;
            display: flex;
            align-items: center;
            gap: 14px;
            z-index: 9999;
            box-sizing: border-box;
          }
          .control-group {
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
          }
          .control-group label {
            cursor: pointer;
          }
          .control-group input[type="checkbox"] {
            cursor: pointer;
          }
          .map-grid-control select {
            background: rgba(31, 41, 55, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #f3f4f6;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            font-family: inherit;
            outline: none;
            cursor: pointer;
            box-sizing: border-box;
          }
          .map-grid-control select:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          .map-grid-control label, .map-grid-control span {
            font-weight: 500;
          }
          @media (max-width: 600px) {
            .map-grid-control {
              top: 12px;
              right: 12px;
              left: 12px;
              flex-wrap: wrap;
              justify-content: space-between;
              padding: 10px 12px;
              gap: 8px;
            }
            .control-group {
              flex: 1 1 auto;
              justify-content: center;
            }
          }
        `}</style>
      </Head>
      <div id="map-container" style={{ height: '100vh' }}>
        <div id="map" style={{ height: '100%' }} />
      </div>
    </>
  )
}
