'use client';
import { useState, useEffect } from 'react';

// Classic sunrise/sunset equation (US Naval Observatory almanac method).
function calcSunUTC(date, lat, lng, isSunrise) {
  const rad = Math.PI / 180;
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start) / 86400000);
  const zenith = 90.833;
  const lngHour = lng / 15;

  const t = dayOfYear + ((isSunrise ? 6 : 18) - lngHour) / 24;
  const M = (0.9856 * t) - 3.289;
  let L = M + (1.916 * Math.sin(M * rad)) + (0.020 * Math.sin(2 * M * rad)) + 282.634;
  L = (L + 360) % 360;
  let RA = (1 / rad) * Math.atan(0.91764 * Math.tan(L * rad));
  RA = (RA + 360) % 360;
  const Lquadrant = Math.floor(L / 90) * 90;
  const RAquadrant = Math.floor(RA / 90) * 90;
  RA = (RA + (Lquadrant - RAquadrant)) / 15;
  const sinDec = 0.39782 * Math.sin(L * rad);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(zenith * rad) - (sinDec * Math.sin(lat * rad))) / (cosDec * Math.cos(lat * rad));
  if (cosH > 1 || cosH < -1) return null;
  let H = isSunrise ? 360 - (1 / rad) * Math.acos(cosH) : (1 / rad) * Math.acos(cosH);
  H = H / 15;
  const T = H + RA - (0.06571 * t) - 6.622;
  let UT = T - lngHour;
  UT = (UT + 24) % 24;
  return UT;
}

function utcHoursToLocalString(date, utcHours) {
  if (utcHours === null) return '—';
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCMinutes(d.getUTCMinutes() + utcHours * 60);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function SunriseSunsetWidget() {
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState('idle');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  function useMyLocation() {
    if (!navigator.geolocation) { setStatus('denied'); return; }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setStatus('ok'); },
      () => setStatus('denied'),
      { timeout: 8000 }
    );
  }

  useEffect(() => { useMyLocation(); }, []);

  function useManual() {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) { setCoords({ lat, lng }); setStatus('ok'); }
  }

  const today = new Date();
  const sunrise = coords ? utcHoursToLocalString(today, calcSunUTC(today, coords.lat, coords.lng, true)) : null;
  const sunset = coords ? utcHoursToLocalString(today, calcSunUTC(today, coords.lat, coords.lng, false)) : null;

  return (
    <div className="widget-box">
      {status === 'ok' && coords ? (
        <>
          <div className="widget-sun-row">
            <div className="widget-sun-stat">
              <div className="widget-sun-stat-val">{sunrise}</div>
              <div className="widget-sun-stat-label">Sunrise</div>
            </div>
            <div className="widget-sun-stat">
              <div className="widget-sun-stat-val">{sunset}</div>
              <div className="widget-sun-stat-label">Sunset</div>
            </div>
          </div>
          <div className="widget-hint">Based on your current location.</div>
        </>
      ) : status === 'locating' ? (
        <div className="widget-empty">Finding your location...</div>
      ) : (
        <>
          <div className="widget-empty">Couldn&rsquo;t access your location — enter coordinates manually, or allow location access.</div>
          <div className="widget-row">
            <input type="number" className="widget-input" placeholder="Latitude" value={manualLat} onChange={(e) => setManualLat(e.target.value)} />
            <input type="number" className="widget-input" placeholder="Longitude" value={manualLng} onChange={(e) => setManualLng(e.target.value)} />
          </div>
          <div className="widget-row" style={{ marginTop: 10 }}>
            <button type="button" className="widget-btn" onClick={useManual}>Use these coordinates</button>
            <button type="button" className="widget-btn-ghost" onClick={useMyLocation}>Try location again</button>
          </div>
        </>
      )}
    </div>
  );
}
