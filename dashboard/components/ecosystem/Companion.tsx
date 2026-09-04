"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Wire } from "./Wire";
import { SUNGOLD, SILVER } from "./config";
import { Html } from "@react-three/drei";
import { useEcosystem, nodePositions } from "./store";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import { useBudgetScope } from "@/lib/budget-scope";
import { getLimits } from "@/lib/budget-limits";
import { DEFAULT_BUDGETS, PERSONAL_BUDGETS } from "@/lib/data";
import { buildReport, type Report } from "@/lib/companion-report";
import type { LedgerEntry } from "@/lib/budget-analytics";

/**
 * The core's companion — a small drone that gives the system a presence to
 * address rather than a menu to operate.
 *
 * It is built entirely from attention cues, because that is what sells a thing
 * as alive: it looks at whatever you hover, leans toward it, and its eye
 * brightens. Idle motion is two sine waves at unrelated periods so the bob
 * never lands on an obvious loop.
 */
/**
 * The month's one notable fact, read once when the macro view settles. Reads
 * only — the drone reports on the ledger, it never touches it.
 */
function useReport(active: boolean) {
  const { user } = useUser();
  const { scope } = useBudgetScope();
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    if (!active) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const canPersonal = (user?.name ?? "").toLowerCase().startsWith("adrian");
    const activeScope = canPersonal ? scope : "family";

    let cancelled = false;
    supabase
      .from("entries")
      .select("expense_at, description, category, amount, member")
      .eq("scope", activeScope)
      .gte("expense_at", new Date(year, month, 1).toISOString())
      .lt("expense_at", new Date(year, month + 1, 1).toISOString())
      .then(({ data }) => {
        if (cancelled) return;
        const entries = (data ?? []) as LedgerEntry[];
        const limits =
          activeScope === "personal" ? PERSONAL_BUDGETS : getLimits("family", year, month);
        const totalBudget = Object.values(limits).reduce((a, b) => a + b, 0);
        setReport(buildReport(entries, limits, totalBudget, year, month, now));
      });
    return () => { cancelled = true; };
  }, [active, user, scope]);

  return report;
}

export function Companion() {
  const rig = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const gimbalA = useRef<THREE.Group>(null!);
  const gimbalB = useRef<THREE.Group>(null!);
  const eye = useRef<THREE.Mesh>(null!);

  const hovered = useEcosystem((s) => s.hovered);
  const mode = useEcosystem((s) => s.mode);
  const report = useReport(mode === "macro");

  const shell = useMemo(() => new THREE.OctahedronGeometry(0.2, 0), []);
  const ring = useMemo(() => new THREE.TorusGeometry(0.3, 0.008, 6, 40), []);
  const fin = useMemo(() => new THREE.BoxGeometry(0.02, 0.09, 0.05), []);

  // Reused across frames — allocating vectors in useFrame is how you get GC
  // hitches in a render loop.
  const target = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());
  const home = useRef(new THREE.Vector3(1.5, 0.75, 0.9));

  useFrame(({ clock, camera }, delta) => {
    const t = clock.getElapsedTime();

    // Idle: two unrelated periods, so the loop never becomes obvious.
    const bob = Math.sin(t * 0.9) * 0.06 + Math.sin(t * 1.37) * 0.03;

    // Parks further out and higher while the briefing is open, clearing the
    // type but staying in frame as the thing that is speaking.
    const briefing = mode === "briefing";
    desired.current.copy(home.current);
    if (briefing) desired.current.set(2.6, 1.6, 1.4);
    desired.current.y += bob;

    rig.current.position.lerp(desired.current, Math.min(1, delta * 2.2));

    // Attention: look at the hovered body, else back at the viewer.
    const hoveredPos = hovered && hovered !== "core" ? nodePositions.get(hovered) : undefined;
    if (hoveredPos) {
      target.current.copy(hoveredPos);
    } else {
      target.current.copy(camera.position);
    }
    head.current.lookAt(target.current);

    // Lean into whatever it is looking at — a small tilt reads as intent.
    const lean = hoveredPos ? 0.18 : 0;
    rig.current.rotation.z += (lean - rig.current.rotation.z) * Math.min(1, delta * 3);

    // Gimbals counter-rotate at unrelated rates; brisker when it has a target.
    const spin = hoveredPos ? 1.9 : 0.55;
    gimbalA.current.rotation.z += delta * spin;
    gimbalB.current.rotation.x -= delta * spin * 0.7;

    // The eye is the only saturated thing on it, so it carries the state.
    const mat = eye.current.material as THREE.MeshBasicMaterial;
    const want = hoveredPos ? 1 : briefing ? 0.85 : 0.4;
    mat.opacity += (want - mat.opacity) * Math.min(1, delta * 4);
    const pulse = 1 + Math.sin(t * (hoveredPos ? 6 : 2)) * 0.08;
    eye.current.scale.setScalar(pulse);
  });

  return (
    <group ref={rig}>
      <group ref={head}>
        <Wire geometry={shell} color={SILVER} intensity={1.8} />
        <mesh ref={eye} position={[0, 0, 0.19]}>
          <sphereGeometry args={[0.055, 16, 12]} />
          <meshBasicMaterial color={SUNGOLD} toneMapped={false} transparent opacity={0.4} />
        </mesh>
        {[-1, 1].map((s) => (
          <Wire key={s} geometry={fin} color={SILVER} intensity={1.2} position={[s * 0.17, 0, -0.04]} />
        ))}
      </group>

      {report && mode === "macro" && !hovered && (
        <Html position={[0, 0.52, 0]} center distanceFactor={11} style={{ pointerEvents: "none" }}>
          <div className="flex max-w-[260px] items-start gap-2 whitespace-normal rounded-lg bg-black/70 px-2.5 py-1.5 backdrop-blur-sm">
            <span
              className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: report.urgent ? "var(--destructive)" : SUNGOLD }}
            />
            <span className="text-[11px] font-light leading-snug text-zinc-200">{report.text}</span>
          </div>
        </Html>
      )}

      {/* Gimbal rings, tumbling around the shell. */}
      <group ref={gimbalA}>
        <Wire geometry={ring} color={SILVER} intensity={1.1} />
      </group>
      <group ref={gimbalB}>
        <Wire geometry={ring} color={SILVER} intensity={0.9} rotation={[Math.PI / 2, 0, 0]} />
      </group>
    </group>
  );
}
