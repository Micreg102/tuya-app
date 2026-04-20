import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import {
    Thermometer, Droplets, Siren, ShieldCheck,
    Wifi, WifiOff, Loader2, Battery, BatteryLow, BatteryMedium, BatteryFull
} from 'lucide-react';
import { WebSocketContext } from '../WebSocketContext';
import '../App.css';

const DeviceCard = ({ deviceId, initialData }) => {
    const [data, setData] = useState(initialData || null);

    // Podpinamy się pod wiadomości z WebSocketu
    const wsUpdateData = useContext(WebSocketContext);

    // FUNKCJA POMOCNICZA: Pobieranie konkretnego parametru z obiektu urządzenia
    const getStatus = (code) => {
        if (!data || !data.status) return null;
        const item = data.status.find(s => s.code === code);
        if (!item) return null;

        // Konwersja dla temperatury (backend często zwraca wartość pomnożoną przez 10)
        if (code.includes('temp')) return (item.value / 10).toFixed(1);
        return item.value;
    };

    // PIERWSZY useEffect: Pobranie danych startowych po HTTP (tylko raz)
    useEffect(() => {
        if (!initialData && !deviceId.startsWith('test-sim')) {
            axios.get(`http://localhost:8080/devices/${deviceId}`)
                .then(res => setData(res.data))
                .catch(err => console.error("Błąd pobierania urządzenia:", err));
        }
    }, [deviceId, initialData]);

    // DRUGI useEffect: Reagowanie na zmiany z WebSocketu na żywo
    useEffect(() => {
        if (!wsUpdateData || wsUpdateData.devId !== deviceId) {
            return;
        }

        setData(prevData => {
            if (!prevData) return prevData;

            let newState = { ...prevData };

            // Rozpoczynamy blok logowania dla tego pakietu
            console.log(`\n--- OTRZYMANO PAKIET: ${prevData.name || deviceId} ---`);

            // Logowanie typu komunikatu (bizCode, np. "online", "offline" lub brak przy zwykłych danych)
            if (wsUpdateData.bizCode) {
                console.log(`Typ komunikatu (bizCode): ${wsUpdateData.bizCode}`);
            }

            // 1. Logowanie i zmiana statusu sieciowego
            if (wsUpdateData.bizCode === 'online') {
                if (!prevData.online) console.log(`Status sieci: ZMIANA z OFFLINE na ONLINE`);
                else console.log(`Status sieci: POTWIERDZONO ONLINE (bez zmian)`);
                newState.online = true;
            } else if (wsUpdateData.bizCode === 'offline') {
                if (prevData.online) console.log(`Status sieci: ZMIANA z ONLINE na OFFLINE`);
                else console.log(`Status sieci: POTWIERDZONO OFFLINE (bez zmian)`);
                newState.online = false;
            }

            // Wymuszenie statusu online, gdy przyjdą jakiekolwiek dane
            if ((wsUpdateData.status && wsUpdateData.status.length > 0) ||
                (wsUpdateData.properties && wsUpdateData.properties.length > 0)) {
                if (!newState.online) {
                    console.log(`Status sieci: WYBUDZENIE z OFFLINE na ONLINE (otrzymano dane)`);
                    newState.online = true;
                }
            }

            // 2. Aktualizacja i logowanie parametrów (np. temperatura, bateria)
            let newStatus = [...(newState.status || [])];
            const incomingUpdates = wsUpdateData.status || wsUpdateData.properties || [];

            if (incomingUpdates.length === 0) {
                console.log(`Parametry: Brak danych z sensorów w tym pakiecie.`);
            } else {
                console.log(`Parametry odebrane w pakiecie:`);
                incomingUpdates.forEach(incomingItem => {
                    const index = newStatus.findIndex(s => s.code === incomingItem.code);

                    if (index !== -1) {
                        const oldValue = newStatus[index].value;
                        if (oldValue !== incomingItem.value) {
                            console.log(`  -> ZMIANA: [${incomingItem.code}] ${oldValue} ---> ${incomingItem.value}`);
                        } else {
                            console.log(`  -> BEZ ZMIAN: [${incomingItem.code}] wynosi nadal ${oldValue}`);
                        }
                        newStatus[index].value = incomingItem.value;
                    } else {
                        console.log(`  -> NOWY: [${incomingItem.code}] dodano do kafelka z wartoscia ${incomingItem.value}`);
                        newStatus.push(incomingItem);
                    }
                });
            }

            console.log(`------------------------------------------------------\n`);

            newState.status = newStatus;
            return newState;
        });

    }, [wsUpdateData, deviceId]);

    if (!data) return <div className="card loading"><Loader2 className="spin" /></div>;

    // --- LOGIKA KATEGORII ---
    const isTHSensor = data.category === 'wsdcg';
    const isSmokeSensor = data.category === 'sensor' || data.category === 'cs';

    const temp = getStatus('va_temperature') || getStatus('temp_current');
    const hum = getStatus('va_humidity') || getStatus('humidity_value');
    const battery = getStatus('battery_percentage');

    const statusVal = getStatus('smoke_sensor_status');
    const smokeAlarm = statusVal === 'alarm' || statusVal === '1';
    const smokeValue = getStatus('smoke_sensor_value');

    // FUNKCJA POMOCNICZA: Renderowanie ikony baterii
    const renderBattery = (pct) => {
        if (pct === null || pct === undefined) return null;
        let Icon = BatteryFull;
        let color = "#10b981"; // Zielony
        if (pct <= 20) { Icon = BatteryLow; color = "#ef4444"; } // Czerwony
        else if (pct <= 60) { Icon = BatteryMedium; color = "#f59e0b"; } // Pomarańczowy
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