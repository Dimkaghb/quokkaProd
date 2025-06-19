import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';

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
        // Intersection Observer for scroll animations
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
        setMobileMenuOpen(false); // Close mobile menu after navigation
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

                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(50px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes float {
                    0%, 100% {
                        transform: translateY(0px);
                    }
                    50% {
                        transform: translateY(-20px);
                    }
                }

                @keyframes bounceSlow {
                    0%, 20%, 50%, 80%, 100% {
                        transform: translateY(0);
                    }
                    40% {
                        transform: translateY(-10px);
                    }
                    60% {
                        transform: translateY(-5px);
                    }
                }

                @keyframes pulseSlow {
                    0%, 100% {
                        opacity: 0.1;
                    }
                    50% {
                        opacity: 0.3;
                    }
                }

                .animate-fade-in {
                    animation: fadeInUp 0.8s ease-out;
                }

                .animate-fade-in-up {
                    animation: fadeInUp 1s ease-out;
                }

                .animate-fade-in-delay {
                    animation: fadeInUp 1s ease-out 0.3s both;
                }

                .animate-fade-in-delay-2 {
                    animation: fadeInUp 1s ease-out 0.6s both;
                }

                .animate-slide-up {
                    animation: slideUp 1.2s ease-out 0.2s both;
                }

                .animate-bounce-slow {
                    animation: bounceSlow 3s infinite;
                }

                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }

                .animate-float-delay {
                    animation: float 6s ease-in-out infinite 2s;
                }

                .animate-float-delay-2 {
                    animation: float 6s ease-in-out infinite 4s;
                }

                .animate-pulse-slow {
                    animation: pulseSlow 4s ease-in-out infinite;
                }

                .animate-pulse-slow-delay {
                    animation: pulseSlow 4s ease-in-out infinite 2s;
                }

                .animate-on-scroll {
                    opacity: 0;
                    transform: translateY(30px);
                    transition: all 0.6s ease-out;
                }

                .animate-on-scroll.in-view {
                    opacity: 1;
                    transform: translateY(0);
                }

                html {
                    scroll-behavior: smooth;
                }
            `}</style>
            <div className="min-h-screen bg-black text-white overflow-x-hidden">
                {/* Navigation */}
                <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
                    scrollY > 50 ? 'bg-black/90 backdrop-blur-md border-b border-gray-800' : 'bg-transparent'
                }`}>
                    <div className="flex justify-between items-center p-4 md:p-6 max-w-7xl mx-auto">
                        <div className="flex items-center space-x-3 animate-fade-in">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center transform hover:scale-110 transition-transform duration-200">
                                <div className="text-black font-bold text-sm md:text-lg">🐨</div>
                            </div>
                            <span className="text-xl md:text-2xl font-bold">quokkaAI</span>
                        </div>
                        
                        {/* Desktop Navigation */}
                        <div className="hidden lg:flex space-x-8">
                            <button onClick={() => scrollToSection('features')} className="hover:text-gray-300 transition-colors duration-200">Features</button>
                            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-gray-300 transition-colors duration-200">How It Works</button>
                            <button onClick={() => scrollToSection('pricing')} className="hover:text-gray-300 transition-colors duration-200">Pricing</button>
                            <button onClick={() => scrollToSection('contact')} className="hover:text-gray-300 transition-colors duration-200">Contact</button>
                        </div>
                        
                        {/* Desktop CTA Buttons */}
                        <div className="hidden md:flex items-center space-x-4">
                            <Link 
                                to="/auth"
                                className="text-white hover:text-gray-300 transition-colors duration-200 font-medium"
                            >
                                Sign In
                            </Link>
                            <Link 
                                to="/auth"
                                className="bg-white text-black px-4 md:px-6 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200 font-medium transform hover:scale-105"
                            >
                                Get Started
                            </Link>
                        </div>
                        
                        {/* Mobile Menu Button */}
                        <button 
                            className="lg:hidden p-2"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                                <div className={`w-full h-0.5 bg-white transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
                                <div className={`w-full h-0.5 bg-white transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`}></div>
                                <div className={`w-full h-0.5 bg-white transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
                            </div>
                        </button>
                    </div>
                    
                    {/* Mobile Menu */}
                    <div className={`lg:hidden transition-all duration-300 ${mobileMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden bg-black/95 backdrop-blur-md`}>
                        <div className="px-4 py-6 space-y-4">
                            <button onClick={() => scrollToSection('features')} className="block w-full text-left py-2 hover:text-gray-300 transition-colors">Features</button>
                            <button onClick={() => scrollToSection('how-it-works')} className="block w-full text-left py-2 hover:text-gray-300 transition-colors">How It Works</button>
                            <button onClick={() => scrollToSection('pricing')} className="block w-full text-left py-2 hover:text-gray-300 transition-colors">Pricing</button>
                            <button onClick={() => scrollToSection('contact')} className="block w-full text-left py-2 hover:text-gray-300 transition-colors">Contact</button>
                            <div className="pt-4 space-y-3">
                                <Link 
                                    to="/auth"
                                    className="block w-full text-center py-2 text-white hover:text-gray-300 transition-colors font-medium border border-gray-600 rounded-lg"
                                >
                                    Sign In
                                </Link>
                                <Link 
                                    to="/auth"
                                    className="block w-full text-center bg-white text-black py-3 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                                >
                                    Get Started
                                </Link>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <section className="text-center py-20 md:py-32 max-w-6xl mx-auto px-4 md:px-6 relative mt-16 md:mt-0">
                    <div className="mb-6 md:mb-8 animate-fade-in-up">
                        <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 transform hover:scale-110 transition-transform duration-300 shadow-2xl">
                            <div className="text-black text-4xl md:text-6xl animate-bounce-slow">🐨</div>
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold mb-4 md:mb-6 animate-slide-up">
                            <span className="text-white">quokka</span><span className="text-gray-400">AI</span>
                        </h1>
                    </div>
                    <p className="text-lg md:text-xl lg:text-2xl text-gray-300 mb-6 md:mb-8 max-w-4xl mx-auto leading-relaxed animate-fade-in-delay px-4">
                        Intelligent data analysis and research platform that transforms your files, databases, 
                        and network data into actionable insights with beautiful visualizations.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-delay-2 px-4">
                        <Link 
                            to="/auth"
                            className="bg-white text-black px-6 md:px-8 py-3 md:py-4 rounded-lg hover:bg-gray-100 transition-all duration-200 font-medium text-base md:text-lg transform hover:scale-105 hover:shadow-xl text-center"
                        >
                            Start Analyzing
                        </Link>
                        <button className="border border-white text-white px-6 md:px-8 py-3 md:py-4 rounded-lg hover:bg-white hover:text-black transition-all duration-200 font-medium text-base md:text-lg transform hover:scale-105">
                            Watch Demo
                        </button>
                    </div>
                    {/* Floating particles animation - hidden on mobile for performance */}
                    <div className="hidden md:block absolute top-20 left-10 w-2 h-2 bg-white rounded-full animate-float opacity-20"></div>
                    <div className="hidden md:block absolute top-40 right-20 w-1 h-1 bg-gray-400 rounded-full animate-float-delay opacity-30"></div>
                    <div className="hidden md:block absolute bottom-20 left-1/4 w-1.5 h-1.5 bg-white rounded-full animate-float-delay-2 opacity-25"></div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-16 md:py-32 max-w-6xl mx-auto px-4 md:px-6">
                    <div className="text-center mb-16 md:mb-24">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6 animate-on-scroll text-white">Powerful Features</h2>
                        <p className="text-lg md:text-xl text-gray-300 animate-on-scroll">Everything you need for intelligent data analysis</p>
                    </div>
                    
                    {/* Main Features Grid */}
                    <div className="grid lg:grid-cols-2 gap-8 md:gap-16 mb-16 md:mb-24">
                        {/* Data Analysis */}
                        <div className="animate-on-scroll group">
                            <div className="bg-gradient-to-br from-blue-900/70 to-blue-800/50 backdrop-blur-sm rounded-2xl md:rounded-3xl p-6 md:p-10 hover:from-blue-800/80 hover:to-blue-700/60 transition-all duration-500 border border-blue-700/30 shadow-2xl">
                                <div className="mb-6 md:mb-8">
                                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">Advanced Analytics</h3>
                                    <p className="text-blue-100 text-base md:text-lg leading-relaxed">
                                        Intelligent algorithms that automatically discover patterns and insights in your data with precision and speed.
                                    </p>
                                </div>
                                
                                {/* Analytics Preview */}
                                <div className="bg-black/40 rounded-xl md:rounded-2xl p-4 md:p-6 border border-blue-600/20">
                                    <div className="flex items-center justify-between mb-4 md:mb-6">
                                        <div className="text-xs md:text-sm text-blue-300 font-semibold">Analysis Results</div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                            <span className="text-green-400 text-xs font-medium">Complete</span>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3 md:space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300 font-medium text-sm md:text-base">Accuracy</span>
                                            <span className="text-green-400 font-bold text-base md:text-lg">98.7%</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300 font-medium text-sm md:text-base">Patterns Found</span>
                                            <span className="text-blue-400 font-bold text-base md:text-lg">47</span>
                                        </div>
                                        
                                        {/* Progress Chart */}
                                        <div className="mt-4 md:mt-6">
                                            <div className="flex justify-between text-xs text-gray-400 mb-2">
                                                <span>Processing Progress</span>
                                                <span>78%</span>
                                            </div>
                                            <div className="h-2 md:h-3 bg-gray-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" style={{ width: '78%' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Visualizations */}
                        <div className="animate-on-scroll group">
                            <div className="bg-gradient-to-br from-purple-900/70 to-purple-800/50 backdrop-blur-sm rounded-2xl md:rounded-3xl p-6 md:p-10 hover:from-purple-800/80 hover:to-purple-700/60 transition-all duration-500 border border-purple-700/30 shadow-2xl">
                                <div className="mb-6 md:mb-8">
                                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">Smart Visualizations</h3>
                                    <p className="text-purple-100 text-base md:text-lg leading-relaxed">
                                        Beautiful charts and dashboards that transform complex data into clear, actionable insights.
                                    </p>
                                </div>
                                
                                {/* Dashboard Preview */}
                                <div className="bg-black/40 rounded-xl md:rounded-2xl p-4 md:p-6 border border-purple-600/20">
                                    <div className="flex items-center justify-between mb-4 md:mb-6">
                                        <div className="text-xs md:text-sm text-purple-300 font-semibold">Live Dashboard</div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                            <span className="text-green-400 text-xs font-medium">Live</span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                                        <div className="bg-gradient-to-br from-green-900/40 to-green-800/30 rounded-lg md:rounded-xl p-3 md:p-4 border border-green-700/30">
                                            <div className="text-lg md:text-2xl font-bold text-green-400">$47.2K</div>
                                            <div className="text-xs text-green-300 font-medium">Revenue</div>
                                            <div className="text-xs text-green-400 mt-1">↗ +12.5%</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/30 rounded-lg md:rounded-xl p-3 md:p-4 border border-blue-700/30">
                                            <div className="text-lg md:text-2xl font-bold text-blue-400">2,847</div>
                                            <div className="text-xs text-blue-300 font-medium">Users</div>
                                            <div className="text-xs text-blue-400 mt-1">↗ +8.3%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Features */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {[
                            { 
                                title: "Deep Search", 
                                desc: "Intelligent search across all your data sources with natural language queries and semantic understanding",
                                icon: "🔍",
                                color: "from-emerald-600 to-teal-600"
                            },
                            { 
                                title: "Smart Charts", 
                                desc: "Transform raw data into beautiful, interactive charts and visualizations automatically",
                                icon: "📊",
                                color: "from-blue-600 to-cyan-600"
                            },
                            { 
                                title: "Detailed Insights", 
                                desc: "Get comprehensive analysis with trends, patterns, and actionable recommendations",
                                icon: "💡",
                                color: "from-yellow-600 to-orange-600"
                            },
                            { 
                                title: "Document Automation", 
                                desc: "Automate document processing, extraction, and analysis with AI-powered workflows",
                                icon: "🤖",
                                color: "from-purple-600 to-pink-600"
                            },
                            { 
                                title: "Report Generation", 
                                desc: "Create professional reports, presentations, and documents from your data insights",
                                icon: "📄",
                                color: "from-indigo-600 to-purple-600"
                            },
                            { 
                                title: "Real-time Monitoring", 
                                desc: "Monitor your data streams and get instant alerts on important changes and anomalies",
                                icon: "⚡",
                                color: "from-red-600 to-pink-600"
                            },
                            { 
                                title: "Data Integration", 
                                desc: "Connect multiple data sources including databases, APIs, files, and cloud services",
                                icon: "🔗",
                                color: "from-green-600 to-emerald-600"
                            },
                            { 
                                title: "Predictive Analytics", 
                                desc: "Forecast trends and predict future outcomes using advanced machine learning models",
                                icon: "🔮",
                                color: "from-violet-600 to-purple-600"
                            },
                            { 
                                title: "Collaboration Tools", 
                                desc: "Share insights, collaborate on analysis, and work together with your team seamlessly",
                                icon: "👥",
                                color: "from-teal-600 to-blue-600"
                            }
                        ].map((feature, index) => (
                            <div key={index} className="animate-on-scroll">
                                <div className="text-center p-6 md:p-8 rounded-xl md:rounded-2xl bg-gray-800/40 border border-gray-600/30 hover:bg-gray-700/50 hover:border-gray-500/40 transition-all duration-300 group">
                                    <div className={`w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br ${feature.color} rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                                        <span className="text-xl md:text-2xl">{feature.icon}</span>
                                    </div>
                                    <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">{feature.title}</h3>
                                    <p className="text-gray-300 leading-relaxed text-sm md:text-base">{feature.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Key Capabilities Section */}
                    <div className="mt-24 md:mt-32">
                        <div className="text-center mb-16 md:mb-20">
                            <h3 className="text-2xl md:text-4xl font-bold mb-4 md:mb-6 animate-on-scroll text-white">Transform Your Data Workflow</h3>
                            <p className="text-lg md:text-xl text-gray-300 animate-on-scroll max-w-3xl mx-auto">
                                From raw data to actionable insights in minutes, not hours
                            </p>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-8 md:gap-12">
                            {/* Left Column */}
                            <div className="space-y-8">
                                <div className="animate-on-scroll group">
                                    <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/30 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-blue-700/30 hover:border-blue-600/50 transition-all duration-300">
                                        <div className="flex items-start space-x-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <span className="text-xl">🔍</span>
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-bold text-white mb-3">Intelligent Deep Search</h4>
                                                <p className="text-blue-100 leading-relaxed">
                                                    Search through millions of data points using natural language. Ask questions like "Show me sales trends for Q4" and get instant, accurate results.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="animate-on-scroll group">
                                    <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/30 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-purple-700/30 hover:border-purple-600/50 transition-all duration-300">
                                        <div className="flex items-start space-x-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <span className="text-xl">📊</span>
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-bold text-white mb-3">Auto-Generate Charts</h4>
                                                <p className="text-purple-100 leading-relaxed">
                                                    Turn spreadsheets into stunning visualizations automatically. Our AI selects the best chart types and creates interactive dashboards.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="animate-on-scroll group">
                                    <div className="bg-gradient-to-br from-green-900/40 to-green-800/30 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-green-700/30 hover:border-green-600/50 transition-all duration-300">
                                        <div className="flex items-start space-x-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <span className="text-xl">💡</span>
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-bold text-white mb-3">Detailed Insights</h4>
                                                <p className="text-green-100 leading-relaxed">
                                                    Get comprehensive analysis with trend identification, anomaly detection, and actionable recommendations for your business.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-8">
                                <div className="animate-on-scroll group">
                                    <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/30 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-orange-700/30 hover:border-orange-600/50 transition-all duration-300">
                                        <div className="flex items-start space-x-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <span className="text-xl">🤖</span>
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-bold text-white mb-3">Document Automation</h4>
                                                <p className="text-orange-100 leading-relaxed">
                                                    Automate document processing, data extraction, and analysis workflows. Process hundreds of files in seconds, not hours.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="animate-on-scroll group">
                                    <div className="bg-gradient-to-br from-indigo-900/40 to-indigo-800/30 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-indigo-700/30 hover:border-indigo-600/50 transition-all duration-300">
                                        <div className="flex items-start space-x-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <span className="text-xl">📄</span>
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-bold text-white mb-3">Smart Document Creation</h4>
                                                <p className="text-indigo-100 leading-relaxed">
                                                    Generate professional reports, presentations, and documents automatically from your data analysis and insights.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="animate-on-scroll group">
                                    <div className="bg-gradient-to-br from-teal-900/40 to-teal-800/30 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-teal-700/30 hover:border-teal-600/50 transition-all duration-300">
                                        <div className="flex items-start space-x-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <span className="text-xl">⚡</span>
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-bold text-white mb-3">Real-time Processing</h4>
                                                <p className="text-teal-100 leading-relaxed">
                                                    Process and analyze data in real-time with instant notifications, live dashboards, and automated alerts.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section id="how-it-works" className="py-16 md:py-32 bg-gradient-to-b from-gray-900/50 to-gray-800/50 relative">
                    <div className="max-w-4xl mx-auto px-4 md:px-6 relative z-10">
                        <div className="text-center mb-16 md:mb-24">
                            <h2 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6 animate-on-scroll text-white">How It Works</h2>
                            <p className="text-lg md:text-xl text-gray-300 animate-on-scroll">Transform your data in three simple steps</p>
                        </div>
                        
                        {/* Timeline */}
                        <div className="relative">
                            {/* Timeline Line - Hidden on mobile, shown as vertical line on desktop */}
                            <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-blue-500 via-purple-500 to-indigo-500 rounded-full"></div>
                            
                            {/* Timeline Steps */}
                            <div className="space-y-16 md:space-y-32">
                                {[
                                    {
                                        step: "01",
                                        title: "Upload & Connect",
                                        description: "Connect your data sources, upload files, or integrate with your existing databases and APIs",
                                        side: "right",
                                        color: "from-blue-600 to-blue-700"
                                    },
                                    {
                                        step: "02", 
                                        title: "AI Analysis",
                                        description: "Our advanced AI algorithms process and analyze your data to identify patterns, trends, and insights",
                                        side: "left",
                                        color: "from-purple-600 to-purple-700"
                                    },
                                    {
                                        step: "03",
                                        title: "Get Results", 
                                        description: "Receive beautiful visualizations, comprehensive reports, and actionable insights ready to share",
                                        side: "right",
                                        color: "from-indigo-600 to-indigo-700"
                                    }
                                ].map((item, index) => (
                                    <div key={index} className="relative animate-on-scroll">
                                        {/* Step Number */}
                                        <div className="flex md:absolute md:left-1/2 md:transform md:-translate-x-1/2 md:z-10 justify-center md:justify-start">
                                            <div className={`w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br ${item.color} rounded-full flex items-center justify-center shadow-2xl border-4 border-gray-900`}>
                                                <span className="text-white font-bold text-base md:text-lg">{item.step}</span>
                                            </div>
                                        </div>
                                        
                                        {/* Content - Mobile: full width, Desktop: alternating sides */}
                                        <div className={`mt-6 md:mt-0 md:${
                                            item.side === 'right' 
                                                ? 'ml-auto pl-20 text-left' 
                                                : 'mr-auto pr-20 text-right'
                                        } w-full md:w-1/2`}>
                                            <div className={`bg-gradient-to-br ${item.color}/20 backdrop-blur-sm rounded-2xl md:rounded-3xl p-6 md:p-8 border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300`}>
                                                <h3 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">{item.title}</h3>
                                                <p className="text-gray-200 text-base md:text-lg leading-relaxed">
                                                    {item.description}
                                                </p>
                                            </div>
                                            
                                            {/* Connection line - Hidden on mobile */}
                                            <div className={`hidden md:block absolute top-10 ${
                                                item.side === 'right' 
                                                    ? 'left-0 w-20' 
                                                    : 'right-0 w-20'
                                            } h-1 bg-gradient-to-r ${
                                                item.side === 'right'
                                                    ? `${item.color} to-transparent`
                                                    : `from-transparent ${item.color}`
                                            } rounded-full`}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="text-center mt-16 md:mt-24 animate-on-scroll">
                            <p className="text-base md:text-lg text-gray-300 mb-6 font-medium">Ready to unlock the power of your data?</p>
                            <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 md:px-12 py-3 md:py-4 rounded-xl md:rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-bold text-base md:text-lg transform hover:scale-105 shadow-xl">
                                Start Your Journey
                            </button>
                        </div>
                    </div>
                    
                    {/* Background Elements - Reduced opacity on mobile */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10 md:opacity-20">
                        <div className="absolute top-1/4 left-1/4 w-32 md:w-48 h-32 md:h-48 bg-blue-500/20 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-1/4 right-1/4 w-32 md:w-48 h-32 md:h-48 bg-purple-500/20 rounded-full blur-3xl"></div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-16 md:py-20 max-w-7xl mx-auto px-4 md:px-6">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 md:mb-16 animate-on-scroll">Choose Your Plan</h2>
                    <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
                        {[
                            {
                                name: "Starter",
                                price: "$29",
                                period: "/month",
                                description: "Perfect for individuals and small teams",
                                features: ["Up to 10 data sources", "Basic visualizations", "5GB storage", "Email support", "Standard processing"],
                                popular: false
                            },
                            {
                                name: "Professional",
                                price: "$79",
                                period: "/month",
                                description: "Ideal for growing businesses",
                                features: ["Unlimited data sources", "Advanced visualizations", "50GB storage", "Priority support", "Fast processing", "Custom reports", "API access"],
                                popular: true
                            },
                            {
                                name: "Enterprise",
                                price: "$199",
                                period: "/month",
                                description: "For large organizations",
                                features: ["Unlimited everything", "Custom visualizations", "500GB storage", "24/7 dedicated support", "Ultra-fast processing", "White-label solution", "Custom integrations", "On-premise deployment"],
                                popular: false
                            }
                        ].map((plan, index) => (
                            <div key={index} className={`relative bg-gray-900 p-6 md:p-8 rounded-xl md:rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl animate-on-scroll ${
                                plan.popular ? 'ring-2 ring-white ring-opacity-50 bg-gradient-to-b from-gray-800 to-gray-900' : ''
                            }`}>
                                {plan.popular && (
                                    <div className="absolute -top-3 md:-top-4 left-1/2 transform -translate-x-1/2">
                                        <span className="bg-white text-black px-3 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-bold">Most Popular</span>
                                    </div>
                                )}
                                <div className="text-center mb-6 md:mb-8">
                                    <h3 className="text-xl md:text-2xl font-bold mb-2">{plan.name}</h3>
                                    <div className="mb-3 md:mb-4">
                                        <span className="text-3xl md:text-4xl font-bold">{plan.price}</span>
                                        <span className="text-gray-400">{plan.period}</span>
                                    </div>
                                    <p className="text-gray-300 text-sm md:text-base">{plan.description}</p>
                                </div>
                                <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                                    {plan.features.map((feature, featureIndex) => (
                                        <li key={featureIndex} className="flex items-center space-x-3">
                                            <div className="text-green-400">✓</div>
                                            <span className="text-gray-300 text-sm md:text-base">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button className={`w-full py-2 md:py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 ${
                                    plan.popular 
                                        ? 'bg-white text-black hover:bg-gray-100' 
                                        : 'border border-white text-white hover:bg-white hover:text-black'
                                }`}>
                                    Get Started
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-16 md:py-20 max-w-4xl mx-auto px-4 md:px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6 animate-on-scroll">Ready to Transform Your Data?</h2>
                    <p className="text-lg md:text-xl text-gray-300 mb-6 md:mb-8 animate-on-scroll">
                        Join thousands of users who trust quokkaAI to unlock the power of their data.
                    </p>
                    <button className="bg-white text-black px-8 md:px-12 py-3 md:py-4 rounded-lg hover:bg-gray-100 transition-all duration-200 font-medium text-base md:text-lg transform hover:scale-105 hover:shadow-xl animate-on-scroll">
                        Start Your Free Trial
                    </button>
                </section>

                {/* Footer */}
                <footer id="contact" className="border-t border-gray-800 py-8 md:py-12">
                    <div className="max-w-7xl mx-auto px-4 md:px-6">
                        <div className="flex flex-col md:flex-row justify-between items-center">
                            <div className="flex items-center space-x-3 mb-4 md:mb-0">
                                <div className="w-6 h-6 md:w-8 md:h-8 bg-white rounded-full flex items-center justify-center transform hover:scale-110 transition-transform duration-200">
                                    <div className="text-black font-bold text-sm">🐨</div>
                                </div>
                                <span className="text-lg md:text-xl font-bold">quokkaAI</span>
                            </div>
                            <div className="text-gray-400 text-xs md:text-sm">
                                © 2024 quokkaAI. All rights reserved.
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}