// src/pages/SplashScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfigProvider, Typography } from 'antd';
import { RocketOutlined, ThunderboltOutlined, GlobalOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './SplashScreen.css';

const { Title, Text } = Typography;

// Couleurs identiques à votre palette
const COLORS = {
  primary: '#2563eb',
  primaryLight: '#818CF8',
  secondary: '#34d399',
  accent: '#475569',
  white: '#FFFFFF',
  textMuted: '#94A3B8',
  bgPrimary: '#0A0A1A',
};

// ============================================
// COMPOSANT PARTICLES ANIMÉES
// ============================================

const ParticleBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    const particles = [];
    const particleCount = 100;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          speedX: (Math.random() - 0.5) * 0.3,
          speedY: (Math.random() - 0.5) * 0.3,
          opacity: Math.random() * 0.3 + 0.1,
        });
      }
    };

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99, 102, 241, ${p.opacity})`;
        ctx.fill();

        // Connexions entre particules proches
        particles.forEach((p2) => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.05 * (1 - distance / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationFrameId = requestAnimationFrame(drawParticles);
    };

    resize();
    createParticles();
    drawParticles();

    window.addEventListener('resize', () => {
      resize();
      particles.length = 0;
      createParticles();
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
};

// ============================================
// COMPOSANT PRINCIPAL SPLASHSCREEN
// ============================================

const SplashScreen = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);

  // Animation de chargement
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsReady(true);
          return 100;
        }
        return prev + 1;
      });
    }, 20);

    return () => clearInterval(interval);
  }, []);

  // Redirection automatique vers Home UNIQUEMENT quand progress = 100
  useEffect(() => {
    if (isReady && !hasNavigated) {
      // Petit délai pour que l'utilisateur voie le "100%" et le message "Prêt à démarrer"
      const timer = setTimeout(() => {
        setHasNavigated(true);
        navigate('/home');
      }, 1200); // Délai de 1.2 secondes après 100%
      
      return () => clearTimeout(timer);
    }
  }, [isReady, hasNavigated, navigate]);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: COLORS.primary,
          borderRadius: 12,
        },
      }}
    >
      <motion.div
        className="splashscreen-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        style={{
          minHeight: '100vh',
          background: COLORS.bgPrimary,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Fond avec particules */}
        <ParticleBackground />

        {/* Logo NEXUM */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 20,
            duration: 1.2,
          }}
          className="logo-wrapper"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 2,
          }}
        >
          {/* Logo animé */}
          <motion.div
            className="logo-container"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              position: 'relative',
            }}
          >
            {/* Icône avec rotation */}
            <motion.div
              animate={{
                rotate: 360,
                scale: [1, 1.1, 1],
              }}
              transition={{
                rotate: {
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear",
                },
                scale: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb, #475569, #34d399)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
                color: '#FFFFFF',
                boxShadow: '0 0 60px rgba(99, 102, 241, 0.3)',
                position: 'relative',
              }}
            >
              <RocketOutlined />
              {/* Anneau lumineux */}
              <motion.div
                style={{
                  position: 'absolute',
                  top: -5,
                  left: -5,
                  right: -5,
                  bottom: -5,
                  borderRadius: '50%',
                  border: '2px solid rgba(99, 102, 241, 0.3)',
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>

            {/* Texte NEXUM */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <motion.h1
                style={{
                  fontSize: 72,
                  fontWeight: 900,
                  margin: 0,
                  background: 'linear-gradient(135deg, #2563eb 0%, #475569 30%, #34d399 60%, #5EEAD4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: -2,
                  textShadow: '0 0 80px rgba(99, 102, 241, 0.2)',
                }}
              >
                NEXUM
              </motion.h1>
            </motion.div>
          </motion.div>

          {/* Sous-titre */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            style={{ marginTop: 24 }}
          >
            <Title
              level={4}
              style={{
                color: COLORS.white,
                fontWeight: 300,
                textAlign: 'center',
                opacity: 0.8,
                letterSpacing: 4,
                textTransform: 'uppercase',
                margin: 0,
                fontSize: 18,
              }}
            >
              Intelligence Artificielle & Excellence Opérationnelle
            </Title>
          </motion.div>

          {/* Barre de progression */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            style={{
              marginTop: 48,
              width: 320,
              maxWidth: '80%',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: '100%',
                height: 3,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 2,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <motion.div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #2563eb, #475569, #34d399)',
                  borderRadius: 2,
                  position: 'absolute',
                  left: 0,
                  top: 0,
                }}
                animate={{
                  width: `${progress}%`,
                }}
                transition={{ duration: 0.1 }}
              />
            </div>

            {/* Pourcentage */}
            <motion.div
              animate={{ opacity: progress === 100 ? 0 : 1 }}
              style={{
                textAlign: 'center',
                marginTop: 12,
                color: 'rgba(255,255,255,0.5)',
                fontSize: 14,
                fontWeight: 300,
                letterSpacing: 2,
              }}
            >
              {Math.round(progress)}%
            </motion.div>
          </motion.div>

          {/* Texte "Prêt à démarrer" - apparaît UNIQUEMENT quand progress = 100 */}
          <AnimatePresence>
            {isReady && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.8 }}
                transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
                style={{
                  marginTop: 32,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.primaryLight,
                      fontSize: 16,
                      fontWeight: 500,
                      letterSpacing: 1,
                    }}
                  >
                    ✦ Prêt à démarrer ✦
                  </Text>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Indicateur de chargement quand progress < 100 */}
          {!isReady && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                marginTop: 16,
                color: 'rgba(255,255,255,0.2)',
                fontSize: 12,
                letterSpacing: 2,
              }}
            >
              CHARGEMENT EN COURS...
            </motion.div>
          )}
        </motion.div>

        {/* Badges en bas */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          style={{
            position: 'absolute',
            bottom: 48,
            display: 'flex',
            gap: 32,
            zIndex: 2,
            flexWrap: 'wrap',
            justifyContent: 'center',
            padding: '0 20px',
          }}
        >
          {[
            { icon: <ThunderboltOutlined />, text: 'IA Intégrée' },
            { icon: <GlobalOutlined />, text: 'Multi-plateforme' },
            { icon: <RocketOutlined />, text: 'Cloud Hybride' },
          ].map((item, index) => (
            <motion.div
              key={index}
              whileHover={{ y: -5 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: 'rgba(255,255,255,0.5)',
                fontSize: 14,
                fontWeight: 400,
                letterSpacing: 0.5,
              }}
            >
              <span style={{ color: COLORS.primaryLight, fontSize: 18 }}>{item.icon}</span>
              {item.text}
            </motion.div>
          ))}
        </motion.div>

        {/* Version */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          style={{
            position: 'absolute',
            bottom: 24,
            right: 32,
            color: 'rgba(255,255,255,0.2)',
            fontSize: 12,
            letterSpacing: 1,
            zIndex: 2,
          }}
        >
          v4.0 • Enterprise
        </motion.div>
      </motion.div>
    </ConfigProvider>
  );
};

export default SplashScreen;