/* ===== Easy Workflow Pro — Main JavaScript ===== */

// ===== GEO-BASED CURRENCY DETECTION =====
// Pricing config: Indian users see INR, everyone else sees USD
const PRICING = {
    IN: {
        currency: 'INR',
        symbol: '₹',
        basic: { amount: 100, label: '₹100', gumroadLink: 'https://harshedits55.gumroad.com/l/Easyworkflow', formValue: 'basic - ₹100' },
        pro: { amount: 1500, label: '₹1500', gumroadLink: 'https://harshedits55.gumroad.com/l/Easyworkflowpro/lo8on3n', formValue: 'pro - ₹1500' },
        showUPI: true,
        badge: '🇮🇳 Prices in INR'
    },
    US: {
        currency: 'USD',
        symbol: '$',
        basic: { amount: 2, label: '$2', gumroadLink: 'https://harshedits55.gumroad.com/l/Easyworkflow', formValue: 'basic - $2' },
        pro: { amount: 18, label: '$18', gumroadLink: 'https://harshedits55.gumroad.com/l/Easyworkflowpro/lo8on3n', formValue: 'pro - $18' },
        showUPI: false,
        badge: '🌍 Prices in USD'
    }
};

// Detected region config — defaults to IN until API call completes
// (site is India-primary; non-Indian users switch to USD once geo-API responds)
window.pricingRegion = PRICING.IN;

function applyPricingToPage(region) {
    const p = region;
    const sym = p.symbol;
    const basicAmt = p.basic.amount;
    const proAmt = p.pro.amount;

    // --- Pricing section currencies and values ---
    // Price currency symbols
    document.querySelectorAll('.price-currency').forEach(el => { el.textContent = sym; });

    // Price values — update based on sibling label context
    document.querySelectorAll('.price-card').forEach(card => {
        const titleEl = card.querySelector('h3');
        const valueEl = card.querySelector('.price-value');
        const noteEl = card.querySelector('.price-note');
        const btnBlock = card.querySelector('.btn-block');
        if (!titleEl || !valueEl) return;

        const isProCard = titleEl.textContent.trim().toLowerCase().includes('pro');

        if (isProCard) {
            valueEl.textContent = proAmt;
            // Update inline CTA button text
            if (btnBlock && btnBlock.id === 'btn-pro') {
                btnBlock.textContent = `Get Pro — ${p.pro.label}`;
            }
        } else {
            valueEl.textContent = basicAmt;
            // Update note text
            if (noteEl && noteEl.textContent.includes('100') || noteEl && noteEl.textContent.includes('2')) {
                noteEl.innerHTML = `Just ${p.basic.label} for lifetime access`;
            }
            // Update Basic card button
            if (btnBlock && (btnBlock.dataset.tier === 'basic' || btnBlock.id === 'btn-free')) {
                const isPayBtn = btnBlock.classList.contains('btn-pay');
                if (isPayBtn) btnBlock.textContent = `Get Basic — ${p.basic.label}`;
            }
        }
    });

    // Price badge on free version card ("JUST ₹100" / "JUST $2")
    document.querySelectorAll('.price-badge').forEach(badge => {
        if (badge.textContent.includes('POPULAR')) return; // skip "MOST POPULAR"
        badge.textContent = `JUST ${p.basic.label}`;
    });

    // --- CTA section buttons ---
    document.querySelectorAll('a[href="#pricing"].btn-primary.pro-only').forEach(btn => {
        btn.textContent = `Get Pro — ${p.pro.label}`;
    });
    document.querySelectorAll('.btn-pay').forEach(btn => {
        btn.textContent = `Get Basic Script — ${p.basic.label}`;
    });

    // --- Hero section CTA (has an inner <span>, needs separate targeting) ---
    const heroCTAText = document.getElementById('hero-pro-cta-text');
    if (heroCTAText) heroCTAText.textContent = `Get Pro — ${p.pro.label}`;

    // --- Hero free subtitle inline price ---
    const heroBasicInline = document.getElementById('hero-basic-price-inline');
    if (heroBasicInline) heroBasicInline.textContent = p.basic.label;

    // Inline text notes
    document.querySelectorAll('.price-note').forEach(note => {
        if (note.querySelector('a')) return; // skip notes with links
        if (note.textContent.includes('Just') || note.textContent.includes('Instant')) {
            if (note.closest('.price-card-pro')) {
                note.innerHTML = `Instant download • Lifetime access`;
            }
        }
    });

    // --- FAQ text updates ---
    document.querySelectorAll('.faq-answer p').forEach(p_el => {
        // Replace INR mentions with correct currency
        if (p.currency === 'USD') {
            p_el.innerHTML = p_el.innerHTML
                .replace(/₹100/g, '$2')
                .replace(/₹1[,.]?500/g, '$18')
                .replace(/₹1500/g, '$18');
        }
    });

    // --- Currency badge in pricing header ---
    // Inject or update a small badge showing which currency is active
    let badge = document.getElementById('currency-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'currency-badge';
        badge.style.cssText = [
            'display:inline-flex', 'align-items:center', 'gap:6px',
            'background:rgba(255,255,255,0.06)', 'border:1px solid rgba(255,255,255,0.12)',
            'border-radius:20px', 'padding:4px 14px', 'font-size:12px',
            'color:var(--text-secondary)', 'margin-top:12px', 'letter-spacing:0.03em'
        ].join(';');
        // Append after each pricing section-header subtitle
        document.querySelectorAll('.pricing .section-subtitle').forEach(subtitle => {
            const clone = badge.cloneNode(true);
            clone.textContent = p.badge;
            subtitle.insertAdjacentElement('afterend', clone);
        });
    } else {
        document.querySelectorAll('#currency-badge').forEach(b => { b.textContent = p.badge; });
    }
}

