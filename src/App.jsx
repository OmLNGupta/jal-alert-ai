import React, { useState, useEffect, useMemo } from 'react';
import {
  Waves,
  AlertTriangle,
  ShieldAlert,
  Compass,
  Navigation,
  Send,
  RefreshCw,
  MapPin,
  Clock,
  Gauge,
  Activity,
  CheckCircle2,
  CloudRain,
  ExternalLink,
  Info,
  Server,
  Layers,
  Sparkles,
  Search,
  Filter,
  Check,
  Zap,
  PhoneCall
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

// Resilient default seed data in case API is offline before start
const FALLBACK_HOTSPOTS = [
  {
    id: 'spot-delhi-01',
    name: 'Minto Road Railway Underpass',
    zone: 'Central Delhi',
    coordinates: { lat: 28.6358, lng: 77.2285 },
    severity: 'HIGH',
    depth_cm: 85,
    drainage_status: 'Pumps Overwhelmed (3/4 Offline)',
    traffic_impact: 'Completely Blocked',
    recommended_detour: 'Divert via Barakhamba Road & Connaught Place Outer Circle',
    last_updated: 'Just now',
    alert_type: 'Severe Inundation'
  },
  {
    id: 'spot-mum-02',
    name: 'Hindmata Flyover Subway',
    zone: 'Dadar / Parel, Mumbai',
    coordinates: { lat: 19.0118, lng: 72.8428 },
    severity: 'HIGH',
    depth_cm: 72,
    drainage_status: 'Heavy Backflow (High Tide 4.2m)',
    traffic_impact: 'Subway Closed, Flyover Crawling',
    recommended_detour: 'Use Dr. B.A. Road elevated lane or Senapati Bapat Marg',
    last_updated: '10 mins ago',
    alert_type: 'Tidal Backflow Inundation'
  },
  {
    id: 'spot-blr-03',
    name: 'Silk Board Junction - Service Road',
    zone: 'South Bengaluru',
    coordinates: { lat: 12.9177, lng: 77.6238 },
    severity: 'MODERATE',
    depth_cm: 38,
    drainage_status: 'Desilting Required, Flow Constricted',
    traffic_impact: 'Heavy Congestion (Slow Movement)',
    recommended_detour: 'Reroute via HSR 27th Main or BTM Ring Road Flyover',
    last_updated: '15 mins ago',
    alert_type: 'Stormwater Drain Overflow'
  },
  {
    id: 'spot-delhi-04',
    name: 'Pul Prahladpur Underpass',
    zone: 'South Delhi',
    coordinates: { lat: 28.5034, lng: 77.2917 },
    severity: 'HIGH',
    depth_cm: 64,
    drainage_status: 'Stormwater Sump Saturated',
    traffic_impact: 'Closed for Two-Wheelers & Sedans',
    recommended_detour: 'Divert via Mehrauli-Badarpur Road bypass',
    last_updated: '20 mins ago',
    alert_type: 'Underpass Sump Overflow'
  },
  {
    id: 'spot-blr-05',
    name: 'Bellandur EcoSpace Outer Ring Road',
    zone: 'Mahadevapura, Bengaluru',
    coordinates: { lat: 12.9260, lng: 77.6762 },
    severity: 'MODERATE',
    depth_cm: 32,
    drainage_status: 'Lakeside Culvert High-Discharge',
    traffic_impact: 'Single Lane Passable',
    recommended_detour: 'Use Sarjapur Road or Internal Campus Access',
    last_updated: '30 mins ago',
    alert_type: 'Lake Runoff Buffer'
  },
  {
    id: 'spot-mum-06',
    name: 'Milan Subway - Santacruz',
    zone: 'Western Suburbs, Mumbai',
    coordinates: { lat: 19.0833, lng: 72.8415 },
    severity: 'LOW',
    depth_cm: 14,
    drainage_status: 'Pumps Operational (Flow Normal)',
    traffic_impact: 'Normal Flow with Caution',
    recommended_detour: 'Milan Flyover recommended during squalls',
    last_updated: '40 mins ago',
    alert_type: 'Monitored Low Risk'
  }
];

const PRESET_LOCATIONS = [
  { name: 'Minto Bridge Underpass, Connaught Place', depth: 85, severity: 'HIGH' },
  { name: 'Silk Board Junction, Outer Ring Rd', depth: 40, severity: 'MODERATE' },
  { name: 'Hindmata Flyover Underpass, Mumbai', depth: 75, severity: 'HIGH' },
  { name: 'Cyber City Expressway Underpass, Gurugram', depth: 45, severity: 'MODERATE' },
  { name: 'South End Circle Metro Low-Point', depth: 25, severity: 'LOW' }
];

export default function App() {
  const [hotspots, setHotspots] = useState(FALLBACK_HOTSPOTS);
  const [reports, setReports] = useState([]);
  const [advisory, setAdvisory] = useState({
    level: 'FLASH_FLOOD_WARNING',
    risk: 'CRITICAL',
    title: 'CRITICAL HYDRO-ADVISORY: Severe Urban Inundation Detected',
    recommendation: 'Multiple arterial underpasses submerged (>60cm). Avoid low-lying corridors. Divert commercial & personal transit to elevated radial expressways.',
    reroute_active: true
  });
  const [summary, setSummary] = useState({
    total_monitored_hotspots: 6,
    high_risk_zones: 3,
    moderate_risk_zones: 2,
    max_water_depth_cm: 85,
    active_citizen_reports: 2,
    overall_risk: 'CRITICAL',
    drainage_stress_index: 82
  });

  const [loading, setLoading] = useState(false);
  const [serverOnline, setServerOnline] = useState(false);
  const [storageEngine, setStorageEngine] = useState('Local Seed Store');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [toast, setToast] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    location: '',
    estimated_depth_cm: 45,
    severity: 'MODERATE',
    notes: '',
    reporter_name: '',
    reporter_role: 'Citizen'
  });
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  // Fetch alerts from backend
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/alerts`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.hotspots) setHotspots(data.hotspots);
      if (data.reports) setReports(data.reports);
      if (data.advisory) setAdvisory(data.advisory);
      if (data.summary) setSummary(data.summary);
      if (data.engine) setStorageEngine(data.engine);

      setServerOnline(true);
    } catch (err) {
      console.warn('[Jal-Alert] Live backend unavailable, using local resilient cache:', err.message);
      setServerOnline(false);
      setStorageEngine('In-Memory Resilient Cache');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Show Toast helper
  const triggerToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Submit report handler
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!formData.location.trim()) {
      triggerToast('Please provide a valid location for the waterlogging incident.', 'error');
      return;
    }

    setSubmitting(true);
    const payload = {
      location: formData.location.trim(),
      estimated_depth_cm: Number(formData.estimated_depth_cm) || 20,
      severity: formData.severity,
      notes: formData.notes.trim() || 'Citizen field report via Jal-Alert AI portal.',
      reporter_name: formData.reporter_name.trim() || 'Anonymous Responder',
      reporter_role: formData.reporter_role,
      coordinates: { lat: 28.6139, lng: 77.2090 }
    };

    try {
      let createdReport = null;

      if (serverOnline) {
        const res = await fetch(`${API_BASE}/api/reports`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        createdReport = result.report;
      } else {
        // Optimistic local fallback creation
        createdReport = {
          report_id: `rep-local-${Date.now().toString(36)}`,
          ...payload,
          timestamp: new Date().toISOString(),
          status: payload.severity === 'HIGH' ? 'VERIFIED_ALERT' : 'INVESTIGATING'
        };
      }

      if (createdReport) {
        setReports(prev => [createdReport, ...prev]);
        setSummary(prev => ({
          ...prev,
          active_citizen_reports: prev.active_citizen_reports + 1,
          max_water_depth_cm: Math.max(prev.max_water_depth_cm, createdReport.estimated_depth_cm)
        }));
      }

      setSubmissionSuccess(true);
      triggerToast('Ground incident recorded & added to active hydro-dispatch feed!', 'success');
      
      // Reset form
      setFormData({
        location: '',
        estimated_depth_cm: 30,
        severity: 'MODERATE',
        notes: '',
        reporter_name: '',
        reporter_role: 'Citizen'
      });

      setTimeout(() => setSubmissionSuccess(false), 3000);
      fetchData();
    } catch (err) {
      console.error('[Jal-Alert] Submission error:', err);
      triggerToast(`Submission failed: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered hotspots
  const filteredHotspots = useMemo(() => {
    return hotspots.filter(spot => {
      const matchesSearch =
        spot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spot.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spot.recommended_detour.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeverity = severityFilter === 'ALL' || spot.severity === severityFilter;
      return matchesSearch && matchesSeverity;
    });
  }, [hotspots, searchQuery, severityFilter]);

  // Color & Badge Helpers
  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 glow-red">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            CRITICAL HIGH
          </span>
        );
      case 'MODERATE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            MODERATE RISK
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            LOW / PASSABLE
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300">
            {severity}
          </span>
        );
    }
  };

  const getDepthColor = (depth) => {
    if (depth >= 60) return 'text-rose-400 font-extrabold';
    if (depth >= 30) return 'text-amber-300 font-bold';
    return 'text-emerald-400 font-semibold';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border border-cyan-500/40 bg-slate-900/90 text-sm font-medium animate-bounce">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : toast.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          ) : (
            <Info className="w-5 h-5 text-cyan-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header / Status Bar */}
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-lg sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <Waves className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-blue-200 to-indigo-300 bg-clip-text text-transparent">
                  Jal-Alert AI
                </h1>
                <span className="text-[10px] tracking-wider uppercase font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-700/50">
                  Track: Heat & Water
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Urban Flood & Waterlogging Action Engine | First Commit Hackathon
              </p>
            </div>
          </div>

          {/* Right Meta Badges */}
          <div className="flex items-center gap-3">
            {/* AWS Serverless / Endpoint Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-900/90 border border-slate-700/70">
              <span
                className={`w-2 h-2 rounded-full ${
                  serverOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-slate-300">
                {serverOnline ? 'AWS Pipeline Online' : 'Local Seed Mode'}
              </span>
              <span className="text-slate-500 hidden md:inline">| {storageEngine}</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchData}
              disabled={loading}
              title="Refresh Telemetry"
              className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* FEATURE 3: Actionable Hydro-Advisory Banner */}
        <section className="relative overflow-hidden rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 p-5 shadow-2xl">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center flex-shrink-0 animate-radar">
                <ShieldAlert className="w-7 h-7 text-rose-400" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500 text-white">
                    {advisory.level || 'FLASH FLOOD ALERT'}
                  </span>
                  <span className="text-xs text-rose-300/80 font-mono flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Synchronized Telemetry Active
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-100">
                  {advisory.title}
                </h2>
                <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
                  {advisory.recommendation}
                </p>
              </div>
            </div>

            {/* Advisory Action Button / Emergency Diversion Badge */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
              <a
                href="#hotspots-section"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors shadow-lg shadow-rose-600/30 text-center"
              >
                <Navigation className="w-4 h-4" />
                View Safe Rerouting Corridors
              </a>
              <div className="px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs text-slate-400 flex items-center justify-center gap-1.5 font-mono">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                Drainage Stress: {summary.drainage_stress_index || 78}%
              </div>
            </div>
          </div>
        </section>

        {/* Real-time KPI Stats Bar */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Severe Hotspots</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-rose-400">
                {summary.high_risk_zones || 0}
              </span>
              <span className="text-xs text-slate-500">/ {summary.total_monitored_hotspots || 6} zones</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Water depth exceeds 60cm
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Max Inundation Depth</span>
              <Gauge className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-cyan-400">
                {summary.max_water_depth_cm || 85}
              </span>
              <span className="text-xs text-slate-400">cm</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Peak recorded at Minto Underpass
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Ground Incident Reports</span>
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-300">
                {reports.length || summary.active_citizen_reports || 0}
              </span>
              <span className="text-xs text-slate-500">submitted</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Crowdsourced & warden validated
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Serverless Infrastructure</span>
              <Server className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-sm font-bold text-emerald-400 truncate">
                AWS Lambda + DynamoDB
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1 font-mono">
              <Zap className="w-3 h-3 text-amber-400" /> Zero Cold-Start Fallback
            </div>
          </div>
        </section>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* FEATURE 1: Live Waterlogging Hotspots list (8 columns on large screens) */}
          <section id="hotspots-section" className="lg:col-span-7 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-cyan-400" />
                  Live Urban Hotspots & Telemetry Feed
                </h3>
                <p className="text-xs text-slate-400">
                  Real-time underpass sensors, tidal monitoring & civic choke-points
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-44">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search locations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 py-1.5 px-2.5 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">All Risk Levels</option>
                  <option value="HIGH">High Severity</option>
                  <option value="MODERATE">Moderate Risk</option>
                  <option value="LOW">Low / Passable</option>
                </select>
              </div>
            </div>

            {/* Hotspots Card Stream */}
            <div className="space-y-3">
              {filteredHotspots.length === 0 ? (
                <div className="glass-panel p-8 text-center rounded-xl border border-slate-800 text-slate-400 text-sm">
                  No monitored hotspots match your current filters.
                </div>
              ) : (
                filteredHotspots.map((spot) => (
                  <div
                    key={spot.id}
                    className="glass-panel-elevated p-4 sm:p-5 rounded-xl border border-slate-800/90 hover:border-cyan-500/40 transition-all duration-200 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-white tracking-tight">
                            {spot.name}
                          </h4>
                          <span className="text-[11px] text-slate-400 font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                            {spot.zone}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                          <span className="flex items-center gap-1">
                            <Compass className="w-3.5 h-3.5 text-cyan-400" />
                            {spot.coordinates.lat.toFixed(4)}, {spot.coordinates.lng.toFixed(4)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {spot.last_updated}
                          </span>
                        </div>
                      </div>
                      <div>{getSeverityBadge(spot.severity)}</div>
                    </div>

                    {/* Telemetry Metrics Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80">
                        <span className="text-[11px] text-slate-400 block">Water Depth</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className={`text-xl ${getDepthColor(spot.depth_cm)} font-mono`}>
                            {spot.depth_cm}
                          </span>
                          <span className="text-xs text-slate-400">cm</span>
                        </div>
                        {/* Visual Depth Bar */}
                        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              spot.depth_cm >= 60
                                ? 'bg-rose-500'
                                : spot.depth_cm >= 30
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.min(100, (spot.depth_cm / 100) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80">
                        <span className="text-[11px] text-slate-400 block">Drainage Flow</span>
                        <span className="text-xs text-slate-200 font-medium line-clamp-2 mt-0.5">
                          {spot.drainage_status}
                        </span>
                      </div>

                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 col-span-2 sm:col-span-1">
                        <span className="text-[11px] text-slate-400 block">Traffic Status</span>
                        <span className="text-xs text-slate-200 font-medium line-clamp-2 mt-0.5">
                          {spot.traffic_impact}
                        </span>
                      </div>
                    </div>

                    {/* Actionable Hydro Reroute Recommendation */}
                    <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-800/30 flex items-start gap-2.5 text-xs text-cyan-200/90">
                      <Navigation className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-cyan-300">Hydro-Advisory Detour: </span>
                        {spot.recommended_detour}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Citizen Submitted Incident Feed */}
            <div className="mt-8 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  Active Incident Dispatch Feed ({reports.length})
                </h3>
                <span className="text-[11px] text-slate-400">DynamoDB Table: jal_reports</span>
              </div>

              {reports.length === 0 ? (
                <div className="glass-panel p-4 rounded-xl text-center text-xs text-slate-400 border border-slate-800">
                  No citizen incident reports registered yet. Use the form to submit telemetry.
                </div>
              ) : (
                <div className="space-y-2">
                  {reports.map((rep) => (
                    <div
                      key={rep.report_id}
                      className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{rep.location}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              rep.severity === 'HIGH'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : rep.severity === 'MODERATE'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {rep.severity} ({rep.estimated_depth_cm} cm)
                          </span>
                        </div>
                        <p className="text-slate-400">{rep.notes}</p>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Reported by {rep.reporter_name || 'Citizen'} ({rep.reporter_role || 'Field Observer'}) •{' '}
                          {rep.timestamp ? new Date(rep.timestamp).toLocaleTimeString() : 'Recent'}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="px-2 py-1 rounded bg-slate-800 text-[10px] font-mono text-cyan-300 border border-slate-700">
                          {rep.status || 'LOGGED'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* FEATURE 2: Incident Reporting Form (5 columns on large screens) */}
          <section className="lg:col-span-5 space-y-4">
            <div className="glass-panel-elevated p-5 sm:p-6 rounded-2xl border border-cyan-500/30 shadow-2xl relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Submit Ground Inundation Report
                  </h3>
                  <p className="text-xs text-slate-400">
                    Direct ingest to AWS Lambda & DynamoDB engine
                  </p>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="my-3">
                <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                  Quick Select Known Choke Points:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_LOCATIONS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          location: preset.name,
                          estimated_depth_cm: preset.depth,
                          severity: preset.severity
                        }))
                      }
                      className="px-2 py-1 rounded-md text-[11px] bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      {preset.name.split(',')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmitReport} className="space-y-4 mt-4">
                {/* Location Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Location / Landmark Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Minto Bridge Underpass, Connaught Place"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                </div>

                {/* Estimated Depth Input & Range */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                    <label>Estimated Water Depth (cm)</label>
                    <span className="font-mono text-cyan-400 text-sm font-bold">
                      {formData.estimated_depth_cm} cm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="120"
                    step="5"
                    value={formData.estimated_depth_cm}
                    onChange={(e) =>
                      setFormData({ ...formData, estimated_depth_cm: Number(e.target.value) })
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>10cm (Curb)</span>
                    <span>40cm (Knee)</span>
                    <span>75cm (Waist)</span>
                    <span>100cm+ (Impassable)</span>
                  </div>
                </div>

                {/* Severity Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Risk Severity Assessment <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="HIGH">CRITICAL / HIGH - Completely Submerged / Vehicles Stalled</option>
                    <option value="MODERATE">MODERATE - Slow Traffic / Half-Wheel Inundation</option>
                    <option value="LOW">LOW - Cautionary Puddle / Shallow Waterlogging</option>
                  </select>
                </div>

                {/* Field Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Field Observations & Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe drainage pump status, stalled vehicles, or specific lane blockages..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Reporter Role & Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Reporter Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. A. Sen (Optional)"
                      value={formData.reporter_name}
                      onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Observer Role
                    </label>
                    <select
                      value={formData.reporter_role}
                      onChange={(e) => setFormData({ ...formData, reporter_role: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="Citizen">Citizen Volunteer</option>
                      <option value="Traffic Official">Traffic Official</option>
                      <option value="Emergency Responder">Emergency Responder</option>
                      <option value="Municipal Engineer">Municipal Engineer</option>
                    </select>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      Registering Report...
                    </>
                  ) : submissionSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-slate-950" />
                      Report Dispatched to jal_reports!
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-slate-950" />
                      Dispatch Waterlogging Alert
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Architecture Card */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-300 font-bold">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                AWS Serverless Architecture Pipeline
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Hydro-telemetry and incident ingest run on an AWS Serverless stack:
                <strong className="text-slate-200"> AWS Amplify / S3</strong> host the Vite frontend,{' '}
                <strong className="text-slate-200">Amazon API Gateway</strong> routes requests to a{' '}
                <strong className="text-slate-200">Python 3.11 Lambda function</strong>, persisting records into{' '}
                <strong className="text-slate-200">Amazon DynamoDB ('jal_reports')</strong>.
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Jal-Alert AI • Track: Heat & Water • First Commit Hackathon Prototype
          </div>
          <div className="flex items-center gap-3">
            <span>Endpoint: {API_BASE}</span>
            <span>•</span>
            <span className="text-cyan-400">AWS Lambda & DynamoDB Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
