export interface Point {
  x: number;
  y: number;
  delay: number;
}

/**
 * Returns a randomized coordinate inside an element's bounding rect
 * using a truncated Gaussian distribution centered near the middle,
 * preventing predictable exact-center clicks.
 */
export function getRandomTargetInRect(
  rect: { left: number; top: number; width: number; height: number },
  paddingPercent: number = 0.2
): { x: number; y: number } {
  const padW = rect.width * paddingPercent;
  const padH = rect.height * paddingPercent;

  const minX = rect.left + padW;
  const maxX = rect.left + rect.width - padW;
  const minY = rect.top + padH;
  const maxY = rect.top + rect.height - padH;

  // Box-Muller transform for Gaussian distribution around center
  const u1 = Math.random() || 1e-6;
  const u2 = Math.random() || 1e-6;
  const randStdNormalX = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  const randStdNormalY = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const stdDevX = Math.max(1, (rect.width - 2 * padW) / 6);
  const stdDevY = Math.max(1, (rect.height - 2 * padH) / 6);

  const x = Math.min(maxX, Math.max(minX, Math.round(centerX + randStdNormalX * stdDevX)));
  const y = Math.min(maxY, Math.max(minY, Math.round(centerY + randStdNormalY * stdDevY)));

  return { x, y };
}

/**
 * Calculates a point on a cubic Bezier curve for a given parameter t ∈ [0, 1].
 */
export function cubicBezier(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number
): { x: number; y: number } {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return {
    x: Math.round(uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x),
    y: Math.round(uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y)
  };
}

/**
 * Generates a highly randomized, organic human mouse path between start and target points.
 * Every path uses randomized control point geometries (Arch, S-Curve, Direct-Drift, or Hook),
 * micro-tremors, variable acceleration profiles, and overshoot corrections.
 */
