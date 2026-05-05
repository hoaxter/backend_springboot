import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';
import { connectWebSocket, subscribe, unsubscribe } from '../services/websocket';
import { getRoute, reverseGeocode } from '../services/routing';

const greenIcon = new L.Icon({ iconUrl:'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png', shadowUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png', iconSize:[25,41], iconAnchor:[12,41], popupAnchor:[1,-34] });
const redIcon = new L.Icon({ iconUrl:'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png', shadowUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png', iconSize:[25,41], iconAnchor:[12,41], popupAnchor:[1,-34] });
const carIcon = new L.DivIcon({ html:'<div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">🚗</div>', className:'', iconSize:[32,32], iconAnchor:[16,16] });

function MapClickHandler({ onMapClick, clickMode }) {
  useMapEvents({ click(e) { if(clickMode) onMapClick(e.latlng); } });
  return null;
}

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => { if(bounds && bounds.length >= 2) map.fitBounds(bounds, {padding:[50,50]}); }, [bounds]);
  return null;
}

export default function RiderDashboard({ onLogout }) {
  const user = JSON.parse(localStorage.getItem('user'));
  const nav = useNavigate();
  const [view, setView] = useState('booking');
  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);
  const [pickupAddr, setPickupAddr] = useState('');
  const [dropAddr, setDropAddr] = useState('');
  const [clickMode, setClickMode] = useState(null);
  const [fareEstimate, setFareEstimate] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [currentRide, setCurrentRide] = useState(null);
  const [driverLoc, setDriverLoc] = useState(null);
  const [driverRouteCoords, setDriverRouteCoords] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [rating, setRating] = useState(0);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bounds, setBounds] = useState(null);

  useEffect(() => {
    api.get('/ride/active').then(({data}) => {
      if (data.id) {
        setCurrentRide(data);
        setView(data.status==='COMPLETED'?'summary':'tracking');
        if(data.driverLat) setDriverLoc({lat:data.driverLat,lng:data.driverLng});
        getRoute(data.pickupLat,data.pickupLng,data.dropLat,data.dropLng).then(r=>{if(r) setRouteCoords(r.coordinates);});
      }
    }).catch(()=>{});
    api.get('/driver/online').then(({data})=>setDrivers(data)).catch(()=>{});
  }, []);

  useEffect(() => {
    if (!currentRide?.id) return;
    connectWebSocket(() => {
      subscribe(`/topic/ride/${currentRide.id}`, (msg) => {
        if (msg.type === 'DRIVER_LOCATION') {
          setDriverLoc({ lat: msg.latitude, lng: msg.longitude });
        } else if (msg.type === 'RIDE_ACCEPTED') {
          setCurrentRide(msg.ride); setView('tracking');
        } else if (msg.type === 'RIDE_STARTED') {
          setCurrentRide(msg.ride);
        } else if (msg.type === 'RIDE_COMPLETED') {
          setCurrentRide(msg.ride); setView('summary');
        } else if (msg.type === 'RIDE_CANCELLED') {
          setCurrentRide(null); setView('booking'); setRouteCoords([]);
        }
      });
    });
    return () => unsubscribe(`/topic/ride/${currentRide.id}`);
  }, [currentRide?.id]);

  // Fetch driver-to-pickup route when driver location updates
  useEffect(() => {
    if (!driverLoc || !currentRide) return;
    const target = currentRide.status === 'STARTED' ? {lat:currentRide.dropLat,lng:currentRide.dropLng} : {lat:currentRide.pickupLat,lng:currentRide.pickupLng};
    getRoute(driverLoc.lat, driverLoc.lng, target.lat, target.lng).then(r => {
      if(r) setDriverRouteCoords(r.coordinates);
    });
  }, [driverLoc?.lat, driverLoc?.lng]);

  useEffect(() => {
    if (!currentRide?.id || view === 'summary') return;
    const iv = setInterval(() => {
      api.get(`/ride/${currentRide.id}`).then(({data}) => {
        setCurrentRide(data);
        if (data.driverLat) setDriverLoc({lat:data.driverLat, lng:data.driverLng});
        if (data.status === 'COMPLETED') setView('summary');
      }).catch(()=>{});
    }, 3000);
    return () => clearInterval(iv);
  }, [currentRide?.id, view]);

  const handleMapClick = async (latlng) => {
    if (clickMode === 'pickup') {
      setPickup(latlng); setClickMode(null);
      const addr = await reverseGeocode(latlng.lat, latlng.lng);
      setPickupAddr(addr);
    } else if (clickMode === 'drop') {
      setDrop(latlng); setClickMode(null);
      const addr = await reverseGeocode(latlng.lat, latlng.lng);
      setDropAddr(addr);
    }
  };

  // Fetch road route and fare when both locations are set
  useEffect(() => {
    if (!pickup || !drop) return;
    setLoading(true);
    getRoute(pickup.lat, pickup.lng, drop.lat, drop.lng).then(routeData => {
      if (routeData) {
        setRouteCoords(routeData.coordinates);
        setBounds([routeData.coordinates[0], routeData.coordinates[routeData.coordinates.length-1]]);
        setFareEstimate({
          distanceKm: routeData.distance,
          durationMinutes: routeData.duration,
          estimatedFare: Math.round((25 + routeData.distance*10 + routeData.duration*2) * 100) / 100,
          baseFare: 25, surgeMultiplier: 1.0,
          distanceCharge: Math.round(routeData.distance*10*100)/100,
          timeCharge: Math.round(routeData.duration*2*100)/100
        });
      }
      setLoading(false);
    });
  }, [pickup, drop]);

  const bookRide = async () => {
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/ride/request', {
        pickupLat:pickup.lat, pickupLng:pickup.lng, pickupAddress: pickupAddr || `${pickup.lat.toFixed(4)}, ${pickup.lng.toFixed(4)}`,
        dropLat:drop.lat, dropLng:drop.lng, dropAddress: dropAddr || `${drop.lat.toFixed(4)}, ${drop.lng.toFixed(4)}`
      });
      setCurrentRide(data); setView('tracking');
    } catch (e) { setError(e.response?.data?.error || 'Booking failed'); }
    finally { setLoading(false); }
  };

  const cancelRide = async () => {
    try { await api.post(`/ride/${currentRide.id}/cancel`); } catch(e) {}
    setCurrentRide(null); setView('booking'); setPickup(null); setDrop(null); setFareEstimate(null); setRouteCoords([]); setDriverRouteCoords([]);
  };

  const submitRating = async () => {
    try { await api.post(`/ride/${currentRide.id}/rate`, { rating }); } catch(e) {}
    setCurrentRide(null); setView('booking'); setPickup(null); setDrop(null); setFareEstimate(null); setRating(0); setRouteCoords([]); setDriverRouteCoords([]);
  };

  const loadHistory = async () => { const { data } = await api.get('/ride/history'); setHistory(data); setView('history'); };
  const logout = () => { localStorage.clear(); onLogout(); nav('/login'); };
  const center = pickup || { lat: 12.9716, lng: 77.5946 };

  return (
    <div>
      <div className="navbar">
        <div className="navbar-brand"><span>Ride</span>Book</div>
        <div className="navbar-right">
          <span className="navbar-wallet">₹{user.walletBalance?.toFixed(0)}</span>
          <span className="navbar-user">{user.name}</span>
          <button className="btn btn-outline" style={{padding:'6px 14px',fontSize:12}} onClick={loadHistory}>History</button>
          <button className="btn btn-outline" style={{padding:'6px 14px',fontSize:12}} onClick={logout}>Logout</button>
        </div>
      </div>
      <div className="app-layout">
        <div className="sidebar">
          {error && <div className="alert alert-error">{error}</div>}

          {view === 'booking' && <>
            <h3 style={{fontFamily:'Outfit',fontSize:20}}>Book a Ride</h3>
            <div className="section-title">Set Locations on Map</div>
            <div style={{display:'flex',gap:8}}>
              <button className={`btn ${clickMode==='pickup'?'btn-success':'btn-outline'}`} style={{flex:1,fontSize:12}} onClick={()=>setClickMode('pickup')}>
                {pickup ? '✓ Pickup Set' : '📍 Set Pickup'}
              </button>
              <button className={`btn ${clickMode==='drop'?'btn-danger':'btn-outline'}`} style={{flex:1,fontSize:12}} onClick={()=>setClickMode('drop')}>
                {drop ? '✓ Drop Set' : '📍 Set Drop'}
              </button>
            </div>
            {clickMode && <div className="alert alert-success" style={{marginTop:8}}>Click on the map to set {clickMode} location</div>}

            {pickup && drop && <div className="glass" style={{padding:16}}>
              <div className="location-line">
                <div className="location-dots"><div className="dot-green"/><div className="dot-line"/><div className="dot-red"/></div>
                <div className="location-texts">
                  <div className="loc-label">Pickup</div>
                  <div className="loc-text">{pickupAddr || `${pickup.lat.toFixed(4)}, ${pickup.lng.toFixed(4)}`}</div>
                  <div className="loc-label">Drop-off</div>
                  <div className="loc-text">{dropAddr || `${drop.lat.toFixed(4)}, ${drop.lng.toFixed(4)}`}</div>
                </div>
              </div>
            </div>}

            {fareEstimate && <div className="fare-box glass">
              <div className="section-title">Fare Estimate</div>
              <div className="fare-amount">₹{fareEstimate.estimatedFare}</div>
              <div className="fare-breakdown">
                <div className="fare-item"><div className="fare-item-label">Distance</div><div className="fare-item-value">{fareEstimate.distanceKm} km</div></div>
                <div className="fare-item"><div className="fare-item-label">Duration</div><div className="fare-item-value">{fareEstimate.durationMinutes} min</div></div>
                <div className="fare-item"><div className="fare-item-label">Base Fare</div><div className="fare-item-value">₹{fareEstimate.baseFare}</div></div>
                <div className="fare-item"><div className="fare-item-label">Surge</div><div className="fare-item-value">{fareEstimate.surgeMultiplier}x</div></div>
              </div>
              <button className="btn btn-primary btn-block" style={{marginTop:16}} onClick={bookRide} disabled={loading}>
                {loading ? 'Finding Driver...' : '🚗 Book Now'}
              </button>
            </div>}
          </>}

          {view === 'tracking' && currentRide && <>
            <h3 style={{fontFamily:'Outfit',fontSize:20}}>
              {currentRide.status === 'REQUESTED' && '🔍 Finding Driver...'}
              {currentRide.status === 'ACCEPTED' && '🚗 Driver On the Way'}
              {currentRide.status === 'DRIVER_ARRIVING' && '🚗 Driver Arriving'}
              {currentRide.status === 'STARTED' && '🛣️ Trip In Progress'}
            </h3>
            {currentRide.status === 'REQUESTED' && <div className="pulse" style={{textAlign:'center',color:'var(--text-secondary)',padding:20}}>Looking for nearby drivers...</div>}
            {currentRide.driverName && <div className="driver-info-card glass">
              <div className="driver-avatar">{currentRide.driverName[0]}</div>
              <div className="driver-details">
                <h4>{currentRide.driverName}</h4>
                <p>{currentRide.vehicleType} • {currentRide.vehicleNumber}</p>
                <p>⭐ {currentRide.driverRating?.toFixed(1)} • {currentRide.driverPhone}</p>
              </div>
            </div>}
            <div className="glass" style={{padding:16}}>
              <div className="location-line">
                <div className="location-dots"><div className="dot-green"/><div className="dot-line"/><div className="dot-red"/></div>
                <div className="location-texts">
                  <div className="loc-label">Pickup</div><div className="loc-text">{currentRide.pickupAddress || 'Pickup'}</div>
                  <div className="loc-label">Drop-off</div><div className="loc-text">{currentRide.dropAddress || 'Drop'}</div>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:12,fontSize:13}}>
                <span style={{color:'var(--text-secondary)'}}>Est. Fare</span><span style={{fontWeight:700}}>₹{currentRide.estimatedFare}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                <span style={{color:'var(--text-secondary)'}}>Distance</span><span>{currentRide.distanceKm} km</span>
              </div>
              <div className="badge badge-status" style={{marginTop:8}}>{currentRide.status.replace('_',' ')}</div>
            </div>
            <button className="btn btn-danger btn-block" onClick={cancelRide}>Cancel Ride</button>
          </>}

          {view === 'summary' && currentRide && <>
            <h3 style={{fontFamily:'Outfit',fontSize:20}}>🎉 Trip Completed!</h3>
            <div className="fare-box glass">
              <div className="section-title">Total Fare</div>
              <div className="fare-amount">₹{currentRide.fare || currentRide.estimatedFare}</div>
              <div className="fare-breakdown">
                <div className="fare-item"><div className="fare-item-label">Distance</div><div className="fare-item-value">{currentRide.distanceKm} km</div></div>
                <div className="fare-item"><div className="fare-item-label">Duration</div><div className="fare-item-value">{currentRide.durationMinutes} min</div></div>
              </div>
            </div>
            {currentRide.driverName && <div className="driver-info-card glass">
              <div className="driver-avatar">{currentRide.driverName[0]}</div>
              <div className="driver-details"><h4>{currentRide.driverName}</h4><p>{currentRide.vehicleType} • {currentRide.vehicleNumber}</p></div>
            </div>}
            <div className="glass" style={{padding:20,textAlign:'center'}}>
              <div className="section-title">Rate your driver</div>
              <div className="rating" style={{justifyContent:'center',margin:'12px 0'}}>
                {[1,2,3,4,5].map(s=><span key={s} className={`star ${s<=rating?'filled':''}`} onClick={()=>setRating(s)}>★</span>)}
              </div>
              <button className="btn btn-primary btn-block" onClick={submitRating} disabled={!rating}>Submit Rating</button>
            </div>
          </>}

          {view === 'history' && <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h3 style={{fontFamily:'Outfit',fontSize:20}}>Ride History</h3>
              <button className="btn btn-outline" style={{padding:'6px 12px',fontSize:12}} onClick={()=>setView('booking')}>← Back</button>
            </div>
            <div className="history-list">
              {history.length === 0 && <p style={{color:'var(--text-secondary)',fontSize:13}}>No rides yet</p>}
              {history.map(r=>(
                <div key={r.id} className="ride-card glass">
                  <div className="ride-card-header">
                    <span className="ride-card-title">Ride #{r.id}</span>
                    <span className={`badge ${r.status==='COMPLETED'?'badge-online':'badge-status'}`}>{r.status}</span>
                  </div>
                  <div className="ride-card-body">
                    <div className="ride-card-row"><span>Fare</span><span>₹{r.fare||r.estimatedFare||'-'}</span></div>
                    <div className="ride-card-row"><span>Distance</span><span>{r.distanceKm} km</span></div>
                    <div className="ride-card-row"><span>Driver</span><span>{r.driverName||'N/A'}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </>}
        </div>

        <div className="map-container">
          {clickMode && <div className="map-overlay glass" style={{background:'rgba(99,102,241,0.9)',color:'#fff',fontWeight:600,fontSize:13}}>📍 Click on map to set {clickMode} location</div>}
          <MapContainer center={[center.lat, center.lng]} zoom={14} style={{height:'100%',width:'100%'}}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            <MapClickHandler onMapClick={handleMapClick} clickMode={clickMode} />
            {bounds && <FitBounds bounds={bounds} />}
            {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={greenIcon}><Popup>📍 Pickup</Popup></Marker>}
            {drop && <Marker position={[drop.lat, drop.lng]} icon={redIcon}><Popup>🏁 Drop-off</Popup></Marker>}
            {/* Road route polyline */}
            {routeCoords.length > 0 && <Polyline positions={routeCoords} color="#6366f1" weight={5} opacity={0.8} />}
            {/* Driver route polyline */}
            {driverRouteCoords.length > 0 && <Polyline positions={driverRouteCoords} color="#22c55e" weight={4} opacity={0.7} dashArray="8" />}
            {driverLoc && <Marker position={[driverLoc.lat, driverLoc.lng]} icon={carIcon}><Popup>🚗 Your Driver</Popup></Marker>}
            {view === 'booking' && drivers.map(d=> d.latitude && <Marker key={d.driverId} position={[d.latitude, d.longitude]} icon={carIcon}><Popup>{d.name} • {d.vehicleType}<br/>⭐ {d.rating?.toFixed(1)}</Popup></Marker>)}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
