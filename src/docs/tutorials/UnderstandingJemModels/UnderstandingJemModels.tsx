import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import type { JEMFile, JEMModelPart } from "@lib/emf/jemLoader";
import DocThreePreview from "../components/DocThreePreview";
import DocTexturePreview from "../components/DocTexturePreview";
import LiveCodeEditor from "../../components/LiveCodeEditor/LiveCodeEditor";
import s from "./UnderstandingJemModels.module.scss";

// Sheep assets
import sheepTexture from "../../assets/textures/sheep.png";
import sheepWoolTexture from "../../assets/textures/sheep_wool.png";
import sheepWoolUndercoatTexture from "../../assets/textures/sheep_wool_undercoat.png";

// JEM Model Imports
import sheepJemRaw from "../../assets/cem/sheep.jem?raw";
import sheepWoolJemRaw from "../../assets/cem/sheep_wool.jem?raw";
import sheepWoolUndercoatJemRaw from "../../assets/cem/sheep_wool_undercoat.jem?raw";

// Parse JEM models
const FULL_SHEEP_JEM = JSON.parse(sheepJemRaw);
const SHEEP_WOOL_JEM = JSON.parse(sheepWoolJemRaw);
const SHEEP_UNDERCOAT_JEM = JSON.parse(sheepWoolUndercoatJemRaw);

// Helper to extract parts for the tutorial
const extractPart = (jem: JEMFile, partId: string | string[]): JEMFile => {
  const clone = JSON.parse(JSON.stringify(jem)) as JEMFile;
  if (!clone.models) return clone;
  if (Array.isArray(partId)) {
    clone.models = clone.models.filter((m: JEMModelPart) => partId.includes(m.id ?? ""));
  } else {
    clone.models = clone.models.filter((m: JEMModelPart) => m.id === partId);
  }
  return clone;
};

const extractPartsPrefix = (jem: JEMFile, prefix: string): JEMFile => {
  const clone = JSON.parse(JSON.stringify(jem)) as JEMFile;
  if (!clone.models) return clone;
  clone.models = clone.models.filter((m: JEMModelPart) => m.id?.startsWith(prefix));
  return clone;
};

// Derived partials
const BODY_ONLY_JEM = extractPart(FULL_SHEEP_JEM, "body");
const HEAD_ONLY_JEM = extractPart(FULL_SHEEP_JEM, "head");
const LEGS_ONLY_JEM = extractPartsPrefix(FULL_SHEEP_JEM, "leg");


const DYE_COLORS = [
  { name: "White", hex: "#E9ECEC" },
  { name: "Orange", hex: "#F07613" },
  { name: "Magenta", hex: "#BD44B3" },
  { name: "Light Blue", hex: "#3AAFD9" },
  { name: "Yellow", hex: "#F8C627" },
  { name: "Lime", hex: "#70B919" },
  { name: "Pink", hex: "#ED8DAC" },
  { name: "Gray", hex: "#3E4447" },
  { name: "Light Gray", hex: "#8E8E86" },
  { name: "Cyan", hex: "#158991" },
  { name: "Purple", hex: "#792AAC" },
  { name: "Blue", hex: "#35399D" },
  { name: "Brown", hex: "#724728" },
  { name: "Green", hex: "#546D1B" },
  { name: "Red", hex: "#A12722" },
  { name: "Black", hex: "#333230" },
];

// Animation variables reference
const ANIMATION_VARIABLES = [
  {
    name: "limb_swing",
    description: "Limb animation counter, counts up when entity moves",
  },
  {
    name: "limb_speed",
    description: "Movement speed (0 = still, 1 = sprinting)",
  },
  { name: "age", description: "Entity age in ticks" },
  { name: "head_pitch", description: "Head X rotation (looking up/down)" },
  { name: "head_yaw", description: "Head Y rotation (looking left/right)" },
  {
    name: "swing_progress",
    description: "Attack/swing animation progress (0-1)",
  },
  { name: "hurt_time", description: "Ticks since entity was hurt (0-10)" },
  { name: "is_child", description: "True if entity is a baby variant" },
];

const SECTIONS = [
  { id: "hero", label: "Intro" },
  { id: "texture", label: "Texture & UV" },
  { id: "coordinates", label: "Coordinates" },
  { id: "building", label: "Building" },
  { id: "rotation", label: "Rotation" },
  { id: "layering", label: "Layering" },
  { id: "composition", label: "Composition" },
  { id: "animations", label: "Animations" },
  { id: "final", label: "Result" },
];

