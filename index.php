<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Adly 🤖 - منصة التسويق الذكية للأعمال والوكالات</title>
    <meta name="description" content="منصة تسويق ذكية شاملة للمصالح الصغيرة والوكالات. تصاميم، نصوص، فيديوهات، وحملات إعلانية - كل احتياجاتك في مكان واحد بأسعار عادلة.">
    
    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="shortcut icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/site.webmanifest" />
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
    
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-6D6PKSE06T"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-6D6PKSE06T');
    </script>
    
    <!-- Meta Pixel Code -->
    <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '711703011262499');
    fbq('track', 'PageView');
    </script>
    <noscript><img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=711703011262499&ev=PageView&noscript=1"
    /></noscript>
    
    <!-- Hotjar -->
    <script>
        (function (c, s, q, u, a, r, e) {
            c.hj=c.hj||function(){(c.hj.q=c.hj.q||[]).push(arguments)};
            c._hjSettings = { hjid: a };
            r = s.getElementsByTagName('head')[0];
            e = s.createElement('script');
            e.async = true;
            e.src = q + c._hjSettings.hjid + u;
            r.appendChild(e);
        })(window, document, 'https://static.hj.contentsquare.net/c/csq-', '.js', 6550468);
    </script>
    
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://getadly.com/">
    <meta property="og:title" content="Adly 🤖 - منصة التسويق الذكية">
    <meta property="og:description" content="منصة تسويق ذكية شاملة للمصالح الصغيرة والوكالات">
    <meta property="og:site_name" content="آدلي">
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        html {
            scroll-behavior: smooth;
        }
        
        body {
            font-family: 'Cairo', sans-serif;
            line-height: 1.6;
            color: #1a202c;
            background: #ffffff;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        /* Header */
        header {
            background: rgba(250, 245, 255, 0.95);
            backdrop-filter: blur(10px);
            color: #1a202c;
            padding: 15px 0;
            position: sticky;
            top: 0;
            z-index: 1000;
            border-bottom: 1px solid #e9d5ff;
        }
        
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo {
            font-size: 32px;
            font-weight: 900;
            background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .cta-button {
            background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
            color: white;
            padding: 12px 28px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 700;
            font-size: 16px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(147, 51, 234, 0.3);
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(147, 51, 234, 0.4);
        }
        
        /* Hero */
        .hero {
            background: linear-gradient(180deg, #faf5ff 0%, #f3e8ff 50%, #ede9fe 100%);
            color: #1a202c;
            padding: 80px 0 100px;
            text-align: center;
        }
        
        .hero-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: white;
            border: 1px solid #e9d5ff;
            padding: 10px 24px;
            border-radius: 50px;
            font-size: 16px;
            font-weight: 600;
            color: #7c3aed;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(147, 51, 234, 0.1);
        }
        
        .hero-badge .sparkle {
            font-size: 18px;
        }
        
        .hero h1 {
            font-size: 52px;
            font-weight: 900;
            margin-bottom: 10px;
            line-height: 1.3;
            color: #1a202c;
        }
        
        .hero h1 .highlight {
            background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .hero .subtitle {
            font-size: 20px;
            margin-bottom: 15px;
            font-weight: 500;
            max-width: 800px;
            margin-right: auto;
            margin-left: auto;
            color: #475569;
            line-height: 1.8;
        }
        
        .hero .subtitle strong {
            color: #1a202c;
            font-weight: 700;
        }
        
        .hero .subtitle-secondary {
            font-size: 18px;
            color: #7c3aed;
            font-weight: 600;
            margin-bottom: 35px;
        }
        
        .hero-buttons {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
            margin-bottom: 25px;
        }
        
        .hero-cta {
            background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
            color: white;
            padding: 18px 45px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 700;
            font-size: 20px;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s ease;
            box-shadow: 0 10px 30px rgba(147, 51, 234, 0.3);
        }
        
        .hero-cta:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 40px rgba(147, 51, 234, 0.4);
        }
        
        .hero-cta-secondary {
            background: white;
            color: #7c3aed;
            padding: 18px 45px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 700;
            font-size: 20px;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s ease;
            border: 2px solid #e9d5ff;
        }
        
        .hero-cta-secondary:hover {
            border-color: #9333ea;
            background: #faf5ff;
        }
        
        .hero-trust {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: #7c3aed;
            font-size: 15px;
            font-weight: 500;
            margin-bottom: 30px;
        }
        
        .hero-social-proof {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            color: #64748b;
            font-size: 16px;
        }
        
        .avatar-stack {
            display: flex;
        }
        
        .avatar-stack .avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, #e9d5ff 0%, #c4b5fd 100%);
            border: 2px solid white;
            margin-right: -10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            color: #7c3aed;
        }
        
        .hero-social-proof strong {
            color: #7c3aed;
            font-weight: 700;
        }
        
        /* Section Common Styles */
        section {
            padding: 80px 0;
        }
        
        .section-title {
            text-align: center;
            font-size: 44px;
            font-weight: 900;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .section-subtitle {
            text-align: center;
            font-size: 20px;
            color: #64748b;
            margin-bottom: 50px;
        }
        
        /* For Everyone Section */
        .for-everyone {
            background: #faf5ff;
        }
        
        .audience-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 30px;
        }
        
        .audience-card {
            background: white;
            padding: 40px;
            border-radius: 20px;
            border-top: 4px solid #9333ea;
            box-shadow: 0 4px 15px rgba(147, 51, 234, 0.1);
        }
        
        .audience-card h3 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 20px;
            color: #9333ea;
        }
        
        .audience-card p {
            font-size: 18px;
            color: #475569;
            line-height: 1.7;
            margin-bottom: 20px;
        }
        
        .audience-card ul {
            list-style: none;
            padding: 0;
        }
        
        .audience-card li {
            font-size: 16px;
            padding: 10px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .audience-card li:before {
            content: "✓";
            color: #16a34a;
            font-weight: 900;
            margin-left: 10px;
        }
        
        /* Features Grid */
        .features {
            background: white;
        }
        
        .features-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 25px;
        }
        
        .feature-card {
            background: linear-gradient(135deg, #faf5ff 0%, #fce7f3 100%);
            padding: 30px;
            border-radius: 16px;
            border-top: 3px solid #9333ea;
            transition: all 0.3s ease;
            text-align: center;
        }
        
        .feature-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(147, 51, 234, 0.2);
        }
        
        .feature-icon {
            font-size: 42px;
            margin-bottom: 15px;
        }
        
        .feature-card h3 {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 10px;
            color: #9333ea;
        }
        
        .feature-card p {
            font-size: 14px;
            color: #475569;
            line-height: 1.6;
        }
        
        /* Portfolio Gallery - seamless after hero */
        .portfolio {
            background: linear-gradient(180deg, #ede9fe 0%, #1a202c 30%);
            color: white;
            overflow: hidden;
            padding: 40px 0 60px;
        }
        
        /* How It Works Section */
        .how-it-works {
            background: #ffffff;
            padding: 80px 0;
        }
        
        .how-badge {
            display: inline-block;
            background: #f0fdf4;
            color: #16a34a;
            padding: 8px 20px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 20px;
        }
        
        .how-it-works .section-title {
            margin-bottom: 10px;
        }
        
        .steps-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            position: relative;
            margin-top: 60px;
            max-width: 1000px;
            margin-left: auto;
            margin-right: auto;
        }
        
        .steps-line {
            position: absolute;
            top: 50px;
            left: 15%;
            right: 15%;
            height: 4px;
            background: linear-gradient(90deg, #22c55e 0%, #9333ea 50%, #3b82f6 100%);
            border-radius: 2px;
            z-index: 1;
        }
        
        .step {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            flex: 1;
            position: relative;
            z-index: 2;
        }
        
        .step-icon {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .step:nth-child(1) .step-icon {
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            color: white;
        }
        
        .step:nth-child(2) .step-icon {
            background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%);
            color: white;
        }
        
        .step:nth-child(3) .step-icon {
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            color: white;
        }
        
        .step:nth-child(4) .step-icon {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
        }
        
        .step-title {
            font-size: 20px;
            font-weight: 700;
            color: #1a202c;
            margin-bottom: 8px;
        }
        
        .step-desc {
            font-size: 14px;
            color: #64748b;
            max-width: 180px;
            line-height: 1.6;
        }
        
        @media (max-width: 768px) {
            .steps-container {
                flex-direction: column;
                gap: 40px;
                align-items: center;
            }
            
            .steps-line {
                display: none;
            }
            
            .step-icon {
                width: 80px;
                height: 80px;
                font-size: 32px;
            }
        }
        
        /* Before/After Comparison Section */
        .comparison {
            background: linear-gradient(180deg, #faf5ff 0%, #ffffff 100%);
            padding: 80px 0;
        }
        
        .comparison-card {
            background: white;
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.08);
            overflow: hidden;
            max-width: 1100px;
            margin: 0 auto;
        }
        
        .comparison-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
        }
        
        .comparison-column {
            padding: 40px;
        }
        
        .comparison-column.before {
            background: #fff5f5;
            border-left: 4px solid #ef4444;
        }
        
        .comparison-column.after {
            background: #f0fdf4;
            border-left: 4px solid #22c55e;
        }
        
        .comparison-badge {
            display: inline-block;
            padding: 8px 20px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 25px;
        }
        
        .before .comparison-badge {
            background: #fecaca;
            color: #dc2626;
        }
        
        .after .comparison-badge {
            background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
            color: white;
        }
        
        .comparison-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .comparison-list li {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 16px 20px;
            margin-bottom: 12px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 500;
        }
        
        .before .comparison-list li {
            background: white;
            color: #64748b;
        }
        
        .after .comparison-list li {
            background: white;
            color: #1a202c;
        }
        
        .comparison-list .icon {
            font-size: 20px;
            flex-shrink: 0;
        }
        
        .comparison-list .status {
            font-size: 18px;
            flex-shrink: 0;
        }
        
        .before .status {
            color: #ef4444;
        }
        
        .after .status {
            color: #22c55e;
        }
        
        @media (max-width: 768px) {
            .comparison-grid {
                grid-template-columns: 1fr;
            }
            
            .comparison-column {
                padding: 30px 20px;
            }
            
            .comparison-list li {
                padding: 14px 16px;
                font-size: 14px;
            }
        }
        
        .portfolio-row {
            display: flex;
            overflow: hidden;
            width: 100%;
            margin-bottom: 20px;
        }
        
        .portfolio-scroll {
            display: flex;
            flex-shrink: 0;
            gap: 20px;
            padding-right: 20px;
            animation: scroll-left 15s linear infinite;
        }
        
        .portfolio-scroll.reverse {
            animation: scroll-right 15s linear infinite;
        }
        
        /* Left scroll: 0 → -33.33% (scrolls 1 of 3 copies) */
        @keyframes scroll-left {
            from { transform: translateX(0); }
            to { transform: translateX(-33.333%); }
        }
        
        /* Right scroll: starts at -33.33% (visible), scrolls to 0 */
        @keyframes scroll-right {
            from { transform: translateX(-33.333%); }
            to { transform: translateX(0); }
        }
        
        .portfolio-item {
            flex-shrink: 0;
            width: 320px;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            transition: transform 0.3s ease;
        }
        
        .portfolio-item:hover {
            transform: scale(1.05);
        }
        
        .portfolio-item img {
            width: 100%;
            height: auto;
            display: block;
        }
        
        .video-item {
            flex-shrink: 0;
            width: 200px;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            transition: transform 0.3s ease;
        }
        
        .video-item:hover {
            transform: scale(1.05);
        }
        
        .video-item video {
            width: 100%;
            height: auto;
            display: block;
        }
        
        /* Pricing */
        .pricing {
            background: #faf5ff;
            padding: 80px 0;
        }
        
        .pricing-trust-row {
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
            margin: 30px 0 40px;
        }
        
        .trust-pill {
            background: white;
            border: 1px solid #e9d5ff;
            padding: 10px 20px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 600;
            color: #7c3aed;
        }
        
        .pricing-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
        }
        
        .pricing-card {
            background: white;
            padding: 30px 25px;
            border-radius: 20px;
            border: 2px solid #e2e8f0;
            transition: all 0.3s ease;
            position: relative;
        }
        
        .pricing-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(147, 51, 234, 0.2);
            border-color: #9333ea;
        }
        
        .pricing-card.featured {
            border-color: #9333ea;
            box-shadow: 0 10px 30px rgba(147, 51, 234, 0.15);
        }
        
        .popular-badge {
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
            color: white;
            padding: 6px 20px;
            border-radius: 50px;
            font-size: 12px;
            font-weight: 700;
            white-space: nowrap;
        }
        
        .pricing-card h3 {
            font-size: 24px;
            font-weight: 900;
            margin-bottom: 5px;
            color: #1a202c;
        }
        
        .plan-tagline {
            color: #64748b;
            font-size: 14px;
            margin-bottom: 15px;
        }
        
        .price {
            font-size: 38px;
            font-weight: 900;
            color: #9333ea;
            margin-bottom: 5px;
        }
        
        .price span {
            font-size: 16px;
            font-weight: 600;
            color: #64748b;
        }
        
        .trial-note {
            background: #f0fdf4;
            color: #16a34a;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .pricing-features {
            list-style: none;
            padding: 0;
            margin: 0 0 20px 0;
            min-height: 220px;
        }
        
        .pricing-features li {
            padding: 8px 0;
            font-size: 14px;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .pricing-features li:before {
            content: "✓";
            color: #16a34a;
            font-weight: 900;
            margin-left: 8px;
        }
        
        .credits-note {
            text-align: center;
            margin-top: 30px;
            color: #64748b;
            font-size: 14px;
        }
        
        .custom-plans {
            background: white;
            border-radius: 16px;
            padding: 30px 40px;
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 30px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        
        .custom-plans h3 {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 8px;
            color: #1a202c;
        }
        
        .custom-plans p {
            color: #64748b;
            font-size: 14px;
            margin: 0;
        }
        
        .custom-button {
            background: white;
            color: #9333ea;
            border: 2px solid #9333ea;
            padding: 12px 30px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 700;
            font-size: 14px;
            transition: all 0.3s ease;
            white-space: nowrap;
        }
        
        .custom-button:hover {
            background: #9333ea;
            color: white;
        }
        
        /* Final CTA Section */
        .final-cta {
            background: linear-gradient(180deg, #ffffff 0%, #faf5ff 100%);
            padding: 80px 0;
            text-align: center;
        }
        
        .final-cta-badge {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
            color: white;
            padding: 12px 28px;
            border-radius: 50px;
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 30px;
        }
        
        .final-cta h2 {
            font-size: 44px;
            font-weight: 900;
            color: #1a202c;
            margin-bottom: 20px;
            line-height: 1.3;
        }
        
        .final-cta h2 span {
            background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .final-cta-subtitle {
            font-size: 20px;
            color: #64748b;
            margin-bottom: 40px;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }
        
        .final-cta-buttons {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
            margin-bottom: 30px;
        }
        
        .final-cta-primary {
            background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
            color: white;
            padding: 18px 50px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 700;
            font-size: 20px;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s ease;
            box-shadow: 0 10px 30px rgba(147, 51, 234, 0.3);
        }
        
        .final-cta-primary:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 40px rgba(147, 51, 234, 0.4);
        }
        
        .final-cta-secondary {
            background: white;
            color: #7c3aed;
            padding: 18px 50px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 700;
            font-size: 20px;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s ease;
            border: 2px solid #e9d5ff;
        }
        
        .final-cta-secondary:hover {
            border-color: #9333ea;
            background: #faf5ff;
        }
        
        .final-cta-trust {
            display: flex;
            justify-content: center;
            gap: 40px;
            flex-wrap: wrap;
        }
        
        .trust-item {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #64748b;
            font-size: 15px;
        }
        
        .trust-item .icon {
            color: #9333ea;
            font-size: 20px;
        }
        
        /* Interest Modal Styles */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        }

        .modal-overlay.show {
            display: flex;
            animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .modal-content {
            background: white;
            border-radius: 20px;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .modal-header {
            background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
            color: white;
            padding: 25px 30px;
            border-radius: 20px 20px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .modal-header h2 {
            font-size: 24px;
            font-weight: 900;
            margin: 0;
        }

        .modal-close {
            background: none;
            border: none;
            color: white;
            font-size: 30px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background 0.3s ease;
        }

        .modal-close:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        .modal-body {
            padding: 30px;
        }

        .modal-intro {
            color: #64748b;
            font-size: 16px;
            margin-bottom: 25px;
            text-align: center;
            line-height: 1.6;
        }

        .interest-form {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .form-group {
            display: flex;
            flex-direction: column;
        }

        .form-group label {
            color: #1a202c;
            font-weight: 600;
            margin-bottom: 8px;
            font-size: 14px;
        }

        .form-group input,
        .form-group select {
            padding: 15px;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            font-size: 16px;
            font-family: 'Cairo', sans-serif;
            transition: border-color 0.3s ease;
        }

        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: #9333ea;
            box-shadow: 0 0 0 3px rgba(147, 51, 234, 0.1);
        }

        .radio-group {
            display: flex;
            gap: 15px;
            margin-top: 10px;
        }

        .radio-label {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            padding: 12px 20px;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            transition: all 0.3s ease;
            flex: 1;
            justify-content: center;
        }

        .radio-label:hover {
            border-color: #9333ea;
            background: rgba(147, 51, 234, 0.05);
        }

        .radio-label input[type="radio"] {
            margin: 0;
            width: auto;
        }

        .radio-label input[type="radio"]:checked + span {
            color: #9333ea;
            font-weight: 700;
        }

        .radio-label:has(input[type="radio"]:checked) {
            border-color: #9333ea;
            background: rgba(147, 51, 234, 0.1);
        }

        .submit-btn {
            background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
            color: white;
            border: none;
            padding: 18px 30px;
            border-radius: 50px;
            font-size: 18px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(147, 51, 234, 0.3);
            font-family: 'Cairo', sans-serif;
        }

        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(147, 51, 234, 0.4);
        }

        .submit-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
        }

        @media (max-width: 768px) {
            .modal-content {
                width: 95%;
                margin: 20px;
            }

            .modal-header {
                padding: 20px;
            }

            .modal-header h2 {
                font-size: 20px;
            }

            .modal-body {
                padding: 20px;
            }

            .radio-group {
                flex-direction: column;
                gap: 10px;
            }
        }
        
        @media (max-width: 768px) {
            .final-cta h2 {
                font-size: 28px;
            }
            
            .final-cta-buttons {
                flex-direction: column;
                align-items: center;
            }
            
            .final-cta-primary,
            .final-cta-secondary {
                width: 100%;
                max-width: 300px;
                justify-content: center;
            }
            
            .final-cta-trust {
                gap: 20px;
            }
        }
        
        .pricing-button {
            display: block;
            background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
            color: white;
            text-align: center;
            padding: 12px 20px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 700;
            font-size: 16px;
            transition: all 0.3s ease;
        }
        
        .pricing-button:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 30px rgba(147, 51, 234, 0.3);
        }
        
        .plan-note {
            background: #fef2f2;
            border: 1px solid #fecaca;
            padding: 10px;
            border-radius: 8px;
            margin-top: 15px;
            font-size: 12px;
            color: #991b1b;
            text-align: center;
        }
        
        /* Footer */
        footer {
            background: #1a202c;
            color: white;
            padding: 60px 0 30px;
        }
        
        .footer-content {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
        }
        
        .footer-brand h3 {
            font-size: 32px;
            font-weight: 900;
            margin-bottom: 15px;
        }
        
        .footer-brand p {
            color: #94a3b8;
            line-height: 1.8;
        }
        
        .footer-links h4 {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 15px;
        }
        
        .footer-links ul {
            list-style: none;
            padding: 0;
        }
        
        .footer-links a {
            color: #94a3b8;
            text-decoration: none;
            display: block;
            padding: 8px 0;
            transition: color 0.3s ease;
        }
        
        .footer-links a:hover {
            color: #ec4899;
        }
        
        .footer-bottom {
            text-align: center;
            padding-top: 30px;
            border-top: 1px solid #334155;
            color: #64748b;
        }
        
        /* Mobile Responsive */
        @media (max-width: 1200px) {
            .pricing-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .features-grid {
                grid-template-columns: repeat(3, 1fr);
            }
            
            .custom-plans {
                flex-direction: column;
                text-align: center;
            }
        }
        
        @media (max-width: 768px) {
            .hero h1 {
                font-size: 28px;
            }
            
            .hero .subtitle {
                font-size: 16px;
            }
            
            .hero .subtitle-secondary {
                font-size: 15px;
            }
            
            .hero-badge {
                font-size: 14px;
                padding: 8px 18px;
            }
            
            .hero-buttons {
                flex-direction: column;
                align-items: center;
            }
            
            .hero-cta,
            .hero-cta-secondary {
                width: 100%;
                max-width: 300px;
                justify-content: center;
                font-size: 18px;
                padding: 16px 30px;
            }
            
            .section-title {
                font-size: 28px;
            }
            
            .audience-grid,
            .features-grid,
            .pricing-grid {
                grid-template-columns: 1fr;
            }
            
            .footer-content {
                grid-template-columns: 1fr;
            }
            
            .portfolio-item {
                width: 280px;
            }
            
            .video-item {
                width: 160px;
            }
            
            .pricing-trust-row {
                gap: 10px;
            }
            
            .trust-pill {
                font-size: 12px;
                padding: 8px 14px;
            }
            
            .price {
                font-size: 32px;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header>
        <div class="container">
            <div class="header-content">
                <div class="logo">Adly 🤖</div>
                <a href="#" class="cta-button" onclick="openInterestModal(); return false;">ابدأ الآن</a>
            </div>
        </div>
    </header>

    <!-- Hero -->
    <section class="hero">
        <div class="container">
            <div class="hero-badge">
                <span class="sparkle">✨</span>
                منصة AI للتسويق الذكي
            </div>
            
            <h1>
                توقف عن هدر الوقت على المحتوى<br>
                <span class="highlight">ابدأ بجذب العملاء</span>
            </h1>
            
            <p class="subtitle">
                منصة Adly تتعلم <strong>عملك ومنتجاتك</strong>، وتعرف كيف تُنشئ لك <strong>بوستات، ستوريز، فيديوهات UGC، صفحات هبوط، صور منتجات</strong> - خصيصاً لعلامتك التجارية. الكل في مكان واحد.
            </p>
            
            <p class="subtitle-secondary">
                بضغطة زر تُنشئ محتوى جاهز للنشر على إنستغرام، فيسبوك، أو أي منصة - إعلاناتنا تحقق نتائج مذهلة!
            </p>
            
            <div class="hero-buttons">
                <a href="#" class="hero-cta" onclick="openInterestModal(); return false;">
                    <span>✨</span>
                    ابدأ الآن مجاناً
                </a>
                <a href="#portfolio" class="hero-cta-secondary">
                    <span>▶</span>
                    شاهد النتائج
                </a>
            </div>
            
            <div class="hero-trust">
                <span>✨</span>
                7 أيام تجربة مجانية • إلغاء في أي وقت
            </div>
            
            <div class="hero-social-proof">
                <div class="avatar-stack">
                    <div class="avatar">👤</div>
                    <div class="avatar">👤</div>
                    <div class="avatar">👤</div>
                    <div class="avatar">👤</div>
                    <div class="avatar">👤</div>
                </div>
                <span><strong>+500</strong> عمل يستخدم Adly</span>
            </div>
        </div>
    </section>

    <!-- Portfolio - Client Results (immediately after hero) -->
    <section class="portfolio" id="portfolio">
        <!-- Images Row - Scrolls Left (3 copies) -->
        <div class="portfolio-row">
            <div class="portfolio-scroll">
                <div class="portfolio-item"><img src="/assets/portfolio/design_job231_1769274709.png" alt="تصميم"></div>
                <div class="portfolio-item"><img src="/assets/portfolio/design_edit_job232_1769275318.png" alt="تصميم"></div>
                <div class="portfolio-item"><img src="/assets/portfolio/design_job233_1769275501.png" alt="تصميم"></div>
                <div class="portfolio-item"><img src="/assets/portfolio/design_job234_1769275798.png" alt="تصميم"></div>
                <div class="portfolio-item"><img src="/assets/portfolio/design_job235_1769276699.png" alt="تصميم"></div>
                <div class="portfolio-item"><img src="/assets/portfolio/design_edit_job243_1769331642.png" alt="تصميم"></div>
                <div class="portfolio-item"><img src="/assets/portfolio/design_edit_job243_1769331851.png" alt="تصميم"></div>
            </div>
            <div class="portfolio-scroll">
                <div class="portfolio-item"><img src="/assets/portfolio/design_job231_1769274709.png" alt="تصميم"></div>
                <div class="portfolio-item"><img src="/assets/portfolio/design_edit_job232_1769275318.png" alt="تصميم"></div>
                <div class="portfolio-item"><img src="/assets/portfolio/design_job233_1769275501.png" alt="تصميم"></div>
                <div class="portfolio-item"><img src="/assets/portfolio/design_job234_1769275798.png" alt="تصميم"></div>
                <div class="portfolio-item"><img src="/assets/portfolio/design_job235_1769276699.png" alt="تصميم"></div>
                <div class="portfolio-item"><img src="/assets/portfolio/design_edit_job243_1769331642.png" alt="تصميم"></div>
                <div class="portfolio-item"><img src="/assets/portfolio/design_edit_job243_1769331851.png" alt="تصميم"></div>
            </div>
            <div class="portfolio-scroll">
                <div class="portfolio-item"><img src="/assets/portfolio/design_job231_1769274709.png" alt="تصميم"></div>
                <div class="portfolio-item"><img src="/assets/portfolio/design_edit_job232_1769275318.png" alt="تصميم"></div>
                <div class="portfolio-item"><img src="/assets/portfolio/design_job233_1769275501.png" alt="تصميم"></div>
                <div class="portfolio-item"><img src="/assets/portfolio/design_job234_1769275798.png" alt="تصميم"></div>
                <div class="portfolio-item"><img src="/assets/portfolio/design_job235_1769276699.png" alt="تصميم"></div>
                <div class="portfolio-item"><img src="/assets/portfolio/design_edit_job243_1769331642.png" alt="تصميم"></div>
                <div class="portfolio-item"><img src="/assets/portfolio/design_edit_job243_1769331851.png" alt="تصميم"></div>
            </div>
        </div>
        
        <!-- Videos Row - Scrolls Right (3 copies) -->
        <div class="portfolio-row">
            <div class="portfolio-scroll reverse">
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid1.mp4" type="video/mp4"></video></div>
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid2.mp4" type="video/mp4"></video></div>
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid3.mp4" type="video/mp4"></video></div>
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid4.mp4" type="video/mp4"></video></div>
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid5.mp4" type="video/mp4"></video></div>
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid6.mp4" type="video/mp4"></video></div>
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid7.mp4" type="video/mp4"></video></div>
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid8.mp4" type="video/mp4"></video></div>
            </div>
            <div class="portfolio-scroll reverse">
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid1.mp4" type="video/mp4"></video></div>
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid2.mp4" type="video/mp4"></video></div>
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid3.mp4" type="video/mp4"></video></div>
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid4.mp4" type="video/mp4"></video></div>
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid5.mp4" type="video/mp4"></video></div>
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid6.mp4" type="video/mp4"></video></div>
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid7.mp4" type="video/mp4"></video></div>
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid8.mp4" type="video/mp4"></video></div>
            </div>
            <div class="portfolio-scroll reverse">
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid1.mp4" type="video/mp4"></video></div>
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid2.mp4" type="video/mp4"></video></div>
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid3.mp4" type="video/mp4"></video></div>
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid4.mp4" type="video/mp4"></video></div>
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid5.mp4" type="video/mp4"></video></div>
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid6.mp4" type="video/mp4"></video></div>
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid7.mp4" type="video/mp4"></video></div>
                <div class="video-item"><video autoplay muted loop playsinline><source src="/assets/vid8.mp4" type="video/mp4"></video></div>
            </div>
        </div>
    </section>

    <!-- How It Works -->
    <section class="how-it-works">
        <div class="container">
            <div style="text-align: center;">
                <span class="how-badge">بسيط وسريع</span>
                <h2 class="section-title">كيف يعمل Adly؟</h2>
                <p class="section-subtitle">4 خطوات بسيطة - من إدخال البيانات إلى النشر التلقائي</p>
            </div>
            
            <div class="steps-container">
                <div class="steps-line"></div>
                
                <div class="step">
                    <div class="step-icon">📝</div>
                    <div class="step-title">أضف بيانات عملك</div>
                    <div class="step-desc">اسم العمل، الألوان، الشعار، ووصف قصير - نحتاج دقيقة واحدة فقط</div>
                </div>
                
                <div class="step">
                    <div class="step-icon">🧠</div>
                    <div class="step-title">النظام يتعلم</div>
                    <div class="step-desc">الذكاء الاصطناعي يفهم علامتك التجارية وأسلوبك وجمهورك المستهدف</div>
                </div>
                
                <div class="step">
                    <div class="step-icon">✨</div>
                    <div class="step-title">يُنشئ محتوى مخصص</div>
                    <div class="step-desc">تصاميم، نصوص، فيديوهات - كلها بهوية علامتك التجارية</div>
                </div>
                
                <div class="step">
                    <div class="step-icon">🚀</div>
                    <div class="step-title">نشر تلقائي!</div>
                    <div class="step-desc">انشر مباشرة على فيسبوك وإنستغرام بضغطة زر واحدة</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Before/After Comparison -->
    <section class="comparison">
        <div class="container">
            <div style="text-align: center; margin-bottom: 50px;">
                <h2 class="section-title">الفرق واضح</h2>
                <p class="section-subtitle">قارن بين الطريقة التقليدية وبين Adly</p>
            </div>
            
            <div class="comparison-card">
                <div class="comparison-grid">
                    <!-- Before Column -->
                    <div class="comparison-column before">
                        <span class="comparison-badge">قبل 😓</span>
                        
                        <ul class="comparison-list">
                            <li>
                                <span class="icon">⏰</span>
                                <span>ساعات لإنشاء بوست واحد</span>
                                <span class="status">✕</span>
                            </li>
                            <li>
                                <span class="icon">💸</span>
                                <span>1,000-5,000₪ شهرياً للمصمم</span>
                                <span class="status">✕</span>
                            </li>
                            <li>
                                <span class="icon">🤯</span>
                                <span>عدم ثبات في الهوية البصرية</span>
                                <span class="status">✕</span>
                            </li>
                            <li>
                                <span class="icon">🚫</span>
                                <span>بدون صفحات هبوط احترافية</span>
                                <span class="status">✕</span>
                            </li>
                            <li>
                                <span class="icon">🎬</span>
                                <span>فيديوهات UGC باهظة الثمن</span>
                                <span class="status">✕</span>
                            </li>
                            <li>
                                <span class="icon">📝</span>
                                <span>كتابة نصوص إعلانية بنفسك</span>
                                <span class="status">✕</span>
                            </li>
                        </ul>
                    </div>
                    
                    <!-- After Column -->
                    <div class="comparison-column after">
                        <span class="comparison-badge">مع Adly ✨</span>
                        
                        <ul class="comparison-list">
                            <li>
                                <span class="icon">⚡</span>
                                <span>3 دقائق لمحتوى جاهز للنشر</span>
                                <span class="status">✓</span>
                            </li>
                            <li>
                                <span class="icon">💰</span>
                                <span>اشتراك شهري ثابت ومريح</span>
                                <span class="status">✓</span>
                            </li>
                            <li>
                                <span class="icon">✅</span>
                                <span>هوية موحدة على كل المنصات</span>
                                <span class="status">✓</span>
                            </li>
                            <li>
                                <span class="icon">🎯</span>
                                <span>صفحات هبوط تحول بضغطة</span>
                                <span class="status">✓</span>
                            </li>
                            <li>
                                <span class="icon">🎥</span>
                                <span>فيديوهات UGC بالعربية</span>
                                <span class="status">✓</span>
                            </li>
                            <li>
                                <span class="icon">🤖</span>
                                <span>AI يكتب نصوص تبيع</span>
                                <span class="status">✓</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- For Everyone -->
    <section class="for-everyone">
        <div class="container">
            <h2 class="section-title">Adly لكل من يحتاج التسويق الرقمي</h2>
            <p class="section-subtitle">حل واحد، يناسب الجميع</p>
            
            <div class="audience-grid">
                <div class="audience-card">
                    <h3>🏪 للمصالح الصغيرة والمتوسطة</h3>
                    <p>لا تحتاج لوكالة باهظة الثمن. Adly يوفر لك كل ما تحتاجه:</p>
                    <ul>
                        <li>تصاميم احترافية بألوان علامتك التجارية</li>
                        <li>نصوص إعلانية تبيع فعلاً</li>
                        <li>فيديوهات وريلز جذابة</li>
                        <li>نشر تلقائي مباشر على فيسبوك وإنستغرام</li>
                        <li>حملات إعلانية مدروسة ومدارة</li>
                        <li>تقارير ونتائج واضحة</li>
                    </ul>
                </div>
                
                <div class="audience-card">
                    <h3>🚀 للوكالات والفريلانسرز</h3>
                    <p>وسع خدماتك وزد أرباحك دون تكاليف إضافية:</p>
                    <ul>
                        <li>منصة ويب كاملة لإدارة عملائك</li>
                        <li>Multi Mode - أنشئ عشرات التصاميم دفعة واحدة</li>
                        <li>إدارة علامات تجارية متعددة</li>
                        <li>أدوات احترافية للحملات الإعلانية</li>
                        <li>وصول WhatsApp API للتواصل السريع</li>
                        <li>حلول قابلة للتوسع مع نمو عملك</li>
                    </ul>
                </div>
            </div>
        </div>
    </section>

    <!-- Features -->
    <section class="features">
        <div class="container">
            <h2 class="section-title">منصة شاملة - كل ما تحتاجه في مكان واحد</h2>
            <p class="section-subtitle">أدوات احترافية بذكاء اصطناعي متطور</p>
            
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">🎨</div>
                    <h3>تصاميم احترافية</h3>
                    <p>بوست، ستوري، وإعلانات بألوان علامتك التجارية مع إمكانية التعديل</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">✍️</div>
                    <h3>نصوص إعلانية</h3>
                    <p>نصوص مكتوبة من خبرة 20+ عام مع إمكانية التعديل والتخصيص</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🎬</div>
                    <h3>فيديوهات وريلز</h3>
                    <p>فيديوهات احترافية، ريلز جذابة، ومحتوى UGC</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">📱</div>
                    <h3>نشر تلقائي مباشر</h3>
                    <p>انشر على فيسبوك وإنستغرام مباشرة من المنصة</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">📊</div>
                    <h3>حملات إعلانية</h3>
                    <p>بناء وإدارة حملات فيسبوك وإنستغرام الإعلانية</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🔄</div>
                    <h3>Before / After</h3>
                    <p>أنشئ تصاميم قبل وبعد احترافية بضغطة زر</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">📦</div>
                    <h3>Multi Mode</h3>
                    <p>أنشئ عشرات التصاميم لمنتجات مختلفة دفعة واحدة - مثالي للوكالات</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">✏️</div>
                    <h3>تعديلات سهلة</h3>
                    <p>عدّل التصاميم والنصوص بسهولة حتى تصل للنتيجة المثالية</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🌐</div>
                    <h3>صفحات هبوط</h3>
                    <p>أنشئ landing pages احترافية لجمع leads وزيادة المبيعات</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">📇</div>
                    <h3>بطاقات أعمال رقمية</h3>
                    <p>بطاقات ذكية قابلة للمشاركة مع كل معلومات عملك</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">💬</div>
                    <h3>واجهة WhatsApp</h3>
                    <p>اطلب تصاميم وفيديوهات مباشرة من WhatsApp</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🧑‍💼</div>
                    <h3>دعم بشري</h3>
                    <p>فريق خبراء متاح لمساعدتك 6 ساعات يومياً</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Pricing -->
    <section class="pricing" id="pricing">
        <div class="container">
            <h2 class="section-title">اختر خطتك</h2>
            <p class="section-subtitle">ابدأ تجربتك المجانية لمدة 7 أيام الآن</p>
            
            <!-- Trust badges -->
            <div class="pricing-trust-row">
                <div class="trust-pill">📅 7 أيام تجربة مجانية</div>
                <div class="trust-pill">💳 لا رسوم اليوم</div>
                <div class="trust-pill">✓ إلغاء في أي وقت</div>
            </div>
            
            <div class="pricing-grid">
                <!-- Starter Plan -->
                <div class="pricing-card">
                    <h3>Starter</h3>
                    <p class="plan-tagline">للمبدعين والعلامات الصغيرة</p>
                    <div class="price">₪179<span>/شهر</span></div>
                    <div class="trial-note">7 أيام مجاناً، ثم ₪179/شهر</div>
                    
                    <ul class="pricing-features">
                        <li>50 رصيد نص</li>
                        <li>30 رصيد صورة</li>
                        <li>5 رصيد فيديو</li>
                        <li>2 صفحات هبوط</li>
                        <li>علامة تجارية واحدة</li>
                        <li>دعم مجتمعي</li>
                        <li>جميع أدوات AI الأساسية</li>
                    </ul>
                    
                    <a href="#" class="pricing-button" onclick="openInterestModal(); return false;">جرب 7 أيام مجاناً</a>
                </div>
                
                <!-- Growth Plan -->
                <div class="pricing-card">
                    <h3>Growth</h3>
                    <p class="plan-tagline">للفرق النامية</p>
                    <div class="price">₪449<span>/شهر</span></div>
                    <div class="trial-note">7 أيام مجاناً، ثم ₪449/شهر</div>
                    
                    <ul class="pricing-features">
                        <li>120 رصيد نص</li>
                        <li>70 رصيد صورة</li>
                        <li>10 رصيد فيديو</li>
                        <li>6 صفحات هبوط</li>
                        <li>5 علامات تجارية</li>
                        <li>بطاقات أعمال لكل علامة</li>
                        <li>دعم أولوية</li>
                    </ul>
                    
                    <a href="#" class="pricing-button" onclick="openInterestModal(); return false;">جرب 7 أيام مجاناً</a>
                </div>
                
                <!-- Pro Plan -->
                <div class="pricing-card featured">
                    <div class="popular-badge">الأكثر شعبية</div>
                    <h3>Pro</h3>
                    <p class="plan-tagline">لفرق الأداء العالي</p>
                    <div class="price">₪899<span>/شهر</span></div>
                    <div class="trial-note">7 أيام مجاناً، ثم ₪899/شهر</div>
                    
                    <ul class="pricing-features">
                        <li>350 رصيد نص</li>
                        <li>200 رصيد صورة</li>
                        <li>25 رصيد فيديو</li>
                        <li>10 صفحات هبوط</li>
                        <li>10 علامات تجارية</li>
                        <li>دعم VIP</li>
                        <li>وصول مبكر للميزات الجديدة</li>
                    </ul>
                    
                    <a href="#" class="pricing-button" onclick="openInterestModal(); return false;">جرب 7 أيام مجاناً</a>
                </div>
                
                <!-- Agency Plan -->
                <div class="pricing-card">
                    <h3>Agency</h3>
                    <p class="plan-tagline">للوكالات الكبيرة</p>
                    <div class="price">₪1,499<span>/شهر</span></div>
                    <div class="trial-note">7 أيام مجاناً، ثم ₪1,499/شهر</div>
                    
                    <ul class="pricing-features">
                        <li>1000 رصيد نص</li>
                        <li>500 رصيد صورة</li>
                        <li>50 رصيد فيديو</li>
                        <li>50 صفحات هبوط</li>
                        <li>علامات تجارية غير محدودة</li>
                        <li>جميع الميزات</li>
                        <li>مدير نجاح مخصص</li>
                    </ul>
                    
                    <a href="#" class="pricing-button" onclick="openInterestModal(); return false;">جرب 7 أيام مجاناً</a>
                </div>
            </div>
            
            <p class="credits-note">
                الرصيد يُستخدم عند إنشاء المحتوى. 1 صورة = 1 رصيد صورة. 1 نص إعلاني = 1 رصيد نص. يتجدد الرصيد شهرياً.
            </p>
            
            <!-- Custom plans -->
            <div class="custom-plans">
                <div>
                    <h3>خطط مخصصة للفرق الكبيرة</h3>
                    <p>توسع عبر علامات متعددة، أولوية لرصيد الفيديو فقط، أو تخصيص الحدود لسير عملك. سنصمم خطة تناسب احتياجاتك.</p>
                </div>
                <a href="/ui/contact.html" class="custom-button">تواصل معنا</a>
            </div>
        </div>
    </section>

    <!-- Final CTA Section -->
    <section class="final-cta">
        <div class="container">
            <div class="final-cta-badge">
                🎁 انضم الآن واحصل على 7 أيام مجاناً
            </div>
            
            <h2>
                كم من الوقت والمال تهدر<br>
                على تسويق <span>لا يحقق نتائج؟</span>
            </h2>
            
            <p class="final-cta-subtitle">
                حان الوقت للتسويق الذكي الذي يعمل فعلاً. ابدأ الآن - 60 ثانية وأنت جاهز.
            </p>
            
            <div class="final-cta-buttons">
                <a href="#" class="final-cta-primary" onclick="openInterestModal(); return false;">
                    <span>✨</span>
                    ابدأ الآن مجاناً
                </a>
                <a href="#pricing" class="final-cta-secondary">
                    <span>←</span>
                    شاهد الخطط
                </a>
            </div>
            
            <div class="final-cta-trust">
                <div class="trust-item">
                    <span class="icon">🛡️</span>
                    <span>بدون التزام</span>
                </div>
                <div class="trust-item">
                    <span class="icon">⏰</span>
                    <span>إلغاء في أي وقت</span>
                </div>
                <div class="trust-item">
                    <span class="icon">💯</span>
                    <span>ضمان رضا 100%</span>
                </div>
            </div>
        </div>
    </section>

    <!-- Interest Modal -->
    <div id="interestModal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h2>كمان آدلي 🤖 حابب يحكي معك بس...</h2>
                <button class="modal-close" onclick="closeInterestModal()">&times;</button>
            </div>
            
            <div class="modal-body">
                <p class="modal-intro"><strong>الطلب على خدماتنا عالي جداً، لذلك نركز على العملاء الذين يناسبون عرضنا بشكل مثالي.</strong></p>
                
                <form id="interestForm" class="interest-form">
                    <div class="form-group">
                        <label for="name">الاسم الكامل *</label>
                        <input type="text" id="name" name="name" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="phone">رقم الهاتف *</label>
                        <input type="tel" id="phone" name="phone" required placeholder="+972-50-123-4567">
                    </div>
                    
                    <div class="form-group">
                        <label for="email">البريد الإلكتروني *</label>
                        <input type="email" id="email" name="email" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="interest">ما الذي يهمك أكثر؟ *</label>
                        <select id="interest" name="interest" required>
                            <option value="">اختر مجال اهتمامك</option>
                            <option value="ugc_ads">إعلانات UGC (مؤثرين ذكاء صناعي يحملون منتجك او يتحدثون عن خدمتك)</option>
                            <option value="auto_publishing">النشر التلقائي</option>
                            <option value="ai_agency">وكالة الذكاء الاصطناعي</option>
                            <option value="auto_campaigns">الحملات التلقائية</option>
                            <option value="other">أخرى</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>أنت حالياً:</label>
                        <div class="radio-group">
                            <label class="radio-label">
                                <input type="radio" name="business_type" value="business" required>
                                <span>🏢 صاحب عمل</span>
                            </label>
                            <label class="radio-label">
                                <input type="radio" name="business_type" value="agency" required>
                                <span>🏢 وكالة</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="form-group" id="agencySpendGroup" style="display: none;">
                        <label for="ad_spend">إجمالي مبلغ الإعلانات لجميع العملاء (شيكل/شهر) *</label>
                        <input type="number" id="ad_spend" name="ad_spend" min="0" step="0.01">
                    </div>
                    
                    <div class="form-group" id="businessPaymentGroup" style="display: none;">
                        <label for="agency_payment">كم تدفع حالياً لوكالتك (شيكل/شهر) *</label>
                        <input type="number" id="agency_payment" name="agency_payment" min="0" step="0.01">
                    </div>
                    
                    <button type="submit" class="submit-btn">
                        <span class="btn-text">أرسل طلب الاهتمام</span>
                        <span class="btn-loading" style="display: none;">جاري الإرسال...</span>
                    </button>
                </form>
            </div>
        </div>
    </div>

    <script>
        function openInterestModal() {
            document.getElementById('interestModal').classList.add('show');
            document.body.style.overflow = 'hidden';
        }

        function closeInterestModal() {
            document.getElementById('interestModal').classList.remove('show');
            document.body.style.overflow = 'auto';
        }

        // Close modal when clicking outside
        document.getElementById('interestModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeInterestModal();
            }
        });

        // Handle business type radio buttons
        document.addEventListener('DOMContentLoaded', function() {
            const businessTypeRadios = document.querySelectorAll('input[name="business_type"]');
            const agencySpendGroup = document.getElementById('agencySpendGroup');
            const businessPaymentGroup = document.getElementById('businessPaymentGroup');

            businessTypeRadios.forEach(radio => {
                radio.addEventListener('change', function() {
                    if (this.value === 'agency') {
                        agencySpendGroup.style.display = 'block';
                        businessPaymentGroup.style.display = 'none';
                        document.getElementById('agency_payment').required = false;
                        document.getElementById('ad_spend').required = true;
                    } else if (this.value === 'business') {
                        agencySpendGroup.style.display = 'none';
                        businessPaymentGroup.style.display = 'block';
                        document.getElementById('ad_spend').required = false;
                        document.getElementById('agency_payment').required = true;
                    }
                });
            });

            // Handle form submission
            const interestForm = document.getElementById('interestForm');
            interestForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const submitBtn = this.querySelector('.submit-btn');
                const btnText = submitBtn.querySelector('.btn-text');
                const btnLoading = submitBtn.querySelector('.btn-loading');
                
                // Show loading state
                submitBtn.disabled = true;
                btnText.style.display = 'none';
                btnLoading.style.display = 'inline';
                
                // Prepare form data
                const formData = new FormData(this);
                
                // Submit form to PHP backend
                fetch('submit_lead.php', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Redirect to thank you page
                        window.location.href = 'thank_you.php';
                    } else {
                        alert('خطأ: ' + data.error);
                        // Reset button state
                        submitBtn.disabled = false;
                        btnText.style.display = 'inline';
                        btnLoading.style.display = 'none';
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('حدث خطأ في النظام، يرجى المحاولة لاحقاً');
                    // Reset button state
                    submitBtn.disabled = false;
                    btnText.style.display = 'inline';
                    btnLoading.style.display = 'none';
                });
            });
        });
    </script>

    <!-- Footer -->
    <footer>
        <div class="container">
            <div class="footer-content">
                <div class="footer-brand">
                    <h3>Adly 🤖</h3>
                    <p>منصة تسويق ذكية شاملة للمصالح الصغيرة والوكالات. كل احتياجاتك التسويقية في مكان واحد - تصاميم، نصوص، فيديوهات، حملات، ونشر تلقائي مباشر.</p>
                </div>
                
                <div class="footer-links">
                    <h4>روابط مهمة</h4>
                    <ul>
                        <li><a href="#pricing">الأسعار</a></li>
                        <li><a href="#portfolio">أعمالنا</a></li>
                        <li><a href="#">اتصل بنا</a></li>
                    </ul>
                </div>
                
                <div class="footer-links">
                    <h4>سياسات</h4>
                    <ul>
                        <li><a href="/privacy.html">سياسة الخصوصية</a></li>
                        <li><a href="/terms.html">شروط الاستخدام</a></li>
                    </ul>
                </div>
            </div>
            
            <div class="footer-bottom">
                <p>&copy; 2026 Adly. جميع الحقوق محفوظة.</p>
            </div>
        </div>
    </footer>
</body>
</html>
