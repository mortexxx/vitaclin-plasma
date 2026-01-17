// src/Plasma.jsx
import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';
import './Plasma.css';

const hexToRgb = (hex) => {
  const result =
    /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 0.5, 0.2]; // fallback laranja
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ];
};

const vertex = `#version 300 es
precision highp float;
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uCustomColor;
uniform float uUseCustomColor;
uniform float uSpeed;
uniform float uDirection;
uniform float uScale;
uniform float uOpacity;
uniform vec2 uMouse;
uniform float uMouseInteractive;
uniform float uBrightness;
uniform float uIsPortrait;

out vec4 fragColor;

void mainImage(out vec4 o, vec2 C) {
  vec2 center = iResolution.xy * 0.5;
  C = (C - center) / uScale + center;

  // ❌ REMOVIDO: plasma NÃO responde mais ao mouse/toque
  // vec2 mouseOffset = (uMouse - center) * 0.0002;
  // C += mouseOffset * length(C - center) * step(0.5, uMouseInteractive);

  float i, d, z, T = iTime * uSpeed * uDirection;
  vec3 O, p, S;

  for (vec2 r = iResolution.xy, Q; ++i < 60.; O += o.w / d * o.xyz) {
    // Usa sempre a menor dimensão como referência p/ ficar bom em portrait e landscape
    float refSize = min(r.x, r.y);
    p = z * normalize(vec3(C - 0.5 * r, refSize));
    p.z -= 4.;
    S = p;
    d = p.y - T;

    p.x += 0.4 * (1. + p.y) * sin(d + p.x * 0.1) * cos(0.34 * d + p.x * 0.05);
    Q = p.xz *= mat2(cos(p.y + vec4(0, 11, 33, 0) - T));
    z += d = abs(sqrt(length(Q * Q)) - 0.25 * (5. + S.y)) / 3. + 8e-4;
    o = 1. + sin(S.y + p.z * 0.5 + S.z - length(S - p) + vec4(2, 1, 0, 8));
  }

  o.xyz = tanh(O / 1e4);
}

bool finite1(float x) {
  return !(isnan(x) || isinf(x));
}

vec3 sanitize(vec3 c) {
  return vec3(
    finite1(c.r) ? c.r : 0.0,
    finite1(c.g) ? c.g : 0.0,
    finite1(c.b) ? c.b : 0.0
  );
}

/* ===== main com verde neon fixo ===== */
void main() {
  // Saída original do mainImage
  vec4 o = vec4(0.0);
  mainImage(o, gl_FragCoord.xy);

  // Garante que não tem NaN / Inf
  vec3 rgb = sanitize(o.rgb);

  // Intensidade (0–1) baseada no brilho do plasma original
  float intensity = clamp((rgb.r + rgb.g + rgb.b) / 3.0, 0.0, 1.0);

  // Verde neon padrão
  vec3 baseGreen = vec3(0.043, 1.0, 0.161);

  // Se uUseCustomColor = 1.0, permite trocar a cor via uniforme;
  vec3 targetColor = mix(baseGreen, uCustomColor, step(0.5, uUseCustomColor));

  // Aplica brilho
  vec3 finalColor = clamp(targetColor * intensity * uBrightness, 0.0, 1.0);

  // Opacidade ligada à intensidade e ao uOpacity
  float alpha = clamp(intensity * uOpacity, 0.0, 1.0);

  fragColor = vec4(finalColor, alpha);
}
`;