export function generateHumanPath(
  startX: number,
  startY: number,
  targetX: number,
  targetY: number
): Point[] {
  const dx = targetX - startX;
  const dy = targetY - startY;
  const distance = Math.hypot(dx, dy);

  if (distance < 3) {
    return [{ x: targetX, y: targetY, delay: 12 + Math.floor(Math.random() * 15) }];
  }

  // 1. Choose a random trajectory archetype (Arch, S-Curve, Direct-Drift, or Hook)
  const archetypeRoll = Math.random();
  let cp1: { x: number; y: number };
  let cp2: { x: number; y: number };

  const perpX = -dy / distance;
  const perpY = dx / distance;

  // Max perpendicular curve offset scales with distance but is randomized
  const maxOffset = Math.min(distance * (0.2 + Math.random() * 0.45), 220);

  if (archetypeRoll < 0.4) {
    // Arch Curve: Single smooth arc to one side
    const side = Math.random() < 0.5 ? 1 : -1;
    const arcHeight1 = maxOffset * (0.5 + Math.random() * 0.7) * side;
    const arcHeight2 = maxOffset * (0.4 + Math.random() * 0.6) * side;

    const split1 = 0.2 + Math.random() * 0.25;
    const split2 = 0.6 + Math.random() * 0.25;

    cp1 = {
      x: startX + dx * split1 + perpX * arcHeight1,
      y: startY + dy * split1 + perpY * arcHeight1
    };
    cp2 = {
      x: startX + dx * split2 + perpX * arcHeight2,
      y: startY + dy * split2 + perpY * arcHeight2
    };
  } else if (archetypeRoll < 0.7) {
    // S-Curve: Curve changes direction midway
    const side1 = Math.random() < 0.5 ? 1 : -1;
    const side2 = -side1;
    const h1 = maxOffset * (0.4 + Math.random() * 0.5) * side1;
    const h2 = maxOffset * (0.3 + Math.random() * 0.5) * side2;

    cp1 = {
      x: startX + dx * (0.25 + Math.random() * 0.15) + perpX * h1,
      y: startY + dy * (0.25 + Math.random() * 0.15) + perpY * h1
    };
    cp2 = {
      x: startX + dx * (0.65 + Math.random() * 0.15) + perpX * h2,
      y: startY + dy * (0.65 + Math.random() * 0.15) + perpY * h2
    };
  } else {
    // Direct Drift with slight end Hook
    const side = Math.random() < 0.5 ? 1 : -1;
    const h1 = (10 + Math.random() * 35) * side;
    const h2 = (15 + Math.random() * 55) * side;

    cp1 = {
      x: startX + dx * 0.35 + perpX * h1,
      y: startY + dy * 0.35 + perpY * h1
    };
    cp2 = {
      x: startX + dx * 0.8 + perpX * h2,
      y: startY + dy * 0.8 + perpY * h2
    };
  }

  const startPt = { x: startX, y: startY };
  const targetPt = { x: targetX, y: targetY };

  // 2. Determine number of intermediate steps & speed variation profile
  const speedNoise = 0.8 + Math.random() * 0.4;
  const baseSteps = Math.max(16, Math.min(110, Math.floor((distance / (6 + Math.random() * 3)) * speedNoise)));
  const path: Point[] = [];

  // Random mid-movement micro-hesitation point (e.g. at 40-70% of trajectory)
  const hasHesitation = distance > 120 && Math.random() < 0.35;
  const hesitationT = 0.4 + Math.random() * 0.3;

  for (let i = 0; i <= baseSteps; i++) {
    const linearT = i / baseSteps;

    let easeT: number;
    if (linearT < 0.5) {
      easeT = 2 * linearT * linearT;
    } else {
      easeT = 1 - Math.pow(-2 * linearT + 2, 2) / 2;
    }

    const pt = cubicBezier(startPt, cp1, cp2, targetPt, easeT);

    // Add physiological micro-tremor noise (1-2.5px) during mid-flight, zeroing out near target
    let jitterX = 0;
    let jitterY = 0;
    if (linearT > 0.08 && linearT < 0.88) {
      const jitterScale = Math.sin(linearT * Math.PI) * (0.8 + Math.random() * 1.5);
      jitterX = (Math.random() - 0.5) * jitterScale;
      jitterY = (Math.random() - 0.5) * jitterScale;
    }

    const finalX = Math.round(pt.x + jitterX);
    const finalY = Math.round(pt.y + jitterY);

    // Calculate dynamic step delay (fast in middle, slow down near target)
    const speedFactor = Math.sin(linearT * Math.PI);
    let delay = Math.max(3, Math.floor(16 - speedFactor * 11 + (Math.random() * 6 - 3)));

    // Mid-flight hesitation delay
    if (hasHesitation && Math.abs(linearT - hesitationT) < 0.05) {
      delay += Math.floor(40 + Math.random() * 90);
    }

    // Deceleration delay near landing target
    if (linearT > 0.82) {
      const decelRatio = (linearT - 0.82) / 0.18;
      delay = Math.floor(delay * (1 + decelRatio * 1.8));
    }

    path.push({ x: finalX, y: finalY, delay });
  }

  // 3. Overshoot / Correction Simulation (realistic human target acquisition)
  if (distance > 140 && Math.random() < 0.35) {
    const overshootDist = 3 + Math.random() * 9;
    const overAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.4;
    const overX = Math.round(targetX + Math.cos(overAngle) * overshootDist);
    const overY = Math.round(targetY + Math.sin(overAngle) * overshootDist);

    // Overshoot step
    path.push({ x: overX, y: overY, delay: 25 + Math.floor(Math.random() * 25) });
    // Correct back to target
    path.push({ x: targetX, y: targetY, delay: 35 + Math.floor(Math.random() * 30) });
  } else {
    // Final exact target point landing
    path.push({ x: targetX, y: targetY, delay: 18 + Math.floor(Math.random() * 20) });
  }

  return path;
}