async function detectAndApplyCurrency() {
    // ---- URL OVERRIDE FOR TESTING ----
    // Add ?currency=usd or ?currency=inr to the URL to force a currency
    const urlParam = new URLSearchParams(window.location.search).get('currency');
    if (urlParam === 'usd') {
        window.pricingRegion = PRICING.US;
        applyPricingToPage(window.pricingRegion);
        return;
    }
    if (urlParam === 'inr') {
        window.pricingRegion = PRICING.IN;
        applyPricingToPage(window.pricingRegion);
        return;
    }
    // ----------------------------------

    // Helper: try a single geo API, returns country code string or null
    async function tryGeoAPI(url, extractor) {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
            if (!res.ok) return null;
            const data = await res.json();
            const code = extractor(data);
            return (typeof code === 'string' && code.length === 2) ? code.toUpperCase() : null;
        } catch (e) {
            return null;
        }
    }

    // Try 4 HTTPS-compatible geo APIs in order — stops as soon as one works
    // NOTE: ip-api.com was removed — it does NOT support HTTPS on the free tier
    let countryCode =
        await tryGeoAPI('https://ipapi.co/json/', d => d.country_code) ||
        await tryGeoAPI('https://freeipapi.com/api/json', d => d.countryCode) ||
        await tryGeoAPI('https://api.country.is/', d => d.country) ||
        await tryGeoAPI('https://ipinfo.io/json', d => d.country);

    if (countryCode) {
        window.pricingRegion = (countryCode === 'IN') ? PRICING.IN : PRICING.US;
    } else {
        // All APIs failed — default to INR (site is India-primary)
        window.pricingRegion = PRICING.IN;
    }

    applyPricingToPage(window.pricingRegion);
}

// Run geo-detection immediately (before DOM ready, catches early elements)
detectAndApplyCurrency();

// Re-apply after DOM is fully ready to catch elements rendered after script runs
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to let the page fully paint before re-applying
    setTimeout(() => applyPricingToPage(window.pricingRegion), 100);
});