export const Plasma = ({
  color = '#00ff40',   // verde neon
  speed = 1,
  direction = 'forward', // 'forward' | 'reverse' | 'pingpong'
  scale = 1,
  opacity = 1,
  brightness = 1,
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;

    const isMobile =
      typeof navigator !== 'undefined' &&
      /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    const baseScale = scale || 1;
    const baseOpacity = opacity ?? 1;

    // ✅ Escala boa pra mobile: MENOR em portrait pra “des-zoomar”
    const computeScale = (width, height) => {
      if (!isMobile) {
        // desktop: bem próximo do original
        return baseScale * 1.0;
      }
      const isPortrait = height >= width;
      if (isPortrait) {
        // retrato: reduz escala (zoom OUT)
        return baseScale * 0.6;
      } else {
        // paisagem no mobile (mantém o que já estava bonito)
        return baseScale * 1.1;
      }
    };

    const computeBrightness = (width, height) => {
      const isPortrait = height >= width;
      // em portrait deixo um pouco mais brilhante
      return isPortrait ? brightness * 2.0 : brightness;
    };

    // Opacidade no máximo
    const maxOpacityDesktop = 1.0;
    const maxOpacityMobile = 1.0;
    const effectiveOpacity = isMobile
      ? Math.min(baseOpacity, maxOpacityMobile)
      : Math.min(baseOpacity, maxOpacityDesktop);

    // DPR travado em 1 no celular pra não matar GPU
    const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);

    const useCustomColor = color ? 1.0 : 0.0;
    const customColorRgb = color ? hexToRgb(color) : [1, 1, 1];
    const directionMultiplier =
      direction === 'reverse' ? -1.0 : 1.0;

    let renderer;
    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: false,
        antialias: false,
        dpr,
      });
    } catch (err) {
      try {
        // fallback WebGL1
        renderer = new Renderer({
          webgl: 1,
          alpha: false,
          antialias: false,
          dpr: Math.min(dpr, 1),
        });
      } catch (err2) {
        console.warn('[Plasma] Falha ao criar renderer WebGL:', err, err2);
        return () => {};
      }
    }

    const gl = renderer.gl;
    const canvas = gl.canvas;
  gl.clearColor(0, 0, 0, 1);
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    containerEl.appendChild(canvas);

    const geometry = new Triangle(gl);

    const initialRect = containerEl.getBoundingClientRect();
    const initialScale = computeScale(
      initialRect.width || 1,
      initialRect.height || 1
    );
    const initialIsPortrait =
      (initialRect.height || 1) >= (initialRect.width || 1);

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uCustomColor: {
          value: new Float32Array(customColorRgb),
        },
        uUseCustomColor: { value: useCustomColor },
        uSpeed: { value: speed * 0.4 },
        uDirection: { value: directionMultiplier },
        uScale: { value: initialScale },
        uOpacity: { value: effectiveOpacity },
        uBrightness: {
          value: computeBrightness(
            initialRect.width || 1,
            initialRect.height || 1
          ),
        },
        // 🔒 Mouse travado zerado e desativado
        uMouse: { value: new Float32Array([0, 0]) },
        uMouseInteractive: { value: 0.0 },
        uIsPortrait: { value: initialIsPortrait ? 1.0 : 0.0 },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    const setSize = () => {
      const rect = containerEl.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));

      renderer.setSize(width, height);
      const res = program.uniforms.iResolution.value;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;

      const isPortrait = height >= width;
      program.uniforms.uScale.value = computeScale(width, height);
      program.uniforms.uBrightness.value = computeBrightness(
        width,
        height
      );
      program.uniforms.uIsPortrait.value = isPortrait ? 1.0 : 0.0;
    };

    const ro = new ResizeObserver(setSize);
    ro.observe(containerEl);
    setSize();

    let raf = 0;
    const t0 = performance.now();

    const loop = (t) => {
      const timeValue = (t - t0) * 0.001;

      if (direction === 'pingpong') {
        const pingpongDuration = 10.0;
        const segmentTime = timeValue % pingpongDuration;
        const isForward =
          Math.floor(timeValue / pingpongDuration) % 2 === 0;
        const u = segmentTime / pingpongDuration;
        const smooth = u * u * (3.0 - 2.0 * u);
        const pingpongTime = isForward
          ? smooth * pingpongDuration
          : (1.0 - smooth) * pingpongDuration;

        program.uniforms.uDirection.value = 1.0;
        program.uniforms.iTime.value = pingpongTime;
      } else {
        program.uniforms.iTime.value = timeValue;
      }

      gl.clear(gl.COLOR_BUFFER_BIT);
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      try {
        containerEl.removeChild(canvas);
      } catch {
        // já removido
      }
    };
  }, [color, speed, direction, scale, opacity, brightness]);

  return <div ref={containerRef} className="plasma-container" />;
};

export default Plasma;
