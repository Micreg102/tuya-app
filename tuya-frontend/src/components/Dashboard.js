import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import DeviceCard from './DeviceCard';
import devicesConfig from '../devices.json';
import { Thermometer, Flame, Grid, Loader2, Bug } from 'lucide-react';

const Dashboard = () => {
    const [devices, setDevices] = useState([]);
    const [activeTab, setActiveTab] = useState('temp');
    const [loading, setLoading] = useState(true);
    const [testMode, setTestMode] = useState(false);

    useEffect(() => {
        const fetchAllDevicesDetails = async () => {
            const ids = devicesConfig.deviceIds;
            try {
                const requests = ids.map(id =>
                    axios.get(`/devices/${id}`)
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

    const testDevice = {
        id: 'test-sim-001',
        name: 'TEST: KUCHNIA',
        category: 'sensor',
        productName: 'Symulator Pożaru',
        online: true,
        status: [
            { code: 'smoke_sensor_status', value: 'alarm' },
            { code: 'battery_percentage', value: 88 }
        ]
    };

    const tempDevices = devices.filter(d => d.category === 'wsdcg');

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
        <div className="p-4 bg-gray-50 min-h-screen">
            <div className="flex justify-center mb-4">
                <button
                    onClick={() => { setTestMode(!testMode); setActiveTab('smoke'); }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-bold transition-all ${
                        testMode ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                    <Bug size={14} />
                    {testMode ? 'WYŁĄCZ SYMULACJĘ' : 'TEST ALARMU'}
                </button>
            </div>

            <div className="flex justify-center gap-2 mb-6 border-b border-gray-200 pb-3">
                {[
                    { id: 'temp', label: 'Temp.', icon: Thermometer, count: tempDevices.length },
                    { id: 'smoke', label: 'Dym', icon: Flame, count: smokeDevices.length },
                    { id: 'other', label: 'Inne', icon: Grid, count: otherDevices.length }
                ].map(tab => (
                    <button
                        key={tab.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border text-gray-600 hover:bg-gray-50'
                        }`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                        <span className="text-[10px] opacity-60">({tab.count})</span>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 max-w-7xl mx-auto">
                {currentList.length > 0 ? (
                    currentList.map(device => (
                        <Link to={`/device/${device.id}`} key={device.id} className="no-underline group">
                            <DeviceCard deviceId={device.id} initialData={device} />
                        </Link>
                    ))
                ) : (
                    <div className="col-span-full text-center py-10 text-gray-400 italic text-sm">Brak urządzeń.</div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
