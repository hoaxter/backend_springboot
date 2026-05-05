import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';
import { connectWebSocket, subscribe, unsubscribe } from '../services/websocket';
import { getRoute } from '../services/routing';

const greenIcon = new L.Icon({ iconUrl:'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png', shadowUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png', iconSize:[25,41], iconAnchor:[12,41] });
const redIcon = new L.Icon({ iconUrl:'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png', shadowUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png', iconSize:[25,41], iconAnchor:[12,41] });
const carIcon = new L.DivIcon({ html:'<div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">🚗</div>', className:'', iconSize:[32,32], iconAnchor:[16,16] });

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => { if(bounds && bounds.length >= 2) map.fitBounds(bounds, {padding:[50,50]}); }, [bounds]);
  return null;
}

export default function DriverDashboard({ onLogout }) {
  const user = JSON.parse(localStorage.getItem('user'));
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [rideRequests, setRideRequests] = useState([]);
  const [currentRide, setCurrentRide] = useState(null);
  const [view, setView] = useState('idle');
  const [timer, setTimer] = useState(15);
  const [history, setHistory] = useState([]);
  const [simPos, setSimPos] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [bounds, setBounds] = useState(null);
  const simRef = useRef(null);
  const routePointsRef = useRef([]);
  const routeIndexRef = useRef(0);

  useEffect(() => {
    api.get('/driver/profile').then(({data}) => {
      setProfile(data);
      setIsOnline(data.isOnline);
      if (data.latitude) setSimPos({lat:data.latitude, lng:data.longitude});
      else setSimPos({lat:12.9750, lng:77.6090});
    }).catch(()=>{});
    api.get('/ride/active').then(({data}) => {
      if (data.id) { setCurrentRide(data); setView('trip'); }
    }).catch(()=>{});
  }, []);

  // WebSocket for ride requests
  useEffect(() => {
    if (!isOnline) return;
    connectWebSocket(() => {
      subscribe(`/topic/driver/${user.userId}`, (msg) => {
        if (msg.type === 'NEW_RIDE_REQUEST') {
          setRideRequests(prev => {
            if (prev.find(r=>r.ride.id===msg.ride.id)) return prev;
            return [...prev, msg];
          });
          if (view === 'idle') setView('request');
        }
      });
    });
    return () => unsubscribe(`/topic/driver/${user.userId}`);
  }, [isOnline, user.userId]);

  // Poll for ride requests
  useEffect(() => {
    if (!isOnline) return;
    const iv = setInterval(() => {
      api.get('/driver/ride-requests').then(({data}) => {
        if (data.length > 0 && view === 'idle') {
          setRideRequests(data.map(r=>({ride:r, distanceToPickup: r.distanceKm})));
          setView('request');
        }
      }).catch(()=>{});
    }, 5000);
    return () => clearInterval(iv);
  }, [isOnline, view]);

  // Timer for ride request
  useEffect(() => {
    if (view !== 'request' || rideRequests.length === 0) return;
    setTimer(15);
    const iv = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { clearInterval(iv); handleReject(rideRequests[0]?.ride?.id); return 15; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [view, rideRequests.length]);

  // Fetch road route and simulate driver movement along it
  useEffect(() => {
    if (!currentRide || currentRide.status === 'COMPLETED') {
      if(simRef.current) clearInterval(simRef.current);
      return;
    }

    let targetLat, targetLng;
    if (currentRide.status === 'ACCEPTED' || currentRide.status === 'DRIVER_ARRIVING') {
      targetLat = currentRide.pickupLat; targetLng = currentRide.pickupLng;
    } else if (currentRide.status === 'STARTED') {
      targetLat = currentRide.dropLat; targetLng = currentRide.dropLng;
    } else return;

    // Fetch road route from current position to target
    if (simPos) {
      getRoute(simPos.lat, simPos.lng, targetLat, targetLng).then(routeData => {
        if (routeData && routeData.coordinates.length > 0) {
          setRouteCoords(routeData.coordinates);
          routePointsRef.current = routeData.coordinates;
          routeIndexRef.current = 0;
          setBounds([routeData.coordinates[0], routeData.coordinates[routeData.coordinates.length-1]]);
        }
      });
    }

    // Simulate movement along route points
    simRef.current = setInterval(() => {
      const pts = routePointsRef.current;
      if (pts.length === 0) return;

      routeIndexRef.current = Math.min(routeIndexRef.current + 1, pts.length - 1);
      const idx = routeIndexRef.current;
      const [newLat, newLng] = pts[idx];

      setSimPos({lat: newLat, lng: newLng});
      // Update remaining route
      setRouteCoords(pts.slice(idx));

      api.post('/driver/update-location', { latitude: newLat, longitude: newLng, rideId: currentRide.id }).catch(()=>{});
    }, 2000);

    return () => { if(simRef.current) clearInterval(simRef.current); };
  }, [currentRide?.id, currentRide?.status]);

  // Also fetch pickup-to-drop route for display
  const [tripRouteCoords, setTripRouteCoords] = useState([]);
  useEffect(() => {
    if (!currentRide) return;
    getRoute(currentRide.pickupLat, currentRide.pickupLng, currentRide.dropLat, currentRide.dropLng).then(r => {
      if(r) setTripRouteCoords(r.coordinates);
    });
  }, [currentRide?.id]);

  const toggleOnline = async () => {
    const {data} = await api.post('/driver/toggle-online');
    setIsOnline(data.isOnline);
    if (data.isOnline && simPos) {
      await api.post('/driver/update-location', { latitude:simPos.lat, longitude:simPos.lng });
    }
  };

  const handleAccept = async (rideId) => {
    try {
      const {data} = await api.post(`/driver/ride/${rideId}/accept`);
      setCurrentRide(data); setView('trip'); setRideRequests([]);
    } catch(e) { setRideRequests(prev=>prev.filter(r=>r.ride?.id!==rideId)); if(rideRequests.length<=1) setView('idle'); }
  };

  const handleReject = async (rideId) => {
    try { await api.post(`/driver/ride/${rideId}/reject`); } catch(e){}
    setRideRequests(prev=>prev.filter(r=>(r.ride?.id||r.id)!==rideId));
    if (rideRequests.length <= 1) setView('idle');
  };

  const startTrip = async () => {
    const {data} = await api.post(`/driver/ride/${currentRide.id}/start`);
    setCurrentRide(data);
    routePointsRef.current = []; routeIndexRef.current = 0; // Reset so new route fetches
  };

  const completeTrip = async () => {
    const {data} = await api.post(`/driver/ride/${currentRide.id}/complete`);
    setCurrentRide(null); setView('idle'); setRouteCoords([]); setTripRouteCoords([]);
    api.get('/driver/profile').then(({data})=>setProfile(data)).catch(()=>{});
  };

  const loadHistory = async () => { const {data} = await api.get('/ride/history'); setHistory(data); setView('history'); };
  const logout = () => { localStorage.clear(); onLogout(); nav('/login'); };
  const center = simPos || {lat:12.9716, lng:77.5946};
  const activeReq = rideRequests[0];

  return (
    <div>
      <div className="navbar">
        <div className="navbar-brand"><span>Ride</span>Book <span style={{fontSize:12,color:'var(--text-muted)',fontFamily:'Inter'}}>Driver</span></div>
        <div className="navbar-right">
          <div className="toggle-container">
            <span style={{fontSize:13,color:isOnline?'var(--green)':'var(--text-muted)',fontWeight:600}}>{isOnline?'Online':'Offline'}</span>
            <div className={`toggle ${isOnline?'active':''}`} onClick={toggleOnline}><div className="toggle-knob"/></div>
          </div>
          <span className="navbar-user">{user.name}</span>
          <button className="btn btn-outline" style={{padding:'6px 14px',fontSize:12}} onClick={loadHistory}>History</button>
          <button className="btn btn-outline" style={{padding:'6px 14px',fontSize:12}} onClick={logout}>Logout</button>
        </div>
      </div>
      <div className="app-layout">
        <div className="sidebar">
          {!isOnline && view !== 'history' && <div style={{textAlign:'center',padding:40}}>
            <div style={{fontSize:48,marginBottom:16}}>🚗</div>
            <h3 style={{fontFamily:'Outfit',marginBottom:8}}>You're Offline</h3>
            <p style={{color:'var(--text-secondary)',fontSize:13,marginBottom:16}}>Go online to start receiving ride requests</p>
            <button className="btn btn-success" onClick={toggleOnline}>Go Online</button>
          </div>}

          {isOnline && view === 'idle' && <>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <span className="badge badge-online">● Online</span>
              {profile && <span style={{fontSize:12,color:'var(--text-secondary)'}}>⭐ {profile.rating?.toFixed(1)} • {profile.totalRides} rides</span>}
            </div>
            <div style={{textAlign:'center',padding:40}}>
              <div className="pulse" style={{fontSize:48,marginBottom:16}}>📡</div>
              <h3 style={{fontFamily:'Outfit',marginBottom:8}}>Waiting for Rides</h3>
              <p style={{color:'var(--text-secondary)',fontSize:13}}>You'll be notified when a rider is nearby</p>
            </div>
            {profile && <div className="glass" style={{padding:16}}>
              <div className="section-title">Your Vehicle</div>
              <div className="ride-card-row"><span>Vehicle</span><span>{profile.vehicleType}</span></div>
              <div className="ride-card-row"><span>Number</span><span>{profile.vehicleNumber}</span></div>
              <div className="ride-card-row"><span>Earnings</span><span style={{color:'var(--green)'}}>₹{profile.walletBalance?.toFixed(0)}</span></div>
            </div>}
          </>}

          {view === 'request' && activeReq && <>
            <div className="ride-request-popup">
              <h3 style={{fontFamily:'Outfit',fontSize:20,marginBottom:4}}>🔔 New Ride Request!</h3>
              <div className="timer-bar" style={{width:`${(timer/15)*100}%`, background:timer<=5?'var(--red)':'var(--accent)'}}/>
              <p style={{fontSize:24,fontWeight:800,textAlign:'center',margin:'8px 0',color:timer<=5?'var(--red)':'var(--text-primary)'}}>{timer}s</p>
            </div>
            <div className="glass" style={{padding:16}}>
              <div className="ride-card-row"><span>Rider</span><span>{activeReq.ride?.riderName || 'Rider'}</span></div>
              <div className="ride-card-row"><span>Est. Fare</span><span style={{color:'var(--green)',fontWeight:700}}>₹{activeReq.ride?.estimatedFare}</span></div>
              <div className="ride-card-row"><span>Distance</span><span>{activeReq.ride?.distanceKm} km</span></div>
              <div className="location-line" style={{marginTop:12}}>
                <div className="location-dots"><div className="dot-green"/><div className="dot-line"/><div className="dot-red"/></div>
                <div className="location-texts">
                  <div className="loc-label">Pickup</div><div className="loc-text">{activeReq.ride?.pickupAddress || 'Pickup'}</div>
                  <div className="loc-label">Drop-off</div><div className="loc-text">{activeReq.ride?.dropAddress || 'Drop'}</div>
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-success" style={{flex:1}} onClick={()=>handleAccept(activeReq.ride?.id || activeReq.id)}>✓ Accept</button>
              <button className="btn btn-danger" style={{flex:1}} onClick={()=>handleReject(activeReq.ride?.id || activeReq.id)}>✗ Reject</button>
            </div>
          </>}

          {view === 'trip' && currentRide && <>
            <h3 style={{fontFamily:'Outfit',fontSize:20}}>
              {currentRide.status === 'ACCEPTED' && '🚗 Head to Pickup'}
              {currentRide.status === 'DRIVER_ARRIVING' && '🚗 Arriving at Pickup'}
              {currentRide.status === 'STARTED' && '🛣️ Trip In Progress'}
            </h3>
            <div className="glass" style={{padding:16}}>
              <div className="ride-card-row"><span>Rider</span><span>{currentRide.riderName}</span></div>
              <div className="ride-card-row"><span>Est. Fare</span><span style={{color:'var(--green)',fontWeight:700}}>₹{currentRide.estimatedFare}</span></div>
              <div className="ride-card-row"><span>Distance</span><span>{currentRide.distanceKm} km</span></div>
              <div className="location-line" style={{marginTop:12}}>
                <div className="location-dots"><div className="dot-green"/><div className="dot-line"/><div className="dot-red"/></div>
                <div className="location-texts">
                  <div className="loc-label">Pickup</div><div className="loc-text">{currentRide.pickupAddress || 'Pickup'}</div>
                  <div className="loc-label">Drop-off</div><div className="loc-text">{currentRide.dropAddress || 'Drop'}</div>
                </div>
              </div>
              <div className="badge badge-status" style={{marginTop:8}}>{currentRide.status.replace('_',' ')}</div>
            </div>
            {(currentRide.status === 'ACCEPTED' || currentRide.status === 'DRIVER_ARRIVING') && (
              <button className="btn btn-success btn-block" onClick={startTrip}>▶ Start Trip</button>
            )}
            {currentRide.status === 'STARTED' && (
              <button className="btn btn-primary btn-block" onClick={completeTrip}>✓ Complete Trip</button>
            )}
          </>}

          {view === 'history' && <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h3 style={{fontFamily:'Outfit',fontSize:20}}>Trip History</h3>
              <button className="btn btn-outline" style={{padding:'6px 12px',fontSize:12}} onClick={()=>setView(isOnline?'idle':'idle')}>← Back</button>
            </div>
            <div className="history-list">
              {history.length===0 && <p style={{color:'var(--text-secondary)',fontSize:13}}>No trips yet</p>}
              {history.map(r=>(
                <div key={r.id} className="ride-card glass">
                  <div className="ride-card-header">
                    <span className="ride-card-title">Trip #{r.id}</span>
                    <span className={`badge ${r.status==='COMPLETED'?'badge-online':'badge-status'}`}>{r.status}</span>
                  </div>
                  <div className="ride-card-body">
                    <div className="ride-card-row"><span>Fare</span><span style={{color:'var(--green)'}}>₹{r.fare||r.estimatedFare||'-'}</span></div>
                    <div className="ride-card-row"><span>Distance</span><span>{r.distanceKm} km</span></div>
                    <div className="ride-card-row"><span>Rider</span><span>{r.riderName}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </>}
        </div>

        <div className="map-container">
          <MapContainer center={[center.lat, center.lng]} zoom={14} style={{height:'100%',width:'100%'}}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            {bounds && <FitBounds bounds={bounds} />}
            {simPos && <Marker position={[simPos.lat, simPos.lng]} icon={carIcon}><Popup>📍 You are here</Popup></Marker>}
            {/* Driver-to-target route (green dashed) */}
            {routeCoords.length > 0 && <Polyline positions={routeCoords} color="#22c55e" weight={4} opacity={0.8} dashArray="8" />}
            {/* Pickup-to-drop route (purple solid) */}
            {tripRouteCoords.length > 0 && <Polyline positions={tripRouteCoords} color="#6366f1" weight={5} opacity={0.7} />}
            {currentRide && <>
              <Marker position={[currentRide.pickupLat, currentRide.pickupLng]} icon={greenIcon}><Popup>📍 Pickup</Popup></Marker>
              <Marker position={[currentRide.dropLat, currentRide.dropLng]} icon={redIcon}><Popup>🏁 Drop-off</Popup></Marker>
            </>}
            {view === 'request' && activeReq?.ride && <>
              <Marker position={[activeReq.ride.pickupLat, activeReq.ride.pickupLng]} icon={greenIcon}><Popup>📍 Pickup</Popup></Marker>
              <Marker position={[activeReq.ride.dropLat, activeReq.ride.dropLng]} icon={redIcon}><Popup>🏁 Drop-off</Popup></Marker>
            </>}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
