import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import logo3 from '../assets/logo3.png';

export const Landing = () => {
    const [scrollY, setScrollY] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in-view');
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );

        const animatedElements = document.querySelectorAll('.animate-on-scroll');
        animatedElements.forEach((el) => observerRef.current?.observe(el));

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, []);

    const scrollToSection = (sectionId: string) => {
        document.getElementById(sectionId)?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
        setMobileMenuOpen(false);
    };

    return (
        <>
            <style>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .animate-fade-in-up {
                    animation: fadeInUp 0.8s ease-out;
                    }

                .animate-fade-in-delay {
                    animation: fadeInUp 0.8s ease-out 0.2s both;
                    }

                .animate-fade-in-delay-2 {
                    animation: fadeInUp 0.8s ease-out 0.4s both;
                    }

                .animate-on-scroll {
                    opacity: 0;
                    transform: translateY(20px);
                    transition: all 0.6s ease-out;
                    }

                .animate-on-scroll.in-view {
                    opacity: 1;
                    transform: translateY(0);
                    }

                html {
                    scroll-behavior: smooth;
                }

                .gradient-border {
                    background: linear-gradient(white, white) padding-box,
                                linear-gradient(135deg, #e5e7eb, #f3f4f6) border-box;
                    border: 1px solid transparent;
                }

                .data-grid {
                    background-image: 
                        linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px);
                    background-size: 20px 20px;
                }

                .feature-card {
                    transition: all 0.3s ease;
                    border: 1px solid #e5e7eb;
                }

                .feature-card:hover {
                    border-color: #d1d5db;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    transform: translateY(-2px);
                }

                .metric-card {
                    background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
                    border: 1px solid #e5e7eb;
                }

                .table-row {
                    border-bottom: 1px solid #f3f4f6;
                }

                .table-row:hover {
                    background-color: #f9fafb;
                }

                .connection-badge {
                    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
                    border: 1px solid #d1d5db;
                }

                @keyframes infinite-scroll {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-50%);
                    }
                }

                @keyframes infinite-scroll-reverse {
                    0% {
                        transform: translateX(-50%);
                    }
                    100% {
                        transform: translateX(0);
                    }
                }

                .animate-infinite-scroll {
                    animation: infinite-scroll 50s linear infinite;
                }

                .animate-infinite-scroll:hover {
                    animation-play-state: paused;
                }

                .animate-infinite-scroll-reverse {
                    animation: infinite-scroll-reverse 55s linear infinite;
                }

                .animate-infinite-scroll-reverse:hover {
                    animation-play-state: paused;
                }

                .animate-infinite-chart-scroll {
                    animation: chart-scroll 60s linear infinite;
                }

                @keyframes chart-scroll {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-50%);
                    }
                }
            `}</style>
            
            <div className="min-h-screen bg-white text-black">
                {/* Navigation */}
                <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
                    scrollY > 50 ? 'bg-white/90 backdrop-blur-md border-b border-gray-200' : 'bg-white'
                }`}>
                    <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
                        <div className="flex items-center space-x-3 animate-fade-in-up">
                            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                                <img 
                                    src={logo3} 
                                    alt="QuokkaAI Logo" 
                                    className="w-6 h-6 object-contain"
                                />
                            </div>
                            <span className="text-xl font-semibold text-black">quokkaAI</span>
                        </div>
                        
                        {/* Desktop Navigation */}
                        <div className="hidden lg:flex items-center space-x-8">
                            <button onClick={() => scrollToSection('features')} className="text-gray-600 hover:text-black transition-colors">Features</button>
                            <button onClick={() => scrollToSection('how-it-works')} className="text-gray-600 hover:text-black transition-colors">How It Works</button>
                            <button onClick={() => scrollToSection('pricing')} className="text-gray-600 hover:text-black transition-colors">Pricing</button>
                            <div className="flex items-center space-x-4 ml-8">
                                <Link to="/auth" className="text-gray-600 hover:text-black transition-colors">Sign in</Link>
                                <Link to="/chat" className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                                    Start for free
                            </Link>
                            </div>
                        </div>
                        
                        {/* Mobile Menu Button */}
                        <button 
                            className="lg:hidden p-2"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                                <div className={`w-full h-0.5 bg-black transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
                                <div className={`w-full h-0.5 bg-black transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`}></div>
                                <div className={`w-full h-0.5 bg-black transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
                            </div>
                        </button>
                    </div>
                    
                    {/* Mobile Menu */}
                    <div className={`lg:hidden transition-all duration-300 ${mobileMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden bg-white border-t border-gray-200`}>
                        <div className="px-6 py-6 space-y-4">
                            <button onClick={() => scrollToSection('features')} className="block w-full text-left py-2 text-gray-600 hover:text-black transition-colors">Features</button>
                            <button onClick={() => scrollToSection('how-it-works')} className="block w-full text-left py-2 text-gray-600 hover:text-black transition-colors">How It Works</button>
                            <button onClick={() => scrollToSection('pricing')} className="block w-full text-left py-2 text-gray-600 hover:text-black transition-colors">Pricing</button>
                            <div className="pt-4 space-y-3">
                                <Link to="/auth" className="block w-full text-center py-2 text-gray-600 hover:text-black transition-colors border border-gray-300 rounded-lg">
                                    Sign In
                                </Link>
                                <Link to="/chat" className="block w-full text-center bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors">
                                    Start for free
                                </Link>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <section className="pt-32 pb-20 max-w-4xl mx-auto px-6 text-center">
                    <div className="mb-8 animate-fade-in-up">
                        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-black leading-tight">
                            The next gen of <span className="text-gray-600">data analysis</span>.
                        </h1>
                        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                            QuokkaAI is the engine that builds, scales and grows your data insights to the next level.
                    </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-delay">
                            <Link to="/chat" className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors">
                                Start for free
                        </Link>
                            <button className="text-gray-600 hover:text-black transition-colors px-6 py-3">
                                Talk to sales
                        </button>
                    </div>
                    </div>
                </section>

                                {/* Main Dashboard Preview */}
                <section className="py-20 max-w-7xl mx-auto px-6">
                    <div className="bg-gray-50 rounded-2xl p-8 data-grid animate-on-scroll">
                        {/* macOS Window */}
                        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
                            {/* macOS Title Bar */}
                            <div className="bg-gray-100 border-b border-gray-200 p-4 flex items-center">
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                </div>
                                <div className="flex-1 text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                        <div className="w-4 h-4 bg-black rounded flex items-center justify-center">
                                            <img 
                                                src={logo3} 
                                                alt="QuokkaAI Logo" 
                                                className="w-3 h-3 object-contain"
                                            />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">QuokkaAI - Data Analysis Assistant</span>
                                    </div>
                                </div>
                            </div>

                            {/* Dashboard Content */}
                            <div className="flex">
                                {/* Left Sidebar */}
                                <div className="w-80 bg-white border-r border-gray-200 p-6">
                                    <div className="mb-6">
                                        <div className="flex items-center space-x-3 mb-4">
                                            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                                                <img 
                                                    src={logo3} 
                                                    alt="QuokkaAI Logo" 
                                                    className="w-6 h-6 object-contain"
                                                />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-black">QuokkaAI</h3>
                                                <p className="text-sm text-gray-600">Data Analysis Assistant</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <div className="text-lg font-bold text-black">5</div>
                                            <div className="text-xs text-gray-600">Total Chats</div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <div className="text-lg font-bold text-black">8</div>
                                            <div className="text-xs text-gray-600">Documents</div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <div className="text-lg font-bold text-green-600">0</div>
                                            <div className="text-xs text-gray-600">Active Today</div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <div className="text-lg font-bold text-blue-600">52</div>
                                            <div className="text-xs text-gray-600">Analyses</div>
                                        </div>
                                    </div>

                                    {/* New Analysis Button */}
                                    <button className="w-full bg-black text-white rounded-lg py-3 mb-6 font-medium">
                                        + New Analysis
                                    </button>

                                    {/* Recent Analyses */}
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Recent Analyses</h4>
                                        <div className="space-y-3">
                                            {[
                                                { title: "Hello! I'm ready to analyze", date: "07.07.2025", messages: "10 messages" },
                                                { title: "Hello! I'm ready to analyze", date: "07.07.2025", messages: "6 messages" },
                                                { title: "Hello! I'm ready to analyze", date: "07.07.2025", messages: "8 messages" }
                                            ].map((item, index) => (
                                                <div key={index} className="bg-gray-50 rounded-lg p-3">
                                                    <div className="flex items-center space-x-2 mb-1">
                                                        <div className="w-4 h-4 bg-gray-300 rounded"></div>
                                                        <h5 className="text-sm font-medium text-black truncate">{item.title}</h5>
                                                    </div>
                                                    <div className="text-xs text-gray-500">{item.date} • {item.messages}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Main Content Area */}
                                <div className="flex-1 p-6">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                                                <img 
                                                    src={logo3} 
                                                    alt="QuokkaAI Logo" 
                                                    className="w-6 h-6 object-contain"
                                                />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-black">QuokkaAI</h3>
                                                <p className="text-sm text-gray-600">Data Analysis Assistant</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <span className="text-sm text-gray-600">Live</span>
                                        </div>
                                    </div>

                                    {/* AI Message */}
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                                        <div className="flex items-start space-x-2">
                                            <span className="text-yellow-600">💡</span>
                                            <p className="text-sm text-gray-800">Можете попросить изменить тип графика, сортировку, фильтры и т.д.</p>
                                        </div>
                                    </div>

                                    {/* Chart */}
                                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                                        <h4 className="text-lg font-semibold text-black mb-4">Количество операторов по группам</h4>
                                        
                                        {/* Chart Area */}
                                        <div className="h-64 relative">
                                            <svg className="w-full h-full" viewBox="0 0 600 200">
                                                {/* Grid lines */}
                                                <defs>
                                                    <pattern id="grid" width="60" height="40" patternUnits="userSpaceOnUse">
                                                        <path d="M 60 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
                                                    </pattern>
                                                </defs>
                                                <rect width="100%" height="100%" fill="url(#grid)" />
                                                
                                                {/* Y-axis labels */}
                                                <text x="30" y="20" className="text-xs fill-gray-500">2.0</text>
                                                <text x="30" y="60" className="text-xs fill-gray-500">1.5</text>
                                                <text x="30" y="100" className="text-xs fill-gray-500">1.0</text>
                                                <text x="30" y="140" className="text-xs fill-gray-500">0.5</text>
                                                <text x="30" y="180" className="text-xs fill-gray-500">0</text>
                                                
                                                {/* Line chart */}
                                                <path 
                                                    d="M 60 40 L 200 60 L 400 100 L 540 100" 
                                                    stroke="#8b5cf6" 
                                                    strokeWidth="2" 
                                                    fill="none"
                                                />
                                                
                                                {/* Data points */}
                                                <circle cx="60" cy="40" r="4" fill="#8b5cf6" stroke="white" strokeWidth="2"/>
                                                <circle cx="200" cy="60" r="4" fill="#8b5cf6" stroke="white" strokeWidth="2"/>
                                                <circle cx="400" cy="100" r="4" fill="#8b5cf6" stroke="white" strokeWidth="2"/>
                                                <circle cx="540" cy="100" r="4" fill="#8b5cf6" stroke="white" strokeWidth="2"/>
                                            </svg>
                                            
                                            {/* X-axis labels */}
                                            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 px-12">
                                                <span>ДГД/КАЗ,РУ - ЭКО</span>
                                                <span>ДГД/КАЗ,РУ - г.Алматы</span>
                                                <span>ДГД/КАЗ/РУ - Павлодарская обл</span>
                                            </div>
                                        </div>
                                        
                                        {/* Legend */}
                                        <div className="flex items-center justify-center mt-4">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-3 h-0.5 bg-purple-500"></div>
                                                <span className="text-sm text-gray-600">Количество операторов</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-20 max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4 text-black animate-on-scroll">Powerful features</h2>
                        <p className="text-xl text-gray-600 animate-on-scroll">Everything you need for intelligent data analysis</p>
                    </div>
                    
                    <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
                        {/* Left side - Automation description */}
                        <div className="animate-on-scroll">
                            <h3 className="text-2xl font-bold mb-4 text-black">Automate everything</h3>
                            <p className="text-gray-600 mb-8 leading-relaxed">
                                You're in control. Automate even the most complex data analysis processes with our powerful intelligent automation engine.
                            </p>
                            <button className="text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-2">
                                <span>Explore automations</span>
                                <span>→</span>
                            </button>
                        </div>

                        {/* Right side - Workflow diagram */}
                        <div className="animate-on-scroll">
                            <div className="bg-gray-50 rounded-2xl p-8 relative overflow-hidden">
                                {/* Workflow nodes */}
                                <div className="space-y-6">
                                    {/* Trigger */}
                                    <div className="flex items-center space-x-4">
                                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                            <span className="text-white text-sm">⚡</span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                                                <div className="text-sm font-medium text-black">When Data uploaded</div>
                                                <div className="text-xs text-gray-500">Trigger when new data is uploaded</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Condition */}
                                    <div className="flex items-center space-x-4 ml-4">
                                        <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
                                            <span className="text-white text-xs">✓</span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                                                <div className="text-sm font-medium text-black">Switch</div>
                                                <div className="text-xs text-gray-500">Route to specific analysis</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="ml-8 space-y-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-4 h-4 bg-purple-500 rounded"></div>
                                            <div className="bg-white rounded-lg p-2 border border-gray-200 flex-1">
                                                <div className="text-xs font-medium text-black">Create visualization</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-4 h-4 bg-orange-500 rounded"></div>
                                            <div className="bg-white rounded-lg p-2 border border-gray-200 flex-1">
                                                <div className="text-xs font-medium text-black">Generate insights</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Connecting lines */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{zIndex: 1}}>
                                    <path d="M 40 40 L 40 80 L 44 80 L 44 120 L 52 120 L 52 140" stroke="#e5e7eb" strokeWidth="2" fill="none" strokeDasharray="3,3"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Chart Showcase */}
                    <div className="mb-16">
                        <div className="text-center mb-12">
                            <h3 className="text-2xl font-bold mb-4 text-black">Create any chart instantly</h3>
                            <p className="text-gray-600">AI-powered visualization for every data type</p>
                        </div>

                        {/* Infinite Chart Carousel */}
                        <div className="relative overflow-hidden">
                            <div className="flex space-x-8 animate-infinite-chart-scroll">
                                {/* Chart 1 - Revenue */}
                                <div className="flex-shrink-0 w-80 bg-white rounded-xl border border-gray-200 p-6">
                                    <div className="mb-4">
                                        <h4 className="font-semibold text-black">Total Revenue</h4>
                                        <div className="text-2xl font-bold text-black">$15,231.89</div>
                                        <div className="text-sm text-green-600">+20.1% from last month</div>
                                    </div>
                                    <div className="h-20">
                                        <svg className="w-full h-full" viewBox="0 0 300 80">
                                            <path d="M 0 60 L 50 50 L 100 55 L 150 45 L 200 35 L 250 25 L 300 20" stroke="#000" strokeWidth="2" fill="none"/>
                                            <circle cx="0" cy="60" r="3" fill="#000"/>
                                            <circle cx="50" cy="50" r="3" fill="#000"/>
                                            <circle cx="100" cy="55" r="3" fill="#000"/>
                                            <circle cx="150" cy="45" r="3" fill="#000"/>
                                            <circle cx="200" cy="35" r="3" fill="#000"/>
                                            <circle cx="250" cy="25" r="3" fill="#000"/>
                                            <circle cx="300" cy="20" r="3" fill="#000"/>
                                        </svg>
                                    </div>
                                </div>

                                {/* Chart 2 - Subscriptions */}
                                <div className="flex-shrink-0 w-80 bg-white rounded-xl border border-gray-200 p-6">
                                    <div className="mb-4">
                                        <h4 className="font-semibold text-black">Subscriptions</h4>
                                        <div className="text-2xl font-bold text-black">+2,350</div>
                                        <div className="text-sm text-green-600">+180.1% from last month</div>
                                    </div>
                                    <div className="h-20">
                                        <svg className="w-full h-full" viewBox="0 0 300 80">
                                            <path d="M 0 70 L 50 65 L 100 40 L 150 30 L 200 50 L 250 25 L 300 35" stroke="#000" strokeWidth="2" fill="none"/>
                                            <circle cx="0" cy="70" r="3" fill="#000"/>
                                            <circle cx="50" cy="65" r="3" fill="#000"/>
                                            <circle cx="100" cy="40" r="3" fill="#000"/>
                                            <circle cx="150" cy="30" r="3" fill="#000"/>
                                            <circle cx="200" cy="50" r="3" fill="#000"/>
                                            <circle cx="250" cy="25" r="3" fill="#000"/>
                                            <circle cx="300" cy="35" r="3" fill="#000"/>
                                        </svg>
                                    </div>
                                </div>

                                {/* Chart 3 - Bar Chart */}
                                <div className="flex-shrink-0 w-80 bg-white rounded-xl border border-gray-200 p-6">
                                    <div className="mb-4">
                                        <h4 className="font-semibold text-black">Sales by Region</h4>
                                        <div className="text-2xl font-bold text-black">4 regions</div>
                                        <div className="text-sm text-blue-600">Updated now</div>
                                    </div>
                                    <div className="h-20 flex items-end space-x-2">
                                        <div className="w-8 h-16 bg-black rounded-t"></div>
                                        <div className="w-8 h-12 bg-black rounded-t"></div>
                                        <div className="w-8 h-20 bg-black rounded-t"></div>
                                        <div className="w-8 h-8 bg-black rounded-t"></div>
                                        <div className="w-8 h-14 bg-black rounded-t"></div>
                                        <div className="w-8 h-10 bg-black rounded-t"></div>
                                    </div>
                                </div>

                                {/* Chart 4 - Pie Chart */}
                                <div className="flex-shrink-0 w-80 bg-white rounded-xl border border-gray-200 p-6">
                                    <div className="mb-4">
                                        <h4 className="font-semibold text-black">User Distribution</h4>
                                        <div className="text-2xl font-bold text-black">100%</div>
                                        <div className="text-sm text-gray-600">Active users</div>
                                    </div>
                                    <div className="h-20 flex items-center justify-center">
                                        <svg className="w-16 h-16" viewBox="0 0 64 64">
                                            <circle cx="32" cy="32" r="16" fill="none" stroke="#f3f4f6" strokeWidth="32"/>
                                            <circle cx="32" cy="32" r="16" fill="none" stroke="#000" strokeWidth="32" strokeDasharray="60 40" strokeDashoffset="25"/>
                                            <circle cx="32" cy="32" r="16" fill="none" stroke="#6b7280" strokeWidth="32" strokeDasharray="25 75" strokeDashoffset="85"/>
                                        </svg>
                                    </div>
                                </div>

                                {/* Chart 5 - Area Chart */}
                                <div className="flex-shrink-0 w-80 bg-white rounded-xl border border-gray-200 p-6">
                                    <div className="mb-4">
                                        <h4 className="font-semibold text-black">Growth Trend</h4>
                                        <div className="text-2xl font-bold text-black">↗ 24.5%</div>
                                        <div className="text-sm text-green-600">Trending up</div>
                                    </div>
                                    <div className="h-20">
                                        <svg className="w-full h-full" viewBox="0 0 300 80">
                                            <defs>
                                                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                    <stop offset="0%" style={{stopColor: '#000', stopOpacity: 0.1}} />
                                                    <stop offset="100%" style={{stopColor: '#000', stopOpacity: 0}} />
                                                </linearGradient>
                                            </defs>
                                            <path d="M 0 60 L 50 50 L 100 40 L 150 30 L 200 25 L 250 20 L 300 15 L 300 80 L 0 80 Z" fill="url(#areaGradient)"/>
                                            <path d="M 0 60 L 50 50 L 100 40 L 150 30 L 200 25 L 250 20 L 300 15" stroke="#000" strokeWidth="2" fill="none"/>
                                        </svg>
                                    </div>
                                </div>

                                {/* Chart 6 - Scatter Plot */}
                                <div className="flex-shrink-0 w-80 bg-white rounded-xl border border-gray-200 p-6">
                                    <div className="mb-4">
                                        <h4 className="font-semibold text-black">Data Points</h4>
                                        <div className="text-2xl font-bold text-black">847</div>
                                        <div className="text-sm text-gray-600">Analyzed</div>
                                    </div>
                                    <div className="h-20 relative">
                                        <svg className="w-full h-full" viewBox="0 0 300 80">
                                            <circle cx="30" cy="60" r="2" fill="#000"/>
                                            <circle cx="60" cy="45" r="2" fill="#000"/>
                                            <circle cx="90" cy="50" r="2" fill="#000"/>
                                            <circle cx="120" cy="30" r="2" fill="#000"/>
                                            <circle cx="150" cy="40" r="2" fill="#000"/>
                                            <circle cx="180" cy="25" r="2" fill="#000"/>
                                            <circle cx="210" cy="35" r="2" fill="#000"/>
                                            <circle cx="240" cy="20" r="2" fill="#000"/>
                                            <circle cx="270" cy="30" r="2" fill="#000"/>
                                            <circle cx="45" cy="55" r="2" fill="#000"/>
                                            <circle cx="75" cy="40" r="2" fill="#000"/>
                                            <circle cx="105" cy="35" r="2" fill="#000"/>
                                            <circle cx="135" cy="45" r="2" fill="#000"/>
                                            <circle cx="165" cy="30" r="2" fill="#000"/>
                                            <circle cx="195" cy="40" r="2" fill="#000"/>
                                            <circle cx="225" cy="25" r="2" fill="#000"/>
                                            <circle cx="255" cy="35" r="2" fill="#000"/>
                                        </svg>
                                    </div>
                                </div>

                                {/* Duplicate set for seamless loop */}
                                <div className="flex-shrink-0 w-80 bg-white rounded-xl border border-gray-200 p-6">
                                    <div className="mb-4">
                                        <h4 className="font-semibold text-black">Total Revenue</h4>
                                        <div className="text-2xl font-bold text-black">$15,231.89</div>
                                        <div className="text-sm text-green-600">+20.1% from last month</div>
                                    </div>
                                    <div className="h-20">
                                        <svg className="w-full h-full" viewBox="0 0 300 80">
                                            <path d="M 0 60 L 50 50 L 100 55 L 150 45 L 200 35 L 250 25 L 300 20" stroke="#000" strokeWidth="2" fill="none"/>
                                            <circle cx="0" cy="60" r="3" fill="#000"/>
                                            <circle cx="50" cy="50" r="3" fill="#000"/>
                                            <circle cx="100" cy="55" r="3" fill="#000"/>
                                            <circle cx="150" cy="45" r="3" fill="#000"/>
                                            <circle cx="200" cy="35" r="3" fill="#000"/>
                                            <circle cx="250" cy="25" r="3" fill="#000"/>
                                            <circle cx="300" cy="20" r="3" fill="#000"/>
                                        </svg>
                                    </div>
                                </div>

                                <div className="flex-shrink-0 w-80 bg-white rounded-xl border border-gray-200 p-6">
                                    <div className="mb-4">
                                        <h4 className="font-semibold text-black">Subscriptions</h4>
                                        <div className="text-2xl font-bold text-black">+2,350</div>
                                        <div className="text-sm text-green-600">+180.1% from last month</div>
                                    </div>
                                    <div className="h-20">
                                        <svg className="w-full h-full" viewBox="0 0 300 80">
                                            <path d="M 0 70 L 50 65 L 100 40 L 150 30 L 200 50 L 250 25 L 300 35" stroke="#000" strokeWidth="2" fill="none"/>
                                            <circle cx="0" cy="70" r="3" fill="#000"/>
                                            <circle cx="50" cy="65" r="3" fill="#000"/>
                                            <circle cx="100" cy="40" r="3" fill="#000"/>
                                            <circle cx="150" cy="30" r="3" fill="#000"/>
                                            <circle cx="200" cy="50" r="3" fill="#000"/>
                                            <circle cx="250" cy="25" r="3" fill="#000"/>
                                            <circle cx="300" cy="35" r="3" fill="#000"/>
                                        </svg>
                                    </div>
                                </div>

                                <div className="flex-shrink-0 w-80 bg-white rounded-xl border border-gray-200 p-6">
                                    <div className="mb-4">
                                        <h4 className="font-semibold text-black">Sales by Region</h4>
                                        <div className="text-2xl font-bold text-black">4 regions</div>
                                        <div className="text-sm text-blue-600">Updated now</div>
                                    </div>
                                    <div className="h-20 flex items-end space-x-2">
                                        <div className="w-8 h-16 bg-black rounded-t"></div>
                                        <div className="w-8 h-12 bg-black rounded-t"></div>
                                        <div className="w-8 h-20 bg-black rounded-t"></div>
                                        <div className="w-8 h-8 bg-black rounded-t"></div>
                                        <div className="w-8 h-14 bg-black rounded-t"></div>
                                        <div className="w-8 h-10 bg-black rounded-t"></div>
                                    </div>
                                </div>

                                <div className="flex-shrink-0 w-80 bg-white rounded-xl border border-gray-200 p-6">
                                    <div className="mb-4">
                                        <h4 className="font-semibold text-black">User Distribution</h4>
                                        <div className="text-2xl font-bold text-black">100%</div>
                                        <div className="text-sm text-gray-600">Active users</div>
                                    </div>
                                    <div className="h-20 flex items-center justify-center">
                                        <svg className="w-16 h-16" viewBox="0 0 64 64">
                                            <circle cx="32" cy="32" r="16" fill="none" stroke="#f3f4f6" strokeWidth="32"/>
                                            <circle cx="32" cy="32" r="16" fill="none" stroke="#000" strokeWidth="32" strokeDasharray="60 40" strokeDashoffset="25"/>
                                            <circle cx="32" cy="32" r="16" fill="none" stroke="#6b7280" strokeWidth="32" strokeDasharray="25 75" strokeDashoffset="85"/>
                                        </svg>
                                    </div>
                                </div>

                                <div className="flex-shrink-0 w-80 bg-white rounded-xl border border-gray-200 p-6">
                                    <div className="mb-4">
                                        <h4 className="font-semibold text-black">Growth Trend</h4>
                                        <div className="text-2xl font-bold text-black">↗ 24.5%</div>
                                        <div className="text-sm text-green-600">Trending up</div>
                                    </div>
                                    <div className="h-20">
                                        <svg className="w-full h-full" viewBox="0 0 300 80">
                                            <defs>
                                                <linearGradient id="areaGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                                                    <stop offset="0%" style={{stopColor: '#000', stopOpacity: 0.1}} />
                                                    <stop offset="100%" style={{stopColor: '#000', stopOpacity: 0}} />
                                                </linearGradient>
                                            </defs>
                                            <path d="M 0 60 L 50 50 L 100 40 L 150 30 L 200 25 L 250 20 L 300 15 L 300 80 L 0 80 Z" fill="url(#areaGradient2)"/>
                                            <path d="M 0 60 L 50 50 L 100 40 L 150 30 L 200 25 L 250 20 L 300 15" stroke="#000" strokeWidth="2" fill="none"/>
                                        </svg>
                                    </div>
                                </div>

                                <div className="flex-shrink-0 w-80 bg-white rounded-xl border border-gray-200 p-6">
                                    <div className="mb-4">
                                        <h4 className="font-semibold text-black">Data Points</h4>
                                        <div className="text-2xl font-bold text-black">847</div>
                                        <div className="text-sm text-gray-600">Analyzed</div>
                                    </div>
                                    <div className="h-20 relative">
                                        <svg className="w-full h-full" viewBox="0 0 300 80">
                                            <circle cx="30" cy="60" r="2" fill="#000"/>
                                            <circle cx="60" cy="45" r="2" fill="#000"/>
                                            <circle cx="90" cy="50" r="2" fill="#000"/>
                                            <circle cx="120" cy="30" r="2" fill="#000"/>
                                            <circle cx="150" cy="40" r="2" fill="#000"/>
                                            <circle cx="180" cy="25" r="2" fill="#000"/>
                                            <circle cx="210" cy="35" r="2" fill="#000"/>
                                            <circle cx="240" cy="20" r="2" fill="#000"/>
                                            <circle cx="270" cy="30" r="2" fill="#000"/>
                                            <circle cx="45" cy="55" r="2" fill="#000"/>
                                            <circle cx="75" cy="40" r="2" fill="#000"/>
                                            <circle cx="105" cy="35" r="2" fill="#000"/>
                                            <circle cx="135" cy="45" r="2" fill="#000"/>
                                            <circle cx="165" cy="30" r="2" fill="#000"/>
                                            <circle cx="195" cy="40" r="2" fill="#000"/>
                                            <circle cx="225" cy="25" r="2" fill="#000"/>
                                            <circle cx="255" cy="35" r="2" fill="#000"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Data Sources Section */}
                <section className="py-20 max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4 text-black animate-on-scroll">Connect any type of data</h2>
                        <p className="text-xl text-gray-600 animate-on-scroll">Sync data from databases, files, and APIs for a real-time single source of truth</p>
                        </div>

                    {/* Infinite Carousel */}
                    <div className="relative overflow-hidden">
                        {/* Fade edges */}
                        <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
                        <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
                        
                        {/* First Row - Moving Right */}
                        <div className="flex space-x-12 mb-8 animate-infinite-scroll">
                            <div className="flex space-x-12 min-w-max">
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/34/Microsoft_Office_Excel_%282019%E2%80%93present%29.svg" alt="Excel" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                            </div>
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/29/Postgresql_elephant.svg" alt="PostgreSQL" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                            </div>
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/9/93/MongoDB_Logo.svg" alt="MongoDB" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                        </div>
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/0/0a/MySQL_textlogo.svg" alt="MySQL" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                    </div>
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg" alt="PDF" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg" alt="Google Cloud" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                            </div>
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/34/Microsoft_Office_Excel_%282019%E2%80%93present%29.svg" alt="Excel" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                            </div>
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/29/Postgresql_elephant.svg" alt="PostgreSQL" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                        </div>
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/9/93/MongoDB_Logo.svg" alt="MongoDB" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                    </div>
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/0/0a/MySQL_textlogo.svg" alt="MySQL" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg" alt="PDF" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                            </div>
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg" alt="Google Cloud" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            </div>

                        {/* Second Row - Moving Left */}
                        <div className="flex space-x-12 animate-infinite-scroll-reverse">
                            <div className="flex space-x-12 min-w-max">
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg" alt="AWS" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                            </div>
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Microsoft_Azure.svg" alt="Azure" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                            </div>
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/en/0/04/Salesforce_logo.svg" alt="Salesforce" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                        </div>
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" alt="Slack" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                    </div>
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/38/SQLite370.svg" alt="SQLite" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/f/f3/Apache_Spark_logo.svg" alt="Apache Spark" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                            </div>
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg" alt="AWS" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                            </div>
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Microsoft_Azure.svg" alt="Azure" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                        </div>
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/en/0/04/Salesforce_logo.svg" alt="Salesforce" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                    </div>
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" alt="Slack" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/38/SQLite370.svg" alt="SQLite" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                            </div>
                                <div className="p-4 hover:scale-105 transition-transform flex-shrink-0">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/f/f3/Apache_Spark_logo.svg" alt="Apache Spark" className="w-16 h-16 mx-auto opacity-60 hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="py-20 bg-gray-50">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div className="animate-on-scroll">
                                <h2 className="text-4xl font-bold mb-6 text-black leading-tight">
                                    The system of action for the next generation. <span className="text-gray-600">QuokkaAI is built for scale.</span> Our customers sort through millions of records with sub-50ms latency.
                            </h2>
                                
                                <div className="grid grid-cols-2 gap-8 mt-12">
                                    <div>
                                        <div className="text-3xl font-bold text-black mb-1">2,000,000</div>
                                        <div className="text-sm text-gray-600 uppercase tracking-wide">Data points processed</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-black mb-1">500+</div>
                                        <div className="text-sm text-gray-600 uppercase tracking-wide">Chart types</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-black mb-1">10,000+</div>
                                        <div className="text-sm text-gray-600 uppercase tracking-wide">Visualizations</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-black mb-1">99.9%</div>
                                        <div className="text-sm text-gray-600 uppercase tracking-wide">Uptime</div>
                                    </div>
                            </div>
                        </div>

                            <div className="animate-on-scroll">
                                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 relative overflow-hidden">
                                    <div className="absolute top-6 left-6 text-xs text-gray-500 uppercase tracking-wide">Growth • Delivery</div>
                                    
                                    {/* Growth curve */}
                                    <div className="mt-16 relative h-64">
                                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                                            <defs>
                                                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                    <stop offset="0%" style={{stopColor: '#e5e7eb', stopOpacity: 0.3}} />
                                                    <stop offset="100%" style={{stopColor: '#e5e7eb', stopOpacity: 0}} />
                                                </linearGradient>
                                            </defs>
                                            <path 
                                                d="M 0 180 Q 100 160 200 120 T 400 40" 
                                                stroke="#6b7280" 
                                                strokeWidth="2" 
                                                fill="none"
                                        />
                                            <path 
                                                d="M 0 180 Q 100 160 200 120 T 400 40 L 400 200 L 0 200 Z" 
                                                fill="url(#gradient)"
                                        />
                                        </svg>

                                        {/* Data points */}
                                        <div className="absolute bottom-4 left-4">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                    </div>
                                        <div className="absolute bottom-8 left-1/4">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                    </div>
                                        <div className="absolute bottom-16 left-1/2">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                    </div>
                                        <div className="absolute bottom-24 right-1/4">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                    </div>
                                        <div className="absolute bottom-32 right-4">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                    </div>
                                    </div>
                                </div>
                                    </div>
                        </div>
                    </div>
                </section>

                                {/* How It Works Section */}
                <section id="how-it-works" className="py-20 bg-white">
                    <div className="max-w-6xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <div className="w-12 h-1 bg-blue-500 mx-auto mb-6"></div>
                            <h2 className="text-4xl font-bold mb-4 text-black animate-on-scroll">How it works</h2>
                            <p className="text-lg text-gray-600 animate-on-scroll max-w-2xl mx-auto">
                                Transform your data into actionable insights with our simple three-step process
                            </p>
                        </div>
                        
                        <div className="relative">
                            {/* Connecting Line */}
                            <div className="hidden md:block absolute top-20 left-0 right-0 h-0.5">
                                <svg className="w-full h-full" viewBox="0 0 800 2" preserveAspectRatio="none">
                                    <path 
                                        d="M 0 1 Q 200 1 400 1 T 800 1" 
                                        stroke="#e5e7eb" 
                                        strokeWidth="2" 
                                        fill="none"
                                        strokeDasharray="5,5"
                                    />
                                </svg>
                            </div>
                            
                            <div className="grid md:grid-cols-3 gap-12 relative">
                                {[
                                    {
                                        title: "Upload data",
                                        description: "Connect databases, upload files, or integrate with your existing tools",
                                        icon: (
                                            <div className="w-16 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                                                <div className="space-y-1">
                                                    <div className="w-8 h-1 bg-green-500 rounded"></div>
                                                    <div className="w-6 h-1 bg-gray-400 rounded"></div>
                                                    <div className="w-7 h-1 bg-gray-400 rounded"></div>
                                                </div>
                                            </div>
                                        )
                                    },
                                    {
                                        title: "AI processes",
                                        description: "Our advanced algorithms analyze patterns and extract meaningful insights",
                                        icon: (
                                            <div className="w-16 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                                                <div className="grid grid-cols-3 gap-1">
                                                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                                                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                                                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                                                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                                                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                                                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                                                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                                                </div>
                                            </div>
                                        )
                                    },
                                    {
                                        title: "Get insights",
                                        description: "Receive beautiful visualizations and actionable reports instantly",
                                        icon: (
                                            <div className="w-16 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                                                <div className="flex items-end space-x-1">
                                                    <div className="w-1 h-3 bg-blue-500 rounded"></div>
                                                    <div className="w-1 h-5 bg-blue-500 rounded"></div>
                                                    <div className="w-1 h-2 bg-blue-500 rounded"></div>
                                                    <div className="w-1 h-6 bg-blue-500 rounded"></div>
                                                    <div className="w-1 h-4 bg-blue-500 rounded"></div>
                                                </div>
                                            </div>
                                        )
                                    }
                                ].map((step, index) => (
                                    <div key={index} className="text-center animate-on-scroll relative">
                                        {/* Step Number */}
                                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-sm font-semibold text-gray-600 z-10">
                                            {index + 1}
                                        </div>
                                        
                                        {/* Icon */}
                                        <div className="flex justify-center mt-6">
                                            {step.icon}
                                        </div>
                                        
                                        {/* Content */}
                                        <h3 className="text-xl font-semibold mb-3 text-black">{step.title}</h3>
                                        <p className="text-gray-600 leading-relaxed">{step.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-20 max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4 text-black animate-on-scroll">Simple pricing</h2>
                        <p className="text-xl text-gray-600 animate-on-scroll">Choose the plan that's right for you</p>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {[
                            {
                                name: "Free",
                                price: "$0",
                                period: "",
                                description: "Perfect for small teams and individuals",
                                features: ["Up to 10 data sources", "Basic visualizations", "20MB storage", "Email support"],
                                popular: false
                            },
                            {
                                name: "Pro",
                                price: "$10",
                                period: "/month",
                                description: "For growing businesses and professionals",
                                features: ["Unlimited data sources", "Advanced visualizations", "500MB storage", "Priority support", "Custom reports"],
                                popular: true
                            },
                            {
                                name: "Enterprise",
                                price: "Lets discuss",
                                period: "",
                                description: "For large organizations",
                                features: ["Everything in Professional", "Unlimited storage", "24/7 support", "Custom integrations", "On-premise deployment", "Custom reports"],
                                popular: false
                            }
                        ].map((plan, index) => (
                            <div key={index} className={`relative bg-white p-8 rounded-xl border transition-all duration-300 hover:shadow-lg animate-on-scroll ${
                                plan.popular ? 'border-black' : 'border-gray-200'
                            }`}>
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                        <span className="bg-black text-white px-4 py-1 rounded-full text-sm font-medium">Most Popular</span>
                                    </div>
                                )}
                                <div className="text-center mb-8">
                                    <h3 className="text-xl font-semibold mb-2 text-black">{plan.name}</h3>
                                    <div className="mb-4">
                                        <span className="text-4xl font-bold text-black">{plan.price}</span>
                                        <span className="text-gray-600">{plan.period}</span>
                                    </div>
                                    <p className="text-gray-600">{plan.description}</p>
                                </div>
                                <ul className="space-y-3 mb-8">
                                    {plan.features.map((feature, featureIndex) => (
                                        <li key={featureIndex} className="flex items-center space-x-3">
                                            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                                                <span className="text-green-600 text-sm">✓</span>
                                            </div>
                                            <span className="text-gray-700">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button className={`w-full py-3 rounded-lg font-medium transition-colors ${
                                    plan.popular 
                                        ? 'bg-black text-white hover:bg-gray-800' 
                                        : 'border border-gray-300 text-black hover:border-gray-400'
                                }`}>
                                    Get Started
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-32 bg-white relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="grid grid-cols-24 gap-2 transform -rotate-12 scale-150">
                            {Array.from({ length: 600 }, (_, i) => (
                                <div
                                    key={i}
                                    className="w-2 h-2 bg-gray-300 rounded-sm"
                                    style={{
                                        opacity: Math.random() * 0.4 + 0.1,
                                        animationDelay: `${Math.random() * 3}s`,
                                        animation: `pulse ${3 + Math.random() * 4}s ease-in-out infinite`
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                    
                    {/* Content */}
                    <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                        <h2 className="text-5xl md:text-6xl font-bold mb-4 text-black leading-tight animate-on-scroll">
                            Ready to transform <br />
                            <span className="text-gray-600">your data?</span>
                        </h2>
                        
                        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12 animate-fade-in-delay">
                            <Link to="/chat" className="bg-black text-white px-8 py-4 rounded-lg hover:bg-gray-800 transition-colors text-lg font-medium">
                                Start for free
                            </Link>
                            <button className="text-gray-600 hover:text-black transition-colors px-8 py-4 text-lg font-medium border border-gray-300 rounded-lg hover:border-gray-400">
                                Talk to sales
                    </button>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-gray-200 py-12 bg-white">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="flex flex-col md:flex-row justify-between items-center">
                            <div className="flex items-center space-x-3 mb-4 md:mb-0">
                                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                                    <img 
                                        src={logo3} 
                                        alt="QuokkaAI Logo" 
                                        className="w-6 h-6 object-contain"
                                    />
                                </div>
                                <span className="text-xl font-semibold text-black">quokkaAI</span>
                            </div>
                            <div className="text-gray-600 text-sm">
                                © 2024 QuokkaAI. All rights reserved.
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}