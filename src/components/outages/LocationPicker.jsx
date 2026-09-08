import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// แก้ปัญหา default marker icon ไม่โหลดใน Vite bundle
const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const SATTAHIP_CENTER = [12.6639, 100.9042] // จุดกึ่งกลางพื้นที่สัตหีบโดยประมาณ — ปรับได้ตามพื้นที่จริง

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function LocationPicker({ latitude, longitude, onChange }) {
  const position = latitude && longitude ? [latitude, longitude] : SATTAHIP_CENTER

  return (
    <div className="h-56 rounded-lg overflow-hidden border border-slate-200">
      <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onChange} />
        {latitude && longitude && <Marker position={[latitude, longitude]} icon={markerIcon} />}
      </MapContainer>
    </div>
  )
}