document.addEventListener('DOMContentLoaded', () => {

    // ===== LENIS SMOOTH SCROLL =====
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // ===== NAVBAR SCROLL =====
    const navbar = document.getElementById('navbar');

    const handleScroll = () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // ===== MOBILE MENU =====
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('mobile-open');
        document.body.style.overflow = navLinks.classList.contains('mobile-open') ? 'hidden' : '';
    });

    // Close mobile menu on link click
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('mobile-open');
            document.body.style.overflow = '';
        });
    });

    // ===== SCROLL REVEAL ANIMATIONS =====
    const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.delay || 0;
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, parseInt(delay));
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -60px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // ===== COUNTER ANIMATION =====
    const counters = document.querySelectorAll('.stat-number[data-target]');

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => counterObserver.observe(counter));

    function animateCounter(el) {
        const target = parseInt(el.dataset.target);
        const duration = 2000;
        const start = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(eased * target);

            el.textContent = current.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    // ===== INTERACTIVE TABS =====
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;

            // Update active button
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update active panel
            tabPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === `tab-${targetTab}`) {
                    panel.classList.add('active');
                }
            });
        });
    });

    // ===== FAQ ACCORDION =====
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');

        question.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');

            // Close all items
            faqItems.forEach(i => i.classList.remove('open'));

            // Toggle clicked item
            if (!isOpen) {
                item.classList.add('open');
            }
        });
    });

    // ===== SMOOTH SCROLL =====
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const targetId = anchor.getAttribute('href');
            if (targetId === '#') return;

            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const offset = navbar.offsetHeight + 20;
                const targetPosition = target.getBoundingClientRect().top + window.scrollY - offset;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ===== PARTICLE BACKGROUND (HERO) =====
    const hero = document.querySelector('.hero-bg');
    if (hero) {
        createParticles(hero);
    }

    function createParticles(container) {
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;';
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        let particles = [];
        let animationId;

        function resize() {
            canvas.width = container.offsetWidth;
            canvas.height = container.offsetHeight;
        }

        function createParticle() {
            return {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 0.5,
                speedX: (Math.random() - 0.5) * 0.3,
                speedY: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.5 + 0.1,
                hue: Math.random() > 0.5 ? 270 : 190 // purple or cyan
            };
        }

        function init() {
            resize();
            particles = Array.from({ length: 60 }, createParticle);
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(p => {
                p.x += p.speedX;
                p.y += p.speedY;

                if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
                if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${p.opacity})`;
                ctx.fill();
            });

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(124, 58, 237, ${0.06 * (1 - dist / 150)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            animationId = requestAnimationFrame(draw);
        }

        init();
        draw();

        window.addEventListener('resize', () => {
            resize();
        });
    }

    // ===== NAVBAR ACTIVE LINK HIGHLIGHT =====
    const sections = document.querySelectorAll('section[id]');

    const activeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                navLinks.querySelectorAll('a').forEach(link => {
                    link.classList.toggle('active',
                        link.getAttribute('href') === `#${id}`
                    );
                });
            }
        });
    }, { threshold: 0.3 });

    sections.forEach(section => activeObserver.observe(section));

    // ===== MOCKUP TAB SWITCHING =====
    const mockupTabs = document.querySelectorAll('.mockup-tab[data-mockup-tab]');
    const mockupPanels = document.querySelectorAll('.mockup-panel[data-panel]');

    mockupTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.mockupTab;

            // Switch active tab
            mockupTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Switch active panel
            mockupPanels.forEach(p => {
                p.classList.remove('active');
                if (p.dataset.panel === target) {
                    p.classList.add('active');
                }
            });
        });
    });
    // ===== CURSOR GLOW =====
    const cursorGlow = document.createElement('div');
    cursorGlow.classList.add('cursor-glow');
    document.body.appendChild(cursorGlow);

    let glowX = 0, glowY = 0, currentX = 0, currentY = 0;
    document.addEventListener('mousemove', (e) => {
        glowX = e.clientX;
        glowY = e.clientY;
    });

    function updateGlow() {
        currentX += (glowX - currentX) * 0.08;
        currentY += (glowY - currentY) * 0.08;
        cursorGlow.style.left = currentX + 'px';
        cursorGlow.style.top = currentY + 'px';
        requestAnimationFrame(updateGlow);
    }
    updateGlow();

    // ===== SCROLL PROGRESS BAR =====
    const scrollProgress = document.createElement('div');
    scrollProgress.classList.add('scroll-progress');
    document.body.appendChild(scrollProgress);

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = docHeight > 0 ? scrollTop / docHeight : 0;
        scrollProgress.style.transform = `scaleX(${scrollPercent})`;
    }, { passive: true });

    // ===== PAGE LOADER =====
    const loader = document.querySelector('.page-loader');
    if (loader) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                loader.classList.add('hidden');
            }, 300);
        });
    }

    // ===== SUBTLE PARALLAX ON GLOW ORBS =====
    const orbs = document.querySelectorAll('.glow-orb');
    if (orbs.length > 0) {
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            orbs.forEach((orb, i) => {
                const speed = (i + 1) * 0.03;
                orb.style.transform = `translateY(${scrollY * speed}px)`;
            });
        }, { passive: true });
    }
    // ===== VERSION TOGGLE (FREE / PRO) =====
    const toggleOptions = document.querySelectorAll('.toggle-option');
    const body = document.body;

    toggleOptions.forEach(option => {
        option.addEventListener('click', () => {
            const version = option.dataset.version;
            const currentVersion = body.getAttribute('data-version');

            // Don't switch if already on this version
            if (version === currentVersion) return;

            // Update toggle UI
            toggleOptions.forEach(o => o.classList.remove('active'));
            option.classList.add('active');

            // Start transition animation (3D flip out)
            body.classList.add('version-transitioning');

            // Wait for flip-out to complete
            setTimeout(() => {
                // Switch version
                body.setAttribute('data-version', version);

                // Swap classes for entrance animation (3D flip in)
                body.classList.remove('version-transitioning');
                body.classList.add('version-entering');

                // Re-trigger reveal animations for newly visible content
                const newVisibleElements = document.querySelectorAll(
                    `.${version === 'free' ? 'free' : 'pro'}-only .reveal, .${version === 'free' ? 'free' : 'pro'}-only.reveal`
                );
                newVisibleElements.forEach(el => {
                    el.classList.remove('active');
                    void el.offsetWidth; // Force reflow
                    el.classList.add('active');
                });

                // Reset deep-dive tabs - activate the first tab for current version
                const activeTabsNav = document.querySelector(`.tabs-nav.${version}-only`);
                if (activeTabsNav) {
                    const firstBtn = activeTabsNav.querySelector('.tab-btn');
                    if (firstBtn) {
                        // Clear all tab buttons active state
                        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                        firstBtn.classList.add('active');

                        // Clear all panels, activate the first one
                        const targetTab = firstBtn.dataset.tab;
                        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                        const targetPanel = document.getElementById(`tab-${targetTab}`);
                        if (targetPanel) targetPanel.classList.add('active');
                    }
                }

                // Reset mockup tabs - activate the first tab for current version
                const activeMockupTabsNav = document.querySelector(`.mockup-tabs.${version}-only`);
                if (activeMockupTabsNav) {
                    const firstMockupBtn = activeMockupTabsNav.querySelector('.mockup-tab');
                    if (firstMockupBtn) {
                        // Clear all mockup tab buttons active state
                        document.querySelectorAll('.mockup-tab').forEach(b => b.classList.remove('active'));
                        firstMockupBtn.classList.add('active');

                        // Clear all mockup panels, activate the first one correctly
                        const targetMockup = firstMockupBtn.dataset.mockupTab;
                        document.querySelectorAll('.mockup-panel').forEach(p => p.classList.remove('active'));

                        const targetPanels = document.querySelectorAll(`.mockup-panel[data-panel="${targetMockup}"]`);
                        targetPanels.forEach(p => {
                            if (p.classList.contains('pro-only') && version !== 'pro') return;
                            if (p.classList.contains('free-only') && version !== 'free') return;
                            p.classList.add('active');
                        });
                    }
                }

                // Re-animate stat counters
                const visibleCounters = document.querySelectorAll(
                    `.${version === 'free' ? 'free' : 'pro'}-only .stat-number[data-target]`
                );
                visibleCounters.forEach(counter => {
                    counter.textContent = '0';
                    animateCounter(counter);
                });

                // End transition animation
                setTimeout(() => {
                    body.classList.remove('version-entering');
                }, 600);
            }, 500);
        });
    });

    // ===== GET PRO MODAL LOGIC =====
    const proButtons = document.querySelectorAll('#btn-pro');

    // Create Modal Element
    const modalOverlay = document.createElement('div');
    modalOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);backdrop-filter:blur(5px);z-index:9999;display:none;justify-content:center;align-items:center;opacity:0;transition:opacity 0.3s ease;';

    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:32px;max-width:500px;width:90%;position:relative;transform:translateY(20px);transition:transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);box-shadow:0 20px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.1);text-align:center;';

    // Modal Content
    modalBox.innerHTML = `
        <button id="close-modal" style="position:absolute;top:16px;right:16px;background:none;border:none;color:var(--text-secondary);font-size:24px;cursor:pointer;line-height:1;">&times;</button>
        <h2 id="modal-title" style="font-family:var(--font-heading);color:white;margin-bottom:8px;font-size:24px;">Upgrade to Pro</h2>
        <p style="color:var(--text-secondary);margin-bottom:24px;font-size:14px;">Choose your preferred payment method. After UPI payment, you will receive a 100% discount Gumroad link.</p>
        
        <div style="display:flex;flex-direction:column;gap:16px;">
            <!-- Gumroad Option -->
            <a id="gumroad-link" href="https://harshedits55.gumroad.com/l/Easyworkflowpro/lo8on3n" target="_blank" style="text-decoration:none;">
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px;display:flex;align-items:center;gap:16px;transition:all 0.2s ease;cursor:pointer;" onmouseover="this.style.background='rgba(124,58,237,0.1)';this.style.borderColor='var(--purple)';" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.1)';">
                    <div style="width:40px;height:40px;background:#ff90e8;border-radius:8px;display:flex;justify-content:center;align-items:center;font-weight:bold;color:black;">G</div>
                    <div style="text-align:left;">
                        <h3 style="color:white;font-size:16px;margin:0;">Pay via Gumroad</h3>
                        <p style="color:var(--text-muted);font-size:12px;margin:2px 0 0 0;">International & Cards • Instant Download</p>
                    </div>
                </div>
            </a>

            <!-- UPI Option -->
            <div id="upi-option" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px;display:flex;align-items:center;gap:16px;transition:all 0.2s ease;cursor:pointer;" onmouseover="this.style.background='rgba(16,185,129,0.1)';this.style.borderColor='var(--green)';" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.1)';">
                <div style="width:40px;height:40px;background:#10b981;border-radius:8px;display:flex;justify-content:center;align-items:center;color:white;"><i class="fa-solid fa-qrcode"></i></div>
                <div style="text-align:left;">
                    <h3 style="color:white;font-size:16px;margin:0;">Pay via UPI (India)</h3>
                    <p style="color:var(--text-muted);font-size:12px;margin:2px 0 0 0;">Google Pay, PhonePe, Paytm</p>
                </div>
            </div>
        </div>
        
        <!-- UPI Details Form (Hidden Initially) -->
        <div id="upi-details" style="display:none;margin-top:24px;text-align:left;animation:panelFadeIn 0.3s ease;">
            <hr style="border:0;border-top:1px solid rgba(255,255,255,0.1);margin-bottom:24px;">
            <div style="text-align:center;margin-bottom:20px;">
                <div style="width:150px;height:150px;background:white;margin:0 auto 12px auto;border-radius:8px;display:flex;justify-content:center;align-items:center;color:black;font-size:12px;overflow:hidden;">
                    <img src="qr-code.png" alt="PhonePe QR Code" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" />
                </div>
                <p style="color:var(--text-secondary);font-size:13px;">Scan to pay <strong id="upi-price">₹1500</strong></p>
            </div>
            
            <form id="upi-form" action="https://formspree.io/f/mgolnydk" method="POST">
                <input type="hidden" name="purchased_tier" id="form-tier" value="pro">
                <div style="margin-bottom:12px;">
                    <label style="display:block;color:var(--text-secondary);font-size:12px;margin-bottom:4px;">Full Name</label>
                    <input type="text" name="name" required style="width:100%;background:rgba(0,0,0,0.3);border:1px solid var(--border);padding:10px 12px;border-radius:8px;color:white;font-family:inherit;font-size:14px;box-sizing:border-box;">
                </div>
                <div style="margin-bottom:12px;">
                    <label style="display:block;color:var(--text-secondary);font-size:12px;margin-bottom:4px;">Email Address</label>
                    <input type="email" name="email" required style="width:100%;background:rgba(0,0,0,0.3);border:1px solid var(--border);padding:10px 12px;border-radius:8px;color:white;font-family:inherit;font-size:14px;box-sizing:border-box;">
                </div>
                <div style="margin-bottom:20px;">
                    <label style="display:block;color:var(--text-secondary);font-size:12px;margin-bottom:4px;">Phone Number (WhatsApp)</label>
                    <input type="tel" name="phone" required style="width:100%;background:rgba(0,0,0,0.3);border:1px solid var(--border);padding:10px 12px;border-radius:8px;color:white;font-family:inherit;font-size:14px;box-sizing:border-box;">
                </div>
                <button type="submit" id="upi-submit-btn" class="btn btn-primary btn-block">Confirm Payment</button>
                <p style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:12px;">We'll email you a 100% discount Gumroad link after verifying the payment.</p>
            </form>
        </div>
    `;

    modalOverlay.appendChild(modalBox);
    document.body.appendChild(modalOverlay);

    // Open Modal function
    function openModal(e) {
        if (e) e.preventDefault();

        // Determine if basic or pro was clicked
        let tier = 'pro';
        if (e && e.currentTarget && e.currentTarget.getAttribute('data-tier') === 'basic') {
            tier = 'basic';
        } else if (e && e.currentTarget && e.currentTarget.getAttribute('data-tier') === 'pro') {
            tier = 'pro';
        } else {
            // fallback if called generically, assume current view context
            tier = document.body.getAttribute('data-version') === 'pro' ? 'pro' : 'basic';
        }

        // Dynamically update modal content based on the selected tier + detected currency
        const region = window.pricingRegion || PRICING.IN;
        const tierConfig = (tier === 'basic') ? region.basic : region.pro;

        if (tier === 'basic') {
            document.getElementById('modal-title').textContent = 'Get Workflow Basic';
        } else {
            document.getElementById('modal-title').textContent = 'Upgrade to Pro';
        }
        document.getElementById('gumroad-link').href = tierConfig.gumroadLink;
        document.getElementById('upi-price').textContent = tierConfig.label;
        document.getElementById('form-tier').value = tierConfig.formValue;

        // Update the modal sub-description based on region
        const modalDesc = modalBox.querySelector('p');
        if (modalDesc) {
            if (region.showUPI) {
                modalDesc.textContent = 'Choose your preferred payment method. After UPI payment, you will receive a 100% discount Gumroad link.';
            } else {
                modalDesc.textContent = 'Click below to complete your purchase securely via Gumroad. Instant download after payment.';
            }
        }

        // Show/Hide UPI option based on region
        const upiOptionEl = document.getElementById('upi-option');
        const upiDetailsEl = document.getElementById('upi-details');
        if (upiOptionEl) {
            upiOptionEl.style.display = region.showUPI ? 'flex' : 'none';
        }
        if (!region.showUPI && upiDetailsEl) {
            upiDetailsEl.style.display = 'none';
        }

        // Update Gumroad button label for non-Indian users
        const gumroadInnerLabel = modalBox.querySelector('#gumroad-link h3');
        if (gumroadInnerLabel) {
            gumroadInnerLabel.textContent = region.showUPI ? 'Pay via Gumroad' : `Pay via Gumroad — ${tierConfig.label}`;
        }

        modalOverlay.style.display = 'flex';
        // Trigger layout reflow
        void modalOverlay.offsetWidth;
        modalOverlay.style.opacity = '1';
        modalBox.style.transform = 'translateY(0)';
        document.body.style.overflow = 'hidden'; // prevent bg scroll
    }

    // Close Modal function
    function closeModal() {
        modalOverlay.style.opacity = '0';
        modalBox.style.transform = 'translateY(20px)';
        setTimeout(() => {
            modalOverlay.style.display = 'none';
            document.body.style.overflow = '';
            // reset UPI form visibility if it was open
            document.getElementById('upi-details').style.display = 'none';
        }, 300);
    }

    // Attach listeners to Pro buttons
    proButtons.forEach(btn => btn.addEventListener('click', openModal));
    // Also attach to navbar Get Pro button
    const navProBtns = document.querySelectorAll('a[href="#pricing"].btn-primary.pro-only');
    navProBtns.forEach(btn => btn.addEventListener('click', openModal));

    // Attach listeners to basic buttons
    const basicBtns = document.querySelectorAll('.btn-pay');
    basicBtns.forEach(btn => btn.addEventListener('click', openModal));

    // Close listeners
    document.getElementById('close-modal').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // UPI Option Click -> Show Form
    document.getElementById('upi-option').addEventListener('click', () => {
        const upiDetails = document.getElementById('upi-details');
        if (upiDetails.style.display === 'none') {
            upiDetails.style.display = 'block';
        }
    });

    // Form Submission (Handle via Formspree AJAX to stay on page)
    const upiForm = document.getElementById('upi-form');
    upiForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('upi-submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;

        const formData = new FormData(upiForm);

        try {
            const response = await fetch(upiForm.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                showToast('Details submitted successfully! Verification usually takes a few minutes. We will email you the Gumroad link with a 100% discount code shortly.', 'success');
                closeModal();
                upiForm.reset();
            } else {
                showToast('Oops! There was a problem submitting your form. Please try again.', 'error');
            }
        } catch (error) {
            showToast('Oops! There was a problem submitting your form. Please check your internet connection and try again.', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

});

// ===== CENTERED ALERT NOTIFICATION ======
function showToast(message, type = 'success') {
    // Alert Overlay
    const alertOverlay = document.createElement('div');
    alertOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        backdrop-filter: blur(5px);
        z-index: 10001;
        display: flex;
        justify-content: center;
        align-items: center;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    const bgColor = type === 'success' ? '#10b981' : '#ef4444';
    const textColor = type === 'success' ? '#10b981' : '#ef4444';

    // Alert Box
    const alertBox = document.createElement('div');
    alertBox.style.cssText = `
        background: var(--bg-card);
        border: 2px solid ${bgColor};
        color: white;
        padding: 32px;
        border-radius: 12px;
        box-shadow: 0 20px 80px rgba(0,0,0,0.6);
        font-size: 16px;
        text-align: center;
        max-width: 500px;
        width: 90%;
        transform: translateY(20px) scale(0.95);
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;

    alertBox.innerHTML = `
        <div style="font-weight:700; font-family:var(--font-heading); font-size:24px; margin-bottom:12px; color:${textColor};">
            ${type === 'success' ? 'Success!' : 'Error'}
        </div>
        <div style="color:var(--text-secondary); line-height:1.6; font-size:16px; margin-bottom:24px;">
            ${message}
        </div>
        <button id="alert-ok-btn" style="
            background: ${bgColor}; 
            color: white; 
            border: none; 
            padding: 12px 32px; 
            font-size: 16px; 
            font-weight: 600; 
            border-radius: 8px; 
            cursor: pointer;
            transition: opacity 0.2s;
        ">OK</button>
    `;

    alertOverlay.appendChild(alertBox);
    document.body.appendChild(alertOverlay);

    // Fade in
    setTimeout(() => {
        alertOverlay.style.opacity = '1';
        alertBox.style.transform = 'translateY(0) scale(1)';
    }, 10);

    // Dismiss Logic
    function dismissAlert() {
        alertOverlay.style.opacity = '0';
        alertBox.style.transform = 'translateY(20px) scale(0.95)';
        setTimeout(() => {
            alertOverlay.remove();
        }, 300);
    }

    // Attach click listener to OK button
    const okBtn = alertBox.querySelector('#alert-ok-btn');
    okBtn.addEventListener('click', dismissAlert);

    // Hover effect on OK button
    okBtn.addEventListener('mouseover', () => okBtn.style.opacity = '0.8');
    okBtn.addEventListener('mouseout', () => okBtn.style.opacity = '1');
}
