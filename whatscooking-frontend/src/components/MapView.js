import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createPin(number, color = '#C82F2F') {
  // Measure text width to make pin responsive
  const text = String(number);
  const charWidth = 7.5;
  const padding = 16;
  const width = Math.max(32, text.length * charWidth + padding);

  return L.divIcon({
    html: `<div style="
      background:${color}; color:#fff; border-radius:50px;
      padding:3px 10px; font-size:11px; font-weight:700;
      font-family:Inter,sans-serif; white-space:nowrap;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
      border:2px solid rgba(255,255,255,0.8);
      display:inline-flex; align-items:center;
      min-width:${width}px; justify-content:center;
      line-height:1.4;
    ">${number}</div>`,
    className: '',
    iconSize: [width, 22],
    iconAnchor: [width / 2, 11],
  });
}

function FlyToCenter({ trigger }) {
  const map = useMap();
  useEffect(() => {
    if (trigger) map.flyTo([-23.5505, -46.6333], 12, { duration: 0.8 });
  }, [trigger, map]);
  return null;
}

function FlyTo({ selected }) {
  const map = useMap();
  useEffect(() => {
    if (!selected?.location?.coordinates) return;
    const [lng, lat] = selected.location.coordinates;
    map.flyTo([lat, lng], 17, { duration: 0.8 });
  }, [selected, map]);
  return null;
}

function SetCenter({ onMapClick, geoActive }) {
  const map = useMap();
  useEffect(() => {
    if (geoActive) {
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.getContainer().style.cursor = '';
    }
    const handler = (e) => {
      if (geoActive && onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    };
    map.on('click', handler);
    return () => {
      map.off('click', handler);
      map.getContainer().style.cursor = '';
    };
  }, [map, onMapClick, geoActive]);
  return null;
}

function createCenterIcon() {
  return L.divIcon({
    html: `<div style="
      width: 32px; height: 32px;
      background: rgba(0,104,74,0.15);
      border: 3px solid #00684A;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      position: relative;
    ">
      <div style="
        width: 8px; height: 8px;
        background: #00684A;
        border-radius: 50%;
      "></div>
      <div style="
        position: absolute;
        width: 1px; height: 20px;
        background: #00684A;
        top: -20px; left: 50%; transform: translateX(-50%);
      "></div>
    </div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// São Paulo — Praça da Sé
const SP_CENTER = [-23.5505, -46.6333];

const MapView = forwardRef(function MapView({ restaurants, selected, onSelect, onMapClick, geoCenter, distance, geoActive, resetTrigger }, ref) {
  return (
    <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
      {/* Hint when no center set */}
      {distance && !geoCenter && (
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.7)', color: '#fff',
          padding: '6px 14px', borderRadius: 20, fontSize: 12,
          zIndex: 400, pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          📍 Clique no mapa para definir o centro da busca
        </div>
      )}
      <MapContainer
        center={SP_CENTER}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />

        <FlyTo selected={selected} />
        <FlyToCenter trigger={resetTrigger} />
        <SetCenter onMapClick={onMapClick} geoActive={geoActive} />

        {/* Center marker for geo search */}
        {geoCenter && (
          <Marker
            position={[geoCenter.lat, geoCenter.lng]}
            icon={createCenterIcon()}
            zIndexOffset={2000}
          >
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                <strong>Centro da busca</strong><br/>
                {distance && <span>Raio: {distance} km</span>}
              </div>
            </Popup>
          </Marker>
        )}

        {restaurants.map((r, i) => {
          if (!r.location?.coordinates) return null;
          const [lng, lat] = r.location.coordinates;
          const isSelected = selected?._id === r._id;
          const label = `${i + 1}. ${r.name}`;

          return (
            <Marker
              key={r._id || i}
              position={[lat, lng]}
              icon={createPin(label, isSelected ? '#00684A' : '#C82F2F')}
              eventHandlers={{ click: () => onSelect && onSelect(r) }}
              zIndexOffset={isSelected ? 1000 : 0}
            >
              <Popup>
                <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 140 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{r.cuisine} · {r.borough}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    <span style={{ color: '#FFD700' }}>{'★'.repeat(Math.round(r.stars || 0))}</span>
                    {' '}{r.stars}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
});

export default MapView;
