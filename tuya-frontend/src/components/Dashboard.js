import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import DeviceCard from './DeviceCard';
import devicesConfig from '../devices.json';
import { Thermometer, Flame, Grid, Loader2, Bug } from 'lucide-react'; // Dodałem ikonę Bug dla testu

const Dashboard = () => {
    const [devices, setDevices] = useState([]);
    const [activeTab, setActiveTab] = useState('temp'); // Domyślnie dym, żebyś od razu widział efekt
    const [loading, setLoading] = useState(true);

    // NOWY STAN: Tryb testowy
    const [testMode, setTestMode] = useState(false);

    useEffect(() => {
        const fetchAllDevicesDetails = async () => {
            const ids = devicesConfig.deviceIds;
            try {
                const requests = ids.map(id =>
                    axios.get(`http://localhost:8080/devices/${id}`)
                        .then(res => res.data)
                        .catch(err => null)
                );
                const results = await Promise.all(requests);
                const validDevices = results.filter(device => device !== null);
                setDevices(validDevices);
            } catch (error) {
                console.error("Błąd ogólny:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllDevicesDetails();
    }, []);

    // --- DEFINICJA FAŁSZYWEGO CZUJNIKA ---
    const testDevice = {
        id: 'test-sim-001', // Specjalne ID
        name: 'TEST: KUCHNIA',
        category: 'sensor',
        productName: 'Symulator Pożaru',
        online: true,
        status: [
            { code: 'smoke_sensor_status', value: 'alarm' }, // Kluczowe: ALARM
            { code: 'battery_percentage', value: 88 }
        ]
    };

    const tempDevices = devices.filter(d => d.category === 'wsdcg');

    // Tutaj dodajemy logikę: Jeśli testMode jest ON, dodaj testDevice do listy dymu
    let smokeDevices = devices.filter(d => d.category === 'sensor' || d.category === 'cs' || d.productName?.toLowerCase().includes('smoke'));
    if (testMode) {
        smokeDevices = [testDevice, ...smokeDevices];
    }

    const otherDevices = devices.filter(d =>
        d.category !== 'wsdcg' &&
        d.category !== 'sensor' &&
        d.category !== 'cs' &&
        !d.productName?.toLowerCase().includes('smoke')
    );

    let currentList = [];
    if (activeTab === 'temp') currentList = tempDevices;
    else if (activeTab === 'smoke') currentList = smokeDevices;
    else currentList = otherDevices;

    if (loading) return <div className="loading"><Loader2 className="spin" size={48} /></div>;

    return (
        <div>
            {/* --- PRZYCISK TESTOWY (NAD ZAKŁADKAMI LUB OBOK) --- */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <button
                    onClick={() => {
                        setTestMode(!testMode);
                        setActiveTab('smoke'); // Przełącz na zakładkę dymu, żeby zobaczyć efekt
                    }}
                    style={{
                        background: testMode ? '#ef4444' : '#334155',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 'bold',
                        boxShadow: testMode ? '0 0 15px rgba(239, 68, 68, 0.5)' : 'none'
                    }}
                >
                    <Bug size={16} />
                    {testMode ? 'WYŁĄCZ SYMULACJĘ' : 'TEST ALARMU'}
                </button>
            </div>

            {/* --- NAWIGACJA ZAKŁADEK --- */}
            <div className="tabs-container">
                <button
                    className={`tab-button ${activeTab === 'temp' ? 'active' : ''}`}
                    onClick={() => setActiveTab('temp')}
                >
                    <Thermometer size={16} />
                    Temperatura
                    <span className="tab-count">{tempDevices.length}</span>
                </button>

                <button
                    className={`tab-button ${activeTab === 'smoke' ? 'active' : ''}`}
                    onClick={() => setActiveTab('smoke')}
                >
                    <Flame size={16} />
                    Czujniki Dymu
                    <span className="tab-count">{smokeDevices.length}</span>
                </button>

                <button
                    className={`tab-button ${activeTab === 'other' ? 'active' : ''}`}
                    onClick={() => setActiveTab('other')}
                >
                    <Grid size={16} />
                    Pozostałe
                    <span className="tab-count">{otherDevices.length}</span>
                </button>
            </div>

            {/* --- SIATKA URZĄDZEŃ --- */}
            <div className="grid-container">
                {currentList.length > 0 ? (
                    currentList.map(device => (
                        <Link to={`/device/${device.id}`} key={device.id} style={{ textDecoration: 'none' }}>
                            <DeviceCard deviceId={device.id} initialData={device} />
                        </Link>
                    ))
                ) : (
                    <div className="no-data">Brak urządzeń w tej kategorii.</div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;