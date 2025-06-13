import { useEffect, useState, useRef } from 'react';

export const Landing = () => {
    const [scrollY, setScrollY] = useState(0);
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
                    <div className="flex justify-between items-center p-6 max-w-7xl mx-auto">
                        <div className="flex items-center space-x-3 animate-fade-in">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center transform hover:scale-110 transition-transform duration-200">
                                <div className="text-black font-bold text-lg">🐨</div>
                            </div>
                            <span className="text-2xl font-bold">quokkaAI</span>
                        </div>
                        <div className="hidden md:flex space-x-8">
                            <button onClick={() => scrollToSection('features')} className="hover:text-gray-300 transition-colors duration-200">Features</button>
                            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-gray-300 transition-colors duration-200">How It Works</button>
                            <button onClick={() => scrollToSection('pricing')} className="hover:text-gray-300 transition-colors duration-200">Pricing</button>
                            <button onClick={() => scrollToSection('contact')} className="hover:text-gray-300 transition-colors duration-200">Contact</button>
                        </div>
                        <button className="bg-white text-black px-6 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200 font-medium transform hover:scale-105">
                            Get Started
                        </button>
                    </div>
                </nav>

                {/* Hero Section */}
                <section className="text-center py-32 max-w-6xl mx-auto px-6 relative">
                    <div className="mb-8 animate-fade-in-up">
                        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-6 transform hover:scale-110 transition-transform duration-300 shadow-2xl">
                            <div className="text-black text-6xl animate-bounce-slow">🐨</div>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-slide-up">
                            <span className="text-white">quokka</span><span className="text-gray-400">AI</span>
                        </h1>
                    </div>
                    <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed animate-fade-in-delay">
                        Intelligent data analysis and research platform that transforms your files, databases, 
                        and network data into actionable insights with beautiful visualizations.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-delay-2">
                        <button className="bg-white text-black px-8 py-4 rounded-lg hover:bg-gray-100 transition-all duration-200 font-medium text-lg transform hover:scale-105 hover:shadow-xl">
                            Start Analyzing
                        </button>
                        <button className="border border-white text-white px-8 py-4 rounded-lg hover:bg-white hover:text-black transition-all duration-200 font-medium text-lg transform hover:scale-105">
                            Watch Demo
                        </button>
                    </div>
                    {/* Floating particles animation */}
                    <div className="absolute top-20 left-10 w-2 h-2 bg-white rounded-full animate-float opacity-20"></div>
                    <div className="absolute top-40 right-20 w-1 h-1 bg-gray-400 rounded-full animate-float-delay opacity-30"></div>
                    <div className="absolute bottom-20 left-1/4 w-1.5 h-1.5 bg-white rounded-full animate-float-delay-2 opacity-25"></div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-32 max-w-6xl mx-auto px-6">
                    <div className="text-center mb-24">
                        <h2 className="text-5xl font-bold mb-6 animate-on-scroll text-white">Powerful Features</h2>
                        <p className="text-xl text-gray-300 animate-on-scroll">Everything you need for intelligent data analysis</p>
                    </div>
                    
                    {/* Main Features Grid */}
                    <div className="grid lg:grid-cols-2 gap-16 mb-24">
                        {/* Data Analysis */}
                        <div className="animate-on-scroll group">
                            <div className="bg-gradient-to-br from-blue-900/70 to-blue-800/50 backdrop-blur-sm rounded-3xl p-10 hover:from-blue-800/80 hover:to-blue-700/60 transition-all duration-500 border border-blue-700/30 shadow-2xl">
                                <div className="mb-8">
                                    <h3 className="text-3xl font-bold text-white mb-4">Advanced Analytics</h3>
                                    <p className="text-blue-100 text-lg leading-relaxed">
                                        Intelligent algorithms that automatically discover patterns and insights in your data with precision and speed.
                                    </p>
                                </div>
                                
                                {/* Analytics Preview */}
                                <div className="bg-black/40 rounded-2xl p-6 border border-blue-600/20">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="text-sm text-blue-300 font-semibold">Analysis Results</div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                            <span className="text-green-400 text-xs font-medium">Complete</span>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300 font-medium">Accuracy</span>
                                            <span className="text-green-400 font-bold text-lg">98.7%</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300 font-medium">Patterns Found</span>
                                            <span className="text-blue-400 font-bold text-lg">47</span>
                                        </div>
                                        
                                        {/* Progress Chart */}
                                        <div className="mt-6">
                                            <div className="flex justify-between text-xs text-gray-400 mb-2">
                                                <span>Processing Progress</span>
                                                <span>78%</span>
                                            </div>
                                            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" style={{ width: '78%' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Visualizations */}
                        <div className="animate-on-scroll group">
                            <div className="bg-gradient-to-br from-purple-900/70 to-purple-800/50 backdrop-blur-sm rounded-3xl p-10 hover:from-purple-800/80 hover:to-purple-700/60 transition-all duration-500 border border-purple-700/30 shadow-2xl">
                                <div className="mb-8">
                                    <h3 className="text-3xl font-bold text-white mb-4">Smart Visualizations</h3>
                                    <p className="text-purple-100 text-lg leading-relaxed">
                                        Beautiful charts and dashboards that transform complex data into clear, actionable insights.
                                    </p>
                                </div>
                                
                                {/* Dashboard Preview */}
                                <div className="bg-black/40 rounded-2xl p-6 border border-purple-600/20">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="text-sm text-purple-300 font-semibold">Live Dashboard</div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                            <span className="text-green-400 text-xs font-medium">Live</span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gradient-to-br from-green-900/40 to-green-800/30 rounded-xl p-4 border border-green-700/30">
                                            <div className="text-2xl font-bold text-green-400">$47.2K</div>
                                            <div className="text-xs text-green-300 font-medium">Revenue</div>
                                            <div className="text-xs text-green-400 mt-1">↗ +12.5%</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/30 rounded-xl p-4 border border-blue-700/30">
                                            <div className="text-2xl font-bold text-blue-400">2,847</div>
                                            <div className="text-xs text-blue-300 font-medium">Users</div>
                                            <div className="text-xs text-blue-400 mt-1">↗ +8.3%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Features */}
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { 
                                title: "File Processing", 
                                desc: "Support for multiple data formats including CSV, Excel, JSON, and databases",
                                icon: "📁",
                                color: "from-emerald-600 to-teal-600"
                            },
                            { 
                                title: "AI Research", 
                                desc: "Automated insights generation with machine learning algorithms",
                                icon: "🤖",
                                color: "from-orange-600 to-red-600"
                            },
                            { 
                                title: "Export Options", 
                                desc: "Share results in PDF, Excel, API endpoints, and more",
                                icon: "📤",
                                color: "from-indigo-600 to-purple-600"
                            }
                        ].map((feature, index) => (
                            <div key={index} className="animate-on-scroll">
                                <div className="text-center p-8 rounded-2xl bg-gray-800/40 border border-gray-600/30 hover:bg-gray-700/50 hover:border-gray-500/40 transition-all duration-300 group">
                                    <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                                        <span className="text-2xl">{feature.icon}</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                                    <p className="text-gray-300 leading-relaxed">{feature.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* How It Works Section */}
                <section id="how-it-works" className="py-32 bg-gradient-to-b from-gray-900/50 to-gray-800/50 relative">
                    <div className="max-w-4xl mx-auto px-6 relative z-10">
                        <div className="text-center mb-24">
                            <h2 className="text-5xl font-bold mb-6 animate-on-scroll text-white">How It Works</h2>
                            <p className="text-xl text-gray-300 animate-on-scroll">Transform your data in three simple steps</p>
                        </div>
                        
                        {/* Timeline */}
                        <div className="relative">
                            {/* Timeline Line */}
                            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-blue-500 via-purple-500 to-indigo-500 rounded-full"></div>
                            
                            {/* Timeline Steps */}
                            <div className="space-y-32">
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
                                        <div className="absolute left-1/2 transform -translate-x-1/2 z-10">
                                            <div className={`w-20 h-20 bg-gradient-to-br ${item.color} rounded-full flex items-center justify-center shadow-2xl border-4 border-gray-900`}>
                                                <span className="text-white font-bold text-lg">{item.step}</span>
                                            </div>
                                        </div>
                                        
                                        {/* Content */}
                                        <div className={`${
                                            item.side === 'right' 
                                                ? 'ml-auto pl-20 text-left' 
                                                : 'mr-auto pr-20 text-right'
                                        } w-1/2`}>
                                            <div className={`bg-gradient-to-br ${item.color}/20 backdrop-blur-sm rounded-3xl p-8 border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300`}>
                                                <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
                                                <p className="text-gray-200 text-lg leading-relaxed">
                                                    {item.description}
                                                </p>
                                            </div>
                                            
                                            {/* Connection line */}
                                            <div className={`absolute top-10 ${
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
                        <div className="text-center mt-24 animate-on-scroll">
                            <p className="text-lg text-gray-300 mb-6 font-medium">Ready to unlock the power of your data?</p>
                            <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-12 py-4 rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-bold text-lg transform hover:scale-105 shadow-xl">
                                Start Your Journey
                            </button>
                        </div>
                    </div>
                    
                    {/* Background Elements */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                        <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl"></div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-20 max-w-7xl mx-auto px-6">
                    <h2 className="text-4xl font-bold text-center mb-16 animate-on-scroll">Choose Your Plan</h2>
                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
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
                            <div key={index} className={`relative bg-gray-900 p-8 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl animate-on-scroll ${
                                plan.popular ? 'ring-2 ring-white ring-opacity-50 bg-gradient-to-b from-gray-800 to-gray-900' : ''
                            }`}>
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                        <span className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold">Most Popular</span>
                                    </div>
                                )}
                                <div className="text-center mb-8">
                                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                                    <div className="mb-4">
                                        <span className="text-4xl font-bold">{plan.price}</span>
                                        <span className="text-gray-400">{plan.period}</span>
                                    </div>
                                    <p className="text-gray-300">{plan.description}</p>
                                </div>
                                <ul className="space-y-3 mb-8">
                                    {plan.features.map((feature, featureIndex) => (
                                        <li key={featureIndex} className="flex items-center space-x-3">
                                            <div className="text-green-400">✓</div>
                                            <span className="text-gray-300">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button className={`w-full py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 ${
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
                <section className="py-20 max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-4xl font-bold mb-6 animate-on-scroll">Ready to Transform Your Data?</h2>
                    <p className="text-xl text-gray-300 mb-8 animate-on-scroll">
                        Join thousands of users who trust quokkaAI to unlock the power of their data.
                    </p>
                    <button className="bg-white text-black px-12 py-4 rounded-lg hover:bg-gray-100 transition-all duration-200 font-medium text-lg transform hover:scale-105 hover:shadow-xl animate-on-scroll">
                        Start Your Free Trial
                    </button>
                </section>

                {/* Footer */}
                <footer id="contact" className="border-t border-gray-800 py-12">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="flex flex-col md:flex-row justify-between items-center">
                            <div className="flex items-center space-x-3 mb-4 md:mb-0">
                                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center transform hover:scale-110 transition-transform duration-200">
                                    <div className="text-black font-bold">🐨</div>
                                </div>
                                <span className="text-xl font-bold">quokkaAI</span>
                            </div>
                            <div className="text-gray-400 text-sm">
                                © 2024 quokkaAI. All rights reserved.
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}