type Props = {
  onNavigate: (path: string) => void;
};

function createJsonChangeHandler(
  setCode: (code: string) => void,
  setData: (data: JEMFile) => void
) {
  return (newCode: string) => {
    setCode(newCode);
    try {
      setData(JSON.parse(newCode));
    } catch {
      // Ignore invalid JSON during editing
    }
  };
}

function filterModelsByStep(
  jem: JEMFile,
  step: "body" | "head" | "legs"
): JEMFile {
  const clone = JSON.parse(JSON.stringify(jem));
  if (step === "body") {
    clone.models = clone.models?.filter(
      (m: { id: string }) => m.id === "body"
    );
  } else if (step === "head") {
    clone.models = clone.models?.filter(
      (m: { id: string }) => m.id === "head"
    );
  } else if (step === "legs") {
    clone.models = clone.models?.filter((m: { id: string }) =>
      m.id.startsWith("leg")
    );
  }
  return clone;
}

function createUprightSheep(jem: JEMFile): JEMFile {
  const clone = JSON.parse(JSON.stringify(jem));
  const body = clone.models?.find((m: { id: string }) => m.id === "body");
  if (body?.submodels?.[0]) {
    body.submodels[0].rotate = [0, 0, 0];
  }
  return clone;
}

function useScrollTracking(
  containerRef: React.RefObject<HTMLDivElement>,
  setActiveSection: (section: string) => void,
  setScrollProgress: (progress: number) => void
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setScrollProgress((scrollTop / (scrollHeight - clientHeight)) * 100);

      const sections = container.querySelectorAll("[data-section]");
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const sectionTop = rect.top;
        const threshold = window.innerHeight * 0.4;

        if (sectionTop < threshold && sectionTop > -rect.height + threshold) {
          setActiveSection(section.getAttribute("data-section") ?? "hero");
        }
      });
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [containerRef, setActiveSection, setScrollProgress]);
}

function useSectionAnimations(visibleClass: string) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(visibleClass);
          }
        });
      },
      { threshold: 0.1, rootMargin: "-50px" }
    );

    const sections = document.querySelectorAll(`.${s.section}`);
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [visibleClass]);
}

