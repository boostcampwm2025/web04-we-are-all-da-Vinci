import { cn } from '../lib';
import { useEffect, useRef } from 'react';

// 파티클 색상 팔레트 (프로젝트 테마 색상 + 생동감 있는 색상)
const COLORS = [
  '#facc15', // yellow-400 (Gold)
  '#6366f1', // indigo-500
  '#ec4899', // pink-500
  '#22c55e', // green-500
  '#f97316', // orange-500
  '#ffffff', // white
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
  decay: number;
}

interface Rocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  exploded: boolean;
}

interface FireworkCanvasProps {
  className?: string;
}

const FireworkCanvas = ({ className }: FireworkCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 크기 설정
    const setCanvasSize = () => {
      // 부모 컨테이너 크기에 맞춤 (offsetParent가 있는 경우)
      // 또는 화면 전체 (fixed/absolute positioning 가정)
      // 여기서는 부모 크기에 유동적으로 반응하도록 함
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    let rockets: Rocket[] = [];
    let particles: Particle[] = [];
    let animationFrameId: number;

    const createRocket = () => {
      const x = Math.random() * canvas.width * 0.8 + canvas.width * 0.1; // 화면 너비의 10% ~ 90% 사이
      const y = canvas.height;

      // 위로 쏘아 올리는 속도 (화면 높이에 비례하도록 조정 가능)
      const vy = -(Math.random() * 4 + 8); // -8 ~ -12
      const vx = (Math.random() - 0.5) * 4; // -2 ~ 2
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];

      rockets.push({ x, y, vx, vy, color, exploded: false });
    };

    const createExplosion = (rocket: Rocket) => {
      const particleCount = 40 + Math.random() * 40; // 40 ~ 80개
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1; // 1 ~ 5
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        particles.push({
          x: rocket.x,
          y: rocket.y,
          vx,
          vy,
          alpha: 1,
          color: rocket.color,
          size: Math.random() * 2 + 1,
          decay: Math.random() * 0.015 + 0.01,
        });
      }
    };

    const loop = () => {
      // 잔상 효과를 위해 불투명한 검은색(또는 투명)으로 덮기
      // 여기서는 배경이 투명해야 하므로 clearRect 사용
      // 잔상을 남기고 싶다면 'rgba(255, 255, 255, 0.1)' 대신 globalCompositeOperation 조절 필요
      // 깔끔한 렌더링을 위해 전체 지우기
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; // 서서히 사라지는 잔상
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';

      // 로켓 업데이트
      rockets.forEach((rocket) => {
        rocket.x += rocket.vx;
        rocket.y += rocket.vy;
        rocket.vy += 0.15; // 중력

        // 정점 도달 시 폭발 (속도가 떨어지거나 일정 높이 도달)
        if (rocket.vy >= -1 && !rocket.exploded) {
          rocket.exploded = true;
          createExplosion(rocket);
        }
      });

      // 폭발한 로켓 제거
      rockets = rockets.filter((r) => !r.exploded);

      // 파티클 업데이트
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96; // 마찰력
        p.vy *= 0.96;
        p.vy += 0.05; // 약한 중력
        p.alpha -= p.decay;
      });

      // 사라진 파티클 제거
      particles = particles.filter((p) => p.alpha > 0);

      // 그리기
      [...rockets].forEach((r) => {
        // 로켓은 꼬리가 생기면 좋음
        ctx.beginPath();
        ctx.arc(r.x, r.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = r.color;
        ctx.fill();
      });

      particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();
      });

      // 랜덤 로켓 생성 (확률적)
      if (Math.random() < 0.03) {
        // 프레임당 3% 확률
        createRocket();
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={cn('pointer-events-none absolute inset-0 z-0', className)}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default FireworkCanvas;
