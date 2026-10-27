import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const CENTRO = [19.8933, -100.4433]; // Maravatío, Mich.
const icono = L.divIcon({ className: "pn-pin", html: "<span>1</span>", iconSize: [38, 38], iconAnchor: [19, 38] });

// Mapa con un marcador arrastrable. Emite (lat, lng) con 6 decimales.
export default function MapaPicker({ lat, lng, onChange }) {
  const el = useRef(null), marcador = useRef(null), mapa = useRef(null), cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    const ini = lat && lng ? [lat, lng] : CENTRO;
    const m = L.map(el.current, { scrollWheelZoom: false }).setView(ini, 16);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(m);
    const mk = L.marker(ini, { draggable: true, icon: icono, keyboard: true, title: "Arrastra para ajustar la ubicación" }).addTo(m);
    const emitir = (p) => cb.current(+p.lat.toFixed(6), +p.lng.toFixed(6));
    mk.on("dragend", () => emitir(mk.getLatLng()));
    m.on("click", (e) => { mk.setLatLng(e.latlng); emitir(e.latlng); });
    mapa.current = m; marcador.current = mk;
    setTimeout(() => m.invalidateSize(), 100);
    return () => m.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si cambian las coordenadas desde fuera (p. ej. al cargar el negocio), mover el marcador
  useEffect(() => {
    if (lat && lng && marcador.current) { marcador.current.setLatLng([lat, lng]); mapa.current.setView([lat, lng]); }
  }, [lat, lng]);

  return <div ref={el} className="pn-mapa" role="application" aria-label="Mapa para ajustar la ubicación del negocio" />;
}