// eslint-disable-next-line complexity
export default function UnderstandingJemModels(_props: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState("hero");
  const [scrollProgress, setScrollProgress] = useState(0);

  // State for the live editors
  const [bodyJemData, setBodyJemData] = useState(BODY_ONLY_JEM);
  const [bodyCode, setBodyCode] = useState(
    JSON.stringify(BODY_ONLY_JEM, null, 2),
  );

  const [legsJemData, setLegsJemData] = useState(LEGS_ONLY_JEM);
  const [legsCode, setLegsCode] = useState(
    JSON.stringify(LEGS_ONLY_JEM, null, 2),
  );

  const [headJemData, setHeadJemData] = useState(HEAD_ONLY_JEM);
  const [headCode, setHeadCode] = useState(
    JSON.stringify(HEAD_ONLY_JEM, null, 2),
  );

  const [woolColor, setWoolColor] = useState("#E9ECEC");
  const [undercoatColor, setUndercoatColor] = useState("#E9ECEC");

  const [uvStep, setUvStep] = useState<"body" | "head" | "legs">("body");
  const [buildStep, setBuildStep] = useState<"body" | "legs" | "head">("body");

  useScrollTracking(containerRef, setActiveSection, setScrollProgress);
  useSectionAnimations(s.visible);

  const scrollToSection = useCallback((sectionId: string) => {
    const section = containerRef.current?.querySelector(
      `[data-section="${sectionId}"]`,
    );
    section?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleBodyChange = useMemo(
    () => createJsonChangeHandler(setBodyCode, setBodyJemData),
    []
  );

  const handleLegsChange = useMemo(
    () => createJsonChangeHandler(setLegsCode, setLegsJemData),
    []
  );

  const handleHeadChange = useMemo(
    () => createJsonChangeHandler(setHeadCode, setHeadJemData),
    []
  );

  const uvData = useMemo(
    () => filterModelsByStep(FULL_SHEEP_JEM, uvStep),
    [uvStep]
  );

  const uprightSheep = useMemo(() => createUprightSheep(FULL_SHEEP_JEM), []);

  return (
    <div className={s.container} ref={containerRef}>
      {/* Progress Bar */}
      <div className={s.progressBar}>
        <div
          className={s.progressFill}
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Section Navigation */}
      <nav className={s.sectionNav}>
        {SECTIONS.map((section) => (
          <div
            key={section.id}
            className={`${s.navDot} ${activeSection === section.id ? s.active : ""}`}
            data-label={section.label}
            onClick={() => scrollToSection(section.id)}
          />
        ))}
      </nav>

      {/* 1. HERO */}
      <section className={s.hero} data-section="hero">
        <div className={s.heroContent}>
          <div className={s.heroEyebrow}>
            <span>📚</span> Tutorial
          </div>

          <h1 className={s.heroTitle}>
            Understanding <span className={s.accent}>JEM</span> Models
          </h1>

          <p className={s.heroSubtitle}>
            A deep dive into how Weaverbird and OptiFine render Custom Entity
            Models. Learn the coordinate system, UV mapping, and animation
            expressions through interactive examples.
          </p>

          <div className={s.scrollIndicator}>
            <div className={s.scrollIcon} />
            <span>Scroll to explore</span>
          </div>
        </div>
      </section>

      {/* 2. TEXTURE & UV */}
      <section className={s.section} data-section="texture">
        <div className={s.sectionHeader}>
          <div className={s.sectionNumber}>01</div>
          <h2 className={s.sectionTitle}>
            The Raw Materials: <span className={s.highlight}>Texture & UV</span>
          </h2>
          <p className={s.sectionDesc}>
            Every model starts with a 2D texture. The UV map defines how this
            flat image wraps around 3D boxes. Hover over regions to see the
            mapping.
          </p>
        </div>

        <div className={s.tabs}>
          <button
            className={`${s.tab} ${uvStep === "body" ? s.active : ""}`}
            onClick={() => setUvStep("body")}
          >
            Body
          </button>
          <button
            className={`${s.tab} ${uvStep === "head" ? s.active : ""}`}
            onClick={() => setUvStep("head")}
          >
            Head
          </button>
          <button
            className={`${s.tab} ${uvStep === "legs" ? s.active : ""}`}
            onClick={() => setUvStep("legs")}
          >
            Legs
          </button>
        </div>

        <div className={s.splitDemo}>
          <div className={s.column}>
            <div className={s.columnHeader}>
              <h3>2D Texture</h3>
            </div>
            <div className={s.previewContainer} style={{ height: "450px" }}>
              <DocTexturePreview
                textureUrl={sheepTexture}
                jemData={uvData}
                showUV={true}
              />
            </div>
          </div>
          <div className={s.column}>
            <div className={s.columnHeader}>
              <h3>3D Model</h3>
            </div>
            <div className={s.previewContainer} style={{ height: "450px" }}>
              <DocThreePreview
                jemData={uvData}
                textureUrl={sheepTexture}
                showLabels={true}
              />
            </div>
          </div>
        </div>

        <p className={s.caption}>
          The <code>textureOffset</code> property tells the renderer where to
          sample pixels from the texture sheet.
        </p>
      </section>

      {/* 3. COORDINATES & MATH */}
      <section className={s.section} data-section="coordinates">
        <div className={s.sectionHeader}>
          <div className={s.sectionNumber}>02</div>
          <h2 className={s.sectionTitle}>
            The Rules: <span className={s.highlight}>Coordinates & Math</span>
          </h2>
          <p className={s.sectionDesc}>
            Understanding the coordinate system is crucial. JEM uses a
            right-handed coordinate system with the origin at the entity's feet.
          </p>
        </div>

        <div className={s.splitDemo}>
          <div className={s.column}>
            <div className={s.infoGrid}>
              <div className={s.infoCard}>
                <h4>
                  <span className={s.icon}>📐</span> Coordinate System
                </h4>
                <ul>
                  <li>
                    <strong>Scale:</strong> 1 unit = 1 pixel
                  </li>
                  <li>
                    <strong>Y-Axis:</strong> Positive is up
                  </li>
                  <li>
                    <strong>Z-Axis:</strong> Negative is north (forward)
                  </li>
                  <li>
                    <strong>Origin:</strong> Entity's feet
                  </li>
                </ul>
              </div>

              <div className={s.infoCard}>
                <h4>
                  <span className={s.icon}>🔄</span> Rotations (Euler)
                </h4>
                <ul>
                  <li>
                    <strong>X (Pitch):</strong> Forward/Backward tilt
                  </li>
                  <li>
                    <strong>Y (Yaw):</strong> Left/Right turn
                  </li>
                  <li>
                    <strong>Z (Roll):</strong> Side-to-side tilt
                  </li>
                </ul>
              </div>

              <div className={s.infoCard}>
                <h4>
                  <span className={s.icon}>🎯</span> Pivot Points
                </h4>
                <p>
                  JEM negates <code>translate</code> to find the pivot point:
                  <br />
                  <code>pivot = -1 × translate</code>
                </p>
              </div>
            </div>
          </div>

          <div className={s.column}>
            <div className={s.columnHeader}>
              <h3>Coordinate Visualization</h3>
            </div>
            <div className={s.previewContainer} style={{ height: "450px" }}>
              <DocThreePreview
                jemData={FULL_SHEEP_JEM}
                solidColor={true}
                showLabels={true}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. BUILDING THE MODEL */}
      <section className={s.section} data-section="building">
        <div className={s.sectionHeader}>
          <div className={s.sectionNumber}>03</div>
          <h2 className={s.sectionTitle}>
            Building the <span className={s.highlight}>Model</span>
          </h2>
          <p className={s.sectionDesc}>
            Let's construct the sheep step-by-step. Edit the code on the left
            and watch the 3D preview update in real-time.
          </p>
        </div>

        <div className={s.tabs}>
          <button
            className={`${s.tab} ${buildStep === "body" ? s.active : ""}`}
            onClick={() => setBuildStep("body")}
          >
            <span className={s.tabNumber}>1.</span> Body
          </button>
          <button
            className={`${s.tab} ${buildStep === "legs" ? s.active : ""}`}
            onClick={() => setBuildStep("legs")}
          >
            <span className={s.tabNumber}>2.</span> Legs
          </button>
          <button
            className={`${s.tab} ${buildStep === "head" ? s.active : ""}`}
            onClick={() => setBuildStep("head")}
          >
            <span className={s.tabNumber}>3.</span> Head
          </button>
        </div>

        <div className={s.splitDemo}>
          <div className={`${s.column} ${s.codeColumn}`}>
            <div className={s.columnHeader}>
              <h3>JEM Source</h3>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              {buildStep === "body" && (
                <LiveCodeEditor code={bodyCode} onChange={handleBodyChange} />
              )}
              {buildStep === "legs" && (
                <LiveCodeEditor code={legsCode} onChange={handleLegsChange} />
              )}
              {buildStep === "head" && (
                <LiveCodeEditor code={headCode} onChange={handleHeadChange} />
              )}
            </div>
          </div>

          <div className={`${s.column} ${s.previewColumn}`}>
            <div className={s.columnHeader}>
              <h3>Live Preview</h3>
            </div>
            <div className={s.previewContainer} style={{ flex: 1 }}>
              {buildStep === "body" && (
                <DocThreePreview
                  jemData={bodyJemData}
                  textureUrl={sheepTexture}
                  showPivots={true}
                  showLabels={true}
                />
              )}
              {buildStep === "legs" && (
                <DocThreePreview
                  jemData={legsJemData}
                  solidColor={true}
                  showPivots={true}
                />
              )}
              {buildStep === "head" && (
                <DocThreePreview
                  jemData={headJemData}
                  solidColor={true}
                  showPivots={true}
                />
              )}
            </div>
          </div>
        </div>

        <p className={s.caption}>
          {buildStep === "body" &&
            "The body is the root part. Notice the -90° X rotation to make it horizontal."}
          {buildStep === "legs" &&
            "Legs are positioned relative to the global origin, not the body."}
          {buildStep === "head" &&
            "The head has its own pivot point for look animations."}
        </p>
      </section>

      {/* 5. ROTATION COMPARISON */}
      <section className={s.section} data-section="rotation">
        <div className={s.sectionHeader}>
          <div className={s.sectionNumber}>04</div>
          <h2 className={s.sectionTitle}>
            The Tricky Part: <span className={s.highlight}>Rotation</span>
          </h2>
          <p className={s.sectionDesc}>
            Why is the body rotated -90°? Because it's modeled "standing up"
            like a player, then rotated to be horizontal like a quadruped.
          </p>
        </div>

        <div className={s.comparisonGrid}>
          <div className={s.comparisonItem}>
            <h3>
              Upright <span>(rotate: [0, 0, 0])</span>
            </h3>
            <div className={s.previewContainer} style={{ height: "400px" }}>
              <DocThreePreview
                jemData={uprightSheep}
                solidColor={true}
                showPivots={true}
              />
            </div>
          </div>
          <div className={s.comparisonItem}>
            <h3>
              Rotated <span>(rotate: [-90, 0, 0])</span>
            </h3>
            <div className={s.previewContainer} style={{ height: "400px" }}>
              <DocThreePreview
                jemData={FULL_SHEEP_JEM}
                solidColor={true}
                showPivots={true}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 5. LAYERING & SIZEADD */}
      <section className={s.section} data-section="layering">
        <div className={s.sectionHeader}>
          <div className={s.sectionNumber}>05</div>
          <h2 className={s.sectionTitle}>
            Advanced Geometry:{" "}
            <span className={s.highlight}>Layering & sizeAdd</span>
          </h2>
          <p className={s.sectionDesc}>
            The <code>sizeAdd</code> property inflates box geometry without
            changing coordinates. Perfect for layering effects like wool, armor,
            or clothing.
          </p>
        </div>

        <div className={s.comparisonGrid}>
          <div className={s.comparisonItem}>
            <h3>
              Base Sheep <span>(sizeAdd: 0)</span>
            </h3>
            <div className={s.previewContainer} style={{ height: "450px" }}>
              <DocThreePreview
                jemData={FULL_SHEEP_JEM}
                textureUrl={sheepTexture}
              />
            </div>
            <div className={s.infoCard} style={{ marginTop: "1rem" }}>
              <div className={s.cardHeader}>
                <strong>Base Model</strong>
              </div>
              <div className={s.cardContent}>
                <p>
                  The base sheep uses coordinates directly from the JEM file.
                  All boxes are sized exactly as specified.
                </p>
              </div>
            </div>
          </div>

          <div className={s.comparisonItem}>
            <h3>
              With Wool <span>(sizeAdd: varies)</span>
            </h3>
            <div className={s.previewContainer} style={{ height: "450px" }}>
              <DocThreePreview
                jemData={SHEEP_WOOL_JEM}
                textureUrl={sheepWoolTexture}
              />
            </div>
            <div className={s.infoCard} style={{ marginTop: "1rem" }}>
              <div className={s.cardHeader}>
                <strong>Layered Geometry</strong>
              </div>
              <div className={s.cardContent}>
                <p>
                  <code>sizeAdd</code> inflates each box:
                </p>
                <ul style={{ paddingLeft: "1.5rem", margin: "0.5rem 0" }}>
                  <li>
                    <strong>Body:</strong> 1.75 pixels (thick wool)
                  </li>
                  <li>
                    <strong>Head:</strong> 0.6 pixels (thinner)
                  </li>
                  <li>
                    <strong>Legs:</strong> 0.5 pixels (minimal)
                  </li>
                </ul>
                <p style={{ marginTop: "0.5rem" }}>
                  This creates a fluffy appearance while reusing the same UV
                  coordinates!
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          className={s.infoCard}
          style={{ marginTop: "2rem", background: "#1e293b" }}
        >
          <div className={s.cardHeader}>
            <strong>💡 Key Insight: Efficient Layering</strong>
          </div>
          <div className={s.cardContent}>
            <p>
              The <code>sizeAdd</code> property is powerful because:
            </p>
            <ul style={{ paddingLeft: "1.5rem", marginTop: "0.5rem" }}>
              <li>
                <strong>Same structure:</strong> Body still uses the same
                coordinates and texture offsets
              </li>
              <li>
                <strong>Geometry only:</strong> Boxes are inflated uniformly in
                all directions
              </li>
              <li>
                <strong>Texture reuse:</strong> UV mapping stays identical, only
                geometry changes
              </li>
              <li>
                <strong>Stackable:</strong> Multiple models (wool, undercoat)
                can layer on top of each other
              </li>
            </ul>
            <p style={{ marginTop: "1rem" }}>
              This is how Minecraft creates sheared vs woolly sheep with minimal
              data duplication!
            </p>
          </div>
        </div>
      </section>

      {/* 6. COMPOSITION */}
      <section className={s.section} data-section="composition">
        <div className={s.sectionHeader}>
          <div className={s.sectionNumber}>06</div>
          <h2 className={s.sectionTitle}>
            Adding the Pieces Together:{" "}
            <span className={s.highlight}>Composition</span>
          </h2>
          <p className={s.sectionDesc}>
            By layering multiple models with different <code>sizeAdd</code>{" "}
            values, we can create complex entities like a sheep with dyeable
            wool and a separate undercoat.
          </p>
        </div>

        <div className={s.comparisonGrid}>
          {/* 1. Bare Sheep */}
          <div className={s.comparisonItem}>
            <h3>1. Bare Sheep</h3>
            <div className={s.previewContainer} style={{ height: "300px" }}>
              <DocThreePreview
                jemData={FULL_SHEEP_JEM}
                textureUrl={sheepTexture}
              />
            </div>
            <div className={s.infoCard} style={{ marginTop: "1rem" }}>
              <div className={s.cardContent}>
                <p>Base model with standard geometry.</p>
              </div>
            </div>
          </div>

          {/* 2. Bare + Undercoat */}
          <div className={s.comparisonItem}>
            <h3>2. + Undercoat</h3>
            <div className={s.previewContainer} style={{ height: "300px" }}>
              <DocThreePreview
                jemData={FULL_SHEEP_JEM}
                textureUrl={sheepTexture}
                extraLayers={[
                  {
                    jemData: SHEEP_UNDERCOAT_JEM,
                    textureUrl: sheepWoolUndercoatTexture,
                    color: undercoatColor,
                  },
                ]}
              />
            </div>
            <div className={s.infoCard} style={{ marginTop: "1rem" }}>
              <div className={s.cardHeader}>
                <strong>Undercoat Color</strong>
              </div>
              <div className={s.cardContent}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "4px",
                    marginTop: "8px",
                  }}
                >
                  {DYE_COLORS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setUndercoatColor(c.hex)}
                      title={c.name}
                      style={{
                        width: "20px",
                        height: "20px",
                        backgroundColor: c.hex,
                        border:
                          undercoatColor === c.hex
                            ? "2px solid white"
                            : "1px solid #444",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={undercoatColor}
                    onChange={(e) => setUndercoatColor(e.target.value)}
                    style={{
                      width: "20px",
                      height: "20px",
                      padding: 0,
                      border: "none",
                      background: "none",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Bare + Undercoat + Wool */}
          <div className={s.comparisonItem}>
            <h3>3. + Wool Layer</h3>
            <div className={s.previewContainer} style={{ height: "300px" }}>
              <DocThreePreview
                jemData={FULL_SHEEP_JEM}
                textureUrl={sheepTexture}
                extraLayers={[
                  {
                    jemData: SHEEP_UNDERCOAT_JEM,
                    textureUrl: sheepWoolUndercoatTexture,
                    color: undercoatColor,
                  },
                  {
                    jemData: SHEEP_WOOL_JEM,
                    textureUrl: sheepWoolTexture,
                    color: woolColor,
                  },
                ]}
              />
            </div>
            <div className={s.infoCard} style={{ marginTop: "1rem" }}>
              <div className={s.cardHeader}>
                <strong>Wool Color</strong>
              </div>
              <div className={s.cardContent}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "4px",
                    marginTop: "8px",
                  }}
                >
                  {DYE_COLORS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setWoolColor(c.hex)}
                      title={c.name}
                      style={{
                        width: "20px",
                        height: "20px",
                        backgroundColor: c.hex,
                        border:
                          woolColor === c.hex
                            ? "2px solid white"
                            : "1px solid #444",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={woolColor}
                    onChange={(e) => setWoolColor(e.target.value)}
                    style={{
                      width: "20px",
                      height: "20px",
                      padding: 0,
                      border: "none",
                      background: "none",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. ANIMATIONS */}
      <section className={s.section} data-section="animations">
        <div className={s.sectionHeader}>
          <div className={s.sectionNumber}>07</div>
          <h2 className={s.sectionTitle}>
            Bringing It To Life: <span className={s.highlight}>Animations</span>
          </h2>
          <p className={s.sectionDesc}>
            CEM animations use mathematical expressions to control part
            transformations. These are evaluated every frame based on entity
            state.
          </p>
        </div>

        <div className={s.splitDemo}>
          <div className={s.column}>
            <div
              className={s.infoCard}
              style={{ marginBottom: "var(--docs-space-lg)" }}
            >
              <h4>
                <span className={s.icon}>✨</span> Animation Syntax
              </h4>
              <p style={{ marginBottom: "var(--docs-space-md)" }}>
                Animations are defined in the <code>animations</code> array.
                Each entry maps a model variable to a mathematical expression:
              </p>
              <pre
                style={{
                  background: "var(--docs-code-bg)",
                  padding: "var(--docs-space-md)",
                  borderRadius: "var(--docs-radius-sm)",
                  fontSize: "0.85rem",
                  overflow: "auto",
                }}
              >
                {`"animations": [
  {
    "head.rx": "head_pitch",
    "head.ry": "head_yaw",
    "leg1.rx": "cos(limb_swing) * limb_speed",
    "leg2.rx": "-cos(limb_swing) * limb_speed"
  }
]`}
              </pre>
            </div>

            <div className={s.infoCard}>
              <h4>
                <span className={s.icon}>🎚️</span> Variable Properties
              </h4>
              <ul>
                <li>
                  <code>.tx, .ty, .tz</code> — Translation offset
                </li>
                <li>
                  <code>.rx, .ry, .rz</code> — Rotation (radians)
                </li>
                <li>
                  <code>.sx, .sy, .sz</code> — Scale factor
                </li>
                <li>
                  <code>.visible</code> — Show/hide part
                </li>
              </ul>
            </div>
          </div>

          <div className={s.column}>
            <div className={s.columnHeader}>
              <h3>Available Variables</h3>
            </div>
            <div className={s.variablesTable}>
              <div className={s.tableHeader}>
                <span>Variable</span>
                <span>Description</span>
              </div>
              {ANIMATION_VARIABLES.map((v) => (
                <div key={v.name} className={s.tableRow}>
                  <code>{v.name}</code>
                  <span>{v.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className={s.infoGrid}
          style={{ marginTop: "var(--docs-space-xl)" }}
        >
          <div className={s.infoCard}>
            <h4>
              <span className={s.icon}>➕</span> Math Functions
            </h4>
            <ul>
              <li>
                <code>sin(x)</code>, <code>cos(x)</code>, <code>tan(x)</code>
              </li>
              <li>
                <code>abs(x)</code>, <code>floor(x)</code>, <code>ceil(x)</code>
              </li>
              <li>
                <code>clamp(x, min, max)</code>
              </li>
              <li>
                <code>lerp(a, b, t)</code> — Linear interpolation
              </li>
              <li>
                <code>if(cond, a, b)</code> — Conditional
              </li>
            </ul>
          </div>

          <div className={s.infoCard}>
            <h4>
              <span className={s.icon}>💡</span> Pro Tips
            </h4>
            <ul>
              <li>
                Use <code>torad(deg)</code> to convert degrees
              </li>
              <li>
                Chain parts with <code>part:child</code> syntax
              </li>
              <li>
                Store values in <code>var.name</code> for reuse
              </li>
              <li>Animations run at render framerate</li>
            </ul>
          </div>

          <div className={s.infoCard}>
            <h4>
              <span className={s.icon}>⚠️</span> Common Pitfalls
            </h4>
            <ul>
              <li>
                Rotations are in <strong>radians</strong>, not degrees
              </li>
              <li>Division by zero crashes the renderer</li>
              <li>Animations go in parent bone only</li>
              <li>Part names must match entity exactly</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 8. FINAL RESULT */}
      <section className={s.section} data-section="final">
        <div className={s.sectionHeader}>
          <div className={s.sectionNumber}>08</div>
          <h2 className={s.sectionTitle}>
            Final <span className={s.highlight}>Result</span>
          </h2>
          <p className={s.sectionDesc}>
            Here is our complete sheep model with all layers assembled!
          </p>
        </div>

        <div
          className={s.previewContainer}
          style={{ height: "600px", position: "relative" }}
        >
          {/* Base Layer */}
          <div style={{ position: "absolute", inset: 0 }}>
            <DocThreePreview
              jemData={FULL_SHEEP_JEM}
              textureUrl={sheepTexture}
              showPivots={true}
              showLabels={true}
            />
          </div>
          {/* Undercoat Layer */}
          <div
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            <DocThreePreview
              jemData={SHEEP_UNDERCOAT_JEM}
              textureUrl={sheepWoolUndercoatTexture}
              color={undercoatColor}
            />
          </div>
          {/* Wool Layer */}
          <div
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            <DocThreePreview
              jemData={SHEEP_WOOL_JEM}
              textureUrl={sheepWoolTexture}
              color={woolColor}
            />
          </div>
        </div>
        <div className={s.caption}>
          Complete sheep model with base, undercoat, and wool layers.
        </div>
      </section>
    </div>
  );
}
