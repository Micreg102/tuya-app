import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WebSocketContext } from '../WebSocketContext';
import axios from 'axios';
import { ChevronLeft, Activity, Cpu, Thermometer, Droplets, Battery, ShieldAlert,Siren, History } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import '../App.css';

const DeviceDetails = () => {
    const { deviceId } = useParams();
    const navigate = useNavigate();
    const [device, setDevice] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('today');


    useEffect(() => {
        // 1. Pobieramy podstawowe info o urządzeniu
        axios.get(`http://localhost:8080/devices/${deviceId}`)
            .then(res => setDevice(res.data))
            .catch(err => console.error("Błąd pobierania urządzenia:", err));

        // 2. Pobieramy historię z MongoDB
        axios.get(`http://localhost:8080/devices/${deviceId}/history`)
            .then(res => {
                // Backend zwraca dane od najnowszych, wykres potrzebuje od najstarszych (do rysowania od lewej do prawej)
                const formattedData = res.data.reverse().map(item => {
                    const dateObj = new Date(item.timestamp);
                    return {
                        ...item,
                        // Formatujemy datę do osi X i tooltipów
                        time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        fullDate: dateObj.toLocaleString()
                    };
                });
                setHistory(formattedData);
                console.log("Dane pobrane z bazy:", formattedData);
            })
            .catch(err => console.error("Błąd pobierania historii:", err))
            .finally(() => setLoading(false));
    }, [deviceId]);
    const wsUpdateData = useContext(WebSocketContext);

    useEffect(() => {
        if (!wsUpdateData || wsUpdateData.devId !== deviceId) return;

        // 1. Aktualizacja surowych statusów i specyfikacji (bez błędów mutacji)
        setDevice(prev => {
            if (!prev) return prev;
            let newState = { ...prev };
            const updates = wsUpdateData.status || wsUpdateData.properties || [];

            let newStatus = [...(newState.status || [])];
            updates.forEach(upd => {
                const i = newStatus.findIndex(s => s.code === upd.code);
                if (i !== -1) {
                    newStatus[i] = { ...newStatus[i], value: upd.value };
                } else {
                    newStatus.push(upd);
                }
            });
            newState.status = newStatus;
            return newState;
        });

        // 2. Dodawanie punktu do wykresu "w locie" z POPRAWNYM TIMESTAMPEM
        const updates = wsUpdateData.status || wsUpdateData.properties || [];
        if (updates.length > 0) {
            const newTempRaw = updates.find(u => u.code.includes('temp'))?.value;
            const newHumRaw = updates.find(u => u.code.includes('hum'))?.value;
            const newBattRaw = updates.find(u => u.code.includes('battery'))?.value;
            const newSmokeRaw = updates.find(u => u.code.includes('smoke_sensor_status') || u.code.includes('smoke_sensor_state'))?.value;

            // Ignorujemy puste pakiety techniczne
            if (newTempRaw === undefined && newHumRaw === undefined && newBattRaw === undefined && newSmokeRaw === undefined) {
                return;
            }

            const dateObj = new Date();
            const newEntry = {
                timestamp: dateObj.toISOString(), // KLUCZOWE: Pełna data, żeby filtry nie odrzucały punktu!
                time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                fullDate: dateObj.toLocaleString(),
                temperature: newTempRaw !== undefined ? newTempRaw / 10 : null,
                humidity: newHumRaw !== undefined ? newHumRaw : null,
                battery: newBattRaw !== undefined ? newBattRaw : null,
                smokeStatus: newSmokeRaw || null,
            };

            // Dodajemy nowy punkt na koniec historii
            setHistory(prev => [...prev, newEntry]);
        }
    }, [wsUpdateData, deviceId]);
    if (loading || !device) return <div className="loading">Ładowanie szczegółów...</div>;

    // Sprawdzamy typ urządzenia, aby wyświetlić odpowiedni wykres
    const isSmokeSensor = device.category === 'sensor' || device.category === 'cs';
    // 1. ZAAWANSOWANE FILTROWANIE I FORMATOWANIE OSI X
    const filteredHistory = history.filter(item => {
        const itemTime = new Date(item.timestamp).getTime();
        const now = new Date();

        if (timeRange === 'today') {
            // Od północy dzisiaj
            return itemTime >= new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        }
        if (timeRange === 'week') {
            // Od 7 dni wstecz
            return itemTime >= new Date(now.setDate(now.getDate() - 7)).getTime();
        }
        if (timeRange === 'year') {
            // Od 365 dni wstecz
            return itemTime >= new Date(now.setFullYear(now.getFullYear() - 1)).getTime();
        }
        return true; // dla 'all'
    }).map(item => {
        // 2. DYNAMICZNA OŚ X (Godzina dla dzisiaj, Data+Godzina dla reszty)
        const d = new Date(item.timestamp);
        let displayX = '';

        if (timeRange === 'today') {
            displayX = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            const day = d.getDate().toString().padStart(2, '0');
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            displayX = `${day}.${month} ${time}`;
        }

        return { ...item, displayX };
    });
    // Filtrujemy tylko te wpisy z historii, gdzie był alarm dymu (do osi czasu)
    const alarmEvents = history.filter(h => h.smokeStatus === 'alarm' || h.smokeStatus === '1');

    return (
        <div className="min-h-screen bg-gray-50 p-6 text-gray-900">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors">
                    <ChevronLeft size={20} /> Powrót
                </button>

                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-8">
                    <h1 className="text-3xl font-black mb-2">{device.name}</h1>
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">{device.productName}</p>

                    <div className="mt-8">
                        <h3 className="flex items-center gap-2 font-black mb-6 text-gray-400 uppercase text-xs tracking-widest">
                            <History size={16} /> {isSmokeSensor ? 'Historia Alarmów i Zasilania' : 'Historia Klimatu'}
                        </h3>
                        <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
                            {['today', 'week', 'year', 'all'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        timeRange === range ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {range === 'today' ? 'Dzisiaj' : range === 'week' ? 'Tydzień' : range === 'year' ? 'Rok' : 'Wszystko'}
                                </button>
                            ))}
                        </div>
                        <div className="h-[300px] w-full">


                            <ResponsiveContainer width="100%" height="100%">
                                {isSmokeSensor ? (
                                    // WYKRES BATERII DLA DYMU
                                    <AreaChart data={filteredHistory}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="displayX" stroke="#cbd5e1" fontSize={11} minTickGap={30} />
                                        <YAxis stroke="#cbd5e1" fontSize={11} domain={[0, 100]} />
                                        <Tooltip />
                                        <Area
                                            type="stepAfter"
                                            dataKey="battery"
                                            name="Bateria (%)"
                                            stroke="#10b981"
                                            fill="#10b981"
                                            fillOpacity={0.1}
                                            connectNulls={true} // Bateria rysuje się ciągiem mimo braku danych pośrodku
                                        />
                                    </AreaChart>
                                ) : (
                                    // WYKRES TEMP/HUM DLA KLIMATU
                                    <LineChart data={filteredHistory}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="displayX" stroke="#cbd5e1" fontSize={11} minTickGap={30} />
                                        <YAxis yAxisId="left" stroke="#ef4444" fontSize={11} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={11} />
                                        <Tooltip />
                                        <Line
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="temperature"
                                            name="Temp (°C)"
                                            stroke="#ef4444"
                                            strokeWidth={3}
                                            dot={false}
                                            connectNulls={false} // Przerywa linię, jeśli temperatura to null
                                        />
                                        <Line
                                            yAxisId="right"
                                            type="monotone"
                                            dataKey="humidity"
                                            name="Wilgotność (%)"
                                            stroke="#3b82f6"
                                            strokeWidth={3}
                                            dot={false}
                                            connectNulls={false} // Przerywa linię, jeśli wilgotność to null
                                        />
                                        <Line
                                            yAxisId="right"
                                            type="stepAfter"
                                            dataKey="battery"
                                            name="Bateria (%)"
                                            stroke="#10b981"
                                            strokeWidth={2}
                                            strokeDasharray="5 5"
                                            dot={false}
                                            connectNulls={true} // Łączy punkty baterii ignorując nulle po drodze
                                        />
                                    </LineChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* DODATKOWA LISTA ZDARZEŃ DLA CZUJNIKA DYMU */}
                {isSmokeSensor && (
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-8">
                        <h3 className="font-black mb-4 text-gray-400 uppercase text-xs tracking-widest">Dziennik Zdarzeń</h3>
                        <div className="space-y-4">
                            {history.filter(h => h.smokeStatus === 'alarm' || h.smokeStatus === '1').length > 0 ? (
                                history.filter(h => h.smokeStatus === 'alarm' || h.smokeStatus === '1').reverse().map((event, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100 text-red-700">
                                        <div className="flex items-center gap-3">
                                            <Siren size={20} />
                                            <span className="font-bold">WYKRYTO ZAGROŻENIE</span>
                                        </div>
                                        <span className="text-xs font-mono">{new Date(event.timestamp).toLocaleString()}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-400 text-sm italic">Brak odnotowanych alarmów dymu.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* GRID SPECYFIKACJI */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section className="bg-white border rounded-2xl p-6 shadow-sm">
                        <h3 className="flex items-center gap-2 font-bold mb-4 text-gray-700"><Cpu size={18} /> Specyfikacja</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between border-b pb-2"><span>Model:</span> <strong>{device.model}</strong></div>
                            <div className="flex justify-between border-b pb-2"><span>Produkt:</span> <strong>{device.productName}</strong></div>
                            <div className="flex justify-between border-b pb-2"><span>ID:</span> <code className="bg-gray-100 px-2 rounded text-xs">{device.id}</code></div>
                        </div>
                    </section>

                    <section className="bg-white border rounded-2xl p-6 shadow-sm">
                        <h3 className="flex items-center gap-2 font-bold mb-4 text-gray-700"><Activity size={18} /> Status Surowy</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {device.status?.map((s, i) => (
                                <div key={i} className="flex justify-between bg-gray-50 p-2 rounded text-sm">
                                    <span className="text-gray-500">{s.code}:</span>
                                    <span className="font-mono font-bold text-blue-600">{String(s.value)}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default DeviceDetails;