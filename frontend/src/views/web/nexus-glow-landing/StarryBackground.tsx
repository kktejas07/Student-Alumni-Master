import { useEffect, useRef } from "react";

export function StarryBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    class Star {
      x: number;
      y: number;
      radius: number;
      baseOpacity: number;
      opacity: number;
      blinkSpeed: number;
      blinkPhase: number;
      driftSpeedX: number;
      driftSpeedY: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.radius = Math.random() * 1.5;
        this.baseOpacity = Math.random() * 0.8 + 0.1;
        this.opacity = this.baseOpacity;
        this.blinkSpeed = (Math.random() * 0.02) + 0.005;
        this.blinkPhase = Math.random() * Math.PI * 2;
        this.driftSpeedX = (Math.random() - 0.5) * 0.1;
        this.driftSpeedY = Math.random() * 0.1 + 0.05; // Slow drift downwards
      }

      update() {
        this.x += this.driftSpeedX;
        this.y += this.driftSpeedY;

        if (this.y > height) this.y = 0;
        if (this.x > width) this.x = 0;
        if (this.x < 0) this.x = width;

        this.blinkPhase += this.blinkSpeed;
        this.opacity = this.baseOpacity + Math.sin(this.blinkPhase) * 0.3;
        if (this.opacity < 0.1) this.opacity = 0.1;
        if (this.opacity > 1) this.opacity = 1;
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.fill();
        
        if (this.radius > 1.2) {
          ctx.shadowBlur = 4;
          ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
        } else {
          ctx.shadowBlur = 0;
        }
      }
    }

    class FallingStar {
      x: number;
      y: number;
      radius: number;
      speedY: number;
      speedX: number;
      opacity: number;
      life: number;
      maxLife: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = -10;
        this.radius = Math.random() * 1.5 + 0.5;
        this.speedY = Math.random() * 1.5 + 1;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.opacity = 1;
        this.maxLife = Math.random() * 300 + 100;
        this.life = this.maxLife;
      }

      update() {
        this.y += this.speedY;
        this.x += this.speedX;
        this.life--;
        this.opacity = Math.max(0, this.life / this.maxLife);
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(204, 255, 0, ${this.opacity * 0.8})`; 
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(204, 255, 0, ${this.opacity})`;
        ctx.fill();
      }
    }

    class ShootingStar {
      x: number;
      y: number;
      length: number;
      speed: number;
      angle: number;
      opacity: number;
      active: boolean;

      constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.length = 0;
        this.speed = 0;
        this.angle = 0;
        this.opacity = 0;
      }

      spawn() {
        this.active = true;
        this.x = Math.random() * width;
        this.y = Math.random() * (height / 2);
        this.length = Math.random() * 150 + 50;
        this.speed = Math.random() * 15 + 10;
        this.angle = (Math.PI / 180) * 45; 
        this.opacity = 1;
      }

      update() {
        if (!this.active) return;
        
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.opacity -= 0.015;

        if (this.opacity <= 0) {
          this.active = false;
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        const gradient = ctx.createLinearGradient(0, 0, -this.length, 0);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${this.opacity})`);
        gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-this.length, 0);
        ctx.lineWidth = 2;
        ctx.strokeStyle = gradient;
        ctx.stroke();
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(204, 255, 0, 1)";
        ctx.stroke();
        
        ctx.restore();
      }
    }

    // Initialize thousands of stars
    const stars = Array.from({ length: 2000 }, () => new Star());
    const fallingStars: FallingStar[] = [];
    const shootingStar = new ShootingStar();

    const render = () => {
      // Clear canvas with deep space gradient
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, "#030614");
      bgGradient.addColorStop(0.5, "rgba(10, 17, 40, 1)");
      bgGradient.addColorStop(1, "#040816");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Draw background stars
      stars.forEach(star => {
        star.update();
        star.draw(ctx);
      });

      // Spawn falling stars
      if (Math.random() < 0.03) {
        fallingStars.push(new FallingStar());
      }

      for (let i = fallingStars.length - 1; i >= 0; i--) {
        const fs = fallingStars[i];
        fs.update();
        fs.draw(ctx);
        if (fs.life <= 0) {
          fallingStars.splice(i, 1);
        }
      }

      // Spawn shooting star
      if (!shootingStar.active && Math.random() < 0.005) {
        shootingStar.spawn();
      }
      shootingStar.update();
      shootingStar.draw(ctx);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1]">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
}
