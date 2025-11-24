// src/App.jsx
import './App.css';
import Plasma from './Plasma';

function App() {
  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        position: 'relative',
        backgroundColor: '#000'
      }}
    >
      <Plasma
        color="#ff6b35"      // cor do plasma (laranja), pode mudar pra verde depois
        speed={0.6}
        direction="forward"  // 'forward', 'reverse' ou 'pingpong'
        scale={1.1}
        opacity={0.8}
        mouseInteractive={true}
      />

      {/* Texto por cima do plasma */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: '#f9fafb',
          pointerEvents: 'none'
        }}
      >
        <h1 style={{ fontSize: '28px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Vitaclin — Introdução ao Plasma
        </h1>
        <p style={{ maxWidth: '480px', marginTop: '12px', lineHeight: 1.6, opacity: 0.9 }}>
          Fundo em estilo plasma 3D, perfeito para intro de site, vídeo ou apresentação.
        </p>
      </div>
    </div>
  );
}

export default App;

