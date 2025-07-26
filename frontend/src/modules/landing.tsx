import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguageStore } from '../shared/stores/languageStore';
import { LanguageSwitcher } from '../shared/components/LanguageSwitcher';
import { ProSubscriptionModal } from '../shared/components/ProSubscriptionModal';
import { EnterpriseContactModal } from '../shared/components/EnterpriseContactModal';
import logo3 from '../assets/logo3.png';

export const Landing = () => {
    const { t } = useLanguageStore();
    const navigate = useNavigate();
    const [scrollY, setScrollY] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isProModalOpen, setIsProModalOpen] = useState(false);
    const [isEnterpriseModalOpen, setIsEnterpriseModalOpen] = useState(false);
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

    const handlePricingClick = (planType: 'free' | 'pro' | 'enterprise') => {
        switch (planType) {
            case 'free':
                navigate('/auth');
                break;
            case 'pro':
                setIsProModalOpen(true);
                break;
            case 'enterprise':
                setIsEnterpriseModalOpen(true);
                break;
        }
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
                    animation: infinite-scroll 25s linear infinite;
                }

                .animate-infinite-scroll:hover {
                    animation-play-state: paused;
                }

                .animate-infinite-scroll-reverse {
                    animation: infinite-scroll-reverse 30s linear infinite;
                }

                .animate-infinite-scroll-reverse:hover {
                    animation-play-state: paused;
                }

                .animate-infinite-chart-scroll {
                    animation: chart-scroll 35s linear infinite;
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
            
            <div className="min-h-screen bg-white text-black overflow-x-hidden">
                {/* Navigation */}
                <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
                    scrollY > 50 ? 'bg-white/90 backdrop-blur-md border-b border-gray-200' : 'bg-white'
                }`}>
                                            <div className="flex justify-between items-center px-4 py-3 max-w-6xl mx-auto safe-area-inset-left safe-area-inset-right">
                        <div className="flex items-center space-x-3 animate-fade-in-up">
                            <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
                                <img 
                                    src={logo3} 
                                    alt="QuokkaAI Logo" 
                                    className="w-5 h-5 object-contain"
                                />
                            </div>
                            <span className="text-lg font-semibold text-black">quokkaAI</span>
                        </div>
                        
                        {/* Desktop Navigation */}
                        <div className="hidden lg:flex items-center space-x-8">
                            <button onClick={() => scrollToSection('features')} className="text-gray-600 hover:text-black transition-colors">{t('nav.features')}</button>
                            <button onClick={() => scrollToSection('how-it-works')} className="text-gray-600 hover:text-black transition-colors">{t('nav.howItWorks')}</button>
                            <button onClick={() => scrollToSection('pricing')} className="text-gray-600 hover:text-black transition-colors">{t('nav.pricing')}</button>
                            <div className="flex items-center space-x-4 ml-8">
                                <LanguageSwitcher />
                                <Link to="/auth" className="text-gray-600 hover:text-black transition-colors">{t('nav.signIn')}</Link>
                                <Link to="/chat" className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                                    {t('nav.startForFree')}
                            </Link>
                            </div>
                        </div>
                        
                        {/* Mobile Navigation */}
                        <div className="lg:hidden flex items-center space-x-2">
                            <LanguageSwitcher variant="ghost" className="h-8 w-8 p-1" />
                            <button 
                                className="p-2"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            >
                                <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                                    <div className={`w-full h-0.5 bg-black transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
                                    <div className={`w-full h-0.5 bg-black transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`}></div>
                                    <div className={`w-full h-0.5 bg-black transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
                                </div>
                            </button>
                        </div>
                    </div>
                    
                    {/* Mobile Menu */}
                    <div className={`lg:hidden transition-all duration-300 ${mobileMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden bg-white border-t border-gray-200`}>
                        <div className="px-4 py-4 space-y-3 safe-area-inset-left safe-area-inset-right">
                            <button onClick={() => scrollToSection('features')} className="block w-full text-left py-2 text-gray-600 hover:text-black transition-colors">{t('nav.features')}</button>
                            <button onClick={() => scrollToSection('how-it-works')} className="block w-full text-left py-2 text-gray-600 hover:text-black transition-colors">{t('nav.howItWorks')}</button>
                            <button onClick={() => scrollToSection('pricing')} className="block w-full text-left py-2 text-gray-600 hover:text-black transition-colors">{t('nav.pricing')}</button>
                            <div className="pt-4 space-y-3">
                                <Link to="/auth" className="block w-full text-center py-2 text-gray-600 hover:text-black transition-colors border border-gray-300 rounded-lg">
                                    {t('nav.signIn')}
                                </Link>
                                <Link to="/chat" className="block w-full text-center bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors">
                                    {t('nav.startForFree')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <section className="pt-24 pb-16 max-w-3xl mx-auto px-4 text-center safe-area-inset-left safe-area-inset-right">
                    <div className="mb-6 animate-fade-in-up">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-black leading-tight">
                            {t('landing.hero.title')}
                        </h1>
                        <p className="text-lg text-gray-600 mb-6 max-w-xl mx-auto leading-relaxed">
                            {t('landing.hero.subtitle')}
                    </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in-delay">
                            <Link to="/chat" className="bg-black text-white px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
                                {t('landing.hero.getStarted')}
                        </Link>
                            <button 
                                onClick={() => setIsEnterpriseModalOpen(true)}
                                className="text-gray-600 hover:text-black transition-colors px-5 py-2.5"
                            >
                                {t('landing.hero.talkToSales')}
                        </button>
                    </div>
                    </div>
                </section>

                                {/* Main Dashboard Preview */}
                <section className="py-8 md:py-16 max-w-6xl mx-auto px-4 md:px-4">
                    <div className="bg-gray-50 rounded-lg md:rounded-xl p-3 md:p-6 data-grid animate-on-scroll">
                        {/* macOS Window */}
                        <div className="bg-white rounded-lg md:rounded-xl shadow-xl md:shadow-2xl border border-gray-200 overflow-hidden max-h-80 md:max-h-none">
                            {/* macOS Title Bar */}
                            <div className="bg-gray-100 border-b border-gray-200 p-2 md:p-4 flex items-center">
                                <div className="flex items-center space-x-1 md:space-x-2">
                                    <div className="w-2 h-2 md:w-3 md:h-3 bg-red-500 rounded-full"></div>
                                    <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-500 rounded-full"></div>
                                    <div className="w-2 h-2 md:w-3 md:h-3 bg-green-500 rounded-full"></div>
                    </div>
                                <div className="flex-1 text-center">
                                    <div className="flex items-center justify-center space-x-1 md:space-x-2">
                                        <div className="w-3 h-3 md:w-4 md:h-4 bg-black rounded flex items-center justify-center">
                                            <img 
                                                src={logo3} 
                                                alt="QuokkaAI Logo" 
                                                className="w-2 h-2 md:w-3 md:h-3 object-contain"
                                            />
                                </div>
                                        <span className="text-xs md:text-sm font-medium text-gray-700">{t('dashboard.title')}</span>
                                    </div>
                                        </div>
                                    </div>
                                    
                            {/* Dashboard Content */}
                            <div className="flex flex-col md:flex-row overflow-hidden">
                                {/* Left Sidebar */}
                                <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-gray-200 p-2 md:p-4">
                                    <div className="mb-2 md:mb-4">
                                        <div className="flex items-center space-x-2 mb-2 md:mb-3">
                                            <div className="w-5 h-5 md:w-6 md:h-6 bg-black rounded-lg flex items-center justify-center">
                                                <img 
                                                    src={logo3} 
                                                    alt="QuokkaAI Logo" 
                                                    className="w-3 h-3 md:w-4 md:h-4 object-contain"
                                                />
                                        </div>
                                            <div>
                                                <h3 className="text-xs md:text-sm font-semibold text-black">quokkaAI</h3>
                                                <p className="text-xs text-gray-600 hidden md:block">Data Analysis Assistant</p>
                                        </div>
                                            </div>
                                            </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-4 md:grid-cols-2 gap-2 md:gap-3 mb-2 md:mb-4">
                                        <div className="bg-gray-50 rounded-lg p-1.5 md:p-2">
                                            <div className="text-sm md:text-base font-bold text-black">5</div>
                                            <div className="text-xs text-gray-600">{t('dashboard.totalChats')}</div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-1.5 md:p-2">
                                            <div className="text-sm md:text-base font-bold text-black">8</div>
                                            <div className="text-xs text-gray-600">{t('dashboard.documents')}</div>
                                    </div>
                                        <div className="bg-gray-50 rounded-lg p-1.5 md:p-2">
                                            <div className="text-sm md:text-base font-bold text-green-600">0</div>
                                            <div className="text-xs text-gray-600">{t('dashboard.activeToday')}</div>
                                </div>
                                        <div className="bg-gray-50 rounded-lg p-1.5 md:p-2">
                                            <div className="text-sm md:text-base font-bold text-blue-600">52</div>
                                            <div className="text-xs text-gray-600">{t('dashboard.analyses')}</div>
                            </div>
                        </div>

                                    {/* New Analysis Button */}
                                    <button className="w-full bg-black text-white rounded-lg py-1.5 md:py-2 mb-2 md:mb-4 text-xs md:text-sm font-medium">
                                        {t('dashboard.newAnalysis')}
                                    </button>

                                    {/* Recent Analyses - Hidden on mobile */}
                                    <div className="hidden md:block">
                                        <h4 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">{t('dashboard.recentAnalyses')}</h4>
                                        <div className="space-y-2">
                                            {[
                                                { title: t('dashboard.ready'), date: "07.07.2025", messages: `10 ${t('dashboard.messages')}` },
                                                { title: t('dashboard.ready'), date: "07.07.2025", messages: `6 ${t('dashboard.messages')}` }
                                            ].map((item, index) => (
                                                <div key={index} className="bg-gray-50 rounded-lg p-2">
                                                    <div className="flex items-center space-x-2 mb-1">
                                                        <div className="w-3 h-3 bg-gray-300 rounded"></div>
                                                        <h5 className="text-xs font-medium text-black truncate">{item.title}</h5>
                                                    </div>
                                                    <div className="text-xs text-gray-500">{item.date} • {item.messages}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Main Content Area */}
                                <div className="flex-1 p-2 md:p-4">
                                    {/* Header - Hidden on mobile */}
                                        <div className="hidden md:flex items-center justify-between mb-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                                                <img 
                                                    src={logo3} 
                                                    alt="QuokkaAI Logo" 
                                                    className="w-6 h-6 object-contain"
                                                />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-black">quokkaAI</h3>
                                                <p className="text-sm text-gray-600">Data Analysis Assistant</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <span className="text-sm text-gray-600">Live</span>
                                        </div>
                                    </div>
                                    
                                    {/* AI Message */}
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 md:p-4 mb-3 md:mb-6">
                                        <div className="flex items-start space-x-2">
                                            <span className="text-yellow-600">💡</span>
                                            <p className="text-xs md:text-sm text-gray-800">{t('dashboard.ready')}</p>
                                        </div>
                                            </div>

                                    {/* Chart */}
                                    <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
                                        <h4 className="text-sm md:text-lg font-semibold text-black mb-3 md:mb-4">{t('dashboard.operatorsByGroups')}</h4>
                                        
                                        {/* Chart Area */}
                                        <div className="h-32 md:h-64 relative">
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
                                                <circle cx="60" cy="40" r="3" fill="#8b5cf6" stroke="white" strokeWidth="2"/>
                                                <circle cx="200" cy="60" r="3" fill="#8b5cf6" stroke="white" strokeWidth="2"/>
                                                <circle cx="400" cy="100" r="3" fill="#8b5cf6" stroke="white" strokeWidth="2"/>
                                                <circle cx="540" cy="100" r="3" fill="#8b5cf6" stroke="white" strokeWidth="2"/>
                                            </svg>
                                            
                                            {/* X-axis labels - Simplified for mobile */}
                                            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 px-4 md:px-12">
                                                <span className="hidden md:inline">{t('dashboard.dgdKazRuEco')}</span>
                                <span className="md:hidden">ЭКО</span>
                                <span className="hidden md:inline">{t('dashboard.dgdKazRuAlmaty')}</span>
                                <span className="md:hidden">Алматы</span>
                                <span className="hidden md:inline">{t('dashboard.dgdKazRuPavlodar')}</span>
                                                <span className="md:hidden">Павлодар</span>
                                        </div>
                                    </div>
                                        
                                        {/* Legend */}
                                        <div className="flex items-center justify-center mt-2 md:mt-4">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-3 h-0.5 bg-purple-500"></div>
                                                <span className="text-xs md:text-sm text-gray-600">{t('dashboard.operatorsCount')}</span>
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
                        <h2 className="text-4xl font-bold mb-4 text-black animate-on-scroll">{t('features.title')}</h2>
                        <p className="text-xl text-gray-600 animate-on-scroll">{t('features.subtitle')}</p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
                        {/* Left side - Automation description */}
                        <div className="animate-on-scroll">
                            <h3 className="text-2xl font-bold mb-4 text-black">{t('features.automation')}</h3>
                            <p className="text-gray-600 mb-8 leading-relaxed">
                                {t('features.automationDesc')}
                            </p>
                            <button className="text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-2">
                                <span>{t('features.exploreAutomations')}</span>
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
                                                <div className="text-sm font-medium text-black">{t('automation.trigger')}</div>
                                                <div className="text-xs text-gray-500">{t('features.triggerDataUpload')}</div>
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
                                                <div className="text-sm font-medium text-black">{t('features.switch')}</div>
                                                <div className="text-xs text-gray-500">{t('features.routeAnalysis')}</div>
                                        </div>
                                    </div>
                                </div>

                                    {/* Actions */}
                                    <div className="ml-8 space-y-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-4 h-4 bg-purple-500 rounded"></div>
                                            <div className="bg-white rounded-lg p-2 border border-gray-200 flex-1">
                                                <div className="text-xs font-medium text-black">{t('features.createVisualization')}</div>
                                            </div>
                                            </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-4 h-4 bg-orange-500 rounded"></div>
                                            <div className="bg-white rounded-lg p-2 border border-gray-200 flex-1">
                                                <div className="text-xs font-medium text-black">{t('features.generateInsights')}</div>
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
                            <h3 className="text-2xl font-bold mb-4 text-black">{t('charts.title')}</h3>
                            <p className="text-gray-600">{t('charts.subtitle')}</p>
                        </div>

                        {/* Infinite Chart Carousel */}
                        <div className="relative overflow-hidden">
                            <div className="flex space-x-8 animate-infinite-chart-scroll">
                                {/* Chart 1 - Revenue */}
                                <div className="flex-shrink-0 w-80 bg-white rounded-xl border border-gray-200 p-6">
                                    <div className="mb-4">
                                        <h4 className="font-semibold text-black">{t('charts.revenue')}</h4>
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
                                        <h4 className="font-semibold text-black">{t('charts.subscriptions')}</h4>
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
                                        <h4 className="font-semibold text-black">{t('charts.salesByRegion')}</h4>
                                        <div className="text-2xl font-bold text-black">{t('charts.regions')}</div>
                                        <div className="text-sm text-blue-600">{t('charts.updatedNow')}</div>
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
                                        <h4 className="font-semibold text-black">{t('charts.userDistribution')}</h4>
                                        <div className="text-2xl font-bold text-black">{t('charts.percentage')}</div>
                                        <div className="text-sm text-gray-600">{t('charts.activeUsers')}</div>
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
                                        <h4 className="font-semibold text-black">{t('charts.growthTrend')}</h4>
                                        <div className="text-2xl font-bold text-black">{t('charts.growthPercentage')}</div>
                                        <div className="text-sm text-green-600">{t('charts.trendingUp')}</div>
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
                                        <h4 className="font-semibold text-black">{t('charts.dataPoints')}</h4>
                                        <div className="text-2xl font-bold text-black">{t('charts.dataPointsCount')}</div>
                                        <div className="text-sm text-gray-600">{t('charts.analyzed')}</div>
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
                                        <h4 className="font-semibold text-black">{t('charts.revenue')}</h4>
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
                                        <h4 className="font-semibold text-black">{t('charts.subscriptions')}</h4>
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
                                        <h4 className="font-semibold text-black">{t('charts.salesByRegion')}</h4>
                                        <div className="text-2xl font-bold text-black">{t('charts.regions')}</div>
                                        <div className="text-sm text-blue-600">{t('charts.updatedNow')}</div>
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
                                        <h4 className="font-semibold text-black">{t('charts.userDistribution')}</h4>
                                        <div className="text-2xl font-bold text-black">{t('charts.percentage')}</div>
                                        <div className="text-sm text-gray-600">{t('charts.activeUsers')}</div>
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
                                        <h4 className="font-semibold text-black">{t('charts.growthTrend')}</h4>
                                        <div className="text-2xl font-bold text-black">{t('charts.growthPercentage')}</div>
                                        <div className="text-sm text-green-600">{t('charts.trendingUp')}</div>
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
                                        <h4 className="font-semibold text-black">{t('charts.dataPoints')}</h4>
                                        <div className="text-2xl font-bold text-black">{t('charts.dataPointsCount')}</div>
                                        <div className="text-sm text-gray-600">{t('charts.analyzed')}</div>
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
                <section className="py-12 md:py-20 max-w-7xl mx-auto px-4 md:px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4 text-black animate-on-scroll">{t('landing.dataSources.title')}</h2>
                        <p className="text-xl text-gray-600 animate-on-scroll">{t('landing.dataSources.subtitle')}</p>
                                    </div>

                    {/* Infinite Carousel */}
                    <div className="relative overflow-hidden">
                        {/* Fade edges */}
                        <div className="absolute left-0 top-0 w-16 md:w-32 h-full bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
                        <div className="absolute right-0 top-0 w-16 md:w-32 h-full bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
                        
                        {/* First Row - Moving Right */}
                        <div className="flex space-x-6 md:space-x-12 mb-6 md:mb-8 animate-infinite-scroll">
                            <div className="flex space-x-6 md:space-x-12 min-w-max">
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
                        <div className="flex space-x-6 md:space-x-12 animate-infinite-scroll-reverse">
                            <div className="flex space-x-6 md:space-x-12 min-w-max">
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
                                    {t('landing.stats.title')} <span className="text-gray-600">{t('landing.stats.subtitle')}</span>
                            </h2>
                                
                                <div className="grid grid-cols-2 gap-8 mt-12">
                                    <div>
                                        <div className="text-3xl font-bold text-black mb-1">2,000,000</div>
                                        <div className="text-sm text-gray-600 uppercase tracking-wide">{t('landing.stats.dataPoints')}</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-black mb-1">500+</div>
                                        <div className="text-sm text-gray-600 uppercase tracking-wide">{t('landing.stats.chartTypes')}</div>
                                </div>
                                    <div>
                                        <div className="text-3xl font-bold text-black mb-1">10,000+</div>
                                        <div className="text-sm text-gray-600 uppercase tracking-wide">{t('landing.stats.visualizations')}</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-black mb-1">99.9%</div>
                                        <div className="text-sm text-gray-600 uppercase tracking-wide">{t('landing.stats.uptime')}</div>
                                    </div>
                            </div>
                        </div>

                            <div className="animate-on-scroll">
                                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 relative overflow-hidden">
                                    <div className="absolute top-6 left-6 text-xs text-gray-500 uppercase tracking-wide">{t('charts.growthAnalytics')}</div>
                                    
                                    {/* Chart Header */}
                                    <div className="mt-8 mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('landing.stats.chartTitle')}</h3>
                                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                                <span>{t('landing.stats.dataProcessing')}</span>
                                    </div>
                                            <div className="flex items-center space-x-2">
                                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                                <span>{t('landing.stats.querySpeed')}</span>
                                    </div>
                                            <div className="flex items-center space-x-2">
                                                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                                <span>{t('landing.stats.visualization')}</span>
                                    </div>
                                    </div>
                                    </div>
                                    
                                    {/* Enhanced Chart */}
                                    <div className="relative h-80">
                                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 300" preserveAspectRatio="none">
                                            <defs>
                                                <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                    <stop offset="0%" style={{stopColor: '#3b82f6', stopOpacity: 0.4}} />
                                                    <stop offset="100%" style={{stopColor: '#3b82f6', stopOpacity: 0}} />
                                                </linearGradient>
                                                <linearGradient id="greenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                    <stop offset="0%" style={{stopColor: '#10b981', stopOpacity: 0.4}} />
                                                    <stop offset="100%" style={{stopColor: '#10b981', stopOpacity: 0}} />
                                                </linearGradient>
                                                <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                    <stop offset="0%" style={{stopColor: '#8b5cf6', stopOpacity: 0.4}} />
                                                    <stop offset="100%" style={{stopColor: '#8b5cf6', stopOpacity: 0}} />
                                                </linearGradient>
                                                <filter id="glow">
                                                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                                    <feMerge> 
                                                        <feMergeNode in="coloredBlur"/>
                                                        <feMergeNode in="SourceGraphic"/>
                                                    </feMerge>
                                                </filter>
                                            </defs>
                                            
                                            {/* Grid lines */}
                                            <g stroke="#f3f4f6" strokeWidth="1" opacity="0.5">
                                                <line x1="0" y1="60" x2="500" y2="60" />
                                                <line x1="0" y1="120" x2="500" y2="120" />
                                                <line x1="0" y1="180" x2="500" y2="180" />
                                                <line x1="0" y1="240" x2="500" y2="240" />
                                                <line x1="100" y1="0" x2="100" y2="300" />
                                                <line x1="200" y1="0" x2="200" y2="300" />
                                                <line x1="300" y1="0" x2="300" y2="300" />
                                                <line x1="400" y1="0" x2="400" y2="300" />
                                            </g>
                                            
                                            {/* Data Processing Line */}
                                            <path 
                                                d="M 0 250 Q 100 230 200 180 Q 300 120 400 80 T 500 40" 
                                                stroke="#3b82f6" 
                                                strokeWidth="3" 
                                                fill="none"
                                                filter="url(#glow)"
                                            />
                                            <path 
                                                d="M 0 250 Q 100 230 200 180 Q 300 120 400 80 T 500 40 L 500 300 L 0 300 Z" 
                                                fill="url(#blueGradient)"
                                            />
                                            
                                            {/* Query Speed Line */}
                                            <path 
                                                d="M 0 270 Q 100 250 200 200 Q 300 140 400 100 T 500 60" 
                                                stroke="#10b981" 
                                                strokeWidth="3" 
                                                fill="none"
                                                filter="url(#glow)"
                                            />
                                            <path 
                                                d="M 0 270 Q 100 250 200 200 Q 300 140 400 100 T 500 60 L 500 300 L 0 300 Z" 
                                                fill="url(#greenGradient)"
                                                opacity="0.6"
                                            />
                                            
                                            {/* Visualization Line */}
                                            <path 
                                                d="M 0 280 Q 100 260 200 220 Q 300 160 400 120 T 500 80" 
                                                stroke="#8b5cf6" 
                                                strokeWidth="3" 
                                                fill="none"
                                                filter="url(#glow)"
                                            />
                                            <path 
                                                d="M 0 280 Q 100 260 200 220 Q 300 160 400 120 T 500 80 L 500 300 L 0 300 Z" 
                                                fill="url(#purpleGradient)"
                                                opacity="0.4"
                                            />
                                        </svg>

                                        {/* Interactive Data Points */}
                                        <div className="absolute bottom-12 left-8">
                                            <div className="w-3 h-3 bg-blue-500 rounded-full shadow-lg animate-pulse"></div>
                                            <div className="absolute -top-8 -left-6 text-xs text-gray-600 font-medium">{t('charts.jan')}</div>
                                    </div>
                                        <div className="absolute bottom-16 left-1/4">
                                            <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg animate-pulse" style={{animationDelay: '0.5s'}}></div>
                                            <div className="absolute -top-8 -left-6 text-xs text-gray-600 font-medium">{t('charts.mar')}</div>
                                    </div>
                                        <div className="absolute bottom-24 left-2/4">
                                            <div className="w-3 h-3 bg-purple-500 rounded-full shadow-lg animate-pulse" style={{animationDelay: '1s'}}></div>
                                            <div className="absolute -top-8 -left-6 text-xs text-gray-600 font-medium">{t('charts.jun')}</div>
                                </div>
                                        <div className="absolute bottom-32 right-1/4">
                                            <div className="w-3 h-3 bg-blue-500 rounded-full shadow-lg animate-pulse" style={{animationDelay: '1.5s'}}></div>
                                            <div className="absolute -top-8 -left-6 text-xs text-gray-600 font-medium">{t('charts.sep')}</div>
                                    </div>
                                        <div className="absolute bottom-40 right-8">
                                            <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg animate-pulse" style={{animationDelay: '2s'}}></div>
                                            <div className="absolute -top-8 -left-6 text-xs text-gray-600 font-medium">{t('charts.dec')}</div>
                                    </div>
                                        
                                        {/* Performance Metrics */}
                                        <div className="absolute top-4 right-4 bg-gray-50 rounded-lg p-3">
                                            <div className="text-xs text-gray-500 mb-1">{t('landing.stats.avgResponse')}</div>
                                            <div className="text-lg font-bold text-green-600">{t('charts.responseTime')}</div>
                                    </div>
                                        
                                        <div className="absolute bottom-4 right-4 bg-gray-50 rounded-lg p-3">
                                            <div className="text-xs text-gray-500 mb-1">{t('landing.stats.throughput')}</div>
                                            <div className="text-lg font-bold text-blue-600">{t('charts.throughput')}</div>
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
                            <h2 className="text-4xl font-bold mb-4 text-black animate-on-scroll">{t('howItWorks.title')}</h2>
                            <p className="text-lg text-gray-600 animate-on-scroll max-w-2xl mx-auto">
                                {t('howItWorks.subtitle')}
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
                                        title: t('howItWorks.step1'),
                                        description: t('howItWorks.step1Desc'),
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
                                        title: t('howItWorks.step2'),
                                        description: t('howItWorks.step2Desc'),
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
                                        title: t('howItWorks.step3'),
                                        description: t('howItWorks.step3Desc'),
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
                        <h2 className="text-4xl font-bold mb-4 text-black animate-on-scroll">{t('pricing.title')}</h2>
                        <p className="text-xl text-gray-600 animate-on-scroll">{t('pricing.subtitle')}</p>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {[
                            {
                                name: t('pricing.free'),
                                price: "$0",
                                period: "",
                                description: t('pricing.perfectForSmallTeams'),
                                features: [t('pricing.freeFeatures')],
                                popular: false,
                                planType: 'free' as const
                            },
                            {
                                name: t('pricing.pro'),
                                price: "$10",
                                period: `/${t('pricing.month')}`,
                                description: t('pricing.forGrowingBusinesses'),
                                features: [t('pricing.proFeatures')],
                                popular: true,
                                planType: 'pro' as const
                            },
                            {
                                name: t('pricing.enterprise'),
                                price: t('pricing.letsDiscuss'),
                                period: "",
                                description: t('pricing.forLargeOrganizations'),
                                features: [t('pricing.enterpriseFeatures')],
                                popular: false,
                                planType: 'enterprise' as const
                            }
                        ].map((plan, index) => (
                            <div key={index} className={`relative bg-white p-8 rounded-xl border transition-all duration-300 hover:shadow-lg animate-on-scroll ${
                                plan.popular ? 'border-black' : 'border-gray-200'
                            }`}>
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                        <span className="bg-black text-white px-4 py-1 rounded-full text-sm font-medium">{t('pricing.mostPopular')}</span>
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
                                <button 
                                    onClick={() => handlePricingClick(plan.planType)}
                                    className={`w-full py-3 rounded-lg font-medium transition-colors ${
                                        plan.popular 
                                            ? 'bg-black text-white hover:bg-gray-800' 
                                            : 'border border-gray-300 text-black hover:border-gray-400'
                                    }`}
                                >
                                    {t('pricing.getStarted')}
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
                            {t('cta.title')}
                        </h2>
                        
                        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12 animate-fade-in-delay">
                            <Link to="/chat" className="bg-black text-white px-8 py-4 rounded-lg hover:bg-gray-800 transition-colors text-lg font-medium">
                                {t('cta.getStarted')}
                            </Link>
                            <button 
                                onClick={() => setIsEnterpriseModalOpen(true)}
                                className="text-gray-600 hover:text-black transition-colors px-8 py-4 text-lg font-medium border border-gray-300 rounded-lg hover:border-gray-400"
                            >
                                {t('cta.talkToSales')}
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
            
            {/* Modals */}
            <ProSubscriptionModal 
                isOpen={isProModalOpen} 
                onClose={() => setIsProModalOpen(false)} 
            />
            <EnterpriseContactModal 
                isOpen={isEnterpriseModalOpen} 
                onClose={() => setIsEnterpriseModalOpen(false)} 
            />
        </>
    );
}