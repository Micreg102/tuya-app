import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Thermometer, Droplets, Siren, ShieldCheck,
    Wifi, WifiOff, Loader2, Battery, BatteryLow, BatteryMedium, BatteryFull
} from 'lucide-react';
import '../App.css';

// Dodajemy prop 'initialData'
const DeviceCard = ({ deviceId, initialData }) => {
    // Jeśli mamy dane od rodzica (Dashboard), użyjmy ich na start
    const [data, setData] = useState(initialData || null);

    const getStatus = (code) => {
        if (!data || !data.status) return null;
        const item = data.status.find(s => s.code === code);
        if (!item) return null;

        // Konwersja dla temperatury (backend często zwraca wartość pomnożoną przez 10)
        if (code.includes('temp')) return (item.value / 10).toFixed(1);
        return item.value;
    };

    useEffect(() => {
        // Funkcja do odświeżania danych (używana przez WebSocket)
        const fetchData = () => {
            if (deviceId.startsWith('test-sim')) return;
            axios.get(`http://localhost:8080/devices/${deviceId}`)
                .then(res => setData(res.data))
                .catch(err => console.error("Błąd:", err));
        };

        // Jeśli NIE otrzymaliśmy initialData, pobierzmy dane sami na starcie
        if (!initialData) {
            fetchData();
        }

        const handleWsUpdate = (event) => {
            if (event.detail.deviceId === deviceId) {
                // Jeśli WebSocket sygnalizuje zmianę w tym urządzeniu - odśwież
                fetchData();
            }
        };

        window.addEventListener('tuyaUpdate', handleWsUpdate);
        return () => window.removeEventListener('tuyaUpdate', handleWsUpdate);
    }, [deviceId, initialData]);

    if (!data) return <div className="card loading"><Loader2 className="spin" /></div>;

    // --- LOGIKA KATEGORII (musi być spójna z Dashboard.js) ---
    const isTHSensor = data.category === 'wsdcg';
    const isSmokeSensor = data.category === 'sensor' || data.category === 'cs';

    const temp = getStatus('va_temperature') || getStatus('temp_current');
    const hum = getStatus('va_humidity') || getStatus('humidity_value');
    const battery = getStatus('battery_percentage');

    // Logika alarmu dymu
    const statusVal = getStatus('smoke_sensor_status');
    const smokeAlarm = statusVal === 'alarm' || statusVal === '1';
    const smokeValue = getStatus('smoke_sensor_value');

    const renderBattery = (pct) => {
        if (pct === null || pct === undefined) return null;
        let Icon = BatteryFull;
        let color = "#10b981";
        if (pct <= 20) { Icon = BatteryLow; color = "#ef4444"; }
        else if (pct <= 60) { Icon = BatteryMedium; color = "#f59e0b"; }
        return (
            <div className="battery-box">
                <Icon size={14} color={color} />
                <span style={{ color: color }}>{pct}%</span>
            </div>
        );
    };

    return (
        <div className={`card ${smokeAlarm ? 'smoke-alarm-bg' : isSmokeSensor ? 'smoke-normal-bg' : 'standard-card'} ${!data.online ? 'offline' : ''}`}>
            <div className="card-header">
                <span className="device-name">{data.name}</span>
                <div className="header-icons">
                    {renderBattery(battery)}
                    {data.online ? <Wifi size={14} color="#10b981"/> : <WifiOff size={14} color="#ef4444" />}
                </div>
            </div>

            <div className="smoke-content">
                {isSmokeSensor ? (
                    <>
                        {smokeAlarm ? (
                            <>
                                <Siren size={48} className="alarm-icon pulse-animation" />
                                <div className="alarm-text">ALARM!</div>
                            </>
                        ) : (
                            <>
                                <ShieldCheck size={48} className="normal-icon" />
                                <div className="normal-text">OK</div>
                            </>
                        )}
                        {/* Wyświetlamy wartość z sensora jeśli istnieje, w przeciwnym razie stan */}
                        <div className="smoke-value-badge">
                            {smokeValue ? `Poziom: ${smokeValue}` : (statusVal || 'Czuwanie')}
                        </div>
                    </>
                ) : (
                    <div className="th-readings">
                        {temp !== null && (
                            <div className="reading main-val">
                                <Thermometer size={28} color="#ef4444" />
                                <span>{temp}°C</span>
                            </div>
                        )}
                        {hum !== null && (
                            <div className="reading sub-val">
                                <Droplets size={18} color="#3b82f6" />
                                <span>{hum}%</span>
                            </div>
                        )}
                        {/* Fallback dla innych urządzeń (np. gniazdka) */}
                        {!temp && !hum && (
                            <div className="no-data">
                                {data.productName}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="model-footer">{data.productName || data.model}</div>
        </div>
    );
};

export default DeviceCard;